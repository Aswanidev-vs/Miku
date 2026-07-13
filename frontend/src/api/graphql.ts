// Lazy-loaded Wails binding — avoids crash if runtime isn't ready at module load time
let OAuth2Service: any = null
let authLoaded = false

async function ensureAuth() {
  if (authLoaded) return
  try {
    OAuth2Service = await import('../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service')
  } catch (e) {
    console.warn('[Miku GraphQL] OAuth2 bindings not available:', e)
  }
  authLoaded = true
}

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

interface GraphQLResponse {
  data?: any
  errors?: Array<{ message: string }>
}

// ---- Simple in-memory cache (avoids re-fetching on tab switch) ----
const CACHE_TTL = 20_000 // 20 seconds — long enough for tab switches, short enough to stay fresh
const cache = new Map<string, { ts: number; data: GraphQLResponse }>()

function cacheKey(query: string, variables?: Record<string, any>): string {
  return query + (variables ? JSON.stringify(variables) : '')
}

function getCache(key: string): GraphQLResponse | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  if (entry) cache.delete(key)
  return null
}

function setCache(key: string, data: GraphQLResponse) {
  // Cap cache size to ~200 entries
  if (cache.size > 200) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { ts: Date.now(), data })
}

/** Clear cache (e.g. on logout) */
export function clearGqlCache() {
  cache.clear()
}

// ---- Auth header (cached per-session to avoid repeated backend calls) ----
let cachedToken: string | null = null
let tokenPromise: Promise<string | null> | null = null

async function getAuthHeader(): Promise<Record<string, string>> {
  await ensureAuth()
  if (!OAuth2Service) return {}

  // Debounce rapid token lookups (multiple parallel queries at page load)
  if (!tokenPromise) {
    tokenPromise = OAuth2Service.GetToken()
      .then((t) => {
        cachedToken = t?.access_token ?? null
        return cachedToken
      })
      .catch(() => {
        cachedToken = null
        return null
      })
      .finally(() => {
        tokenPromise = null
      })
  }

  const token = await tokenPromise
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

// ---- Core query function ----
export async function gqlQuery(query: string, variables?: Record<string, any>): Promise<GraphQLResponse> {
  const key = cacheKey(query, variables)

  // Check cache (only for non-mutation queries)
  if (!query.trimStart().startsWith('mutation')) {
    const cached = getCache(key)
    if (cached) return cached
  }

  const authHeader = await getAuthHeader()

  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await response.json()

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  // Cache successful queries
  if (!query.trimStart().startsWith('mutation')) {
    setCache(key, json)
  }

  return json
}

/**
 * Alias for mutations — same transport, just semantic clarity.
 */
export const gqlMutate = gqlQuery

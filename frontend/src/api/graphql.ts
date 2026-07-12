import * as OAuth2Service from '../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service'

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

interface GraphQLResponse {
  data?: any
  errors?: Array<{ message: string }>
}

/**
 * Execute a GraphQL query/mutation against AniList API.
 * Automatically attaches auth token from Wails OAuth2Service if available.
 */
export async function gqlQuery(query: string, variables?: Record<string, any>): Promise<GraphQLResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // Try to get auth token from Wails backend
  try {
    const token = await OAuth2Service.GetToken()
    if (token && token.access_token) {
      headers['Authorization'] = `Bearer ${token.access_token}`
    }
  } catch {
    // No token available — proceed without auth (public queries still work)
  }

  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })

  const json = await response.json()

  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }

  return json
}

/**
 * Alias for mutations — same transport, just semantic clarity.
 */
export const gqlMutate = gqlQuery

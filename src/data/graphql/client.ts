import { GraphQLError, RateLimitError } from './errors'

export const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

interface GqlResponse<T> {
  data?: T
  errors?: unknown
}

/**
 * Minimal typed GraphQL transport for the AniList endpoint.
 * Throws RateLimitError on 429 and GraphQLError on schema errors.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  if (res.status === 429) {
    throw new RateLimitError(await res.json().catch(() => null))
  }
  if (!res.ok) {
    throw new GraphQLError(await res.text().catch(() => null))
  }

  const json = (await res.json()) as GqlResponse<T>
  if (json.errors) throw new GraphQLError(json.errors)
  return json.data as T
}

export class RateLimitError extends Error {
  detail: unknown
  constructor(detail: unknown) {
    super('AniList rate limit exceeded')
    this.name = 'RateLimitError'
    this.detail = detail
  }
}

export class GraphQLError extends Error {
  errors: unknown
  constructor(errors: unknown) {
    super('AniList GraphQL error')
    this.name = 'GraphQLError'
    this.errors = errors
  }
}

export class AuthError extends Error {
  constructor(message = 'Authentication failed') {
    super(message)
    this.name = 'AuthError'
  }
}

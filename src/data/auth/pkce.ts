function toBase64Url(bytes: Uint8Array): string {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const out: string[] = []
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  for (let i = 0; i < length; i++) out.push(chars[buf[i] % chars.length])
  return out.join('')
}

/** Generate a PKCE code verifier + S256 challenge pair. */
export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomVerifier()
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = toBase64Url(new Uint8Array(digest))
  return { verifier, challenge }
}

export const ANILIST_AUTH = {
  authorizeUrl: 'https://anilist.co/api/v1/oauth/authorize',
  tokenUrl: 'https://anilist.co/api/v1/oauth/token',
  clientId: import.meta.env.VITE_ANILIST_CLIENT_ID ?? 'miku-dev',
  redirectUri: import.meta.env.VITE_ANILIST_REDIRECT ?? 'miku://auth',
}

/** Build the AniList authorize URL for a PKCE flow. */
export function buildAuthorizeUrl(challenge: string): string {
  const p = new URLSearchParams({
    client_id: ANILIST_AUTH.clientId,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: ANILIST_AUTH.redirectUri,
  })
  return `${ANILIST_AUTH.authorizeUrl}?${p.toString()}`
}

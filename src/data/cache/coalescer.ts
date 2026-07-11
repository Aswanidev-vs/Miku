const inflight = new Map<string, Promise<unknown>>()

/**
 * Dedupe identical in-flight requests to a single network call.
 * Late subscribers attach to the pending promise instead of firing their own.
 */
export function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

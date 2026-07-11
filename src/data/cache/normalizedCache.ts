import { get, set, del } from 'idb-keyval'

const MAX_MEM_ENTRIES = 300

/**
 * Two-tier cache: in-memory Map (session) backed by IndexedDB (cold start).
 * LRU eviction keeps the in-memory tier bounded on long browsing sessions.
 */
export class NormalizedCache {
  private mem = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | undefined> {
    if (this.mem.has(key)) {
      // Move to end (most recently used) for LRU
      const v = this.mem.get(key)
      this.mem.delete(key)
      this.mem.set(key, v)
      return v as T
    }
    const persisted = (await get(key)) as T | undefined
    if (persisted !== undefined) this.mem.set(key, persisted)
    this.evict()
    return persisted
  }

  async set(key: string, value: unknown): Promise<void> {
    this.mem.set(key, value)
    this.evict()
    await set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.mem.delete(key)
    await del(key)
  }

  has(key: string): boolean {
    return this.mem.has(key)
  }

  private evict() {
    while (this.mem.size > MAX_MEM_ENTRIES) {
      const oldest = this.mem.keys().next().value
      if (oldest !== undefined) this.mem.delete(oldest)
    }
  }
}

export const normalizedCache = new NormalizedCache()

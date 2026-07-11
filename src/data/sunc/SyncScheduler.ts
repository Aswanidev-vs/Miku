type Job = () => Promise<unknown>

/**
 * Serializes mutating writes (e.g. episode progress) so a burst of list
 * edits during a scrolling session does not trip AniList rate limits.
 * Jobs run one-at-a-time with a small floor between them.
 */
class Scheduler {
  private queue: Job[] = []
  private running = false
  private minGapMs = 350

  enqueue<T>(job: Job): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve((await job()) as T)
        } catch (e) {
          reject(e)
        }
      })
      void this.drain()
    })
  }

  private async drain(): Promise<void> {
    if (this.running) return
    this.running = true
    while (this.queue.length) {
      const job = this.queue.shift()!
      try {
        await job()
      } catch {
        /* surfaced to the original caller via reject */
      }
      await new Promise((r) => setTimeout(r, this.minGapMs))
    }
    this.running = false
  }
}

export const SyncScheduler = new Scheduler()

type Entry<V> = { expiresAt: number; promise: Promise<V> };

/** A bounded, process-local cache for concurrent async computations. */
export class AsyncTtlCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError("ttlMs must be positive");
    if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) throw new RangeError("maxEntries must be positive");
  }

  getOrCreate(key: K, create: () => Promise<V>): Promise<V> {
    const now = this.now();
    const current = this.entries.get(key);
    if (current && current.expiresAt > now) return current.promise;
    if (current) this.entries.delete(key);

    // A slow load stays single-flight even when it takes longer than the TTL.
    // Start freshness when it resolves, and never resurrect an invalidated key.
    const promise = Promise.resolve().then(create).then((value) => {
      if (this.entries.get(key) === entry) entry.expiresAt = this.now() + this.ttlMs;
      return value;
    });
    const entry: Entry<V> = { expiresAt: Infinity, promise };
    this.entries.set(key, entry);
    void promise.catch(() => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
    });
    this.prune(now);
    return promise;
  }

  invalidate(key: K): void {
    this.entries.delete(key);
  }

  invalidateWhere(matches: (key: K) => boolean): number {
    let invalidated = 0;
    for (const key of this.entries.keys()) {
      if (!matches(key)) continue;
      this.entries.delete(key);
      invalidated++;
    }
    return invalidated;
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  hasFresh(key: K): boolean {
    const entry = this.entries.get(key);
    return !!entry && entry.expiresAt !== Infinity && entry.expiresAt > this.now();
  }

  get freshSize(): number {
    let count = 0;
    for (const key of this.entries.keys()) if (this.hasFresh(key)) count++;
    return count;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}

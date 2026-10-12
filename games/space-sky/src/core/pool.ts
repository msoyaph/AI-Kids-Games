/**
 * Fixed-capacity object pool. Objects are created up front; acquire/release never allocate.
 * Active items are kept densely packed in `items[0..count)` so update loops are simple.
 */
export class Pool<T> {
  readonly items: T[];
  count = 0;

  constructor(
    readonly capacity: number,
    factory: (i: number) => T,
  ) {
    this.items = new Array(capacity);
    for (let i = 0; i < capacity; i++) this.items[i] = factory(i);
  }

  /** Returns a free item or null when the pool is exhausted. */
  acquire(): T | null {
    if (this.count >= this.capacity) return null;
    return this.items[this.count++];
  }

  /** Releases the item at index i by swapping it with the last active item. */
  releaseAt(i: number): void {
    const last = this.count - 1;
    if (i < 0 || i > last) return;
    if (i !== last) {
      const tmp = this.items[i];
      this.items[i] = this.items[last];
      this.items[last] = tmp;
    }
    this.count--;
  }

  clear(): void {
    this.count = 0;
  }
}

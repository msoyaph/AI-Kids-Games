/**
 * Fixed free-list object pool. Objects are created up-front (or lazily on
 * first growth) and recycled, so steady-state gameplay never allocates.
 */
export class Pool<T> {
  private free: T[] = [];
  private created = 0;

  constructor(
    private readonly factory: () => T,
    prewarm = 0,
  ) {
    for (let i = 0; i < prewarm; i++) this.free.push(this.make());
  }

  private make(): T {
    this.created++;
    return this.factory();
  }

  get(): T {
    return this.free.length > 0 ? this.free.pop()! : this.make();
  }

  release(obj: T): void {
    this.free.push(obj);
  }

  get totalCreated(): number {
    return this.created;
  }

  get available(): number {
    return this.free.length;
  }
}

/** Remove item at index by swapping with the last element (O(1), no allocation). */
export function swapRemove<T>(arr: T[], index: number): T {
  const item = arr[index]!;
  const last = arr.pop()!;
  if (index < arr.length) arr[index] = last;
  return item;
}

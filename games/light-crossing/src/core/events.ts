/** Minimal typed event bus. */
export type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();
  private anyHandlers = new Set<(type: keyof E, payload: unknown) => void>();

  on<K extends keyof E>(type: K, h: Handler<E[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(h as Handler<never>);
    return () => set!.delete(h as Handler<never>);
  }

  /** Listen to every event (used by the quest/challenge/achievement engines). */
  onAny(h: (type: keyof E, payload: unknown) => void): () => void {
    this.anyHandlers.add(h);
    return () => this.anyHandlers.delete(h);
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const set = this.handlers.get(type);
    if (set) for (const h of [...set]) (h as Handler<E[K]>)(payload);
    for (const h of [...this.anyHandlers]) h(type, payload);
  }

  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }
}

/**
 * Flash safety: at most `max` glows in any one-second window (3 by default, under the
 * three-flashes-a-second guideline). Extra ones are simply skipped, and every celebration is a
 * soft glow that fades, never a strobe.
 */
export class FlashLimiter {
  private times: number[] = [];
  constructor(private max = 3) {}
  allow(now: number): boolean {
    this.times = this.times.filter(t => now - t < 1000);
    if (this.times.length >= this.max) return false;
    this.times.push(now);
    return true;
  }
  count(now: number) { return this.times.filter(t => now - t < 1000).length; }
}

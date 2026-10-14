/**
 * The Spark Ring befriending game, drawn with Pixi: a ring around a heart, a glowing arc, and a
 * spark that sweeps round. Tap (or press A / Space) while the spark is in the glow. Three sparks;
 * each hit fills part of the heart (a near miss fills half). The rules are in core/befriend.ts.
 */
import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { footAnchor } from '../art/painter';
import { sparkAngle, tapFill, type SparkSetup } from '../core/befriend';

export interface SparkResult { fill: number; taps: (number | null)[] }
/** Where the spark and the glow are right now (read-only, for the test hook). */
export interface SparkInfo { index: number; angle: number; arcAt: number; arc: number }

export class SparkRing {
  readonly root = new Container();
  private dim = new Graphics();
  private ring = new Graphics();
  private heart = new Graphics();
  private spark = new Graphics();
  private label: Text;
  private friend: Sprite;
  private fillNow = 0;

  /** `friend` draws the Agentmon at 32 or 64 px; the ring picks whichever stays crisp at its scale. */
  constructor(private setup: SparkSetup, private friendArt: (size: 32 | 64) => Texture, private size: { cx: number; cy: number; r: number; scale: number; W: number; H: number }) {
    this.friend = new Sprite(friendArt(32));
    this.friend.anchor.set(0.5, 1);
    this.label = new Text({ text: '', style: { fill: 0xffffff, fontSize: Math.round(size.r * 0.16), fontWeight: '900', stroke: { color: 0x2a1f3d, width: Math.max(3, size.r * 0.025) }, align: 'center' } });
    this.label.anchor.set(0.5);
    this.root.addChild(this.dim, this.ring, this.heart, this.spark, this.friend, this.label);
    this.layout();
  }

  private layout(): void {
    const { cx, cy, r, scale, W, H } = this.size;
    // a light plum wash (1.0 greyed the scene out) and a warm spotlight behind the ring
    this.dim.clear().rect(0, 0, W, H).fill({ color: 0x2a1f3d, alpha: 0.28 })
      .circle(cx, cy - r * 0.2, r * 1.65).fill({ color: 0xfff1d8, alpha: 0.14 })
      .circle(cx, cy - r * 0.2, r * 1.3).fill({ color: 0xfff1d8, alpha: 0.12 });
    // the friend stands just above the ring, small enough to stay on screen
    const k = Math.max(2, Math.min(scale, Math.floor((cy - r * 1.12) / 30)));
    // an even scale shows the 64 px art at half that (smoother bodies, the same pixel grid)
    const big = k % 2 === 0;
    this.friend.texture = this.friendArt(big ? 64 : 32);
    this.friend.anchor.set(0.5, footAnchor(this.friend.texture.height));
    this.friend.scale.set(big ? -k / 2 : -k, big ? k / 2 : k);
    this.friend.x = cx;
    this.friend.y = cy - r * 1.08;
    this.label.x = cx;
    this.label.y = cy + r * 1.3;
  }

  private drawRing(index: number): void {
    const { cx, cy, r } = this.size;
    const g = this.ring.clear();
    const w = Math.max(6, r * 0.14);
    g.circle(cx, cy, r).stroke({ color: 0xffffff, alpha: 0.25, width: w });
    const centre = this.setup.arcAt[index] ?? 0;
    const arc = (deg: number, color: number, alpha: number) => {
      const a0 = ((centre - deg / 2 - 90) * Math.PI) / 180, a1 = ((centre + deg / 2 - 90) * Math.PI) / 180;
      // start a fresh path at the arc's first end (otherwise a line joins it to the last shape)
      g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1).stroke({ color, alpha, width: w });
    };
    arc(this.setup.arc * 1.6, 0xffd84a, 0.35);
    arc(this.setup.arc, 0xff8fc0, 1);
  }

  private drawHeart(): void {
    const { cx, cy, r } = this.size;
    const s = r * 0.42;
    const h = this.heart.clear();
    const heart = (k: number) => {
      const pts: number[] = [];
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.12) {
        const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push(cx + (x / 17) * s * k, cy + (y / 17) * s * k);
      }
      return pts;
    };
    h.poly(heart(1)).fill({ color: 0xffffff, alpha: 0.18 }).stroke({ color: 0xffffff, width: 3 });
    const k = Math.min(1, this.fillNow / this.setup.need);
    if (k > 0) h.poly(heart(Math.max(0.15, k))).fill(0xff6b8a);
  }

  private drawSpark(angle: number): void {
    const { cx, cy, r } = this.size;
    const a = ((angle - 90) * Math.PI) / 180;
    const g = this.spark.clear();
    for (let i = 4; i >= 0; i--) {
      const b = a - i * 0.08;
      g.circle(cx + Math.cos(b) * r, cy + Math.sin(b) * r, r * (0.07 - i * 0.008)).fill({ color: 0xfff3b0, alpha: 1 - i * 0.18 });
    }
  }

  /**
   * Play the three sparks. `tapped()` returns true once when the player taps / presses A, or the
   * tap's time (`performance.now()` clock): then the tap is judged where the spark was at that
   * moment, not on the frame that notices it, so a slow device never turns a hit into a miss.
   * Returns the heart fill and each tap's angle (null = no tap this spark).
   */
  async play(tapped: () => boolean | number, instant = false, onFrame?: (info: SparkInfo | null) => void, onSpark?: (fill: number) => void): Promise<SparkResult> {
    const taps: (number | null)[] = [];
    for (let i = 0; i < this.setup.sparks; i++) {
      this.drawRing(i);
      this.drawHeart();
      this.label.text = i === 0 ? 'Tap when the spark is in the pink glow!' : `Spark ${i + 1} of ${this.setup.sparks}`;
      tapped(); // ignore a press from before this spark
      const t0 = performance.now();
      let hit: number | null = null;
      await new Promise<void>(resolve => {
        const frame = () => {
          const secs = (performance.now() - t0) / 1000;
          const turns = secs * this.setup.speed;
          const angle = sparkAngle(this.setup, secs);
          this.drawSpark(angle);
          onFrame?.({ index: i, angle, arcAt: this.setup.arcAt[i] ?? 0, arc: this.setup.arc });
          const tap = tapped();
          if (tap !== false) { hit = typeof tap === 'number' ? sparkAngle(this.setup, Math.max(0, Math.min(secs, (tap - t0) / 1000))) : angle; return resolve(); }
          if (turns >= 1.15) return resolve(); // one full lap (and a little) with no tap
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      onFrame?.(null);
      taps.push(hit);
      const f = hit === null ? 0 : tapFill(this.setup, i, hit);
      this.fillNow += f;
      onSpark?.(f);
      this.drawHeart();
      this.label.text = f >= 1 ? 'Perfect!' : f > 0 ? 'So close!' : hit === null ? 'The spark went by. That\'s okay!' : 'Missed. That\'s okay!';
      await new Promise(r => setTimeout(r, instant ? 150 : 650));
      if (this.fillNow >= this.setup.need) break;
    }
    return { fill: this.fillNow, taps };
  }

  /** A paused moment (capture routes): spark `index` at `angle`, the heart filled to `fill`. */
  still(index: number, angle: number, fill: number, label: string): void {
    this.fillNow = fill;
    this.drawRing(index);
    this.drawHeart();
    this.drawSpark(angle);
    this.label.text = label;
  }

  destroy(): void { this.root.destroy({ children: true }); }
}

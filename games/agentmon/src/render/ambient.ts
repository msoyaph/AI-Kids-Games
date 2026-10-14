/**
 * Ambient life on the overworld (1.1): butterflies in the day, leaves drifting down in the woods,
 * fireflies at dusk, snow on the peaks. A handful of tiny sprites near the camera, in world space,
 * re-placed as they drift out of view. Nothing here blocks anything or can be touched.
 * Off with reduced motion. Fireflies glow slowly (fx.ts lists the rate; well under 3 a second).
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import { hash32 } from '../core/rng';
import type { MapDef } from '../core/world/map';
import { P } from '../art/palette';
import { PixelCanvas } from '../art/pixelcanvas';
import { FX, wave } from './fx';
import type { Sprites } from './sprites';

type Kind = 'butterfly' | 'leaf' | 'firefly' | 'snow';
interface Bit { s: Sprite; kind: Kind; x: number; y: number; vx: number; vy: number; phase: number; look: number }

/** Which life a place has (by its battle backdrop, which says what kind of place it is). */
export function ambientFor(map: MapDef): { butterflies: number; leaves: number; fireflies: number; snow: number } {
  const none = { butterflies: 0, leaves: 0, fireflies: 0, snow: 0 };
  if (!map.outdoor) return none;
  switch (map.battleBg) {
    case 'meadow': case 'town': return { butterflies: 4, leaves: 0, fireflies: 8, snow: 0 };
    case 'forest': return { butterflies: 2, leaves: 7, fireflies: 10, snow: 0 };
    case 'mountain': return { butterflies: 2, leaves: 0, fireflies: 5, snow: 0 };
    case 'beach': return { butterflies: 1, leaves: 0, fireflies: 4, snow: 0 };
    case 'snow': return { butterflies: 0, leaves: 0, fireflies: 0, snow: 18 };
    default: return none;
  }
}

const WINGS = [[P.flowerPink, 0xffd0dc], [P.flowerYellow, 0xfff3b0], [P.flowerBlue, 0xd8ecff]] as const;

function butterfly(look: number, open: boolean): PixelCanvas {
  const [a, b] = WINGS[look % WINGS.length]!;
  const c = new PixelCanvas(7, 5);
  c.set(3, 1, P.ink).set(3, 2, P.ink).set(3, 3, P.ink);
  if (open) c.rect(0, 0, 3, 3, a).rect(4, 0, 3, 3, a).set(1, 1, b).set(5, 1, b).set(1, 3, a).set(5, 3, a).set(2, 4, a).set(4, 4, a);
  else c.rect(1, 0, 2, 3, a).rect(4, 0, 2, 3, a).set(2, 3, b).set(4, 3, b);
  return c;
}

function leaf(look: number, flip: boolean): PixelCanvas {
  const col = [0xf0a040, 0xe0703c, P.leafLight][look % 3]!;
  const c = new PixelCanvas(4, 4);
  if (flip) c.set(0, 0, col).set(1, 1, col).set(2, 1, col).set(1, 2, col).set(2, 2, col).set(3, 3, P.trunk);
  else c.set(3, 0, col).set(2, 1, col).set(1, 1, col).set(2, 2, col).set(1, 2, col).set(0, 3, P.trunk);
  return c;
}

function firefly(): PixelCanvas {
  const c = new PixelCanvas(5, 5);
  c.set(2, 1, 0xd8ff8a).set(1, 2, 0xd8ff8a).set(3, 2, 0xd8ff8a).set(2, 3, 0xd8ff8a).set(2, 2, 0xfffbe0);
  return c;
}

function flake(big: boolean): PixelCanvas {
  const c = new PixelCanvas(3, 3);
  if (big) c.set(1, 0, 0xffffff).set(0, 1, 0xffffff).set(1, 1, 0xffffff).set(2, 1, 0xffffff).set(1, 2, 0xffffff);
  else c.set(1, 1, 0xffffff);
  return c;
}

export class Ambient {
  readonly root = new Container();
  private bits: Bit[] = [];
  private seed = 1;
  private time = 0;

  constructor(private sprites: Sprites, map: MapDef) {
    const want = ambientFor(map);
    const add = (kind: Kind, n: number) => { for (let i = 0; i < n; i++) this.bits.push(this.make(kind, i)); };
    add('butterfly', want.butterflies);
    add('leaf', want.leaves);
    add('firefly', want.fireflies);
    add('snow', want.snow);
  }

  get empty(): boolean { return this.bits.length === 0; }

  private tex(key: string, make: () => PixelCanvas): Texture { return this.sprites.get(key, make); }

  private make(kind: Kind, i: number): Bit {
    const look = i % 3;
    const s = new Sprite(kind === 'butterfly' ? this.tex(`amb:bf:${look}:1`, () => butterfly(look, true))
      : kind === 'leaf' ? this.tex(`amb:leaf:${look}:0`, () => leaf(look, false))
      : kind === 'firefly' ? this.tex('amb:ff', firefly)
      : this.tex(`amb:snow:${i % 2}`, () => flake(i % 2 === 0)));
    s.anchor.set(0.5);
    s.visible = false;
    this.root.addChild(s);
    return { s, kind, x: Number.NaN, y: 0, vx: 0, vy: 0, phase: i * 1.7, look };
  }

  private rand(): number { this.seed = (this.seed + 1) | 0; return (hash32(this.seed, 977) & 0xffff) / 0xffff; }

  /** Put a bit somewhere in (or, for falling things, just above) the view. */
  private place(b: Bit, v: { x: number; y: number; w: number; h: number }, first: boolean): void {
    b.x = v.x + this.rand() * v.w;
    b.y = b.kind === 'leaf' || b.kind === 'snow' ? (first ? v.y + this.rand() * v.h : v.y - 6) : v.y + v.h * (0.15 + this.rand() * 0.7);
    b.vx = (this.rand() - 0.5) * (b.kind === 'butterfly' ? 26 : b.kind === 'firefly' ? 8 : 10);
    b.vy = b.kind === 'leaf' ? 9 + this.rand() * 6 : b.kind === 'snow' ? 10 + this.rand() * 10 : 0;
  }

  /**
   * `view` is the visible world rectangle (world px). `dusk` 0–1 is how much evening light there is:
   * butterflies go home as it grows, fireflies come out.
   */
  update(dt: number, view: { x: number; y: number; w: number; h: number }, dusk: number, calm: boolean): void {
    this.time += dt;
    const t = this.time;
    for (const b of this.bits) {
      const want = b.kind === 'butterfly' ? dusk < 0.5 : b.kind === 'firefly' ? dusk > 0.35 : true;
      if (calm || !want) { b.s.visible = false; b.x = Number.NaN; continue; }
      const out = !(b.x >= view.x - 24 && b.x <= view.x + view.w + 24 && b.y >= view.y - 24 && b.y <= view.y + view.h + 24);
      if (Number.isNaN(b.x) || out) this.place(b, view, Number.isNaN(b.x));
      switch (b.kind) {
        case 'butterfly': {
          b.x += (b.vx + Math.sin(t * 0.9 + b.phase) * 14) * dt;
          b.y += Math.sin(t * 2.3 + b.phase) * 10 * dt;
          const open = Math.sin(t * 14 + b.phase) > 0;
          b.s.texture = this.tex(`amb:bf:${b.look}:${open ? 1 : 0}`, () => butterfly(b.look, open));
          b.s.scale.x = b.vx < 0 ? -1 : 1;
          break;
        }
        case 'leaf': {
          b.x += (b.vx + Math.sin(t * 1.6 + b.phase) * 12) * dt;
          b.y += b.vy * dt;
          const flip = Math.sin(t * 3 + b.phase) > 0;
          b.s.texture = this.tex(`amb:leaf:${b.look}:${flip ? 1 : 0}`, () => leaf(b.look, flip));
          break;
        }
        case 'firefly':
          b.x += (b.vx + Math.sin(t * 0.7 + b.phase) * 6) * dt;
          b.y += Math.sin(t * 0.9 + b.phase * 2) * 5 * dt;
          b.s.alpha = Math.min(1, (dusk - 0.35) * 2.5) * (0.55 + 0.45 * wave(FX.fireflyGlowHz, t, b.phase));
          break;
        case 'snow':
          b.x += (b.vx + Math.sin(t * 1.1 + b.phase) * 6) * dt;
          b.y += b.vy * dt;
          break;
      }
      b.s.visible = true;
      b.s.x = Math.round(b.x);
      b.s.y = Math.round(b.y);
    }
  }
}

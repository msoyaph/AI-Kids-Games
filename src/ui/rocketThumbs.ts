import { S } from '../app/services';
import type { RocketLoadout } from '../data/types';
import { disposeObject } from '../r3/dispose';
import { RocketModel } from '../r3/models/rocket';
import { snapshot } from '../r3/snapshot';

/**
 * Little 3D rocket pictures for the hangar cards. Rendering one takes a few milliseconds, so they
 * are drawn one per frame from a queue and cached by loadout.
 */
const cache = new Map<string, HTMLCanvasElement>();
const queue: Array<{ key: string; loadout: RocketLoadout; targets: HTMLCanvasElement[] }> = [];
let pumping = false;

const W = 96;
const H = 132;

function keyOf(l: RocketLoadout): string {
  return [l.nose, l.body, l.engine, l.fins, l.tank, l.cargo, l.lights, l.paint, ...l.stickers].join('|');
}

function render(l: RocketLoadout): HTMLCanvasElement | null {
  const r3 = S.game?.r3;
  if (!r3 || r3.lost) return null;
  const rocket = new RocketModel(l, { glossy: false, detail: false, merge: false });
  rocket.update(0.5, 0.35, 0);
  const e = rocket.extent;
  const mid = (e.top + e.bottom) / 2;
  rocket.group.position.y = -mid;
  rocket.group.rotation.set(0.12, -0.5, 0);
  const span = e.top - e.bottom;
  const fov = 30;
  const dist = (span * 0.56) / Math.tan(((fov / 2) * Math.PI) / 180);
  const c = snapshot(r3.renderer, rocket.group, { size: W, width: W * 2, height: H * 2, fov, distance: dist, lit: r3.env });
  disposeObject(rocket.group);
  return c;
}

function copyInto(src: HTMLCanvasElement, dst: HTMLCanvasElement): void {
  dst.width = src.width;
  dst.height = src.height;
  dst.getContext('2d')?.drawImage(src, 0, 0);
}

function pump(): void {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const job = queue.shift();
    if (!job) {
      pumping = false;
      return;
    }
    let c = cache.get(job.key);
    if (!c) {
      const made = render(job.loadout);
      if (made) {
        c = made;
        cache.set(job.key, c);
        if (cache.size > 120) cache.delete(cache.keys().next().value as string);
      }
    }
    if (c) for (const t of job.targets) if (t.isConnected) copyInto(c, t);
    setTimeout(step, 16);
  };
  setTimeout(step, 0);
}

/** A canvas that fills in with a 3D picture of this rocket as soon as it is ready. */
export function rocketThumb(l: RocketLoadout, cssW = 64, cssH = 88): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const key = keyOf(l);
  const hit = cache.get(key);
  if (hit) copyInto(hit, canvas);
  else {
    const pending = queue.find((q) => q.key === key);
    if (pending) pending.targets.push(canvas);
    else queue.push({ key, loadout: { ...l, stickers: [...l.stickers] }, targets: [canvas] });
    pump();
  }
  return canvas;
}

/** Drop queued pictures for screens that closed. */
export function clearThumbQueue(): void {
  queue.length = 0;
}

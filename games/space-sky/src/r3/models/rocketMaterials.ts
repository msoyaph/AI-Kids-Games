import {
  CanvasTexture,
  Color,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
} from 'three';
import type { PaintColors } from '../../data/types';
import { drawSticker } from '../../gfx/art/stickers';
import { markShared } from '../dispose';

/**
 * Rocket materials. Plain colors are cached and shared across scenes; the painted body texture
 * (pattern + stickers) belongs to one rocket and is freed with it.
 */
const cache = new Map<string, Material>();

function shared<T extends Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = markShared(make());
    cache.set(key, m);
  }
  return m;
}

/** Glossy painted panels. High tier gets a clear coat like a toy car. */
export function paintMat(color: string, glossy: boolean): Material {
  return shared(`paint:${color}:${glossy}`, () =>
    glossy
      ? new MeshPhysicalMaterial({ color, roughness: 0.38, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.6 })
      : new MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.05, envMapIntensity: 1.6 }),
  );
}

export function metalMat(kind: 'bright' | 'dark' | 'gold' = 'bright'): Material {
  return shared(`metal:${kind}`, () =>
    new MeshStandardMaterial({
      color: kind === 'bright' ? '#d6dcf0' : kind === 'gold' ? '#ffc83d' : '#4a4f6a',
      metalness: 0.92,
      roughness: kind === 'dark' ? 0.4 : 0.24,
      envMapIntensity: 2.4,
    }),
  );
}

export function glassMat(color: string): Material {
  return shared(`glass:${color}`, () => {
    const c = new Color(color);
    return new MeshStandardMaterial({ color: c, metalness: 0.15, roughness: 0.05, emissive: c.clone().multiplyScalar(0.35), envMapIntensity: 3.0 });
  });
}

/** Unlit glowing color (lights, engine throats, crystal hearts). Values above 1 bloom. */
export function glowMat(color: string, power = 2): Material {
  return shared(`glow:${color}:${power}`, () => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) }));
}

/** Crystal parts (Zephyra): faceted, shiny, softly glowing from inside. */
export function crystalMat(color: string): Material {
  return shared(`crystal:${color}`, () => {
    const c = new Color(color);
    return new MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.12, emissive: c.clone().multiplyScalar(0.45), flatShading: true, envMapIntensity: 2.6, transparent: true, opacity: 0.92 });
  });
}

export function fabricMat(color: string): Material {
  return shared(`fabric:${color}`, () => new MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }));
}

function soften(hex: string): string {
  const c = new Color(hex);
  const max = Math.max(c.r, c.g, c.b);
  if (max > 0.86) c.multiplyScalar(0.86 / max);
  return `#${c.getHexString()}`;
}

const RAINBOW = ['#ff5d73', '#ff9f43', '#ffe066', '#8cff66', '#4dd4ff', '#9b6bff'];

/**
 * The body's paint job drawn on a canvas and wrapped around the lathe:
 * u = around (front is u = 0.5), v = bottom (0) to top (1).
 */
export function paintTexture(paint: PaintColors, stickers: string[], bodyHeight: number, bodyRadius: number, panelLines: boolean): CanvasTexture {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const yOf = (v: number) => (1 - v) * H;
  // Pure white paint blows out under bright lights: keep it a soft white.
  g.fillStyle = soften(paint.main);
  g.fillRect(0, 0, W, H);
  if (paint.pattern === 'stripes') {
    g.fillStyle = paint.accent;
    for (let i = -4; i < 12; i++) {
      g.beginPath();
      const x = i * 64;
      g.moveTo(x, H);
      g.lineTo(x + 26, H);
      g.lineTo(x + 26 + 90, 0);
      g.lineTo(x + 90, 0);
      g.closePath();
      g.globalAlpha = 0.55;
      g.fill();
    }
    g.globalAlpha = 1;
  } else if (paint.pattern === 'rainbow') {
    const bands = RAINBOW.length;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = RAINBOW[i];
      g.fillRect(0, yOf(0.18 + (i + 1) * 0.09), W, H * 0.09 + 1);
    }
  } else if (paint.pattern === 'stars') {
    g.fillStyle = paint.trim;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = 3 + rnd() * 5;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    }
  }
  // Accent band under the nose, trim band near the bottom.
  g.fillStyle = paint.accent;
  g.fillRect(0, yOf(0.9), W, H * 0.06);
  g.fillStyle = paint.trim;
  g.fillRect(0, yOf(0.17), W, H * 0.05);
  if (panelLines) {
    g.strokeStyle = 'rgba(20, 12, 50, 0.22)';
    g.lineWidth = 2;
    for (const v of [0.32, 0.6]) {
      g.beginPath();
      g.moveTo(0, yOf(v));
      g.lineTo(W, yOf(v));
      g.stroke();
    }
    for (const u of [0.125, 0.375, 0.625, 0.875]) {
      g.beginPath();
      g.moveTo(u * W, yOf(0.17));
      g.lineTo(u * W, yOf(0.84));
      g.stroke();
    }
  }
  // Stickers on the front, left and right of the window side.
  const circ = 2 * Math.PI * bodyRadius;
  const pxU = W / circ;
  const pxV = H / bodyHeight;
  const size = 0.42;
  const spots = stickers.length === 1 ? [0.5] : [0.4, 0.6];
  stickers.slice(0, 2).forEach((id, i) => {
    const cx = spots[i] * W;
    const cy = yOf(0.42);
    g.save();
    g.translate(cx, cy);
    g.scale((size * pxU) / 64, (size * pxV) / 64);
    try {
      drawSticker(g, id, 0, 0, 30);
    } catch {
      /* missing sticker art: skip */
    }
    g.restore();
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

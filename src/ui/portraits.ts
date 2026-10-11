import { S } from '../app/services';
import { CHAR_BY_ID } from '../data/characters';
import type { AstronautLook } from '../data/types';
import { drawToCanvas } from '../gfx/canvas';
import { drawPortrait, type Mood as Mood2D } from '../gfx/art/characters';
import { disposeObject } from '../r3/dispose';
import { Character, type CharacterOptions, type Mood } from '../r3/models/characters';
import { snapshot } from '../r3/snapshot';

/**
 * Character portraits for the DOM (dialogue, radio, mission board, hub banner...): rendered from the
 * same 3D models as the game, on the character's colored disc, cached per look and mood.
 * Falls back to the flat 2D portrait if 3D is not available.
 */
const cache = new Map<string, HTMLCanvasElement>();

function profileKey(p?: AstronautLook): string {
  return p ? [p.suit, p.accent, p.helmet, p.skin, p.hair, p.hairStyle, p.face, p.outfit].join(',') : '';
}

function render3d(id: string, mood: Mood, px: number, profile?: AstronautLook, opts?: CharacterOptions): HTMLCanvasElement | null {
  const r3 = S.game?.r3;
  if (!r3 || r3.lost) return null;
  const ch = new Character(id, profile, opts);
  ch.freeze(mood);
  // Put the face at the origin and frame head and shoulders.
  ch.group.position.y = -ch.headY + ch.headR * 0.15;
  ch.group.rotation.y = -0.18;
  const wide = opts?.frame === 'wide';
  const full = opts?.frame === 'full';
  if (wide) ch.group.position.y -= ch.headR * 0.35;
  if (full) {
    // The whole cadet, turned a little so capes and jet packs show.
    ch.group.position.y = -ch.height * 0.5;
    ch.group.rotation.y = -0.65;
  }
  const span = full ? ch.height * 1.12 : ch.headR * (id === 'tuggy' ? 3.2 : wide ? 4.6 : 3.6);
  const fov = 24;
  const dist = span / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
  let shot: HTMLCanvasElement;
  try {
    shot = snapshot(r3.renderer, ch.group, { size: px, fov, distance: dist, camY: full ? 0 : ch.headR * 0.25, lit: r3.env });
  } finally {
    disposeObject(ch.group);
  }
  // Composite onto the character's colored disc.
  const def = CHAR_BY_ID[id] ?? CHAR_BY_ID.player;
  const out = document.createElement('canvas');
  out.width = out.height = px;
  const g = out.getContext('2d')!;
  const r = px / 2;
  const grad = g.createRadialGradient(r * 0.75, r * 0.6, r * 0.1, r, r, r);
  grad.addColorStop(0, lighten(def.bg, 0.35));
  grad.addColorStop(1, def.bg);
  g.save();
  g.beginPath();
  g.arc(r, r, r - 1, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  // Soft sparkles in the corner.
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (const [x, y, s] of [[0.2, 0.25, 0.04], [0.82, 0.22, 0.03], [0.86, 0.7, 0.025]]) {
    g.beginPath();
    g.arc(x * px, y * px, s * px, 0, Math.PI * 2);
    g.fill();
  }
  g.drawImage(shot, 0, 0);
  g.restore();
  return out;
}

function lighten(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

const TO_3D: Record<string, Mood> = { happy: 'happy', wow: 'wow', think: 'think', sleepy: 'sleepy' };

/** A portrait canvas of `cssSize` CSS pixels. */
export function portraitEl(id: string, cssSize: number, mood: Mood2D | Mood = 'happy', profile?: AstronautLook, opts?: CharacterOptions): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = cssSize * dpr <= 128 ? 128 : cssSize * dpr <= 192 ? 192 : 256;
  const key = `${id}:${mood}:${px}:${profileKey(id === 'player' ? profile : undefined)}:${opts?.helmet === false ? 'nohelmet' : ''}:${opts?.frame ?? ''}`;
  let src = cache.get(key);
  if (!src) {
    const made = render3d(id, TO_3D[mood] ?? 'happy', px, id === 'player' ? profile : undefined, opts);
    if (made) {
      src = made;
      cache.set(key, src);
    }
  }
  const out = document.createElement('canvas');
  if (src) {
    out.width = src.width;
    out.height = src.height;
    out.getContext('2d')?.drawImage(src, 0, 0);
    out.style.width = `${cssSize}px`;
    out.style.height = `${cssSize}px`;
    return out;
  }
  const ch = CHAR_BY_ID[id] ?? CHAR_BY_ID.player;
  return drawToCanvas(cssSize, cssSize, (c, w, hh) => drawPortrait(c, ch, w, hh, mood as Mood2D, profile));
}

/** Forget cached portraits of the player (after changing the cadet's look). */
export function clearPlayerPortraits(): void {
  for (const k of [...cache.keys()]) if (k.startsWith('player:')) cache.delete(k);
}

let warming = false;
/** Pre-draw common portraits in the background (one every ~120 ms) so dialogue opens without a hitch. */
export function warmPortraits(ids: string[], profile?: AstronautLook): void {
  if (warming) return;
  warming = true;
  const jobs: Array<[string, number]> = [];
  for (const id of ids) for (const size of [150, 84]) jobs.push([id, size]);
  const step = () => {
    const job = jobs.shift();
    if (!job || S.game?.r3?.lost) {
      warming = false;
      return;
    }
    portraitEl(job[0], job[1], 'happy', job[0] === 'player' ? profile : undefined);
    setTimeout(step, 120);
  };
  setTimeout(step, 600);
}

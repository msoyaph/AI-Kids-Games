import { hashString } from '../core/rng';
import type { MapDef, ThemeId } from './maps/types';

/**
 * Map Workshop data: a player map is only tiles + theme + construct tier +
 * a generated name (two word indices). Share codes carry exactly that — no
 * free text — packed into bits, with a checksum, in a 32-letter alphabet.
 *
 *   VX1.<base32 payload>
 */

export const WS_COLS = 20;
export const WS_ROWS = 12;
export const WS_PREFIX = 'VX1.';
const VERSION = 1;

/** Tiles a player can paint (index = 4-bit code). */
export const WS_TILES = ['.', 'o', '=', '#', 'T', '~', 'B', 'S', 'C', 'P', 'Q'] as const;
export type WsTile = (typeof WS_TILES)[number];

export const WS_THEMES: ThemeId[] = ['meadow', 'desert', 'snow', 'caves', 'sky', 'rift'];
/** Construct tier = which world's mechanics the waves use (1–6). */
export const WS_TIERS = [1, 2, 3, 4, 5, 6] as const;
/** Size of the generated-name word lists (indices only travel in codes). */
export const WS_WORDS = 32;

export interface WorkshopMap {
  grid: string[];
  theme: ThemeId;
  tier: number;
  /** Generated name: adjective + noun indices into the word lists. */
  adj: number;
  noun: number;
}

// ---------------------------------------------------------------- bits & base32

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)

class BitWriter {
  bits: number[] = [];
  write(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
}

class BitReader {
  pos = 0;
  constructor(private readonly bits: number[]) {}
  read(width: number): number {
    if (this.pos + width > this.bits.length) throw new Error('short');
    let v = 0;
    for (let i = 0; i < width; i++) v = (v << 1) | this.bits[this.pos++]!;
    return v;
  }
}

/** 16-bit FNV-1a over the payload bits (detects typos and tampering). */
function checksum(bits: number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | (bits[i + k] ?? 0);
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h ^ (h >>> 16)) & 0xffff;
}

function toBase32(bits: number[]): string {
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    let v = 0;
    for (let k = 0; k < 5; k++) v = (v << 1) | (bits[i + k] ?? 0);
    out += ALPHABET[v];
  }
  return out;
}

function fromBase32(s: string): number[] | null {
  const bits: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1);
  }
  return bits;
}

// ---------------------------------------------------------------- encode / decode

export function encodeWorkshop(m: WorkshopMap): string {
  const w = new BitWriter();
  w.write(VERSION, 4);
  w.write(WS_THEMES.indexOf(m.theme), 3);
  w.write(m.tier - 1, 3);
  w.write(m.adj, 5);
  w.write(m.noun, 5);
  w.write(m.grid[0]!.length, 5);
  w.write(m.grid.length, 5);
  for (const row of m.grid) for (const ch of row) w.write(WS_TILES.indexOf(ch as WsTile), 4);
  const sum = checksum(w.bits);
  w.write(sum, 16);
  return WS_PREFIX + toBase32(w.bits);
}

export type DecodeError = 'format' | 'version' | 'checksum' | 'size' | 'tile' | 'theme';

/** Strictly decode a share code. Never throws; returns an error code instead. */
export function decodeWorkshop(raw: string): { map: WorkshopMap } | { error: DecodeError } {
  const code = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!code.startsWith(WS_PREFIX.toUpperCase()) || code.length > 400) return { error: 'format' };
  const bits = fromBase32(code.slice(WS_PREFIX.length));
  if (!bits || bits.length < 40) return { error: 'format' };
  try {
    const r = new BitReader(bits);
    const version = r.read(4);
    if (version !== VERSION) return { error: 'version' };
    const theme = r.read(3);
    const tier = r.read(3) + 1;
    const adj = r.read(5);
    const noun = r.read(5);
    const cols = r.read(5);
    const rows = r.read(5);
    if (cols !== WS_COLS || rows !== WS_ROWS) return { error: 'size' };
    if (theme >= WS_THEMES.length || tier > 6) return { error: 'theme' };
    const grid: string[] = [];
    for (let y = 0; y < rows; y++) {
      let row = '';
      for (let x = 0; x < cols; x++) {
        const t = r.read(4);
        if (t >= WS_TILES.length) return { error: 'tile' };
        row += WS_TILES[t];
      }
      grid.push(row);
    }
    const payloadBits = r.pos;
    const sum = r.read(16);
    if (checksum(bits.slice(0, payloadBits)) !== sum) return { error: 'checksum' };
    return { map: { grid, theme: WS_THEMES[theme]!, tier, adj, noun } };
  } catch {
    return { error: 'format' };
  }
}

// ---------------------------------------------------------------- names, defaults, MapDef

/** A fresh, deterministic name for a new map. */
export function generatedName(seed: number): { adj: number; noun: number } {
  return { adj: seed % WS_WORDS, noun: Math.floor(seed / WS_WORDS) % WS_WORDS };
}

/** An empty field with a spawn and a castle, ready to edit. */
export function blankWorkshop(seed = Date.now()): WorkshopMap {
  const grid: string[] = [];
  for (let y = 0; y < WS_ROWS; y++) {
    let row = '';
    for (let x = 0; x < WS_COLS; x++) {
      const edge = y === 0 || y === WS_ROWS - 1 || x === 0 || x === WS_COLS - 1;
      if (x === 0 && (y === 5 || y === 6)) row += 'S';
      else if (x >= WS_COLS - 2 && (y === 5 || y === 6)) row += 'C';
      else row += edge ? 'T' : '.';
    }
    grid.push(row);
  }
  const n = generatedName(seed >>> 0);
  return { grid, theme: 'meadow', tier: 1, adj: n.adj, noun: n.noun };
}

/** Turn a workshop map into a playable MapDef (`name` comes from the word lists). */
export function workshopToMapDef(m: WorkshopMap, name: string, story: string): MapDef {
  const code = encodeWorkshop(m);
  const hasOpen = m.grid.some((r) => r.includes('.'));
  return {
    id: `ws-${(hashString(code) >>> 0).toString(36)}`,
    name,
    story,
    world: m.tier,
    theme: m.theme,
    style: hasOpen ? 'maze' : 'path',
    grid: m.grid.slice(),
  };
}

/**
 * Compact save formats. A creature packs into 17 bytes (23 base64url characters), so a full Agent
 * Base of 240 friends is under 6 KB. Bitsets (story flags, Field Guide pages) pack 6 flags per
 * character. Numeric ids (species `num`, move `n`, item `n`) are stable forever, so old saves keep
 * meaning the same thing.
 */
import { PERSONALITIES, type Creature, type Dex, type Item } from '../types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]));

class BitWriter {
  private bits: number[] = [];
  write(value: number, width: number) {
    const v = Math.max(0, Math.min(2 ** width - 1, Math.floor(value)));
    for (let i = width - 1; i >= 0; i--) this.bits.push(Math.floor(v / 2 ** i) % 2);
  }
  toString(): string {
    let out = '';
    for (let i = 0; i < this.bits.length; i += 6) {
      let n = 0;
      for (let j = 0; j < 6; j++) n = n * 2 + (this.bits[i + j] ?? 0);
      out += B64[n];
    }
    return out;
  }
}

class BitReader {
  private bits: number[] = [];
  private at = 0;
  constructor(text: string) {
    for (const ch of text) {
      const n = B64_INDEX.get(ch);
      if (n === undefined) throw new Error('bad character in packed data');
      for (let j = 5; j >= 0; j--) this.bits.push((n >> j) & 1);
    }
  }
  read(width: number): number {
    if (this.at + width > this.bits.length) throw new Error('packed data too short');
    let v = 0;
    for (let i = 0; i < width; i++) v = v * 2 + this.bits[this.at++]!;
    return v;
  }
}

/** Format version of a packed creature (first character). */
const CREATURE_FORMAT = 1;
const WIDTH = { species: 7, level: 6, xp: 20, energy: 10, move: 8, nick: 11, personality: 3, shimmer: 1, friendship: 8, uid: 16, gear: 8, met: 8, hold: 1 };

export interface CodecTables {
  speciesByNum: Map<number, string>;
  numBySpecies: Map<string, number>;
  moveByN: Map<number, string>;
  nByMove: Map<string, number>;
  itemByN: Map<number, string>;
  nByItem: Map<string, number>;
}

export function codecTables(dex: Dex, items: Record<string, Item>): CodecTables {
  const species = Object.values(dex.species), moves = Object.values(dex.moves), list = Object.values(items);
  return {
    speciesByNum: new Map(species.map(s => [s.num, s.id])),
    numBySpecies: new Map(species.map(s => [s.id, s.num])),
    moveByN: new Map(moves.map(m => [m.n, m.id])),
    nByMove: new Map(moves.map(m => [m.id, m.n])),
    itemByN: new Map(list.map(i => [i.n, i.id])),
    nByItem: new Map(list.map(i => [i.id, i.n])),
  };
}

export function packCreature(t: CodecTables, c: Creature): string {
  const w = new BitWriter();
  w.write(CREATURE_FORMAT, 6);
  w.write(t.numBySpecies.get(c.species) ?? 0, WIDTH.species);
  w.write(c.level, WIDTH.level);
  w.write(c.xp, WIDTH.xp);
  w.write(c.energy, WIDTH.energy);
  for (let i = 0; i < 4; i++) w.write(c.moves[i] ? t.nByMove.get(c.moves[i]!) ?? 0 : 0, WIDTH.move);
  w.write(c.nick + 1, WIDTH.nick);
  w.write(PERSONALITIES.indexOf(c.personality), WIDTH.personality);
  w.write(c.shimmer ? 1 : 0, WIDTH.shimmer);
  w.write(c.friendship, WIDTH.friendship);
  w.write(c.uid, WIDTH.uid);
  w.write(c.gear ? t.nByItem.get(c.gear) ?? 0 : 0, WIDTH.gear);
  w.write(c.met, WIDTH.met);
  w.write(c.holdGrowth ? 1 : 0, WIDTH.hold);
  return w.toString();
}

/** Unpacks a creature; returns null for unreadable data or unknown species (never throws). */
export function unpackCreature(t: CodecTables, text: string): Creature | null {
  try {
    const r = new BitReader(text);
    const format = r.read(6);
    if (format !== CREATURE_FORMAT) return null;
    const species = t.speciesByNum.get(r.read(WIDTH.species));
    if (!species) return null;
    const level = r.read(WIDTH.level), xp = r.read(WIDTH.xp), energy = r.read(WIDTH.energy);
    const moves: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = t.moveByN.get(r.read(WIDTH.move));
      if (id && !moves.includes(id)) moves.push(id);
    }
    const nick = r.read(WIDTH.nick) - 1;
    const personality = PERSONALITIES[r.read(WIDTH.personality)] ?? 'cheerful';
    const shimmer = r.read(WIDTH.shimmer) === 1;
    const friendship = r.read(WIDTH.friendship), uid = r.read(WIDTH.uid);
    const gear = t.itemByN.get(r.read(WIDTH.gear));
    const met = r.read(WIDTH.met);
    const hold = r.read(WIDTH.hold) === 1;
    const c: Creature = { uid, species, nick, level: Math.max(1, level), xp, energy, moves, personality, shimmer, friendship, met };
    if (gear) c.gear = gear;
    if (hold) c.holdGrowth = true;
    return c;
  } catch {
    return null;
  }
}

/** Bitset of `size` flags → base64url. */
export function packBits(set: ReadonlySet<number> | readonly boolean[], size: number): string {
  const w = new BitWriter();
  for (let i = 0; i < size; i++) w.write(Array.isArray(set) ? (set[i] ? 1 : 0) : (set as ReadonlySet<number>).has(i) ? 1 : 0, 1);
  return w.toString();
}

export function unpackBits(text: string, size: number): Set<number> {
  const out = new Set<number>();
  try {
    const r = new BitReader(text);
    for (let i = 0; i < size; i++) if (r.read(1)) out.add(i);
  } catch {
    /* short or bad data: fewer flags, never a crash */
  }
  return out;
}

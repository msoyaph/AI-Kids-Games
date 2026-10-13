/**
 * The adventure in progress: the game state, the current map's World, the Field Guide, friends,
 * and saving. Shared by the overworld, battles and menus. Capture routes never save.
 */
import { heal as healOne, makeCreature, maxEnergy } from '../core/creature';
import { hash32, hashStr, Rng } from '../core/rng';
import { addFriend, addItem, type Dir, type GameState } from '../core/state';
import type { Creature } from '../core/types';
import { World } from '../core/world/world';
import { CODEC, DEX } from '../data/index';
import { MAPS } from '../data/maps/index';
import { NICKNAMES, PLAYER_NAMES } from '../data/names';
import { SPECIES } from '../data/species';
import { RIVAL_PARTNER } from '../data/trainers';
import type { Settings } from './settings';
import { saveSlot, type WriteResult } from './store';

export class Session {
  world!: World;
  /** Last save result, for the "storage is full" note. */
  lastSave: WriteResult | null = null;

  constructor(public state: GameState, public settings: Settings, readonly noSave: boolean) {}

  get dex() { return DEX; }

  playerName(): string { return PLAYER_NAMES[this.state.name] ?? 'Agent'; }

  /** A friend's name: its nickname or its species name. */
  friendName(c: Creature): string {
    return c.nick >= 0 ? NICKNAMES[c.nick] ?? SPECIES[c.species]!.name : SPECIES[c.species]!.name;
  }

  names(): Record<string, string> {
    const partner = this.state.team.find(c => c.uid === 1) ?? this.state.team[0];
    return {
      player: this.playerName(),
      rival: 'Juno',
      partner: partner ? this.friendName(partner) : 'your partner',
      rivalPartner: SPECIES[RIVAL_PARTNER[this.state.starter] ?? 'spinnet']!.name,
    };
  }

  /** Enter a map at a tile (the overworld scene builds its sprites from `world`). */
  enterMap(id: string, x: number, y: number, dir: Dir): World {
    const def = MAPS[id];
    if (!def) throw new Error(`no map ${id}`);
    this.state.map = id;
    this.state.x = x;
    this.state.y = y;
    this.state.dir = dir;
    const rng = new Rng(this.state.rng);
    const seed = hash32(rng.int(2 ** 31), hashStr(id));
    this.state.rng = rng.state;
    this.world = new World(def, this.state, DEX, seed);
    this.world.populate();
    return this.world;
  }

  /** Meeting a species fills in its Field Guide page (seen). */
  seen(species: string): void {
    const num = SPECIES[species]?.num;
    if (num) this.state.guide.seen.add(num);
  }

  /** A new friend joins (team first, then the Agent Base). Research stars grow with friends. */
  befriend(c: Creature): 'team' | 'base' | 'full' {
    c.energy = maxEnergy(DEX, c);
    c.friendship = Math.max(c.friendship, 20);
    const where = addFriend(this.state, c);
    const sp = SPECIES[c.species]!;
    this.state.guide.seen.add(sp.num);
    this.state.guide.friends.add(sp.num);
    if (c.shimmer) this.state.guide.shimmer.add(sp.num);
    this.state.stats.befriends++;
    this.research(sp.num);
    return where;
  }

  /**
   * Field Guide research stars: ★ befriended, ★★ two of that species or a grown one,
   * ★★★ three befriended or the final stage. Three stars invites a shimmer to appear.
   */
  research(num: number): void {
    const all = [...this.state.team, ...this.state.base].filter(c => SPECIES[c.species]?.num === num);
    const sp = Object.values(SPECIES).find(s => s.num === num)!;
    let stars = all.length ? 1 : 0;
    if (all.length >= 2 || sp.stage >= 2) stars = Math.max(stars, 2);
    if (all.length >= 3 || sp.stage === 3) stars = Math.max(stars, 3);
    if (sp.guardian && all.length) stars = 3;
    this.state.guide.stars[num] = Math.max(this.state.guide.stars[num] ?? 0, stars);
  }

  makeWild(species: string, level: number, shimmer = false, seed = 0): Creature {
    return makeCreature(DEX, { species, level, shimmer }, new Rng(hash32(seed, this.state.stats.battles, level)));
  }

  /** Everyone gets full energy (Rest Stops, Gran's snack). */
  healAll(): void {
    for (const c of [...this.state.team, ...this.state.base]) healOne(DEX, c);
  }

  /** The nearest Rest Stop becomes where you wake after a lost spar. */
  setRestHere(): void {
    const def = MAPS[this.state.map];
    const spot = def?.rest ?? { x: this.state.x, y: this.state.y };
    this.state.rest = { map: this.state.map, x: spot.x, y: spot.y };
  }

  give(item: string, n = 1): void { addItem(this.state, item, n); }

  awakeTeam(): Creature[] { return this.state.team.filter(c => c.energy > 0); }

  save(): WriteResult | null {
    if (this.noSave) return null;
    this.lastSave = saveSlot(CODEC, this.state).result;
    return this.lastSave;
  }
}

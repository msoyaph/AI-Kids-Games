/**
 * Draws one map: the baked ground, depth-sorted props, people, wild Agentmon and tall-grass tufts.
 * The overworld scene moves the camera and animates; this owns the Pixi objects.
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import { playerLook, type CharLook } from '../art/characters';
import { bakeGround, tallGrassTuft } from '../art/ground';
import * as props from '../art/props';
import type { PixelCanvas } from '../art/pixelcanvas';
import { P } from '../art/palette';
import type { MapObject } from '../core/world/map';
import type { NpcState, WildMon, World } from '../core/world/world';
import type { GameState } from '../core/state';
import { bigTextures } from './atlas';
import type { Sprites } from './sprites';

export const TILE = 16;

export class WorldView {
  readonly root = new Container();
  readonly ground = new Container();
  readonly actors = new Container();
  player!: Sprite;
  playerLook!: CharLook;
  private objSprites = new Map<string, Sprite>();
  npcSprites = new Map<string, Sprite>();
  wildSprites = new Map<number, Sprite>();
  private groundTextures: Texture[] = [];

  constructor(private sprites: Sprites, private world: World, private state: GameState) {
    this.actors.sortableChildren = true;
    this.root.addChild(this.ground, this.actors);
    this.build();
  }

  private build(): void {
    const w = this.world;
    const pc = bakeGround({ w: w.w, h: w.h, at: (x, y) => w.ter(x, y), theme: w.def.theme ?? 0 });
    for (const chunk of bigTextures(pc)) {
      const s = new Sprite(chunk.tex);
      s.x = chunk.x;
      s.y = chunk.y;
      this.ground.addChild(s);
      this.groundTextures.push(chunk.tex);
    }
    // tall grass tufts (drawn over people wading through, under wild Agentmon)
    const tuft = this.sprites.get('tuft:0', () => tallGrassTuft(0));
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      if (w.ter(x, y) !== 'tall') continue;
      const s = new Sprite(tuft);
      s.x = x * TILE;
      s.y = y * TILE;
      s.zIndex = (y + 1) * TILE + 0.5;
      this.actors.addChild(s);
    }
    for (const o of w.map.objects) this.addObject(o);
    this.syncObjects();
    const look = this.state.look;
    this.playerLook = playerLook(look.skin, look.hair, look.hairColor, look.outfit);
    this.player = new Sprite(this.sprites.character('player', this.playerLook, this.state.dir, 0));
    this.player.anchor.set(0.5, 1);
    this.actors.addChild(this.player);
    for (const n of w.npcs) this.addNpc(n);
    this.syncNpcs();
  }

  destroy(): void {
    this.root.destroy({ children: true });
    for (const t of this.groundTextures) t.destroy(true);
  }

  private objectCanvas(o: MapObject): { key: string; make: () => PixelCanvas } | null {
    const seed = o.x * 31 + o.y * 17;
    switch (o.kind) {
      case 'tree': return { key: `tree:round:${seed % 4}`, make: () => props.tree('round', seed % 4) };
      case 'pine': return { key: 'tree:pine', make: () => props.tree('pine') };
      case 'snowpine': return { key: 'tree:snowpine', make: () => props.tree('snowpine') };
      case 'palm': return { key: 'tree:palm', make: () => props.tree('palm') };
      case 'blossom': return { key: `tree:blossom:${seed % 3}`, make: () => props.tree('blossom', seed % 3) };
      case 'autumn': return { key: `tree:autumn:${seed % 3}`, make: () => props.tree('autumn', seed % 3) };
      case 'crystal': return { key: 'tree:crystal', make: () => props.tree('crystal') };
      case 'bush': return { key: 'bush', make: () => props.bush() };
      case 'berrybush': return { key: 'bush:berry', make: () => props.bush(0, true) };
      case 'rock': return { key: `rock:${seed % 3}`, make: () => props.rock(seed % 3) };
      case 'boulder': return { key: 'boulder', make: () => props.boulder() };
      case 'vines': return { key: 'vines', make: () => props.vines() };
      case 'icewall': return { key: 'icewall', make: () => props.iceWall() };
      case 'machine': return { key: `machine:${this.state.flags.has(`powered:${this.world.def.id}:${o.id}`) ? 1 : 0}`, make: () => props.machine(this.state.flags.has(`powered:${this.world.def.id}:${o.id}`)) };
      case 'fence-h': return { key: 'fence:h', make: () => props.fence('h') };
      case 'fence-v': return { key: 'fence:v', make: () => props.fence('v') };
      case 'lamp': return { key: 'lamp', make: () => props.lamp() };
      case 'bench': return { key: 'bench', make: () => props.bench() };
      case 'pot': return { key: `pot:${seed % 4}`, make: () => props.flowerPot(seed % 4) };
      case 'crate': return { key: 'crate', make: () => props.crate() };
      case 'sign': return { key: 'sign', make: () => props.sign() };
      case 'house': {
        const hs = o.house!;
        return { key: `house:${o.id}:${o.w}x${o.h}:${hs.style.roof}:${hs.style.wall}:${hs.door}:${hs.kind}`, make: () => props.house(o.w ?? 3, o.h ?? 3, hs.style, hs.door, hs.kind) };
      }
      case 'beacon': { const lit = !!o.litBy && this.state.flags.has(o.litBy); return { key: `beacon:${lit ? 1 : 0}`, make: () => props.beacon(lit) }; }
      case 'lighthouse': { const lit = !!o.litBy && this.state.flags.has(o.litBy); return { key: `lighthouse:${lit ? 1 : 0}`, make: () => props.lighthouse(lit) }; }
      case 'lure': return { key: 'lure:1', make: () => props.lureTower(true) };
      case 'cave': return { key: 'cave', make: () => props.caveMouth() };
      case 'stairs': return { key: 'stairs', make: () => props.stairsDown() };
      case 'bed': return { key: 'bed', make: () => props.bed() };
      case 'table': return { key: 'table', make: () => props.table() };
      case 'shelf': return { key: 'shelf', make: () => props.shelf() };
      case 'counter': return { key: `counter:${o.w ?? 3}`, make: () => props.counter(o.w ?? 3) };
      case 'nest': return { key: 'nest', make: () => props.restNest() };
      case 'plant': return { key: 'plant', make: () => props.rugPlant() };
      case 'gift': return { key: 'gift', make: () => giftCanvas() };
      default: return null;
    }
  }

  private addObject(o: MapObject): void {
    const spec = this.objectCanvas(o);
    if (!spec) return;
    const tex = this.sprites.get(spec.key, spec.make);
    const s = new Sprite(tex);
    const w = (o.w ?? 1) * TILE;
    // bottom-centre of the footprint, at the bottom of its anchor tile
    s.anchor.set(0.5, 1);
    s.x = o.x * TILE + w / 2;
    s.y = (o.y + 1) * TILE;
    if (o.kind === 'house') s.y += 0;
    s.zIndex = (o.y + 1) * TILE - (o.kind === 'gift' ? 0.2 : 0.1);
    this.actors.addChild(s);
    this.objSprites.set(o.id!, s);
  }

  /** Show or hide objects whose flags changed (snipped vines, gifts taken, lit Beacons). */
  syncObjects(): void {
    for (const o of this.world.map.objects) {
      const s = this.objSprites.get(o.id!);
      if (!s) continue;
      s.visible = this.world.present(o);
      if (o.kind === 'boulder') { s.x = o.x * TILE + TILE / 2; s.y = (o.y + 1) * TILE; s.zIndex = s.y - 0.1; }
      if (o.kind === 'beacon' || o.kind === 'lighthouse' || o.kind === 'machine') {
        const spec = this.objectCanvas(o);
        if (spec) s.texture = this.sprites.get(spec.key, spec.make);
      }
    }
  }

  private addNpc(n: NpcState): void {
    const tex = n.def.creature ? this.sprites.creature(n.def.creature, 16) : this.sprites.character(`npc:${n.def.id}`, n.def.look, n.dir, 0);
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    this.actors.addChild(s);
    this.npcSprites.set(n.def.id, s);
  }

  syncNpcs(): void {
    for (const n of this.world.npcs) {
      const s = this.npcSprites.get(n.def.id);
      if (!s) continue;
      s.visible = n.visible;
    }
  }

  npcTexture(n: NpcState, frame: number): Texture {
    if (n.def.creature) return this.sprites.creature(n.def.creature, 16, frame === 3 ? 'blink' : 'idle');
    return this.sprites.character(`npc:${n.def.id}`, n.def.look, n.dir, frame);
  }

  wildSprite(w: WildMon): Sprite {
    let s = this.wildSprites.get(w.key);
    if (!s) {
      s = new Sprite(this.sprites.creature(w.species, 16, 'idle', w.shimmer));
      s.anchor.set(0.5, 1);
      this.actors.addChild(s);
      this.wildSprites.set(w.key, s);
    }
    return s;
  }

  removeWild(key: number): void {
    const s = this.wildSprites.get(key);
    if (s) { s.destroy(); this.wildSprites.delete(key); }
  }
}

function giftCanvas(): PixelCanvas {
  const c = props.flowerPot(0).clone();
  c.fill(-1);
  c.circle(8, 10, 4.5, 0xff6b8a).circle(6, 8, 1.5, 0xffd0dc).rect(7, 3, 2, 3, P.leaf).set(10, 4, P.leafLight);
  c.set(3, 3, P.white).set(13, 5, P.white).set(12, 13, P.white);
  return c.outline(P.ink, true);
}

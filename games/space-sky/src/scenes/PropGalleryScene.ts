import { BoxGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { CRYSTAL_COLORS, type DecoArt, type MachineArt } from '../data/levelTypes';
import { theme, type Theme } from '../data/themes';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { surfaceLight } from '../r3/surface/look';
import { triangles } from '../r3/surface/propKit';
import {
  BumblerProp,
  CoinSet,
  CrystalProp,
  DoorProp,
  GoalProp,
  JumpPadProp,
  LandingPadProp,
  MachineProp,
  OrbProp,
  PlateProp,
  StickerProp,
  makeBoulder,
  makeCrate,
  makeDeco,
  makeFlag,
  makeGeyserVent,
  makeItemToken,
  makeLamp,
  makePanel,
  makePlant,
  makeSample,
  makeSign,
  type Prop,
} from '../r3/surface/props';
import { h } from '../ui/dom';

const DECOS: DecoArt[] = ['dish', 'antenna', 'tent', 'dome', 'crate', 'pipe', 'crater', 'crystals', 'mushroom', 'house', 'flagpole', 'statue', 'lamp', 'icicle', 'vent', 'station', 'window', 'bench', 'cloud', 'roverOld', 'podCrashed'];
const MACHINES: MachineArt[] = ['machine', 'rover', 'pod', 'beacon', 'weather', 'antenna', 'heater', 'drill', 'lift'];
const PLANTS: Array<[string, string]> = [['moon', 'antenna'], ['mercury', 'spire'], ['mars', 'spire'], ['earth', 'tree'], ['zcrystal', 'crystal'], ['europa', 'icicle'], ['zbubble', 'mushroom'], ['zephyra', 'tree']];

interface Item {
  name: string;
  prop: Prop;
  w: number;
  /** Lift above the ground strip (floating things). */
  lift?: number;
  tick?: (t: number) => void;
}

/**
 * Visual review page for the exploration props: ?props[&theme=moon][&set=deco|machines|plants][&on][&game]
 * Every prop on a ground strip with its name, triangle count and draw calls. &game = in-game camera scale.
 */
export class PropGalleryScene extends Scene3D {
  private items: Item[] = [];
  private labels: HTMLElement[] = [];
  private sky: SpaceSky;
  private readonly tmp = new Vector3();

  constructor() {
    super('props');
    const q = new URLSearchParams(location.search);
    const th = theme(q.get('theme') ?? 'moon');
    const set = q.get('set') ?? 'props';
    this.sky = addSpaceSky(this.world, SKIES.menu);
    const L = surfaceLight(th);
    this.world.environmentIntensity = L.envIntensity;
    const sun = new DirectionalLight(L.sunColor, L.sunIntensity);
    sun.position.copy(L.sunDir).multiplyScalar(20);
    this.world.add(sun, new HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
    if (L.sun2) {
      const s2 = new DirectionalLight(L.sun2.color, L.sun2.intensity);
      s2.position.copy(L.sun2.dir).multiplyScalar(20);
      this.world.add(s2);
    }
    if (set === 'deco') for (const a of DECOS) this.items.push({ name: a, prop: makeDeco(a, th, 7), w: ['station', 'house', 'dome', 'roverOld', 'podCrashed'].includes(a) ? 3.4 : 2.3, lift: a === 'cloud' ? 0.6 : 0 });
    else if (set === 'machines') {
      const on = q.has('on');
      for (const a of MACHINES) {
        const m = new MachineProp(a);
        m.setPowered(on);
        this.items.push({ name: a, prop: m, w: a === 'beacon' ? 2.9 : 2.7 });
      }
    } else if (set === 'plants') {
      PLANTS.forEach(([id, kind], i) => {
        const t = theme(id);
        this.items.push({ name: `${kind} (${id})`, prop: makePlant(t, i), w: 1.9 });
        this.items.push({ name: `boulder (${id})`, prop: makeBoulder(t, i), w: 1.9 });
      });
    } else this.defaultSet(th, q.has('on'));
    const only = q.get('only')?.split(',');
    if (only) this.items = this.items.filter((it) => only.some((o) => it.name.startsWith(o)));
    this.layout(th, q.has('game'), Number(q.get('row') ?? 15));
  }

  private defaultSet(th: Theme, on: boolean): void {
    const add = (name: string, prop: Prop, w: number, lift = 0, tick?: (t: number) => void) => this.items.push({ name, prop, w, lift, tick });
    add('crate', makeCrate(), 1.4);
    add('orb', new OrbProp(), 1.4, 0.7);
    CRYSTAL_COLORS.forEach((c, i) => {
      const p = new CrystalProp();
      p.setColor(c);
      if (i === 2) p.setSolved(true);
      add(i === 1 ? 'crystal (bump)' : i === 2 ? 'crystal (solved)' : 'crystal', p, 1.3, 0, i === 1 ? (t) => p.setBump(Math.max(0, 1 - ((t * 0.8) % 1) * 3)) : undefined);
    });
    const d1 = new DoorProp(2);
    add('door', d1, 1.4);
    const d2 = new DoorProp(3);
    add('door (cycling)', d2, 1.4, 0, (t) => d2.setOpen(0.5 - 0.5 * Math.cos(t * 1.2)));
    const p1 = new PlateProp(false);
    add('plate', p1, 1.3, 0, (t) => p1.setPressed(on || Math.sin(t * 1.5) > 0));
    const p2 = new PlateProp(true);
    add('heavy plate', p2, 1.3, 0, (t) => p2.setPressed(on || Math.sin(t * 1.5 + 1) > 0));
    add('sign', makeSign(), 1.6);
    add('panel', makePanel(CRYSTAL_COLORS), 2.6);
    add('goal', new GoalProp(), 1.6);
    const g2 = new GoalProp();
    g2.setReached(true);
    add('goal (reached)', g2, 1.6);
    add('coins', new CoinSet([-0.8, 0, 0.8].map((x) => ({ x, y: 0.6, z: 0 }))), 2.6);
    add('sticker', new StickerProp(), 1.4, 0.8);
    add('sample', makeSample('#d6d4dc'), 1.1, 0.6);
    add('sample', makeSample('#e0623a'), 1.1, 0.6);
    add('item', makeItemToken('snowflake', '#e6f7ff'), 1.1, 0.6);
    add('item', makeItemToken('wrench', '#ff9f43'), 1.1, 0.6);
    const b1 = new BumblerProp(th.bumbler, th);
    add(th.bumbler, b1, 1.6, 0, (t) => b1.setMotion(Math.sin(t * 0.5) > 0 ? 1 : -1, Math.max(0, 0.3 - ((t * 0.7) % 3))));
    const other = th.bumbler === 'dustbot' ? 'fuzzle' : 'dustbot';
    const b2 = new BumblerProp(other, th);
    add(other, b2, 1.6, 0, (t) => b2.setMotion(Math.sin(t * 0.5 + 2) > 0 ? 1.2 : -1.2, 0));
    const lp = new LandingPadProp();
    add('landing pad', lp, 4.2);
    const jp = new JumpPadProp();
    let last = -1;
    add('jump pad', jp, 1.4, 0, (t) => {
      const k = Math.floor(t / 1.6);
      if (k !== last) {
        last = k;
        jp.boing();
      }
    });
    add('geyser vent', makeGeyserVent(th), 1.4);
    add('lamp', makeLamp(), 1.3);
    add('flag', makeFlag(), 1.6);
    add('boulder', makeBoulder(th, 1), 1.9);
    add('plant', makePlant(th, 2), 1.7);
  }

  private layout(th: Theme, game: boolean, row: number): void {
    const maxW = game ? 30 : row;
    const rows: Item[][] = [[]];
    let rowW = 0;
    for (const it of this.items) {
      if (rowW + it.w > maxW && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push(it);
      rowW += it.w;
    }
    const rowH = this.items.some((i) => i.w > 2.8) ? 4.4 : 3.4;
    const groundTop = new MeshStandardMaterial({ color: th.surface, roughness: 0.9 });
    const groundBody = new MeshStandardMaterial({ color: th.ground, roughness: 0.9 });
    rows.forEach((row, ri) => {
      const total = row.reduce((s, i) => s + i.w, 0);
      let x = -total / 2;
      const y = -ri * rowH;
      const strip = new Group();
      const body = new Mesh(new BoxGeometry(total + 0.6, 1, 3), groundBody);
      body.position.set(0, y - 0.56, -0.4);
      const top = new Mesh(new BoxGeometry(total + 0.6, 0.12, 3), groundTop);
      top.position.set(0, y - 0.06, -0.4);
      strip.add(body, top);
      this.world.add(strip);
      for (const it of row) {
        it.prop.group.position.set(x + it.w / 2, y + (it.lift ?? 0), 0);
        this.world.add(it.prop.group);
        x += it.w;
        const tris = triangles(it.prop.group);
        const calls = draws(it.prop.group);
        const label = h('div', { class: 'gallery-label' }, `${it.name}`, h('br'), h('small', {}, `${tris}△ · ${calls}dc`));
        label.style.fontSize = '12px';
        label.style.textAlign = 'center';
        this.labels.push(label);
        this.ui.append(label);
      }
    });
    const height = rows.length * rowH;
    this.camera.fov = 30;
    if (game) {
      this.camera.position.set(0, 2.6, 28);
      this.camera.lookAt(0, 0.6, 0);
    } else {
      const dist = Math.max((height / 2 + 1) / Math.tan((15 * Math.PI) / 180), (maxW / 2 + 1) / Math.tan((15 * Math.PI) / 180) / Math.max(1, this.camera.aspect));
      const cy = -height / 2 + rowH * 0.6;
      this.camera.position.set(0, cy + dist * 0.12, dist);
      this.camera.lookAt(0, cy, 0);
    }
  }

  override render(): void {
    this.sky.update(this.time);
    const m = S.game.metrics;
    const t = this.time;
    this.items.forEach((it, i) => {
      it.tick?.(t);
      it.prop.update?.(1 / 60, t);
      this.tmp.copy(it.prop.group.position);
      this.tmp.y -= 0.15 + (it.lift ?? 0);
      this.tmp.project(this.camera);
      this.labels[i].style.transform = `translate(${((this.tmp.x + 1) / 2) * m.width}px, ${((1 - this.tmp.y) / 2) * m.height}px) translate(-50%, 0)`;
    });
  }
}

function draws(root: Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if ((o as Mesh).isMesh || (o as unknown as { isSprite?: boolean }).isSprite) n++;
  });
  return n;
}

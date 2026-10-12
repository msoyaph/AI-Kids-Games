import {
  CanvasTexture,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
  Fog,
  type Object3D,
} from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { exploreTrack } from '../audio/music';
import { clamp, lerp } from '../core/mathx';
import { Rng } from '../core/rng';
import { BODY_BY_ID } from '../data/bodies';
import { dialogue } from '../data/dialogue';
import { ITEM_BY_ID, itemName } from '../data/items';
import { levelById } from '../data/levels';
import { CRYSTAL_COLORS, CRYSTAL_NAMES, type EntDef } from '../data/levelTypes';
import { stickerForLevel } from '../data/stickers';
import { theme, type Theme } from '../data/themes';
import { FloatLabels } from '../r3/flight/flightFx';
import { Particles3 } from '../r3/fx/particles';
import { buildCadet, Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { RoverModel } from '../r3/models/rover';
import { surfaceLight, trimColor, type SurfaceLight } from '../r3/surface/look';
import {
  BumblerProp, CoinSet, CrystalProp, DoorProp, GoalProp, JumpPadProp, LandingPadProp, MachineProp, OrbProp, PlateProp, StickerProp,
  makeBoulder, makeCrate, makeDeco, makeFlag, makeGeyserVent, makeItemToken, makeLamp, makePanel, makePlant, makeSample, makeSign,
  type Prop,
} from '../r3/surface/props';
import { SurfaceSky } from '../r3/surface/sky';
import { LevelTerrain } from '../r3/surface/terrain';
import { condOk, entCond, parseLevel, tileAt, TILE, T_GEYSER, T_PAD, T_PLATFORM, type LevelModel } from '../systems/level';
import {
  buildPlatWorld, doInteraction, findInteraction, geyserOn, makePlatEvents, makePlayer, platCfg, resetPlatEvents, resetPuzzle, restoreSolved, stepPlatformer,
  type Interaction, type PlatEvents, type PlatWorld, type PPlayer,
} from '../systems/platformer';
import { groundBelow } from '../systems/tileMesh';
import { openAreas } from './director';
import { showDialogue } from '../ui/dialogue';
import { h, setText } from '../ui/dom';
import { Hud } from '../ui/hud';
import { closeTopModal, openModal } from '../ui/modal';
import { openPause, pauseHooks } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { button, iconEl } from '../ui/widgets';
import { exploreHooks } from './exploreHooks';

export interface ExploreParams {
  area: string;
}

const LABELS: Record<string, [string, string]> = {
  talk: ['Talk', 'chat'],
  pickOrb: ['Grab', 'hand'],
  dropOrb: ['Drop', 'hand'],
  deliver: ['Power up', 'boost'],
  crystal: ['Tap', 'sparkle'],
  exit: ['Fly', 'rocket'],
  sign: ['Read', 'info'],
};

/** Rows of the level visible on screen (the 2D game showed 15). */
const VIS = 15.6;
const FOV = 30;
const CAM_DIST = VIS / 2 / Math.tan((FOV * Math.PI) / 360);
/** How far the camera sits above what it looks at (a gentle downward look shows the tops of the ground). */
const CAM_LIFT = 2.4;
/** Player height in world units (34×74 px astronaut). */
const CADET_H = 1.55;
/** Everyone else keeps their size relative to the cadet. */
const CAST_SCALE = 1.62;

/** How far behind the path decorations stand. */
const Z_BACK_PROPS = -0.95;

type ShadowSlot = { x: number; y: number; z: number; r: number };

/** 2.5D exploration: the same platformer and puzzles as before, drawn as a 3D world seen from the side. */
export class ExploreScene extends Scene3D {
  private model: LevelModel;
  private th: Theme;
  private world2!: PlatWorld;
  private player!: PPlayer;
  private ev: PlatEvents = makePlatEvents();
  private bodyId: string;
  private rover: boolean;
  private look: SurfaceLight;
  private sky!: SurfaceSky;
  private terrain!: LevelTerrain;
  private sun!: DirectionalLight;
  private readonly comfort = comfortOn();
  // Avatar.
  private avatar = new Group();
  private cadet: Character | null = null;
  private roverModel: RoverModel | null = null;
  private yaw = Math.PI / 2;
  private celebrateT = 0;
  // Things in the level.
  private animated: Prop[] = [];
  private coins: CoinSet | null = null;
  private coinOf: number[] = [];
  private pickupViews: Array<Prop | null> = [];
  private blockViews: Prop[] = [];
  private orbViews: OrbProp[] = [];
  private doorViews: DoorProp[] = [];
  private plateViews: PlateProp[] = [];
  private machineViews: MachineProp[] = [];
  private crystalViews: CrystalProp[] = [];
  private bumblerViews: BumblerProp[] = [];
  private goalViews: GoalProp[] = [];
  private npcViews: Character[] = [];
  private npcWave: number[] = [];
  private talkingNpc = -1;
  private pads = new Map<number, JumpPadProp>();
  private geysers: Array<{ tx: number; ty: number }> = [];
  private ticks: Mesh[] = [];
  private machineLabels: HTMLElement[] = [];
  private machineText: string[] = [];
  private buddy: Character | null = null;
  private buddyPrev = new Vector3();
  /** Ring buffer of recent player positions (x, y, facing) for Zibbo to follow. */
  private trail = new Float32Array(24 * 3);
  private trailHead = 0;
  private trailFilled = 0;
  private condT = 0;
  private marker = new Group();
  private sparks: Particles3;
  private puffs: Particles3;
  private floats: FloatLabels;
  private blobs: InstancedMesh | null = null;
  private blobSlots: ShadowSlot[] = [];
  private hud: Hud;
  private prompt: HTMLElement;
  /** Holds the prompt just above the thing you can use (positioned from 3D every frame). */
  private promptAnchor: HTMLElement;
  private promptText: HTMLElement;
  private promptIcon: HTMLElement;
  private promptKind = '';
  private interact: Interaction = { kind: 'exit', index: 0, x: 0, y: 0 };
  private current: Interaction | null = null;
  private camX = 0;
  private camY = 0;
  private shakeT = 0;
  private w = 1280;
  private hh = 720;
  private t = 0;
  private walkDist = 0;
  private landedFlag = false;
  private busy = false;
  private ready = false;
  private coinsHere = 0;
  private lastTime = 0;
  // Scratch.
  private readonly tmp = new Vector3();
  private readonly tmpM = new Matrix4();
  private readonly tmpS = new Vector3();
  private readonly flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

  constructor(p: ExploreParams) {
    super('explore');
    this.pausable = true;
    const def = levelById(p.area);
    if (!def) throw new Error(`Unknown area ${p.area}`);
    this.music = def.music ?? exploreTrack(def.theme);
    this.model = parseLevel(def);
    this.th = theme(def.theme);
    this.bodyId = def.body;
    this.rover = def.avatar === 'rover';
    this.look = surfaceLight(this.th);
    this.hud = new Hud({ onPause: () => openPause('explore') });
    this.promptText = h('span', null, '');
    this.promptIcon = iconEl('hand');
    this.prompt = h('div', { class: 'prompt anchored hit', 'data-testid': 'explore-prompt', onclick: () => this.doAction() }, this.promptIcon, this.promptText, h('span', { class: 'key' }, 'E'));
    this.promptAnchor = h('div', { class: 'prompt-anchor' }, this.prompt);
    this.promptAnchor.style.display = 'none';
    this.floats = new FloatLabels(this.ui);
    this.ui.append(this.hud.el, this.promptAnchor);
    const prof = S.game.r3.profile;
    this.sparks = new Particles3(Math.min(500, prof.particles), 'spark');
    this.sparks.drag = 1.4;
    this.puffs = new Particles3(Math.min(260, Math.round(prof.particles / 2)), 'puff', false);
    this.puffs.drag = 1.1;
  }

  override async enter(): Promise<void> {
    const st = S.state;
    const def = this.model.def;
    const body = BODY_BY_ID[this.bodyId];
    const cfg = platCfg(body?.gravityG ?? 1, this.rover ? 'rover' : 'astronaut', st.tuning);
    const condState = exploreHooks.condState();
    this.world2 = buildPlatWorld(
      this.model,
      cfg,
      // NPCs are always built so they can appear during a mission (they are hidden until then).
      (e) => e.kind === 'npc' || condOk(entCond(e), condState),
      (key) => st.data.collected.includes(key),
    );
    restoreSolved(this.world2, (pz) => st.flag(`solved:${pz}`), (id) => st.flag(`door:${id}`));
    // Hidden sticker only if not found yet.
    const stickerDef = stickerForLevel(def.id);
    for (const pk of this.world2.pickups) if (pk.kind === 'sticker' && (!stickerDef || st.data.stickers.includes(stickerDef.id))) pk.taken = true;
    this.player = makePlayer(this.world2);
    this.buildWorld();
    this.refreshHidden(true);
    this.resize(S.game.metrics.width, S.game.metrics.height);
    this.snapCamera();
    S.touch.setMode('explore');
    pauseHooks.backToRocket = () => this.teleportToRocket();
    pauseHooks.resetPuzzle = () => {
      resetPuzzle(this.world2, this.player);
      toast('Puzzle reset!', 'reset');
    };
    st.addUnique(st.data.visitedBodies, this.bodyId);
    st.emit({ type: 'enterArea', area: def.id });
    this.updateObjective();
    this.hud.setCoins(st.data.coins);
    this.ready = true;
    this.render(1);
    const introKey = `intro:${def.id}`;
    if (def.intro && !st.flag(introKey)) {
      st.setFlag(introKey);
      setTimeout(() => void showDialogue(dialogue(def.intro!)), 400);
    }
    exploreHooks.onEnter(this);
    tip(this.rover ? 'explore_rover' : 'explore_move');
    if (this.buddy) tip('zibbo');
  }

  override exit(): void {
    S.touch.setMode('none');
    pauseHooks.backToRocket = () => {};
    pauseHooks.resetPuzzle = () => {};
    this.floats.clear();
  }

  override back(): boolean {
    openPause('explore');
    return true;
  }

  // ------------------------------------------------------------------ coordinates

  /** Level pixels → world units (1 tile = 1 unit, y up, the level's bottom on y = 0). */
  private wx(px: number): number {
    return px / TILE;
  }

  private wy(py: number): number {
    return this.model.h - py / TILE;
  }

  // ------------------------------------------------------------------ building

  private buildWorld(): void {
    const r3 = S.game.r3;
    const prof = r3.profile;
    const th = this.th;
    const m = this.model;
    const L = this.look;
    const shadows = prof.shadows;
    const seed = hashSeed(m.def.id);
    // Light.
    this.world.environmentIntensity = L.envIntensity;
    this.sun = new DirectionalLight(L.sunColor, L.sunIntensity);
    this.sun.position.copy(L.sunDir).multiplyScalar(40);
    if (shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -24;
      sc.right = 24;
      sc.top = 16;
      sc.bottom = -16;
      sc.near = 1;
      sc.far = 90;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
    }
    this.world.add(this.sun, this.sun.target, new HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
    if (L.sun2) {
      const s2 = new DirectionalLight(L.sun2.color, L.sun2.intensity);
      s2.position.copy(L.sun2.dir).multiplyScalar(40);
      this.world.add(s2);
    }
    this.world.fog = new Fog(L.fog[0], L.fog[1], L.fog[2]);
    // Sky, scenery and the ground.
    this.sky = new SurfaceSky(this.world, th, L, { renderer: r3.renderer, profile: prof, pixelRatio: r3.pixelRatio, x0: 0, x1: m.w, seed, heightBoost: Math.max(0, m.h - 15) });
    this.terrain = new LevelTerrain(m, th, { shadows, seed });
    this.world.add(this.terrain.group);
    this.camera.fov = FOV;
    this.camera.near = 0.5;
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
    this.buildProps(seed);
    this.buildAvatar();
    // Interaction marker: a bobbing glowing arrow.
    const mMat = new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(2.2) });
    const chevron = new Mesh(new ConeGeometry(0.22, 0.42, 4), mMat);
    chevron.rotation.x = Math.PI;
    const ring = new Mesh(new TorusGeometry(0.28, 0.05, 8, 24), mMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.36;
    this.marker.add(chevron, ring);
    this.marker.visible = false;
    this.world.add(this.marker, this.sparks.points, this.puffs.points);
    if (!shadows) this.buildBlobs();
  }

  private buildProps(seed: number): void {
    const w = this.world2;
    const th = this.th;
    const m = this.model;
    const rng = new Rng(seed);
    const cs = exploreHooks.condState();
    const shadows = S.game.r3.profile.shadows;
    const add = (p: Prop, x: number, y: number, z: number, animate = false): Prop => {
      p.group.position.set(x, y, z);
      this.world.add(p.group);
      if (shadows) castShadows(p.group);
      if (animate && p.update) this.animated.push(p);
      return p;
    };
    /** Decorations stand a little behind the path (or on top of a platform when they sit on one). */
    const backZ = (tx: number, ty: number, spread: number) => (tileAt(m, tx, ty + 1) === T_PLATFORM ? -0.45 : Z_BACK_PROPS + rng.range(-spread, spread));
    for (const e of m.ents) {
      const cx = e.tx + 0.5;
      const by = m.h - e.ty - 1;
      if (e.kind === 'plant') add(makePlant(th, rng.int(0, 9999)), cx + rng.range(-0.2, 0.2), by, backZ(e.tx, e.ty, 0.3), true);
      else if (e.kind === 'boulder') add(makeBoulder(th, rng.int(0, 9999)), cx, by, backZ(e.tx, e.ty, 0.2));
      else if (e.kind === 'lamp') add(makeLamp(), cx, by, backZ(e.tx, e.ty, 0), true);
      else if (e.kind === 'flag') add(makeFlag(), cx, by, backZ(e.tx, e.ty, 0), true);
      else if (e.kind === 'deco' && e.def?.kind === 'deco' && condOk(entCond(e), cs)) {
        const big = ['station', 'house', 'dome', 'roverOld', 'podCrashed'].includes(e.def.art);
        add(makeDeco(e.def.art, th, rng.int(0, 9999)), cx, by, big ? -1.15 : backZ(e.tx, e.ty, 0.15), true);
      }
    }
    // Tiles with their own gadgets: jump pads and geysers.
    for (let ty = 0; ty < m.h; ty++) {
      for (let tx = 0; tx < m.w; tx++) {
        const t = m.tiles[ty * m.w + tx];
        if (t === T_PAD) this.pads.set(ty * m.w + tx, add(new JumpPadProp(), tx + 0.5, m.h - ty, 0, true) as JumpPadProp);
        else if (t === T_GEYSER) {
          this.geysers.push({ tx, ty });
          add(makeGeyserVent(th), tx + 0.5, m.h - ty, 0, true);
        }
      }
    }
    // The parked rocket on its pad.
    const pad = add(new LandingPadProp(1.7), this.wx(w.exitX), this.wy(w.exitY), -1.05, true) as LandingPadProp;
    pad.setGlow(trimColor(th));
    const rocket = new RocketModel(S.state.data.loadout, { glossy: S.game.r3.profile.tier === 'high' });
    const ext = rocket.extent;
    const rs = 3.7 / (ext.top - ext.bottom);
    rocket.group.scale.setScalar(rs);
    rocket.group.position.set(this.wx(w.exitX), this.wy(w.exitY) + 0.18 - ext.bottom * rs, -1.05);
    rocket.group.rotation.y = -0.35;
    this.world.add(rocket.group);
    if (shadows) castShadows(rocket.group);
    for (const sg of w.signs) {
      const d = sg.ent.def;
      if (d?.kind === 'sign') add(makeSign(), this.wx(sg.x), this.wy(sg.y), -0.7);
      else if (d?.kind === 'panel') {
        const target = m.def.groups?.[d.group]?.target ?? [];
        add(makePanel(target.map((c) => CRYSTAL_COLORS[c])), this.wx(sg.x), this.wy(sg.y), -0.75);
      }
    }
    for (const g of w.goals) this.goalViews.push(add(new GoalProp(), this.wx(g.x), this.wy(g.y), -0.35, true) as GoalProp);
    for (const pl of w.plates) this.plateViews.push(add(new PlateProp(pl.heavy), this.wx(pl.x) + 0.5, this.wy(pl.y), 0, true) as PlateProp);
    for (const mc of w.machines) {
      const art = (mc.ent.def as Extract<EntDef, { kind: 'machine' }>).art;
      this.machineViews.push(add(new MachineProp(art), this.wx(mc.x), this.wy(mc.y), -0.55) as MachineProp);
      const lbl = h('div', { class: 'gate-label world-label' }, '');
      this.ui.append(lbl);
      this.machineLabels.push(lbl);
      this.machineText.push('');
    }
    const tickMat = new MeshBasicMaterial({ color: new Color('#8cff66').multiplyScalar(2.4) });
    const tickGeo = new OctahedronGeometry(0.16, 0);
    for (const c of w.crystals) {
      this.crystalViews.push(add(new CrystalProp(), this.wx(c.x), this.wy(c.y), -0.3) as CrystalProp);
      const tick = new Mesh(tickGeo, tickMat);
      tick.position.set(this.wx(c.x), this.wy(c.y) + 2.05, -0.3);
      tick.visible = false;
      this.world.add(tick);
      this.ticks.push(tick);
    }
    for (const d of w.doors) this.doorViews.push(add(new DoorProp(d.h / TILE), this.wx(d.x) + 0.5, this.wy(d.y + d.h), 0) as DoorProp);
    for (const n of w.npcs) {
      const d = n.ent.def as Extract<EntDef, { kind: 'npc' }>;
      const c = new Character(d.char);
      c.group.scale.setScalar(CAST_SCALE);
      c.group.position.set(this.wx(n.x), this.wy(n.y), -0.35);
      const face = d.face ?? (n.x > w.exitX ? -1 : 1);
      c.group.rotation.y = face * 0.55;
      c.group.visible = !n.hidden;
      if (shadows) castShadows(c.group);
      this.world.add(c.group);
      this.npcViews.push(c);
      this.npcWave.push(0);
    }
    // Pickups: coins share one instanced mesh, everything else is its own little prop.
    const coinPts: Array<{ x: number; y: number; z: number }> = [];
    for (const pk of w.pickups) {
      if (pk.kind === 'coin') {
        this.coinOf.push(coinPts.length);
        coinPts.push({ x: this.wx(pk.x), y: this.wy(pk.y), z: 0 });
        this.pickupViews.push(null);
        continue;
      }
      this.coinOf.push(-1);
      let p: Prop;
      if (pk.kind === 'sticker') p = new StickerProp();
      else {
        const d = pk.ent.def as Extract<EntDef, { kind: 'sample' | 'item' }>;
        const item = ITEM_BY_ID[d.item];
        p = item?.glyph ? makeItemToken(item.glyph, item.color) : makeSample(item?.color ?? '#d6d4dc');
      }
      add(p, this.wx(pk.x), this.wy(pk.y), 0, true);
      p.group.visible = !pk.taken;
      this.pickupViews.push(p);
    }
    if (coinPts.length) {
      this.coins = new CoinSet(coinPts);
      this.world.add(this.coins.group);
      this.animated.push(this.coins);
      w.pickups.forEach((pk, i) => {
        if (pk.kind === 'coin' && pk.taken) this.coins!.hide(this.coinOf[i]);
      });
    }
    for (const b of w.blocks) {
      const p = add(makeCrate(), this.wx(b.x) + 0.5, this.wy(b.y + TILE), 0);
      this.blockViews.push(p);
    }
    for (const o of w.orbs) this.orbViews.push(add(new OrbProp(), this.wx(o.x), this.wy(o.y), 0) as OrbProp);
    for (const b of w.bumblers) this.bumblerViews.push(add(new BumblerProp(th.bumbler, th), this.wx(b.x), this.wy(b.y), 0) as BumblerProp);
  }

  private buildAvatar(): void {
    const profile = S.state.data.profile;
    if (this.rover) {
      this.roverModel = new RoverModel(profile);
      this.avatar.add(this.roverModel.group);
    } else {
      this.cadet = buildCadet(profile);
      this.cadet.group.scale.setScalar(CADET_H / this.cadet.height);
      this.avatar.add(this.cadet.group);
    }
    if (S.game.r3.profile.shadows) castShadows(this.avatar);
    this.world.add(this.avatar);
    const zibboHere = this.world2.npcs.some((n) => (n.ent.def as Extract<EntDef, { kind: 'npc' }>).char === 'zibbo');
    if (S.state.flag('zibboJoined') && !zibboHere) {
      this.buddy = new Character('zibbo');
      this.buddy.group.scale.setScalar(CAST_SCALE * 0.85);
      if (S.game.r3.profile.shadows) castShadows(this.buddy.group);
      this.world.add(this.buddy.group);
    }
  }

  /** Soft round shadows under characters and crates (Low/Medium; High has real shadows). */
  private buildBlobs(): void {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    const max = 2 + this.npcViews.length + this.bumblerViews.length + this.blockViews.length;
    this.blobs = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, color: '#ffffff', fog: false }), max);
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = 1;
    this.world.add(this.blobs);
    for (let i = 0; i < max; i++) this.blobSlots.push({ x: 0, y: 0, z: 0, r: 0 });
  }

  // ------------------------------------------------------------------ logic

  override update(dt: number): void {
    if (!this.ready) return;
    this.t += dt;
    const input = S.input.state;
    resetPlatEvents(this.ev);
    stepPlatformer(this.world2, this.player, { x: input.x, jump: input.jump, jumpPressed: input.jumpPressed }, dt, this.ev);
    this.handleEvents();
    // What can the Action button do?
    this.current = this.busy ? null : findInteraction(this.world2, this.player, this.interact);
    if (this.current) {
      if (this.current.kind === 'pickOrb') tip('explore_orb');
      if (this.current.kind === 'crystal') tip('explore_crystal');
      const [label, icon] = LABELS[this.current.kind];
      S.touch.setAction(label, icon);
      setText(this.promptText, label);
      if (this.promptKind !== this.current.kind) {
        this.promptKind = this.current.kind;
        const ni = iconEl(icon);
        this.promptIcon.replaceWith(ni);
        this.promptIcon = ni;
      }
      this.promptAnchor.style.display = this.current.kind === 'dropOrb' ? 'none' : '';
      if (input.actionPressed) this.doAction();
    } else {
      S.touch.setAction(null);
      this.promptAnchor.style.display = 'none';
    }
    // Effects.
    const p = this.player;
    const cfg = this.world2.cfg;
    const fx = this.wx(p.x + cfg.pw / 2);
    const fy = this.wy(p.y + cfg.ph);
    if (p.hovering && Math.random() < 0.8) {
      this.sparks.spawn(fx - p.facing * 0.28, fy + 0.55, -0.15, (Math.random() - 0.5) * 0.8, -3.4, (Math.random() - 0.5) * 0.4, 0.35, 0.22, Math.random() < 0.5 ? '#ffb43b' : '#fff3b0');
    }
    if (p.onGround && Math.abs(p.vx) > 120 && Math.random() < 0.18) {
      this.puffs.spawn(fx, fy + 0.08, 0.1, -p.vx / TILE * 0.1, 0.4, (Math.random() - 0.5) * 0.4, 0.55, 0.32, this.th.surface, 0.6, 1.6);
    }
    for (const g of this.geysers) {
      if (geyserOn(this.world2, g.tx) && Math.random() < 0.7) {
        this.puffs.spawn(g.tx + 0.5 + (Math.random() - 0.5) * 0.4, this.model.h - g.ty, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.8, 9 + Math.random() * 4, (Math.random() - 0.5) * 0.4, 0.75, 0.5, '#ffffff', 0.7, 2.2);
      }
    }
    this.sparks.update(dt);
    this.puffs.update(dt);
    if (p.onGround && Math.abs(p.vx) > 10) this.walkDist += Math.abs(p.vx) * dt;
    this.condT -= dt;
    if (this.condT <= 0) {
      this.condT = 0.4;
      this.refreshHidden(false);
    }
    const ti = this.trailHead * 3;
    this.trail[ti] = p.x + cfg.pw / 2;
    this.trail[ti + 1] = p.y + cfg.ph;
    this.trail[ti + 2] = p.facing;
    this.trailHead = (this.trailHead + 1) % 24;
    this.trailFilled = Math.min(24, this.trailFilled + 1);
    exploreHooks.update(this, dt);
  }

  private handleEvents(): void {
    const ev = this.ev;
    const st = S.state;
    const area = this.model.def.id;
    const p = this.player;
    const cfg = this.world2.cfg;
    const cx = this.wx(p.x + cfg.pw / 2);
    const feet = this.wy(p.y + cfg.ph);
    const head = feet + CADET_H + 0.3;
    if (ev.jumped) {
      if (!this.rover && st.data.stats.jumps > 3) tip('explore_hover');
      st.bump('jumps');
      sfx('jump');
    }
    if (ev.landed) {
      this.puffs.burst(cx, feet + 0.1, 0, 6, 1.8, 0.55, 0.42, this.th.surface);
      this.landedFlag = true;
      sfx('land');
    }
    if (ev.bounced) {
      sfx('boing');
      const pad = this.pads.get(Math.floor((p.y + cfg.ph + 2) / TILE) * this.model.w + Math.floor((p.x + cfg.pw / 2) / TILE));
      pad?.boing();
    }
    if (ev.bumped) {
      this.floats.show('Boing!', this.tmp.set(cx, head, 0), '#ffb0ea');
      if (!this.comfort) this.shakeT = 0.35;
      sfx('bump');
    }
    if (ev.pushing) {
      tip('explore_crate');
      if (Math.random() < 0.1) sfx('push');
    }
    for (const pk of ev.picked) {
      const idx = this.world2.pickups.indexOf(pk);
      if (idx >= 0) {
        const v = this.pickupViews[idx];
        if (v) v.group.visible = false;
        else if (this.coins && this.coinOf[idx] >= 0) this.coins.hide(this.coinOf[idx]);
      }
      st.addUnique(st.data.collected, pk.ent.key);
      const px = this.wx(pk.x);
      const py = this.wy(pk.y);
      if (pk.kind === 'coin') {
        st.addCoins(1);
        st.bump('coinsCollected');
        this.coinsHere++;
        this.sparks.burst(px, py, 0, 8, 3.2, 0.45, 0.22, '#ffe066');
        sfx('coin');
        st.emit({ type: 'coins', amount: 1, system: this.bodyId });
      } else if (pk.kind === 'sticker') {
        const sd = stickerForLevel(area);
        if (sd) st.emit({ type: 'sticker', id: sd.id });
        this.sparks.burst(px, py, 0, 28, 5, 0.85, 0.3, '#ff7ad9');
        this.sparks.burst(px, py, 0, 16, 4, 0.8, 0.26, '#ffe066');
        sfx('sticker');
      } else {
        const d = pk.ent.def as Extract<EntDef, { kind: 'sample' | 'item' }>;
        if (pk.kind === 'sample') st.bump('samples');
        st.emit({ type: 'collect', item: d.item, area, count: 1 });
        this.floats.show(`${itemName(d.item)}!`, this.tmp.set(px, py + 0.9, 0), '#bff6ff');
        this.sparks.burst(px, py, 0, 20, 4.2, 0.7, 0.26, ITEM_BY_ID[d.item]?.color ?? '#4dd4ff');
        sfx('collect');
      }
      this.updateObjective();
    }
    for (const g of ev.goals) {
      const d = g.ent.def as Extract<EntDef, { kind: 'goal' }>;
      st.setFlag(`reached:${d.marker}`);
      st.emit({ type: 'reach', marker: d.marker, area });
      const gi = this.world2.goals.indexOf(g);
      this.goalViews[gi]?.setReached(true);
      this.sparks.burst(this.wx(g.x), this.wy(g.y) + 1.2, -0.3, 26, 5, 0.85, 0.28, '#ffe066');
      sfx('goal');
      this.updateObjective();
    }
    for (const id of ev.opened) {
      st.setFlag(`door:${id}`);
      toast('A door opened!', 'check', 1800);
      sfx('door');
    }
    for (const puzzle of ev.solved) {
      st.bump('puzzles');
      st.setFlag(`solved:${puzzle}`);
      st.emit({ type: 'solve', puzzle, area });
      this.floats.show('Solved!', this.tmp.set(cx, head + 0.3, 0), '#8cff66', true);
      this.sparks.burst(cx, feet + 1, 0, 34, 6, 0.9, 0.3, '#8cff66');
      sfx('solve');
      this.updateObjective();
    }
    if (ev.delivered) sfx('power');
    if (ev.crystal) sfx('crystal');
    this.hud.setCoins(st.data.coins);
  }

  doAction(): void {
    const it = this.current;
    if (!it || this.busy) return;
    const w = this.world2;
    switch (it.kind) {
      case 'talk': {
        const n = w.npcs[it.index];
        const d = n.ent.def as Extract<EntDef, { kind: 'npc' }>;
        this.busy = true;
        const npcId = d.char;
        S.state.addUnique(S.state.data.stats.talkedTo, npcId);
        const lines = exploreHooks.talkLines(npcId, this.model.def.id) ?? dialogue(d.talk);
        this.talkingNpc = it.index;
        this.npcViews[it.index]?.talk(true);
        void showDialogue(lines).then(() => {
          this.busy = false;
          this.npcViews[it.index]?.talk(false);
          this.talkingNpc = -1;
          S.state.emit({ type: 'talk', npc: npcId, area: this.model.def.id });
          this.updateObjective();
        });
        break;
      }
      case 'sign': {
        const sgn = w.signs[it.index];
        const d = sgn.ent.def;
        let text = '';
        if (d?.kind === 'sign') text = d.text;
        else if (d?.kind === 'panel') {
          const target = this.model.def.groups?.[d.group]?.target ?? [];
          text = `Make the crystals match: ${target.map((c) => CRYSTAL_NAMES[c]).join(', ')}. Tap a crystal to change its color.`;
        }
        this.busy = true;
        void showDialogue([{ who: 'sign', text }]).then(() => (this.busy = false));
        break;
      }
      case 'exit':
        this.askLeave();
        break;
      default:
        doInteraction(w, this.player, it, this.ev);
        if (it.kind === 'pickOrb') sfx('pickup');
        if (it.kind === 'dropOrb') sfx('drop');
        // Interactions may solve puzzles right away.
        this.handleEvents();
        break;
    }
  }

  /** Show or hide NPCs that only appear at a certain point in a mission. */
  private refreshHidden(first: boolean): void {
    const cs = exploreHooks.condState();
    this.world2.npcs.forEach((n, i) => {
      n.hidden = !condOk(entCond(n.ent), cs);
      const v = this.npcViews[i];
      if (v && v.group.visible === n.hidden) {
        v.group.visible = !n.hidden;
        if (!n.hidden && !first) {
          this.sparks.burst(this.wx(n.x), this.wy(n.y) + 1, -0.35, 24, 4.5, 0.8, 0.26, '#fff7b3');
          sfx('sparkle');
        }
      }
    });
  }

  private askLeave(): void {
    this.busy = true;
    const others = openAreas(this.bodyId).filter((a) => a !== this.model.def.id);
    const hop = h('div', { class: 'col area-list' });
    for (const a of others) {
      hop.append(button(`Hop to ${levelById(a)?.name ?? a}`, 'planet', () => {
        closeTopModal();
        sfx('launch');
        void S.game.go('explore', { area: a });
      }, { color: 'white', id: `hop-${a}` }));
    }
    const panel = h(
      'div',
      { class: 'panel col center', 'data-testid': 'leave-panel' },
      h('div', { class: 'h2' }, 'Fly away?'),
      others.length ? hop : null,
      h('div', { class: 'row' },
        button('Not yet', 'back', () => closeTopModal(), { color: 'white', id: 'btn-stay' }),
        button('Star Map', 'rocket', () => {
          closeTopModal();
          this.leave();
        }, { color: 'green', size: 'big', id: 'btn-fly' }),
      ),
    );
    openModal(panel, { onClose: () => (this.busy = false) });
  }

  leave(): void {
    S.state.data.location = this.bodyId;
    sfx('launch');
    exploreHooks.onLeave(this);
  }

  teleportToRocket(): void {
    const p = this.player;
    const np = makePlayer(this.world2);
    p.x = p.px = np.x;
    p.y = p.py = np.y;
    p.vx = p.vy = 0;
    this.snapCamera();
    sfx('teleport');
  }

  updateObjective(): void {
    const o = exploreHooks.objective(this.model.def.id);
    this.hud.setObjective(o?.text ?? `Explore ${this.model.def.name}!`, o?.icon ?? 'flag');
    this.hud.setExtra(o?.extra ?? '');
  }

  get areaId(): string {
    return this.model.def.id;
  }

  get bodyName(): string {
    return BODY_BY_ID[this.bodyId]?.name ?? this.bodyId;
  }

  celebrate(): void {
    const p = this.player;
    const cfg = this.world2.cfg;
    const x = this.wx(p.x + cfg.pw / 2);
    const y = this.wy(p.y);
    for (const c of ['#ffe066', '#ff7ad9', '#4dd4ff', '#8cff66']) this.sparks.burst(x, y + 0.6, 0, 16, 7, 1.1, 0.3, c);
    this.celebrateT = 2.2;
  }

  // ------------------------------------------------------------------ render

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.w = w;
    this.hh = hh;
    const px = window.innerHeight * S.game.r3.pixelRatio;
    this.sparks.setScreen(px);
    this.puffs.setScreen(px);
    this.sky?.setPixelRatio(S.game.r3.pixelRatio);
  }

  private snapCamera(): void {
    const p = this.player;
    this.camX = this.targetCamX(p.x);
    this.camY = this.targetCamY(p.y);
  }

  private get visW(): number {
    return VIS * this.camera.aspect;
  }

  private targetCamX(px: number): number {
    const lw = this.model.w;
    const vw = this.visW;
    if (lw <= vw) return lw / 2;
    return clamp(this.wx(px + this.world2.cfg.pw / 2) + vw * 0.05, vw / 2, lw - vw / 2);
  }

  private targetCamY(py: number): number {
    const lh = this.model.h;
    const lo = VIS / 2 - 0.3;
    if (lh <= VIS - 0.3) return lo;
    return clamp(this.wy(py + this.world2.cfg.ph / 2) + VIS * 0.05, lo, lh - VIS / 2 + 0.8);
  }

  override render(alpha: number): void {
    if (!this.ready) return;
    const time = this.time;
    const dt = clamp(time - this.lastTime, 0, 0.1) || 1 / 60;
    this.lastTime = time;
    const p = this.player;
    const cfg = this.world2.cfg;
    const px = lerp(p.px, p.x, alpha);
    const py = lerp(p.py, p.y, alpha);
    // Camera: follows smoothly, never rolls.
    this.camX += (this.targetCamX(px) - this.camX) * (1 - Math.exp(-9 * dt));
    this.camY += (this.targetCamY(py) - this.camY) * (1 - Math.exp(-7.5 * dt));
    let sx = 0;
    let sy = 0;
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const s = this.shakeT * this.shakeT * 0.6;
      sx = Math.sin(time * 61) * s;
      sy = Math.sin(time * 53 + 1) * s;
    }
    this.camera.position.set(this.camX + sx, this.camY + CAM_LIFT + sy, CAM_DIST);
    this.camera.lookAt(this.camX + sx, this.camY + sy, 0);
    this.camera.updateMatrixWorld();
    if (this.sun.castShadow) {
      this.sun.target.position.set(this.camX, this.camY, 0);
      this.sun.position.copy(this.look.sunDir).multiplyScalar(40).add(this.sun.target.position);
    }
    // Player.
    const feetX = this.wx(px + cfg.pw / 2);
    const feetY = this.wy(py + cfg.ph);
    this.avatar.position.set(feetX, feetY, 0.05);
    const wantYaw = p.facing > 0 ? Math.PI / 2 - 0.55 : -Math.PI / 2 + 0.55;
    this.yaw += (wantYaw - this.yaw) * (1 - Math.exp(-12 * dt));
    this.avatar.visible = !(p.bumpT > 0 && Math.floor(time * 16) % 2 === 0);
    if (this.cadet) {
      const c = this.cadet;
      this.avatar.rotation.y = this.yaw;
      let anim: Parameters<Character['setAnim']>[0] = 'idle';
      if (this.celebrateT > 0) anim = 'celebrate';
      else if (!p.onGround) anim = p.hovering ? 'hover' : p.vy < 0 ? 'jump' : 'fall';
      else if (p.pushing) anim = 'push';
      else if (Math.abs(p.vx) > 20) anim = Math.abs(p.vx) > cfg.walk * 0.8 ? 'run' : 'walk';
      this.celebrateT = Math.max(0, this.celebrateT - dt);
      c.setAnim(anim);
      c.speed = clamp(Math.abs(p.vx) / cfg.walk, 0.5, 1.3);
      c.carrying = p.carry >= 0;
      c.update(dt);
    } else if (this.roverModel) {
      this.avatar.rotation.y = p.facing > 0 ? -0.35 : Math.PI + 0.35;
      this.roverModel.update(dt, this.walkDist / TILE, p.onGround, this.landedFlag);
    }
    this.landedFlag = false;
    this.renderThings(time, dt, alpha, feetX);
    this.renderBuddy(dt, time);
    this.renderMarker(time);
    this.renderBlobs(feetX, feetY);
    this.terrain.update(time);
    this.sky.update(time, this.camera);
    this.floats.update(dt, this.camera, this.w, this.hh);
  }

  private renderThings(time: number, dt: number, alpha: number, playerX: number): void {
    const w = this.world2;
    const half = this.visW / 2 + 4;
    const near = (x: number) => Math.abs(x - this.camX) < half;
    for (const a of this.animated) if (a.group.visible && near(a.group.position.x)) a.update!(dt, time);
    for (let i = 0; i < w.blocks.length; i++) {
      const b = w.blocks[i];
      this.blockViews[i].group.position.set(this.wx(lerp(b.px, b.x, alpha)) + 0.5, this.wy(lerp(b.py, b.y, alpha) + TILE), 0);
    }
    for (let i = 0; i < w.orbs.length; i++) {
      const o = w.orbs[i];
      const v = this.orbViews[i];
      v.group.visible = !o.used;
      if (!v.group.visible) continue;
      v.group.position.set(this.wx(lerp(o.px, o.x, alpha)), this.wy(lerp(o.py, o.y, alpha)), o.carried ? 0.25 : 0);
      v.update(dt, time);
    }
    for (let i = 0; i < w.doors.length; i++) this.doorViews[i].setOpen(w.doors[i].amount);
    for (let i = 0; i < w.plates.length; i++) this.plateViews[i].setPressed(w.plates[i].pressed);
    for (let i = 0; i < w.machines.length; i++) {
      const mc = w.machines[i];
      const v = this.machineViews[i];
      v.setPowered(mc.powered);
      if (near(v.group.position.x)) v.update(dt, time);
      const lbl = this.machineLabels[i];
      if (mc.powered || !near(v.group.position.x)) {
        lbl.style.display = 'none';
        continue;
      }
      const txt = `${mc.have} / ${mc.needs}`;
      if (txt !== this.machineText[i]) {
        this.machineText[i] = txt;
        lbl.textContent = txt;
      }
      this.project(this.tmp.set(this.wx(mc.x), this.wy(mc.y) + 2.75 + Math.sin(time * 3 + i) * 0.08, -0.55), lbl, '-100%');
    }
    for (let i = 0; i < w.crystals.length; i++) {
      const c = w.crystals[i];
      const v = this.crystalViews[i];
      const solved = w.solvedGroups.has(c.group);
      v.setColor(CRYSTAL_COLORS[c.color]);
      v.setBump(c.bumpT);
      v.setSolved(solved);
      v.update(dt, time);
      // Easy: a little green sparkle shows which crystals are already right.
      const g = this.model.def.groups?.[c.group];
      let idx = 0;
      for (let k = 0; k < i; k++) if (w.crystals[k].group === c.group) idx++;
      const tk = this.ticks[i];
      tk.visible = S.state.difficulty === 'easy' && !solved && !!g && g.target[idx] === c.color;
      tk.rotation.y = time * 2;
      tk.position.y = this.wy(c.y) + 2.05 + Math.sin(time * 4) * 0.06;
    }
    for (let i = 0; i < w.bumblers.length; i++) {
      const b = w.bumblers[i];
      const v = this.bumblerViews[i];
      v.group.position.set(this.wx(lerp(b.px, b.x, alpha)), this.wy(b.y), 0);
      v.setMotion(b.vx, b.squish);
      if (near(v.group.position.x)) v.update(dt, time);
    }
    for (let i = 0; i < this.npcViews.length; i++) {
      const c = this.npcViews[i];
      if (!c.group.visible || !near(c.group.position.x)) continue;
      const dx = playerX - c.group.position.x;
      const close = Math.abs(dx) < 3.2;
      // Turn toward you when you come close, and wave hello once.
      const want = close || this.talkingNpc === i ? Math.sign(dx || 1) * 0.75 : ((this.world2.npcs[i].ent.def as Extract<EntDef, { kind: 'npc' }>).face ?? 1) * 0.55;
      c.group.rotation.y += (want - c.group.rotation.y) * (1 - Math.exp(-5 * dt));
      if (close && this.npcWave[i] === 0) this.npcWave[i] = 1.6;
      if (!close && Math.abs(dx) > 6) this.npcWave[i] = 0;
      if (this.npcWave[i] > 0.01) {
        this.npcWave[i] = Math.max(0.01, this.npcWave[i] - dt);
        c.setAnim(this.npcWave[i] > 0.02 ? 'wave' : 'idle');
      } else c.setAnim(this.talkingNpc === i ? 'talk' : 'idle');
      c.update(dt);
    }
  }

  private renderBuddy(dt: number, time: number): void {
    const b = this.buddy;
    if (!b || !this.trailFilled) return;
    // Oldest sample = where the player was ~0.4 s ago.
    const oi = (this.trailFilled < 24 ? 0 : this.trailHead) * 3;
    const bx = this.wx(this.trail[oi] - this.trail[oi + 2] * 40);
    const by = this.wy(this.trail[oi + 1]);
    const moving = Math.abs(bx - this.buddyPrev.x) > 0.004;
    b.group.position.set(bx, by + (moving ? Math.abs(Math.sin(time * 7)) * 0.12 : 0), -0.3);
    const face = this.trail[oi + 2];
    const want = face > 0 ? Math.PI / 2 - 0.6 : -Math.PI / 2 + 0.6;
    b.group.rotation.y += (want - b.group.rotation.y) * (1 - Math.exp(-8 * dt));
    b.setAnim(moving ? 'walk' : 'idle');
    b.update(dt);
    this.buddyPrev.set(bx, by, 0);
  }

  private renderMarker(time: number): void {
    const cur = this.current;
    if (!cur || cur.kind === 'dropOrb') {
      this.marker.visible = false;
      return;
    }
    this.marker.visible = true;
    const up = cur.kind === 'exit' ? 4.4 : cur.kind === 'talk' ? 2.9 : 2.2;
    const z = cur.kind === 'exit' ? -1.05 : cur.kind === 'talk' ? -0.35 : cur.kind === 'pickOrb' ? 0 : -0.4;
    this.marker.position.set(this.wx(cur.x), this.wy(cur.y) + up + Math.sin(time * 5) * 0.12, z);
    this.marker.rotation.y = time * 2.2;
    // The prompt floats just above the marker (kept on screen).
    const v = this.tmp.copy(this.marker.position);
    v.y += 0.5;
    v.project(this.camera);
    const x = clamp(((v.x + 1) / 2) * this.w, 150, this.w - 150);
    const y = clamp(((1 - v.y) / 2) * this.hh, 190, this.hh - 40);
    this.promptAnchor.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  private renderBlobs(px: number, py: number): void {
    const bl = this.blobs;
    if (!bl) return;
    let n = 0;
    const put = (x: number, y: number, z: number, r: number) => {
      const s = this.blobSlots[n];
      s.x = x;
      s.y = y;
      s.z = z;
      s.r = r;
      n++;
    };
    put(px, py, 0.05, this.rover ? 1.7 : 0.95);
    if (this.buddy) put(this.buddy.group.position.x, this.buddyPrev.y, -0.3, 0.8);
    for (const c of this.npcViews) if (c.group.visible) put(c.group.position.x, c.group.position.y, -0.35, 0.9);
    for (const b of this.bumblerViews) put(b.group.position.x, b.group.position.y, 0, 0.95);
    for (const b of this.blockViews) put(b.group.position.x, b.group.position.y, 0, 1.25);
    const m = this.model;
    for (let i = 0; i < n; i++) {
      const s = this.blobSlots[i];
      const gy = groundBelow(m, s.x, s.y + 0.05);
      const above = Math.max(0, s.y - gy);
      const k = s.r * clamp(1 - above * 0.12, 0.45, 1);
      this.tmp.set(s.x, gy + 0.025, s.z);
      this.tmpS.set(k, k * 0.62, 1);
      this.tmpM.compose(this.tmp, this.flat, this.tmpS);
      bl.setMatrixAt(i, this.tmpM);
    }
    bl.count = n;
    bl.instanceMatrix.needsUpdate = true;
  }

  /** Put a DOM label at a 3D point (hidden when off-screen). */
  private project(v: Vector3, el: HTMLElement, dy: string): void {
    v.project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    el.style.transform = `translate(${((v.x + 1) / 2) * this.w}px, ${((1 - v.y) / 2) * this.hh}px) translate(-50%, ${dy})`;
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}

/** Solid parts cast shadows on High (glows and glass don't). */
function castShadows(root: Object3D): void {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as { isMeshStandardMaterial?: boolean; transparent?: boolean };
    if (mat?.isMeshStandardMaterial && !mat.transparent) mesh.castShadow = true;
  });
}

export type { ExploreScene as ExploreSceneType };

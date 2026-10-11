import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  TorusGeometry,
  Vector3,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import { comfortOn } from '../app/comfort';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { PART_BY_ID } from '../data/parts';
import type { Line } from '../data/dialogueTypes';
import { theme } from '../data/themes';
import { SpeedDust } from '../r3/flight/flightFx';
import type { Particles3 } from '../r3/fx/particles';
import { Trail } from '../r3/fx/trail';
import { buildCadet, Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { addSpaceSky } from '../r3/space/backdrop';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { makeWormhole } from '../r3/space/wormhole';
import { surfaceLight, terrainMaterial } from '../r3/surface/look';
import { MachineProp } from '../r3/surface/props';
import { SurfaceSky } from '../r3/surface/sky';
import type { CamKey, CamSample, Cue, V3 } from '../systems/timeline';
import { academyStage, CAST_SCALE, type AcademyStage } from './academyStage';

/**
 * How each story scene is staged: the set, an establishing camera move, a shot for every dialogue
 * line (who speaks gets the camera and acts it out), timed cues (the beacon relighting, the jump into
 * the wormhole) and a closing move. Run by `CutsceneScene`.
 */
export interface Staging {
  /** Camera keys from the start of the scene until the first line. */
  intro: CamKey[];
  /** When the dialogue starts (seconds). */
  dialogueAt: number;
  /** A camera move for line i (times relative to when the line appears). */
  shot(i: number, line: Line, t: number): CamKey[];
  /** Acting for line i. */
  line(i: number, line: Line): void;
  /** After the last line: a closing move and how long to hold it. */
  outro(t: number): CamKey[];
  outroLen: number;
  cues: Cue[];
  cue(id: string): void;
  update(dt: number, t: number): void;
  /** Fireworks over this point while set. */
  fireworks: Vector3 | null;
  /** The Academy cutscene borrows the hub's diorama. */
  readonly stage: AcademyStage | null;
  restore?(): void;
}

export interface StageCtx {
  world: Scene;
  set: Group;
  camera: PerspectiveCamera;
  fx: Particles3;
  /** A white flash over the screen (entering the wormhole). */
  flash(): void;
}

const v3 = (v: Vector3, dx = 0, dy = 0, dz = 0): V3 => [v.x + dx, v.y + dy, v.z + dz];

function actor(id: string): Character {
  const c = id === 'player' ? buildCadet(S.state.data.profile) : new Character(id);
  c.group.scale.setScalar(id === 'player' ? 1.45 / Math.max(0.6, c.height) : CAST_SCALE);
  return c;
}

/** Everyone except the speaker settles down; the speaker talks with the line's mood. */
function act(cast: Map<string, Character>, line: Line, speakerAnim: Parameters<Character['setAnim']>[0] = 'talk'): void {
  for (const [id, c] of cast) {
    const speaking = id === line.who;
    c.talk(speaking);
    c.mood = speaking && line.mood ? (line.mood as Character['mood']) : 'happy';
    if (speaking) c.setAnim(speakerAnim);
    else if (c.anim === 'talk' || c.anim === 'wave') c.setAnim('idle');
  }
}

function faceTo(c: Character, target: Vector3, k = 1): void {
  const p = c.group.position;
  const want = Math.atan2(target.x - p.x, target.z - p.z);
  c.group.rotation.y += (want - c.group.rotation.y) * k;
}

// ------------------------------------------------------------------ Zibbo joins the crew

/** Zibbo sees the Academy for the first time; the crew welcome them on the hill out front. */
export class ZibboStaging implements Staging {
  readonly stage = academyStage();
  readonly cast = new Map<string, Character>();
  private hidden: Character[] = [];
  readonly intro: CamKey[];
  readonly dialogueAt = 4.3;
  readonly outroLen = 2.8;
  readonly cues: Cue[] = [];
  fireworks: Vector3 | null = null;
  private front: Vector3;
  /** Zibbo turns to Stella while she welcomes them. */
  private faceStella = false;

  constructor(ctx: StageCtx, ids: string[]) {
    const a = this.stage.academy;
    for (const id of ids) {
      const c = this.stage.cast.get(id);
      if (c?.group.visible) {
        c.group.visible = false;
        this.hidden.push(c);
      }
    }
    const lobby = a.rooms.lobby;
    const x = (lobby.min.x + lobby.max.x) / 2;
    const z = lobby.max.z + 4.2;
    this.front = new Vector3(x, groundAt(a.group, x, z), z);
    ids.forEach((id, i) => {
      const c = actor(id);
      c.group.position.set(this.front.x + (i - (ids.length - 1) / 2) * 1.55, this.front.y, this.front.z + Math.abs(i - (ids.length - 1) / 2) * -0.3);
      c.setAnim(id === 'zibbo' ? 'celebrate' : 'idle');
      this.cast.set(id, c);
      ctx.set.add(c.group);
    });
    const o = a.overview;
    const f = this.front;
    this.intro = [
      { t: 0, pos: [o.pos.x, o.pos.y, o.pos.z], look: [o.look.x, o.look.y, o.look.z], fov: o.fov },
      { t: 2.3, pos: v3(f, 7, 7, 24), look: v3(f, 0, 3, -4), fov: 40 },
      { t: 4.2, pos: v3(f, 1.2, 2.0, 8.5), look: v3(f, 0, 1.3, -1), fov: 38 },
    ];
  }

  private mid(a: string, b: string): Vector3 {
    return new Vector3().addVectors(this.cast.get(a)!.group.position, this.cast.get(b)!.group.position).multiplyScalar(0.5);
  }

  shot(i: number): CamKey[] {
    const z = this.cast.get('zibbo')!.group.position;
    // Zibbo's amazed face with the Academy rising behind.
    if (i === 0) return [{ t: 1.8, pos: v3(z, 0.5, 0.9, 3.8), look: v3(z, 0, 0.5, 0), fov: 44 }];
    if (i === 1) {
      const m = this.mid('stella', 'zibbo');
      return [{ t: 1.6, pos: v3(m, 0, 1.1, 5), look: v3(m, 0, 0.75, 0), fov: 36 }];
    }
    const m = this.mid('player', 'zibbo');
    return [{ t: 1.6, pos: v3(m, 0.3, 0.95, 4), look: v3(m, 0, 0.65, 0), fov: 36 }];
  }

  line(i: number, line: Line): void {
    const z = this.cast.get('zibbo')!;
    if (i === 0) {
      act(this.cast, line, 'celebrate');
    } else if (i === 1) {
      this.faceStella = true;
      act(this.cast, line, 'wave');
      z.setAnim('idle');
    } else {
      this.faceStella = false;
      act(this.cast, line, 'celebrate');
      for (const c of this.cast.values()) if (c !== z) c.setAnim('wave');
      this.fireworks = new Vector3(this.front.x, this.front.y + 14, this.front.z - 12);
    }
  }

  outro(): CamKey[] {
    for (const c of this.cast.values()) {
      c.talk(false);
      c.setAnim('celebrate');
    }
    const f = this.front;
    return [{ t: 2.6, pos: v3(f, 3, 6.5, 19), look: v3(f, 0, 5, -4), fov: 42 }];
  }

  cue(): void {}

  update(dt: number): void {
    const z = this.cast.get('zibbo')!;
    if (this.faceStella) faceTo(z, this.cast.get('stella')!.group.position, 1 - Math.exp(-6 * dt));
    else z.group.rotation.y *= Math.exp(-5 * dt);
    for (const c of this.cast.values()) c.update(dt);
  }

  restore(): void {
    for (const c of this.hidden) c.group.visible = true;
    this.hidden.length = 0;
  }
}

/** Ground height under (x, z) in a diorama (ray straight down). */
function groundAt(root: Group, x: number, z: number): number {
  const ray = new Raycaster(new Vector3(x, 40, z), new Vector3(0, -1, 0), 0, 80);
  const hits = ray.intersectObject(root, true);
  for (const h of hits) if ((h.object as Mesh).isMesh && h.face && h.face.normal.y > 0.3) return h.point.y;
  return 0;
}

// ------------------------------------------------------------------ the star path

/** Your rocket flies past Neptune toward the newly found wormhole while Stella radios in. */
export class StarpathStaging implements Staging {
  readonly stage = null;
  readonly intro: CamKey[];
  readonly dialogueAt = 3.7;
  readonly outroLen = 2.8;
  readonly cues: Cue[] = [];
  fireworks: Vector3 | null = null;
  private sky: SpaceSky;
  private neptune: PlanetView;
  private worm: ReturnType<typeof makeWormhole>;
  private rocket: RocketModel;
  private trail: Trail;
  private readonly from = new Vector3(-16, -1, -4);
  private readonly to = new Vector3(46, 14, -120);
  private readonly dir = new Vector3();
  private readonly sunDir = new Vector3(-0.7, 0.3, 0.6).normalize();
  private readonly tmp = new Vector3();
  private readonly nozzle = new Vector3();
  private boostAt = Infinity;
  private readonly tail: Vector3;

  constructor(private readonly ctx: StageCtx) {
    this.sky = addSpaceSky(ctx.world, SKIES.space);
    ctx.world.add(new HemisphereLight('#9fb0ff', '#2a1850', 0.6));
    const sun = new DirectionalLight('#fff4e2', 2.4);
    sun.position.copy(this.sunDir).multiplyScalar(100);
    ctx.world.add(sun);
    const r3 = S.game.r3;
    this.neptune = createPlanet('neptune', 26, { renderer: r3.renderer, profile: r3.profile, detail: 'hero' });
    this.neptune.group.position.set(-34, -10, -62);
    this.worm = makeWormhole();
    this.worm.mesh.scale.setScalar(12);
    this.worm.mesh.position.copy(this.to);
    this.rocket = rocketModel(2.6);
    this.tail = this.rocket.nozzles()[0] ?? new Vector3(0, this.rocket.extent.bottom, 0);
    const eng = PART_BY_ID[S.state.data.loadout.engine]?.flame ?? ['#ff9f43', '#fff36b'];
    this.trail = new Trail(26, 0.16, eng[1], eng[0], 0.35);
    this.trail.power = 0.35;
    ctx.set.add(this.neptune.group, this.worm.mesh, this.rocket.group, this.trail.mesh);
    this.dir.subVectors(this.to, this.from).normalize();
    this.rocket.group.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), this.dir);
    const r0 = this.at(0);
    const r1 = this.at(3.6);
    this.intro = [
      { t: 0, pos: v3(r0, -3, 1.2, 7), look: v3(r0, 0, 0, -3), fov: 45 },
      { t: 3.6, pos: v3(r1, -6, 2.5, 11), look: v3(r1), fov: 45 },
    ];
  }

  /** Where the rocket is at time t (it speeds off at the end). */
  private at(t: number, out = new Vector3()): Vector3 {
    const s = t < this.boostAt ? t : this.boostAt + (t - this.boostAt) * 4;
    return out.copy(this.from).addScaledVector(this.dir, s * 1.6);
  }

  shot(i: number, _line: Line, t: number): CamKey[] {
    if (i === 0) {
      const r = this.at(t + 2.5);
      return [{ t: 2.5, pos: v3(r, -2, 1.6, 6), look: [this.to.x, this.to.y, this.to.z], fov: 45 }];
    }
    const r = this.at(t + 3);
    return [{ t: 3, pos: v3(r, -1, 0.5, 13), look: v3(r), fov: 42 }];
  }

  line(): void {}

  outro(t: number): CamKey[] {
    this.boostAt = t;
    sfx('boost');
    const r = this.at(t + 2.6);
    return [{ t: 2.6, pos: v3(this.at(t), -3, 2, 9), look: v3(r), fov: 45 }];
  }

  cue(): void {}

  update(dt: number, t: number): void {
    this.at(t, this.rocket.group.position);
    this.rocket.update(dt, 0.9, t > this.boostAt ? 1 : 0.2);
    this.rocket.group.updateMatrixWorld();
    this.nozzle.copy(this.tail).applyMatrix4(this.rocket.group.matrixWorld);
    this.trail.power = t > this.boostAt ? 0.8 : 0.25;
    this.trail.push(this.nozzle);
    this.trail.update(this.ctx.camera);
    this.neptune.update(t, this.sunDir);
    this.worm.material.uniforms.uTime.value = t;
    this.sky.update(t);
    void this.tmp;
  }
}

function rocketModel(height: number): RocketModel {
  const r = new RocketModel(S.state.data.loadout, { glossy: S.game.r3.profile.tier === 'high' });
  const e = r.extent;
  r.group.scale.setScalar(height / (e.top - e.bottom));
  return r;
}

// ------------------------------------------------------------------ into the wormhole

/** The rocket dives into the swirl and rides a tunnel of rainbow rings. */
export class WormholeStaging implements Staging {
  readonly stage = null;
  readonly intro: CamKey[] = [
    { t: 0, pos: [0, 1.4, 8], look: [0, 0.6, -20], fov: 50 },
    { t: 3.3, pos: [0, 0.9, 5.5], look: [0, 0.6, -20], fov: 55 },
  ];
  readonly dialogueAt = 3.9;
  readonly outroLen = 1.8;
  readonly cues: Cue[] = [{ t: 3.35, id: 'enter' }];
  fireworks: Vector3 | null = null;
  private sky: SpaceSky;
  private worm: ReturnType<typeof makeWormhole>;
  private rings: Mesh[] = [];
  private rocket: RocketModel;
  private dust: SpeedDust;
  private inside = false;

  constructor(private readonly ctx: StageCtx) {
    this.sky = addSpaceSky(ctx.world, SKIES.zephyra);
    ctx.world.add(new HemisphereLight('#c9b0ff', '#2a1850', 0.9));
    const key = new DirectionalLight('#ffe6fb', 2);
    key.position.set(3, 5, 6);
    ctx.world.add(key);
    const colors = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9', '#9b6bff'];
    for (let i = 0; i < 16; i++) {
      const m = new Mesh(new TorusGeometry(6, 0.18, 8, 48), new MeshBasicMaterial({ color: new Color(colors[i % colors.length]).multiplyScalar(2), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
      m.position.z = -i * 6;
      m.visible = false;
      this.rings.push(m);
      ctx.set.add(m);
    }
    this.worm = makeWormhole();
    this.worm.mesh.scale.setScalar(10);
    this.worm.mesh.position.set(0, 0.6, -70);
    this.rocket = rocketModel(2.6);
    this.rocket.group.rotation.set(-Math.PI / 2, 0, 0);
    this.dust = new SpeedDust(comfortOn() ? 40 : 140);
    this.dust.lines.visible = false;
    ctx.set.add(this.worm.mesh, this.rocket.group, this.dust.lines);
  }

  shot(i: number): CamKey[] {
    if (i === 0) return [{ t: 2, pos: [2.2, 1.6, 5.5], look: [0, 0.4, -10], fov: 55 }];
    return [{ t: 2.4, pos: [1.9, 1.1, -6.5], look: [0, 0.7, 0], fov: 50 }];
  }

  line(): void {
    if (!comfortOn()) sfx('whoosh', { volume: 0.6 });
  }

  outro(): CamKey[] {
    return [{ t: 1.6, pos: [0, 1, 7], look: [0, 0.6, -20], fov: 60 }];
  }

  cue(id: string): void {
    if (id !== 'enter') return;
    this.inside = true;
    this.ctx.flash();
    sfx('whoosh');
    this.worm.mesh.visible = false;
    for (const r of this.rings) r.visible = true;
    this.dust.lines.visible = true;
  }

  update(dt: number, t: number): void {
    this.worm.material.uniforms.uTime.value = t;
    if (!this.inside) {
      // The swirl rushes closer and grows.
      const k = Math.min(1, t / 3.3);
      this.worm.mesh.position.z = -70 + 66 * k * k;
      this.worm.mesh.scale.setScalar(10 + 30 * k * k);
    }
    const r = this.rocket.group;
    r.position.x = Math.sin(t * 1.3) * 0.35;
    r.position.y = 0.6 + Math.cos(t * 1.1) * 0.25;
    this.rocket.update(dt, 0.9, 1);
    if (this.inside) {
      const speed = comfortOn() ? 14 : 30;
      for (let i = 0; i < this.rings.length; i++) {
        const m = this.rings[i];
        m.position.z += speed * dt;
        if (m.position.z > 8) m.position.z -= this.rings.length * 6;
        m.position.x = Math.sin(t * 0.8 + i) * 1.2;
        m.position.y = 0.6 + Math.cos(t * 0.7 + i * 0.6) * 0.9;
        m.rotation.z = t * 0.5 + i;
      }
      this.dust.update(this.ctx.camera.position, 0, 0, -40, comfortOn() ? 0.4 : 1.2);
    }
    this.sky.update(t);
  }
}

// ------------------------------------------------------------------ the beacon relights

/** On Zephyra the Star Beacon flickers back to life; everyone celebrates; friends radio in from Earth. */
export class FinaleStaging implements Staging {
  readonly stage = null;
  readonly cast = new Map<string, Character>();
  readonly intro: CamKey[] = [
    { t: 0, pos: [0, 2.4, 15], look: [0, 4.5, -9], fov: 45 },
    { t: 4.6, pos: [2.6, 1.6, 9.5], look: [0, 5, -9], fov: 45 },
  ];
  readonly dialogueAt = 4.7;
  readonly outroLen = 2.2;
  readonly cues: Cue[] = [{ t: 1.8, id: 'relight' }, { t: 3.2, id: 'party' }];
  fireworks: Vector3 | null = null;
  private sky: SurfaceSky;
  private beacon: MachineProp;
  private beam: Mesh;
  private beamT = -1;
  private turnT = -1;
  private readonly sunDir = new Vector3();

  constructor(private readonly ctx: StageCtx, ids: string[]) {
    const th = theme('zbeacon');
    const L = surfaceLight(th);
    const r3 = S.game.r3;
    ctx.world.environmentIntensity = L.envIntensity;
    const sun = new DirectionalLight(L.sunColor, L.sunIntensity);
    sun.position.copy(L.sunDir).multiplyScalar(50);
    ctx.world.add(sun, new HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
    if (L.sun2) {
      const s2 = new DirectionalLight(L.sun2.color, L.sun2.intensity);
      s2.position.copy(L.sun2.dir).multiplyScalar(50);
      ctx.world.add(s2);
    }
    this.sunDir.copy(L.sunDir);
    ctx.world.fog = new Fog(L.fog[0], 80, 380);
    this.sky = new SurfaceSky(ctx.world, th, L, { renderer: r3.renderer, profile: r3.profile, pixelRatio: r3.pixelRatio, x0: -40, x1: 40, seed: 7, layerZ: [-70, -160] });
    ctx.set.add(ground(th));
    this.beacon = new MachineProp('beacon');
    this.beacon.setPowered(false);
    this.beacon.group.scale.setScalar(3.2);
    this.beacon.group.position.set(0, 0, -9);
    this.beam = new Mesh(new CylinderGeometry(0.9, 1.6, 60, 24, 1, true), new MeshBasicMaterial({ color: new Color('#fff7b3').multiplyScalar(1.6), transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
    this.beam.position.set(0, 9, -9);
    this.beam.scale.y = 0.001;
    this.beam.visible = false;
    ctx.set.add(this.beacon.group, this.beam);
    ids.forEach((id, i) => {
      const c = actor(id);
      c.group.position.set((i - (ids.length - 1) / 2) * 1.35, 0, 2.6 + Math.abs(i - (ids.length - 1) / 2) * -0.25);
      // Watching the beacon at first.
      c.group.rotation.y = Math.PI;
      this.cast.set(id, c);
      ctx.set.add(c.group);
    });
  }

  private pos(id: string): Vector3 {
    return (this.cast.get(id) ?? this.cast.values().next().value!).group.position;
  }

  shot(i: number): CamKey[] {
    if (i === 0) return [{ t: 1.6, pos: v3(this.pos('ollo'), 0.4, 0.95, 3.6), look: v3(this.pos('ollo'), 0, 0.55, 0), fov: 38 }];
    if (i === 1) {
      const m = new Vector3().addVectors(this.pos('zibbo'), this.pos('player')).multiplyScalar(0.5);
      return [{ t: 1.6, pos: v3(m, 0.2, 1.0, 3.9), look: v3(m, 0, 0.6, 0), fov: 36 }];
    }
    if (i === 2) {
      // A hero shot from a little below, the beacon blazing behind.
      const p = this.pos('player');
      return [{ t: 1.8, pos: v3(p, 0.7, 0.45, 3.1), look: v3(p, 0, 1.05, 0), fov: 46 }];
    }
    return [{ t: 2.2, pos: [0, 1.6, 7.5], look: [0, 15, -9], fov: 52 }];
  }

  line(i: number, line: Line): void {
    // Stella and Pip call in by radio: the cast just keeps cheering.
    act(this.cast, line, i === 1 ? 'wave' : 'talk');
    if (i >= 2) for (const c of this.cast.values()) c.setAnim('celebrate');
  }

  outro(): CamKey[] {
    for (const c of this.cast.values()) {
      c.talk(false);
      c.setAnim('celebrate');
    }
    return [{ t: 2, pos: [-6.5, 3, 10], look: [0, 3.5, -4], fov: 45 }];
  }

  cue(id: string): void {
    if (id === 'relight') {
      this.beacon.setPowered(true);
      this.beam.visible = true;
      this.beamT = 0;
      this.ctx.fx.burst(0, 11.5, -9, comfortOn() ? 30 : 60, 7, 1.4, 0.4, '#fff7b3');
      this.ctx.fx.burst(0, 11.5, -9, 30, 5, 1.2, 0.3, '#ff7ad9');
      sfx('solve');
      sfx('fanfare');
    } else if (id === 'party') {
      this.fireworks = new Vector3(0, 12, -14);
      this.turnT = 0;
      for (const c of this.cast.values()) c.setAnim('celebrate');
    }
  }

  update(dt: number, t: number): void {
    if (this.beamT >= 0) {
      this.beamT += dt;
      const k = Math.min(1, this.beamT / 1.5);
      this.beam.scale.y = Math.max(0.001, k);
      this.beam.position.y = 9 + 30 * k;
      (this.beam.material as MeshBasicMaterial).opacity = 0.18 + Math.sin(t * 3) * 0.06;
    }
    if (this.turnT >= 0) {
      this.turnT += dt;
      // Turn around to the camera to celebrate together.
      for (const c of this.cast.values()) c.group.rotation.y += (0 - c.group.rotation.y) * (1 - Math.exp(-4 * dt));
    }
    this.beacon.update(dt, t);
    for (const c of this.cast.values()) c.update(dt);
    this.sky.update(t, this.ctx.camera);
    void this.sunDir;
  }
}

/** A wide gently rolling patch of a world's ground. */
export function ground(th: ReturnType<typeof theme>): Mesh {
  const g = new PlaneGeometry(160, 90, 40, 24);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const far = Math.max(0, -z - 6) / 30;
    pos.setY(i, Math.sin(x * 0.15) * far * 1.6 + Math.sin(z * 0.2 + x * 0.05) * far);
  }
  g.setAttribute('color', new BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
  const uv = g.attributes.uv as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  g.computeVertexNormals();
  return new Mesh(g, terrainMaterial(th, 'lip'));
}

export type { CamSample };

import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
  type Object3D,
} from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { clamp, lerp } from '../core/mathx';
import { Rng } from '../core/rng';
import { BODY_BY_ID } from '../data/bodies';
import { levelById } from '../data/levels';
import { PART_BY_ID } from '../data/parts';
import { theme, type Theme } from '../data/themes';
import { FloatLabels } from '../r3/flight/flightFx';
import { Particles3 } from '../r3/fx/particles';
import { RocketModel } from '../r3/models/rocket';
import { surfaceLight, terrainMaterial, trimColor, type SurfaceLight } from '../r3/surface/look';
import { LandingPadProp, makeBoulder, makeDeco, makePlant, type Prop } from '../r3/surface/props';
import { SurfaceSky } from '../r3/surface/sky';
import { landingGravity, makeLanding, stepLanding, type LandingConfig, type LandingState } from '../systems/landing';
import { h } from '../ui/dom';
import { Hud } from '../ui/hud';
import { button, iconEl } from '../ui/widgets';
import { openPause } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { landingHooks } from './landingHooks';

export interface LandingParams {
  body: string;
}

/** The landing sim keeps its own fixed 2D space (pixels); 48 px = 1 world unit like the levels. */
const SIM_W = 1280;
const GROUND_Y = 570;
/** Sim pixels per world unit (a bit tighter than the levels so the rocket fills the view). */
const UNIT = 64;
const ROCKET_H = 2.5;
/** Seconds of the swoop down from orbit (shorter in Comfort mode). */
const SWOOP = 2.6;

/** Forgiving landing minigame in 3D: slow down with Thrust and touch down on the glowing pad. */
export class LandingScene extends Scene3D {
  private th: Theme;
  private look: SurfaceLight;
  private state: LandingState;
  private cfg: LandingConfig;
  private sky!: SurfaceSky;
  private rocket!: RocketModel;
  private rocketH = 1;
  private pad!: LandingPadProp;
  private beam!: Mesh;
  private reticle!: Mesh;
  private dropLine!: Mesh;
  private props: Prop[] = [];
  private nozzles: Vector3[] = [];
  private sparks: Particles3;
  private puffs: Particles3;
  private floats: FloatLabels;
  private hud: Hud;
  private gauge: HTMLElement;
  private gaugeFill: HTMLElement;
  private alt: HTMLElement;
  private altMark: HTMLElement;
  private skipBtn: HTMLElement;
  private readonly comfort = comfortOn();
  private w = 1280;
  private hh = 720;
  private t = 0;
  private doneT = -1;
  private ready = false;
  private lastMsg = '';
  private swoopT = 0;
  private swoopLen: number;
  private swoopDone = false;
  private shakeT = 0;
  private lastTime = 0;
  private flameColor: string;
  // Camera state.
  private readonly camPos = new Vector3();
  private readonly camLook = new Vector3();
  private readonly goalPos = new Vector3();
  private readonly goalLook = new Vector3();
  private readonly tmp = new Vector3();
  private readonly rocketPos = new Vector3();

  constructor(private readonly p: LandingParams) {
    super('landing');
    this.music = 'flight';
    this.pausable = true;
    const body = BODY_BY_ID[p.body];
    const area = body?.areas?.[0];
    this.th = theme(p.body === 'earth' ? 'earth' : (area && levelById(area)?.theme) || 'moon');
    this.look = surfaceLight(this.th);
    const tn = S.state.tuning;
    this.cfg = {
      gravity: landingGravity(body?.gravityG ?? 1),
      thrust: 560,
      side: 520,
      groundY: GROUND_Y,
      padX: SIM_W * (0.45 + Math.random() * 0.2),
      padW: 170,
      safeSpeed: tn.landingSafeSpeed,
      worldW: SIM_W,
      assistAfter: 3,
    };
    this.state = makeLanding(this.cfg, tn.landingAssist, Math.random() < 0.5 ? SIM_W * 0.22 : SIM_W * 0.78);
    this.swoopLen = this.comfort ? 1.2 : SWOOP;
    this.flameColor = PART_BY_ID[S.state.data.loadout.engine]?.flame?.[0] ?? '#ff9f43';
    this.hud = new Hud({ onPause: () => openPause('landing') });
    this.gaugeFill = h('div', { class: 'gauge-fill' });
    this.gauge = h('div', { class: 'gauge', 'data-testid': 'landing-gauge' }, h('div', { class: 'gauge-safe' }), this.gaugeFill, h('div', { class: 'gauge-lbl' }, 'Speed'));
    this.altMark = h('div', { class: 'alt-mark' }, iconEl('rocket'));
    this.alt = h('div', { class: 'alt-meter', 'data-testid': 'altitude' }, h('div', { class: 'alt-ground' }), this.altMark, h('div', { class: 'gauge-lbl' }, 'Height'));
    // Tap anywhere (or press a button) to skip the swoop.
    this.skipBtn = h('div', { class: 'hit skip-layer', onpointerdown: () => this.endSwoop() },
      h('div', { class: 'cutscene-skip' }, button('Skip', 'next', () => this.endSwoop(), { size: 'small', color: 'white', id: 'btn-skip-swoop' })));
    this.floats = new FloatLabels(this.ui);
    this.ui.append(this.hud.el, this.gauge, this.alt, this.skipBtn);
    this.gauge.style.visibility = 'hidden';
    this.alt.style.visibility = 'hidden';
    const prof = S.game.r3.profile;
    this.sparks = new Particles3(Math.min(400, prof.particles), 'spark');
    this.sparks.drag = 1.5;
    this.puffs = new Particles3(Math.min(240, Math.round(prof.particles / 2)), 'puff', false);
    this.puffs.drag = 1.4;
    this.build();
  }

  // ------------------------------------------------------------------ building

  /** Sim (pixels, y down) → world: x centered on the play area, y = height above the ground. */
  private wx(x: number): number {
    return (x - SIM_W / 2) / UNIT;
  }

  private wy(y: number): number {
    return (GROUND_Y - y) / UNIT;
  }

  private build(): void {
    const r3 = S.game.r3;
    const prof = r3.profile;
    const th = this.th;
    const L = this.look;
    const seed = this.p.body.length * 131 + 7;
    this.world.environmentIntensity = L.envIntensity;
    const sun = new DirectionalLight(L.sunColor, L.sunIntensity);
    sun.position.copy(L.sunDir).multiplyScalar(60);
    this.world.add(sun, new HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
    if (L.sun2) {
      const s2 = new DirectionalLight(L.sun2.color, L.sun2.intensity);
      s2.position.copy(L.sun2.dir).multiplyScalar(60);
      this.world.add(s2);
    }
    this.world.fog = new Fog(L.fog[0], 70, L.fog[2] * 1.6);
    this.sky = new SurfaceSky(this.world, th, L, { renderer: r3.renderer, profile: prof, pixelRatio: r3.pixelRatio, x0: -60, x1: 60, seed, layerZ: [-95, -190] });
    this.world.add(this.groundMesh(seed));
    // Scenery props around the landing zone (never between you and the pad).
    const rng = new Rng(seed);
    for (let i = 0; i < 16; i++) {
      const x = rng.range(-34, 34);
      const z = rng.range(-30, -5);
      const k = rng.next();
      // Real worlds get rocks and the odd crater or science gadget; Earth gets trees; Zephyra its magic plants.
      const zeph = th.bumbler === 'fuzzle';
      const plants = zeph || th.id === 'earth' ? 0.55 : 0.2;
      const deco = zeph ? (['crystals', 'mushroom'] as const) : th.id === 'earth' ? (['flagpole', 'bench'] as const) : (['crater', 'crater', 'antenna', 'dish'] as const);
      const p = k < plants ? makePlant(th, rng.int(0, 9999)) : k < 0.85 ? makeBoulder(th, rng.int(0, 9999)) : makeDeco(rng.pick(deco), th, rng.int(0, 9999));
      p.group.position.set(x, this.groundHeight(x, z), z);
      p.group.scale.setScalar(rng.range(1, 1.6));
      p.group.rotation.y = rng.range(-0.5, 0.5);
      this.world.add(p.group);
      if (p.update) this.props.push(p);
    }
    // The pad, a soft light beam above it, and a ring that shows where you will land.
    this.pad = new LandingPadProp(this.cfg.padW / 2 / UNIT);
    this.pad.setGlow('#8cff66');
    this.pad.group.position.set(this.wx(this.cfg.padX), 0, 0);
    this.world.add(this.pad.group);
    this.beam = new Mesh(
      new CylinderGeometry(1.2, 1.7, 14, 24, 1, true),
      new MeshBasicMaterial({ color: new Color('#8cff66').multiplyScalar(0.7), transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false }),
    );
    this.beam.position.set(this.wx(this.cfg.padX), 7, 0);
    this.reticle = new Mesh(new TorusGeometry(0.7, 0.06, 8, 32), new MeshBasicMaterial({ color: new Color('#ffffff').multiplyScalar(1.6), transparent: true, opacity: 0.8, depthWrite: false }));
    this.reticle.rotation.x = Math.PI / 2;
    this.dropLine = new Mesh(new CylinderGeometry(0.02, 0.02, 1, 6), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
    this.world.add(this.beam, this.reticle, this.dropLine);
    // Your rocket.
    this.rocket = new RocketModel(S.state.data.loadout, { glossy: prof.tier === 'high' });
    const ext = this.rocket.extent;
    this.rocketH = ext.top - ext.bottom;
    this.rocket.group.scale.setScalar(ROCKET_H / this.rocketH);
    this.nozzles = this.rocket.nozzles();
    this.world.add(this.rocket.group, this.sparks.points, this.puffs.points);
    this.camera.fov = 40;
    this.camera.near = 0.3;
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
    this.placeRocket(this.state.x, this.state.y);
    this.placeRocket(this.state.x - 500, this.state.y - 1400);
    this.frameCamera(1);
    this.camPos.copy(this.goalPos);
    this.camLook.copy(this.goalLook);
  }

  /** Rolling ground with a flat landing zone in the middle. */
  private groundHeight(x: number, z: number): number {
    const flat = Math.max(Math.abs(x) - 15, 0) + Math.max(-z - 6, 0) * 0.8 + Math.max(z - 6, 0) * 0.8;
    const k = clamp(flat / 14, 0, 1);
    const hills = Math.sin(x * 0.09 + 1.3) * 1.6 + Math.sin(z * 0.11 + x * 0.04) * 1.4 + Math.sin(x * 0.27 - z * 0.19) * 0.45;
    return k * k * (hills + 1.2) - 0.02;
  }

  private groundMesh(_seed: number): Object3D {
    const g = new PlaneGeometry(240, 130, 120, 65);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -25);
    const pos = g.attributes.position as BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.groundHeight(x, z);
      pos.setY(i, y);
      const s = 0.92 + 0.08 * Math.sin(x * 0.7 + z * 0.5);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    // World-space uvs so the detail texture matches the levels' scale.
    const uv = g.attributes.uv as BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
    g.computeVertexNormals();
    return new Mesh(g, terrainMaterial(this.th, 'lip'));
  }

  override async enter(): Promise<void> {
    S.touch.setMode('landing');
    const isEarth = this.p.body === 'earth';
    this.hud.setObjective(isEarth ? 'Land on the Academy pad!' : 'Land softly on the glowing pad!', 'land');
    this.hud.setCoins(S.state.data.coins);
    this.pad.setGlow(isEarth ? '#ffe066' : trimColor(this.th) === '#ff9ad9' ? '#ff9ad9' : '#8cff66');
    this.ready = true;
    sfx('whoosh');
  }

  /** The swoop is over (or skipped): hand control to the player. */
  private endSwoop(): void {
    if (this.swoopDone) return;
    this.swoopDone = true;
    this.swoopT = this.swoopLen;
    this.skipBtn.remove();
    this.gauge.style.visibility = '';
    this.alt.style.visibility = '';
    if (this.state.assist) toast('Auto-Lander is on. Steer to the pad!', 'land', 2600);
    landingHooks.onStart(this);
    tip('landing');
  }

  override exit(): void {
    S.touch.setMode('none');
    this.floats.clear();
  }

  override back(): boolean {
    openPause('landing');
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.w = w;
    this.hh = hh;
    const px = window.innerHeight * S.game.r3.pixelRatio;
    this.sparks.setScreen(px);
    this.puffs.setScreen(px);
    this.sky?.setPixelRatio(S.game.r3.pixelRatio);
  }

  // ------------------------------------------------------------------ logic

  override update(dt: number): void {
    if (!this.ready) return;
    this.t += dt;
    const s = this.state;
    const input = S.input.state;
    if (!this.swoopDone) {
      this.swoopT += dt;
      if (input.actionPressed || input.boostPressed || input.confirmPressed || this.swoopT >= this.swoopLen) this.endSwoop();
      this.sparks.update(dt);
      this.puffs.update(dt);
      return;
    }
    const thrust = input.boost || input.y < -0.4;
    const landed = stepLanding(s, this.cfg, { x: input.x, thrust }, dt);
    const rx = this.wx(s.x);
    const ry = this.wy(s.y);
    if (s.last !== 'none' && s.last !== this.lastMsg && !s.done) {
      this.lastMsg = s.last;
      if (s.last === 'fast') {
        toast('Too fast! Hold Thrust to slow down.', 'boost', 2400);
        this.floats.show('Bonk!', this.tmp.set(rx, ry + ROCKET_H + 0.6, 0), '#ff9aa8');
        sfx('bump');
      } else if (s.last === 'miss') {
        toast('Try to land on the glowing pad!', 'target', 2400);
        this.floats.show('Oops!', this.tmp.set(rx, ry + ROCKET_H + 0.6, 0), '#ffe066');
        sfx('bump');
      }
      if (s.assist && s.attempts === this.cfg.assistAfter) toast('Boltzy turned on the Auto-Lander!', 'wrench', 2600);
      this.dustRing(rx, 12, 3.5, 0.9);
      if (!this.comfort) this.shakeT = 0.3;
    }
    if (s.last === 'none' || s.y < this.cfg.groundY - 30) this.lastMsg = s.y < this.cfg.groundY - 30 ? '' : this.lastMsg;
    if (landed) this.onLanded();
    if (this.doneT >= 0) {
      this.doneT += dt;
      if (this.doneT > 2.2) {
        this.doneT = -100;
        landingHooks.onDone(this.p.body, s.perfect);
      }
    }
    // Engine sparks and dust blown off the ground.
    if (s.thrusting && !s.done) {
      for (let i = 0; i < Math.min(3, this.nozzles.length); i++) {
        this.tmp.copy(this.nozzles[i]).applyMatrix4(this.rocket.group.matrixWorld);
        this.sparks.spawn(this.tmp.x, this.tmp.y - 0.1, this.tmp.z, (Math.random() - 0.5) * 1.2, -5.5 - Math.random() * 2, (Math.random() - 0.5) * 1.2, 0.3, 0.26, this.flameColor);
      }
      if (ry < 3.4 && Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2.5 + Math.random() * 3;
        this.puffs.spawn(rx + Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6, Math.cos(a) * sp, 0.4 + Math.random() * 0.5, Math.sin(a) * sp, 0.9, 0.6, this.th.surface, 0.7, 2.5);
      }
    }
    this.sparks.update(dt);
    this.puffs.update(dt);
    // Speed gauge: how fast you are falling compared to the safe speed; height meter.
    const frac = Math.max(0, Math.min(1, s.vy / (this.cfg.safeSpeed * 2)));
    this.gaugeFill.style.height = `${Math.round(frac * 100)}%`;
    this.gauge.classList.toggle('safe', s.vy <= this.cfg.safeSpeed);
    const alt = clamp((this.cfg.groundY - s.y) / (this.cfg.groundY - 40), 0, 1);
    this.altMark.style.top = `${Math.round((1 - alt) * 100)}%`;
  }

  /** A ring of dust rolling out over the ground. */
  private dustRing(x: number, n: number, speed: number, size: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = speed * (0.7 + Math.random() * 0.5);
      this.puffs.spawn(x + Math.cos(a) * 0.5, 0.2, Math.sin(a) * 0.5, Math.cos(a) * sp, 0.5 + Math.random() * 0.6, Math.sin(a) * sp, 1.1, size, this.th.surface, 0.75, 2.2);
    }
  }

  private onLanded(): void {
    const s = this.state;
    const st = S.state;
    st.bump('landings');
    if (s.perfect) st.bump('perfectLandings');
    st.emit({ type: 'land', body: this.p.body, perfect: s.perfect });
    const rx = this.wx(s.x);
    this.floats.show(s.perfect ? 'Perfect landing!' : 'Touchdown!', this.tmp.set(rx, ROCKET_H + 1.2, 0), s.perfect ? '#ffe066' : '#8cff66', true);
    this.sparks.burst(rx, ROCKET_H * 0.6, 0, s.perfect ? 50 : 30, 7, 1, 0.3, '#ffe066');
    this.sparks.burst(rx, ROCKET_H * 0.6, 0, s.perfect ? 40 : 18, 6, 1.2, 0.26, '#ff7ad9');
    this.dustRing(rx, 22, 4.5, 1.1);
    sfx(s.perfect ? 'perfect' : 'landed');
    this.doneT = 0;
  }

  // ------------------------------------------------------------------ render

  private placeRocket(x: number, y: number): void {
    const s = ROCKET_H / this.rocketH;
    const ext = this.rocket.extent;
    this.rocketPos.set(this.wx(x), this.wy(y) + 0.18 - ext.bottom * s, 0);
    this.rocket.group.position.copy(this.rocketPos);
  }

  /**
   * Where the camera wants to be: a low 3/4 view framing the rocket and the pad together, coming
   * down and closer as you descend. During the swoop (`swoop` 1 → 0) it chases the rocket instead.
   */
  private frameCamera(swoop: number): void {
    const s = this.state;
    const rx = this.wx(s.x);
    const alt = Math.max(0, this.wy(s.y));
    const padX = this.wx(this.cfg.padX);
    const k = clamp(alt / 8, 0, 1);
    const sep = Math.abs(rx - padX);
    const lookX = lerp(rx, padX, 0.45);
    // Keep the whole rocket and the pad in view (with room under the HUD).
    const span = alt + ROCKET_H + 3;
    this.goalLook.set(lookX, span / 2 + 0.25, 0);
    const dist = Math.max(span * 1.78, (sep + 5) / 1.15, 9.5);
    const elev = (6 + k * 12) * (Math.PI / 180);
    const az = 0.3;
    this.goalPos.set(lookX + Math.sin(az) * Math.cos(elev) * dist, this.goalLook.y + Math.sin(elev) * dist, Math.cos(az) * Math.cos(elev) * dist);
    if (swoop > 0) {
      // Chase the rocket down out of the sky, looking past it at the ground below.
      const w = 1 - (1 - swoop) * (1 - swoop);
      const r = this.rocketPos;
      this.tmp.set(r.x - 3.5, r.y + 1.6, r.z + 8.5);
      this.goalPos.lerp(this.tmp, w);
      this.tmp.set(r.x + 1.2, r.y - 1.2, 0);
      this.goalLook.lerp(this.tmp, w);
    }
  }

  override render(alpha: number): void {
    if (!this.ready) return;
    const time = this.time;
    const dt = clamp(time - this.lastTime, 0, 0.1) || 1 / 60;
    this.lastTime = time;
    const s = this.state;
    const swooping = !this.swoopDone;
    const u = swooping ? 1 - Math.min(1, this.swoopT / this.swoopLen) : 0;
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    // During the swoop the rocket glides down from high above into its starting spot.
    const e = u * u * (3 - 2 * u);
    this.placeRocket(x - e * 500, y - e * 1400);
    this.rocket.group.rotation.set(0, -0.3, swooping ? -0.35 * e : -s.tilt);
    this.rocket.update(dt, swooping ? 0.4 : s.thrusting && !s.done ? 1 : 0.02, swooping ? 0.6 : 0);
    this.rocket.group.updateMatrixWorld();
    this.frameCamera(e);
    const k = swooping ? 1 - Math.exp(-9 * dt) : 1 - Math.exp(-5 * dt);
    this.camPos.lerp(this.goalPos, k);
    this.camLook.lerp(this.goalLook, k);
    this.camera.position.copy(this.camPos);
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeT * this.shakeT * 1.2;
      this.camera.position.x += Math.sin(time * 61) * a;
      this.camera.position.y += Math.sin(time * 53 + 1) * a;
    }
    this.camera.lookAt(this.camLook);
    this.camera.updateMatrixWorld();
    // Landing aids.
    const rx = this.rocketPos.x;
    const over = Math.abs(s.x - this.cfg.padX) <= this.cfg.padW / 2;
    const alt = Math.max(0, this.wy(y));
    this.reticle.visible = this.dropLine.visible = !swooping && !s.done;
    this.reticle.position.set(rx, 0.24, 0);
    (this.reticle.material as MeshBasicMaterial).color.set(over ? '#8cff66' : '#ffffff').multiplyScalar(1.8);
    this.reticle.scale.setScalar(1 + Math.min(1.5, alt * 0.08));
    this.dropLine.position.set(rx, alt / 2 + 0.2, 0);
    this.dropLine.scale.y = Math.max(0.01, alt);
    (this.beam.material as MeshBasicMaterial).opacity = s.done ? 0.06 : 0.12 + Math.sin(time * 3) * 0.05;
    this.pad.update(dt, time);
    for (const p of this.props) p.update!(dt, time);
    this.sky.update(time, this.camera);
    this.floats.update(dt, this.camera, this.w, this.hh);
  }
}

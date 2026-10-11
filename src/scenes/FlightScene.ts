import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { clamp, formatRaceTime } from '../core/mathx';
import { BODY_BY_ID, SYSTEM_BY_ID, type SystemId } from '../data/bodies';
import { PART_BY_ID } from '../data/parts';
import { ChaseCam, FloatLabels, GuideTrail, SpeedDust } from '../r3/flight/flightFx';
import { FlightView, toV } from '../r3/flight/flightView';
import { Particles3 } from '../r3/fx/particles';
import { Trail } from '../r3/fx/trail';
import { atmosphereMaterial } from '../r3/materials';
import { RocketModel } from '../r3/models/rocket';
import { Character } from '../r3/models/characters';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SkyStyle, type SpaceSky } from '../r3/space/sky';
import { makeEvents, resetEvents, type FlightEvents } from '../systems/flight';
import {
  forward, landableNear3, makeShip3, scannableNear3, shipSpeed3, stepFlight3, TUNE3,
  raceTune, type Body3, type Ship3, type Steer3, type Tune3,
} from '../systems/flight3d';
import { buildFlight, type FlightExtras } from '../systems/flightWorld';
import type { FlightParams } from '../systems/rocketStats';
import { liftLayout, nearestBase3, type Layout3 } from '../systems/world3d';
import { h, setText } from '../ui/dom';
import { Hud } from '../ui/hud';
import { openPause } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { icon } from '../ui/icons';
import { iconEl } from '../ui/widgets';
import { flightDirector, type FlightDirector, type FlightTarget } from './flightDirector';

export interface FlightSceneParams {
  from: SystemId;
  to: SystemId;
  startBody?: string;
  /** Race course id when flying a time-trial race. */
  course?: string;
}

type Mode = 'fly' | 'tow' | 'leaving';

/** Rocket height in flight units (about the size of the 2D rocket). */
const ROCKET_SIZE = 110;

const LAND_LABELS = new Map<string, string>();
/** "Land on Mars" (cached so the HUD doesn't build a new string every frame). */
function landLabel(id: string): string {
  let l = LAND_LABELS.get(id);
  if (!l) {
    l = id === 'earth' ? 'Land at Academy' : `Land on ${BODY_BY_ID[id]?.name ?? id}`;
    LAND_LABELS.set(id, l);
  }
  return l;
}

const UP = new Vector3(0, 1, 0);

/** 3D space flight: a chase camera behind your rocket, which flies forward by itself while you steer. */
export class FlightScene extends Scene3D {
  private layout: Layout3;
  private ship: Ship3;
  private params: FlightParams;
  private tune: Tune3;
  private ev: FlightEvents = makeEvents();
  private diff = '';
  private director: FlightDirector;
  private sky: SpaceSky;
  private view: FlightView;
  private rocket: RocketModel;
  private nozzles: Vector3[] = [];
  private trails: Trail[] = [];
  private sparks: Particles3;
  private puffs: Particles3;
  private chase: ChaseCam;
  private dust: SpeedDust;
  private guide = new GuideTrail();
  private floats: FloatLabels;
  private tuggy = new Character('tuggy');
  private towBeam: Mesh;
  private bubble: Mesh;
  private marker = new Group();
  private scanRing: Mesh;
  private hud: Hud;
  private prompt: HTMLElement;
  private promptText: HTMLElement;
  private promptKey: HTMLElement;
  private edge: HTMLElement;
  private edgeName: HTMLElement;
  private gateLabel: HTMLElement;
  private w = 1280;
  private hh = 720;
  private t = 0;
  private mode: Mode = 'fly';
  private towT = 0;
  private towBase: string | null = null;
  private emptyT = 0;
  private coinsThisFlight = 0;
  private coinBatch = 0;
  private coinBatchT = 0;
  private nearLand: Body3 | null = null;
  private nearScan: Body3 | null = null;
  private scanT = 0;
  private scanned = new Set<string>();
  private arrivedSystems = new Set<string>();
  private nearSent = new Set<string>();
  private courseActive = false;
  private raceTime = 0;
  private raceRunning = false;
  private outsideT = 0;
  private stickerLeft = false;
  private lastPrompt = '';
  private readonly comfort = comfortOn();
  private readonly steer: Steer3 = { x: 0, y: 0, boost: false, boostPressed: false };
  // Scratch (no allocation per frame).
  private readonly sp = new Vector3();
  private readonly fwd = new Vector3();
  private readonly fwd3 = { x: 0, y: 0, h: 0 };
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly basis = new Matrix4();
  private readonly qBank = new Quaternion();
  private readonly ax = new Vector3();
  private readonly az = new Vector3();
  private readonly target3 = new Vector3();
  private readonly tmp3 = new Vector3();

  constructor(private readonly p: FlightSceneParams) {
    super('flight');
    this.music = 'flight';
    this.pausable = true;
    const st = S.state;
    const r3 = S.game.r3;
    const prof = r3.profile;
    this.director = flightDirector(p);
    const extras: FlightExtras = this.director.extras();
    const seed = `${p.from}-${p.to}-${st.data.slot}-${st.data.stats.flights}`;
    const flat = buildFlight({ from: p.from, to: p.to, startBody: p.startBody, seed, tuning: st.tuning, extras });
    this.layout = liftLayout(flat, seed, extras);
    this.params = st.flight;
    this.tune = this.pickTune(st.difficulty);
    this.diff = st.difficulty;
    let sx = this.layout.startX;
    let sy = this.layout.startY;
    let sh = this.layout.startH;
    let yaw = this.layout.startYaw;
    if (this.layout.courseStart) {
      ({ x: sx, y: sy, h: sh, yaw } = this.layout.courseStart);
      this.courseActive = true;
    }
    this.ship = makeShip3(sx, sy, sh, yaw, this.params);
    // Start already gliding forward.
    this.ship.vx = Math.cos(yaw) * this.params.maxSpeed * 0.4;
    this.ship.vy = Math.sin(yaw) * this.params.maxSpeed * 0.4;

    // World.
    this.view = new FlightView(this.layout, r3.renderer, prof);
    const toSys = SYSTEM_BY_ID[p.to];
    const base = toSys.id === 'zephyra' || toSys.id === 'wormhole' ? SKIES.zephyra : SKIES.space;
    const style: SkyStyle = {
      ...base,
      key: `sys_${p.to}`,
      nebula: toSys.nebula.length >= 2 ? [toSys.nebula[0], toSys.nebula[1], toSys.nebula[2] ?? base.nebula[2]] : base.nebula,
      sun: base.sun ? { ...base.sun, dir: this.view.sunDir.clone() } : null,
    };
    this.sky = addSpaceSky(this.world, style);
    this.world.environmentIntensity = 0.6;
    const sun = new DirectionalLight('#fff4e2', 2.6);
    sun.position.copy(this.view.sunDir).multiplyScalar(1000);
    this.world.add(sun, new HemisphereLight('#9fb0ff', '#2a1850', 0.55), this.view.group);

    // Rocket.
    this.rocket = new RocketModel(st.data.loadout, { glossy: prof.tier === 'high' });
    const e = this.rocket.extent;
    this.rocket.group.scale.setScalar(ROCKET_SIZE / (e.top - e.bottom));
    this.nozzles = this.rocket.nozzles();
    const eng = PART_BY_ID[st.data.loadout.engine];
    const [outer, inner] = eng?.flame ?? ['#ff9f43', '#fff36b'];
    for (let i = 0; i < Math.min(3, this.nozzles.length); i++) {
      const tr = new Trail(22, 5, inner, outer, 12);
      tr.power = 0.6;
      this.trails.push(tr);
      this.world.add(tr.mesh);
    }
    this.world.add(this.rocket.group);
    this.bubble = new Mesh(new SphereGeometry(ROCKET_SIZE * 0.62, 32, 20), atmosphereMaterial('#4dd4ff', { intensity: 2.2, power: 2.2, sunDir: [0, 1, 0] }));
    this.bubble.visible = false;
    this.world.add(this.bubble);

    // Effects.
    this.sparks = new Particles3(Math.min(600, prof.particles), 'spark');
    this.sparks.drag = 1.6;
    this.puffs = new Particles3(Math.min(200, Math.round(prof.particles / 3)), 'puff', false);
    this.puffs.drag = 1.2;
    this.dust = new SpeedDust(Math.round(prof.dust * (this.comfort ? 0.35 : 1)));
    this.world.add(this.sparks.points, this.puffs.points, this.dust.lines, this.guide.mesh);
    this.camera.near = 4;
    this.camera.far = 40000;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.chase = new ChaseCam(this.camera, 60);
    this.chase.comfort = this.comfort;

    // Tuggy and the tow beam.
    this.tuggy.group.scale.setScalar(120);
    this.tuggy.setAnim('hover');
    this.tuggy.group.visible = false;
    this.towBeam = new Mesh(new CylinderGeometry(1, 1, 1, 10, 1, true), new MeshBasicMaterial({ color: new Color('#7dffe9').multiplyScalar(2), transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }));
    this.towBeam.visible = false;
    this.world.add(this.tuggy.group, this.towBeam);

    // Objective marker: a bobbing arrow above the target, and a scan ring.
    const mMat = new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(2) });
    const chevron = new Mesh(new ConeGeometry(16, 34, 4), mMat);
    chevron.rotation.x = Math.PI;
    const ring = new Mesh(new TorusGeometry(26, 3, 8, 32), mMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -30;
    this.marker.add(chevron, ring);
    this.marker.visible = false;
    this.scanRing = new Mesh(new TorusGeometry(1, 0.03, 8, 64), new MeshBasicMaterial({ color: new Color('#4dd4ff').multiplyScalar(2) }));
    this.scanRing.visible = false;
    this.world.add(this.marker, this.scanRing);

    // DOM HUD.
    this.hud = new Hud({ fuel: true, shield: true, onPause: () => this.openPause() });
    this.promptText = h('span', null, '');
    this.promptKey = h('span', { class: 'key' }, 'E');
    this.prompt = h('div', { class: 'prompt hit', 'data-testid': 'flight-prompt', onclick: () => this.doAction() }, iconEl('land'), this.promptText, this.promptKey);
    this.prompt.style.display = 'none';
    this.edge = h('div', { class: 'edge-arrow', 'data-testid': 'edge-arrow' });
    this.edge.innerHTML = icon('next');
    this.edgeName = h('div', { class: 'edge-name' });
    this.edge.append(this.edgeName);
    this.edge.style.display = 'none';
    this.gateLabel = h('div', { class: 'gate-label' });
    this.gateLabel.style.display = 'none';
    this.floats = new FloatLabels(this.ui);
    this.ui.append(this.hud.el, this.prompt, this.edge, this.gateLabel);
    this.hud.setCoins(st.data.coins);
    const stk = this.layout.sticker;
    this.stickerLeft = !!stk && !st.data.stickers.includes(stk.id);
    this.view.stickerVisible(this.stickerLeft);
    this.placeRocket(1);
    forward(this.ship, this.fwd3);
    this.chase.snap(this.sp, this.fwd.set(this.fwd3.x, this.fwd3.h, this.fwd3.y));
  }

  /** Races (and training rings) use nimbler racing handling. */
  private pickTune(diff: string): Tune3 {
    const base = TUNE3[diff === 'easy' ? 'easy' : 'normal'];
    return this.layout.world.gates.length ? raceTune(base) : base;
  }

  override enter(): void {
    S.touch.setMode('flight');
    S.state.bump('flights');
    S.state.emit({ type: 'launch', from: this.p.startBody ?? this.p.from });
    this.director.onStart(this);
    this.checkArrival();
    tip('flight_steer');
    if (this.isRacing()) tip('race');
  }

  override exit(): void {
    S.touch.setMode('none');
    this.floats.clear();
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.w = w;
    this.hh = hh;
    const px = window.innerHeight * S.game.r3.pixelRatio;
    this.sparks.setScreen(px);
    this.puffs.setScreen(px);
    this.sky.setPixelRatio(S.game.r3.pixelRatio);
  }

  override back(): boolean {
    this.openPause();
    return true;
  }

  openPause(): void {
    openPause('flight');
  }

  // ------------------------------------------------------------------ logic

  override update(dt: number): void {
    this.t += dt;
    const input = S.input.state;
    const ship = this.ship;
    const world = this.layout.world;
    resetEvents(this.ev);

    // Difficulty can change any time from Settings: refresh the rocket's numbers.
    if (S.state.difficulty !== this.diff) {
      const fuelFrac = ship.fuel / this.params.maxFuel;
      const shieldFrac = ship.shield / this.params.maxShield;
      this.params = S.state.flight;
      this.diff = S.state.difficulty;
      this.tune = this.pickTune(this.diff);
      ship.fuel = fuelFrac * this.params.maxFuel;
      ship.shield = shieldFrac * this.params.maxShield;
    }
    const target = this.director.target(this);
    if (target) {
      world.targetX = target.x;
      world.targetY = target.y;
      world.targetH = target.h ?? 0;
      world.targetR = target.r;
      world.targetOrbit = (target as Body3).landable !== undefined && !this.isRacing();
      world.hasTarget = true;
    } else world.hasTarget = false;

    if (this.mode === 'fly') {
      this.steer.x = input.x;
      this.steer.y = input.y;
      this.steer.boost = input.boost;
      this.steer.boostPressed = input.boostPressed;
      stepFlight3(ship, world, this.steer, this.params, this.tune, dt, this.ev, S.settings.flipY);
      this.handleEvents();
      this.handleNearby(dt, input.action, input.actionPressed);
      this.checkArrival();
      this.checkNear();
      this.checkRescue(dt);
      if (ship.outside) {
        this.outsideT += dt;
        if (this.outsideT > 0.6 && this.outsideT - dt <= 0.6) toast('That is the edge of this part of space. Turning back!', 'rocket', 2200);
      } else this.outsideT = 0;
      if (this.raceRunning) {
        this.raceTime += dt;
        if (this.isRacing()) this.hud.setExtra(formatRaceTime(this.raceTime));
      }
    } else if (this.mode === 'tow') {
      this.updateTow(dt);
    }
    this.director.update(this, dt);

    this.sparks.update(dt);
    this.puffs.update(dt);
    this.coinBatchT -= dt;
    if (this.coinBatch > 0 && this.coinBatchT <= 0) {
      S.state.emit({ type: 'coins', amount: this.coinBatch, system: this.currentSystem() });
      this.coinBatch = 0;
    }
    this.hud.setFuel(ship.fuel / this.params.maxFuel);
    if (this.t > 8) tip('flight_boost');
    if (ship.fuel < this.params.maxFuel * 0.35) tip('flight_fuel');
    this.hud.setShield(ship.shield / this.params.maxShield);
    this.hud.setCoins(S.state.data.coins);
  }

  private at(x: number, y: number, hh: number): Vector3 {
    return toV(x, y, hh, this.tmp);
  }

  private burst(x: number, y: number, hh: number, n: number, speed: number, life: number, size: number, color: string): void {
    const k = this.comfort ? 0.6 : 1;
    this.sparks.burst(x, hh, y, Math.round(n * k), speed, life, size, color);
  }

  private handleEvents(): void {
    const ev = this.ev;
    const ship = this.ship;
    const st = S.state;
    if (ev.coins > 0) {
      st.addCoins(ev.coins);
      st.bump('coinsCollected', ev.coins);
      this.coinsThisFlight += ev.coins;
      this.coinBatch += ev.coins;
      this.coinBatchT = 0.4;
      this.burst(ship.x, ship.y, ship.h, 8, 160, 0.45, 9, '#ffe066');
      sfx('coin');
    }
    if (ev.fuel > 0) {
      st.bump('fuelCells');
      st.emit({ type: 'fuel' });
      this.floats.show('Fuel!', this.at(ship.x, ship.y, ship.h + 70), '#8cff66');
      this.burst(ship.x, ship.y, ship.h, 16, 200, 0.6, 10, '#8cff66');
      sfx('fuel');
    }
    if (ev.bumped) {
      tip('flight_bump');
      st.bump('bumps');
      st.emit({ type: 'bump' });
      this.chase.kick(0.7);
      this.floats.show('Bonk!', this.at(ship.x, ship.y, ship.h + 80), '#ff9aa8');
      this.puffs.burst(ship.x, ship.h, ship.y, 10, 90, 0.7, 30, '#c9d2ee');
      sfx('bump');
    }
    if (ev.cometRide) {
      tip('flight_comet');
      st.bump('cometRides');
      st.emit({ type: 'comet' });
      this.floats.show('Comet ride!', this.at(ship.x, ship.y, ship.h + 80), '#bff6ff', true);
      sfx('whoosh');
    }
    if (ev.slingshot) {
      st.bump('slingshots');
      st.emit({ type: 'slingshot', body: ev.slingshot });
      this.floats.show('Slingshot!', this.at(ship.x, ship.y, ship.h + 90), '#ffe066', true);
      this.burst(ship.x, ship.y, ship.h, 24, 260, 0.8, 11, '#ffe066');
      sfx('slingshot');
    }
    if (ev.boosted) {
      st.bump('boosts');
      st.emit({ type: 'boost' });
      sfx('boost');
    }
    if (ev.gate >= 0) {
      const g = this.layout.world.gates[ev.gate];
      this.burst(g.x, g.y, g.h, 22, 240, 0.7, 12, '#ffffff');
      const total = this.layout.world.gates.length;
      if (ev.gate === 0 && this.courseActive) this.raceRunning = true;
      this.floats.show(`${ev.gate + 1} / ${total}`, this.at(g.x, g.y, g.h + g.r + 30), '#ffffff', true);
      sfx('gate');
      if (ev.gate === total - 1) this.director.onCourseDone(this, this.raceTime);
    }
    if (ev.haul) {
      st.data.cargo[ev.haul] = (st.data.cargo[ev.haul] ?? 0) + 1;
      st.emit({ type: 'haul', item: ev.haul, system: this.currentSystem() });
      this.floats.show('Got it!', this.at(ship.x, ship.y, ship.h + 70), '#bff6ff');
      this.burst(ship.x, ship.y, ship.h, 12, 160, 0.6, 9, '#bff6ff');
      sfx('collect');
    }
    if (ev.glimmer > 0) {
      st.emit({ type: 'glimmer', system: this.currentSystem() });
      this.floats.show('Glimmer!', this.at(ship.x, ship.y, ship.h + 70), '#fff7b3');
      this.burst(ship.x, ship.y, ship.h, 14, 160, 0.6, 9, '#fff7b3');
      sfx('collect');
    }
    // Hidden space sticker.
    const stk = this.layout.sticker;
    if (stk && this.stickerLeft && Math.hypot(ship.x - stk.x, ship.y - stk.y, ship.h - stk.h) < 80) {
      this.stickerLeft = false;
      this.view.stickerVisible(false);
      st.emit({ type: 'sticker', id: stk.id });
      this.burst(stk.x, stk.y, stk.h, 30, 220, 0.9, 12, '#ff7ad9');
      sfx('sticker');
    }
  }


  private handleNearby(dt: number, actionHeld: boolean, actionPressed: boolean): void {
    const ship = this.ship;
    const world = this.layout.world;
    this.nearLand = landableNear3(ship, world);
    const scanTarget = scannableNear3(ship, world);
    this.nearScan = scanTarget && this.director.canScan(scanTarget.id) && !this.scanned.has(scanTarget.id) ? scanTarget : null;
    let label: string | null = null;
    let ico = 'land';
    if (this.nearScan) {
      label = 'Scan';
      ico = 'scan';
      const auto = S.state.difficulty === 'easy';
      if (actionHeld || auto) {
        this.scanT += dt;
        if (Math.floor(this.scanT * 6) !== Math.floor((this.scanT - dt) * 6)) sfx('scanTick');
        if (this.scanT >= S.state.tuning.scanTime) {
          const sc = this.nearScan;
          this.scanned.add(sc.id);
          this.scanT = 0;
          S.state.bump('scans');
          S.state.emit({ type: 'scan', target: sc.id });
          this.floats.show('Scanned!', this.at(sc.x, sc.y, sc.h + sc.r + 50), '#4dd4ff', true);
          this.burst(sc.x, sc.y, sc.h, 24, 220, 0.8, 11, '#4dd4ff');
          sfx('scanDone');
          this.director.onScan(this, sc.id);
        }
      } else this.scanT = Math.max(0, this.scanT - dt);
    } else {
      this.scanT = 0;
      if (this.nearLand) {
        label = landLabel(this.nearLand.id);
        if (actionPressed) this.doAction();
      }
    }
    S.touch.setAction(label ? (label.startsWith('Land') ? 'Land' : label) : null, ico);
    if (this.nearScan) tip('flight_scan');
    else if (this.nearLand) tip('flight_land');
    const key = label ?? '';
    if (key !== this.lastPrompt) {
      this.lastPrompt = key;
      if (label) {
        setText(this.promptText, label);
        setText(this.promptKey, this.nearScan ? 'Hold E' : 'E');
        this.prompt.style.display = '';
      } else this.prompt.style.display = 'none';
    }
    this.prompt.style.setProperty('--p', this.nearScan ? String(clamp(this.scanT / S.state.tuning.scanTime, 0, 1)) : '0');
  }

  doAction(): void {
    if (this.mode !== 'fly') return;
    if (this.nearLand) {
      const id = this.nearLand.id;
      this.mode = 'leaving';
      sfx('click');
      this.director.onLand(this, id);
    }
  }

  private checkArrival(): void {
    for (const sp of this.layout.systems) {
      if (this.arrivedSystems.has(sp.id)) continue;
      if (Math.hypot(this.ship.x - sp.cx, this.ship.y - sp.cy) < 2000) {
        this.arrivedSystems.add(sp.id);
        if (this.t > 0.5 || sp.id !== this.p.from) {
          S.state.addUnique(S.state.data.visitedSystems, sp.id);
          S.state.emit({ type: 'arrive', system: sp.id });
          if (sp.id !== this.p.from) {
            toast(`Welcome to ${SYSTEM_BY_ID[sp.id].name}!`, 'planet');
            sfx('arrive');
          }
        }
      }
    }
  }

  private checkNear(): void {
    const ship = this.ship;
    // After the story trip, flying into the wormhole always takes you to Zephyra.
    const worm = this.view.worm?.body;
    if (worm && this.mode === 'fly' && S.state.flag('wormholeDone') && Math.hypot(ship.x - worm.x, ship.y - worm.y, ship.h - worm.h) < worm.r + 70) {
      this.mode = 'leaving';
      void S.game.go('cutscene', { id: 'wormhole' });
      return;
    }
    for (const b of this.layout.world.bodies) {
      if (this.nearSent.has(b.id) || !BODY_BY_ID[b.id]) continue;
      if (Math.hypot(ship.x - b.x, ship.y - b.y, ship.h - b.h) - b.r < 300) {
        this.nearSent.add(b.id);
        S.state.emit({ type: 'near', body: b.id });
      }
    }
  }

  isRacing(): boolean {
    return !!this.p.course;
  }

  currentSystem(): string {
    let best = this.layout.systems[0].id as string;
    let bestD = Infinity;
    for (const sp of this.layout.systems) {
      const d = Math.hypot(this.ship.x - sp.cx, this.ship.y - sp.cy);
      if (d < bestD) {
        bestD = d;
        best = sp.id;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ Tuggy the tow-bot

  private checkRescue(dt: number): void {
    const ship = this.ship;
    if (ship.shield <= 0) {
      this.startTow('shield');
      return;
    }
    if (ship.fuel <= 0) {
      this.emptyT += dt;
      if (this.emptyT > 2.5 || (this.emptyT > 1 && shipSpeed3(ship) < 60)) this.startTow('fuel');
    } else this.emptyT = 0;
  }

  private startTow(reason: 'fuel' | 'shield'): void {
    this.mode = 'tow';
    this.towT = 0;
    this.towBase = nearestBase3(this.layout, this.ship.x, this.ship.y, this.ship.h);
    this.tuggy.group.visible = true;
    // Fly in from behind and above the camera.
    this.tuggy.group.position.copy(this.camera.position).add(this.tmp.set(-200, 260, 0));
    this.ship.locked = true;
    S.state.bump('tows');
    S.state.emit({ type: 'tow' });
    toast(reason === 'fuel' ? 'Out of fuel! Tuggy is coming!' : 'Your rocket needs a fix! Tuggy is coming!', 'tow', 3000);
    sfx('tuggy');
  }

  private updateTow(dt: number): void {
    this.towT += dt;
    const ship = this.ship;
    ship.px = ship.x;
    ship.py = ship.y;
    ship.ph = ship.h;
    ship.pyaw = ship.yaw;
    ship.ppitch = ship.pitch;
    ship.pbank = ship.bank;
    const slow = Math.exp(-3 * dt);
    ship.vx *= slow;
    ship.vy *= slow;
    ship.vh *= slow;
    ship.bank *= slow;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.h += ship.vh * dt;
    const hook = this.tmp2.set(ship.x, ship.h + 130, ship.y);
    const tg = this.tuggy.group;
    if (this.towT < 1.6) {
      tg.position.lerp(hook, 1 - Math.exp(-3.2 * dt));
    } else if (this.towT < 2.2) {
      tg.position.copy(hook);
      tg.position.y += Math.sin(this.towT * 12) * 4;
    } else if (this.towT < 3.4) {
      // Pull away toward the base.
      const base = this.towBase ? this.layout.world.bodies.find((b) => b.id === this.towBase) : null;
      const dx = base ? base.x - ship.x : 1;
      const dy = base ? base.y - ship.y : 0;
      const dh = base ? base.h - ship.h : 0;
      const d = Math.hypot(dx, dy, dh) || 1;
      ship.x += (dx / d) * 900 * dt;
      ship.y += (dy / d) * 900 * dt;
      ship.h += (dh / d) * 900 * dt;
      ship.yaw = Math.atan2(dy, dx);
      tg.position.set(ship.x, ship.h + 130, ship.y);
      S.game.curtain.classList.toggle('on', this.towT > 2.9);
    } else {
      this.finishTow();
    }
  }

  private finishTow(): void {
    const ship = this.ship;
    const base = this.towBase ? this.layout.world.bodies.find((b) => b.id === this.towBase) : null;
    S.game.curtain.classList.remove('on');
    this.tuggy.group.visible = false;
    this.towBeam.visible = false;
    if (!base) {
      // No base on this trip: Tuggy takes you all the way home.
      toast('Tuggy towed you home to the Academy!', 'home', 3000);
      this.mode = 'leaving';
      this.director.onTowedHome(this);
      return;
    }
    ship.x = ship.px = base.x + base.r + 180;
    ship.y = ship.py = base.y + 40;
    ship.h = ship.ph = base.h;
    ship.vx = ship.vy = ship.vh = 0;
    ship.yaw = ship.pyaw = 0;
    ship.pitch = ship.ppitch = 0;
    ship.fuel = this.params.maxFuel;
    ship.shield = this.params.maxShield;
    ship.locked = false;
    ship.bumpTime = 2;
    this.mode = 'fly';
    this.emptyT = 0;
    for (const tr of this.trails) tr.clear();
    this.placeRocket(1);
    forward(ship, this.fwd3);
    this.chase.snap(this.sp, this.fwd.set(this.fwd3.x, this.fwd3.h, this.fwd3.y));
    const name = BODY_BY_ID[base.id]?.base ?? BODY_BY_ID[base.id]?.name ?? 'the base';
    toast(`Beep boop! Tuggy brought you to ${name}. All fixed up!`, 'tow', 3600);
    sfx('repair');
  }

  // ------------------------------------------------------------------ render

  /** Rocket transform from the interpolated sim. Leaves the position in `this.sp` and nose in `this.fwd`. */
  private placeRocket(alpha: number): void {
    const s = this.ship;
    const x = s.px + (s.x - s.px) * alpha;
    const y = s.py + (s.y - s.py) * alpha;
    const hh = s.ph + (s.h - s.ph) * alpha;
    let dy = s.yaw - s.pyaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yaw = s.pyaw + dy * alpha;
    const pitch = s.ppitch + (s.pitch - s.ppitch) * alpha;
    const bank = (s.pbank + (s.bank - s.pbank) * alpha) * (this.comfort ? 0.5 : 1);
    toV(x, y, hh, this.sp);
    const cp = Math.cos(pitch);
    this.fwd.set(Math.cos(yaw) * cp, Math.sin(pitch), Math.sin(yaw) * cp);
    // Basis: model +Y = nose (forward), model +Z = top (windows face up so you see them from behind).
    this.az.copy(UP).addScaledVector(this.fwd, -this.fwd.dot(UP)).normalize();
    this.ax.crossVectors(this.fwd, this.az);
    this.basis.makeBasis(this.ax, this.fwd, this.az);
    const g = this.rocket.group;
    g.quaternion.setFromRotationMatrix(this.basis);
    this.qBank.setFromAxisAngle(this.fwd, -bank);
    g.quaternion.premultiply(this.qBank);
    g.position.copy(this.sp);
  }

  override render(alpha: number): void {
    const dt = 1 / 60;
    const time = this.time;
    const ship = this.ship;
    this.placeRocket(this.mode === 'fly' ? alpha : 1);
    const boosting = ship.boostTime > 0;
    this.rocket.update(dt, this.mode === 'fly' ? ship.thrust : 0.15, boosting ? 1 : ship.cometTime > 0 || ship.slingTime > 0 ? 0.5 : 0);
    // Bump flicker and the shield bubble.
    this.rocket.group.visible = !(ship.bumpTime > 0 && Math.floor(time * 14) % 2 === 0 && ship.bumpTime < 1.1);
    this.bubble.visible = ship.bumpTime > 0.7;
    this.bubble.position.copy(this.sp);
    // Engine trails.
    this.rocket.group.updateMatrixWorld();
    for (let i = 0; i < this.trails.length; i++) {
      const tr = this.trails[i];
      // Faint while cruising (the trail points at the camera), bright when boosting or riding a comet.
      const fast = boosting || ship.cometTime > 0 || ship.slingTime > 0;
      tr.power = this.mode === 'fly' ? (fast ? 0.6 : 0.08) : 0.05;
      tr.push(this.tmp.copy(this.nozzles[i]).applyMatrix4(this.rocket.group.matrixWorld));
      tr.update(this.camera);
    }
    // Camera.
    const speed = shipSpeed3(ship);
    this.chase.update(dt, this.sp, this.fwd, speed / this.params.maxSpeed, boosting, time);
    this.sky.update(time);
    this.view.update(time, alpha, this.camera.position);
    this.dust.update(this.camera.position, ship.vx, ship.vh, ship.vy, clamp(speed / this.params.maxSpeed, 0, 1.6) * (this.comfort ? 0.35 : 1));
    // Tuggy and the tow line.
    if (this.tuggy.group.visible) {
      this.tuggy.talk(this.towT < 2.4);
      this.tuggy.update(dt);
      this.tuggy.group.lookAt(this.camera.position.x, this.tuggy.group.position.y, this.camera.position.z);
      if (this.towT > 1.5) {
        const a = this.tuggy.group.position;
        const b = this.sp;
        const len = a.distanceTo(b);
        this.towBeam.visible = true;
        this.towBeam.position.copy(a).add(b).multiplyScalar(0.5);
        this.towBeam.scale.set(2.5, len, 2.5);
        this.towBeam.quaternion.setFromUnitVectors(UP, this.tmp.copy(a).sub(b).normalize());
      }
    }
    this.renderTarget(time);
    this.floats.update(dt, this.camera, this.w, this.hh);
  }

  /** The 3D marker / scan ring on the target, the edge arrow when it is off-screen, and the Easy guide trail. */
  private renderTarget(time: number): void {
    const target: FlightTarget | null = this.mode === 'fly' ? this.director.target(this) : null;
    const scan = this.nearScan;
    if (scan) {
      this.scanRing.visible = true;
      toV(scan.x, scan.y, scan.h, this.scanRing.position);
      this.scanRing.scale.setScalar(scan.r + 60);
      this.scanRing.lookAt(this.camera.position);
      this.scanRing.rotateZ(time);
    } else this.scanRing.visible = false;
    const gates = this.layout.world.gates;
    const nextGate = gates[this.layout.world.nextGate];
    if (nextGate && this.mode === 'fly') {
      const p = this.tmp.set(nextGate.x, nextGate.h + nextGate.r + 40, nextGate.y).project(this.camera);
      if (p.z < 1) {
        this.gateLabel.style.display = '';
        this.gateLabel.textContent = `${this.layout.world.nextGate + 1} / ${gates.length}`;
        this.gateLabel.style.transform = `translate(${((p.x + 1) / 2) * this.w}px, ${((1 - p.y) / 2) * this.hh}px) translate(-50%, -100%)`;
      } else this.gateLabel.style.display = 'none';
    } else this.gateLabel.style.display = 'none';
    if (!target) {
      this.marker.visible = false;
      this.edge.style.display = 'none';
      this.guide.hide();
      return;
    }
    const th = target.h ?? 0;
    toV(target.x, target.y, th, this.target3);
    // Marker above the target, bigger when far away so it is always easy to spot.
    const dist = this.camera.position.distanceTo(this.target3);
    const gateTarget = !!nextGate && this.layout.world.gates.length > 0 && Math.abs(target.x - nextGate.x) < 1 && Math.abs(target.y - nextGate.y) < 1;
    this.marker.visible = !gateTarget;
    if (this.marker.visible) {
      const s = clamp(dist / 900, 1, 9);
      this.marker.scale.setScalar(s);
      this.marker.position.copy(this.target3);
      this.marker.position.y += target.r + 40 * s + Math.sin(time * 4) * 8 * s;
      this.marker.rotation.y = time * 1.5;
    }
    // Edge arrow when the target is off-screen (or behind you).
    this.tmp.copy(this.target3).applyMatrix4(this.camera.matrixWorldInverse);
    const behind = this.tmp.z > 0;
    const p = this.tmp2.copy(this.target3).project(this.camera);
    const onScreen = !behind && Math.abs(p.x) < 0.86 && Math.abs(p.y) < 0.8;
    if (onScreen) this.edge.style.display = 'none';
    else {
      let dx = behind ? -this.tmp.x : p.x;
      let dy = behind ? -this.tmp.y : p.y;
      if (behind && Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = -1;
      const a = Math.atan2(dy, dx);
      const rx = this.w / 2 - 70;
      const ry = this.hh / 2 - 90;
      const tt = Math.min(Math.abs(rx / (Math.cos(a) || 1e-6)), Math.abs(ry / (Math.sin(a) || 1e-6)));
      dx = this.w / 2 + Math.cos(a) * tt;
      dy = this.hh / 2 - Math.sin(a) * tt;
      this.edge.style.display = '';
      this.edge.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      (this.edge.firstElementChild as HTMLElement | null)?.style.setProperty('transform', `rotate(${-a}rad)`);
      const name = (target as Body3).id ? BODY_BY_ID[(target as Body3).id]?.name ?? '' : '';
      if (this.edgeName.textContent !== name) this.edgeName.textContent = name;
    }
    // Easy mode: sparkle path to the objective.
    if (S.state.difficulty === 'easy' && !this.isRacing()) {
      this.tmp.copy(this.sp).addScaledVector(this.fwd, 120);
      this.tmp2.copy(this.target3);
      if (target.r > 0) this.tmp2.addScaledVector(this.tmp3.copy(this.tmp2).sub(this.sp).normalize(), -(target.r + 60));
      this.guide.update(this.tmp, this.fwd, this.tmp2, time);
    } else this.guide.hide();
  }

  // ------------------------------------------------------------------ helpers for the director and tests

  getShip(): Ship3 {
    return this.ship;
  }

  getLayout(): Layout3 {
    return this.layout;
  }

  get coinsCollected(): number {
    return this.coinsThisFlight;
  }

  get raceSeconds(): number {
    return this.raceTime;
  }

  setObjective(text: string, ic?: string): void {
    this.hud.setObjective(text, ic);
  }

  setExtra(text: string): void {
    this.hud.setExtra(text);
  }

  floatText(text: string, color = '#ffe066'): void {
    this.floats.show(text, this.at(this.ship.x, this.ship.y, this.ship.h + 110), color, true);
  }

  celebrate(): void {
    const s = this.ship;
    this.burst(s.x, s.y, s.h, 40, 300, 1, 13, '#ffe066');
    this.burst(s.x, s.y, s.h, 30, 260, 1, 11, '#ff7ad9');
  }

  setMode(m: Mode): void {
    this.mode = m;
  }
}

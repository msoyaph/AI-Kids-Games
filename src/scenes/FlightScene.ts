import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { sfx } from '../audio/sfx';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { clamp, damp, formatRaceTime, lerp, lerpAngle } from '../core/mathx';
import { BODY_BY_ID, SYSTEM_BY_ID, type SystemId } from '../data/bodies';
import { PART_BY_ID } from '../data/parts';
import { FloatTexts, Particles, Shake } from '../gfx/particles';
import { hexNum } from '../gfx/palette';
import { Starfield } from '../gfx/starfield';
import { ensureTex, planetDiscFraction, planetTex, rocketTex, tex } from '../gfx/textures';
import { drawGlyph } from '../gfx/art/glyphs';
import { nozzlePositions, ROCKET_H, ROCKET_W } from '../gfx/art/rocket';
import {
  landableNear, makeEvents, makeShip, resetEvents, scannableNear, shipSpeed, stepFlight,
  type FBody, type FlightEvents, type Ship,
} from '../systems/flight';
import { buildFlight, nearestBase, type FlightExtras, type FlightLayout } from '../systems/flightWorld';
import type { FlightParams } from '../systems/rocketStats';
import { h, setText } from '../ui/dom';
import { Hud } from '../ui/hud';
import { openPause } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { iconEl } from '../ui/widgets';
import { flightDirector, type FlightDirector } from './flightDirector';

export interface FlightSceneParams {
  from: SystemId;
  to: SystemId;
  startBody?: string;
  /** Race course id when flying a time-trial race. */
  course?: string;
}

type Mode = 'fly' | 'tow' | 'leaving';

const SHIP_SCALE = 0.68;

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

export class FlightScene extends Scene {
  private layout: FlightLayout;
  private ship: Ship;
  private params: FlightParams;
  private ev: FlightEvents = makeEvents();
  private diff = '';
  private director: FlightDirector;
  private stars: Starfield;
  private sunGlow = new Sprite(tex('dot'));
  private cam = new Container();
  private bodyLayer = new Container();
  private itemLayer = new Container();
  private rockLayer = new Container();
  private shipLayer = new Container();
  private overlay = new Container();
  private trail = new Particles(220, true);
  private puffs = new Particles(80, false);
  private floats = new FloatTexts(8);
  private shake = new Shake();
  private bodySprites: Sprite[] = [];
  private coinSprites: Sprite[] = [];
  private fuelSprites: Sprite[] = [];
  private rockSprites: Sprite[] = [];
  private cometHeads: Sprite[] = [];
  private cometTails: Sprite[] = [];
  private gateSprites: Sprite[] = [];
  private haulSprites: Sprite[] = [];
  private glimmerSprites: Sprite[] = [];
  private stickerSprite: Sprite | null = null;
  private wormhole: Sprite | null = null;
  private wormBody: FBody | null = null;
  private rocket = new Container();
  private rocketBody: Sprite;
  private flames: Sprite[] = [];
  private nozzles: Array<[number, number]>;
  private bubble = new Sprite(tex('dot'));
  private tuggy = new Sprite(tex('tuggy'));
  private towLine = new Graphics();
  private arrow = new Sprite(tex('arrow'));
  private marker = new Sprite(tex('marker'));
  private scanRing = new Sprite(tex('scanRing'));
  private scanArc = new Graphics();
  private hud: Hud;
  private prompt: HTMLElement;
  private promptText: HTMLElement;
  private promptKey: HTMLElement;
  private camX = 0;
  private camY = 0;
  private zoom = 0.72;
  private baseZoom = 0.72;
  private w = 1280;
  private h = 720;
  private t = 0;
  private mode: Mode = 'fly';
  private towT = 0;
  private towBase: string | null = null;
  private emptyT = 0;
  private coinsThisFlight = 0;
  private coinBatch = 0;
  private coinBatchT = 0;
  private nearLand: FBody | null = null;
  private nearScan: FBody | null = null;
  private scanT = 0;
  private scanned = new Set<string>();
  private arrivedSystems = new Set<string>();
  private nearSent = new Set<string>();
  private blinkT = 0;
  private blinkOn = false;
  private sunScreenX = -200;
  private courseActive = false;
  private raceTime = 0;
  private raceRunning = false;

  constructor(private readonly p: FlightSceneParams) {
    super('flight');
    this.music = 'flight';
    this.pausable = true;
    const st = S.state;
    this.director = flightDirector(p);
    const extras: FlightExtras = this.director.extras();
    this.layout = buildFlight({
      from: p.from,
      to: p.to,
      startBody: p.startBody,
      seed: `${p.from}-${p.to}-${st.data.slot}-${st.data.stats.flights}`,
      tuning: st.tuning,
      extras,
    });
    this.params = st.flight;
    this.diff = st.difficulty;
    let sx = this.layout.startX;
    let sy = this.layout.startY;
    if (this.layout.courseStart) {
      sx = this.layout.courseStart.x;
      sy = this.layout.courseStart.y;
      this.courseActive = true;
    }
    this.ship = makeShip(sx, sy, this.params);
    this.ship.angle = this.ship.pangle = 0;
    this.camX = sx;
    this.camY = sy;

    const toSys = SYSTEM_BY_ID[p.to];
    this.stars = new Starfield(toSys.nebula, `sys_${p.to}`);
    this.sunGlow.anchor.set(0.5);
    this.sunGlow.blendMode = 'add';
    this.sunGlow.tint = 0xffc94d;
    this.root.addChild(this.stars, this.sunGlow, this.cam, this.overlay);
    this.cam.addChild(this.bodyLayer, this.itemLayer, this.rockLayer, this.puffs, this.trail, this.shipLayer, this.floats);

    this.buildWorldSprites();

    // Rocket.
    const lo = st.data.loadout;
    this.rocketBody = new Sprite(rocketTex(lo));
    this.rocketBody.anchor.set(0.5);
    this.nozzles = nozzlePositions(lo);
    const flameTex = tex(`flame_${PART_BY_ID[lo.engine]?.style ?? 'single'}`);
    for (let i = 0; i < this.nozzles.length; i++) {
      const f = new Sprite(flameTex);
      f.anchor.set(0.5, 0);
      f.position.set(this.nozzles[i][0] - ROCKET_W / 2, this.nozzles[i][1] - ROCKET_H / 2 - 4);
      this.flames.push(f);
      this.rocket.addChild(f);
    }
    this.rocket.addChild(this.rocketBody);
    this.rocket.scale.set(SHIP_SCALE);
    this.bubble.anchor.set(0.5);
    this.bubble.tint = 0x4dd4ff;
    this.bubble.blendMode = 'add';
    this.bubble.visible = false;
    this.tuggy.visible = false;
    this.tuggy.scale.set(0.8);
    this.shipLayer.addChild(this.towLine, this.bubble, this.rocket, this.tuggy);

    this.scanRing.anchor.set(0.5);
    this.scanRing.visible = false;
    this.cam.addChild(this.scanRing, this.scanArc);
    this.arrow.anchor.set(0.5);
    this.marker.anchor.set(0.5, 1);
    this.overlay.addChild(this.arrow);
    this.cam.addChild(this.marker);

    // DOM HUD.
    this.hud = new Hud({ fuel: true, shield: true, onPause: () => this.openPause() });
    this.promptText = h('span', null, '');
    this.promptKey = h('span', { class: 'key' }, 'E');
    this.prompt = h('div', { class: 'prompt hit', 'data-testid': 'flight-prompt', onclick: () => this.doAction() }, iconEl('land'), this.promptText, this.promptKey);
    this.prompt.style.display = 'none';
    this.ui.append(this.hud.el, this.prompt);
    this.hud.setCoins(st.data.coins);
  }

  private buildWorldSprites(): void {
    const w = this.layout.world;
    for (const b of w.bodies) {
      let s: Sprite;
      if (b.id === 'wormhole') {
        s = new Sprite(ensureTex('map_wormhole', 140, 140, (c, w) => drawGlyph(c, 'wormhole', w / 2, w / 2, w * 0.45)));
        s.anchor.set(0.5);
        s.scale.set((b.r * 2.2) / 140);
        this.wormhole = s;
        this.wormBody = b;
      } else if (BODY_BY_ID[b.id]) {
        const t = planetTex(b.id);
        s = new Sprite(t);
        s.anchor.set(0.5);
        s.scale.set(b.r / (t.width * planetDiscFraction(b.id)));
      } else {
        // Mission objects (satellites, beeping rocks...).
        const kind = b.id.split(':')[0];
        s = new Sprite(tex(kind === 'sat' ? 'satellite' : kind === 'beep' ? 'asteroid2' : 'asteroid3'));
        s.anchor.set(0.5);
        s.scale.set(kind === 'sat' ? 0.9 : 0.75);
      }
      s.position.set(b.x, b.y);
      this.bodySprites.push(s);
      this.bodyLayer.addChild(s);
    }
    for (const g of w.gates) {
      const s = new Sprite(tex('gate'));
      s.anchor.set(0.5);
      s.scale.set((g.r * 2) / 140);
      s.position.set(g.x, g.y);
      this.gateSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const c of w.comets) {
      const tail = new Sprite(tex('cometTail'));
      tail.anchor.set(0, 0.5);
      tail.blendMode = 'add';
      const head = new Sprite(tex('cometHead'));
      head.anchor.set(0.5);
      this.cometTails.push(tail);
      this.cometHeads.push(head);
      this.itemLayer.addChild(tail, head);
      void c;
    }
    const coinTex = tex('coin');
    for (const c of w.coins) {
      const s = new Sprite(coinTex);
      s.anchor.set(0.5);
      s.position.set(c.x, c.y);
      this.coinSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const f of w.fuels) {
      const s = new Sprite(tex('fuel'));
      s.anchor.set(0.5);
      s.position.set(f.x, f.y);
      this.fuelSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const hItem of w.hauls) {
      const s = new Sprite(tex(hItem.kind === 'ice' ? 'shieldOrb' : 'sample'));
      s.anchor.set(0.5);
      s.position.set(hItem.x, hItem.y);
      this.haulSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const g of w.glimmers) {
      const s = new Sprite(tex('glimmer'));
      s.anchor.set(0.5);
      s.position.set(g.x, g.y);
      this.glimmerSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const a of w.asteroids) {
      const s = new Sprite(tex(`asteroid${a.kind}`));
      s.anchor.set(0.5);
      s.scale.set((a.r * 2.3) / 100);
      this.rockSprites.push(s);
      this.rockLayer.addChild(s);
    }
    const st = this.layout.sticker;
    if (st && !S.state.data.stickers.includes(st.id)) {
      this.stickerSprite = new Sprite(tex('starBig'));
      this.stickerSprite.anchor.set(0.5);
      this.stickerSprite.position.set(st.x, st.y);
      this.stickerSprite.scale.set(0.7);
      this.itemLayer.addChild(this.stickerSprite);
    }
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
  }

  override resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.stars.resize(w, h);
    this.baseZoom = S.game.metrics.scale < 0.75 ? 0.84 : 0.72;
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
      ship.fuel = fuelFrac * this.params.maxFuel;
      ship.shield = shieldFrac * this.params.maxShield;
    }
    const target = this.director.target(this);
    if (target) {
      world.targetX = target.x;
      world.targetY = target.y;
      world.hasTarget = true;
    } else world.hasTarget = false;

    if (this.mode === 'fly') {
      stepFlight(ship, world, input, this.params, dt, this.ev);
      this.handleEvents();
      this.handleNearby(dt, input.action, input.actionPressed);
      this.checkArrival();
      this.checkNear();
      this.checkRescue(dt);
      if (this.raceRunning) {
        this.raceTime += dt;
        if (this.isRacing()) this.hud.setExtra(formatRaceTime(this.raceTime));
      }
    } else if (this.mode === 'tow') {
      this.updateTow(dt);
      ship.px = ship.x;
      ship.py = ship.y;
      ship.pangle = ship.angle;
    }
    this.director.update(this, dt);

    // Effects.
    this.trail.update(dt);
    this.puffs.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.emitTrail(dt);
    this.coinBatchT -= dt;
    if (this.coinBatch > 0 && this.coinBatchT <= 0) {
      S.state.emit({ type: 'coins', amount: this.coinBatch, system: this.currentSystem() });
      this.coinBatch = 0;
    }
    this.blinkT += dt;
    if (this.blinkT > 0.5) {
      this.blinkT = 0;
      this.blinkOn = !this.blinkOn;
      this.rocketBody.texture = rocketTex(S.state.data.loadout, this.blinkOn);
    }
    this.hud.setFuel(ship.fuel / this.params.maxFuel);
    if (this.t > 8) tip('flight_boost');
    if (ship.fuel < this.params.maxFuel * 0.35) tip('flight_fuel');
    this.hud.setShield(ship.shield / this.params.maxShield);
    this.hud.setCoins(S.state.data.coins);
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
      this.trail.burst(tex('spark'), ship.x, ship.y, 6, 260, 0.4, 0.6, '#ffe066');
      sfx('coin');
    }
    if (ev.fuel > 0) {
      st.bump('fuelCells');
      st.emit({ type: 'fuel' });
      this.floats.show('Fuel!', ship.x, ship.y - 60, '#8cff66');
      this.trail.burst(tex('spark'), ship.x, ship.y, 14, 300, 0.6, 0.7, '#8cff66');
      sfx('fuel');
    }
    if (ev.bumped) {
      tip('flight_bump');
      st.bump('bumps');
      st.emit({ type: 'bump' });
      this.shake.kick(16);
      this.floats.show('Bonk!', ship.x, ship.y - 70, '#ff9aa8');
      this.puffs.burst(tex('puff'), ship.x, ship.y, 10, 180, 0.6, 0.8, '#c9d2ee');
      sfx('bump');
    }
    if (ev.cometRide) {
      tip('flight_comet');
      st.bump('cometRides');
      st.emit({ type: 'comet' });
      this.floats.show('Comet ride!', ship.x, ship.y - 70, '#bff6ff');
      sfx('whoosh');
    }
    if (ev.slingshot) {
      st.bump('slingshots');
      st.emit({ type: 'slingshot', body: ev.slingshot });
      this.floats.show('Slingshot!', ship.x, ship.y - 70, '#ffe066', 48);
      this.trail.burst(tex('spark'), ship.x, ship.y, 20, 380, 0.7, 0.8, '#ffe066');
      sfx('slingshot');
    }
    if (ev.boosted) {
      st.bump('boosts');
      st.emit({ type: 'boost' });
      sfx('boost');
    }
    if (ev.gate >= 0) {
      const g = this.layout.world.gates[ev.gate];
      this.trail.burst(tex('spark'), g.x, g.y, 18, 320, 0.6, 0.8, '#ffffff');
      const total = this.layout.world.gates.length;
      if (ev.gate === 0 && this.courseActive) this.raceRunning = true;
      this.floats.show(`${ev.gate + 1} / ${total}`, g.x, g.y - g.r - 20, '#ffffff');
      sfx('gate');
      if (ev.gate === total - 1) this.director.onCourseDone(this, this.raceTime);
    }
    if (ev.haul) {
      st.data.cargo[ev.haul] = (st.data.cargo[ev.haul] ?? 0) + 1;
      st.emit({ type: 'haul', item: ev.haul, system: this.currentSystem() });
      this.floats.show('Got it!', ship.x, ship.y - 60, '#bff6ff');
      sfx('collect');
    }
    if (ev.glimmer > 0) {
      st.emit({ type: 'glimmer', system: this.currentSystem() });
      this.floats.show('Glimmer!', ship.x, ship.y - 60, '#fff7b3');
      this.trail.burst(tex('spark'), ship.x, ship.y, 12, 200, 0.6, 0.6, '#fff7b3');
      sfx('collect');
    }
    // Hidden space sticker.
    const stk = this.layout.sticker;
    if (stk && this.stickerSprite?.visible && Math.hypot(ship.x - stk.x, ship.y - stk.y) < 70) {
      this.stickerSprite.visible = false;
      st.emit({ type: 'sticker', id: stk.id });
      this.trail.burst(tex('spark'), stk.x, stk.y, 24, 300, 0.8, 0.8, '#ff7ad9');
      sfx('sticker');
    }
  }

  private handleNearby(dt: number, actionHeld: boolean, actionPressed: boolean): void {
    const ship = this.ship;
    const world = this.layout.world;
    this.nearLand = landableNear(ship, world);
    const scanTarget = scannableNear(ship, world);
    this.nearScan = scanTarget && this.director.canScan(scanTarget.id) && !this.scanned.has(scanTarget.id) ? scanTarget : null;
    let label: string | null = null;
    let icon = 'land';
    if (this.nearScan) {
      label = 'Scan';
      icon = 'scan';
      const auto = S.state.difficulty === 'easy';
      if (actionHeld || auto) {
        this.scanT += dt;
        if (Math.floor(this.scanT * 6) !== Math.floor((this.scanT - dt) * 6)) sfx('scanTick');
        if (this.scanT >= S.state.tuning.scanTime) {
          this.scanned.add(this.nearScan.id);
          this.scanT = 0;
          S.state.bump('scans');
          S.state.emit({ type: 'scan', target: this.nearScan.id });
          this.floats.show('Scanned!', this.nearScan.x, this.nearScan.y - this.nearScan.r - 40, '#4dd4ff', 46);
          this.trail.burst(tex('spark'), this.nearScan.x, this.nearScan.y, 20, 300, 0.8, 0.8, '#4dd4ff');
          sfx('scanDone');
          this.director.onScan(this, this.nearScan.id);
        }
      } else this.scanT = Math.max(0, this.scanT - dt);
    } else {
      this.scanT = 0;
      if (this.nearLand) {
        label = landLabel(this.nearLand.id);
        if (actionPressed) this.doAction();
      }
    }
    S.touch.setAction(label ? (label.startsWith('Land') ? 'Land' : label) : null, icon);
    if (this.nearScan) tip('flight_scan');
    else if (this.nearLand) tip('flight_land');
    if (label) {
      setText(this.promptText, label);
      setText(this.promptKey, this.nearScan ? 'Hold E' : 'E');
      this.prompt.style.display = '';
    } else this.prompt.style.display = 'none';
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
    const worm = this.wormBody;
    if (worm && this.mode === 'fly' && S.state.flag('wormholeDone') && Math.hypot(ship.x - worm.x, ship.y - worm.y) < worm.r + 70) {
      this.mode = 'leaving';
      void S.game.go('cutscene', { id: 'wormhole' });
      return;
    }
    for (const b of this.layout.world.bodies) {
      if (this.nearSent.has(b.id) || !BODY_BY_ID[b.id]) continue;
      if (Math.hypot(ship.x - b.x, ship.y - b.y) - b.r < 280) {
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
      if (this.emptyT > 2.5 || (this.emptyT > 1 && shipSpeed(ship) < 60)) this.startTow('fuel');
    } else this.emptyT = 0;
  }

  private startTow(reason: 'fuel' | 'shield'): void {
    this.mode = 'tow';
    this.towT = 0;
    this.towBase = nearestBase(this.layout, this.ship.x, this.ship.y);
    this.tuggy.visible = true;
    this.tuggy.position.set(this.ship.x - this.w * 0.9, this.ship.y - 300);
    this.ship.locked = true;
    S.state.bump('tows');
    S.state.emit({ type: 'tow' });
    toast(reason === 'fuel' ? 'Out of fuel! Tuggy is coming!' : 'Your rocket needs a fix! Tuggy is coming!', 'tow', 3000);
    sfx('tuggy');
  }

  private updateTow(dt: number): void {
    this.towT += dt;
    const ship = this.ship;
    ship.vx *= Math.exp(-3 * dt);
    ship.vy *= Math.exp(-3 * dt);
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    const hx = ship.x;
    const hy = ship.y - 110;
    if (this.towT < 1.6) {
      // Fly in.
      const k = damp(3.2, dt);
      this.tuggy.x = lerp(this.tuggy.x, hx, k);
      this.tuggy.y = lerp(this.tuggy.y, hy, k);
    } else if (this.towT < 2.2) {
      this.tuggy.position.set(hx, hy + Math.sin(this.towT * 12) * 4);
    } else if (this.towT < 3.4) {
      // Pull away toward the base.
      const base = this.towBase ? this.layout.world.bodies.find((b) => b.id === this.towBase) : null;
      const dx = base ? base.x - ship.x : 1;
      const dy = base ? base.y - ship.y : 0;
      const d = Math.hypot(dx, dy) || 1;
      ship.x += (dx / d) * 900 * dt;
      ship.y += (dy / d) * 900 * dt;
      ship.angle = lerpAngle(ship.angle, Math.atan2(dy, dx), damp(4, dt));
      this.tuggy.position.set(ship.x, ship.y - 110);
      S.game.curtain.classList.toggle('on', this.towT > 2.9);
    } else {
      this.finishTow();
    }
    this.towLine.clear();
    if (this.towT > 1.5) {
      this.towLine.moveTo(this.tuggy.x, this.tuggy.y + 40).lineTo(ship.x, ship.y - 20).stroke({ width: 5, color: 0x20124d });
    }
  }

  private finishTow(): void {
    const ship = this.ship;
    const base = this.towBase ? this.layout.world.bodies.find((b) => b.id === this.towBase) : null;
    S.game.curtain.classList.remove('on');
    this.towLine.clear();
    this.tuggy.visible = false;
    if (!base) {
      // No base on this trip: Tuggy takes you all the way home.
      toast('Tuggy towed you home to the Academy!', 'home', 3000);
      this.mode = 'leaving';
      this.director.onTowedHome(this);
      return;
    }
    ship.x = ship.px = base.x + base.r + 160;
    ship.y = ship.py = base.y + 40;
    ship.vx = ship.vy = 0;
    ship.fuel = this.params.maxFuel;
    ship.shield = this.params.maxShield;
    ship.locked = false;
    ship.bumpTime = 2;
    this.camX = ship.x;
    this.camY = ship.y;
    this.mode = 'fly';
    this.emptyT = 0;
    const name = BODY_BY_ID[base.id]?.base ?? BODY_BY_ID[base.id]?.name ?? 'the base';
    toast(`Beep boop! Tuggy brought you to ${name}. All fixed up!`, 'tow', 3600);
    sfx('repair');
  }

  // ------------------------------------------------------------------ effects

  private emitTrail(dt: number): void {
    const ship = this.ship;
    if (this.mode !== 'fly' || ship.thrust <= 0) return;
    const boosting = ship.boostTime > 0;
    const n = boosting ? 3 : ship.thrust > 0.5 ? 2 : 1;
    const ca = Math.cos(ship.angle);
    const sa = Math.sin(ship.angle);
    const engine = PART_BY_ID[S.state.data.loadout.engine];
    const color = hexNum(engine?.flame?.[0] ?? '#ff9f43');
    for (const [nx, ny] of this.nozzles) {
      // Nozzle position (sprite space, pointing up) -> world.
      const lx = (nx - ROCKET_W / 2) * SHIP_SCALE;
      const ly = (ny - ROCKET_H / 2) * SHIP_SCALE;
      // Sprite "up" is the ship's forward; rotate by angle + 90deg.
      const wx = ship.x - lx * sa - ly * ca;
      const wy = ship.y + lx * ca - ly * sa;
      for (let i = 0; i < n; i++) {
        const spread = (Math.random() - 0.5) * 80;
        this.trail.spawn(tex('dot'), wx - ca * 8, wy - sa * 8, -ca * 220 + -sa * spread + ship.vx * 0.3, -sa * 220 + ca * spread + ship.vy * 0.3, boosting ? 0.5 : 0.35, boosting ? 0.9 : 0.6, 0.1, 0.9, color);
      }
    }
    if (boosting && Math.random() < 0.5) {
      this.trail.spawn(tex('spark'), ship.x + (Math.random() - 0.5) * 50, ship.y + (Math.random() - 0.5) * 50, -ship.vx * 0.2, -ship.vy * 0.2, 0.4, 0.5, 0.1, 1, 0xffffff);
    }
    void dt;
  }

  // ------------------------------------------------------------------ render

  override render(alpha: number): void {
    const ship = this.ship;
    const sx = lerp(ship.px, ship.x, alpha);
    const sy = lerp(ship.py, ship.y, alpha);
    const sa = lerpAngle(ship.pangle, ship.angle, alpha);
    // Camera: follow with a little look-ahead.
    const lookX = sx + ship.vx * 0.35;
    const lookY = sy + ship.vy * 0.35;
    const k = 0.12;
    this.camX += (lookX - this.camX) * k;
    this.camY += (lookY - this.camY) * k;
    const speed = shipSpeed(ship);
    const targetZoom = this.baseZoom * (1 - clamp((speed - this.params.maxSpeed) / 900, 0, 0.12));
    this.zoom += (targetZoom - this.zoom) * 0.05;
    const z = this.zoom;
    this.cam.scale.set(z);
    this.cam.position.set(this.w / 2 - this.camX * z + this.shake.x, this.h / 2 - this.camY * z + this.shake.y);
    this.stars.update(this.camX, this.camY, 1 / 60);
    // Sun glow at the screen edge in the Sun's direction.
    const sunLeft = this.layout.world.sunDirX < 0;
    this.sunScreenX = sunLeft ? -this.w * 0.15 : this.w * 1.15;
    this.sunGlow.position.set(this.sunScreenX, this.h * 0.45);
    this.sunGlow.scale.set((this.h * 1.4) / 32);
    this.sunGlow.alpha = 0.35;

    // Ship.
    this.rocket.position.set(sx, sy);
    this.rocket.rotation = sa + Math.PI / 2;
    const thr = ship.thrust;
    const boost = ship.boostTime > 0;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const flick = 0.85 + Math.sin(this.t * 50 + i * 2) * 0.15;
      f.visible = thr > 0 && this.mode === 'fly';
      f.scale.set(boost ? 1.25 : 0.9, (0.45 + thr * 0.7) * flick * (boost ? 1.6 : 1));
    }
    this.rocket.alpha = ship.bumpTime > 0 && Math.floor(this.t * 14) % 2 === 0 ? 0.55 : 1;
    this.bubble.visible = ship.bumpTime > 0.8;
    this.bubble.position.set(sx, sy);
    this.bubble.scale.set(4.2);
    this.bubble.alpha = 0.45;
    if (this.tuggy.visible) this.tuggy.rotation = Math.sin(this.t * 6) * 0.08;

    // Visible rect in world space (for culling).
    const halfW = this.w / 2 / z + 150;
    const halfH = this.h / 2 / z + 150;
    const x0 = this.camX - halfW;
    const x1 = this.camX + halfW;
    const y0 = this.camY - halfH;
    const y1 = this.camY + halfH;
    const world = this.layout.world;
    for (let i = 0; i < world.coins.length; i++) {
      const c = world.coins[i];
      const s = this.coinSprites[i];
      const vis = c.alive && c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1;
      s.visible = vis;
      if (vis) {
        s.position.set(c.x, c.y);
        s.scale.x = Math.cos(this.t * 3 + i * 0.7);
      }
    }
    for (let i = 0; i < world.fuels.length; i++) {
      const f = world.fuels[i];
      const s = this.fuelSprites[i];
      s.visible = f.alive && f.x > x0 && f.x < x1 && f.y > y0 && f.y < y1;
      if (s.visible) s.position.set(f.x, f.y + Math.sin(this.t * 2 + i) * 6);
    }
    for (let i = 0; i < world.hauls.length; i++) {
      const hItem = world.hauls[i];
      const s = this.haulSprites[i];
      s.visible = hItem.alive;
      if (s.visible) s.position.set(hItem.x, hItem.y + Math.sin(this.t * 2 + i) * 5);
    }
    for (let i = 0; i < world.glimmers.length; i++) {
      const g = world.glimmers[i];
      const s = this.glimmerSprites[i];
      s.visible = g.alive;
      if (s.visible) {
        s.position.set(g.x, g.y);
        s.scale.set(0.9 + Math.sin(this.t * 5 + i) * 0.15);
      }
    }
    for (let i = 0; i < world.asteroids.length; i++) {
      const a = world.asteroids[i];
      const s = this.rockSprites[i];
      const ax = lerp(a.px, a.x, alpha);
      const ay = lerp(a.py, a.y, alpha);
      const vis = ax > x0 - a.r && ax < x1 + a.r && ay > y0 - a.r && ay < y1 + a.r;
      s.visible = vis;
      if (vis) {
        s.position.set(ax, ay);
        s.rotation = a.rot;
      }
    }
    const tailAngle = Math.atan2(-world.sunDirY, -world.sunDirX);
    for (let i = 0; i < world.comets.length; i++) {
      const c = world.comets[i];
      const cx = lerp(c.px, c.x, alpha);
      const cy = lerp(c.py, c.y, alpha);
      const head = this.cometHeads[i];
      const tail = this.cometTails[i];
      head.position.set(cx, cy);
      head.rotation = this.t;
      tail.position.set(cx, cy);
      tail.rotation = tailAngle;
      tail.scale.set(c.len / 256, (c.width * 2.2) / 64);
      tail.alpha = 0.75 + Math.sin(this.t * 4 + i) * 0.15;
    }
    for (let i = 0; i < world.gates.length; i++) {
      const g = world.gates[i];
      const s = this.gateSprites[i];
      const next = i === world.nextGate;
      s.tint = g.passed ? 0x8cff66 : next ? 0xffe066 : 0xffffff;
      s.alpha = g.passed ? 0.35 : next ? 1 : 0.7;
      const pulse = next ? 1 + Math.sin(this.t * 6) * 0.06 : 1;
      s.scale.set(((g.r * 2) / 140) * pulse);
      s.rotation = this.t * (next ? 0.8 : 0.2);
    }
    for (let i = 0; i < this.bodySprites.length; i++) {
      const b = world.bodies[i];
      if (!BODY_BY_ID[b.id]) this.bodySprites[i].rotation = Math.sin(this.t + i) * 0.2;
    }
    if (this.wormhole && this.wormBody) {
      this.wormhole.rotation = this.t * 1.4;
      const sc = (this.wormBody.r * 2.2) / 140;
      this.wormhole.scale.set(sc * (1 + Math.sin(this.t * 3) * 0.05));
    }
    if (this.stickerSprite?.visible) {
      this.stickerSprite.rotation = Math.sin(this.t * 2) * 0.3;
      this.stickerSprite.scale.set(0.7 + Math.sin(this.t * 4) * 0.08);
    }

    // Scan ring.
    const scan = this.nearScan;
    this.scanArc.clear();
    if (scan) {
      this.scanRing.visible = true;
      this.scanRing.position.set(scan.x, scan.y);
      this.scanRing.scale.set(((scan.r + 60) * 2) / 128);
      this.scanRing.rotation = this.t;
      const frac = this.scanT / S.state.tuning.scanTime;
      if (frac > 0) {
        this.scanArc.arc(scan.x, scan.y, scan.r + 75, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).stroke({ width: 14, color: 0x4dd4ff, cap: 'round' });
      }
    } else this.scanRing.visible = false;

    this.renderPointer(sx, sy);
    this.trail.render(alpha);
    this.puffs.render(alpha);
  }

  /** Arrow at the screen edge (or a marker above the target) so kids always know where to go. */
  private renderPointer(sx: number, sy: number): void {
    const target = this.director.target(this);
    if (!target || this.mode !== 'fly') {
      this.arrow.visible = false;
      this.marker.visible = false;
      return;
    }
    const z = this.zoom;
    const tx = (target.x - this.camX) * z + this.w / 2;
    const ty = (target.y - this.camY) * z + this.h / 2;
    const margin = 90;
    const onScreen = tx > margin && tx < this.w - margin && ty > margin + 60 && ty < this.h - margin;
    if (onScreen) {
      this.arrow.visible = false;
      this.marker.visible = true;
      this.marker.position.set(target.x, target.y - target.r - 20 + Math.sin(this.t * 5) * 10);
      this.marker.scale.set(1.3 / z * 0.8);
    } else {
      this.marker.visible = false;
      this.arrow.visible = true;
      const dx = target.x - sx;
      const dy = target.y - sy;
      const a = Math.atan2(dy, dx);
      const cx = this.w / 2;
      const cy = this.h / 2;
      const rx = this.w / 2 - margin;
      const ry = this.h / 2 - margin;
      const tt = Math.min(Math.abs(rx / (Math.cos(a) || 1e-6)), Math.abs(ry / (Math.sin(a) || 1e-6)));
      this.arrow.position.set(cx + Math.cos(a) * tt, cy + Math.sin(a) * tt);
      this.arrow.rotation = a;
      this.arrow.scale.set(1.3 + Math.sin(this.t * 6) * 0.12);
    }
  }

  // ------------------------------------------------------------------ helpers for the director

  getShip(): Ship {
    return this.ship;
  }

  getLayout(): FlightLayout {
    return this.layout;
  }

  get coinsCollected(): number {
    return this.coinsThisFlight;
  }

  get raceSeconds(): number {
    return this.raceTime;
  }

  setObjective(text: string, icon?: string): void {
    this.hud.setObjective(text, icon);
  }

  setExtra(text: string): void {
    this.hud.setExtra(text);
  }

  floatText(text: string, color = '#ffe066'): void {
    this.floats.show(text, this.ship.x, this.ship.y - 80, color, 46);
  }

  celebrate(): void {
    this.trail.burst(tex('spark'), this.ship.x, this.ship.y, 40, 500, 1, 1, '#ffe066');
    this.trail.burst(tex('dot'), this.ship.x, this.ship.y, 30, 400, 1, 0.8, '#ff7ad9');
  }

  setMode(m: Mode): void {
    this.mode = m;
  }

  /** Planet sprite texture helper for directors. */
  static planet(id: string): Texture {
    return planetTex(id);
  }
}


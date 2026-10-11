import { Container, Sprite, TilingSprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { lerp } from '../core/mathx';
import { BODY_BY_ID } from '../data/bodies';
import { levelById } from '../data/levels';
import { PART_BY_ID } from '../data/parts';
import { theme, type Theme } from '../data/themes';
import { drawSilhouette, drawSkyGradient } from '../gfx/art/backgrounds';
import { nozzlePositions, ROCKET_H, ROCKET_W } from '../gfx/art/rocket';
import { themeSprites } from '../gfx/art/tiles';
import { FloatTexts, Particles } from '../gfx/particles';
import { hexNum } from '../gfx/palette';
import { ensureAtlas, ensureTex, planetDiscFraction, planetTex, rocketTex, tex } from '../gfx/textures';
import { landingGravity, makeLanding, stepLanding, type LandingConfig, type LandingState } from '../systems/landing';
import { TILE } from '../systems/level';
import { h } from '../ui/dom';
import { Hud } from '../ui/hud';
import { openPause } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { landingHooks } from './landingHooks';

export interface LandingParams {
  body: string;
}

/** Forgiving landing minigame: slow down with Thrust and touch down on the glowing pad. */
export class LandingScene extends Scene {
  private th: Theme;
  private state!: LandingState;
  private cfg!: LandingConfig;
  private sky = new Sprite(tex('square'));
  private stars: TilingSprite | null = null;
  private skyPlanet: Sprite | null = null;
  private far!: TilingSprite;
  private mid!: TilingSprite;
  private ground = new Container();
  private pad = new Sprite(tex('pad'));
  private padGlow = new Sprite(tex('dot'));
  private rocket = new Container();
  private flames: Sprite[] = [];
  private fx = new Particles(160, true);
  private dust = new Particles(80, false);
  private floats = new FloatTexts(4);
  private hud: Hud;
  private gauge: HTMLElement;
  private gaugeFill: HTMLElement;
  private w = 1280;
  private h = 720;
  private t = 0;
  private doneT = -1;
  private ready = false;
  private lastMsg = '';

  constructor(private readonly p: LandingParams) {
    super('landing');
    this.music = 'flight';
    this.pausable = true;
    const body = BODY_BY_ID[p.body];
    const area = body?.areas?.[0];
    this.th = theme(p.body === 'earth' ? 'earth' : (area && levelById(area)?.theme) || 'moon');
    this.hud = new Hud({ onPause: () => openPause('landing') });
    this.gaugeFill = h('div', { class: 'gauge-fill' });
    this.gauge = h('div', { class: 'gauge', 'data-testid': 'landing-gauge' }, h('div', { class: 'gauge-safe' }), this.gaugeFill, h('div', { class: 'gauge-lbl' }, 'Speed'));
    this.ui.append(this.hud.el, this.gauge);
  }

  override async enter(): Promise<void> {
    await ensureAtlas(`theme_${this.th.id}`, themeSprites(this.th));
    const th = this.th;
    this.sky.texture = ensureTex(`sky_${th.id}`, 8, 256, (c, w, hh) => drawSkyGradient(c, w, hh, th.sky[0], th.sky[1], th.haze), 0, 0, 1);
    this.sky.anchor.set(0);
    this.root.addChild(this.sky);
    if (th.stars) {
      this.stars = new TilingSprite({ texture: tex('stars1'), width: 100, height: 100 });
      this.root.addChild(this.stars);
    }
    if (th.skyPlanet) {
      const pt = planetTex(th.skyPlanet.body);
      this.skyPlanet = new Sprite(pt);
      this.skyPlanet.anchor.set(0.5);
      this.skyPlanet.scale.set(th.skyPlanet.size / (pt.width * planetDiscFraction(th.skyPlanet.body) * 2));
      this.root.addChild(this.skyPlanet);
    }
    this.far = new TilingSprite({ texture: ensureTex(`far_${th.id}`, 1024, 360, (c, w, hh) => drawSilhouette(c, th.farStyle, th.far, w, hh, 11), 0, 0, 1), width: 100, height: 360 });
    this.mid = new TilingSprite({ texture: ensureTex(`mid_${th.id}`, 1024, 300, (c, w, hh) => drawSilhouette(c, th.midStyle, th.mid, w, hh, 23), 0, 0, 1), width: 100, height: 300 });
    this.root.addChild(this.far, this.mid, this.ground, this.dust, this.padGlow, this.pad, this.rocket, this.fx, this.floats);
    const lo = S.state.data.loadout;
    const flameTex = tex(`flame_${PART_BY_ID[lo.engine]?.style ?? 'single'}`);
    for (const [nx, ny] of nozzlePositions(lo)) {
      const f = new Sprite(flameTex);
      f.anchor.set(0.5, 0);
      f.position.set(nx - ROCKET_W / 2, ny - ROCKET_H - 4);
      this.flames.push(f);
      this.rocket.addChild(f);
    }
    const body = new Sprite(rocketTex(lo));
    body.anchor.set(0.5, 1);
    this.rocket.addChild(body);
    this.rocket.scale.set(0.8);
    this.padGlow.anchor.set(0.5);
    this.padGlow.tint = 0x8cff66;
    this.padGlow.blendMode = 'add';
    this.pad.scale.set(1.1, 1);
    this.layout();
    this.resize(this.w, this.h);
    S.touch.setMode('landing');
    const isEarth = this.p.body === 'earth';
    this.hud.setObjective(isEarth ? 'Land on the Academy pad!' : 'Land softly on the glowing pad!', 'land');
    this.hud.setCoins(S.state.data.coins);
    this.ready = true;
    if (this.state.assist) toast('Auto-Lander is on. Steer to the pad!', 'land', 2600);
    landingHooks.onStart(this);
    tip('landing');
  }

  override exit(): void {
    S.touch.setMode('none');
  }

  override back(): boolean {
    openPause('landing');
    return true;
  }

  private layout(): void {
    const w = this.w;
    const h = this.h;
    const groundY = h - 150;
    const padX = w * (0.45 + Math.random() * 0.2);
    const tn = S.state.tuning;
    this.cfg = {
      gravity: landingGravity(BODY_BY_ID[this.p.body]?.gravityG ?? 1),
      thrust: 560,
      side: 520,
      groundY,
      padX,
      padW: 170,
      safeSpeed: tn.landingSafeSpeed,
      worldW: w,
      assistAfter: 3,
    };
    const startX = Math.random() < 0.5 ? w * 0.22 : w * 0.78;
    if (!this.state) this.state = makeLanding(this.cfg, tn.landingAssist, startX);
    this.ground.removeChildren();
    const th = this.th;
    const cols = Math.ceil(w / TILE) + 1;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < 4; y++) {
        const s = new Sprite(tex(`${th.id}_${y === 0 ? 'top0' : 'fill'}`));
        s.position.set(x * TILE, groundY + y * TILE - 8);
        this.ground.addChild(s);
      }
    }
    this.pad.anchor.set(0.5, 0.35);
    this.pad.position.set(padX, groundY);
    this.padGlow.position.set(padX, groundY - 4);
    this.padGlow.scale.set(9, 3);
  }

  override resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.sky.width = w;
    this.sky.height = h;
    if (this.stars) {
      this.stars.width = w;
      this.stars.height = h;
    }
    if (this.skyPlanet && this.th.skyPlanet) this.skyPlanet.position.set(w * this.th.skyPlanet.x, h * this.th.skyPlanet.y);
    if (this.far) {
      this.far.width = w;
      this.mid.width = w;
      this.far.y = h - 360 - 110;
      this.mid.y = h - 300 - 100;
    }
    if (this.ready) {
      const fracX = this.state.x / this.cfg.worldW;
      this.layout();
      this.state.x = fracX * w;
    }
  }

  override update(dt: number): void {
    if (!this.ready) return;
    this.t += dt;
    const s = this.state;
    const input = S.input.state;
    const thrust = input.boost || input.y < -0.4;
    const landed = stepLanding(s, this.cfg, { x: input.x, thrust }, dt);
    if (s.last !== 'none' && s.last !== this.lastMsg && !s.done) {
      this.lastMsg = s.last;
      if (s.last === 'fast') {
        toast('Too fast! Hold Thrust to slow down.', 'boost', 2400);
        this.floats.show('Bonk!', s.x, s.y - 80, '#ff9aa8');
        sfx('bump');
      } else if (s.last === 'miss') {
        toast('Try to land on the glowing pad!', 'target', 2400);
        this.floats.show('Oops!', s.x, s.y - 80, '#ffe066');
        sfx('bump');
      }
      if (s.assist && s.attempts === this.cfg.assistAfter) toast('Boltzy turned on the Auto-Lander!', 'wrench', 2600);
      this.dust.burst(tex('puff'), s.x, this.cfg.groundY, 10, 200, 0.7, 0.9, this.th.surface);
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
    // Effects.
    if (s.thrusting && !s.done) {
      for (const [nx] of nozzlePositions(S.state.data.loadout)) {
        const x = s.x + (nx - ROCKET_W / 2) * 0.8;
        this.fx.spawn(tex('dot'), x, s.y + 6, (Math.random() - 0.5) * 60, 260, 0.35, 0.7, 0.1, 0.9, hexNum(PART_BY_ID[S.state.data.loadout.engine]?.flame?.[0] ?? '#ff9f43'));
      }
      if (this.cfg.groundY - s.y < 160 && Math.random() < 0.5) {
        this.dust.spawn(tex('puff'), s.x + (Math.random() - 0.5) * 120, this.cfg.groundY, (Math.random() - 0.5) * 300, -40, 0.8, 0.5, 1.4, 0.7, hexNum(this.th.surface));
      }
    }
    this.fx.update(dt);
    this.dust.update(dt);
    this.floats.update(dt);
    // Speed gauge: how fast you are falling compared to the safe speed.
    const frac = Math.max(0, Math.min(1, s.vy / (this.cfg.safeSpeed * 2)));
    this.gaugeFill.style.height = `${Math.round(frac * 100)}%`;
    this.gauge.classList.toggle('safe', s.vy <= this.cfg.safeSpeed);
  }

  private onLanded(): void {
    const s = this.state;
    const st = S.state;
    st.bump('landings');
    if (s.perfect) st.bump('perfectLandings');
    st.emit({ type: 'land', body: this.p.body, perfect: s.perfect });
    this.floats.show(s.perfect ? 'Perfect landing!' : 'Touchdown!', s.x, s.y - 150, s.perfect ? '#ffe066' : '#8cff66', s.perfect ? 64 : 56);
    this.fx.burst(tex('spark'), s.x, s.y - 40, s.perfect ? 50 : 30, 450, 1, 0.9, '#ffe066');
    this.fx.burst(tex('confetti'), s.x, s.y - 60, s.perfect ? 50 : 20, 420, 1.6, 1, '#ff7ad9', { gravity: 500, spin: true });
    this.dust.burst(tex('puff'), s.x, this.cfg.groundY, 16, 260, 0.8, 1, this.th.surface);
    sfx(s.perfect ? 'perfect' : 'landed');
    this.doneT = 0;
  }

  override render(alpha: number): void {
    if (!this.ready) return;
    const s = this.state;
    const x = lerp(s.px, s.x, alpha);
    const y = lerp(s.py, s.y, alpha);
    this.rocket.position.set(x, y + 4);
    this.rocket.rotation = s.tilt;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.visible = s.thrusting && !s.done;
      f.scale.set(1, 0.8 + Math.sin(this.t * 45 + i) * 0.2);
    }
    this.padGlow.alpha = 0.35 + Math.sin(this.t * 4) * 0.2;
    if (this.stars) this.stars.tilePosition.y = this.t * 3;
    this.fx.render(alpha);
    this.dust.render(alpha);
  }
}

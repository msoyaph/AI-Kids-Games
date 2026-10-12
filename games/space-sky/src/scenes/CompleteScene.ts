import { DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { formatPlaytime } from '../core/mathx';
import { STICKERS } from '../data/stickers';
import { Particles3 } from '../r3/fx/particles';
import { buildCadet, type Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { LandingPadProp } from '../r3/surface/props';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button, iconEl } from '../ui/widgets';
import { completeHooks } from './completeHooks';
import { portraitEl } from '../ui/portraits';

const COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9', '#9b6bff'];

/** "You did it!" screen with play time, Codex %, missions and badges; your cadet cheers beside your rocket. */
export class CompleteScene extends Scene3D {
  private sky: SpaceSky;
  private cadet: Character;
  private rocket: RocketModel;
  private podium: LandingPadProp;
  private pad: LandingPadProp;
  private fx = new Particles3(500, 'spark');
  private boomT = 0.6;
  private lastTime = 0;
  private side = 5.5;
  private readonly look = new Vector3(0, 1.5, 0);

  constructor() {
    super('complete');
    this.music = 'finale';
    this.sky = addSpaceSky(this.world, SKIES.menu);
    const key = new DirectionalLight('#fff4e2', 2.4);
    key.position.set(3, 6, 8);
    this.world.add(key, new HemisphereLight('#c9d2ff', '#2a1850', 0.9));
    this.world.environmentIntensity = 0.8;
    this.cadet = buildCadet(S.state.data.profile);
    this.cadet.group.scale.setScalar(2.1 / Math.max(0.6, this.cadet.height));
    this.cadet.setAnim('celebrate');
    this.cadet.mood = 'wow';
    this.podium = new LandingPadProp(1.2);
    this.podium.setGlow('#ffe066');
    this.rocket = new RocketModel(S.state.data.loadout, { glossy: S.game.r3.profile.tier === 'high' });
    const e = this.rocket.extent;
    this.rocket.group.scale.setScalar(4.2 / (e.top - e.bottom));
    this.rocket.group.rotation.y = -0.4;
    this.pad = new LandingPadProp(1.5);
    this.pad.setGlow('#4dd4ff');
    this.fx.gravity = 1.2;
    this.fx.drag = 1.1;
    this.world.add(this.podium.group, this.cadet.group, this.pad.group, this.rocket.group, this.fx.points);
    this.camera.fov = 40;
    this.camera.position.set(0, 1.9, 12.5);
    const d = S.state.data;
    const m = S.missions.counts();
    const codex = completeHooks.codexPercent();
    const badges = completeHooks.badges();
    const stat = (icon: string, label: string, value: string) => h('div', { class: 'stat-tile' }, iconEl(icon), h('div', { class: 'stat-val' }, value), h('div', { class: 'stat-lbl' }, label));
    const face = portraitEl('player', 150, 'wow', d.profile);
    const finished = S.missions.isDone('c5_beacon');
    this.ui.append(
      h('div', { class: 'complete-wrap' },
        face,
        h('div', { class: 'title' }, finished ? 'You are a Star Hero!' : 'Your Journey'),
        h('div', { class: 'h3' }, d.profile.name || 'Cadet'),
        h('div', { class: 'stat-grid', 'data-testid': 'complete-stats' },
          stat('calendar', 'Play time', formatPlaytime(d.playTime)),
          stat('book', 'Codex', `${codex}%`),
          stat('flag', 'Missions', `${m.mainDone + m.sideDone} / ${m.main + m.side}`),
          stat('badge', 'Badges', `${badges.earned} / ${badges.total}`),
          stat('sticker', 'Stickers', `${d.stickers.length} / ${STICKERS.length}`),
          stat('coin', 'Star-coins earned', String(d.coinsEarned)),
        ),
        h('div', { class: 'muted' }, finished ? 'You can keep exploring, finish side missions and find every sticker!' : 'Keep going, explorer!'),
        button('Keep exploring!', 'rocket', () => void S.game.go('hub'), { color: 'green', size: 'big', id: 'btn-keep-exploring' }),
      ),
    );
  }

  override enter(): void {
    celebrate(80);
    sfx('fanfare');
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  /** Cadet and rocket stand in the free space either side of the stats. */
  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.fx.setScreen(window.innerHeight * S.game.r3.pixelRatio);
    const half = 12.5 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect;
    this.side = Math.min(7, half * 0.77);
    this.podium.group.position.set(-this.side, -1.4, 0);
    this.cadet.group.position.set(-this.side, -1.4 + 0.18, 0);
    this.cadet.group.rotation.y = 0.35;
    this.pad.group.position.set(this.side, -1.4, -0.5);
    const e = this.rocket.extent;
    const sc = this.rocket.group.scale.x;
    this.rocket.group.position.set(this.side, -1.4 + 0.18 - e.bottom * sc, -0.5);
  }

  override render(): void {
    const t = this.time;
    const dt = Math.min(0.1, Math.max(0, t - this.lastTime)) || 1 / 60;
    this.lastTime = t;
    const drift = comfortOn() ? 0 : Math.sin(t * 0.25) * 0.5;
    this.camera.position.set(drift, 1.9, 12.5);
    this.camera.lookAt(this.look);
    this.cadet.update(dt);
    this.rocket.update(dt, 0.5, 0.2);
    this.rocket.group.rotation.y = -0.4 + t * 0.3;
    this.podium.update(dt, t);
    this.pad.update(dt, t);
    this.sky.update(t);
    this.boomT -= dt;
    if (this.boomT <= 0) {
      this.boomT = (comfortOn() ? 1.6 : 0.8) + Math.random() * 0.6;
      const x = (Math.random() - 0.5) * 18;
      this.fx.burst(x, 5 + Math.random() * 3, -10 - Math.random() * 6, comfortOn() ? 24 : 40, 5, 1.3, 0.38, COLORS[Math.floor(Math.random() * COLORS.length)]);
      sfx('firework', { volume: 0.35 });
    }
    this.fx.update(dt);
  }
}

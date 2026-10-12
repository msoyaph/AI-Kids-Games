import { DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { CREDITS } from '../data/credits';
import { PART_BY_ID } from '../data/parts';
import { Particles3 } from '../r3/fx/particles';
import { Trail } from '../r3/fx/trail';
import { RocketModel } from '../r3/models/rocket';
import { disposeObject } from '../r3/dispose';
import { addSpaceSky } from '../r3/space/backdrop';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { makeWormhole } from '../r3/space/wormhole';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';

const COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9'];

/** The grand tour, in order (sizes are for the show, not to scale). Zephyra waits beyond the wormhole. */
const TOUR: Array<{ id: string; r: number; y: number }> = [
  { id: 'mercury', r: 2.2, y: 2 },
  { id: 'venus', r: 3.4, y: -2 },
  { id: 'earth', r: 3.6, y: 2.5 },
  { id: 'mars', r: 2.8, y: -1.5 },
  { id: 'jupiter', r: 11, y: 4 },
  { id: 'saturn', r: 8, y: -2 },
  { id: 'uranus', r: 6, y: 3 },
  { id: 'neptune', r: 6, y: -2.5 },
  { id: 'pluto', r: 1.6, y: 2 },
  { id: 'wormhole', r: 6, y: 1 },
  { id: 'zephyra', r: 6, y: -1 },
];
const GAP = 46;
const START = 30;

/** Credits over a fly-past: your own rocket cruises by every world, out through the wormhole to Zephyra. */
export class CreditsScene extends Scene3D {
  private sky: SpaceSky;
  private fx = new Particles3(600, 'spark');
  private roll: HTMLElement;
  private rocket: RocketModel;
  private trail: Trail;
  private planets: Array<PlanetView | null> = TOUR.map(() => null);
  private worm: ReturnType<typeof makeWormhole> | null = null;
  private duration: number;
  private speed: number;
  private boomT = 2;
  private finished = false;
  private lastTime = 0;
  private readonly sunDir = new Vector3(-0.6, 0.35, 0.7).normalize();
  private readonly look = new Vector3();
  private readonly nozzle = new Vector3();
  private readonly tail: Vector3;

  constructor() {
    super('credits');
    this.music = 'credits';
    this.sky = addSpaceSky(this.world, SKIES.space);
    const sun = new DirectionalLight('#fff4e2', 2.6);
    sun.position.copy(this.sunDir).multiplyScalar(100);
    this.world.add(sun, new HemisphereLight('#9fb0ff', '#2a1850', 0.6));
    this.rocket = new RocketModel(S.state.data.loadout, { glossy: S.game.r3.profile.tier === 'high' });
    const e = this.rocket.extent;
    this.rocket.group.scale.setScalar(2.6 / (e.top - e.bottom));
    this.tail = this.rocket.nozzles()[0] ?? new Vector3(0, e.bottom, 0);
    // Flying along +x, nose first, tipped a little toward the camera so you see your paint job.
    this.rocket.group.rotation.set(0.25, 0, -Math.PI / 2);
    const eng = PART_BY_ID[S.state.data.loadout.engine]?.flame ?? ['#ff9f43', '#fff36b'];
    this.trail = new Trail(30, 0.22, eng[1], eng[0], 0.4);
    this.trail.power = 0.5;
    this.fx.gravity = 1.2;
    this.fx.drag = 1.1;
    this.world.add(this.rocket.group, this.trail.mesh, this.fx.points);
    this.camera.fov = 45;
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
    this.duration = 18 + CREDITS.length * 3;
    this.speed = (START + GAP * (TOUR.length - 1) + 12) / this.duration;
    this.roll = h('div', { class: 'credits-roll', 'data-testid': 'credits' });
    for (const block of CREDITS) {
      this.roll.append(h('div', { class: 'credits-block' }, h('div', { class: 'h2' }, block.title), ...block.lines.map((l) => h('div', { class: 'credits-line' }, l))));
    }
    this.ui.append(h('div', { class: 'credits-view' }, this.roll), h('div', { class: 'cutscene-skip' }, button('Skip', 'next', () => this.done(), { size: 'small', color: 'white', id: 'btn-skip-credits' })));
  }

  override enter(): void {
    S.state.data.creditsSeen = true;
    S.state.markDirty();
    this.roll.style.animationDuration = `${this.duration}s`;
    this.roll.addEventListener('animationend', () => this.done());
  }

  override back(): boolean {
    this.done();
    return true;
  }

  private done(): void {
    if (this.finished) return;
    this.finished = true;
    void S.game.go('complete');
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.fx.setScreen(window.innerHeight * S.game.r3.pixelRatio);
    this.sky.setPixelRatio(S.game.r3.pixelRatio);
  }

  /** Worlds appear a little before you reach them and are let go once they are far behind. */
  private stream(x: number): void {
    const r3 = S.game.r3;
    TOUR.forEach((p, i) => {
      const px = START + i * GAP;
      const near = px - x < 150 && x - px < 70;
      if (near && !this.planets[i] && !(p.id === 'wormhole' && this.worm)) {
        if (p.id === 'wormhole') {
          this.worm = makeWormhole();
          this.worm.mesh.scale.setScalar(p.r);
          this.worm.mesh.position.set(px, p.y, -16);
          this.world.add(this.worm.mesh);
          return;
        }
        const v = createPlanet(p.id, p.r, { renderer: r3.renderer, profile: r3.profile, detail: p.r > 5 ? 'hero' : 'normal' });
        v.group.position.set(px, p.y, -14 - p.r);
        this.world.add(v.group);
        this.planets[i] = v;
      } else if (!near && this.planets[i] && x > px) {
        const v = this.planets[i]!;
        v.group.removeFromParent();
        disposeObject(v.group);
        this.planets[i] = null;
      }
    });
  }

  override render(): void {
    const t = this.time;
    const dt = Math.min(0.1, Math.max(0, t - this.lastTime)) || 1 / 60;
    this.lastTime = t;
    const x = t * this.speed;
    this.stream(x);
    const g = this.rocket.group;
    g.position.set(x, Math.sin(t * 0.7) * 0.4, 0);
    this.rocket.update(dt, 0.8, 0.3);
    g.updateMatrixWorld();
    this.nozzle.copy(this.tail).applyMatrix4(g.matrixWorld);
    this.trail.push(this.nozzle);
    this.trail.update(this.camera);
    // A gentle tracking shot beside the rocket, looking a little ahead at what is coming.
    const sway = comfortOn() ? 0 : Math.sin(t * 0.21) * 1.2;
    this.camera.position.set(x - 3 + sway, 2.4, 12.5);
    this.camera.lookAt(this.look.set(x + 6, 0.6, -8));
    for (const p of this.planets) p?.update(t, this.sunDir);
    if (this.worm) this.worm.material.uniforms.uTime.value = t;
    this.sky.update(t);
    // Celebration sparkles now and then, out ahead in the dark.
    this.boomT -= dt;
    if (this.boomT <= 0) {
      this.boomT = (comfortOn() ? 2.2 : 1.1) + Math.random();
      this.fx.burst(x + 10 + Math.random() * 14, 4 + Math.random() * 4, -12 - Math.random() * 6, comfortOn() ? 20 : 34, 4.5, 1.4, 0.35, COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
    this.fx.update(dt);
  }
}

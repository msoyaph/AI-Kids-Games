import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { dialogue } from '../data/dialogue';
import { theme } from '../data/themes';
import { SpeedDust } from '../r3/flight/flightFx';
import { Particles3 } from '../r3/fx/particles';
import { buildCadet, Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { addSpaceSky } from '../r3/space/backdrop';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { makeWormhole } from '../r3/space/wormhole';
import { surfaceLight, terrainMaterial } from '../r3/surface/look';
import { MachineProp } from '../r3/surface/props';
import { SurfaceSky } from '../r3/surface/sky';
import { showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button } from '../ui/widgets';
import { academyStage, CAST_SCALE, type AcademyStage } from './academyStage';

export interface CutsceneParams {
  id: string;
}

type Backdrop = 'academy' | 'space' | 'wormhole' | 'zephyra';

interface CutsceneDef {
  backdrop: Backdrop;
  cast: string[];
  lines: string;
  /** Where to go afterwards. */
  next: () => void;
}

const FIREWORK_COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9', '#9b6bff'];

/** Done callbacks so the presenter can wait for a cutscene to finish. */
export const cutsceneWaiters: Array<() => void> = [];

function finishWaiters(): void {
  while (cutsceneWaiters.length) cutsceneWaiters.shift()!();
}

const CUTSCENES: Record<string, CutsceneDef> = {
  zibbo: {
    backdrop: 'academy',
    cast: ['stella', 'player', 'zibbo', 'pip'],
    lines: 'cs_zibbo',
    next: () => void S.game.go('hub'),
  },
  starpath: {
    backdrop: 'space',
    cast: ['zibbo', 'player'],
    lines: 'cs_starpath',
    next: () => void S.game.go('hub'),
  },
  wormhole: {
    backdrop: 'wormhole',
    cast: [],
    lines: 'cs_wormhole',
    next: () => {
      S.state.data.location = 'zephyra';
      void S.game.go('flight', { from: 'zephyra', to: 'zephyra' });
    },
  },
  finale: {
    backdrop: 'zephyra',
    cast: ['ollo', 'zibbo', 'player', 'pibble', 'wobb'],
    lines: 'cs_finale',
    next: () => {
      S.state.data.location = 'earth';
      void S.game.go('credits');
    },
  },
};

/** The Academy scene borrows the hub's diorama; the others build their own world. */
function borrowedWorld(id: string): AcademyStage | null {
  return CUTSCENES[id]?.backdrop === 'academy' ? academyStage() : null;
}

/**
 * Short story scenes in 3D: a set (the Academy at dusk, deep space by Neptune, inside the wormhole,
 * the Star Beacon on Zephyra), the happy cast, the dialogue and some fireworks.
 */
export class CutsceneScene extends Scene3D {
  private def: CutsceneDef;
  private stage: AcademyStage | null;
  private set = new Group();
  private actors: Character[] = [];
  private hidden: Character[] = [];
  private fx: Particles3;
  private sky: SpaceSky | SurfaceSky | null = null;
  private planet: PlanetView | null = null;
  private worm: ReturnType<typeof makeWormhole> | null = null;
  private rings: Mesh[] = [];
  private rocket: RocketModel | null = null;
  private dust: SpeedDust | null = null;
  private beacon: MachineProp | null = null;
  private beam: Mesh | null = null;
  private readonly sunDir = new Vector3(-0.7, 0.3, 0.6).normalize();
  private readonly camFrom = new Vector3();
  private readonly camTo = new Vector3();
  private readonly look = new Vector3();
  private t = 0;
  private lastTime = 0;
  private done = false;
  private fireworkT = 0.6;

  constructor(private readonly p: CutsceneParams) {
    const stage = borrowedWorld(p.id);
    super('cutscene', stage?.world);
    this.stage = stage;
    this.def = CUTSCENES[p.id] ?? CUTSCENES.zibbo;
    this.music = p.id === 'finale' ? 'finale' : p.id === 'wormhole' ? 'wormhole' : 'hub';
    const skip = button('Skip', 'next', () => this.finish(), { size: 'small', color: 'white', id: 'btn-skip' });
    this.ui.append(h('div', { class: 'cutscene-skip' }, skip));
    this.fx = new Particles3(Math.min(700, S.game.r3.profile.particles), 'spark');
    this.fx.gravity = 1.6;
    this.fx.drag = 1.1;
    this.local.add(this.set, this.fx.points);
    if (!stage) this.world.add(this.local);
    this.build();
  }

  // ------------------------------------------------------------------ sets

  private build(): void {
    const bd = this.def.backdrop;
    if (bd === 'academy') this.buildAcademy();
    else if (bd === 'space') this.buildSpace();
    else if (bd === 'wormhole') this.buildWormhole();
    else this.buildZephyra();
  }

  private addCast(at: Vector3, spacing: number, faceY = 0): void {
    const n = this.def.cast.length;
    this.def.cast.forEach((id, i) => {
      const c = id === 'player' ? buildCadet(S.state.data.profile) : new Character(id);
      c.group.scale.setScalar(id === 'player' ? 1.45 / Math.max(0.6, c.height) : CAST_SCALE);
      c.group.position.set(at.x + (i - (n - 1) / 2) * spacing, at.y, at.z + Math.abs(i - (n - 1) / 2) * -0.25);
      c.group.rotation.y = faceY + (i - (n - 1) / 2) * -0.12;
      c.setAnim(i % 2 ? 'celebrate' : 'wave');
      this.actors.push(c);
      this.set.add(c.group);
    });
  }

  /** Zibbo joins the crew: everyone on the hill in front of the Academy, fireworks overhead. */
  private buildAcademy(): void {
    const st = this.stage!;
    const a = st.academy;
    // The crew stepping outside are hidden indoors meanwhile.
    for (const id of this.def.cast) {
      const c = st.cast.get(id);
      if (c?.group.visible) {
        c.group.visible = false;
        this.hidden.push(c);
      }
    }
    const lobby = a.rooms.lobby;
    const front = new Vector3((lobby.min.x + lobby.max.x) / 2, lobby.min.y, lobby.max.z + 3.2);
    this.addCast(front, 1.5);
    const o = a.overview;
    this.camFrom.copy(o.pos);
    this.camTo.set(front.x + 1.5, front.y + 1.1, front.z + 6.5);
    this.look.set(front.x, front.y + 2.4, front.z - 4);
    this.camera.fov = 40;
  }

  /** The star path: Neptune, the wormhole far away, and your rocket with Zibbo aboard. */
  private buildSpace(): void {
    this.sky = addSpaceSky(this.world, SKIES.space);
    this.world.add(new HemisphereLight('#9fb0ff', '#2a1850', 0.6));
    const sun = new DirectionalLight('#fff4e2', 2.4);
    sun.position.copy(this.sunDir).multiplyScalar(100);
    this.world.add(sun);
    const r3 = S.game.r3;
    this.planet = createPlanet('neptune', 30, { renderer: r3.renderer, profile: r3.profile, detail: 'hero' });
    this.planet.group.position.set(-38, -6, -70);
    this.set.add(this.planet.group);
    this.worm = makeWormhole();
    this.worm.mesh.scale.setScalar(12);
    this.worm.mesh.position.set(46, 14, -120);
    this.set.add(this.worm.mesh);
    this.addRocket(new Vector3(6, 0, -6));
    // Your friends wave from a little moonlet in front.
    const rock = new Mesh(new IcosahedronGeometry(2.2, 2), new MeshStandardMaterial({ color: '#8a8094', roughness: 0.9, flatShading: true }));
    rock.scale.set(1.6, 0.5, 1.2);
    rock.position.set(-3, -1.6, 4);
    this.set.add(rock);
    this.addCast(new Vector3(-3, -0.55, 4.2), 1.3, 0.3);
    this.camFrom.set(-1, 0.2, 15);
    this.camTo.set(0.5, 0.4, 11);
    this.look.set(0, 0.2, -4);
    this.camera.fov = 45;
    this.camera.far = 2000;
  }

  /** Inside the wormhole: rainbow rings rushing past your rocket. */
  private buildWormhole(): void {
    this.sky = addSpaceSky(this.world, SKIES.zephyra);
    this.world.add(new HemisphereLight('#c9b0ff', '#2a1850', 0.9));
    const key = new DirectionalLight('#ffe6fb', 2);
    key.position.set(3, 5, 6);
    this.world.add(key);
    for (let i = 0; i < 16; i++) {
      const m = new Mesh(new TorusGeometry(6, 0.18, 8, 48), new MeshBasicMaterial({ color: new Color(FIREWORK_COLORS[i % FIREWORK_COLORS.length]).multiplyScalar(2), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
      m.position.z = -i * 6;
      this.rings.push(m);
      this.set.add(m);
    }
    this.worm = makeWormhole();
    this.worm.mesh.scale.setScalar(9);
    this.worm.mesh.position.set(0, 0, -110);
    this.set.add(this.worm.mesh);
    this.addRocket(new Vector3(0, 0, 0));
    if (this.rocket) this.rocket.group.rotation.set(-Math.PI / 2, 0, 0);
    this.dust = new SpeedDust(comfortOn() ? 40 : 140);
    this.set.add(this.dust.lines);
    this.camFrom.set(0, -0.9, 7.5);
    this.camTo.set(0, -0.6, 6.5);
    this.look.set(0, 1.4, -12);
    this.camera.fov = 55;
  }

  /** The finale: the Star Beacon shining again over Zephyra, everyone celebrating. */
  private buildZephyra(): void {
    const th = theme('zbeacon');
    const L = surfaceLight(th);
    const r3 = S.game.r3;
    this.world.environmentIntensity = L.envIntensity;
    const sun = new DirectionalLight(L.sunColor, L.sunIntensity);
    sun.position.copy(L.sunDir).multiplyScalar(50);
    this.world.add(sun, new HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));
    if (L.sun2) {
      const s2 = new DirectionalLight(L.sun2.color, L.sun2.intensity);
      s2.position.copy(L.sun2.dir).multiplyScalar(50);
      this.world.add(s2);
    }
    this.world.fog = new Fog(L.fog[0], 80, 380);
    this.sky = new SurfaceSky(this.world, th, L, { renderer: r3.renderer, profile: r3.profile, pixelRatio: r3.pixelRatio, x0: -40, x1: 40, seed: 7, layerZ: [-70, -160] });
    const g = new PlaneGeometry(160, 90, 40, 24);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const far = Math.max(0, -z - 6) / 30;
      pos.setY(i, Math.sin(x * 0.15) * far * 1.6 + Math.sin(z * 0.2 + x * 0.05) * far);
    }
    const col = new Float32Array(pos.count * 3).fill(1);
    g.setAttribute('color', new BufferAttribute(col, 3));
    const uv = g.attributes.uv as BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
    g.computeVertexNormals();
    this.set.add(new Mesh(g, terrainMaterial(th, 'lip')));
    this.beacon = new MachineProp('beacon');
    this.beacon.setPowered(true);
    this.beacon.group.scale.setScalar(3.2);
    this.beacon.group.position.set(0, 0, -9);
    this.set.add(this.beacon.group);
    this.beam = new Mesh(new CylinderGeometry(0.9, 1.6, 60, 24, 1, true), new MeshBasicMaterial({ color: new Color('#fff7b3').multiplyScalar(1.6), transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }));
    this.beam.position.set(0, 38, -9);
    this.set.add(this.beam);
    this.addCast(new Vector3(0, 0, 3.5), 1.35);
    this.camFrom.set(0, 2.4, 13);
    this.camTo.set(0, 1.0, 9.5);
    this.look.set(0, 2.6, -6);
    this.camera.fov = 45;
  }

  private addRocket(at: Vector3): void {
    const r = new RocketModel(S.state.data.loadout, { glossy: S.game.r3.profile.tier === 'high' });
    const e = r.extent;
    r.group.scale.setScalar(3 / (e.top - e.bottom));
    r.group.position.copy(at);
    this.rocket = r;
    this.set.add(r.group);
  }

  // ------------------------------------------------------------------ flow

  override async enter(): Promise<void> {
    this.place(0);
    if (this.p.id === 'finale') sfx('fanfare');
    if (this.p.id === 'wormhole') sfx('whoosh');
    setTimeout(() => void this.play(), 700);
  }

  private async play(): Promise<void> {
    await showDialogue(dialogue(this.def.lines));
    if (this.p.id === 'finale') {
      celebrate(120);
      await new Promise((r) => setTimeout(r, 1800));
    }
    this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.def.next();
    finishWaiters();
  }

  override exit(): void {
    for (const c of this.hidden) c.group.visible = true;
    this.hidden.length = 0;
  }

  override back(): boolean {
    this.finish();
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.fx.setScreen(window.innerHeight * S.game.r3.pixelRatio);
    this.sky?.setPixelRatio(S.game.r3.pixelRatio);
  }

  override update(dt: number): void {
    this.t += dt;
    if (this.def.backdrop === 'zephyra' || this.def.backdrop === 'academy') {
      this.fireworkT -= dt;
      if (this.fireworkT <= 0) {
        this.fireworkT = 0.55 + Math.random() * 0.6;
        const c = this.look;
        const x = c.x + (Math.random() - 0.5) * 22;
        const y = c.y + 6 + Math.random() * 6;
        const z = c.z - 6 - Math.random() * 8;
        const col = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        this.fx.burst(x, y, z, 40, 6, 1.3, 0.35, col);
        this.fx.burst(x, y, z, 14, 3.5, 1, 0.22, '#ffffff');
        sfx('firework', { volume: 0.5 });
      }
    }
    this.fx.update(dt);
  }

  /** Camera drift over the scene (calmer in Comfort mode). */
  private place(time: number): void {
    const k = Math.min(1, time / (this.def.backdrop === 'academy' ? 3.5 : comfortOn() ? 6 : 10));
    const e = k * k * (3 - 2 * k);
    this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
    if (!comfortOn()) this.camera.position.x += Math.sin(time * 0.25) * 0.4;
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }

  override render(): void {
    const time = this.time;
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime)) || 1 / 60;
    this.lastTime = time;
    this.place(time);
    this.stage?.update(dt, time);
    if (this.sky) this.sky.update(time, this.camera);
    for (const a of this.actors) a.update(dt);
    if (this.planet) this.planet.update(time, this.sunDir);
    if (this.worm) this.worm.material.uniforms.uTime.value = time;
    if (this.rocket) {
      const r = this.rocket;
      if (this.def.backdrop === 'space') {
        r.group.position.x = 6 - time * 0.25;
        r.group.rotation.set(0, -0.6, -1.25 + Math.sin(time) * 0.05);
      } else {
        r.group.position.x = Math.sin(time * 1.3) * 0.4;
        r.group.position.y = 0.7 + Math.cos(time * 1.1) * 0.3;
      }
      r.update(dt, 0.8, this.def.backdrop === 'wormhole' ? 1 : 0.3);
    }
    if (this.rings.length) {
      const speed = comfortOn() ? 14 : 30;
      for (let i = 0; i < this.rings.length; i++) {
        const m = this.rings[i];
        m.position.z += speed * dt;
        if (m.position.z > 8) m.position.z -= this.rings.length * 6;
        m.position.x = Math.sin(time * 0.8 + i) * 1.2;
        m.position.y = Math.cos(time * 0.7 + i * 0.6) * 0.9;
        m.rotation.z = time * 0.5 + i;
      }
    }
    if (this.dust) this.dust.update(this.camera.position, 0, 0, -40, comfortOn() ? 0.4 : 1.2);
    if (this.beacon) this.beacon.update(dt, time);
    if (this.beam) (this.beam.material as MeshBasicMaterial).opacity = 0.18 + Math.sin(time * 3) * 0.06;
  }
}

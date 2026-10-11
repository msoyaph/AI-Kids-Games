import * as THREE from 'three';
import type { KartConfig } from '../data/types';
import { buildKartMeshes } from './kartModel';
import { buildSky } from './sky';
import { Materials } from './materials';
import { ParticlePool } from './particles';
import type { GameRenderer } from './renderer';
import { buildRecipe } from './lowpoly';

export type MenuView = 'title' | 'showcase' | 'podium' | 'garage';

interface Showcase {
  group: THREE.Group;
}

const CONFETTI = [0xff6fae, 0xffd23f, 0x4ce0d2, 0x8cff6b, 0xb47bff, 0xff9f1c];

/**
 * The 3D backdrop behind menus: a sunny stage with a turntable. Shows the selected racer+kart,
 * a lineup on the title screen, or the trophy podium.
 */
export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
  private readonly stage = new THREE.Group();
  private readonly turntable: THREE.Mesh;
  private readonly podium: THREE.Group;
  private current: Showcase | null = null;
  private lineup: THREE.Group | null = null;
  private podiumKarts: THREE.Group | null = null;
  private readonly confetti: ParticlePool;
  private view: MenuView = 'title';
  private t = 0;
  /** Where the showcase kart sits on screen (shifted right when a side panel is open). */
  offsetX = 0;

  constructor(private readonly gr: GameRenderer) {
    buildSky(this.scene, { top: 0x6a4cff, bottom: 0xffc6e8, fog: 0xffd6ee, sun: 0xffffff, ambient: 0xffffff, ground: 0x8cff6b }, 300);
    this.scene.add(this.stage);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7ee08a }));
    ground.position.y = -0.02;
    this.stage.add(ground);
    // checkered ring around the stage
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.6, 48, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.position.y = 0.01;
    this.stage.add(ring);
    this.turntable = new THREE.Mesh(
      buildRecipe([
        { shape: 'cyl', p: [0, 0.2, 0], s: [9, 0.4, 9], c: 0x3a2696, seg: 40 },
        { shape: 'cyl', p: [0, 0.42, 0], s: [8.2, 0.06, 8.2], c: 0xffd23f, seg: 40 },
        { shape: 'cyl', p: [0, 0.46, 0], s: [7.6, 0.04, 7.6], c: 0x5a3fd6, seg: 40 },
      ]),
      Materials.flat,
    );
    this.stage.add(this.turntable);
    // decorative balloons & flags around
    const deco = buildRecipe([
      { shape: 'cyl', p: [-9, 3, -6], s: [0.15, 6, 0.15], c: 0xffffff, seg: 4 },
      { shape: 'box', p: [-8.3, 5.4, -6], s: [1.4, 0.9, 0.05], c: 0xff4d6d },
      { shape: 'cyl', p: [9, 3, -6], s: [0.15, 6, 0.15], c: 0xffffff, seg: 4 },
      { shape: 'box', p: [9.7, 5.4, -6], s: [1.4, 0.9, 0.05], c: 0x3fa7ff },
      { shape: 'sphere', p: [-12, 6, -14], s: [2, 2.4, 2], c: 0xff6fae, seg: 10 },
      { shape: 'sphere', p: [13, 7, -16], s: [2, 2.4, 2], c: 0xffd23f, seg: 10 },
      { shape: 'sphere', p: [-20, 8, -30], s: [3, 3.6, 3], c: 0x4ce0d2, seg: 10 },
      { shape: 'sphere', p: [24, 9, -34], s: [3, 3.6, 3], c: 0xb47bff, seg: 10 },
    ]);
    this.stage.add(new THREE.Mesh(deco, Materials.flat));
    // podium
    this.podium = new THREE.Group();
    const pod = buildRecipe([
      { shape: 'box', p: [0, 1.5, 0], s: [4.4, 3, 4], c: 0xffd23f },
      { shape: 'box', p: [-4.6, 1.0, 0.3], s: [4.4, 2, 4], c: 0xc0c8d8 },
      { shape: 'box', p: [4.6, 0.65, 0.3], s: [4.4, 1.3, 4], c: 0xd98a5f },
      { shape: 'box', p: [0, 2.2, 2.02], s: [1.2, 1.2, 0.05], c: 0xffffff },
      { shape: 'box', p: [-4.6, 1.3, 2.32], s: [1.2, 1.0, 0.05], c: 0xffffff },
      { shape: 'box', p: [4.6, 0.85, 2.32], s: [1.2, 0.8, 0.05], c: 0xffffff },
    ]);
    this.podium.add(new THREE.Mesh(pod, Materials.flat));
    this.podium.visible = false;
    this.stage.add(this.podium);
    this.confetti = new ParticlePool(500, false, 0.2);
    this.scene.add(this.confetti.points);
    this.setView('title');
  }

  setView(v: MenuView): void {
    this.view = v;
    this.turntable.visible = v === 'showcase' || v === 'garage';
    this.podium.visible = v === 'podium';
    if (this.lineup) this.lineup.visible = v === 'title';
    if (this.current) this.current.group.visible = v === 'showcase' || v === 'garage';
    if (this.podiumKarts) this.podiumKarts.visible = v === 'podium';
    if (v !== 'podium') this.confetti.clear();
  }

  private makeKart(racerId: string, cfg: KartConfig): THREE.Group {
    const m = buildKartMeshes(racerId, cfg);
    const g = new THREE.Group();
    g.add(m.chassis, m.driver, ...m.wheelPivots);
    return g;
  }

  /** Show one racer + kart on the turntable. */
  showKart(racerId: string, cfg: KartConfig): void {
    if (this.current) this.stage.remove(this.current.group);
    const g = this.makeKart(racerId, cfg);
    g.scale.setScalar(2.2);
    g.position.y = 0.48;
    const prevRot = this.current?.group.rotation.y ?? -0.6;
    g.rotation.y = prevRot;
    this.stage.add(g);
    this.current = { group: g };
    g.visible = this.view === 'showcase' || this.view === 'garage';
  }

  /** Title screen: a row of karts. */
  showLineup(list: Array<{ racerId: string; cfg: KartConfig }>): void {
    if (this.lineup) this.stage.remove(this.lineup);
    const g = new THREE.Group();
    list.forEach((e, i) => {
      const k = this.makeKart(e.racerId, e.cfg);
      const n = list.length;
      const a = ((i - (n - 1) / 2) / n) * 1.6;
      k.position.set(Math.sin(a) * 12, 0, -Math.cos(a) * 4 + 2);
      k.rotation.y = Math.PI * 0.85 + a * 0.4;
      k.scale.setScalar(1.8);
      g.add(k);
    });
    this.lineup = g;
    g.visible = this.view === 'title';
    this.stage.add(g);
  }

  /** Podium with the top three (index 0 = winner). */
  showPodium(top: Array<{ racerId: string; cfg: KartConfig }>): void {
    if (this.podiumKarts) this.stage.remove(this.podiumKarts);
    const g = new THREE.Group();
    const spots: Array<[number, number]> = [
      [0, 3.0],
      [-4.6, 2.0],
      [4.6, 1.3],
    ];
    top.slice(0, 3).forEach((e, i) => {
      const k = this.makeKart(e.racerId, e.cfg);
      k.position.set(spots[i][0], spots[i][1], 0.2);
      k.rotation.y = Math.PI + (i === 1 ? 0.25 : i === 2 ? -0.25 : 0);
      k.scale.setScalar(1.35);
      k.userData.bounce = i;
      g.add(k);
    });
    this.podiumKarts = g;
    g.visible = this.view === 'podium';
    this.stage.add(g);
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    switch (this.view) {
      case 'title':
        this.camera.position.set(Math.sin(t * 0.12) * 4, 5.5, 17 + Math.cos(t * 0.1) * 1.5);
        this.camera.lookAt(0, 1.6, 0);
        break;
      case 'showcase':
      case 'garage': {
        if (this.current) this.current.group.rotation.y += dt * 0.5;
        const dist = this.view === 'garage' ? 9.5 : 11;
        this.camera.position.set(this.offsetX, 3.6, dist);
        this.camera.lookAt(this.offsetX, 1.6, 0);
        break;
      }
      case 'podium': {
        this.camera.position.set(Math.sin(t * 0.25) * 3, 5.2, 14);
        this.camera.lookAt(0, 3, 0);
        if (this.podiumKarts) {
          for (const k of this.podiumKarts.children) {
            const i = k.userData.bounce as number;
            k.position.y = [3.0, 2.0, 1.3][i] + Math.abs(Math.sin(t * (i === 0 ? 5 : 3) + i)) * (i === 0 ? 0.5 : 0.2);
          }
        }
        // confetti rain
        for (let i = 0; i < 3; i++) {
          this.confetti.spawn((Math.random() - 0.5) * 18, 12 + Math.random() * 3, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2, -1, 0, 4, 0.35, 0.3, CONFETTI[Math.floor(Math.random() * CONFETTI.length)], 1, 1.2, 0.5);
        }
        break;
      }
    }
    this.confetti.update(dt);
  }

  render(): void {
    this.confetti.setViewport(this.gr.height * this.gr.renderer.getPixelRatio(), this.camera.fov);
    this.gr.render([{ scene: this.scene, camera: this.camera, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
  }
}

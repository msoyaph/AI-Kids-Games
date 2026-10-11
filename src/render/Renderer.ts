import * as THREE from 'three';
import { RUN_LENGTH } from '../config/balance';
import { mapDef, type MapDef } from '../config/maps';
import type { CharacterDef } from '../config/types';
import { lerp } from '../core/math';
import type { Terrain } from '../sim/terrain';
import { playerWind } from '../sim/weather';
import type { World } from '../sim/world';
import { CameraRig } from './CameraRig';
import { EnemyRenderer } from './EnemyRenderer';
import { Fx } from './Fx';
import { Particles } from './Particles';
import { PickupRenderer } from './PickupRenderer';
import { OCCLUSION_UNIFORMS } from './occlusion';
import { PlayerView } from './PlayerView';
import { ProjectileRenderer } from './ProjectileRenderer';
import { ShrineRenderer } from './ShrineRenderer';
import { Sky } from './Sky';
import { Snowfall } from './Snowfall';
import { buildWorldMesh } from './worldMesh';
import { ENEMIES } from '../config/enemies';
import { lowPolyMaterial } from './geo';
import { enemyGeometry, ROLLER_BODY } from './models';

export type Quality = 'low' | 'medium' | 'high';

const FOG = 0xd9e9ef;

/** Owns the WebGL context, scene graph, lights and all render subsystems. */
export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly rig = new CameraRig();
  readonly playerView = new PlayerView();
  readonly enemies = new EnemyRenderer();
  readonly pickups = new PickupRenderer();
  readonly particles = new Particles();
  readonly fx: Fx;
  readonly projectiles: ProjectileRenderer;
  readonly shrines = new ShrineRenderer();
  readonly snow = new Snowfall();
  private sun: THREE.DirectionalLight;
  private sky: Sky;
  private worldGroup: THREE.Group | null = null;
  /** Map + seed of the built world meshes (two maps can share a seed). */
  private worldKey = '';
  terrain: Terrain | null = null;
  map: MapDef = mapDef('meadow');
  private wind = new Float32Array(2);
  private clock = 0;
  /** Bestiary preview: an enemy model shown in the menu instead of the hero. */
  private showcase: THREE.Mesh | null = null;
  private showcaseGeos = new Map<string, THREE.BufferGeometry>();
  private showcaseMat = lowPolyMaterial();
  private showcaseId: string | null = null;
  quality: Quality = 'high';
  private menuT = 0;

  constructor(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, quality: Quality) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 600);

    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 55, 150);

    const hemi = new THREE.HemisphereLight(0xdff1ff, 0x6a5a4a, 1.25);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    this.sun.position.set(40, 70, 25);
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
    sc.near = 1;
    sc.far = 220;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sky = new Sky(this.scene, hemi, this.sun);
    this.sky.setMenu();
    this.scene.add(this.playerView.root);
    this.fx = new Fx(this.particles, overlay, this.rig);
    this.projectiles = new ProjectileRenderer(this.particles);
    this.scene.add(this.enemies.group, this.pickups.group, this.projectiles.group, this.shrines.group, this.fx.group, this.snow.points);
    this.setQuality(quality);
  }

  setQuality(q: Quality): void {
    this.quality = q;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const ratio = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    this.renderer.setPixelRatio(ratio);
    const shadows = q === 'high';
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    this.playerView.setShadows(shadows);
    this.enemies.setCastShadows(shadows);
    this.shrines.setShadows(shadows);
    this.enemies.shadowsEnabled = q !== 'low';
    this.particles.density = q === 'low' ? 0.4 : q === 'medium' ? 0.7 : 1;
    if (this.terrain) {
      // rebuild static meshes with the right shadow flags
      this.worldKey = '';
      this.setTerrain(this.terrain, this.map);
    }
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
  }

  setTerrain(t: Terrain, map: MapDef): void {
    this.terrain = t;
    this.map = map;
    this.sky.setMap(map);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = map.sky.fog[0];
    fog.far = map.sky.fog[1];
    this.snow.density = map.sky.snow;
    this.projectiles.setTelegraphStyle(map.palette.telegraphs === 'solid');
    const key = `${map.id}:${t.seed}`;
    if (this.worldKey === key && this.worldGroup) return;
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | undefined;
        if (mat) mat.dispose();
      });
    }
    this.worldGroup = buildWorldMesh(t, map, this.quality === 'high');
    this.scene.add(this.worldGroup);
    this.worldKey = key;
  }

  /** Show an enemy (or null: the hero again) in the menu backdrop. */
  showcaseEnemy(id: string | null): void {
    this.showcaseId = id;
    if (!this.showcase) {
      this.showcase = new THREE.Mesh(new THREE.BufferGeometry(), this.showcaseMat);
      this.showcase.castShadow = true;
      this.scene.add(this.showcase);
    }
    const def = id ? ENEMIES.find((e) => e.id === id) : undefined;
    this.showcase.visible = !!def;
    this.playerView.root.visible = !def;
    if (!def) return;
    let g = this.showcaseGeos.get(def.id);
    if (!g) {
      g = enemyGeometry(def);
      this.showcaseGeos.set(def.id, g);
    }
    this.showcase.geometry = g;
    // big bosses are shown smaller so they fit beside the menu
    const s = Math.min(1.6, 2.6 / def.height);
    this.showcase.scale.setScalar(s);
    this.showcase.userData.lift = def.roll ? ROLLER_BODY * s : 0;
  }

  setCharacter(def: CharacterDef): void {
    this.playerView.setCharacter(def, this.quality === 'high');
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.fx.numbers.resize(w, h, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private followSun(x: number, z: number): void {
    const e = this.sky.elev;
    const horiz = 80 * (1 - e) + 15;
    this.sun.position.set(x + horiz * 0.85, 20 + e * 70, z + horiz * 0.5);
    this.sun.target.position.set(x, 0, z);
    this.sky.follow(x, z);
  }

  private setDynamicVisible(on: boolean): void {
    this.enemies.group.visible = on;
    this.pickups.group.visible = on;
    this.projectiles.group.visible = on;
    this.shrines.group.visible = on;
    this.fx.group.visible = on;
  }

  /** Gameplay frame: interpolate sim state by alpha. */
  renderGame(w: World, alpha: number, dt: number): void {
    this.setDynamicVisible(true);
    this.sky.setRunProgress(Math.min(1, w.time / RUN_LENGTH));
    const p = w.player;
    const x = lerp(p.px, p.x, alpha);
    const y = lerp(p.py, p.y, alpha);
    const z = lerp(p.pz, p.z, alpha);
    const speed = Math.hypot(p.vx, p.vz);
    const gy = w.terrain.height(x, z);
    this.playerView.update(x, y, z, gy, p.yaw, speed, p.onGround, p.sliding, p.vy, dt, w.time, p.iframes > 0 || p.buffs.ward > 0);
    // momentum feedback: wind streaks when moving fast, sparks when sliding
    if (dt > 0 && speed > 11) {
      const n = Math.min(3, (speed - 11) * 0.15 + Math.random());
      for (let k = 0; k < n; k++) {
        const side = (Math.random() - 0.5) * 1.6;
        const cx = Math.cos(p.yaw);
        const sx = Math.sin(p.yaw);
        this.particles.emit(x + cx * side, y + 0.4 + Math.random() * 1.2, z - sx * side, -p.vx * 0.15, 0.2, -p.vz * 0.15, 0.35, 0.12, 0xeaf6ff, 0);
      }
    }
    if (dt > 0 && p.sliding && p.onGround && speed > 4 && Math.random() < 0.6) {
      this.particles.emit(x, y + 0.1, z, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.4, 0.18, 0xd8c8a8, 6);
    }
    if (p.buffs.ward > 0 && dt > 0 && Math.random() < 0.4) {
      const a = Math.random() * Math.PI * 2;
      this.particles.emit(x + Math.cos(a) * 1.1, y + Math.random() * 2, z + Math.sin(a) * 1.1, 0, 1.5, 0, 0.5, 0.14, 0xfff2a8, 0);
    }
    this.rig.update(this.camera, x, y, z, speed, dt, w.terrain);
    this.updateWeather(w, x, z, dt);
    OCCLUSION_UNIFORMS.uCamPos.value.copy(this.camera.position);
    OCCLUSION_UNIFORMS.uFocus.value.set(x, y + 1.1, z);
    this.playerView.showGhost = true;
    this.followSun(x, z);
    const time = w.time + alpha / 60;
    this.enemies.update(w, alpha, time);
    this.pickups.update(w, alpha, time);
    this.projectiles.update(w, alpha, time, x, y, z);
    this.shrines.update(w, time);
    this.fx.update(dt, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  /** Snowfall + blizzard haze follow the sim's weather. */
  private updateWeather(w: World, x: number, z: number, dt: number): void {
    this.clock += dt;
    this.sky.tick(this.clock);
    const wt = w.weather;
    const blizzard = wt.blizzardT > 0 ? Math.min(1, wt.blizzardT / 0.6, (5.5 - wt.blizzardT) / 0.6) : 0;
    if (wt.gustT > 0 || wt.blizzardT > 0) playerWind(w, x, z, this.wind);
    else this.wind[0] = this.wind[1] = 0;
    this.snow.density = this.map.sky.snow * (1 + blizzard * 1.5);
    this.snow.update(dt, this.camera.position, this.wind[0], this.wind[1]);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.map.sky.fog[0] * (1 - blizzard * 0.55);
    fog.far = this.map.sky.fog[1] * (1 - blizzard * 0.5);
  }

  /** Clear all transient visuals (new run / back to menu). */
  resetTransient(): void {
    this.fx.clear();
  }

  /** Menu backdrop: slow orbit around the showcased character. */
  renderMenu(dt: number): void {
    this.setDynamicVisible(false);
    this.sky.setMenu();
    OCCLUSION_UNIFORMS.uFocus.value.set(0, -1e5, 0);
    this.playerView.showGhost = false;
    this.menuT += dt;
    const t = this.terrain;
    const y = t ? t.height(0, 0) : 0;
    if (this.showcase && this.showcaseId) {
      this.showcase.position.set(0, y + (this.showcase.userData.lift as number), 0);
      this.showcase.rotation.y = Math.PI * 0.15 + this.menuT * 0.5;
    }
    this.playerView.update(0, y, 0, y, Math.PI * 0.15 + Math.sin(this.menuT * 0.4) * 0.3, 0, true, false, 0, dt, this.menuT, false);
    const a = Math.sin(this.menuT * 0.12) * 0.5;
    this.camera.position.set(Math.sin(a) * 8, y + 2.6, Math.cos(a) * 8);
    // aim left of the hero so it sits on the right, clear of the menus
    const off = this.camera.aspect > 1.2 ? 2.6 : 0.8;
    this.camera.lookAt(-Math.cos(a) * off, y + 1.4, Math.sin(a) * off);
    if (this.camera.fov !== 55) {
      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();
    }
    this.followSun(0, 0);
    this.clock += dt;
    this.sky.tick(this.clock);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.map.sky.fog[0];
    fog.far = this.map.sky.fog[1];
    this.snow.density = this.map.sky.snow * 0.6;
    this.snow.update(dt, this.camera.position, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

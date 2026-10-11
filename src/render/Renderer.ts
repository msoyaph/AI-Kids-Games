import * as THREE from 'three';
import type { CharacterDef } from '../config/types';
import { lerp } from '../core/math';
import type { Terrain } from '../sim/terrain';
import type { World } from '../sim/world';
import { CameraRig } from './CameraRig';
import { PlayerView } from './PlayerView';
import { buildWorldMesh } from './worldMesh';

export type Quality = 'low' | 'medium' | 'high';

const SKY_TOP = 0x5fb4f0;
const SKY_HORIZON = 0xfce3c4;
const FOG = 0xd9e9ef;

/** Owns the WebGL context, scene graph, lights and all render subsystems. */
export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly rig = new CameraRig();
  readonly playerView = new PlayerView();
  private sun: THREE.DirectionalLight;
  private worldGroup: THREE.Group | null = null;
  private worldSeed = -1;
  terrain: Terrain | null = null;
  quality: Quality = 'high';
  private menuT = 0;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 600);

    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 55, 150);
    this.scene.add(this.buildSky());

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
    this.scene.add(this.playerView.root);
    this.setQuality(quality);
  }

  private buildSky(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(500, 16, 10);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const top = new THREE.Color(SKY_TOP);
    const hor = new THREE.Color(SKY_HORIZON);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 500);
      c.copy(hor).lerp(top, Math.pow(t, 0.6));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'sky';
    sky.renderOrder = -10;
    return sky;
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
    if (this.terrain) {
      // rebuild static meshes with the right shadow flags
      this.worldSeed = -1;
      this.setTerrain(this.terrain);
    }
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
  }

  setTerrain(t: Terrain): void {
    this.terrain = t;
    if (this.worldSeed === t.seed && this.worldGroup) return;
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | undefined;
        if (mat) mat.dispose();
      });
    }
    this.worldGroup = buildWorldMesh(t, this.quality === 'high');
    this.scene.add(this.worldGroup);
    this.worldSeed = t.seed;
  }

  setCharacter(def: CharacterDef): void {
    this.playerView.setCharacter(def, this.quality === 'high');
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private followSun(x: number, z: number): void {
    this.sun.position.set(x + 40, 70, z + 25);
    this.sun.target.position.set(x, 0, z);
  }

  /** Gameplay frame: interpolate sim state by alpha. */
  renderGame(w: World, alpha: number, dt: number): void {
    const p = w.player;
    const x = lerp(p.px, p.x, alpha);
    const y = lerp(p.py, p.y, alpha);
    const z = lerp(p.pz, p.z, alpha);
    const speed = Math.hypot(p.vx, p.vz);
    const gy = w.terrain.height(x, z);
    this.playerView.update(x, y, z, gy, p.yaw, speed, p.onGround, p.sliding, p.vy, dt, w.time, p.iframes > 0 || p.buffs.ward > 0);
    this.rig.update(this.camera, x, y, z, speed, dt, w.terrain);
    this.followSun(x, z);
    this.renderer.render(this.scene, this.camera);
  }

  /** Menu backdrop: slow orbit around the showcased character. */
  renderMenu(dt: number): void {
    this.menuT += dt;
    const t = this.terrain;
    const y = t ? t.height(0, 0) : 0;
    this.playerView.update(0, y, 0, y, Math.PI * 0.15 + Math.sin(this.menuT * 0.4) * 0.3, 0, true, false, 0, dt, this.menuT, false);
    const a = this.menuT * 0.06;
    this.camera.position.set(Math.sin(a) * 9, y + 3.2, Math.cos(a) * 9);
    this.camera.lookAt(0, y + 1.3, 0);
    if (this.camera.fov !== 55) {
      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();
    }
    this.followSun(0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

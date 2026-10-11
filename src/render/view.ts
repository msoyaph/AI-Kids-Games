// GameView: builds the Three.js scene from the simulation and keeps it in sync.
import * as THREE from 'three';
import type { Game } from '../sim/game';
import { CameraRig } from './camera';
import { sharedUniforms } from './curve';
import { buildStructure } from './models/buildings';
import { animateRig, buildCharacter, OUTFIT_COLORS, SKIN_TONES, type Rig } from './models/character';
import { ObjectRenderer, type ItemVisual } from './objects';
import { Sky } from './sky';
import { TerrainRenderer, WaterRenderer } from './terrain';
import { equippedTool } from '../sim/tools';
import { toolMesh } from './models/tools';
import { LEVEL_HEIGHT } from '../world/types';

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly sky: Sky;
  private terrain!: TerrainRenderer;
  private water!: WaterRenderer;
  objects!: ObjectRenderer;
  private structGroup = new THREE.Group();
  private structMeshes = new Map<number, { obj: THREE.Group; key: string }>();
  player!: Rig;
  private islandRoot = new THREE.Group();
  private game!: Game;
  time = 0;
  /** 'title' orbits the island; 'creator' frames the player close up */
  preview: 'title' | 'creator' | null = null;
  private heldKey = '';
  private orbit = 0;

  constructor(private canvas: HTMLCanvasElement, private itemVisual: ItemVisual) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.rig = new CameraRig(1);
    this.sky = new Sky(this.scene);
    this.scene.add(this.islandRoot);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / Math.max(1, h));
  }

  /** (Re)build everything for a game. */
  attach(game: Game): void {
    this.game = game;
    this.islandRoot.clear();
    this.structMeshes.clear();
    this.structGroup = new THREE.Group();
    this.terrain = new TerrainRenderer(game.world.gen);
    this.water = new WaterRenderer(game.world.size / 2);
    this.objects = new ObjectRenderer(game.world, this.itemVisual);
    this.islandRoot.add(this.terrain.group, this.water.mesh, this.objects.group, this.structGroup);
    this.objects.rebuild();
    this.syncStructures();
    this.rebuildPlayer();
    const p = game.state.player;
    this.rig.snap(p.x, p.level * LEVEL_HEIGHT, p.z);
    game.bus.on('objectsChanged', () => (this.objects.dirty = true));
    game.bus.on('structuresChanged', () => this.syncStructures());
    game.bus.on('fx', (f) => {
      if (f.kind === 'rockHit') this.rig.shake = 0.6;
    });
  }

  /** Project a world point (with the world curve applied) to CSS pixels. */
  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const o = sharedUniforms.uCurveOrigin.value;
    const k = sharedUniforms.uCurveK.value;
    const dx = x - o.x, dz = z - o.z;
    const v = new THREE.Vector3(x, y - (dz * dz * k + dx * dx * k * 0.3), z).project(this.rig.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
  }

  rebuildPlayer(): void {
    if (this.player) this.islandRoot.remove(this.player.root);
    const look = this.game.state.player.look;
    this.player = buildCharacter({
      species: 'human',
      skin: SKIN_TONES[look.skin] ?? SKIN_TONES[0]!,
      outfit: OUTFIT_COLORS[look.outfit] ?? OUTFIT_COLORS[0]!,
      hairStyle: look.hair,
      hairColor: look.hairColor,
      eyes: look.eyes,
      mouth: look.mouth,
      blush: look.blush,
    });
    this.islandRoot.add(this.player.root);
    this.heldKey = '';
  }

  private syncHeld(): void {
    const t = equippedTool(this.game);
    const key = t ? t.kind + (t.sturdy ? 's' : 'f') : '';
    if (key === this.heldKey) return;
    this.heldKey = key;
    this.player.hand.clear();
    if (t) this.player.hand.add(toolMesh(t.kind, t.sturdy));
  }

  syncStructures(): void {
    const s = this.game.state;
    const seen = new Set<number>();
    for (const st of s.world.structures) {
      seen.add(st.id);
      const key = `${st.type}|${st.x}|${st.z}|${st.v ?? 0}|${st.type === 'home' ? s.home.level : ''}|${st.type === 'lighthouse' ? s.flags.lighthouseLit ?? 0 : ''}`;
      const cur = this.structMeshes.get(st.id);
      if (cur && cur.key === key) continue;
      if (cur) this.structGroup.remove(cur.obj);
      const obj = buildStructure(st, { homeLevel: s.home.level, lit: !!s.flags.lighthouseLit });
      obj.position.set(st.x, st.level * LEVEL_HEIGHT, st.z);
      this.structGroup.add(obj);
      this.structMeshes.set(st.id, { obj, key });
    }
    for (const [id, v] of this.structMeshes)
      if (!seen.has(id)) {
        this.structGroup.remove(v.obj);
        this.structMeshes.delete(id);
      }
  }

  frame(dt: number): void {
    const g = this.game;
    this.time += dt;
    sharedUniforms.uTime.value = this.time;
    const p = g.state.player;
    if (this.objects.dirty) this.objects.rebuild();
    this.syncHeld();
    const y = g.world.surfaceY(p.x, p.z);
    this.player.root.position.set(p.x, y, p.z);
    this.player.root.rotation.y = p.facing;
    this.player.root.visible = p.location === 'island' && this.preview !== 'title';
    const a = g.action;
    animateRig(this.player, dt, {
      speed: g.motion.speed,
      action: a ? Math.min(1, a.t / a.dur) : -1,
      actionKind: a ? a.kind : equippedTool(g) ? 'hold' : '',
    });
    if (this.preview === 'title') {
      this.orbit += dt * 0.05;
      const N = g.world.size;
      const r = N * 0.28;
      this.rig.follow(N / 2 + Math.cos(this.orbit) * r, 0, N / 2 + 6 + Math.sin(this.orbit) * r * 0.7, dt);
    } else if (this.preview === 'creator') {
      this.rig.zoomOverride = 0.28;
      this.rig.pitchOverride = 14;
      this.rig.follow(p.x + 1.3, y + 0.25, p.z, dt);
    } else {
      this.rig.zoomOverride = 1;
      this.rig.pitchOverride = null;
      this.rig.follow(p.x, Math.max(0, y), p.z, dt);
    }
    sharedUniforms.uCurveOrigin.value.copy(this.rig.target);
    this.sky.update(g.state.clock.minute, g.state.weather.today, this.rig.target);
    this.renderer.render(this.scene, this.rig.camera);
  }
}

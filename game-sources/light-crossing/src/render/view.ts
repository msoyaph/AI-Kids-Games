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
  playerAnim = { action: -1, kind: '' as string };

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
    const y = g.world.surfaceY(p.x, p.z);
    this.player.root.position.set(p.x, y, p.z);
    this.player.root.rotation.y = p.facing;
    animateRig(this.player, dt, {
      speed: g.motion.speed,
      action: this.playerAnim.action,
      actionKind: this.playerAnim.kind,
    });
    this.rig.follow(p.x, Math.max(0, y), p.z, dt);
    sharedUniforms.uCurveOrigin.value.copy(this.rig.target);
    this.sky.update(g.state.clock.minute, g.state.weather.today, this.rig.target);
    this.renderer.render(this.scene, this.rig.camera);
  }
}

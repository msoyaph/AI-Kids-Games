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
import { CritterView } from './critters';
import { InteriorView, furnitureObject } from './interior';
import { SEASONS } from '../sim/seasons';
import { EventsView } from './events';
import { wornVisuals } from '../sim/wardrobe';
import { AgentView } from './agents';
import { PlacementView } from './placement';
import { FestivalScene, LighthouseBeam } from './cutscene';
import { agents as agentsOf } from '../sim/agents';
import { Particles } from './particles';
import { setThumbProvider } from '../ui/icons';
import { LEVEL_HEIGHT } from '../world/types';
import { QUALITY, type QualitySpec } from './quality';

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly sky: Sky;
  terrain!: TerrainRenderer;
  water!: WaterRenderer;
  objects!: ObjectRenderer;
  critters!: CritterView;
  agents!: AgentView;
  placement!: PlacementView;
  particles!: Particles;
  events!: EventsView;
  festival = new FestivalScene();
  beam = new LighthouseBeam();
  onFestivalEnd: (() => void) | null = null;
  readonly interior = new InteriorView();
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
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.rig = new CameraRig(1);
    this.sky = new Sky(this.scene);
    this.scene.add(this.islandRoot);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    setThumbProvider((id) => this.thumbnail(id));
  }

  private thumbTarget: THREE.WebGLRenderTarget | null = null;
  private thumbScene: THREE.Scene | null = null;
  private thumbCam: THREE.PerspectiveCamera | null = null;
  private thumbPixels = new Uint8Array(96 * 96 * 4);
  private thumbCanvas: HTMLCanvasElement | null = null;

  /**
   * Render a furniture item to a small PNG data URL (inventory icons). Uses the main renderer and a
   * tiny render target — a second WebGL context costs a lot of memory on iPads.
   */
  thumbnail(id: string): string | null {
    const obj = furnitureObject(id);
    if (!obj) return null;
    const S = 96;
    try {
      if (!this.thumbTarget) {
        this.thumbTarget = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
        this.thumbTarget.texture.colorSpace = THREE.SRGBColorSpace;
        this.thumbScene = new THREE.Scene();
        this.thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9a8aa0, 2.2));
        const d = new THREE.DirectionalLight(0xffffff, 1.4);
        d.position.set(3, 5, 4);
        this.thumbScene.add(d);
        this.thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        this.thumbCanvas = document.createElement('canvas');
        this.thumbCanvas.width = this.thumbCanvas.height = S;
      }
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const r = Math.max(size.x, size.y, size.z) * 0.95 + 0.15;
      this.thumbCam!.position.set(center.x + r * 1.3, center.y + r * 1.1, center.z + r * 2.0);
      this.thumbCam!.lookAt(center);
      this.thumbScene!.add(obj);
      const R = this.renderer;
      const k = sharedUniforms.uCurveK.value;
      sharedUniforms.uCurveK.value = 0;
      const prevTarget = R.getRenderTarget();
      const prevColor = R.getClearColor(new THREE.Color());
      const prevAlpha = R.getClearAlpha();
      const prevShadow = R.shadowMap.enabled;
      R.shadowMap.enabled = false;
      R.setRenderTarget(this.thumbTarget);
      R.setClearColor(0x000000, 0);
      R.clear();
      R.render(this.thumbScene!, this.thumbCam!);
      R.readRenderTargetPixels(this.thumbTarget, 0, 0, S, S, this.thumbPixels);
      R.setRenderTarget(prevTarget);
      R.setClearColor(prevColor, prevAlpha);
      R.shadowMap.enabled = prevShadow;
      sharedUniforms.uCurveK.value = k;
      this.thumbScene!.remove(obj);
      // pixels come bottom-up: flip into a 2D canvas
      const ctx = this.thumbCanvas!.getContext('2d')!;
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(this.thumbPixels.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
      ctx.putImageData(img, 0, 0);
      return this.thumbCanvas!.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / Math.max(1, h));
    this.interior.resize(w / Math.max(1, h));
  }

  /** (Re)build everything for a game. */
  attach(game: Game): void {
    this.game = game;
    this.islandRoot.clear();
    this.structMeshes.clear();
    this.structGroup = new THREE.Group();
    this.terrain = new TerrainRenderer(game.world.gen, SEASONS[game.state.season?.index ?? 0]);
    this.water = new WaterRenderer(game.world.size / 2, game.world.gen);
    this.objects = new ObjectRenderer(game.world, this.itemVisual);
    this.critters = new CritterView(game);
    this.agents = new AgentView(game);
    this.placement = new PlacementView(game);
    this.particles = new Particles(game);
    this.events = new EventsView(game);
    this.islandRoot.add(this.terrain.group, this.water.mesh, this.water.extras, this.objects.group, this.structGroup, this.critters.group, this.agents.group, this.placement.group, this.festival.group, this.beam.pivot, this.particles.group, this.events.group);
    this.objects.setSeason(SEASONS[game.state.season?.index ?? 0]!);
    this.applyQuality(this.quality);
    this.objects.rebuild();
    this.syncStructures();
    this.rebuildPlayer();
    const p = game.state.player;
    this.rig.snap(p.x, p.level * LEVEL_HEIGHT, p.z);
    game.bus.on('objectsChanged', () => (this.objects.dirty = true));
    game.bus.on('seasonChanged', () => this.applySeason());
    game.bus.on('outfitChanged', () => this.rebuildPlayer());
    game.bus.on('structuresChanged', () => this.syncStructures());
    game.bus.on('fx', (f) => {
      if (f.kind === 'rockHit') this.rig.shake = 0.6;
    });
  }

  startFestival(): void {
    this.festival.start(this.game);
    this.rig.snap(this.festival.cam.target.x, this.festival.cam.target.y, this.festival.cam.target.z);
  }

  stopFestival(): void {
    this.festival.stop();
    for (const a of agentsOf(this.game).values()) a.talking = false;
  }

  /** current quality tier settings */
  quality: QualitySpec = QUALITY.medium;

  /** Apply a quality tier (pixel ratio, shadows, grass, foam, sway, particles, fog). */
  applyQuality(spec: QualitySpec): void {
    this.quality = spec;
    this.renderer.setPixelRatio(Math.min(spec.pixelRatio, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = spec.shadows;
    this.sky.setShadows(spec.shadows);
    this.sky.setQuality(spec.shadowMap, spec.shadowRadius, spec.fogFar);
    this.interior.setShadows(spec.shadows);
    if (this.objects) this.objects.setQuality(spec.grass, spec.treeSway);
    if (this.water) this.water.extras.visible = spec.foam;
    if (this.particles) this.particles.amount = spec.particles;
    this.resize();
  }

  /** Recolor the island when the season changes. */
  applySeason(): void {
    const season = SEASONS[this.game.state.season?.index ?? 0]!;
    this.terrain.setSeason(season);
    this.objects.setSeason(season);
  }

  /** Project a world point (with the world curve applied) to CSS pixels. Indoors, (x,z) are room coordinates. */
  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    if (this.game.state.player.location !== 'island' && this.preview === null) {
      const v = new THREE.Vector3(x, y, z).project(this.interior.camera);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
    }
    const o = sharedUniforms.uCurveOrigin.value;
    const k = sharedUniforms.uCurveK.value;
    const dx = x - o.x, dz = z - o.z;
    const v = new THREE.Vector3(x, y - (dz * dz * k + dx * dx * k * 0.3), z).project(this.rig.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
  }

  rebuildPlayer(): void {
    // may be inside an interior scene right now
    if (this.player) this.player.root.removeFromParent();
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
      clothes: this.game.state.wardrobe ? wornVisuals(this.game.state) : undefined,
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
    if (p.location !== 'island' && this.preview === null) {
      this.syncHeld();
      const k = sharedUniforms.uCurveK.value;
      sharedUniforms.uCurveK.value = 0;
      this.interior.frame(dt, g, this.player, this.renderer);
      sharedUniforms.uCurveK.value = k;
      return;
    }
    if (this.player.root.parent !== this.islandRoot) {
      this.islandRoot.add(this.player.root);
      this.interior.release();
    }
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
    if (this.festival.active) {
      const c = this.festival.cam;
      this.rig.zoomOverride = c.dist / this.rig.baseDistance / this.rig.settings.zoom;
      this.rig.pitchOverride = c.pitch;
      this.rig.follow(c.target.x, c.target.y, c.target.z, dt);
      if (!this.festival.frame(dt, g)) {
        this.rig.zoomOverride = 1;
        this.rig.pitchOverride = null;
        const cb = this.onFestivalEnd;
        this.onFestivalEnd = null;
        cb?.();
      }
    } else if (this.preview === 'title') {
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
    this.water.follow(this.rig.target.x, this.rig.target.z);
    this.terrain.floor.position.x = this.rig.target.x;
    this.terrain.floor.position.z = this.rig.target.z;
    this.critters.frame(dt, this.rig.target, this.sky.night);
    this.agents.frame(dt);
    this.beam.frame(g, this.time, this.sky.night);
    this.particles.frame(dt, this.sky.night, this.rig.target);
    this.events.frame(dt, this.rig.target);
    this.placement.frame();
    this.sky.season = g.state.season?.index ?? 1;
    this.sky.update(g.state.clock.minute, g.state.weather.today, this.rig.target);
    this.water.frame(dt, g.state.clock.minute / 60, this.sky.night, this.rig.target, g.state.season?.index === 3);
    this.renderer.render(this.scene, this.rig.camera);
  }
}


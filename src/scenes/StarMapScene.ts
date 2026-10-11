import {
  AdditiveBlending,
  BackSide,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { approach, clamp } from '../core/mathx';
import { Rng } from '../core/rng';
import { BODY_BY_ID, SYSTEMS, systemOf, type SystemDef, type SystemId } from '../data/bodies';
import { drawToCanvas } from '../gfx/canvas';
import { drawGlyph } from '../gfx/art/glyphs';
import { OUTPUT_GLSL } from '../r3/materials';
import { simpleRocket } from '../r3/models/placeholders';
import { addSpaceSky } from '../r3/space/backdrop';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { makeWormhole } from '../r3/space/wormhole';
import {
  BELT,
  DIST_MAX,
  DIST_MIN,
  focusDistance,
  MAP_SLOTS,
  orbitCameraPosition,
  pickTarget,
  PITCH_MAX,
  PITCH_MIN,
  slotPosition,
  SUN_SIZE,
  type ScreenTarget,
} from '../systems/orbitMap';
import { h, setText } from '../ui/dom';
import { bodyPicture } from '../ui/pictures';
import { tip } from '../ui/tips';
import { button, iconEl } from '../ui/widgets';
import { mapHooks } from './mapHooks';

interface Moon {
  view: PlanetView;
  dist: number;
  speed: number;
  phase: number;
  tilt: number;
}

interface Node {
  sys: SystemDef;
  pos: Vector3;
  size: number;
  view: PlanetView | null;
  obj: Object3D;
  label: HTMLElement;
  unlocked: boolean;
  moons: Moon[];
  screen: ScreenTarget;
}

const MOONS: Partial<Record<SystemId, string[]>> = {
  earth: ['moon'],
  mars: ['phobos', 'deimos'],
  belt: ['vesta'],
  jupiter: ['io', 'europa', 'ganymede', 'callisto'],
  saturn: ['titan', 'enceladus'],
  uranus: ['miranda'],
  neptune: ['triton'],
  pluto: ['charon'],
  zephyra: ['tibble', 'tobble'],
};

const TUNNEL_FRAG = /* glsl */ `
uniform float uTime;
uniform float uFade;
varying vec2 vUv;
float hash(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
void main() {
  float lanes = 160.0;
  float lane = floor(vUv.x * lanes);
  float across = abs(fract(vUv.x * lanes) - 0.5) * 2.0;
  float speed = 1.2 + hash(lane) * 2.2;
  float y = fract(vUv.y * 1.6 + uTime * speed + hash(lane + 3.0));
  float len = 0.15 + hash(lane + 5.0) * 0.25;
  float streak = smoothstep(0.0, 0.03, y) * smoothstep(len, 0.0, y) * step(0.62, hash(lane + 7.0));
  float thin = smoothstep(0.55, 0.0, across);
  vec3 col = mix(vec3(0.5, 0.65, 1.0), vec3(1.0, 0.65, 0.95), hash(lane + 1.0)) * 1.8;
  float a = streak * thin * uFade * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}`;

/** The 3D Star Map: the solar system from above. Drag to turn, pinch to zoom, tap a planet to fly. */
export class StarMapScene extends Scene3D {
  private sky: SpaceSky;
  private sun: PlanetView;
  private nodes: Node[] = [];
  private selected: Node | null = null;
  private card: HTMLElement;
  private cardPic: HTMLElement;
  private cardName: HTMLElement;
  private cardText: HTMLElement;
  private cardTag: HTMLElement;
  private flyBtn: HTMLButtonElement;
  private goalEl: HTMLElement;
  private current: SystemId;
  private targetSys: SystemId | null;
  // Camera rig.
  private readonly target = new Vector3();
  private readonly targetGoal = new Vector3();
  private yaw = 0.5;
  private yawGoal = 0.5;
  private pitch = 0.95;
  private pitchGoal = 0.95;
  private dist = 70;
  private distGoal = 70;
  // Pointers.
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
  private pinchDist = 0;
  private moved = 0;
  // Decorations.
  private selRing: Mesh;
  private here: Group;
  private hereFlame: Mesh;
  private route: InstancedMesh;
  private belt: Group;
  private worm: { mesh: Mesh; material: ShaderMaterial } | null = null;
  private zephyraSuns: Mesh[] = [];
  // Launch cinematic.
  private launch: { t: number; from: Node; to: Node; done: boolean } | null = null;
  private tunnel: Mesh;
  private tunnelMat: ShaderMaterial;
  private readonly baseFov = 42;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly tmpQ = new Quaternion();
  private readonly tmpM = new Matrix4();
  private readonly sunPos = new Vector3();
  private readonly zSunPos = new Vector3();
  private readonly launchPos = new Vector3();
  private readonly comfort = comfortOn();

  constructor() {
    super('map');
    this.music = 'map';
    this.current = systemOf(S.state.data.location).id;
    this.targetSys = mapHooks.targetSystem();
    this.camera.fov = this.baseFov;
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
    this.world.add(this.camera);
    this.sky = addSpaceSky(this.world, SKIES.menu);
    const r3 = S.game.r3;
    const prof = r3.profile;
    this.world.add(new HemisphereLight('#9aa6ff', '#241640', 0.35));
    const light = new PointLight('#fff2dc', 2.2, 0, 0);
    this.world.add(light);

    this.sun = createPlanet('sun', SUN_SIZE, { renderer: r3.renderer, profile: prof, detail: 'normal' });
    this.world.add(this.sun.group);

    // Orbits.
    const chapter = S.state.data.chapter;
    for (const sys of SYSTEMS) {
      if (sys.id === 'wormhole' || sys.id === 'zephyra') continue;
      const slot = MAP_SLOTS[sys.id];
      const unlocked = mapHooks.isUnlocked(sys, chapter);
      const ring = new Mesh(
        new RingGeometry(slot.orbit - 0.035, slot.orbit + 0.035, 320),
        new MeshBasicMaterial({ color: unlocked ? '#a99cff' : '#4a3d8c', transparent: true, opacity: unlocked ? 0.3 : 0.14, side: DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      if (slot.y) {
        const axis = new Vector3(-Math.sin(slot.angle), 0, Math.cos(slot.angle));
        const g = new Group();
        g.add(ring);
        g.quaternion.setFromAxisAngle(axis, -Math.asin(slot.y / slot.orbit));
        this.world.add(g);
      } else this.world.add(ring);
    }

    // The asteroid belt.
    this.belt = new Group();
    const rocks = prof.tier === 'low' ? 220 : prof.tier === 'medium' ? 420 : 700;
    const rockMesh = new InstancedMesh(new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ color: '#8b8279', roughness: 0.95, flatShading: true }), rocks);
    const rng = new Rng('map-belt');
    const m = new Matrix4();
    const q = new Quaternion();
    const sc = new Vector3();
    const pos = new Vector3();
    for (let i = 0; i < rocks; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = BELT.orbit + rng.range(-BELT.width / 2, BELT.width / 2) * (0.6 + rng.next() * 0.4);
      pos.set(Math.cos(a) * r, rng.range(-0.35, 0.35), Math.sin(a) * r);
      q.setFromAxisAngle(sc.set(rng.next(), rng.next(), rng.next()).normalize(), rng.range(0, 6));
      const s = rng.range(0.05, 0.17) * (rng.next() < 0.05 ? 1.8 : 1);
      sc.set(s, s * rng.range(0.6, 1), s * rng.range(0.7, 1));
      m.compose(pos, q, sc);
      rockMesh.setMatrixAt(i, m);
    }
    rockMesh.instanceMatrix.needsUpdate = true;
    this.belt.add(rockMesh);
    this.world.add(this.belt);

    // Planets.
    for (const sys of SYSTEMS) {
      const slot = MAP_SLOTS[sys.id];
      const p = slotPosition(sys.id);
      const node: Node = {
        sys,
        pos: new Vector3(p.x, p.y, p.z),
        size: slot.size,
        view: null,
        obj: new Group(),
        label: h('div', { class: 'map-label' }),
        unlocked: mapHooks.isUnlocked(sys, chapter),
        moons: [],
        screen: { id: sys.id, x: 0, y: 0, r: 0, visible: false },
      };
      node.obj.position.copy(node.pos);
      if (sys.id === 'wormhole') {
        this.worm = makeWormhole();
        this.worm.mesh.scale.setScalar(slot.size * 1.3);
        node.obj.add(this.worm.mesh);
      } else {
        const view = createPlanet(sys.main, slot.size, { renderer: r3.renderer, profile: prof, detail: slot.size > 1.5 ? 'normal' : 'small' });
        node.view = view;
        node.obj.add(view.group);
        if (!node.unlocked) view.setDim(0.16);
        const moons = MOONS[sys.id] ?? [];
        moons.forEach((id, i) => {
          const ms = Math.max(0.14, Math.min(0.32, (BODY_BY_ID[id]?.radius ?? 40) / 300));
          const mv = createPlanet(id, ms, { renderer: r3.renderer, profile: prof, detail: 'small', segments: 24, halo: false });
          if (!node.unlocked) mv.setDim(0.16);
          node.obj.add(mv.group);
          node.moons.push({ view: mv, dist: slot.size * (1.7 + i * 0.55) + 0.35, speed: 0.35 / (1 + i * 0.6), phase: i * 2.1 + slot.angle, tilt: (i % 2 ? 0.15 : -0.1) });
        });
      }
      this.world.add(node.obj);
      node.label.append(h('span', null, node.unlocked ? sys.name : '???'));
      if (!node.unlocked) node.label.prepend(iconEl('lock'));
      node.label.classList.toggle('locked', !node.unlocked);
      this.ui.append(node.label);
      this.nodes.push(node);
    }

    // Zephyra's two suns, far away beyond the wormhole.
    const zeph = this.nodes.find((n) => n.sys.id === 'zephyra')!;
    this.zSunPos.copy(zeph.pos).add(new Vector3(7, 3, -5));
    const zsun = (color: string, s: number, off: Vector3) => {
      const glow = new Mesh(
        new SphereGeometry(1, 24, 12),
        new MeshBasicMaterial({ color: new Color(color).multiplyScalar(4), toneMapped: true }),
      );
      glow.scale.setScalar(s);
      glow.position.copy(this.zSunPos).add(off);
      this.world.add(glow);
      this.zephyraSuns.push(glow);
    };
    zsun('#ffb36b', 0.9, new Vector3(0, 0, 0));
    zsun('#ffd6f2', 0.45, new Vector3(-2.2, 1.4, 1.2));
    for (const s of this.zephyraSuns) s.visible = zeph.unlocked;

    // Selection ring, route dots, and your rocket.
    this.selRing = new Mesh(new TorusGeometry(1, 0.03, 8, 96), new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(1.5) }));
    this.world.add(this.selRing);
    this.route = new InstancedMesh(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: new Color('#fff3b0').multiplyScalar(2.0) }), 48);
    this.route.count = 0;
    this.route.frustumCulled = false;
    this.world.add(this.route);
    const rk = simpleRocket();
    this.here = rk.group;
    this.hereFlame = rk.flame;
    this.here.scale.setScalar(0.28);
    this.world.add(this.here);

    // Warp tunnel (only visible during the launch cinematic).
    this.tunnelMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: TUNNEL_FRAG,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
    });
    this.tunnel = new Mesh(new CylinderGeometry(2.2, 2.2, 40, 48, 1, true), this.tunnelMat);
    this.tunnel.rotation.x = Math.PI / 2;
    this.tunnel.position.z = -18;
    this.tunnel.visible = false;
    this.tunnel.renderOrder = 10;
    this.camera.add(this.tunnel);

    // DOM: header, drag surface, info card, mission flag.
    const drag = h('div', { class: 'map-drag hit', 'data-testid': 'map-drag' });
    this.bindPointers(drag);
    const header = h(
      'div',
      { class: 'map-header' },
      button('Back', 'back', () => mapHooks.back(), { round: true, color: 'white', id: 'btn-map-back' }),
      h('div', { class: 'title map-title' }, 'Star Map'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill map-scale', 'data-testid': 'map-scale' }, iconEl('info'), 'Not to scale'),
    );
    this.cardPic = h('div', { class: 'card-pic' });
    this.cardName = h('div', { class: 'h2' });
    this.cardTag = h('div', { class: 'tag' });
    this.cardText = h('div', { class: 'card-text' });
    this.flyBtn = button('Fly there!', 'rocket', () => this.fly(), { color: 'green', size: 'big', id: 'btn-fly-there', sound: 'launchUi' });
    this.card = h('div', { class: 'panel map-card', 'data-testid': 'map-card' }, this.cardPic, h('div', { class: 'col grow card-body' }, h('div', { class: 'row' }, this.cardName, this.cardTag), this.cardText), this.flyBtn);
    this.card.style.display = 'none';
    this.goalEl = h('div', { class: 'map-goal', 'data-testid': 'map-goal' }, iconEl('flag'), 'Mission');
    this.goalEl.style.display = 'none';
    this.ui.append(drag, header, this.goalEl, this.card);
  }

  override enter(): void {
    const pick = this.nodes.find((n) => n.sys.id === this.targetSys && n.unlocked) ?? this.nodes.find((n) => n.sys.id === this.current) ?? this.nodes[0];
    const here = this.nodes.find((n) => n.sys.id === this.current) ?? pick;
    // Start a little farther out, looking at where you are, then glide to the pick.
    this.target.copy(here.pos);
    this.targetGoal.copy(here.pos);
    // Stand on the sunny side (a little off to one side) so planets are lit, not in shadow.
    this.yaw = this.yawGoal = Math.atan2(-here.pos.x, -here.pos.z) + 0.95;
    this.dist = focusDistance(here.size) * 2.2 + 18;
    this.distGoal = this.dist;
    this.select(pick, false);
    this.updateCamera(1);
    mapHooks.onEnter(this);
    tip('map');
  }

  override back(): boolean {
    if (this.launch) {
      this.finishLaunch();
      return true;
    }
    mapHooks.back();
    return true;
  }

  // ------------------------------------------------------------------ input

  private bindPointers(el: HTMLElement): void {
    const scale = () => S.game.metrics.scale;
    el.addEventListener('pointerdown', (e) => {
      if (this.launch) {
        this.finishLaunch();
        return;
      }
      const x = e.clientX / scale();
      const y = e.clientY / scale();
      this.pointers.set(e.pointerId, { x, y, sx: x, sy: y, t: performance.now() });
      if (this.pointers.size === 1) this.moved = 0;
      if (this.pointers.size === 2) this.pinchDist = this.pinchSpan();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const x = e.clientX / scale();
      const y = e.clientY / scale();
      const dx = x - p.x;
      const dy = y - p.y;
      p.x = x;
      p.y = y;
      this.moved = Math.max(this.moved, Math.hypot(x - p.sx, y - p.sy));
      if (this.pointers.size === 1) {
        this.yawGoal -= dx * 0.0065;
        this.pitchGoal = clamp(this.pitchGoal + dy * 0.0055, PITCH_MIN, PITCH_MAX);
      } else if (this.pointers.size === 2) {
        const span = this.pinchSpan();
        if (this.pinchDist > 0 && span > 0) this.distGoal = clamp(this.distGoal * (this.pinchDist / span), DIST_MIN, DIST_MAX);
        this.pinchDist = span;
        this.moved = 999;
      }
    });
    const up = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0 && this.moved < 12 && performance.now() - p.t < 600) this.tap(p.x, p.y);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.distGoal = clamp(this.distGoal * Math.exp(e.deltaY * 0.0012), DIST_MIN, DIST_MAX);
      },
      { passive: false },
    );
  }

  private pinchSpan(): number {
    const pts = [...this.pointers.values()];
    return pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
  }

  private tap(x: number, y: number): void {
    const id = pickTarget(this.nodes.map((n) => n.screen), x, y);
    const n = id ? this.nodes.find((k) => k.sys.id === id) : null;
    if (n) this.select(n, true);
  }

  // ------------------------------------------------------------------ selection

  select(n: Node, sound: boolean): void {
    this.selected = n;
    if (sound) sfx(n.unlocked ? 'select' : 'locked');
    this.distGoal = focusDistance(n.size) * (n.sys.id === 'zephyra' ? 1.6 : 1);
    // Look a little below the planet so it sits above the info card.
    this.targetGoal.copy(n.pos);
    this.targetGoal.y -= this.distGoal * 0.16;
    this.card.style.display = '';
    let pic: HTMLCanvasElement | null = null;
    if (n.sys.id === 'wormhole') pic = drawToCanvas(130, 130, (c, w, hh) => drawGlyph(c, 'wormhole', w / 2, hh / 2, w * 0.45));
    else pic = bodyPicture(n.sys.main, 130);
    if (pic && !n.unlocked) pic.style.filter = 'brightness(.25) saturate(0)';
    this.cardPic.replaceChildren(...(pic ? [pic] : []));
    setText(this.cardName, n.unlocked ? n.sys.name : 'Not yet!');
    const real = BODY_BY_ID[n.sys.main]?.real !== false;
    setText(this.cardTag, real ? 'Real place' : 'Made-up place');
    this.cardTag.className = `tag ${real ? 'real' : 'story'}`;
    this.cardTag.style.display = n.unlocked ? '' : 'none';
    setText(this.cardText, n.unlocked ? mapHooks.blurb(n.sys) : mapHooks.lockedText(n.sys));
    const here = n.sys.id === this.current;
    this.flyBtn.disabled = !n.unlocked;
    const lbl = this.flyBtn.querySelector('.lbl');
    if (lbl) lbl.textContent = here ? 'Fly around here' : 'Fly there!';
    for (const k of this.nodes) k.label.classList.toggle('sel', k === n);
  }

  selectNext(dir: number): void {
    const unlocked = this.nodes.filter((n) => n.unlocked);
    if (!unlocked.length) return;
    const i = this.selected ? unlocked.indexOf(this.selected) : -1;
    this.select(unlocked[(i + dir + unlocked.length) % unlocked.length], true);
  }

  fly(): void {
    const n = this.selected;
    if (!n || !n.unlocked || this.launch) return;
    const from = this.nodes.find((k) => k.sys.id === this.current) ?? n;
    this.launch = { t: 0, from, to: n, done: false };
    this.card.style.display = 'none';
    this.goalEl.style.display = 'none';
    this.ui.classList.add('launching');
    this.launchPos.copy(this.here.position);
    sfx('launch');
  }

  private finishLaunch(): void {
    const l = this.launch;
    if (!l || l.done) return;
    l.done = true;
    mapHooks.fly(this.current, l.to.sys.id);
  }

  // ------------------------------------------------------------------ frame

  override update(dt: number): void {
    const inp = S.input.state;
    if (this.launch) {
      if (inp.actionPressed || inp.boostPressed) this.finishLaunch();
      this.stepLaunch(dt);
      return;
    }
    if (inp.navX !== 0) this.selectNext(inp.navX);
    else if (inp.navY !== 0) this.selectNext(inp.navY);
    if (inp.actionPressed || inp.boostPressed) this.fly();
  }

  private stepLaunch(dt: number): void {
    const l = this.launch!;
    l.t += dt;
    const total = this.comfort ? 1.3 : 2.9;
    if (l.t >= total) this.finishLaunch();
  }

  private updateCamera(k: number): void {
    this.yaw = approach(this.yaw, this.yawGoal, 8, k);
    this.pitch = approach(this.pitch, this.pitchGoal, 8, k);
    this.dist = approach(this.dist, this.distGoal, 4, k);
    this.target.x = approach(this.target.x, this.targetGoal.x, 3.2, k);
    this.target.y = approach(this.target.y, this.targetGoal.y, 3.2, k);
    this.target.z = approach(this.target.z, this.targetGoal.z, 3.2, k);
    const p = orbitCameraPosition(this.target.x, this.target.y, this.target.z, this.yaw, this.pitch, this.dist, this.tmp);
    this.camera.position.set(p.x, p.y, p.z);
    this.camera.lookAt(this.target);
  }

  override render(): void {
    const t = this.time;
    const dt = 1 / 60;
    this.sky.update(t);
    this.sun.update(t, this.tmp.set(0, 1, 0));
    this.belt.rotation.y = t * 0.01;
    if (this.worm) {
      this.worm.material.uniforms.uTime.value = t;
      const wn = this.nodes.find((n) => n.sys.id === 'wormhole');
      this.worm.material.uniforms.uDim.value = wn?.unlocked ? 1 : 0.2;
    }
    for (const n of this.nodes) {
      const sunPos = n.sys.id === 'zephyra' ? this.zSunPos : this.sunPos.set(0, 0, 0);
      if (n.view) n.view.update(t, this.tmp2.copy(sunPos).sub(n.pos).normalize());
      for (const m of n.moons) {
        const a = m.phase + t * m.speed;
        m.view.group.position.set(Math.cos(a) * m.dist, Math.sin(a) * m.dist * m.tilt, Math.sin(a) * m.dist);
        m.view.update(t, this.tmp2.copy(sunPos).sub(n.pos).normalize());
      }
    }

    // Your rocket circles the place you are.
    const cur = this.nodes.find((n) => n.sys.id === this.current);
    (this.hereFlame.material as ShaderMaterial).uniforms.uTime.value = t;
    if (this.launch && cur) this.renderLaunch(dt);
    else if (cur) {
      const a = t * 0.7;
      const r = cur.size * 1.45 + 0.5;
      this.here.position.set(cur.pos.x + Math.cos(a) * r, cur.pos.y + 0.25 + Math.sin(t * 1.3) * 0.08, cur.pos.z + Math.sin(a) * r);
      this.tmp.set(-Math.sin(a), 0, Math.cos(a));
      this.here.quaternion.setFromUnitVectors(UP, this.tmp);
      this.updateCamera(dt);
    }

    // Selection ring and the dotted route.
    const sel = this.selected;
    if (sel && !this.launch) {
      this.selRing.visible = true;
      this.selRing.position.copy(sel.pos);
      const s = sel.size * (sel.sys.id === 'saturn' ? 2.5 : sel.sys.id === 'wormhole' ? 1.5 : 1.45) * (1 + Math.sin(t * 4) * 0.03);
      this.selRing.scale.setScalar(s);
      this.selRing.quaternion.setFromUnitVectors(Z, this.tmp.copy(this.camera.position).sub(sel.pos).normalize());
    } else this.selRing.visible = false;
    this.drawRoute(cur, sel, t);
    this.placeLabels();
  }

  private drawRoute(cur: Node | undefined, sel: Node | null, t: number): void {
    if (!cur || !sel || sel === cur || !sel.unlocked || this.launch) {
      this.route.count = 0;
      return;
    }
    const n = 40;
    const lift = Math.max(3, cur.pos.distanceTo(sel.pos) * 0.18);
    for (let i = 0; i < n; i++) {
      const u = (i + ((t * 0.6) % 1)) / n;
      // Quadratic arc from here to there, lifted above the plane.
      const mx = (cur.pos.x + sel.pos.x) / 2;
      const my = (cur.pos.y + sel.pos.y) / 2 + lift;
      const mz = (cur.pos.z + sel.pos.z) / 2;
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      this.tmp.set(a * cur.pos.x + b * mx + c * sel.pos.x, a * cur.pos.y + b * my + c * sel.pos.y, a * cur.pos.z + b * mz + c * sel.pos.z);
      const s = 0.09 + 0.05 * Math.sin(u * Math.PI);
      this.tmpM.compose(this.tmp, this.tmpQ.identity(), this.tmp2.set(s, s, s));
      this.route.setMatrixAt(i, this.tmpM);
    }
    this.route.count = n;
    this.route.instanceMatrix.needsUpdate = true;
  }

  private renderLaunch(dt: number): void {
    const l = this.launch!;
    const t = l.t;
    const from = l.from;
    const to = l.to;
    // 1) Lift off and point toward the target. 2) Speed away with the camera chasing. 3) Warp!
    const dir = this.tmp2.copy(to.pos).sub(from.pos);
    if (dir.lengthSq() < 0.01) dir.set(1, 0.2, 0);
    dir.normalize();
    const go = Math.max(0, t - 0.5);
    const travel = go * go * 6;
    this.here.position.copy(this.launchPos).addScaledVector(dir, travel).add(this.tmp.set(0, Math.min(t, 0.5) * 1.5, 0));
    this.here.quaternion.setFromUnitVectors(UP, dir);
    this.hereFlame.scale.set(1, 1 + Math.min(2.5, t * 1.5), 1);
    // Chase camera behind the rocket.
    const back = this.tmp.copy(dir).multiplyScalar(-(3.2 + Math.min(t, 1) * 1.5)).add(this.here.position);
    back.y += 1.2;
    const k = 1 - Math.exp(-dt * 5);
    this.camera.position.lerp(back, k);
    this.camera.lookAt(this.here.position);
    const warp = this.comfort ? 0 : clamp((t - 1.3) / 0.9, 0, 1);
    this.tunnel.visible = warp > 0;
    this.tunnelMat.uniforms.uTime.value = t;
    this.tunnelMat.uniforms.uFade.value = warp;
    const fov = this.baseFov + (this.comfort ? 0 : 14 * warp);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const total = this.comfort ? 1.3 : 2.9;
    S.game.curtain.classList.toggle('on', t > total - 0.3);
  }

  private placeLabels(): void {
    const m = S.game.metrics;
    const camRight = this.tmp2.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    for (const n of this.nodes) {
      const p = this.tmp.copy(n.pos).project(this.camera);
      const visible = p.z < 1 && p.z > -1 && !this.launch;
      const sx = ((p.x + 1) / 2) * m.width;
      const sy = ((1 - p.y) / 2) * m.height;
      const e = this.tmp.copy(n.pos).addScaledVector(camRight, n.size * (n.sys.id === 'saturn' ? 1.6 : 1)).project(this.camera);
      const r = Math.abs(((e.x + 1) / 2) * m.width - sx);
      n.screen.x = sx;
      n.screen.y = sy;
      n.screen.r = r;
      n.screen.visible = visible;
      n.label.style.display = visible ? '' : 'none';
      if (visible) n.label.style.transform = `translate(${sx}px, ${sy + r + 6}px) translate(-50%, 0)`;
      if (n.sys.id === this.targetSys) {
        const show = visible && n.unlocked;
        this.goalEl.style.display = show ? '' : 'none';
        if (show) this.goalEl.style.transform = `translate(${sx}px, ${sy - r - 8}px) translate(-50%, -100%)`;
      }
    }
  }
}

const UP = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

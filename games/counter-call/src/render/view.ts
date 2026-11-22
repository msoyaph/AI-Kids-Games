/**
 * Draws a day: the 3D scene, plus the buttons that float over it (station buttons, order
 * bubbles, the bell). It only reads the game state; taps go back out through `hooks`.
 */
import * as THREE from 'three';
import { CHAR_BY_ID, HOST, type CharacterDef } from '../data/characters';
import { opensOnDay } from '../data/days';
import { FOOD_BY_ID, type FoodId } from '../data/menu';
import { LAYOUT, pending, SPOT_COUNT, type SimEvent, type State, type Target } from '../sim';
import { Chibi, type Anim } from './chibi';
import type { Expression } from './faces';
import { makeFood, renderFoodIcons } from './food';
import { soft, sphere } from './kit';
import { buildWorld, type World } from './world';

export interface ViewHooks {
  tap(target: Target): void;
  bell(): void;
  cake(): void;
}

interface GuestView { chibi: Chibi; bubble: HTMLButtonElement; items: HTMLElement; bar: HTMLElement; key: string; face: number }
interface Bit { mesh: THREE.Mesh; v: THREE.Vector3; life: number; span: number; gravity: number; size: number }

const HERO = { x: 0, z: 4.3 };
/** How far apart the hosts stand in the cast picture. */
const CAST_GAP = 1.9;
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.3 2 4.5 5.6 4.5c2 0 3.4 1 4.4 2.3l2 2.4 2-2.4c1-1.3 2.4-2.3 4.4-2.3 3.6 0 5.3 3.8 3.6 7.2C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';
const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1.6 1.6 0 0 1 1.6 1.6v.5a6.5 6.5 0 0 1 4.9 6.4V15l1.8 2.5a.8.8 0 0 1-.6 1.3H4.3a.8.8 0 0 1-.6-1.3L5.5 15v-3.5a6.5 6.5 0 0 1 4.9-6.4v-.5A1.6 1.6 0 0 1 12 3zm-2.2 17h4.4a2.2 2.2 0 0 1-4.4 0z" fill="currentColor"/></svg>';

const CAKE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11a5 5 0 0 1 10 0h1.5a1 1 0 0 1 1 1.2l-1.4 7a1 1 0 0 1-1 .8H6.9a1 1 0 0 1-1-.8l-1.4-7a1 1 0 0 1 1-1.2H7zm5-8a1.5 1.5 0 0 1 1.5 1.5c0 .5-.2.9-.6 1.2A5 5 0 0 0 12 6c-.3 0-.6 0-.9.1-.4-.3-.6-.7-.6-1.1A1.5 1.5 0 0 1 12 3z" fill="currentColor"/></svg>';

/** Turn an angle toward another the short way round. */
function turn(from: number, to: number, k: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * Math.min(1, k);
}

export class View {
  /** Pictures of each food, rendered from the 3D models. */
  readonly icons: Record<FoodId, string>;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  private readonly world: World;
  private host: Chibi;
  private readonly guests = new Map<number, GuestView>();
  private row: Chibi[] = [];
  private readonly chips: HTMLButtonElement[] = [];
  private readonly bellChip: HTMLButtonElement;
  private readonly cakeChip: HTMLButtonElement;
  private readonly bits: Bit[] = [];
  private readonly ray = new THREE.Raycaster();
  private readonly v = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly wantPos = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();
  private wantFov = 40;
  private snap = true;
  private w = 1;
  private h = 1;
  private clock = 0;
  private hostFace = 0;
  private idleFor = 0;
  private moodFor = 0;
  private mood: Expression = 'neutral';
  private trayKey = '';
  private heroRect = { x0: 0, y0: 0, x1: 1, y1: 1 };
  private bellFor = 0;
  private cakeFor = 0;
  private readonly steamFor: number[] = [];

  /** `low` draws without shadows or smoothing at a lower resolution, for slow or software WebGL. */
  constructor(private readonly canvas: HTMLCanvasElement, private readonly overlay: HTMLElement, private readonly hooks: ViewHooks, private readonly low = false) {
    this.icons = renderFoodIcons();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !low });
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color('#fff1d6');

    this.scene.add(new THREE.HemisphereLight('#fff8ec', '#f6d2a8', 1.75));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.1);
    sun.position.set(-5, 11, 8);
    sun.target.position.set(0, 0, -1);
    sun.castShadow = !low;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 34 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);

    this.world = buildWorld();
    this.scene.add(this.world.group);
    this.host = new Chibi(HOST);
    this.scene.add(this.host.group);

    // Station buttons.
    this.world.stations.forEach((st, index) => {
      const def = FOOD_BY_ID[st.food];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.style.setProperty('--accent', def.color);
      chip.innerHTML = `<img alt="" src="${this.icons[st.food]}"><span class="lock">Day ${opensOnDay(st.food)}</span><kbd>${index + 1}</kbd>`;
      chip.setAttribute('aria-label', `${def.station}: ${def.label}`);
      chip.addEventListener('click', () => { chip.blur(); hooks.tap({ kind: 'station', index }); });
      overlay.append(chip);
      this.chips.push(chip);
      this.steamFor.push(0);
    });
    this.bellChip = document.createElement('button');
    this.bellChip.type = 'button';
    this.bellChip.className = 'bell';
    this.bellChip.innerHTML = `${BELL}<b></b><kbd>B</kbd>`;
    this.bellChip.addEventListener('click', () => { this.bellChip.blur(); hooks.bell(); });
    overlay.append(this.bellChip);
    this.cakeChip = document.createElement('button');
    this.cakeChip.type = 'button';
    this.cakeChip.className = 'bell cake';
    this.cakeChip.innerHTML = `${CAKE}<b></b><kbd>C</kbd>`;
    this.cakeChip.addEventListener('click', () => { this.cakeChip.blur(); hooks.cake(); });
    overlay.append(this.cakeChip);

    canvas.addEventListener('pointerdown', event => {
      const target = this.pick(event.clientX, event.clientY);
      if (target === 'bell') hooks.bell();
      else if (target === 'cake') hooks.cake();
      else if (target) hooks.tap(target);
    });
    this.resize();
  }

  resize(): void {
    this.w = this.canvas.clientWidth || innerWidth;
    this.h = this.canvas.clientHeight || innerHeight;
    this.renderer.setPixelRatio(this.low ? 1 : Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.snap = true;
  }

  /** The free part of the screen (0 to 1 across and down) where the host stands on menu screens. */
  setHeroRect(rect: { x0: number; y0: number; x1: number; y1: number }): void {
    this.heroRect = rect;
  }

  /** Swap who stands behind the counter. */
  setHost(def: CharacterDef): void {
    if (this.host.def === def) return;
    this.host.dispose();
    this.host = new Chibi(def);
    this.scene.add(this.host.group);
    this.trayKey = '';
  }

  /** Clear the room for a new day. */
  reset(): void {
    for (const gv of this.guests.values()) this.drop(gv);
    this.guests.clear();
    for (const bit of this.bits) bit.mesh.removeFromParent();
    this.bits.length = 0;
    this.overlay.querySelectorAll('.float').forEach(el => el.remove());
    this.trayKey = '';
    this.host.setTray([]);
    this.idleFor = 0;
    this.moodFor = 0;
    this.hostFace = 0;
    this.snap = true;
  }

  // ---------------------------------------------------------------- camera

  private aim(mode: 'play' | 'hero' | 'cast', dt: number): void {
    const aspect = this.camera.aspect;
    let dist: number;
    if (mode === 'play') {
      // Fit the whole row of stations across, however narrow the screen is.
      this.wantFov = 40;
      const tan = Math.tan(THREE.MathUtils.degToRad(this.wantFov / 2));
      dist = Math.max(12.2, 4.5 / (tan * aspect) + 3.6);
      this.wantLook.set(0, 0.9, -1.7);
      this.wantPos.set(0, 0.5, 0.866).multiplyScalar(dist).add(this.wantLook);
      // On tall screens the room is small, so slide it down: stations near the thumbs, wall above.
      const slide = (dist - 12.2) * tan * 0.8;
      this.wantLook.y += slide * 0.866;
      this.wantLook.z -= slide * 0.5;
      this.wantPos.y += slide * 0.866;
      this.wantPos.z -= slide * 0.5;
    } else if (mode === 'cast') {
      // Every host in a row: far enough back to fit them all.
      this.wantFov = 36;
      const tan = Math.tan(THREE.MathUtils.degToRad(this.wantFov / 2));
      dist = Math.max(2.5 / (2 * tan * 0.8), (this.row.length * CAST_GAP + 0.4) / (2 * tan * aspect * 0.94));
      this.wantLook.set(HERO.x, 1, HERO.z);
      this.wantPos.set(0, 0.2, 0.98).multiplyScalar(dist).add(this.wantLook);
    } else {
      // The host steps out in front, framed in the free part of the screen: beside the menu
      // card on wide screens, above it on tall ones.
      this.wantFov = 36;
      const tan = Math.tan(THREE.MathUtils.degToRad(this.wantFov / 2));
      const r = this.heroRect, fw = Math.max(0.1, r.x1 - r.x0), fh = Math.max(0.1, r.y1 - r.y0);
      const tall = this.host.top + 0.2, wide = 2.3;
      dist = Math.max(4.2, tall / (2 * tan * fh), wide / (2 * tan * aspect * fw)) * 1.06;
      const nx = r.x0 + r.x1 - 1, ny = 1 - (r.y0 + r.y1);
      this.wantLook.set(HERO.x - nx * dist * tan * aspect, this.host.top / 2 - ny * dist * tan, HERO.z);
      this.wantPos.set(0, 0.2, 0.98).multiplyScalar(dist).add(this.wantLook);
    }
    const k = this.snap ? 1 : 1 - Math.exp(-dt * 3.2);
    this.snap = false;
    this.camPos.lerp(this.wantPos, k);
    this.camLook.lerp(this.wantLook, k);
    this.camera.fov += (this.wantFov - this.camera.fov) * k;
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  private place(el: HTMLElement, x: number, y: number, z: number, maxY = Infinity): void {
    this.v.set(x, y, z).project(this.camera);
    // Keep buttons on the screen, even where the scene runs off its edge.
    const px = Math.min(this.w - 34, Math.max(34, (this.v.x * 0.5 + 0.5) * this.w)), py = Math.min(maxY, (-this.v.y * 0.5 + 0.5) * this.h);
    el.style.transform = `translate(calc(${px.toFixed(1)}px - 50%), calc(${py.toFixed(1)}px - 100%))`;
  }

  /** What is under a tap on the 3D scene. */
  pick(clientX: number, clientY: number): Target | 'bell' | 'cake' | null {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), this.camera);
    const hits = this.ray.intersectObjects(this.world.picks.map(p => p.mesh), false);
    if (!hits.length) return null;
    return this.world.picks.find(p => p.mesh === hits[0].object)?.target ?? null;
  }

  // ---------------------------------------------------------------- effects

  private puff(x: number, y: number, z: number, colors: string[], count: number, speed: number, gravity: number, size: number, span: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sphere(8), soft(colors[i % colors.length], 0.6));
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2, up = 0.5 + Math.random() * 0.8;
      this.bits.push({ mesh, v: new THREE.Vector3(Math.cos(a) * speed * Math.random(), up * speed, Math.sin(a) * speed * Math.random()), life: 0, span: span * (0.7 + Math.random() * 0.6), gravity, size: size * (0.7 + Math.random() * 0.6) });
    }
  }

  private float(x: number, y: number, z: number, html: string, kind = ''): void {
    const el = document.createElement('div');
    el.className = `float ${kind}`;
    el.innerHTML = `<span>${html}</span>`;
    this.place(el, x, y, z);
    this.overlay.append(el);
    setTimeout(() => el.remove(), 1500);
  }

  /** React to something that happened in the game (sparkles, floating words, faces). */
  handle(event: SimEvent, state: State): void {
    const h = state.host;
    switch (event.type) {
      case 'order':
        this.guests.get(event.uid)?.chibi.say(0.9);
        break;
      case 'ready': {
        const x = LAYOUT.stationX[event.station] + 0.42;
        this.puff(x, 1.1, LAYOUT.stationZ - 0.12, ['#fff3a6', '#ffffff', '#ffd35c'], 7, 1.3, 2.5, 0.05, 0.6);
        break;
      }
      case 'collect':
        this.puff(LAYOUT.stationX[event.station] + 0.42, 1, LAYOUT.stationZ - 0.12, ['#ffffff'], 4, 0.8, 1, 0.045, 0.4);
        break;
      case 'deliver': {
        const g = state.guests.find(g => g.uid === event.uid);
        if (g) this.puff(g.x, 1.15, g.z + 0.7, ['#ffffff', '#fff3a6'], 5, 0.9, 1.5, 0.045, 0.45);
        this.host.say(0.5);
        break;
      }
      case 'complete': {
        const g = state.guests.find(g => g.uid === event.uid);
        if (!g) break;
        this.puff(g.x, 1.7, g.z, ['#ff8fab', '#ffd35c', '#7fd6c2', '#8fd3f4', '#c9b6ff'], 14, 2.4, 5, 0.06, 0.95);
        const cheers = [event.favorite ? 'Favorite!' : '', event.together ? 'All at once!' : '', event.streak > 1 ? `Streak ×${event.streak}` : ''].filter(Boolean).slice(0, 2);
        this.float(g.x, 2.25, g.z, `<i class="hearts">${HEART.repeat(event.hearts)}</i><b>+${event.coins}</b>${cheers.map(text => `<em>${text}</em>`).join('')}`, 'win');
        this.mood = 'happy';
        this.moodFor = 1.2;
        break;
      }
      case 'giveup': {
        const g = state.guests.find(g => g.uid === event.uid);
        if (g) this.float(g.x, 2.1, g.z, 'Next time!', 'soft');
        this.mood = 'sad';
        this.moodFor = 1;
        break;
      }
      case 'nomatch':
        this.float(h.x, 2, h.z, 'Not their order!', 'soft');
        break;
      case 'trayfull':
        this.float(h.x, 2, h.z, 'Tray is full!', 'soft');
        break;
      case 'discard':
        this.puff(h.x, 0.8, h.z + 0.3, ['#ffffff'], 4, 0.8, 1, 0.045, 0.4);
        break;
      case 'samples':
        this.cakeFor = 0.5;
        for (const g of state.guests) {
          if (g.phase !== 'waiting') continue;
          this.puff(g.x, 1.5, g.z, ['#ffb6d0', '#ffffff', '#fff3a6'], 6, 1.4, 3, 0.05, 0.7);
          this.guests.get(g.uid)?.chibi.say(0.6);
        }
        this.float(LAYOUT.cake.x, 1.95, LAYOUT.cake.z, 'Free cake!', 'win');
        break;
      case 'bell':
        this.bellFor = 0.5;
        this.puff(LAYOUT.bell.x, 1.2, LAYOUT.bell.z, ['#ffd35c', '#fff3a6'], 5, 1.1, 2, 0.04, 0.5);
        break;
      default:
        break;
    }
  }

  private effects(dt: number): void {
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      b.life += dt;
      if (b.life >= b.span) {
        b.mesh.removeFromParent();
        this.bits.splice(i, 1);
        continue;
      }
      b.v.y -= b.gravity * dt;
      b.mesh.position.addScaledVector(b.v, dt);
      b.mesh.scale.setScalar(b.size * Math.sin((b.life / b.span) * Math.PI) + 0.001);
    }
    if (this.bellFor > 0) this.bellFor -= dt;
    const ring = Math.max(0, this.bellFor);
    this.world.bell.scale.set(1 + ring * 0.5, 1 - ring * 0.5, 1 + ring * 0.5);
    this.world.bell.rotation.z = Math.sin(this.clock * 40) * ring * 0.5;
    if (this.cakeFor > 0) this.cakeFor -= dt;
    const hop = Math.max(0, this.cakeFor);
    this.world.cake.scale.set(1 + hop * 0.4, 1 - hop * 0.3, 1 + hop * 0.4);
  }

  // ---------------------------------------------------------------- the day

  private drop(gv: GuestView): void {
    gv.chibi.dispose();
    gv.bubble.remove();
  }

  private stations(state: State | null, menu: FoodId[], dt: number): void {
    const order = state ? pending(state) : [];
    this.world.stations.forEach((view, i) => {
      const st = state?.stations[i];
      const open = st ? st.unlocked : menu.includes(view.food);
      view.cover.visible = !open;
      view.appliance.visible = open;
      const phase = st?.phase ?? 'idle';
      const p = st && phase === 'cooking' ? Math.min(1, st.t / st.total) : 0;
      view.dish.visible = open && phase !== 'idle';
      for (const part of view.hot) part.visible = phase === 'cooking';
      if (phase === 'cooking') {
        view.dish.scale.setScalar(0.3 + p * 0.8);
        view.dish.position.y = 0.88;
        view.dish.rotation.y = 0;
        this.steamFor[i] += dt;
        if (this.steamFor[i] > 0.24) {
          this.steamFor[i] = 0;
          this.puff(view.steam.x + (Math.random() - 0.5) * 0.2, view.steam.y, view.steam.z, ['#ffffff'], 1, 0.55, -0.5, 0.11, 0.9);
        }
      } else if (phase === 'ready') {
        view.dish.scale.setScalar(1.25);
        view.dish.position.y = 0.94 + Math.abs(Math.sin(this.clock * 4.5)) * 0.1;
        view.dish.rotation.y = this.clock * 1.6;
      }
      const chip = this.chips[i];
      chip.dataset.state = open ? phase : 'locked';
      chip.style.setProperty('--p', p.toFixed(3));
      const q = order.findIndex(t => t.kind === 'station' && t.index === i);
      if (q >= 0) chip.dataset.q = String(q + 1);
      else delete chip.dataset.q;
      this.place(chip, LAYOUT.stationX[i], 0.42, LAYOUT.stationZ + 0.5, this.h - 10);
    });
  }

  /** Show the day as it is right now. */
  sync(state: State, dt: number): void {
    this.clock += dt;
    this.overlay.hidden = false;
    this.aim('play', dt);
    this.stations(state, [], dt);

    // Minty.
    const h = state.host, host = this.host;
    host.group.position.set(h.x, 0, h.z);
    const acts: Record<string, Anim> = { walk: 'walk', start: 'cook', collect: 'serve', serve: 'serve', shrug: 'shrug', wait: 'idle', idle: 'idle' };
    let anim = acts[h.act] ?? 'idle';
    let face = h.face;
    this.idleFor = h.act === 'idle' && !h.queue.length ? this.idleFor + dt : 0;
    if (this.idleFor > 1.6) {
      // Nothing to do: turn to the player, and wave now and then.
      face = 0;
      if (this.idleFor % 7 > 0.5 && this.idleFor % 7 < 2.1 && !h.tray.length) anim = 'wave';
    }
    if (state.over) anim = state.served * 2 >= state.day.guests ? 'cheer' : 'idle';
    this.hostFace = turn(this.hostFace, state.over ? 0 : face, dt * 14);
    host.group.rotation.y = this.hostFace;
    host.anim = anim;
    this.moodFor -= dt;
    host.expression = state.over && anim === 'cheer' ? 'happy' : this.moodFor > 0 ? this.mood : 'neutral';
    const trayKey = h.tray.join(',');
    if (trayKey !== this.trayKey) {
      this.trayKey = trayKey;
      host.setTray(h.tray.map(makeFood));
    }
    host.update(dt);

    // Friends.
    const order = pending(state);
    const seen = new Set<number>();
    for (const g of state.guests) {
      seen.add(g.uid);
      let gv = this.guests.get(g.uid);
      if (!gv) {
        const def = CHAR_BY_ID[g.char] ?? HOST;
        const chibi = new Chibi(def);
        this.scene.add(chibi.group);
        const bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.className = 'bubble';
        bubble.innerHTML = '<span class="items"></span><span class="bar"><i></i></span><kbd></kbd>';
        const spot = g.spot;
        bubble.addEventListener('click', () => { bubble.blur(); this.hooks.tap({ kind: 'guest', spot }); });
        bubble.querySelector('kbd')!.textContent = 'QWE'[spot] ?? '';
        this.overlay.append(bubble);
        gv = { chibi, bubble, items: bubble.querySelector<HTMLElement>('.items')!, bar: bubble.querySelector<HTMLElement>('.bar i')!, key: '', face: g.face };
        this.guests.set(g.uid, gv);
      }
      const { chibi, bubble } = gv;
      chibi.group.position.set(g.x, 0, g.z);
      gv.face = turn(gv.face, g.face, dt * 10);
      chibi.group.rotation.y = gv.face;
      const left = g.patience / g.patienceMax;
      if (g.phase === 'waiting') {
        chibi.anim = left < 0.3 ? 'fidget' : 'idle';
        chibi.expression = left < 0.3 ? 'sad' : 'neutral';
      } else if (g.phase === 'happy') {
        chibi.anim = 'cheer';
        chibi.expression = 'happy';
      } else {
        chibi.anim = 'walk';
        chibi.expression = g.phase === 'arriving' ? 'neutral' : g.glad ? 'happy' : 'sad';
      }
      chibi.update(dt);

      bubble.hidden = g.phase !== 'waiting';
      if (bubble.hidden) continue;
      const key = g.order.map(o => o.food + (o.done ? '+' : '-')).join('');
      if (key !== gv.key) {
        gv.key = key;
        gv.items.innerHTML = g.order.map(o => `<span class="item${o.done ? ' done' : ''}"><img alt="" src="${this.icons[o.food]}"></span>`).join('') + (g.favorite ? `<i class="fav">${HEART}</i>` : '');
        const name = CHAR_BY_ID[g.char]?.name ?? 'A friend';
        const wants = g.order.filter(o => !o.done).map(o => FOOD_BY_ID[o.food].label.toLowerCase()).join(' and ');
        bubble.setAttribute('aria-label', `Serve ${name}: still wants ${wants}`);
      }
      gv.bar.style.transform = `scaleX(${Math.max(0, left).toFixed(3)})`;
      bubble.dataset.mood = left < 0.3 ? 'low' : left < 0.6 ? 'mid' : 'ok';
      const q = order.findIndex(t => t.kind === 'guest' && t.spot === g.spot);
      if (q >= 0) bubble.dataset.q = String(q + 1);
      else delete bubble.dataset.q;
      this.place(bubble, g.x, chibi.top + 0.28, g.z);
    }
    for (const [uid, gv] of this.guests) {
      if (seen.has(uid)) continue;
      this.drop(gv);
      this.guests.delete(uid);
    }

    // The bell shows how many friends are still to come.
    const coming = Number.isFinite(state.toSpawn) ? String(state.toSpawn) : '∞';
    this.bellChip.querySelector('b')!.textContent = coming;
    this.bellChip.disabled = state.toSpawn === 0;
    this.bellChip.setAttribute('aria-label', Number.isFinite(state.toSpawn) ? `Ring the bell to call the next friend. ${coming} still to come.` : 'Ring the bell to call the next friend.');
    this.place(this.bellChip, LAYOUT.bell.x, 1.42, LAYOUT.bell.z);
    // The cake stand shows how many rounds of free cake are left.
    this.cakeChip.querySelector('b')!.textContent = String(state.samples);
    this.cakeChip.disabled = state.samples === 0;
    this.cakeChip.setAttribute('aria-label', `Share free cake so friends wait longer. ${state.samples} left today.`);
    this.place(this.cakeChip, LAYOUT.cake.x, 1.52, LAYOUT.cake.z);

    this.effects(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** Minty steps out front for the title and results screens. */
  hero(dt: number, anim: Anim, expression: Expression, menu: FoodId[]): void {
    this.clock += dt;
    this.overlay.hidden = true;
    this.aim('hero', dt);
    this.stations(null, menu, dt);
    for (const gv of this.guests.values()) this.drop(gv);
    this.guests.clear();
    if (this.trayKey) {
      this.trayKey = '';
      this.host.setTray([]);
    }
    this.hostFace = turn(this.hostFace, 0, dt * 10);
    this.host.group.position.set(HERO.x, 0, HERO.z);
    this.host.group.rotation.y = this.hostFace;
    this.host.anim = anim;
    this.host.expression = expression;
    this.host.update(dt);
    this.effects(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** Every host in a row, waving: the cast picture (the capture route ?scene=cast). */
  cast(dt: number, defs: CharacterDef[], menu: FoodId[]): void {
    this.clock += dt;
    this.overlay.hidden = true;
    if (!this.row.length) {
      this.row = defs.map(def => new Chibi(def));
      this.row.forEach((chibi, i) => {
        chibi.group.position.set((i - (defs.length - 1) / 2) * CAST_GAP, 0, HERO.z + (i % 2 ? 0.25 : 0));
        chibi.anim = 'wave';
        this.scene.add(chibi.group);
      });
      this.host.group.visible = false;
    }
    this.aim('cast', dt);
    this.stations(null, menu, dt);
    for (const chibi of this.row) chibi.update(dt);
    this.effects(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** A burst of confetti around Minty (results screen). */
  confetti(): void {
    this.puff(HERO.x, 1.9, HERO.z, ['#ff8fab', '#ffd35c', '#7fd6c2', '#8fd3f4', '#c9b6ff'], 26, 3, 5, 0.07, 1.3);
  }

  /** How many counter spots there are, for keyboard hints. */
  static readonly spots = SPOT_COUNT;
}

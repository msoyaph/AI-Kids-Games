import { Box3, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { comfortOn } from '../app/comfort';
import { S } from '../app/services';
import { clamp } from '../core/mathx';
import { DECOR_BY_ID } from '../data/shop';
import type { PartSlot, RocketLoadout } from '../data/types';
import { Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { applyPose, type CameraPose } from '../r3/framing';
import { Academy, type RoomId } from '../r3/rooms/academy';

export { focusPose } from '../r3/framing';
import { disposeObject } from '../r3/dispose';

/** Screens that live inside the Academy diorama (they glide between each other instead of fading). */
export const ACADEMY_SCENES = ['hub', 'board', 'hangar', 'lounge', 'codex', 'badges', 'shop'] as const;

/** Everyone is ~1.6 units tall (characters are built ~1 unit tall). */
export const CAST_SCALE = 1.6;
/** Rocket height on the hangar turntable. */
export const HANGAR_ROCKET_H = 3.4;

/** Crew who hang out in the Academy, and when. */
function crewWanted(id: string): boolean {
  const st = S.state;
  if (id === 'zibbo') return st.flag('zibboJoined');
  if (id === 'ollo') return st.flag('wormholeDone');
  return true;
}

/**
 * The Academy diorama, kept alive while you move between the hub screens: the building and rooms,
 * the crew at their spots, your rocket on the hangar turntable, and where the camera is right now
 * (so the next screen's camera glides on from there). Released when you leave for space.
 */
export class AcademyStage {
  readonly world = new Scene();
  readonly academy: Academy;
  readonly cast = new Map<string, Character>();
  readonly rocket: RocketModel;
  /** The camera's current pose, shared between screens. */
  readonly cam = { pos: new Vector3(), look: new Vector3(), fov: 40, offX: 0, offY: 0, valid: false };
  private readonly ray = new Raycaster();
  private readonly box = new Box3();
  private readonly ndc = new Vector2();

  constructor() {
    const r3 = S.game.r3;
    this.world.environment = r3.env;
    this.world.environmentIntensity = 0.9;
    this.academy = new Academy({ renderer: r3.renderer, profile: r3.profile });
    this.world.add(this.academy.group);
    this.rocket = new RocketModel(S.state.data.loadout, { glossy: r3.profile.tier === 'high' });
    this.rocketKey = JSON.stringify(S.state.data.loadout);
    this.placeRocket();
    this.world.add(this.rocket.group);
    this.syncCast();
    this.academy.setDecor(this.decorStyles());
    this.castShadows();
  }

  private rocketKey = '';

  /** Show this loadout on the turntable (rebuilds only when it changed). */
  syncRocket(lo: RocketLoadout, slot?: PartSlot | 'stickers'): void {
    const key = JSON.stringify(lo);
    if (key === this.rocketKey) return;
    this.rocketKey = key;
    this.rocket.setLoadout(lo, slot);
    this.placeRocket();
    this.castShadows();
  }

  /** Stand the rocket on the turntable at hangar size (call after a loadout change). */
  placeRocket(hover = 0): void {
    const e = this.rocket.extent;
    const s = HANGAR_ROCKET_H / (e.top - e.bottom);
    const t = this.academy.spots.turntable;
    this.rocket.group.scale.setScalar(s);
    this.rocket.group.position.set(t.x, t.y - e.bottom * s + 0.05 + hover, t.z);
  }

  /** Add or remove crew to match the story so far. */
  syncCast(): void {
    for (const [id, spot] of Object.entries(this.academy.spots.crew)) {
      const want = crewWanted(id);
      const have = this.cast.get(id);
      if (want && !have) {
        const c = new Character(id);
        c.group.scale.setScalar(CAST_SCALE);
        c.group.position.copy(spot.pos);
        c.group.rotation.y = spot.rotY;
        c.setAnim(id === 'tuggy' ? 'hover' : 'idle');
        this.cast.set(id, c);
        this.world.add(c.group);
      } else if (!want && have) {
        have.group.removeFromParent();
        disposeObject(have.group);
        this.cast.delete(id);
      }
    }
  }

  decorStyles(): string[] {
    const out: string[] = [];
    for (const id of S.state.data.decorPlaced) {
      const d = DECOR_BY_ID[id];
      if (d) out.push(d.style);
    }
    return out;
  }

  private castShadows(): void {
    if (!S.game.r3.profile.shadows) return;
    const on = (o: { traverse: (f: (x: unknown) => void) => void }) =>
      o.traverse((x) => {
        const m = x as { isMesh?: boolean; castShadow: boolean; material?: { isMeshStandardMaterial?: boolean; transparent?: boolean } };
        if (m.isMesh && m.material?.isMeshStandardMaterial && !m.material.transparent) m.castShadow = true;
      });
    on(this.rocket.group);
    for (const c of this.cast.values()) on(c.group);
  }

  update(dt: number, time: number): void {
    this.academy.update(dt, time);
    this.rocket.update(dt, 0.15, 0);
    for (const c of this.cast.values()) c.update(dt);
  }

  /** Which crew member (or room) is under a tap at canvas-relative NDC (x, y). */
  pick(camera: PerspectiveCamera, x: number, y: number): { crew: string | null; room: RoomId | null } {
    this.ndc.set(x, y);
    this.ray.setFromCamera(this.ndc, camera);
    let best: string | null = null;
    let bestD = Infinity;
    const hit = new Vector3();
    for (const [id, c] of this.cast) {
      if (!c.group.visible) continue;
      this.box.setFromObject(c.group).expandByScalar(0.15);
      if (this.ray.ray.intersectBox(this.box, hit)) {
        const d = hit.distanceTo(this.ray.ray.origin);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
    return { crew: best, room: best ? null : this.academy.roomAt(this.ray) };
  }

  dispose(): void {
    this.academy.dispose();
    disposeObject(this.world);
    this.world.clear();
  }
}

let current: AcademyStage | null = null;

export function academyStage(): AcademyStage {
  if (!current) current = new AcademyStage();
  return current;
}

/** Free the diorama (when leaving the Academy screens, or after the GPU context is lost). */
export function releaseAcademyStage(): void {
  if (!current) return;
  current.dispose();
  current = null;
}

export function hasAcademyStage(): boolean {
  return !!current;
}

/** The diorama's scene graph if it exists. */
export function academyWorld(): Scene | null {
  return current?.world ?? null;
}

const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Moves a screen's camera from wherever the Academy camera was to this screen's pose (and between
 * poses within a screen). `offX/offY` shift the picture (in fractions of the screen) so the subject
 * can sit in a column beside the DOM panels.
 */
export class Glide {
  private readonly fromPos = new Vector3();
  private readonly fromLook = new Vector3();
  private fromFov = 40;
  private fromOffX = 0;
  private fromOffY = 0;
  private readonly toPos = new Vector3();
  private readonly toLook = new Vector3();
  private toFov = 40;
  private toOffX = 0;
  private toOffY = 0;
  private t = 1;
  private dur = 0.85;
  private w = 1280;
  private h = 720;
  private readonly look = new Vector3();

  constructor(private readonly camera: PerspectiveCamera, private readonly stage: AcademyStage) {}

  setSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** Glide to a pose. `intro` starts from a pulled-back view when nothing was on screen before. */
  to(pose: CameraPose, offX = 0, offY = 0, instant = false): void {
    const c = this.stage.cam;
    if (!c.valid) {
      // Coming in from outside the Academy: start a little higher and further back.
      c.pos.copy(pose.pos).add(new Vector3(0, 5, 14));
      c.look.copy(pose.look);
      c.fov = pose.fov;
      c.offX = offX;
      c.offY = offY;
      c.valid = true;
    }
    this.fromPos.copy(c.pos);
    this.fromLook.copy(c.look);
    this.fromFov = c.fov;
    this.fromOffX = c.offX;
    this.fromOffY = c.offY;
    this.toPos.copy(pose.pos);
    this.toLook.copy(pose.look);
    this.toFov = pose.fov;
    this.toOffX = offX;
    this.toOffY = offY;
    const far = this.fromPos.distanceTo(this.toPos);
    this.dur = comfortOn() ? 0.5 : clamp(0.6 + far * 0.012, 0.7, 1.15);
    this.t = instant || far < 0.001 ? 1 : 0;
    this.apply(this.t >= 1 ? 1 : 0);
  }

  get moving(): boolean {
    return this.t < 1;
  }

  update(dt: number): void {
    if (this.t < 1) this.t = Math.min(1, this.t + dt / this.dur);
    this.apply(ease(this.t));
  }

  private apply(k: number): void {
    const c = this.stage.cam;
    c.pos.lerpVectors(this.fromPos, this.toPos, k);
    // Pull back a little mid-move so it reads as a swoop past the building.
    const arc = Math.sin(Math.PI * k) * Math.min(6, this.fromPos.distanceTo(this.toPos) * 0.25);
    c.pos.z += arc;
    c.look.lerpVectors(this.fromLook, this.toLook, k);
    c.fov = this.fromFov + (this.toFov - this.fromFov) * k;
    c.offX = this.fromOffX + (this.toOffX - this.fromOffX) * k;
    c.offY = this.fromOffY + (this.toOffY - this.fromOffY) * k;
    applyPose(this.camera, c.pos, this.look.copy(c.look), c.fov, c.offX, c.offY, this.w, this.h);
  }
}

/** The center of a DOM element as fractions of the logical screen (null before layout). */
export function screenSpot(el: HTMLElement): { x: number; y: number; h: number } | null {
  const r = el.getBoundingClientRect();
  const c = S.game.r3.canvas.getBoundingClientRect();
  if (r.width < 2 || r.height < 2 || c.width < 2) return null;
  return { x: (r.left + r.width / 2 - c.left) / c.width, y: (r.top + r.height / 2 - c.top) / c.height, h: r.height / c.height };
}

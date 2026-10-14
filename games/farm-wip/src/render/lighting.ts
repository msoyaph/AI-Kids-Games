/**
 * Day-to-dusk lighting: a warm sun that crosses the sky, a soft sky/ground fill, and a sky colour
 * behind the diorama. Evening turns everything golden, then a friendly blue lantern night (never
 * dark: the farm always stays easy to see). Seasons tint the light a little.
 */
import * as THREE from 'three';
import { dayFrac, duskAmount, type Season } from '../sim/clock';
import { H, W } from '../sim/map';
import { rim } from './materials';
import { waterUniforms } from './water';
import { SEASON_PALETTES } from './palette';

export interface Sky { top: string; bottom: string }

const DAY = { sun: new THREE.Color(0xfff4dd), sky: new THREE.Color(0xd9f0ff), ground: new THREE.Color(0x9fbf7a), top: new THREE.Color(0x8fd0ff), bottom: new THREE.Color(0xe8f6ff), rim: new THREE.Color(0xfff1d0) };
const DUSK = { sun: new THREE.Color(0xffb27a), sky: new THREE.Color(0xffd9b8), ground: new THREE.Color(0xb48a6a), top: new THREE.Color(0xf7a07a), bottom: new THREE.Color(0xffe1b0), rim: new THREE.Color(0xffc98a) };
const NIGHT = { sun: new THREE.Color(0xb9c8ff), sky: new THREE.Color(0x9fb2e8), ground: new THREE.Color(0x56607a), top: new THREE.Color(0x34417a), bottom: new THREE.Color(0x7d86c4), rim: new THREE.Color(0xaec2ff) };
const SEASON_LIGHT: Record<Season, THREE.Color> = {
  spring: new THREE.Color(0xfff6f2), summer: new THREE.Color(0xffffff), autumn: new THREE.Color(0xfff0dc), winter: new THREE.Color(0xf2f6ff),
};

const c1 = new THREE.Color(), c2 = new THREE.Color();
/** day → dusk → night, by how far into the evening it is (0..1). */
function blend(key: keyof typeof DAY, amount: number, out: THREE.Color) {
  if (amount <= 0.5) return out.copy(DAY[key]).lerp(DUSK[key], amount * 2);
  return out.copy(DUSK[key]).lerp(NIGHT[key], (amount - 0.5) * 2);
}

export class Lighting {
  readonly sun = new THREE.DirectionalLight(0xffffff, 1.6);
  readonly fill = new THREE.HemisphereLight(0xffffff, 0x88aa66, 0.9);
  readonly sky: Sky = { top: '#8fd0ff', bottom: '#e8f6ff' };
  private lastShadowAt = -1;

  constructor(scene: THREE.Scene) {
    this.sun.castShadow = false;
    const s = this.sun.shadow;
    s.camera.left = -42; s.camera.right = 42; s.camera.top = 42; s.camera.bottom = -42;
    s.camera.near = 1; s.camera.far = 140;
    s.bias = -0.0006;
    s.normalBias = 0.02;
    this.sun.target.position.set(W / 2, 0, H / 2);
    scene.add(this.sun, this.sun.target, this.fill);
  }

  setShadows(on: boolean, size: number) {
    this.sun.castShadow = on;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  /** Updates everything for farm time `t`. Returns true when the shadow map should be redrawn. */
  update(t: number, season: Season): boolean {
    const evening = duskAmount(t);
    const f = dayFrac(t);
    // the sun rises in the east (+x), arcs over the south and sets in the west; at night a low moon
    const arc = f < 0.9 ? Math.min(1, Math.max(0, (f + 0.04) / 0.92)) : 0.5;
    const angle = Math.PI * arc;
    const height = f < 0.9 ? 0.35 + Math.sin(angle) * 0.65 : 0.7;
    this.sun.position.set(W / 2 + Math.cos(angle) * 40, 20 + height * 45, H / 2 + 22 + Math.sin(angle) * 6);
    const tint = SEASON_LIGHT[season];
    this.sun.color.copy(blend('sun', evening, c1)).multiply(tint);
    this.sun.intensity = 1.75 - evening * 0.75;
    this.fill.color.copy(blend('sky', evening, c1));
    this.fill.groundColor.copy(blend('ground', evening, c2));
    this.fill.intensity = 0.95 - evening * 0.15;
    rim.color.value.copy(blend('rim', evening, c1));
    this.sky.top = `#${blend('top', evening, c1).getHexString()}`;
    this.sky.bottom = `#${blend('bottom', evening, c2).getHexString()}`;
    const pal = SEASON_PALETTES[season];
    waterUniforms.shallow.value.setHex(pal.water).lerp(NIGHT.top, evening * 0.35);
    waterUniforms.deep.value.setHex(pal.waterDeep).lerp(NIGHT.top, evening * 0.35);
    // shadows follow the sun in small steps (redrawing the shadow map every frame is costly)
    const step = Math.round(f * 240);
    if (step !== this.lastShadowAt) { this.lastShadowAt = step; return true; }
    return false;
  }
}

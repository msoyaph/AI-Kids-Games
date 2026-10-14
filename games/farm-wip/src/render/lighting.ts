/**
 * Light through the day: a warm, low sun that rises in the east, stays a little to the south-east
 * through the middle of the day (so shadows fall back and to the left, and the fronts of things are
 * lit) and sets golden in the west; a sky and ground fill; a friendly blue lantern night that is never
 * dark. Seasons tint everything a little. Also the sky's colours, the haze, the water's colours and the
 * colour grade for the post-processing pass, and the sun's shadow box, fitted to what's on screen.
 */
import * as THREE from 'three';
import { dayFrac, duskAmount, type Season } from '../sim/clock';
import { fxUniforms } from './fx';
import type { Grade } from './post';
import { SEASON_PALETTES } from './palette';
import { setWaterColors, waterUniforms } from './water';

const C = (hex: number) => new THREE.Color(hex);
interface Look { sun: THREE.Color; sky: THREE.Color; ground: THREE.Color; zenith: THREE.Color; horizon: THREE.Color; rim: THREE.Color; gain: THREE.Color; lift: THREE.Color }
const DAY: Look = { sun: C(0xffe6c4), sky: C(0xcfe6ff), ground: C(0x9aa86a), zenith: C(0x5fa8e8), horizon: C(0xd6e9ef), rim: C(0xfff0d0), gain: C(0xfff6ea), lift: C(0x0a1020) };
const DUSK: Look = { sun: C(0xff9c5c), sky: C(0xffc9a8), ground: C(0xa07a5c), zenith: C(0x7a86d0), horizon: C(0xffc58e), rim: C(0xffc080), gain: C(0xffe2c2), lift: C(0x1a0c22) };
const NIGHT: Look = { sun: C(0xa8b8ff), sky: C(0x9fb0ea), ground: C(0x5a6488), zenith: C(0x28356c), horizon: C(0x5c6a9e), rim: C(0xb8ccff), gain: C(0xdde6ff), lift: C(0x0c1430) };
const SEASON_TINT: Record<Season, THREE.Color> = { spring: C(0xfff4f2), summer: C(0xffffff), autumn: C(0xfff0dc), winter: C(0xf0f5ff) };
const SEASON_SAT: Record<Season, number> = { spring: 1.05, summer: 1.06, autumn: 1.1, winter: 0.96 };

const c1 = new THREE.Color();
function blend(key: keyof Look, amount: number, out: THREE.Color) {
  if (amount <= 0.5) return out.copy(DAY[key]).lerp(DUSK[key], amount * 2);
  return out.copy(DUSK[key]).lerp(NIGHT[key], (amount - 0.5) * 2);
}

/** Where the sun is at a time of day: azimuth from south towards east (radians) and elevation. */
function sunAngles(f: number): { az: number; el: number } {
  if (f >= 0.9 || f < 0.04) return { az: 0.5, el: 0.85 }; // a high moon
  const p = Math.min(1, Math.max(0, (f - 0.04) / 0.86));
  const az = THREE.MathUtils.lerp(1.75, -1.25, p); // east → a little east of south at noon → west
  const el = 0.2 + Math.sin(p * Math.PI) * 0.62; // about 11° → 47° → 11°
  return { az, el };
}

export class Lighting {
  readonly sun = new THREE.DirectionalLight(0xffffff, 2.4);
  readonly fill = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.0);
  readonly zenith = new THREE.Color(0x5fa8e8);
  readonly horizon = new THREE.Color(0xd6e9ef);
  readonly grade: Grade = { lift: new THREE.Color(), gain: new THREE.Color(1, 1, 1), saturation: 1.1, contrast: 1.05 };
  /** The sun's direction (towards the sun). */
  readonly dir = new THREE.Vector3(0, 1, 0);
  private lastStep = -1;
  private box = { x: 0, z: 0, half: 0 };

  constructor(scene: THREE.Scene) {
    this.sun.castShadow = false;
    const s = this.sun.shadow;
    s.camera.near = 1; s.camera.far = 160;
    s.bias = -0.0004;
    s.normalBias = 0.025;
    s.radius = 3;
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

  /**
   * Fit the shadow box around what's on screen: centred on (x, z), `half` tiles each way. Snapped to
   * steps, so panning redraws the shadow map only now and then. Returns true when it moved.
   */
  fitShadows(x: number, z: number, half: number): boolean {
    const h = Math.max(6, Math.min(56, 2 ** (Math.ceil(Math.log2(half) * 4) / 4)));
    const step = h / 6;
    const sx = Math.round(x / step) * step, sz = Math.round(z / step) * step;
    if (sx === this.box.x && sz === this.box.z && h === this.box.half) return false;
    this.box = { x: sx, z: sz, half: h };
    const cam = this.sun.shadow.camera;
    cam.left = -h; cam.right = h; cam.top = h; cam.bottom = -h;
    cam.updateProjectionMatrix();
    this.place();
    return true;
  }

  private place() {
    this.sun.target.position.set(this.box.x, 0, this.box.z);
    this.sun.position.set(this.box.x + this.dir.x * 70, this.dir.y * 70, this.box.z + this.dir.z * 70);
    this.sun.target.updateMatrixWorld();
  }

  /** Updates everything for farm time `t`. Returns true when the shadow map should be redrawn. */
  update(t: number, season: Season): boolean {
    const evening = duskAmount(t);
    const f = dayFrac(t);
    const { az, el } = sunAngles(f);
    this.dir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.place();
    const tint = SEASON_TINT[season];
    this.sun.color.copy(blend('sun', evening, c1)).multiply(tint);
    this.sun.intensity = THREE.MathUtils.lerp(2.35, 1.0, evening);
    this.fill.color.copy(blend('sky', evening, c1));
    this.fill.groundColor.copy(blend('ground', evening, c1));
    this.fill.intensity = THREE.MathUtils.lerp(0.72, 1.05, evening);
    fxUniforms.rimColor.value.copy(blend('rim', evening, c1));
    blend('zenith', evening, this.zenith);
    blend('horizon', evening, this.horizon);
    if (season === 'winter') this.horizon.lerp(C(0xeef3f8), 0.4 * (1 - evening));
    fxUniforms.hazeColor.value.copy(this.horizon);
    // water: the season's colours, cooler at night
    const pal = SEASON_PALETTES[season];
    setWaterColors(c1.setHex(pal.water).lerp(NIGHT.zenith, evening * 0.4), new THREE.Color(pal.waterDeep).lerp(NIGHT.zenith, evening * 0.45));
    waterUniforms.sunDir.value.copy(this.dir);
    waterUniforms.sunColor.value.copy(this.sun.color).multiplyScalar(evening > 0.85 ? 0.5 : 1);
    // the grade: warm highlights by day, golden at dusk, cool blue at night
    blend('gain', evening, this.grade.gain);
    blend('lift', evening, this.grade.lift);
    this.grade.saturation = SEASON_SAT[season] * (1 - evening * 0.08);
    this.grade.contrast = 1.05;
    // shadows follow the sun in small steps (redrawing the shadow map every frame is costly)
    const step = Math.round(f * 240);
    if (step !== this.lastStep) { this.lastStep = step; return true; }
    return false;
  }
}

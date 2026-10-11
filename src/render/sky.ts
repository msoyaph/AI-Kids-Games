// Day/night + weather lighting.
import * as THREE from 'three';
import { mixHex, lerp, smoothstep } from '../core/math';
import type { WeatherT } from '../sim/state';
import { glowMats } from './models/buildings';

interface Key {
  h: number;
  sky: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunI: number;
}

const KEYS: Key[] = [
  { h: 0, sky: 0x2a3463, hemiSky: 0x6f7cc4, hemiGround: 0x3c3d60, hemi: 1.3, sun: 0xaabcff, sunI: 0.62 },
  { h: 4.5, sky: 0x353c6e, hemiSky: 0x7480c4, hemiGround: 0x404062, hemi: 1.3, sun: 0xb0c0ff, sunI: 0.6 },
  { h: 6, sky: 0xf8c0aa, hemiSky: 0xffdcc8, hemiGround: 0xa08f98, hemi: 1.4, sun: 0xffc9a0, sunI: 1.5 },
  { h: 8, sky: 0xc9ecff, hemiSky: 0xe8f6ff, hemiGround: 0xa9b898, hemi: 1.5, sun: 0xfff1da, sunI: 2.1 },
  { h: 12.5, sky: 0xb4e2ff, hemiSky: 0xeaf7ff, hemiGround: 0xafc09f, hemi: 1.55, sun: 0xffffff, sunI: 2.3 },
  { h: 16.5, sky: 0xffe2bd, hemiSky: 0xfff3e2, hemiGround: 0xb9b69c, hemi: 1.55, sun: 0xffe0b8, sunI: 2.0 },
  { h: 18.5, sky: 0xf7b2c0, hemiSky: 0xffe2e8, hemiGround: 0xb4b0a4, hemi: 1.6, sun: 0xffc8ae, sunI: 1.75 },
  { h: 20, sky: 0x7a6bb0, hemiSky: 0xb4b0ec, hemiGround: 0x6c6e8c, hemi: 1.45, sun: 0xc8c4ff, sunI: 0.9 },
  { h: 21.5, sky: 0x2f3768, hemiSky: 0x7380c6, hemiGround: 0x3e3f62, hemi: 1.3, sun: 0xaabcff, sunI: 0.62 },
  { h: 24, sky: 0x2a3463, hemiSky: 0x6f7cc4, hemiGround: 0x3c3d60, hemi: 1.3, sun: 0xaabcff, sunI: 0.62 },
];

function sample(h: number): Key {
  let a = KEYS[0]!, b = KEYS[1]!;
  for (let k = 0; k < KEYS.length - 1; k++) {
    if (h >= KEYS[k]!.h && h <= KEYS[k + 1]!.h) {
      a = KEYS[k]!;
      b = KEYS[k + 1]!;
      break;
    }
  }
  const t = smoothstep(0, 1, (h - a.h) / (b.h - a.h));
  return {
    h,
    sky: mixHex(a.sky, b.sky, t),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemi: lerp(a.hemi, b.hemi, t),
    sun: mixHex(a.sun, b.sun, t),
    sunI: lerp(a.sunI, b.sunI, t),
  };
}

/** 0 at full day, 1 at full night. */
export function nightFactor(minute: number): number {
  const h = minute / 60;
  if (h < 5) return 1;
  if (h < 7) return 1 - (h - 5) / 2;
  if (h < 18) return 0;
  if (h < 20.5) return (h - 18) / 2.5;
  return 1;
}

export class Sky {
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.4);
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  readonly fog = new THREE.Fog(0xb4e2ff, 38, 92);
  night = 0;
  private bg = new THREE.Color();
  shadows = true;

  constructor(scene: THREE.Scene) {
    scene.add(this.hemi);
    scene.add(this.sun);
    scene.add(this.sun.target);
    scene.fog = this.fog;
    scene.background = this.bg;
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 22;
    sc.bottom = -22;
    sc.near = 1;
    sc.far = 90;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
  }

  setShadows(on: boolean): void {
    this.shadows = on;
    this.sun.castShadow = on;
  }

  /** 0 spring, 1 summer, 2 autumn, 3 winter */
  season = 1;

  update(minute: number, weather: WeatherT, target: THREE.Vector3, indoor = false): void {
    const h = (minute / 60) % 24;
    const k = sample(h);
    let sky = k.sky;
    // a cooler, paler sky in winter; a warmer one in autumn; a touch of pink in spring
    if (this.season === 3) sky = mixHex(sky, 0xd6e2f0, 0.22);
    else if (this.season === 2) sky = mixHex(sky, 0xffd9b0, 0.12);
    else if (this.season === 0) sky = mixHex(sky, 0xffe4ee, 0.08);
    let sunI = k.sunI;
    let hemiI = k.hemi;
    if (weather === 'cloudy') {
      sky = mixHex(sky, 0xc9ced9, 0.45);
      sunI *= 0.55;
      hemiI *= 1.02;
    } else if (weather === 'rain') {
      sky = mixHex(sky, 0x93a0b5, 0.6);
      sunI *= 0.32;
      hemiI *= 0.95;
    }
    this.night = nightFactor(minute);
    this.bg.setHex(indoor ? 0x2a2438 : sky);
    this.fog.color.setHex(sky);
    this.hemi.color.setHex(k.hemiSky);
    this.hemi.groundColor.setHex(k.hemiGround);
    this.hemi.intensity = hemiI;
    this.sun.color.setHex(k.sun);
    this.sun.intensity = sunI;
    // Sun sweeps east -> west on the camera side of the sky; moon sits high at night.
    const a = ((h - 6) / 12) * Math.PI;
    const day = 1 - this.night;
    const sx = lerp(-7, Math.cos(a) * 16, day);
    const sy = lerp(26, 16 + Math.max(0, Math.sin(a)) * 14, day);
    const sz = 13;
    this.sun.position.set(target.x + sx, target.y + sy, target.z + sz);
    this.sun.target.position.copy(target);
    // lanterns / windows glow at dusk and night (and a little in rain)
    const glowAmt = Math.max(this.night, weather === 'rain' ? 0.35 : 0);
    glowMats.lantern.emissiveIntensity = 0.15 + glowAmt * 1.6;
    glowMats.window.emissiveIntensity = glowAmt * 1.1;
  }
}

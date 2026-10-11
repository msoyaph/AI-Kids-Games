import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Texture,
} from 'three';
import { Rng } from '../../core/rng';
import type { SurfaceStyle, Theme } from '../../data/themes';
import type { TileLayer } from '../../systems/tileMesh';
import { markShared } from '../dispose';

/**
 * How each exploration world looks in 3D: tileable detail textures (drawn on canvases), terrain
 * materials made from the theme colors, and the light (sun direction, colors, ambience, fog).
 */

export type DetailKind = SurfaceStyle | 'stone' | 'strata';

const ZEPHYRA = new Set(['zephyra', 'zcrystal', 'zbubble', 'zsky', 'zbeacon']);
export function isZephyra(th: Theme): boolean {
  return ZEPHYRA.has(th.id);
}

// ------------------------------------------------------------------ detail textures

const details = new Map<string, CanvasTexture>();

/**
 * A grey 256px tile of surface detail (1 texture repeat = 2 tiles). Used both as a color
 * modulation (`map`, values near white) and as a bump map.
 */
export function detailTexture(kind: DetailKind): CanvasTexture {
  let t = details.get(kind);
  if (t) return t;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rng = new Rng(`detail:${kind}`);
  g.fillStyle = '#e8e8e8';
  g.fillRect(0, 0, S, S);
  // Soft mottling for everything: big blotches, wrapped so the tile repeats seamlessly.
  const blot = (x: number, y: number, r: number, a: number, light: boolean) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        const col = light ? '255,255,255' : '40,40,40';
        gr.addColorStop(0, `rgba(${col},${a})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  };
  for (let i = 0; i < 26; i++) blot(rng.range(0, S), rng.range(0, S), rng.range(20, 70), rng.range(0.06, 0.16), rng.chance(0.4));
  const speck = (n: number, r0: number, r1: number, dark: number, light: number) => {
    for (let i = 0; i < n; i++) {
      const x = rng.range(0, S);
      const y = rng.range(0, S);
      const r = rng.range(r0, r1);
      g.fillStyle = rng.chance(0.5) ? `rgba(30,30,30,${dark})` : `rgba(255,255,255,${light})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  };
  const crater = (x: number, y: number, r: number) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        g.fillStyle = 'rgba(40,40,40,0.22)';
        g.beginPath();
        g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = Math.max(1.5, r * 0.18);
        g.beginPath();
        g.arc(x + ox + r * 0.08, y + oy + r * 0.08, r, Math.PI * 0.1, Math.PI * 1.1);
        g.stroke();
      }
    }
  };
  const lines = (n: number, color: string, width: number, jag: number) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = rng.range(0, S);
      let y = rng.range(0, S);
      g.beginPath();
      g.moveTo(x, y);
      const ang = rng.range(0, Math.PI * 2);
      for (let k = 0; k < 6; k++) {
        x += Math.cos(ang + rng.range(-jag, jag)) * rng.range(8, 22);
        y += Math.sin(ang + rng.range(-jag, jag)) * rng.range(8, 22);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  };
  switch (kind) {
    case 'dust':
      for (let i = 0; i < 9; i++) crater(rng.range(0, S), rng.range(0, S), rng.range(6, 20));
      speck(420, 0.6, 2.2, 0.25, 0.3);
      break;
    case 'sand':
    case 'strata':
      for (let y = 0; y < S; y += rng.int(10, 22)) {
        g.fillStyle = `rgba(${rng.chance(0.5) ? '255,255,255' : '30,30,30'},${rng.range(0.06, 0.16)})`;
        g.fillRect(0, y, S, rng.range(3, 9));
      }
      speck(300, 0.5, 1.6, 0.2, 0.25);
      break;
    case 'grass':
    case 'moss':
      for (let i = 0; i < 900; i++) {
        const x = rng.range(0, S);
        const y = rng.range(0, S);
        g.strokeStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.22)' : 'rgba(20,40,20,0.22)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rng.range(-2, 2), y - rng.range(3, 8));
        g.stroke();
      }
      break;
    case 'ice':
      lines(16, 'rgba(255,255,255,0.55)', 1.6, 0.6);
      lines(8, 'rgba(60,90,120,0.25)', 1.2, 0.5);
      break;
    case 'snow':
      speck(260, 0.6, 1.8, 0.08, 0.5);
      break;
    case 'metal': {
      g.strokeStyle = 'rgba(30,30,40,0.45)';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, S / 2 - 3, S / 2 - 3);
      g.strokeRect(S / 2 + 1.5, 1.5, S / 2 - 3, S / 2 - 3);
      g.strokeRect(1.5, S / 2 + 1.5, S - 3, S / 2 - 3);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      for (const [x, y] of [[12, 12], [S / 2 - 12, 12], [S / 2 + 12, 12], [S - 12, 12], [12, S / 2 + 12], [S - 12, S / 2 + 12], [12, S - 12], [S - 12, S - 12]]) {
        g.beginPath();
        g.arc(x, y, 3.5, 0, Math.PI * 2);
        g.fill();
      }
      speck(120, 0.5, 1.2, 0.15, 0.15);
      break;
    }
    case 'crystal':
      lines(22, 'rgba(255,255,255,0.4)', 2, 0.15);
      lines(12, 'rgba(40,20,60,0.3)', 1.5, 0.15);
      break;
    case 'stone':
      lines(14, 'rgba(30,30,30,0.35)', 2, 0.7);
      speck(260, 0.6, 2, 0.22, 0.22);
      break;
  }
  t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(0.5, 0.5);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  markShared(t);
  details.set(kind, t);
  return t;
}

const farDetails = new Map<string, Texture>();

/** The same detail at a bigger scale, for ground far behind the path (less busy). */
function farDetail(kind: DetailKind): Texture {
  let t = farDetails.get(kind);
  if (!t) {
    t = markShared(detailTexture(kind).clone());
    t.repeat.set(0.16, 0.16);
    farDetails.set(kind, t);
  }
  return t;
}

// ------------------------------------------------------------------ terrain materials

function groundDetail(th: Theme): DetailKind {
  if (th.surfaceStyle === 'sand') return 'strata';
  if (th.surfaceStyle === 'metal' || th.surfaceStyle === 'crystal') return 'stone';
  if (th.surfaceStyle === 'grass' || th.surfaceStyle === 'moss') return 'stone';
  return 'dust';
}

function rockDetail(th: Theme): DetailKind {
  return th.rockStyle === 'metal' ? 'metal' : th.rockStyle === 'ice' ? 'ice' : th.rockStyle === 'crystal' ? 'crystal' : 'stone';
}

/** A trim color that glows (platform edges, pad lights): cyan on real worlds, pink on Zephyra. */
export function trimColor(th: Theme): string {
  return isZephyra(th) ? '#ff9ad9' : th.id === 'earth' ? '#ffe066' : '#7dffe9';
}

const terrainMats = new Map<string, Material>();

function cached(key: string, make: () => Material): Material {
  let m = terrainMats.get(key);
  if (!m) {
    m = markShared(make());
    terrainMats.set(key, m);
  }
  return m;
}

/** The material for one terrain layer (shared per theme; goo is made per scene because it animates). */
export function terrainMaterial(th: Theme, layer: Exclude<TileLayer, 'goo'> | 'back'): Material {
  return cached(`${th.id}:${layer}`, () => {
    const zeph = isZephyra(th);
    switch (layer) {
      case 'ground':
      case 'back': {
        if (layer === 'back' && th.midStyle === 'clouds') {
          // Sky islands float over a soft sea of clouds.
          const d = farDetail('snow');
          return new MeshStandardMaterial({ color: th.mid, map: d, roughness: 1, vertexColors: true, emissive: new Color(th.mid).multiplyScalar(0.4) });
        }
        const d = layer === 'back' ? farDetail(groundDetail(th)) : detailTexture(groundDetail(th));
        return new MeshStandardMaterial({
          color: layer === 'back' ? mixHex(th.ground, th.mid, 0.35) : th.ground,
          map: d,
          bumpMap: d,
          bumpScale: 1.4,
          roughness: 0.92,
          vertexColors: true,
          emissive: zeph ? new Color(th.ground).multiplyScalar(0.12) : new Color(0),
        });
      }
      case 'lip': {
        const s = th.surfaceStyle;
        const d = detailTexture(s);
        const shiny = s === 'ice' || s === 'crystal';
        const m = new MeshStandardMaterial({
          color: th.surface,
          map: d,
          bumpMap: d,
          bumpScale: shiny ? 0.6 : 1.2,
          roughness: shiny ? 0.25 : s === 'snow' ? 0.65 : s === 'metal' ? 0.4 : 0.88,
          metalness: s === 'metal' ? 0.45 : 0,
          vertexColors: true,
          envMapIntensity: shiny ? 1.6 : 1,
        });
        if (s === 'crystal' || (zeph && s === 'grass')) m.emissive = new Color(th.surface).multiplyScalar(0.18);
        if (s === 'snow') m.color.multiplyScalar(0.9);
        return m;
      }
      case 'rock': {
        const d = detailTexture(rockDetail(th));
        const st = th.rockStyle;
        const m = new MeshStandardMaterial({
          color: th.rock,
          map: d,
          bumpMap: d,
          bumpScale: st === 'metal' ? 0.8 : 1.3,
          roughness: st === 'metal' ? 0.34 : st === 'ice' ? 0.12 : st === 'crystal' ? 0.2 : 0.9,
          metalness: st === 'metal' ? 0.62 : 0,
          vertexColors: true,
          envMapIntensity: st === 'stone' ? 0.8 : 1.8,
        });
        if (st === 'crystal') m.emissive = new Color(th.rock).multiplyScalar(0.3);
        if (st === 'ice') m.emissive = new Color('#4dd4ff').multiplyScalar(0.08);
        return m;
      }
      case 'ice': {
        const d = detailTexture('ice');
        return new MeshStandardMaterial({ color: '#c4f1ff', map: d, bumpMap: d, bumpScale: 0.5, roughness: 0.08, metalness: 0, vertexColors: true, emissive: new Color('#4dd4ff').multiplyScalar(0.14), envMapIntensity: 2 });
      }
      case 'platform': {
        const d = detailTexture('metal');
        return new MeshStandardMaterial({ color: th.platform, map: d, roughness: 0.38, metalness: 0.35, vertexColors: true, envMapIntensity: 1.6 });
      }
      case 'trim':
        return new MeshStandardMaterial({ color: '#000000', emissive: new Color(trimColor(th)), emissiveIntensity: 2.4, roughness: 1 });
    }
  });
}

/** Bouncy jelly: glossy, glowing a little, with a wobbling surface (`uTime` drives it). */
export function gooMaterial(th: Theme): { material: MeshStandardMaterial; time: { value: number } } {
  const time = { value: 0 };
  const m = new MeshStandardMaterial({
    color: th.goo,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.86,
    emissive: new Color(th.goo).multiplyScalar(0.45),
    envMapIntensity: 1.8,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aWobble;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y += aWobble * (sin(position.x * 2.3 + uTime * 3.1) * 0.055 + sin(position.x * 5.7 - uTime * 2.2 + position.z * 2.0) * 0.03);`,
      );
  };
  m.customProgramCacheKey = () => 'goo-wobble';
  return { material: m, time };
}

// ------------------------------------------------------------------ light

export interface SurfaceLight {
  /** Direction toward the main sun (world space, normalized). */
  sunDir: Vector3;
  sunColor: string;
  sunIntensity: number;
  /** Zephyra's second sun. */
  sun2?: { dir: Vector3; color: string; intensity: number };
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  envIntensity: number;
  /** Distance fog toward the horizon color (start, end). */
  fog: [string, number, number];
  /** Black sky with stars (airless worlds) vs a colored sky. */
  space: boolean;
}

export function mixHex(a: string, b: string, t: number): string {
  return `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
}

export function surfaceLight(th: Theme): SurfaceLight {
  const zeph = isZephyra(th);
  const airless = th.stars && !zeph;
  // The Sun sits where the 2D sky put it for Mercury; elsewhere it shines from the upper right front.
  const sunLeft = th.skyPlanet?.body === 'sun';
  const sunDir = new Vector3(sunLeft ? -0.62 : 0.5, 0.62, 0.6).normalize();
  const hazy = !!th.haze;
  const base: SurfaceLight = {
    sunDir,
    sunColor: hazy ? mixHex('#fff4e2', th.haze!, 0.4) : '#fff4e2',
    sunIntensity: airless ? 3.1 : hazy ? 2.2 : 2.6,
    hemiSky: mixHex(th.sky[1], '#ffffff', airless ? 0.2 : 0.35),
    hemiGround: th.ground2,
    hemiIntensity: airless ? 0.55 : 0.95,
    envIntensity: airless ? 0.45 : 0.7,
    fog: [th.sky[1], 34, airless ? 380 : 280],
    space: th.stars,
  };
  if (th.id === 'earth') {
    base.sunColor = '#fff6e6';
    base.hemiSky = '#bfe3ff';
    base.hemiGround = '#5a8a3a';
    base.hemiIntensity = 1.05;
  }
  if (zeph) {
    base.sunColor = '#ffc890';
    base.sunIntensity = 2.1;
    base.sunDir.set(-0.55, 0.62, 0.56).normalize();
    base.sun2 = { dir: new Vector3(0.7, 0.45, 0.55).normalize(), color: '#ff9ad9', intensity: 0.95 };
    base.hemiSky = mixHex(th.sky[1], '#c89bff', 0.4);
    base.hemiIntensity = 1.0;
    base.envIntensity = 0.75;
  }
  return base;
}


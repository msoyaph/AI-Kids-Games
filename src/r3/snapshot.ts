import { DataUtils, DirectionalLight, HalfFloatType, HemisphereLight, PerspectiveCamera, Scene, UnsignedByteType, Vector3, WebGLRenderTarget, type Object3D, type Texture, type WebGLRenderer } from 'three';
import { canRenderHalfFloat } from './bake';

/**
 * Renders a small 3D picture (a planet, a rocket, a character) into a 2D canvas for the DOM UI.
 * Renders HDR into an offscreen target, then tone maps (ACES) and sRGB-encodes on the CPU so
 * the picture matches the game and keeps a transparent background.
 */
let rt: WebGLRenderTarget | null = null;
let rtW = 0;
let rtH = 0;
let half16: Uint16Array | null = null;
let bytes8: Uint8Array | null = null;
const scene = new Scene();
const camera = new PerspectiveCamera(30, 1, 0.1, 100);
const key = new DirectionalLight('#fff4e0', 2.4);
key.position.set(3, 5, 6);
const rim = new DirectionalLight('#9fb4ff', 1.4);
rim.position.set(-5, 2, -4);
const hemi = new HemisphereLight('#d6dcff', '#3a2a66', 0.7);
const lights = [key, rim, hemi];

function aces(x: number): number {
  // Narkowicz ACES fit, with the same exposure boost three.js uses.
  x *= 0.6 / 0.6;
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)));
}

function srgb(x: number): number {
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export interface SnapshotOptions {
  size: number;
  /** Non-square pictures: width/height in pixels (defaults to size x size). */
  width?: number;
  height?: number;
  /** Studio lights and reflections (for rockets and characters; planets light themselves). */
  lit?: Texture | null;
  /** Camera distance and field of view framing an object of radius ~1 at the origin. */
  distance?: number;
  fov?: number;
  lookAt?: Vector3;
  /** Called before rendering (e.g. to update planet uniforms). */
  prepare?: () => void;
}

export function snapshot(renderer: WebGLRenderer, object: Object3D, o: SnapshotOptions): HTMLCanvasElement {
  const W = o.width ?? o.size;
  const H = o.height ?? o.size;
  const half = canRenderHalfFloat(renderer);
  if (!rt || rtW !== W || rtH !== H) {
    rt?.dispose();
    // Supersample instead of MSAA (multisampled targets misbehave on some GPUs).
    rt = new WebGLRenderTarget(W, H, { type: half ? HalfFloatType : UnsignedByteType, depthBuffer: true });
    rtW = W;
    rtH = H;
    half16 = half ? new Uint16Array(W * H * 4) : null;
    bytes8 = half ? null : new Uint8Array(W * H * 4);
  }
  camera.fov = o.fov ?? 30;
  camera.aspect = W / H;
  camera.position.set(0, 0, o.distance ?? 4.2);
  camera.lookAt(o.lookAt ?? new Vector3());
  camera.updateProjectionMatrix();
  const parent = object.parent;
  scene.add(object);
  if (o.lit !== undefined) {
    scene.add(...lights);
    scene.environment = o.lit;
    scene.environmentIntensity = 1;
  }
  o.prepare?.();
  const prevTarget = renderer.getRenderTarget();
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(rt);
  renderer.setClearAlpha(0);
  renderer.clear(true, true, false);
  renderer.render(scene, camera);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  try {
    if (half16) renderer.readRenderTargetPixels(rt, 0, 0, W, H, half16);
    else if (bytes8) renderer.readRenderTargetPixels(rt, 0, 0, W, H, bytes8);
    if (ctx) {
      const img = ctx.createImageData(W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        // WebGL rows go bottom-up.
        const src = (H - 1 - y) * W * 4;
        const dst = y * W * 4;
        for (let x = 0; x < W; x++) {
          const i = src + x * 4;
          const j = dst + x * 4;
          let r: number;
          let g: number;
          let b: number;
          let a: number;
          if (half16) {
            r = DataUtils.fromHalfFloat(half16[i]);
            g = DataUtils.fromHalfFloat(half16[i + 1]);
            b = DataUtils.fromHalfFloat(half16[i + 2]);
            a = DataUtils.fromHalfFloat(half16[i + 3]);
          } else {
            r = bytes8![i] / 255;
            g = bytes8![i + 1] / 255;
            b = bytes8![i + 2] / 255;
            a = bytes8![i + 3] / 255;
          }
          a = Math.min(1, Math.max(0, a));
          // Colors are premultiplied by coverage at the edges; un-premultiply for the canvas.
          const inv = a > 0.001 ? 1 / a : 0;
          d[j] = srgb(aces(r * inv)) * 255;
          d[j + 1] = srgb(aces(g * inv)) * 255;
          d[j + 2] = srgb(aces(b * inv)) * 255;
          d[j + 3] = a * 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  } catch (err) {
    console.warn('Snapshot failed', err);
  }
  renderer.setRenderTarget(prevTarget);
  renderer.setClearAlpha(prevAlpha);
  scene.remove(object, ...lights);
  scene.environment = null;
  if (parent) parent.add(object);
  return out;
}

/** Copies a cached canvas so it can be placed in the DOM more than once. */
export function cloneCanvas(src: HTMLCanvasElement, cssSize?: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')?.drawImage(src, 0, 0);
  if (cssSize) {
    c.style.width = `${cssSize}px`;
    c.style.height = `${cssSize}px`;
  }
  return c;
}

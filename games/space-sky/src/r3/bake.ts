import {
  BackSide,
  CubeCamera,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  UnsignedByteType,
  WebGLCubeRenderTarget,
  type IUniform,
  type WebGLRenderer,
} from 'three';
import { NOISE_GLSL } from './shaders/noise';

export interface CubeBakeOptions {
  size: number;
  /** GLSL that defines `vec4 bake(vec3 dir)`; `dir` is the unit direction from the centre. */
  shader: string;
  uniforms?: Record<string, IUniform>;
  defines?: Record<string, string | number>;
  mipmaps?: boolean;
  /** Store in half floats (HDR) when the device can render to them. */
  hdr?: boolean;
}

let canHalf: boolean | null = null;
export function canRenderHalfFloat(renderer: WebGLRenderer): boolean {
  if (canHalf === null) canHalf = renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float');
  return canHalf;
}

/**
 * Renders a procedural function of direction into a cube map on the GPU, once.
 * Used for the nebula sky and baked planet surfaces: the expensive noise runs once,
 * and every frame afterwards is a cheap texture lookup with no seams or pole pinching.
 */
export function bakeCube(renderer: WebGLRenderer, o: CubeBakeOptions): WebGLCubeRenderTarget {
  const hdr = !!o.hdr && canRenderHalfFloat(renderer);
  const rt = new WebGLCubeRenderTarget(o.size, {
    type: hdr ? HalfFloatType : UnsignedByteType,
    generateMipmaps: o.mipmaps !== false,
    minFilter: o.mipmaps !== false ? LinearMipmapLinearFilter : LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });
  if (!hdr) rt.texture.colorSpace = SRGBColorSpace;
  const geo = new SphereGeometry(1, 16, 8);
  const mat = new ShaderMaterial({
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: o.uniforms ?? {},
    defines: { OCTAVES: 4, ...(o.defines ?? {}) },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      ${NOISE_GLSL}
      ${o.shader}
      void main() {
        gl_FragColor = bake(normalize(vDir));
      }`,
  });
  const scene = new Scene();
  scene.add(new Mesh(geo, mat));
  const cam = new CubeCamera(0.1, 10, rt);
  const prevTarget = renderer.getRenderTarget();
  cam.update(renderer, scene);
  renderer.setRenderTarget(prevTarget);
  geo.dispose();
  mat.dispose();
  return rt;
}

import { BackSide, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, Vector3, type Texture, type WebGLRenderer } from 'three';
import { markShared } from './dispose';

export interface EnvStyle {
  top: [number, number, number];
  horizon: [number, number, number];
  bottom: [number, number, number];
  key: [number, number, number];
  keyDir: Vector3;
  fill: [number, number, number];
}

export const SPACE_STUDIO: EnvStyle = {
  top: [0.55, 0.62, 1.0],
  horizon: [0.42, 0.32, 0.85],
  bottom: [0.05, 0.03, 0.14],
  key: [6.0, 5.4, 4.6],
  keyDir: new Vector3(0.6, 0.55, 0.55).normalize(),
  fill: [0.6, 1.4, 2.2],
};

/**
 * A soft procedural "photo studio in space" environment for reflections on metal, paint and glass.
 * No image files: a gradient dome with a warm key light and a cool rim light, prefiltered with PMREM.
 */
export function makeEnvironment(renderer: WebGLRenderer, style: EnvStyle = SPACE_STUDIO): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const scene = new Scene();
  const geo = new SphereGeometry(10, 48, 24);
  const v3 = (c: [number, number, number]) => new Vector3(c[0], c[1], c[2]);
  const mat = new ShaderMaterial({
    side: BackSide,
    uniforms: {
      uTop: { value: v3(style.top) },
      uHorizon: { value: v3(style.horizon) },
      uBottom: { value: v3(style.bottom) },
      uKey: { value: v3(style.key) },
      uKeyDir: { value: style.keyDir.clone().normalize() },
      uFill: { value: v3(style.fill) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom, uKey, uKeyDir, uFill;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = y > 0.0 ? mix(uHorizon, uTop, smoothstep(0.0, 0.8, y)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.5, -y));
        float k = max(dot(d, uKeyDir), 0.0);
        c += uKey * pow(k, 24.0) + uKey * 0.15 * pow(k, 4.0);
        float f = max(dot(d, normalize(vec3(-uKeyDir.x, 0.2, -uKeyDir.z))), 0.0);
        c += uFill * pow(f, 10.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new Mesh(geo, mat));
  const rt = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return markShared(rt.texture);
}

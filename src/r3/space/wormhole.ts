import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { OUTPUT_GLSL } from '../materials';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Billboard: keep the quad facing the camera, centered on the object.
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = length(modelMatrix[0].xyz);
  c.xy += position.xy * s;
  gl_Position = projectionMatrix * c;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uA, uB, uC;
uniform float uDim;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  // Spiral arms that wind inward over time.
  float arms = sin(a * 3.0 + log(r + 0.02) * 7.0 + uTime * 2.2);
  float arms2 = sin(a * 5.0 - log(r + 0.02) * 4.0 - uTime * 1.3);
  float swirl = 0.5 + 0.5 * arms * 0.8 + 0.2 * arms2;
  vec3 col = mix(uA, uB, smoothstep(0.1, 0.9, swirl));
  col = mix(col, uC, smoothstep(0.55, 0.0, r) * 0.6);
  float rim = smoothstep(1.0, 0.82, r) * smoothstep(0.55, 0.85, r);
  float body = smoothstep(1.0, 0.3, r);
  float core = smoothstep(0.28, 0.0, r);
  vec3 c = col * (body * (0.6 + swirl * 0.8)) + uC * rim * 1.4 + vec3(1.0, 0.95, 1.0) * core * 2.5;
  float alpha = clamp(body * 0.9 + rim + core, 0.0, 1.0);
  gl_FragColor = vec4(c * uDim, alpha * uDim);
  ${OUTPUT_GLSL}
}`;

/** The swirling wormhole portal (a camera-facing disc). Scale the mesh to set its radius. */
export function makeWormhole(): { mesh: Mesh; material: ShaderMaterial } {
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new Color('#6b3fd4').multiplyScalar(1.2) },
      uB: { value: new Color('#ff7ad9').multiplyScalar(1.4) },
      uC: { value: new Color('#7dffe9').multiplyScalar(1.6) },
      uDim: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

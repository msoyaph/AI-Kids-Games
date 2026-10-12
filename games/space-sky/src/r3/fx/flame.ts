import { AdditiveBlending, Color, ConeGeometry, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { markShared } from '../dispose';
import { OUTPUT_GLSL } from '../materials';

const FLAME_VERT = /* glsl */ `
uniform float uLen;
uniform float uWidth;
uniform float uTime;
varying vec2 vUv;
varying float vAlong;
varying float vEdge;
void main() {
  vUv = uv;
  // Cone geometry points down from y=0 (nozzle) to y=-1 (tip); stretch by thrust and wobble a bit.
  vec3 p = position;
  float along = clamp(-p.y, 0.0, 1.0);
  vAlong = along;
  float wob = sin(uTime * 31.0 + along * 9.0) * 0.06 + sin(uTime * 17.0 + along * 4.0) * 0.04;
  p.x *= uWidth * (1.0 + wob * along);
  p.z *= uWidth * (1.0 - wob * along);
  p.y *= uLen;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vEdge = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;

const FLAME_FRAG = /* glsl */ `
uniform vec3 uOuter;
uniform vec3 uInner;
uniform float uTime;
uniform float uPower;
uniform float uCore;
varying vec2 vUv;
varying float vAlong;
varying float vEdge;
void main() {
  float a = vAlong;
  float rings = 0.82 + 0.18 * sin(a * 26.0 - uTime * 42.0);
  float fade = pow(1.0 - a, uCore > 0.5 ? 2.2 : 1.4);
  vec3 col = mix(uInner, uOuter, smoothstep(0.0, uCore > 0.5 ? 0.6 : 0.9, a));
  float soft = smoothstep(0.0, uCore > 0.5 ? 0.5 : 0.75, vEdge);
  float intensity = fade * rings * soft * uPower * (uCore > 0.5 ? 2.6 : 1.3);
  gl_FragColor = vec4(col * intensity, 1.0);
  ${OUTPUT_GLSL}
}`;

const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;
void main() {
  vUv = uv;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}`;

const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float g = (exp(-r * r * 6.0) * 1.4 + exp(-r * 3.0) * 0.3) * smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(uColor * g * uPower, 1.0);
  ${OUTPUT_GLSL}
}`;

let coneGeo: ConeGeometry | null = null;
let quadGeo: PlaneGeometry | null = null;

function cone(): ConeGeometry {
  if (!coneGeo) {
    // Tip at y=-1, base (nozzle) at y=0.
    coneGeo = new ConeGeometry(1, 1, 20, 6, true);
    coneGeo.rotateX(Math.PI);
    coneGeo.translate(0, -0.5, 0);
    markShared(coneGeo);
  }
  return coneGeo;
}

function quad(): PlaneGeometry {
  if (!quadGeo) quadGeo = markShared(new PlaneGeometry(2, 2));
  return quadGeo;
}

/**
 * An engine flame: a soft outer cone, a bright core and a glow at the nozzle (blooms on Medium/High).
 * `set(thrust, boost)` every frame.
 */
export class Flame {
  readonly group = new Group();
  private readonly outer: ShaderMaterial;
  private readonly core: ShaderMaterial;
  private readonly glow: ShaderMaterial;
  private readonly radius: number;
  private len = 0;

  constructor(radius: number, outerColor: string, innerColor: string) {
    this.radius = radius;
    const mk = (core: boolean) =>
      new ShaderMaterial({
        uniforms: {
          uOuter: { value: new Color(outerColor) },
          uInner: { value: new Color(innerColor) },
          uTime: { value: 0 },
          uPower: { value: 1 },
          uLen: { value: 1 },
          uWidth: { value: 1 },
          uCore: { value: core ? 1 : 0 },
        },
        vertexShader: FLAME_VERT,
        fragmentShader: FLAME_FRAG,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      });
    this.outer = mk(false);
    this.core = mk(true);
    const o = new Mesh(cone(), this.outer);
    const c = new Mesh(cone(), this.core);
    o.frustumCulled = false;
    c.frustumCulled = false;
    o.renderOrder = 5;
    c.renderOrder = 6;
    this.glow = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(innerColor).lerp(new Color(outerColor), 0.4) }, uPower: { value: 1 }, uSize: { value: radius * 2.6 } },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const g = new Mesh(quad(), this.glow);
    g.frustumCulled = false;
    g.renderOrder = 7;
    this.group.add(o, c, g);
  }

  /** thrust 0..1, boost adds a long hot flame. */
  set(time: number, thrust: number, boost: number): void {
    const target = 0.25 + thrust * 1.1 + boost * 1.4;
    this.len += (target - this.len) * 0.25;
    const r = this.radius;
    const flick = 1 + Math.sin(time * 47) * 0.05 + Math.sin(time * 29) * 0.04;
    const len = this.len * r * 4.2 * flick;
    this.outer.uniforms.uLen.value = len;
    this.outer.uniforms.uWidth.value = r * 0.95;
    this.core.uniforms.uLen.value = len * 0.62;
    this.core.uniforms.uWidth.value = r * 0.5;
    const power = 0.55 + thrust * 0.6 + boost * 0.5;
    this.outer.uniforms.uPower.value = power;
    this.core.uniforms.uPower.value = power;
    this.outer.uniforms.uTime.value = time;
    this.core.uniforms.uTime.value = time;
    this.glow.uniforms.uPower.value = 0.5 + thrust * 0.6 + boost * 0.6;
    this.glow.uniforms.uSize.value = r * (2.4 + boost * 0.8);
  }
}

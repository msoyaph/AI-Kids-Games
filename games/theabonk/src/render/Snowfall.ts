import * as THREE from 'three';

const COUNT = 1400;
const BOX = new THREE.Vector3(70, 34, 70);

const VERT = `
uniform float uTime;
uniform vec3 uOrigin;
uniform vec3 uBox;
uniform float uSize;
attribute float aPhase;
varying float vFade;
void main() {
  // flakes fall and flutter (wind drift moves the whole object); positions wrap inside a box
  // around the camera
  vec3 p = position + vec3(0.0, -2.2 * uTime, 0.0);
  p.x += sin(uTime * 1.3 + aPhase) * 0.6;
  p.z += cos(uTime * 1.1 + aPhase * 1.7) * 0.6;
  p = mod(p - uOrigin + uBox * 0.5, uBox) + uOrigin - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  vFade = smoothstep(1.0, 4.0, d) * (1.0 - smoothstep(24.0, 34.0, d));
  gl_PointSize = uSize * (1.0 + fract(aPhase) * 0.8) * 60.0 / max(d, 1.0);
}`;

const FRAG = `
uniform float uOpacity;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.2, length(c)) * vFade * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0), a);
}`;

/** Ambient snowfall around the camera (one draw call; all motion on the GPU). */
export class Snowfall {
  readonly points: THREE.Points;
  private uniforms = {
    uTime: { value: 0 },
    uOrigin: { value: new THREE.Vector3() },
    uBox: { value: BOX.clone() },
    uSize: { value: 1 },
    uOpacity: { value: 0 },
  };
  private time = 0;
  private wind = new THREE.Vector2(1.2, 0.4);
  /** 0 = off; 1 = normal snowfall; >1 = blizzard. */
  density = 0;

  constructor() {
    const pos = new Float32Array(COUNT * 3);
    const phase = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = Math.random() * BOX.x;
      pos[i * 3 + 1] = Math.random() * BOX.y;
      pos[i * 3 + 2] = Math.random() * BOX.z;
      phase[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.points.name = 'snowfall';
    this.points.visible = false;
  }

  /**
   * Advance the flakes. windX/windZ: current gust push (u/s); the drift eases toward it so a
   * gust visibly sweeps the snow sideways.
   */
  update(dt: number, cam: THREE.Vector3, windX: number, windZ: number): void {
    this.points.visible = this.density > 0.01;
    if (!this.points.visible) return;
    this.time += dt;
    const k = Math.min(1, dt * 2);
    this.wind.x += (1.2 + windX * 2.2 - this.wind.x) * k;
    this.wind.y += (0.4 + windZ * 2.2 - this.wind.y) * k;
    const u = this.uniforms;
    // integrate the drift so changing the wind never makes flakes jump
    this.offset.x += this.wind.x * dt;
    this.offset.y += this.wind.y * dt;
    u.uTime.value = this.time;
    this.points.position.set(this.offset.x % BOX.x, 0, this.offset.y % BOX.z);
    u.uOrigin.value.set(cam.x - this.points.position.x, cam.y + 6, cam.z - this.points.position.z);
    u.uOpacity.value = Math.min(1, this.density) * 0.85;
    u.uSize.value = 1 + Math.max(0, this.density - 1) * 0.4;
  }

  private offset = new THREE.Vector2();
}

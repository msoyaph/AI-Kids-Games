import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  TorusGeometry,
  type Object3D,
} from 'three';
import type { QualityProfile } from '../../systems/quality';
import { OUTPUT_GLSL } from '../materials';

const FLOOR_FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uLine;
uniform float uTime;
varying vec3 vPos;
void main() {
  vec2 p = vPos.xz;
  float r = length(p);
  vec2 g = abs(fract(p * 0.5) - 0.5);
  float grid = smoothstep(0.47, 0.5, max(g.x, g.y));
  float rings = smoothstep(0.04, 0.0, abs(fract(r * 0.25 - uTime * 0.05) - 0.5) - 0.46);
  vec3 col = uBase * (1.0 - smoothstep(4.0, 26.0, r) * 0.75);
  col += uLine * grid * 0.25 * (1.0 - smoothstep(3.0, 20.0, r));
  col += uLine * rings * 0.15 * (1.0 - smoothstep(2.0, 12.0, r));
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}`;

const WALL_FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uGlow;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * vec2(24.0, 6.0);
  vec2 cell = fract(p);
  float panel = smoothstep(0.0, 0.03, cell.x) * smoothstep(1.0, 0.97, cell.x) * smoothstep(0.0, 0.05, cell.y) * smoothstep(1.0, 0.95, cell.y);
  vec3 col = uBase * (0.75 + 0.25 * panel);
  float strip = smoothstep(0.03, 0.0, abs(vUv.y - 0.72)) + smoothstep(0.02, 0.0, abs(vUv.y - 0.3)) * 0.6;
  float pulse = 0.8 + 0.2 * sin(vUv.x * 40.0 - uTime * 2.0);
  col += uGlow * strip * pulse * 1.6;
  col *= 0.55 + 0.45 * smoothstep(0.0, 0.5, vUv.y);
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}`;

const VERT_POS = /* glsl */ `
varying vec3 vPos;
varying vec2 vUv;
void main() {
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}`;

export interface HangarBay {
  group: Group;
  /** The turntable top the rocket hovers over (y of its surface). */
  turntable: Group;
  topY: number;
  key: DirectionalLight;
  update(time: number): void;
}

/**
 * The rocket hangar: a glowing turntable on a gridded floor, a curved wall with light strips,
 * crates and fuel tanks in the back. Soft shadows on High only.
 */
export function buildHangarBay(p: QualityProfile): HangarBay {
  const group = new Group();
  const floorMat = new ShaderMaterial({
    uniforms: { uBase: { value: new Color('#262a52') }, uLine: { value: new Color('#7fd0ff') }, uTime: { value: 0 } },
    vertexShader: VERT_POS,
    fragmentShader: FLOOR_FRAG,
  });
  const floor = new Mesh(new CircleGeometry(30, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const wallMat = new ShaderMaterial({
    uniforms: { uBase: { value: new Color('#2f3470') }, uGlow: { value: new Color('#4dd4ff') }, uTime: { value: 0 } },
    vertexShader: VERT_POS,
    fragmentShader: WALL_FRAG,
    side: DoubleSide,
  });
  const wall = new Mesh(new CylinderGeometry(16, 16, 12, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), wallMat);
  wall.position.set(0, 6, -3);
  group.add(wall);

  // Turntable.
  const turntable = new Group();
  const metal = new MeshStandardMaterial({ color: '#8c94b8', metalness: 0.85, roughness: 0.32, envMapIntensity: 1.8 });
  const dark = new MeshStandardMaterial({ color: '#3a3f66', metalness: 0.6, roughness: 0.45 });
  const base = new Mesh(new CylinderGeometry(2.0, 2.25, 0.35, 64), dark);
  base.position.y = 0.175;
  const top = new Mesh(new CylinderGeometry(1.8, 1.9, 0.12, 64), metal);
  top.position.y = 0.41;
  const glow = new Mesh(new TorusGeometry(1.93, 0.035, 8, 96), new MeshBasicMaterial({ color: new Color('#4dd4ff').multiplyScalar(2.4) }));
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.36;
  const arrows: Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const tick = new Mesh(new BoxGeometry(0.3, 0.02, 0.06), new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(1.6) }));
    const a = (i / 6) * Math.PI * 2;
    tick.position.set(Math.cos(a) * 1.55, 0.475, Math.sin(a) * 1.55);
    tick.rotation.y = -a;
    turntable.add(tick);
    arrows.push(tick);
  }
  turntable.add(base, top, glow);
  base.receiveShadow = top.receiveShadow = true;
  group.add(turntable);
  const topY = 0.47;

  // A soft blob shadow (cheap tiers) - real shadows on High.
  if (!p.shadows) {
    const blob = new Mesh(
      new CircleGeometry(1.1, 32),
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.02, 0.0, 0.08, 0.55 * smoothstep(1.0, 0.0, r)); }',
      }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = topY + 0.005;
    group.add(blob);
  }

  // Crates and fuel tanks in the back.
  const crateMat = new MeshStandardMaterial({ color: '#c98a4b', roughness: 0.8 });
  const crateBand = new MeshStandardMaterial({ color: '#5a3b20', roughness: 0.7 });
  const cratePos: Array<[number, number, number, number]> = [[-6.5, 0.6, -5.5, 1.2], [-5.1, 0.45, -6.3, 0.9], [-6.1, 1.65, -5.9, 0.85], [6.2, 0.6, -6.5, 1.2]];
  for (const [x, y, z, s] of cratePos) {
    const c = new Mesh(new BoxGeometry(s, s, s), crateMat);
    c.position.set(x, y, z);
    c.rotation.y = x * 0.37;
    const band = new Mesh(new BoxGeometry(s * 1.02, s * 0.14, s * 1.02), crateBand);
    band.position.copy(c.position);
    band.rotation.y = c.rotation.y;
    c.castShadow = c.receiveShadow = p.shadows;
    group.add(c, band);
  }
  const tankMat = new MeshStandardMaterial({ color: '#ff5d73', roughness: 0.4, metalness: 0.2 });
  for (const [x, z] of [[-8.2, -3.8], [-8.8, -2.4]] as Array<[number, number]>) {
    const t = new Mesh(new CylinderGeometry(0.55, 0.55, 2.6, 24), tankMat);
    t.position.set(x, 1.3, z);
    const cap = new Mesh(new CylinderGeometry(0.58, 0.58, 0.15, 24), metal);
    cap.position.set(x, 2.65, z);
    group.add(t, cap);
  }
  // Ceiling light bars.
  const barMat = new MeshBasicMaterial({ color: new Color('#e8f4ff').multiplyScalar(2.2) });
  for (const z of [-4, 0, 4]) {
    const bar = new Mesh(new BoxGeometry(5, 0.08, 0.3), barMat);
    bar.position.set(0, 9.5, z);
    group.add(bar);
  }
  const backPanel = new Mesh(new PlaneGeometry(60, 20), new MeshBasicMaterial({ color: '#0d0a2a' }));
  backPanel.position.set(0, 10, -24);
  group.add(backPanel);

  // Lights.
  const key = new DirectionalLight('#fff3e2', 2.6);
  key.position.set(4, 9, 7);
  key.target.position.set(0, 1.5, 0);
  if (p.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0008;
    key.shadow.radius = 4;
  }
  const rimL = new PointLight('#ff7ad9', 18, 16, 2);
  rimL.position.set(-4.5, 4, -3.5);
  const rimR = new PointLight('#4dd4ff', 22, 16, 2);
  rimR.position.set(4.5, 3, -3);
  group.add(key, key.target, rimL, rimR, new HemisphereLight('#aab8ff', '#2a1e4a', 0.65));

  return {
    group,
    turntable,
    topY,
    key,
    update(time: number) {
      floorMat.uniforms.uTime.value = time;
      wallMat.uniforms.uTime.value = time;
    },
  };
}

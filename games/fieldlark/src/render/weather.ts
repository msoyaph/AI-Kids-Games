/**
 * Weather you can see: rain streaks and snowflakes falling around the view, fireflies over the fields
 * on a warm summer night, and a soft mist on misty mornings. The falling is done in the vertex shader
 * (each drop's place in the fall comes from the time), so it costs one draw call each and no work per
 * frame. With reduced motion, nothing falls or drifts: rain and snow show as a gentle tint instead.
 *
 * Flash safety: fireflies glow slowly in and out (about once every two seconds each, never in sync).
 */
import * as THREE from 'three';
import { fxUniforms } from './fx';
import { groundY } from './land';

const BOX = 26, HIGH = 7;

function fallMaterial(color: number, opacity: number, speed: number, sway: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false });
  m.onBeforeCompile = sh => {
    sh.uniforms.fxTime = fxUniforms.fxTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float fxTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          // each drop falls through the box (which follows the view) and starts again at the top
          vec3 b = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float y = mod(b.y - fxTime * ${speed.toFixed(2)}, ${HIGH.toFixed(1)});
          transformed.x += sin(fxTime * 1.3 + b.x * 3.1) * ${sway.toFixed(2)};
          transformed.z += cos(fxTime * 1.1 + b.z * 2.7) * ${sway.toFixed(2)};
          transformed.y += y - b.y;
        }`);
  };
  m.customProgramCacheKey = () => `fall-${color}-${speed}`;
  return m;
}

function scatter(mesh: THREE.InstancedMesh, n: number, seed: number) {
  const m = new THREE.Matrix4();
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < n; i++) { m.makeTranslation(rnd() * BOX, rnd() * HIGH, rnd() * BOX); mesh.setMatrixAt(i, m); }
  mesh.instanceMatrix.needsUpdate = true;
}

export interface WeatherNow { rain: boolean; snow: boolean; fireflies: boolean; mist: number; wind: number }

export class WeatherFx {
  readonly group = new THREE.Group();
  private rain: THREE.InstancedMesh;
  private snow: THREE.InstancedMesh;
  private flies: THREE.InstancedMesh;
  private flyMat: THREE.MeshBasicMaterial;
  private rainAmt = 0;
  private snowAmt = 0;
  private mist: THREE.Mesh[] = [];
  private mistAmt = 0;

  constructor() {
    this.rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), fallMaterial(0xcfe6ff, 0.5, 9, 0), 700);
    this.snow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.035, 0), fallMaterial(0xffffff, 0.9, 0.7, 0.35), 700);
    scatter(this.rain, 700, 11);
    scatter(this.snow, 700, 23);
    this.flyMat = new THREE.MeshBasicMaterial({ color: 0xe8ff8a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.flyMat.onBeforeCompile = sh => {
      sh.uniforms.fxTime = fxUniforms.fxTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float fxTime;\nvarying float vBlink;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float ph = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;
          vBlink = 0.25 + 0.75 * smoothstep(0.2, 1.0, sin(fxTime * 3.0 + ph) * 0.5 + 0.5);
          transformed += vec3(sin(fxTime * 0.6 + ph) * 0.35, sin(fxTime * 0.9 + ph * 1.3) * 0.18, cos(fxTime * 0.5 + ph) * 0.35);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBlink;')
        .replace('#include <opaque_fragment>', 'diffuseColor.a *= vBlink;\n#include <opaque_fragment>');
    };
    this.flyMat.customProgramCacheKey = () => 'fireflies';
    this.flies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), this.flyMat, 48);
    for (const mesh of [this.rain, this.snow, this.flies]) { mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 3; this.group.add(mesh); }
    // mist: two soft, see-through sheets low over the land
    for (const y of [0.25, 0.8]) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf4f7fa, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      sheet.position.set(28, y, 32);
      sheet.renderOrder = 4;
      sheet.visible = false;
      this.mist.push(sheet);
      this.group.add(sheet);
    }
  }

  private flyKey = '';

  /** Called every frame: what the weather is, where the view is, how many particles the tier allows (0..1). */
  update(now: WeatherNow, cx: number, cz: number, dt: number, amount: number, reduced: boolean) {
    const ease = (cur: number, want: number) => cur + (want - cur) * Math.min(1, dt * 0.8);
    this.rainAmt = ease(this.rainAmt, now.rain && !reduced ? 1 : 0);
    this.snowAmt = ease(this.snowAmt, now.snow && !reduced ? 1 : 0);
    const show = (mesh: THREE.InstancedMesh, k: number) => {
      mesh.count = Math.round(700 * k * amount);
      mesh.visible = mesh.count > 0;
      mesh.position.set(cx - BOX / 2, groundY(cx, cz), cz - BOX / 2);
    };
    show(this.rain, this.rainAmt);
    show(this.snow, this.snowAmt);
    this.mistAmt = ease(this.mistAmt, now.mist);
    // a light morning haze: the low sheet a little thicker than the high one
    this.mist.forEach((sheet, i) => { (sheet.material as THREE.MeshBasicMaterial).opacity = this.mistAmt * (i ? 0.035 : 0.07); sheet.visible = this.mistAmt > 0.01; });
    // fireflies: placed once near the view each night, over the ground
    if (now.fireflies && !reduced) {
      const key = `${Math.round(cx / 6)},${Math.round(cz / 6)}`;
      if (key !== this.flyKey) {
        this.flyKey = key;
        const m = new THREE.Matrix4();
        for (let i = 0; i < 48; i++) {
          const x = cx + Math.sin(i * 12.9898) * 9, z = cz + Math.cos(i * 78.233) * 7;
          m.makeTranslation(x, groundY(x, z) + 0.4 + (i % 5) * 0.15, z);
          this.flies.setMatrixAt(i, m);
        }
        this.flies.instanceMatrix.needsUpdate = true;
      }
      this.flies.count = Math.round(48 * Math.max(0.4, amount));
      this.flies.visible = true;
    } else { this.flies.visible = false; this.flyKey = ''; }
  }

  /** How much rain or snow there is now (0..1), for a gentle tint with reduced motion. */
  get wetness() { return Math.max(this.rainAmt, this.snowAmt); }
}

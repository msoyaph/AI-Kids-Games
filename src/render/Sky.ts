import * as THREE from 'three';
import { mapDef, type MapDef, type SkyMood as Mood } from '../config/maps';

const ca = new THREE.Color();
const cb = new THREE.Color();

function mixHex(a: number, b: number, t: number, out: THREE.Color): THREE.Color {
  ca.setHex(a);
  cb.setHex(b);
  return out.copy(ca).lerp(cb, t);
}

const AURORA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const AURORA_FRAG = `
uniform float uTime;
uniform float uStrength;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uSeed;
varying vec2 vUv;
void main() {
  // soft vertical curtain with drifting folds, fading at both ends and the top
  float folds = 0.55 + 0.45 * sin(vUv.x * 18.0 + uTime * 0.6 + uSeed) * sin(vUv.x * 7.0 - uTime * 0.35 + uSeed * 2.0);
  float vert = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
  float ends = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
  float a = folds * vert * ends * uStrength;
  vec3 col = mix(uColA, uColB, vUv.y);
  gl_FragColor = vec4(col * a, a);
}`;

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly stars: THREE.Points;
  /** Aurora curtains (Rimewood nights). */
  readonly aurora: THREE.Group;
  private auroraUniforms: Array<{ uTime: { value: number }; uStrength: { value: number } }> = [];
  private map: MapDef = mapDef('meadow');
  private uniforms: { top: { value: THREE.Color }; horizon: { value: THREE.Color } };
  private fogColor = new THREE.Color();

  constructor(
    private scene: THREE.Scene,
    private hemi: THREE.HemisphereLight,
    private key: THREE.DirectionalLight,
  ) {
    this.uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying float vH; void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 top;',
        'uniform vec3 horizon;',
        'varying float vH;',
        'void main() {',
        '  float t = pow(clamp(vH, 0.0, 1.0), 0.55);',
        '  gl_FragColor = vec4(mix(horizon, top, t), 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), mat);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // stars: fade in at night
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = 0.15 + Math.random() * 0.85;
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 450;
      pos[i * 3 + 1] = y * 450;
      pos[i * 3 + 2] = Math.sin(a) * r * 450;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.aurora = new THREE.Group();
    this.aurora.name = 'aurora';
    const curtains: Array<[number, number, number, number, number]> = [
      // [angle, distance, height, width, seed]
      [0.4, 300, 120, 520, 0],
      [1.6, 320, 140, 460, 2.3],
      [2.9, 290, 110, 480, 4.1],
    ];
    for (const [a, d, y, wdt, seed] of curtains) {
      const uniforms = {
        uTime: { value: 0 },
        uStrength: { value: 0 },
        uColA: { value: new THREE.Color(0x2affb0) },
        uColB: { value: new THREE.Color(0x9a6aff) },
        uSeed: { value: seed },
      };
      const geo = new THREE.PlaneGeometry(wdt, 160, 48, 1);
      // bend the curtain into a gentle arc
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k);
        pos.setZ(k, Math.cos((x / wdt) * Math.PI) * -60 + Math.sin(x * 0.02 + seed) * 12);
      }
      const m = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({ uniforms, vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
      );
      m.position.set(Math.sin(a) * d, y, Math.cos(a) * d);
      m.lookAt(0, y * 0.6, 0);
      m.renderOrder = -8;
      m.frustumCulled = false;
      this.aurora.add(m);
      this.auroraUniforms.push(uniforms);
    }
    this.aurora.visible = false;
    scene.add(this.aurora);
  }

  /** Switch to a map's sky (moods, aurora). */
  setMap(map: MapDef): void {
    this.map = map;
  }

  /** Animate (aurora drift). */
  tick(time: number): void {
    for (const u of this.auroraUniforms) u.uTime.value = time;
  }

  private apply(a: Mood, b: Mood, t: number): void {
    mixHex(a.top, b.top, t, this.uniforms.top.value);
    mixHex(a.horizon, b.horizon, t, this.uniforms.horizon.value);
    mixHex(a.fog, b.fog, t, this.fogColor);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.fogColor);
    (this.scene.background as THREE.Color).copy(this.fogColor);
    mixHex(a.hemiSky, b.hemiSky, t, this.hemi.color);
    mixHex(a.hemiGround, b.hemiGround, t, this.hemi.groundColor);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;
    mixHex(a.key, b.key, t, this.key.color);
    this.key.intensity = a.keyI + (b.keyI - a.keyI) * t;
    this.elev = a.elev + (b.elev - a.elev) * t;
    (this.stars.material as THREE.PointsMaterial).opacity = a.stars + (b.stars - a.stars) * t;
    const au = a.aurora + (b.aurora - a.aurora) * t;
    this.aurora.visible = au > 0.01;
    for (const u of this.auroraUniforms) u.uStrength.value = au * 0.55;
  }

  /** Key light elevation for the renderer to position the sun/moon. */
  elev = 0.6;

  /** Run progress 0 (dusk) → 1 (dawn). */
  setRunProgress(p: number): void {
    const k = this.map.sky.run;
    let i = 0;
    while (i < k.length - 2 && p > k[i + 1][0]) i++;
    const [t0, a] = k[i];
    const [t1, b] = k[i + 1];
    const t = Math.max(0, Math.min(1, (p - t0) / (t1 - t0)));
    this.apply(a, b, t * t * (3 - 2 * t));
  }

  setMenu(): void {
    const m = this.map.sky.menu;
    this.apply(m, m, 0);
  }

  follow(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
    this.stars.position.set(x, 0, z);
    this.aurora.position.set(x, 0, z);
  }
}

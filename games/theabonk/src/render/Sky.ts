import * as THREE from 'three';

/** A lighting mood: sky gradient, fog, ambient and key light. */
interface Mood {
  top: number;
  horizon: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  key: number;
  keyI: number;
  /** Key light elevation (0 = horizon, 1 = overhead). */
  elev: number;
  stars: number;
}

/** The run starts at dusk, sinks into moonlit night and ends at dawn (20:00). */
const RUN_KEYS: Array<[number, Mood]> = [
  [0.0, { top: 0x3b4f9e, horizon: 0xffa982, fog: 0xa79bb8, hemiSky: 0xd6c8ff, hemiGround: 0x5a4a50, hemiI: 1.45, key: 0xffb27a, keyI: 2.3, elev: 0.25, stars: 0.1 }],
  [0.22, { top: 0x141e50, horizon: 0x4f4890, fog: 0x3f4078, hemiSky: 0x93a4ff, hemiGround: 0x353150, hemiI: 1.15, key: 0xbccaff, keyI: 1.55, elev: 0.7, stars: 0.8 }],
  [0.6, { top: 0x0c1440, horizon: 0x363a78, fog: 0x33366a, hemiSky: 0x8a9cff, hemiGround: 0x312e48, hemiI: 1.1, key: 0xb4c4ff, keyI: 1.5, elev: 0.8, stars: 1 }],
  [0.86, { top: 0x2a2f76, horizon: 0xe08aa8, fog: 0x8a7aa8, hemiSky: 0xe0c0ff, hemiGround: 0x4a3e52, hemiI: 1.4, key: 0xffa8b0, keyI: 2.0, elev: 0.3, stars: 0.4 }],
  [1.0, { top: 0x6cb2f0, horizon: 0xffd6a0, fog: 0xf2dcc4, hemiSky: 0xfff0dc, hemiGround: 0x6a5a48, hemiI: 1.45, key: 0xffe2b4, keyI: 2.7, elev: 0.35, stars: 0 }],
];

const MENU: Mood = { top: 0x5aa8e8, horizon: 0xffe0b6, fog: 0xe4dccf, hemiSky: 0xeaf4ff, hemiGround: 0x6a5a4a, hemiI: 1.3, key: 0xfff0d8, keyI: 2.6, elev: 0.6, stars: 0 };

const ca = new THREE.Color();
const cb = new THREE.Color();

function mixHex(a: number, b: number, t: number, out: THREE.Color): THREE.Color {
  ca.setHex(a);
  cb.setHex(b);
  return out.copy(ca).lerp(cb, t);
}

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly stars: THREE.Points;
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
  }

  /** Key light elevation for the renderer to position the sun/moon. */
  elev = 0.6;

  /** Run progress 0 (dusk) → 1 (dawn). */
  setRunProgress(p: number): void {
    const k = RUN_KEYS;
    let i = 0;
    while (i < k.length - 2 && p > k[i + 1][0]) i++;
    const [t0, a] = k[i];
    const [t1, b] = k[i + 1];
    const t = Math.max(0, Math.min(1, (p - t0) / (t1 - t0)));
    this.apply(a, b, t * t * (3 - 2 * t));
  }

  setMenu(): void {
    this.apply(MENU, MENU, 0);
  }

  follow(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
    this.stars.position.set(x, 0, z);
  }
}

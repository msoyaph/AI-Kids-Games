import * as THREE from 'three';

const QUAD_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FRAG = `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
void main() {
  // 4 taps: a cheap box filter down to quarter resolution
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  // soft knee: a smooth ramp into the glow instead of a hard cut
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float k = max(soft, l - uThreshold) / max(l, 1e-4);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR_FRAG = `
uniform sampler2D tMap;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  // 9-tap Gaussian using linear sampling (5 fetches)
  vec3 c = texture2D(tMap, vUv).rgb * 0.2270270;
  c += texture2D(tMap, vUv + uDir * 1.3846154).rgb * 0.3162162;
  c += texture2D(tMap, vUv - uDir * 1.3846154).rgb * 0.3162162;
  c += texture2D(tMap, vUv + uDir * 3.2307692).rgb * 0.0702703;
  c += texture2D(tMap, vUv - uDir * 3.2307692).rgb * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const COPY_FRAG = `
uniform sampler2D tMap;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tMap, vUv).rgb, 1.0);
}`;

const ADD_FRAG = `
uniform sampler2D tA;
uniform sampler2D tB;
uniform float uStrength;
varying vec2 vUv;
void main() {
  vec3 c = (texture2D(tA, vUv).rgb * 0.6 + texture2D(tB, vUv).rgb * 0.8) * uStrength;
  gl_FragColor = vec4(c, 1.0);
}`;

/**
 * Lightweight bloom (Medium / High). The scene renders to the screen exactly as without
 * bloom (native multisampling, tone mapping and hit flashes untouched); the finished frame
 * is copied, its bright parts are blurred at quarter and eighth resolution, and the glow is
 * added back over the frame. No full-resolution offscreen buffers — cheap even on
 * integrated GPUs.
 */
export class Bloom {
  private frame: THREE.FramebufferTexture;
  private a: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private b: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private quad: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quadScene = new THREE.Scene();
  private bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private copy: THREE.ShaderMaterial;
  private add: THREE.ShaderMaterial;
  private origin = new THREE.Vector2();
  /** Glow strength and the (tone-mapped) brightness where it starts (per map). */
  strength = 0.45;
  threshold = 0.8;

  constructor() {
    this.frame = new THREE.FramebufferTexture(1, 1);
    this.frame.minFilter = THREE.LinearFilter;
    this.frame.magFilter = THREE.LinearFilter;
    const opts = { depthBuffer: false } as const;
    this.a = [new THREE.WebGLRenderTarget(1, 1, opts), new THREE.WebGLRenderTarget(1, 1, opts)];
    this.b = [new THREE.WebGLRenderTarget(1, 1, opts), new THREE.WebGLRenderTarget(1, 1, opts)];
    const mat = (frag: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false, blending, transparent: blending !== THREE.NoBlending });
    this.bright = mat(BRIGHT_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: this.threshold }, uKnee: { value: 0.15 } });
    this.blur = mat(BLUR_FRAG, { tMap: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.copy = mat(COPY_FRAG, { tMap: { value: null } });
    this.add = mat(ADD_FRAG, { tA: { value: null }, tB: { value: null }, uStrength: { value: this.strength } }, THREE.AdditiveBlending);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copy);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /** Drawing-buffer size in device pixels. */
  setSize(w: number, h: number): void {
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));
    if (this.frame.image.width !== w || this.frame.image.height !== h) {
      this.frame.dispose();
      this.frame = new THREE.FramebufferTexture(w, h);
      this.frame.minFilter = THREE.LinearFilter;
      this.frame.magFilter = THREE.LinearFilter;
    }
    // glow is soft anyway: quarter and eighth resolution
    const qw = Math.max(1, w >> 2);
    const qh = Math.max(1, h >> 2);
    for (const t of this.a) t.setSize(qw, qh);
    for (const t of this.b) t.setSize(Math.max(1, qw >> 1), Math.max(1, qh >> 1));
  }

  private pass(r: THREE.WebGLRenderer, m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = m;
    r.setRenderTarget(target);
    r.render(this.quadScene, this.cam);
  }

  private blurInto(r: THREE.WebGLRenderer, pair: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget]): void {
    const u = this.blur.uniforms;
    u.tMap.value = pair[0].texture;
    (u.uDir.value as THREE.Vector2).set(1 / pair[0].width, 0);
    this.pass(r, this.blur, pair[1]);
    u.tMap.value = pair[1].texture;
    (u.uDir.value as THREE.Vector2).set(0, 1 / pair[0].height);
    this.pass(r, this.blur, pair[0]);
  }

  render(r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    r.setRenderTarget(null);
    r.render(scene, camera);
    r.copyFramebufferToTexture(this.frame, this.origin);
    const autoClear = r.autoClear;
    r.autoClear = false;
    const bu = this.bright.uniforms;
    bu.tMap.value = this.frame;
    (bu.uTexel.value as THREE.Vector2).set(1 / this.frame.image.width, 1 / this.frame.image.height);
    bu.uThreshold.value = this.threshold;
    r.autoClear = true;
    this.pass(r, this.bright, this.a[0]);
    this.blurInto(r, this.a);
    this.copy.uniforms.tMap.value = this.a[0].texture;
    this.pass(r, this.copy, this.b[0]);
    this.blurInto(r, this.b);
    // add the glow over the finished frame (no clear)
    r.autoClear = false;
    const au = this.add.uniforms;
    au.tA.value = this.a[0].texture;
    au.tB.value = this.b[0].texture;
    au.uStrength.value = this.strength;
    this.pass(r, this.add, null);
    r.autoClear = autoClear;
  }

  dispose(): void {
    this.frame.dispose();
    for (const t of [...this.a, ...this.b]) t.dispose();
    for (const m of [this.bright, this.blur, this.copy, this.add]) m.dispose();
    this.quad.geometry.dispose();
  }
}

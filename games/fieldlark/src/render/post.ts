/**
 * Post-processing for Medium and High (Space Sky's approach, games/space-sky/src/r3/post.ts): the
 * scene renders into a half-float buffer, then one merged effect pass does ambient occlusion (High),
 * bloom on bright highlights, the miniature tilt-shift blur (High), ACES tone mapping (like Space Sky), the colour
 * grade for the season and time of day, and a soft vignette; FXAA runs last in its own pass (MSAA
 * targets caused black tiles on ANGLE-Metal in Space Sky). Low skips all of this and tone-maps in
 * the renderer.
 */
import * as THREE from 'three';
import {
  BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, FXAAEffect, KernelSize, NormalPass, RenderPass, SSAOEffect,
  TiltShiftEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import type { QualitySpec } from './quality';

/** The colour grade: lift (shadows), gain (highlights), saturation and contrast. */
export interface Grade { lift: THREE.Color; gain: THREE.Color; saturation: number; contrast: number }

const gradeShader = /* glsl */ `
uniform vec3 lift;
uniform vec3 gain;
uniform float saturation;
uniform float contrast;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  c = c * gain + lift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation);
  c = (c - 0.5) * contrast + 0.5;
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}`;

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['lift', new THREE.Uniform(new THREE.Color(0, 0, 0))],
        ['gain', new THREE.Uniform(new THREE.Color(1, 1, 1))],
        ['saturation', new THREE.Uniform(1.08)],
        ['contrast', new THREE.Uniform(1.04)],
      ]),
    });
  }
  set(g: Grade) {
    (this.uniforms.get('lift')!.value as THREE.Color).copy(g.lift);
    (this.uniforms.get('gain')!.value as THREE.Color).copy(g.gain);
    this.uniforms.get('saturation')!.value = g.saturation;
    this.uniforms.get('contrast')!.value = g.contrast;
  }
}

export function canRenderHalfFloat(r: THREE.WebGLRenderer) {
  return r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float');
}

export class PostChain {
  readonly composer: EffectComposer;
  readonly grade = new GradeEffect();
  readonly tilt: TiltShiftEffect | null = null;
  private renderPass: RenderPass;
  /** The camera for the normal pass: the main one, but blind to the NO_AO layer. */
  private normalCam = new THREE.PerspectiveCamera();
  private camera: THREE.Camera;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, spec: QualitySpec, reducedMotion: boolean) {
    this.composer = new EffectComposer(renderer, { multisampling: 0, frameBufferType: canRenderHalfFloat(renderer) ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false });
    this.camera = camera;
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    const effects: Effect[] = [];
    if (spec.ssao) {
      const normals = new NormalPass(scene, this.normalCam);
      this.composer.addPass(normals);
      effects.push(new SSAOEffect(camera, normals.texture, {
        blendFunction: BlendFunction.MULTIPLY, samples: 11, rings: 4, worldDistanceThreshold: 18, worldDistanceFalloff: 6,
        worldProximityThreshold: 0.35, worldProximityFalloff: 0.25, luminanceInfluence: 0.6, radius: 0.06, intensity: 1.6, bias: 0.025, fade: 0.02,
        color: new THREE.Color(0x2a2a40), resolutionScale: 0.5,
      }));
    }
    if (spec.bloom > 0) effects.push(new BloomEffect({ mipmapBlur: true, levels: spec.bloom, intensity: 0.45, luminanceThreshold: 0.92, luminanceSmoothing: 0.25, radius: 0.7 }));
    if (spec.tiltShift && !reducedMotion) {
      this.tilt = new TiltShiftEffect({ offset: 0.02, focusArea: 0.82, feather: 0.22, kernelSize: KernelSize.SMALL, resolutionScale: 0.5 });
      effects.push(this.tilt);
    }
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    effects.push(this.grade);
    effects.push(new VignetteEffect({ offset: 0.35, darkness: 0.32 }));
    this.composer.addPass(new EffectPass(camera, ...effects));
    this.composer.addPass(new EffectPass(camera, new FXAAEffect()));
  }

  setSize(w: number, h: number) { this.composer.setSize(w, h, false); }
  render(dt: number) {
    this.normalCam.copy(this.camera as THREE.PerspectiveCamera);
    this.normalCam.layers.set(0);
    this.composer.render(dt);
  }
  dispose() { this.composer.dispose(); }
}

import type { Camera, Scene, WebGLRenderer } from 'three';
import { HalfFloatType, UnsignedByteType } from 'three';
import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  HueSaturationEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Effect,
} from 'postprocessing';
import type { QualityProfile } from '../systems/quality';
import { canRenderHalfFloat } from './bake';

/** The look: tone mapping plus a gentle grade that keeps colors bright and friendly. */
export const GRADE = {
  bloomIntensity: 0.9,
  bloomThreshold: 1.25,
  bloomSmoothing: 0.35,
  bloomRadius: 0.72,
  saturation: 0.05,
  contrast: 0.02,
  brightness: 0.0,
  vignetteOffset: 0.32,
  vignetteDarkness: 0.42,
};

/**
 * Post-processing chain for Medium/High: scene → (MSAA) HDR buffer → one merged effect pass
 * with bloom, ACES filmic tone mapping, vignette and a saturation/contrast grade, then FXAA (Medium).
 */
export class PostChain {
  readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly effectPass: EffectPass;
  readonly bloom: BloomEffect | null;

  constructor(renderer: WebGLRenderer, p: QualityProfile, scene: Scene, camera: Camera) {
    const half = canRenderHalfFloat(renderer);
    this.composer = new EffectComposer(renderer, {
      multisampling: p.msaa,
      frameBufferType: half ? HalfFloatType : UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    const effects: Effect[] = [];
    this.bloom = null;
    if (p.bloomLevels > 0) {
      this.bloom = new BloomEffect({
        mipmapBlur: true,
        levels: p.bloomLevels,
        intensity: GRADE.bloomIntensity,
        luminanceThreshold: GRADE.bloomThreshold,
        luminanceSmoothing: GRADE.bloomSmoothing,
        radius: GRADE.bloomRadius,
      });
      effects.push(this.bloom);
    }
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    effects.push(new HueSaturationEffect({ saturation: GRADE.saturation }));
    effects.push(new BrightnessContrastEffect({ contrast: GRADE.contrast, brightness: GRADE.brightness }));
    effects.push(new VignetteEffect({ offset: GRADE.vignetteOffset, darkness: GRADE.vignetteDarkness }));
    this.effectPass = new EffectPass(camera, ...effects);
    this.composer.addPass(this.effectPass);
    // FXAA must run on the finished image in its own pass: merged with bloom it would throw the glow
    // away along edges (dark halos).
    if (p.fxaa) this.composer.addPass(new EffectPass(camera, new FXAAEffect()));
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h, false);
  }

  render(scene: Scene, camera: Camera, dt: number): void {
    if (this.renderPass.mainScene !== scene) this.renderPass.mainScene = scene;
    if (this.renderPass.mainCamera !== camera) {
      this.renderPass.mainCamera = camera;
      this.effectPass.mainCamera = camera;
    }
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
  }
}

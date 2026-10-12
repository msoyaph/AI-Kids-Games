import { Scene3D } from '../app/Scene3D';
import type { CameraPose } from '../r3/framing';
import { fitFov } from '../r3/rooms/academy';
import { academyStage, Glide, type AcademyStage } from './academyStage';

/**
 * A screen inside the Academy diorama: it borrows the shared stage (building, crew, rocket) and
 * glides the camera to its room; its own 3D extras go in `local`. The DOM panels sit on top.
 */
export abstract class AcademyScene extends Scene3D {
  protected readonly stage: AcademyStage;
  protected readonly glide: Glide;
  private lastTime = 0;
  private roomPose: CameraPose | null = null;

  constructor(name: string) {
    const stage = academyStage();
    super(name, stage.world);
    this.stage = stage;
    this.glide = new Glide(this.camera, stage);
    this.ui.classList.add('on-stage');
  }

  override resize(w: number, h: number): void {
    super.resize(w, h);
    this.glide?.setSize(w, h);
    if (this.roomPose) this.showRoom(this.roomPose, true);
  }

  /** Glide to one of the Academy's room poses (widened on narrow screens so the room still fits). */
  protected showRoom(pose: CameraPose, instant = false): void {
    this.roomPose = pose;
    this.glide.to({ pos: pose.pos, look: pose.look, fov: fitFov(pose.fov, this.camera.aspect) }, 0, 0, instant);
  }

  override render(_alpha: number): void {
    const dt = Math.min(0.1, Math.max(0, this.time - this.lastTime)) || 1 / 60;
    this.lastTime = this.time;
    this.glide.update(dt);
    this.stage.update(dt, this.time);
    this.renderStage(dt);
  }

  /** Per-frame extras for the screen. */
  protected renderStage(_dt: number): void {}
}

/**
 * Touch steering: which camera yaw the stick is read against (pure, unit-tested; used by Game
 * and by scripts/touch-compare.ts).
 *
 * The auto camera swings in behind Thea while the stick is held. Read against the live camera,
 * a stick held on a diagonal then keeps turning her — the camera follows her, her heading
 * follows the camera — and she runs in circles. With the heading lock, the auto camera's turns
 * don't steer: while the thumb holds still, Thea keeps her world heading and the camera
 * settles in behind her. When the thumb deliberately moves, the stick is read against the
 * view again (what you see is what you get) — wobble within a few degrees doesn't count — and
 * lifting the thumb resets it.
 * A camera drag still turns Thea with it, as mouse look does.
 */

/** Thumb wobble within this many degrees of where it settled is jitter, not steering. */
export const STEER_DEADBAND_DEG = 6;
/** Each degree the thumb deliberately turns re-reads this many degrees of the auto camera's turn. */
export const STEER_CATCHUP = 1.5;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class TouchSteer {
  /** Auto-camera turn (radians) the stick is not following; the stick reads against yaw − offset. */
  offset = 0;
  /** Where the thumb settled (trails the thumb, STEER_DEADBAND_DEG behind). */
  private ref = Number.NaN;

  /**
   * Once per frame, before the stick is read. `ang` = stick direction (radians, clockwise from
   * screen up), `active` = the thumb is pushing past the dead zone.
   */
  thumb(active: boolean, ang: number): void {
    if (!active) {
      this.offset = 0;
      this.ref = Number.NaN;
      return;
    }
    if (Number.isNaN(this.ref)) {
      this.ref = ang;
      return;
    }
    const d = wrap(ang - this.ref);
    const beyond = Math.abs(d) - STEER_DEADBAND_DEG * (Math.PI / 180);
    if (beyond <= 0) return;
    this.ref = wrap(this.ref + Math.sign(d) * beyond);
    this.offset = Math.sign(this.offset) * Math.max(0, Math.abs(this.offset) - STEER_CATCHUP * beyond);
  }

  /** The auto camera turned the view by `delta` (radians) this frame. */
  autoTurned(delta: number, lock: boolean, holding: boolean): void {
    if (lock && holding) this.offset = wrap(this.offset + delta);
  }

  /** The yaw the stick is read against this frame. */
  yaw(cameraYaw: number): number {
    return cameraYaw - this.offset;
  }
}

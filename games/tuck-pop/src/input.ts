/**
 * One direction from every device: keyboard (WASD / arrows), a gamepad's left stick or d-pad,
 * and a pointer (touch or mouse) held down anywhere: the firefly steers toward it.
 * The most recently used device wins, so touchscreen laptops switch smoothly.
 */
import type { Vec } from './sim';

const keys = new Set<string>();
let pointer: Vec | null = null;

export function listen(canvas: HTMLCanvasElement) {
  addEventListener('keydown', event => { keys.add(event.code); if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault(); });
  addEventListener('keyup', event => keys.delete(event.code));
  addEventListener('blur', () => { keys.clear(); pointer = null; });
  const at = (event: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointer = { x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height }; };
  canvas.addEventListener('pointerdown', event => { try { canvas.setPointerCapture(event.pointerId); } catch { /* synthetic events */ } at(event); });
  canvas.addEventListener('pointermove', event => { if (pointer) at(event); });
  for (const type of ['pointerup', 'pointercancel'] as const) canvas.addEventListener(type, () => (pointer = null));
}

/** Direction for this frame. `player` is the firefly's position as a 0–1 fraction of the canvas. */
export function direction(player: Vec): Vec {
  let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (!pad) continue;
    const [sx = 0, sy = 0] = pad.axes;
    if (Math.hypot(sx, sy) > 0.2) { x = sx; y = sy; }
    if (pad.buttons[12]?.pressed) y = -1;
    if (pad.buttons[13]?.pressed) y = 1;
    if (pad.buttons[14]?.pressed) x = -1;
    if (pad.buttons[15]?.pressed) x = 1;
  }
  if (pointer && x === 0 && y === 0) {
    const dx = pointer.x - player.x, dy = pointer.y - player.y, len = Math.hypot(dx, dy);
    if (len > 0.01) { const k = Math.min(1, len * 8) / len; x = dx * k; y = dy * k; }
  }
  return { x, y };
}

/** Any gamepad "A" / Start press, for menus. */
export const padConfirm = () => (navigator.getGamepads?.() ?? []).some(pad => pad?.buttons[0]?.pressed || pad?.buttons[9]?.pressed);

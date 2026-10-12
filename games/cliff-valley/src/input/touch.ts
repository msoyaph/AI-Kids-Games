/**
 * Touch controls: tap the world (handled by the game), a big Tool button, an Interact
 * button, and an optional virtual joystick. Left-handed mode mirrors the layout.
 */
import type { Input } from './input';

export interface TouchUI {
  root: HTMLElement;
  toolBtn: HTMLElement;
  toolIcon: HTMLElement;
  handBtn: HTMLElement;
  stick: HTMLElement;
  knob: HTMLElement;
}

export const TOUCH_CSS = `
.touch { position: absolute; inset: 0; pointer-events: none; display: none; }
.touch.on { display: block; }
.tbtn { position: absolute; pointer-events: auto; border-radius: 50%; border: 4px solid var(--wood-d); box-shadow: 0 4px 0 rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; touch-action: none; -webkit-tap-highlight-color: transparent; }
.tbtn.tool { width: 92px; height: 92px; background: radial-gradient(circle at 40% 35%, #ffe7a8, #f5b942); right: calc(max(16px, env(safe-area-inset-right)) + 46px * var(--ui)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 84px * var(--ui)); }
.tbtn.hand { width: 64px; height: 64px; background: radial-gradient(circle at 40% 35%, #d8f0c8, #8fcf6a); right: calc(max(16px, env(safe-area-inset-right)) + 150px * var(--ui)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 150px * var(--ui)); }
.tbtn:active, .tbtn.down { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,.35); filter: brightness(.95); }
.stick { position: absolute; width: 132px; height: 132px; border-radius: 50%; left: calc(max(16px, env(safe-area-inset-left)) + 8px); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 84px * var(--ui)); background: rgba(255, 250, 240, .25); border: 3px solid rgba(90, 58, 37, .55); pointer-events: auto; touch-action: none; display: none; }
.stick.on { display: block; }
.knob { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff6dc, #dcc694); border: 3px solid var(--wood-d); }
.touch.lefty .tbtn.tool { right: auto; left: calc(max(16px, env(safe-area-inset-left)) + 46px * var(--ui)); }
.touch.lefty .tbtn.hand { right: auto; left: calc(max(16px, env(safe-area-inset-left)) + 150px * var(--ui)); }
.touch.lefty .stick { left: auto; right: calc(max(16px, env(safe-area-inset-right)) + 8px); }
`;

export function createTouchUI(parent: HTMLElement, input: Input, onTool: (down: boolean) => void, onHand: () => void): TouchUI {
  const root = document.createElement('div');
  root.className = 'touch';
  const toolBtn = document.createElement('div');
  toolBtn.className = 'tbtn tool';
  toolBtn.setAttribute('role', 'button');
  toolBtn.setAttribute('aria-label', 'Use tool');
  const toolIcon = document.createElement('span');
  toolBtn.appendChild(toolIcon);
  const handBtn = document.createElement('div');
  handBtn.className = 'tbtn hand';
  handBtn.setAttribute('role', 'button');
  handBtn.setAttribute('aria-label', 'Talk, pick up or open');
  const stick = document.createElement('div');
  stick.className = 'stick';
  const knob = document.createElement('div');
  knob.className = 'knob';
  stick.appendChild(knob);
  root.append(stick, handBtn, toolBtn);
  parent.appendChild(root);

  toolBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toolBtn.setPointerCapture?.(e.pointerId);
    toolBtn.classList.add('down');
    input.lastDevice = 'touch';
    input.holdUse = true;
    onTool(true);
  });
  const up = (e: PointerEvent) => {
    e.preventDefault();
    toolBtn.classList.remove('down');
    input.holdUse = false;
    onTool(false);
  };
  toolBtn.addEventListener('pointerup', up);
  toolBtn.addEventListener('pointercancel', up);
  handBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.lastDevice = 'touch';
    onHand();
  });

  let sid = -1;
  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 10;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.hypot(dx, dy) / max;
    input.stick.x = m < 0.15 ? 0 : dx / max;
    input.stick.y = m < 0.15 ? 0 : dy / max;
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sid = e.pointerId;
    stick.setPointerCapture?.(e.pointerId);
    input.lastDevice = 'touch';
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === sid) moveStick(e);
  });
  const release = () => {
    sid = -1;
    knob.style.transform = '';
    input.stick.x = 0;
    input.stick.y = 0;
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
  return { root, toolBtn, toolIcon, handBtn, stick, knob };
}

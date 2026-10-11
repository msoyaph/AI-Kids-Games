import { S } from '../app/services';
import { h } from './dom';

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
  closed: boolean;
}

const stack: ModalHandle[] = [];

/**
 * Opens a modal panel over the game. While any modal is open the current scene is frozen.
 * Pressing Back/Escape closes the top modal if `dismissable`.
 */
export function openModal(content: HTMLElement, opts: { onClose?: () => void; dismissable?: boolean; cls?: string; testId?: string } = {}): ModalHandle {
  const back = h('div', { class: `modal-back ${opts.cls ?? ''}`, 'data-testid': opts.testId });
  const box = h('div', { class: 'modal' }, content);
  back.append(box);
  const handle: ModalHandle = {
    el: back,
    closed: false,
    close: () => {
      if (handle.closed) return;
      handle.closed = true;
      back.remove();
      const i = stack.indexOf(handle);
      if (i >= 0) stack.splice(i, 1);
      refreezeScene();
      opts.onClose?.();
    },
  };
  if (opts.dismissable !== false) {
    back.addEventListener('click', (e) => {
      if (e.target === back) handle.close();
    });
  }
  (handle as ModalHandle & { dismissable: boolean }).dismissable = opts.dismissable !== false;
  stack.push(handle);
  S.game.overlayLayer.append(back);
  refreezeScene();
  // Move keyboard/gamepad focus into the modal.
  setTimeout(() => (back.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true }), 30);
  return handle;
}

export function topModal(): ModalHandle | null {
  return stack.length ? stack[stack.length - 1] : null;
}

export function anyModalOpen(): boolean {
  return stack.length > 0;
}

/** Close the top modal if it allows it. Returns true if something was closed. */
export function closeTopModal(): boolean {
  const top = topModal() as (ModalHandle & { dismissable?: boolean }) | null;
  if (!top || top.dismissable === false) return false;
  top.close();
  return true;
}

export function closeAllModals(): void {
  while (stack.length) stack[stack.length - 1].close();
}

/** Extra freeze reasons (dialogue, tips...) keyed by name. */
const freezers = new Set<string>();
export function setFreeze(key: string, on: boolean): void {
  if (on) freezers.add(key);
  else freezers.delete(key);
  refreezeScene();
}

export function refreezeScene(): void {
  const scene = S.game?.current;
  if (scene) scene.frozen = stack.length > 0 || freezers.size > 0;
}

import { S } from '../app/services';
import { h } from './dom';
import { closeTopModal, openModal } from './modal';
import { button } from './widgets';

export type PauseContext = 'flight' | 'landing' | 'explore' | 'race';

/** Pause menu. Big friendly choices; leaving never loses what you collected. */
export function openPause(ctx: PauseContext): void {
  if (S.game.overlayLayer.querySelector('[data-testid="pause-menu"]')) return;
  const items: HTMLElement[] = [];
  items.push(button('Keep playing', 'play', () => closeTopModal(), { color: 'green', size: 'big', id: 'btn-resume' }));
  if (ctx === 'explore') {
    items.push(button('Back to rocket', 'rocket', () => {
      closeTopModal();
      pauseHooks.backToRocket();
    }, { color: 'blue', id: 'btn-back-rocket' }));
    items.push(button('Reset puzzle', 'reset', () => {
      closeTopModal();
      pauseHooks.resetPuzzle();
    }, { color: 'purple', id: 'btn-reset-puzzle' }));
  }
  if (ctx === 'flight' || ctx === 'race') {
    items.push(button('Fly home with Tuggy', 'home', () => {
      closeTopModal();
      pauseHooks.goHome();
    }, { color: 'blue', id: 'btn-tow-home' }));
  }
  items.push(button('Settings', 'gear', () => pauseHooks.settings(), { color: 'white', id: 'btn-settings' }));
  const panel = h('div', { class: 'panel col pause-panel', 'data-testid': 'pause-menu' }, h('div', { class: 'h2' }, 'Paused'), ...items);
  openModal(panel);
}

/** Wired up by scenes/boot so this module stays independent. */
export const pauseHooks = {
  backToRocket: () => {},
  resetPuzzle: () => {},
  goHome: () => {
    void S.game.go('title');
  },
  settings: () => {},
};

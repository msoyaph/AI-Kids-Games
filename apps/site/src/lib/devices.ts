import type { Game } from '../data/games';

/**
 * A computer-only game: its manifest (games/<slug>/game.json) lists no Touch controls, or only
 * computers. Everything device-related on the site follows from these two fields, so a game that
 * adds touch support loses its "computer game" labels and the play-page screen automatically.
 */
export const computerOnly = (game: Game) => !game.controls.types.includes('Touch') || game.supportedDevices.every(device => device === 'Computer');

/**
 * Touch is the only input this device reports: a coarse pointer (or touch points) and no fine
 * pointer, so no mouse or trackpad. A phone or tablet with a Bluetooth keyboard or a gamepad
 * looks the same, which is why the play-page screen offers "I have a keyboard or controller".
 */
export const touchOnlyDevice = () => typeof matchMedia === 'function'
  && !matchMedia('(any-pointer: fine)').matches
  && (matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0);

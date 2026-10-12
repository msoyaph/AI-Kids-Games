import { describe,expect,it } from 'vitest';
import { games } from '../src/data/games';
import { computerOnly } from '../src/lib/devices';
const base = games[0]!;
describe('computer-only games come from the manifest',() => {
  it('no Touch controls, or only computers, means computer-only',() => {
    expect(computerOnly({ ...base,supportedDevices: ['Computer'],controls: { ...base.controls,types: ['Keyboard','Mouse','Gamepad'] } })).toBe(true);
    expect(computerOnly({ ...base,supportedDevices: ['Computer','Tablet','Phone'],controls: { ...base.controls,types: ['Keyboard','Gamepad'] } })).toBe(true);
    expect(computerOnly({ ...base,supportedDevices: ['Computer'],controls: { ...base.controls,types: ['Keyboard','Touch'] } })).toBe(true);
  });
  it('touch controls on a phone or tablet lift it automatically',() => {
    expect(computerOnly({ ...base,supportedDevices: ['Computer','Tablet','Phone'],controls: { ...base.controls,types: ['Keyboard','Mouse','Gamepad','Touch'] } })).toBe(false);
    expect(computerOnly({ ...base,supportedDevices: ['Tablet'],controls: { ...base.controls,types: ['Touch'] } })).toBe(false);
  });
  it('matches every listed game’s devices and controls',() => {
    for (const game of games) expect(computerOnly(game),game.slug).toBe(!game.controls.types.includes('Touch') || !game.supportedDevices.some(device => device !== 'Computer'));
  });
});

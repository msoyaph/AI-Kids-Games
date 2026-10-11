import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim/sim';
import { TUNING } from '../../src/tuning';

describe('time & days', () => {
  it('a full day lasts about 12 real minutes', () => {
    const sim = Sim.newGame({ name: 'A', farm: 'B', pet: 'dog', petName: 'C', seed: 1 });
    let passout = false;
    sim.ev.on('passout', () => (passout = true));
    let t = 0;
    while (!passout && t < 2000) {
      sim.update(0.5);
      t += 0.5;
    }
    expect(t).toBeGreaterThanOrEqual(TUNING.dayRealSeconds - 1);
    expect(t).toBeLessThanOrEqual(TUNING.dayRealSeconds + 1);
  });

  it('pauses the clock in menus', () => {
    const sim = Sim.newGame({ name: 'A', farm: 'B', pet: 'dog', petName: 'C', seed: 1 });
    sim.paused = true;
    sim.update(100);
    expect(sim.state.min).toBe(TUNING.dayStartMin);
  });

  it('sleeping starts a new morning at home with full energy and no penalty', () => {
    const sim = Sim.newGame({ name: 'A', farm: 'B', pet: 'dog', petName: 'C', seed: 1 });
    sim.warpTo('farm', 30, 20);
    sim.p.energy = 3;
    sim.p.coins = 777;
    sim.advanceMinutes(1200);
    const r = sim.sleep(true);
    expect(r.passedOut).toBe(true);
    expect(sim.state.day).toBe(1);
    expect(sim.state.min).toBe(TUNING.dayStartMin);
    expect(sim.p.loc).toBe('farmhouse');
    expect(sim.p.energy).toBe(sim.p.maxEnergy);
    expect(sim.p.coins).toBe(777);
  });

  it('day 3 always rains to teach that rain waters crops', () => {
    const sim = Sim.newGame({ name: 'A', farm: 'B', pet: 'dog', petName: 'C', seed: 5 });
    sim.sleep();
    sim.sleep();
    expect(sim.state.weather).toBe('rain');
  });
});

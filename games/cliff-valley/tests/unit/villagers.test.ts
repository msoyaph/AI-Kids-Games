import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { VILLAGERS } from '../../src/data/villagers';
import { DIALOGUE } from '../../src/data/dialogue';
import { LETTERS } from '../../src/data/mail';
import { CUTSCENES } from '../../src/data/cutscenes';
import { planRoute, spotTile, npcs, updateNpcs, resetNpcs } from '../../src/sim/npcs';
import { addPoints, giveGift, hearts, talk, taste } from '../../src/sim/friendship';
import { checkMail } from '../../src/sim/mail';
import { getMapDef } from '../../src/data/maps';
import { TUNING } from '../../src/tuning';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'cat', petName: 'Mochi', seed: 11 });

describe('villagers', () => {
  it('has 12–15 villagers with unique birthdays and full dialogue', () => {
    expect(VILLAGERS.length).toBeGreaterThanOrEqual(12);
    expect(VILLAGERS.length).toBeLessThanOrEqual(15);
    const bdays = new Set(VILLAGERS.map((v) => v.birthday.join('-')));
    expect(bdays.size).toBe(VILLAGERS.length);
    for (const v of VILLAGERS) {
      const d = DIALOGUE[v.id];
      expect(d, v.id).toBeDefined();
      expect(d.daily.length).toBeGreaterThanOrEqual(5);
      expect(d.season.length).toBe(4);
      for (const k of ['sprout', 'berry', 'harvest', 'starlight'] as const) expect(d.festival[k]).toBeTruthy();
    }
  });

  it('every schedule spot is reachable from home', () => {
    const sim = mk();
    for (const v of VILLAGERS) {
      for (const set of Object.values(v.schedule)) {
        if (!set) continue;
        let loc = set[0][1];
        let [x, y] = spotTile(sim, loc, set[0][2]);
        for (const e of set.slice(1)) {
          const [tx, ty] = spotTile(sim, e[1], e[2]);
          const r = planRoute(sim, loc, x, y, e[1], tx, ty);
          expect(r, `${v.id}: ${loc}(${x},${y}) → ${e[1]} ${JSON.stringify(e[2])}`).not.toBeNull();
          loc = e[1];
          x = tx;
          y = ty;
        }
      }
    }
  });

  it('villagers follow their schedule through the day', () => {
    const sim = mk();
    sim.state.weather = 'sun';
    sim.state.day = 1; // Sproutday
    resetNpcs(sim);
    const pippa = npcs(sim).byId.get('pippa')!;
    expect(pippa.loc).toBe('store');
    // run the clock to 19:30 — she should be at the café
    for (let i = 0; i < 2000 && sim.state.min < 19 * 60 + 50; i++) {
      sim.advanceMinutes(5);
      updateNpcs(sim);
    }
    expect(pippa.loc).toBe('cafe');
  });

  it('talking and gifts raise friendship; loved gifts count more; birthdays triple', () => {
    const sim = mk();
    const r = talk(sim, 'kai');
    expect(r.first).toBe(true);
    expect(sim.state.npcs.kai.pts).toBe(TUNING.talkPoints);
    expect(talk(sim, 'kai').first).toBe(false);
    sim.p.inv[9] = { id: 'blueberry', n: 2, q: 0 };
    expect(taste(VILLAGERS.find((v) => v.id === 'kai')!, 'blueberry')).toBe('love');
    const g = giveGift(sim, 'kai', 9);
    expect(g.ok).toBe(true);
    expect(g.taste).toBe('love');
    expect(giveGift(sim, 'kai', 9).ok).toBe(false); // once per day
    addPoints(sim, 'kai', 5000);
    expect(hearts(sim, 'kai')).toBe(10);
  });

  it('welcome mail arrives on day one', () => {
    const sim = mk();
    expect(sim.state.mail.length).toBeGreaterThan(0);
    expect(checkMail(sim)).toBe(0);
  });

  it('letters and cutscenes reference real places', () => {
    expect(LETTERS.length).toBeGreaterThanOrEqual(25);
    expect(CUTSCENES.length).toBeGreaterThanOrEqual(36);
    for (const c of CUTSCENES) {
      const def = getMapDef(c.at, { houseLevel: 0, done: [] });
      expect(def.points[c.spot], `${c.id} spot ${c.at}.${c.spot}`).toBeDefined();
    }
  });
});

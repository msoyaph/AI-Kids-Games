import { describe, expect, it } from 'vitest';
import { botTurn } from '../../src/bot';
import { coach } from '../../src/coach';
import { DAYS } from '../../src/data/days';
import { STATION_ORDER } from '../../src/data/menu';
import { HOSTS } from '../../src/data/characters';
import { discard, giveSamples, guestAt, LIVES, modsFor, newGame, pending, ringBell, stars, step, STEP, tap, TRAY_MAX, type GameOptions, type SimEvent, type State } from '../../src/sim';

const station = (food: string) => STATION_ORDER.indexOf(food as never);

/** Step until a condition holds (or fail after a minute of game time). */
function until(s: State, done: () => boolean, events?: SimEvent[]): void {
  for (let i = 0; i < 60 / STEP && !done(); i++) {
    step(s);
    if (events) events.push(...s.events);
    s.events.length = 0;
  }
  expect(done()).toBe(true);
}

/** Play a whole day with the helper bot, pausing `think` seconds between its taps. */
function playDay(seed: number, day: number, think = 0, opts: GameOptions = {}, seconds = 900): State {
  const s = newGame(seed, day, opts);
  let rest = 0;
  for (let i = 0; i < seconds / STEP && !s.over; i++) {
    rest -= STEP;
    if (rest <= 0 && botTurn(s)) rest = think;
    step(s);
    s.events.length = 0;
  }
  return s;
}

describe('a day at the counter', () => {
  it('replays exactly from its seed', () => {
    const a = playDay(42, 3, 0.4), b = playDay(42, 3, 0.4);
    expect(a.over).toBe(true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(playDay(43, 3, 0.4))).not.toBe(JSON.stringify(a));
  });

  it('opens only the stations on the day menu', () => {
    const s = newGame(1, 0);
    expect(s.stations.filter(st => st.unlocked).map(st => st.food).sort()).toEqual([...DAYS[0].menu].sort());
    expect(tap(s, { kind: 'station', index: station('pizza') })).toBe(false);
    expect(tap(s, { kind: 'station', index: station('juice') })).toBe(true);
  });

  it('cooks, carries and serves an order for coins', () => {
    const s = newGame(7, 0);
    const events: SimEvent[] = [];
    until(s, () => s.guests.some(g => g.phase === 'waiting'), events);
    const g = s.guests.find(g => g.phase === 'waiting')!;
    expect(g.order).toHaveLength(1);
    const index = station(g.order[0].food);

    expect(tap(s, { kind: 'station', index })).toBe(true);
    until(s, () => s.stations[index].phase === 'cooking', events);
    until(s, () => s.stations[index].phase === 'ready', events);
    expect(tap(s, { kind: 'station', index })).toBe(true);
    until(s, () => s.host.tray.length === 1, events);
    expect(s.stations[index].phase).toBe('idle');

    expect(tap(s, { kind: 'guest', spot: g.spot })).toBe(true);
    until(s, () => s.served === 1, events);
    expect(s.host.tray).toHaveLength(0);
    expect(s.coins).toBeGreaterThan(0);
    expect(g.phase).toBe('happy');
    expect(events.map(e => e.type)).toEqual(expect.arrayContaining(['arrive', 'order', 'start', 'ready', 'collect', 'deliver', 'complete']));
  });

  it('shrugs when the tray has nothing a friend ordered', () => {
    const s = newGame(7, 0);
    const events: SimEvent[] = [];
    until(s, () => s.guests.some(g => g.phase === 'waiting'));
    const g = s.guests.find(g => g.phase === 'waiting')!;
    tap(s, { kind: 'guest', spot: g.spot });
    until(s, () => events.some(e => e.type === 'nomatch'), events);
    expect(s.served).toBe(0);
    expect(g.order[0].done).toBe(false);
  });

  it('lets friends leave when nobody serves them, and ends the day', () => {
    const s = newGame(3, 0);
    for (let i = 0; i < 900 / STEP && !s.over; i++) { step(s); s.events.length = 0; }
    expect(s.over).toBe(true);
    expect(s.served).toBe(0);
    expect(s.missed).toBe(DAYS[0].guests);
    expect(stars(s)).toBe(0);
  });

  it('holds at most a trayful and can put food back', () => {
    const s = newGame(5, 0);
    const juice = station('juice');
    for (let n = 0; n < TRAY_MAX + 1; n++) {
      tap(s, { kind: 'station', index: juice });
      until(s, () => s.stations[juice].phase === 'ready');
      tap(s, { kind: 'station', index: juice });
      until(s, () => s.host.queue.length === 0 && s.host.current === null && s.host.busy <= 0);
    }
    expect(s.host.tray).toHaveLength(TRAY_MAX);
    expect(s.stations[juice].phase).toBe('ready');
    expect(discard(s, 0)).toBe(true);
    expect(s.host.tray).toHaveLength(TRAY_MAX - 1);
    expect(discard(s, 9)).toBe(false);
  });

  it('queues taps in order and ignores a double tap', () => {
    const s = newGame(5, 0);
    expect(tap(s, { kind: 'station', index: station('juice') })).toBe(true);
    expect(tap(s, { kind: 'station', index: station('juice') })).toBe(false);
    expect(tap(s, { kind: 'station', index: station('fries') })).toBe(true);
    expect(pending(s)).toEqual([{ kind: 'station', index: station('juice') }, { kind: 'station', index: station('fries') }]);
    expect(tap(s, { kind: 'guest', spot: 0 })).toBe(false);
  });

  it('calls the next friend in early with the bell', () => {
    const s = newGame(9, 1);
    until(s, () => s.guests.length === 1);
    s.events.length = 0;
    expect(ringBell(s)).toBe(true);
    until(s, () => s.guests.length === 2);
    expect(s.guests[1].eager).toBe(true);
    expect(guestAt(s, s.guests[1].spot)).toBeUndefined();
  });

  it('always has something helpful to say on day one', () => {
    const s = newGame(11, 0);
    until(s, () => s.guests.some(g => g.phase === 'waiting'));
    expect(coach(s)).toMatch(/Tap the (juice bar|fryer) to make it!$/);
  });
});

describe('who is playing, and what they bought', () => {
  it('gives each host their own perk', () => {
    expect(HOSTS.map(h => h.id)).toEqual(['minty', 'single', 'double', 'vanilla', 'raspberry', 'cookie']);
    expect(modsFor('cookie').tip).toBe(modsFor('minty').tip + 1);
    expect(modsFor('vanilla').cook).toBeLessThan(modsFor('minty').cook);
    expect(modsFor('raspberry').samples).toBe(modsFor('minty').samples + 1);
    expect(modsFor('minty').speed).toBeGreaterThan(modsFor('single').speed);
    expect(modsFor('single').patience).toBeGreaterThan(modsFor('minty').patience);
    expect(modsFor('double').tray).toBe(TRAY_MAX + 1);
    expect(modsFor('minty').tray).toBe(TRAY_MAX);
    expect(newGame(1, 0, { host: 'nobody' }).hostId).toBe('minty');
  });

  it('applies shop upgrades, and never more levels than there are', () => {
    const m = modsFor('minty', { stove: 2, tray: 1, tips: 3, cake: 9, mats: 1, shoes: -4 });
    expect(m.cook).toBeCloseTo(0.76);
    expect(m.tray).toBe(TRAY_MAX + 1);
    expect(m.tip).toBe(3);
    expect(m.samples).toBe(3);
    expect(m.speed).toBeCloseTo(1.2);
    const s = newGame(1, 2, { upgrades: { stove: 2 } });
    expect(s.stations[station('burger')].total).toBeCloseTo(4.2 * 0.76);
  });

  it('lets Double Scoop carry one more thing', () => {
    const s = newGame(5, 0, { host: 'double' });
    const juice = station('juice');
    for (let n = 0; n < TRAY_MAX + 1; n++) {
      tap(s, { kind: 'station', index: juice });
      until(s, () => s.stations[juice].phase === 'ready');
      tap(s, { kind: 'station', index: juice });
      until(s, () => s.host.queue.length === 0 && s.host.current === null && s.host.busy <= 0);
    }
    expect(s.host.tray).toHaveLength(TRAY_MAX + 1);
  });
});

describe('bonuses and free cake', () => {
  it('pays extra for a whole order at once and for a run of happy friends', () => {
    const s = newGame(7, 0);
    const events: SimEvent[] = [];
    until(s, () => s.guests.some(g => g.phase === 'waiting'));
    const g = s.guests.find(g => g.phase === 'waiting')!;
    g.order = [{ food: 'juice', done: false }, { food: 'fries', done: false }];
    s.host.tray = ['juice', 'fries'];
    s.streak = 2;
    tap(s, { kind: 'guest', spot: g.spot });
    until(s, () => s.served === 1, events);
    const done = events.find(e => e.type === 'complete') as Extract<SimEvent, { type: 'complete' }>;
    expect(done.together).toBe(true);
    expect(done.streak).toBe(3);
    // juice 3 + fries 4, three hearts 4, all at once 2, third in a row 2 (and 3 for a favorite)
    expect(done.coins).toBe(3 + 4 + 4 + 2 + 2 + (done.favorite ? 3 : 0));
    expect(s.bestStreak).toBe(3);
  });

  it('ends a run when a friend goes home hungry', () => {
    const s = newGame(3, 0);
    s.streak = 4;
    until(s, () => s.missed === 1);
    expect(s.streak).toBe(0);
  });

  it('shares free cake so waiting friends are patient again, once a day', () => {
    const s = newGame(7, 0);
    expect(giveSamples(s)).toBe(false);
    until(s, () => s.guests.some(g => g.phase === 'waiting'));
    const g = s.guests.find(g => g.phase === 'waiting')!;
    for (let i = 0; i < 10 / STEP; i++) step(s);
    expect(g.patience).toBeLessThan(g.patienceMax - 5);
    expect(giveSamples(s)).toBe(true);
    expect(g.patience).toBe(g.patienceMax);
    expect(s.samples).toBe(0);
    expect(giveSamples(s)).toBe(false);
  });
});

describe('Endless Rush', () => {
  it('keeps going until three friends leave hungry', () => {
    const s = newGame(5, 3, { endless: true });
    expect(s.toSpawn).toBe(Infinity);
    expect(s.stations.filter(st => st.unlocked)).toHaveLength(DAYS[3].menu.length);
    for (let i = 0; i < 600 / STEP && !s.over; i++) { step(s); s.events.length = 0; }
    expect(s.over).toBe(true);
    expect(s.missed).toBe(LIVES);
    expect(s.served).toBe(0);
  });

  it('gets busier the longer it lasts, and a good helper serves plenty', () => {
    const s = playDay(5, 3, 0.15, { endless: true }, 240);
    expect(s.served).toBeGreaterThanOrEqual(12);
    expect(s.spawned).toBeGreaterThan(s.served - 1);
    expect(JSON.stringify(playDay(5, 3, 0.15, { endless: true }, 240))).toBe(JSON.stringify(s));
  });

  it('always ends in the end, however good the player and the diner are', () => {
    const best = { stove: 3, shoes: 3, mats: 3, tray: 1, tips: 3, cake: 2 };
    for (const host of HOSTS) {
      const s = playDay(2, DAYS.length - 1, 0.15, { endless: true, host: host.id, upgrades: best }, 3600);
      expect(s.over, host.id).toBe(true);
      expect(s.missed, host.id).toBe(LIVES);
    }
  });
});

describe('difficulty', () => {
  it('a quick helper makes every friend happy on every day, as any host', () => {
    for (const host of HOSTS) {
      for (let day = 0; day < DAYS.length; day++) {
        for (const seed of [1, 2, 3]) {
          const s = playDay(seed, day, 0.15, { host: host.id });
          expect(s.over, `${host.id} day ${day + 1} seed ${seed} finishes`).toBe(true);
          expect(stars(s), `${host.id} day ${day + 1} seed ${seed}: ${s.served}/${s.day.guests}`).toBe(3);
        }
      }
    }
  });

  it('a slow, careful player still passes every day', () => {
    for (let day = 0; day < DAYS.length; day++) {
      for (const seed of [4, 5, 6]) {
        const s = playDay(seed, day, 1.4);
        expect(stars(s), `day ${day + 1} seed ${seed}: ${s.served}/${s.day.guests}`).toBeGreaterThanOrEqual(day < 3 ? 2 : 1);
      }
    }
  });
});

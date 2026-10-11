import { describe, expect, it } from 'vitest';
import { BADGES } from '../../src/data/badges';
import { BODIES, BODY_BY_ID } from '../../src/data/bodies';
import { CHAR_BY_ID } from '../../src/data/characters';
import { CODEX, CODEX_BY_ID } from '../../src/data/codex';
import { DAILIES } from '../../src/data/dailies';
import { FACTS } from '../../src/data/facts';
import { COURSES } from '../../src/data/races';
import { STICKERS } from '../../src/data/stickers';
import { LEVELS } from '../../src/data/levels';
import { MISSIONS } from '../../src/data/missions';
import { checkBadges } from '../../src/systems/badges';
import { codexListener, codexPercent } from '../../src/systems/codex';
import { dailyListener, ensureDailies, pickDailies } from '../../src/systems/daily';
import { finishRace } from '../../src/systems/race';
import { createSave } from '../../src/systems/save/schema';
import { GameState } from '../../src/systems/state';
import { stickerListener } from '../../src/systems/stickers';

function state() {
  const st = new GameState(createSave(0));
  st.on(codexListener);
  st.on(stickerListener);
  st.on(dailyListener);
  return st;
}

describe('facts and codex data', () => {
  it('every fact belongs to a real Codex entry and is short and simple', () => {
    const ids = new Set<string>();
    for (const f of FACTS) {
      expect(CODEX_BY_ID[f.subject], f.subject).toBeTruthy();
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(f.text.length, f.text).toBeLessThanOrEqual(120);
      expect(f.text.trim().endsWith('.') || f.text.trim().endsWith('!'), f.text).toBe(true);
    }
  });

  it('every real place in the game has at least two facts', () => {
    for (const b of BODIES) {
      if (!b.real || b.id === 'sun' || !CODEX_BY_ID[b.id]) continue;
      expect(FACTS.filter((f) => f.subject === b.id).length, b.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('made-up things are marked as story, and have no "facts"', () => {
    for (const id of ['zephyra', 'tibble', 'beacon', 'c_zibbo', 'c_ollo', 'c_glimmers']) {
      expect(CODEX_BY_ID[id].real).toBe(false);
      expect(FACTS.some((f) => f.subject === id)).toBe(false);
    }
    expect(BODY_BY_ID.zephyra.real).toBe(false);
  });

  it('codex pictures point at things that exist', () => {
    for (const e of CODEX) {
      const p = e.picture;
      if ('body' in p) expect(BODY_BY_ID[p.body], e.id).toBeTruthy();
      if ('char' in p) expect(CHAR_BY_ID[p.char], e.id).toBeTruthy();
    }
  });

  it('there are 30+ badges and every sticker can be found', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    const missions = new Set(MISSIONS.map((m) => m.id));
    for (const s of STICKERS) {
      const src = s.source;
      if (src.kind === 'level') expect(LEVELS[src.level], s.id).toBeTruthy();
      if (src.kind === 'mission') expect(missions.has(src.mission), s.id).toBe(true);
      if (src.kind === 'race') expect(COURSES.some((c) => c.id === src.course), s.id).toBe(true);
      if (src.kind === 'space') expect(BODY_BY_ID[src.body], s.id).toBeTruthy();
    }
    // A mission that gives a sticker must list it in its rewards.
    for (const s of STICKERS) {
      if (s.source.kind !== 'mission') continue;
      const m = MISSIONS.find((x) => x.id === (s.source as { mission: string }).mission)!;
      expect(m.rewards.stickers ?? [], s.id).toContain(s.id);
    }
  });
});

describe('codex discovery', () => {
  it('fills in when you fly near places and shows a fun fact the first time', () => {
    const st = state();
    st.emit({ type: 'near', body: 'mars' });
    expect(st.data.codex).toContain('mars');
    expect(st.outbox.some((m) => m.kind === 'fact' && m.id === 'mars')).toBe(true);
    st.outbox.length = 0;
    st.emit({ type: 'near', body: 'mars' });
    expect(st.outbox.some((m) => m.kind === 'fact')).toBe(false);
    st.emit({ type: 'scan', target: 'sat:1' });
    expect(st.data.codex).toContain('satellite');
    expect(codexPercent(st.data.codex)).toBeGreaterThan(0);
  });
});

describe('badges', () => {
  it('are awarded once when their rule becomes true', () => {
    const st = state();
    expect(checkBadges(st)).toEqual([]);
    st.data.stats.flights = 1;
    expect(checkBadges(st)).toContain('first_flight');
    expect(checkBadges(st)).toEqual([]);
    st.data.stats.perfectLandings = 10;
    const got = checkBadges(st);
    expect(got).toContain('soft_touch');
    expect(got).toContain('perfect_pilot');
  });
});

describe('daily challenges', () => {
  it('are the same all day and change the next day', () => {
    const s = createSave(1);
    s.chapter = 5;
    s.visitedSystems.push('belt');
    s.flags.racesOpen = true;
    const a = pickDailies(s, '2026-10-11').map((d) => d.id);
    const b = pickDailies(s, '2026-10-11').map((d) => d.id);
    const c = pickDailies(s, '2026-10-12').map((d) => d.id);
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
    expect(new Set(a).size).toBe(3);
    expect(a.join()).not.toEqual(c.join());
  });

  it('only offer challenges you can do', () => {
    const s = createSave(1);
    for (let day = 1; day <= 28; day++) {
      const list = pickDailies(s, `2026-02-${String(day).padStart(2, '0')}`);
      for (const p of list) expect(DAILIES.find((d) => d.id === p.id)!.available(s)).toBe(true);
    }
  });

  it('count progress and give coins when done', () => {
    const st = state();
    st.data.daily = { day: 'x', list: [{ id: 'fuel', progress: 0, done: false }, { id: 'boosts', progress: 0, done: false }, { id: 'coins_earth', progress: 0, done: false }] };
    const goal = DAILIES.find((d) => d.id === 'fuel')!.goal.easy;
    for (let i = 0; i < goal; i++) st.emit({ type: 'fuel' });
    expect(st.data.daily.list[0].done).toBe(true);
    expect(st.data.coins).toBeGreaterThan(0);
    expect(st.data.stats.dailiesDone).toBe(1);
    expect(st.data.stickers).toContain('st_star');
    expect(ensureDailies(st.data, new Date(2026, 9, 11))).toBe(true);
    expect(st.data.daily.day).toBe('2026-10-11');
  });
});

describe('races', () => {
  it('give medals, best times, coins once per better medal, and a gold sticker', () => {
    const st = state();
    st.data.difficulty = 'normal';
    const r1 = finishRace(st, 'race_ripple', 30);
    expect(r1.medal).toBe('bronze');
    expect(st.data.coins).toBe(25);
    finishRace(st, 'race_ripple', 31);
    expect(st.data.coins).toBe(25);
    const easy = state();
    easy.data.difficulty = 'easy';
    expect(finishRace(easy, 'race_ripple', 28).medal).toBe('gold');
    expect(easy.data.stickers).toContain('st_rings');
    expect(easy.data.races.race_ripple.medal).toBe('gold');
  });
});

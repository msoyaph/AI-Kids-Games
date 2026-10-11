// Playtest mode (on-device pacing log), stall hints, and the playtest analyzer.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { deliverAll, talk } from './story';
import { give } from '../src/sim/inventory';
import { sellSlot } from '../src/sim/economy';
import { PLAYTEST_CAP, PLAYTEST_KIND, PlaytestRecorder, emptyLog, type PlaytestLog } from '../src/sim/playtest';
import { STALL_SEC, hintLines, hintRT, sendHint, stepHints, trackedMission } from '../src/sim/hints';
import { questRT } from '../src/sim/quests';
import { MISSIONS } from '../src/data/missions';
import type { Game } from '../src/sim/game';
import { analyze, formatReport, median, nice } from '../scripts/analyze-playtests';
import { estimatePacing } from '../scripts/pacing';

function memStore() {
  const s = { data: null as string | null, load: () => s.data, save: (d: string) => void (s.data = d) };
  return s;
}

/** Feed the recorder `sec` seconds of real time. */
function play(rec: PlaytestRecorder, g: Game, sec: number, menu: string | null = null, idle = false): void {
  for (let t = 0; t < sec; t++) {
    g.idleSec = idle ? 999 : 0;
    rec.tick(1, menu);
  }
}

describe('playtest recorder', () => {
  it('records missions, chapters, menus, idle time, money, loans and activities — and nothing personal', () => {
    const g = makeGame(2024);
    g.state.player.name = 'SecretName';
    const store = memStore();
    const rec = new PlaytestRecorder(store);
    rec.attach(g);
    expect(rec.log.missions.m1_arrive).toBeDefined();
    play(rec, g, 60);
    talk(g, 'pemberly'); // finishes m1_arrive, starts m1_camp
    expect(rec.log.missions.m1_arrive!.e).toBe(60);
    play(rec, g, 30, 'dialogue');
    play(rec, g, 120, null, true);
    play(rec, g, 45, 'inventory');
    give(g, 'branch', 6);
    give(g, 'fiber', 3);
    deliverAll(g, 'pemberly');
    give(g, 'shell_spiral', 3);
    sellSlot(g, g.state.player.inv.findIndex((s) => s?.id === 'shell_spiral'), 3);
    g.emit('fishCaught', { id: 'fish_x', size: 2, where: 'river', rarity: 1 });
    g.emit('loanTaken', { amount: 15000, level: 1 });
    play(rec, g, 10);
    g.emit('loanPaid', { amount: 15000, remaining: 0 });
    g.emit('missionStalled', { id: 'm1_tools', obj: 1 });
    rec.flush();

    const raw = store.data!;
    expect(raw).not.toContain('SecretName');
    expect(raw).not.toMatch(/seed|createdAt|userAgent|savedAt/);
    const L = JSON.parse(raw) as PlaytestLog;
    expect(L.kind).toBe(PLAYTEST_KIND);
    expect(L.total).toBe(265);
    expect(L.play).toBe(70);
    expect(L.menu).toBe(75);
    expect(L.idle).toBe(120);
    expect(L.menus).toEqual({ dialogue: 30, inventory: 45 });
    expect(L.missions.m1_arrive!.play).toBe(60);
    const camp = L.missions.m1_camp!;
    expect(camp.e).toBe(255);
    expect([camp.play, camp.menu, camp.idle]).toEqual([0, 75, 120]);
    expect(L.missions.m1_tools!.stalls).toBe(1);
    expect(L.stalls[0]).toMatchObject({ id: 'm1_tools', obj: 1 });
    expect(L.glints.earned.sell).toBeGreaterThan(0);
    expect(L.activity.fishCaught).toBe(1);
    expect(L.activity.itemSold).toBe(1);
    expect(L.loans[0]).toMatchObject({ level: 1, amount: 15000, t: 255, paidT: 265 });
    expect(L.chapters[1]).toMatchObject({ s: 0, sd: 1 });
    expect(L.days['1']).toBe(265);
  });

  it('resumes from storage, counts sessions, and can be cleared', () => {
    const store = memStore();
    const g = makeGame(7);
    const a = new PlaytestRecorder(store);
    a.attach(g);
    play(a, g, 100);
    a.flush();
    a.detach();
    const b = new PlaytestRecorder(store);
    b.attach(g);
    expect(b.log.sessions).toBe(2);
    expect(b.log.total).toBe(100);
    play(b, g, 5);
    b.reset();
    expect(JSON.parse(store.data!).total).toBe(0);
    store.data = '{broken';
    expect(new PlaytestRecorder(store).log.total).toBe(0);
  });

  it(`stays under ${PLAYTEST_CAP / 1024} KB however long you play`, () => {
    const rec = new PlaytestRecorder(memStore());
    const L = rec.log;
    for (let d = 1; d <= 3000; d++) L.days[d] = 899.9;
    for (let k = 0; k < 200; k++) L.stalls.push({ id: 'm3_bridge', obj: 0, t: k * 1000.5, day: k });
    for (let k = 0; k < 400; k++) L.loans.push({ level: 1, amount: 15000, day: k, t: k, paidDay: k + 1, paidT: k + 1 });
    expect(rec.serialize().length).toBeLessThan(PLAYTEST_CAP);
  });
});

describe('stall hints', () => {
  const active = { move: { x: 0, z: 0, run: false } };
  /** Simulate `sec` seconds of play; `idle` = no input at all. */
  function run(g: Game, sec: number, idle = false): void {
    for (let t = 0; t < sec; t += 0.5) {
      if (!idle) g.idleSec = 0;
      g.update(0.5, active);
    }
  }
  const hints = (g: Game) => questRT(g).inbox.filter((m) => m.hint);

  it('Pemberly calls on the Glowpad after 6 minutes of play without progress', () => {
    const g = makeGame(11);
    questRT(g).inbox.length = 0;
    const stalls: string[] = [];
    g.bus.on('missionStalled', (e) => stalls.push(e.id));
    run(g, STALL_SEC - 10);
    expect(hints(g)).toHaveLength(0);
    run(g, 20);
    expect(stalls).toEqual(['m1_arrive']);
    const h = hints(g);
    expect(h).toHaveLength(1);
    expect(h[0]!.speaker).toBe('pemberly');
    expect(h[0]!.lines.join(' ')).toContain('Pemberly');
    expect(h[0]!.lines.join(' ')).toMatch(/map/i);
    // a second stall replaces the unread hint instead of stacking
    run(g, STALL_SEC + 5);
    expect(hints(g)).toHaveLength(1);
  });

  it('idle time and menus never count as being stuck', () => {
    const g = makeGame(12);
    questRT(g).inbox.length = 0;
    run(g, STALL_SEC * 2, true);
    g.mode = 'menu';
    run(g, STALL_SEC * 2);
    expect(hints(g)).toHaveLength(0);
  });

  it('progress resets the timer', () => {
    const g = makeGame(13);
    talk(g, 'pemberly');
    questRT(g).inbox.length = 0;
    run(g, STALL_SEC - 30);
    give(g, 'branch', 1);
    stepHints(g, 1);
    run(g, 60);
    expect(hintRT(g).stuck).toBeLessThan(120);
    expect(hints(g)).toHaveLength(0);
  });

  it('every objective of every mission has a specific, short hint', () => {
    const g = makeGame(14);
    for (const m of MISSIONS)
      for (let i = -1; i < m.objectives.length; i++) {
        if (i < 0 && !m.turnIn) continue;
        const text = hintLines(g, m, i).join(' ');
        expect(text, `${m.id}#${i}`).not.toMatch(/Try this:/);
        expect(text.length, `${m.id}#${i}`).toBeLessThan(160);
      }
  });

  it('the help button sends a hint right away', () => {
    const g = makeGame(15);
    questRT(g).inbox.length = 0;
    let asked = false;
    g.bus.on('hintShown', (e) => (asked = e.asked));
    sendHint(g, trackedMission(g)!, undefined, true);
    expect(hints(g)).toHaveLength(1);
    expect(asked).toBe(true);
  });
});

describe('analyze-playtests', () => {
  const est = estimatePacing();
  /** A synthetic log that plays like the model, scaled by `k`, with optional tweaks. */
  function fakeLog(k: number, tweak?: (l: PlaytestLog) => void): PlaytestLog {
    const L = emptyLog();
    let t = 0;
    for (const m of est.missions) {
      const sec = m.activeMin * 60 * k;
      L.missions[m.id] = { ch: m.chapter, s: t, e: t + sec, sd: m.startDay, ed: m.endDay, play: sec * 0.8, menu: sec * 0.2, idle: 0, stalls: 0 };
      t += sec;
    }
    for (const r of est.rows) L.chapters[r.chapter] = { s: 0, e: r.minutes * 60 * k, sd: r.days[0], ed: r.days[1] };
    L.total = t;
    L.play = t * 0.8;
    L.menu = t * 0.2;
    L.storyDone = { t: est.total * 60 * k, day: est.days };
    L.glints.earned = { sell: est.incomePerMin * (L.play / 60) };
    tweak?.(L);
    return L;
  }

  it('suggests easing a mission players find slow, and clearer hints where they stall', () => {
    const logs = [1, 1.05, 0.95, 1.1, 0.9].map((k) =>
      fakeLog(k, (l) => {
        const m = l.missions.m2_shop!;
        m.play *= 3;
        m.menu *= 3;
        m.stalls = 1;
        l.stalls.push({ id: 'm2_shop', obj: 0, t: 0, day: 5 });
      }),
    );
    const r = analyze(logs, est);
    expect(r.players).toBe(5);
    const row = r.missions.find((m) => m.id === 'm2_shop')!;
    expect(row.ratio).toBeGreaterThan(2.5);
    expect(row.stalledShare).toBe(1);
    expect(r.suggestions.some((s) => s.includes('m2_shop') && /→/.test(s))).toBe(true);
    expect(r.suggestions.some((s) => s.includes('m2_shop') && /stalled/.test(s))).toBe(true);
    expect(formatReport(r)).toContain('Suggestions');
  });

  it('flags an economy that pays less than the model', () => {
    const logs = [fakeLog(1, (l) => (l.glints.earned.sell! *= 0.5))];
    const r = analyze(logs, est);
    expect(r.suggestions.some((s) => s.startsWith('src/data/economy.ts') && s.includes('HOME_TIERS'))).toBe(true);
  });

  it('is quiet when players match the model', () => {
    const r = analyze([1, 1, 1, 1, 1].map((k) => fakeLog(k)), est);
    expect(r.storyHours).toBeCloseTo(est.total / 60, 1);
    expect(r.suggestions.filter((s) => !s.startsWith('scripts/pacing.ts: players spend'))).toEqual([]);
  });

  it('helpers', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(nice(23.4)).toBe(25);
    expect(nice(7.6)).toBe(8);
    expect(nice(12345)).toBe(12500);
  });
});

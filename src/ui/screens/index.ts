import type { App } from '../../game/app';
import type { SessionConfig, SessionResult, PlayerSlot } from '../../game/session';
import { GrandPrix } from '../../game/modes/grandPrix';
import { pickOpponents } from '../../game/modes/roster';
import { staffGhost } from '../../game/modes/timeTrial';
import { addStats, awardTrophy, checkProgressUnlocks, updateRecord } from '../../game/progression';
import { evaluateChallenges } from '../../game/challenges';
import { GhostData } from '../../sim/ghost';
import { medalFor } from '../../sim/rules';
import { findTrack } from '../../data/tracks/index';
import { formatTime } from '../../core/math';
import { titleScreen, slotsScreen, nameEntryScreen, mainMenuScreen, playersScreen, classSelectScreen } from './menus';
import { racerSelectScreen, garageScreen, cupSelectScreen, trackSelectScreen, vsOptionsScreen, battleSetupScreen, ttSetupScreen } from './setup';
import { resultsScreen, podiumScreen, showUnlocks } from './results';
import { settingsScreen, pauseOverlay, confirmOverlay } from './settings';
import { collectionScreen, challengesScreen, recordsScreen } from './extras';

export interface ScreenRegistry {
  title(): void;
  slots(): void;
  nameEntry(slot: number): void;
  mainMenu(): void;
  players(): void;
  classSelect(next: () => void): void;
  racerSelect(player: number, next: () => void): void;
  garage(back: () => void): void;
  cupSelect(): void;
  vsCupPick(): void;
  trackSelect(): void;
  vsOptions(): void;
  battleSetup(): void;
  startBattle(): void;
  startTimeTrial(trackId: string): void;
  settings(back: () => void): void;
  pause(): void;
  restart(): void;
  confirm(text: string, yes: () => void, no?: () => void): void;
  collection(): void;
  challenges(): void;
  records(): void;
}

export function registerScreens(app: App): void {
  /** The last session config, for Restart/Rematch. */
  let lastCfg: SessionConfig | null = null;
  let lastDone: ((r: SessionResult) => void) | null = null;

  const players = (): PlayerSlot[] => {
    const src = app.inputSources(app.flow.players);
    return Array.from({ length: app.flow.players }, (_, i) => ({ racerId: app.flow.racers[i] ?? 'calex', kart: app.kartFor(i), source: src[i] }));
  };

  const run = (cfg: SessionConfig, done: (r: SessionResult) => void): void => {
    lastCfg = cfg;
    lastDone = done;
    app.startSession(cfg, done);
  };

  /** Shared post-race bookkeeping: lifetime stats + challenges. Returns notes for the results screen. */
  const recordProgress = (r: SessionResult): string[] => {
    const notes: string[] = [];
    if (!app.saves.data) return notes;
    const me = r.results.find((x) => x.player === 0);
    if (!me) return notes;
    const battle = r.config.mode === 'battle';
    addStats(app.save, me.stats, { won: me.rank === 1, podium: me.rank <= 3, battle, timeTrial: r.config.mode === 'timeTrial' });
    const done = evaluateChallenges(app.save, r);
    for (const c of done) notes.push(`🎯 Challenge complete: ${c.name}!`);
    app.saves.markDirty();
    return notes;
  };

  const afterUnlocks = (then: () => void): void => {
    checkProgressUnlocks(app.save);
    app.saves.markDirty();
    if (app.save.newUnlocks.length) showUnlocks(app, then);
    else then();
  };

  // ---------------------------------------------------------------- Grand Prix / custom cup
  const startCup = (gp: GrandPrix): void => {
    app.gp = gp;
    raceCup();
  };

  const raceCup = (): void => {
    const gp = app.gp!;
    run(gp.config(), (r) => {
      const pts = gp.addResult(r);
      const notes = recordProgress(r);
      const standings = gp.sorted();
      const last = gp.done;
      app.ui.show(
        resultsScreen(app, r, {
          points: pts,
          standings,
          raceNo: gp.raceIndex,
          races: gp.tracks.length,
          notes,
          buttons: last
            ? [{ label: 'See results ▶', cls: 'yellow', action: () => finishCup() }]
            : [
                { label: 'Next race ▶', cls: 'yellow', action: () => raceCup() },
                { label: 'Quit cup', cls: 'ghost', action: () => app.screens.confirm('Quit this cup? Your points will be lost.', () => app.quitToMenu(), () => {}) },
              ],
        }),
      );
    });
  };

  const finishCup = (): void => {
    const gp = app.gp!;
    app.endSession();
    const place = gp.placeOf(0);
    const medal = gp.mode === 'grandPrix' ? medalFor(place) : null;
    if (gp.mode === 'grandPrix') {
      awardTrophy(app.save, gp.cup.id, gp.speedClass, gp.mirror, medal);
      evaluateChallenges(app.save, null);
      app.saves.markDirty();
    }
    const top = gp.sorted().slice(0, 3).map((s) => {
      const isPlayer = s.id < gp.players.length;
      const slot = isPlayer ? gp.players[s.id] : gp.ai[s.id - gp.players.length];
      return { racerId: slot.racerId, cfg: slot.kart };
    });
    app.ui.show(
      podiumScreen(app, gp.mode === 'grandPrix' ? gp.cup.name : 'Custom Cup', place, medal, top, () => {
        app.gp = null;
        afterUnlocks(() => {
          app.audio.playMusic('menu');
          app.screens.mainMenu();
        });
      }),
    );
  };

  // ---------------------------------------------------------------- Versus single race
  const startVsRace = (trackId: string): void => {
    const f = app.flow;
    const ps = players();
    const ai = pickOpponents(ps.map((p) => p.racerId), f.vs.aiCount, Date.now() & 0xffff, 1);
    app.flow.trackId = trackId;
    run(
      {
        mode: 'versus',
        trackId,
        speedClass: f.speedClass,
        mirror: f.mirror,
        items: f.vs.items,
        itemSet: f.vs.itemSet,
        laps: f.vs.laps,
        players: ps,
        ai,
        seed: (Date.now() & 0xffffff) >>> 0,
        intro: true,
      },
      (r) => {
        const notes = recordProgress(r);
        app.ui.show(
          resultsScreen(app, r, {
            notes,
            buttons: [
              { label: 'Rematch ↻', cls: 'yellow', action: () => startVsRace(trackId) },
              { label: 'New track', action: () => (app.endSession(), afterUnlocks(() => app.screens.trackSelect())) },
              { label: 'Menu', cls: 'ghost', action: () => (app.endSession(), afterUnlocks(() => (app.audio.playMusic('menu'), app.screens.mainMenu()))) },
            ],
          }),
        );
      },
    );
  };

  // ---------------------------------------------------------------- Battle
  const startBattle = (): void => {
    const f = app.flow;
    const ps = players();
    run(
      {
        mode: 'battle',
        arenaId: f.arenaId,
        speedClass: 'pro',
        mirror: false,
        items: true,
        itemSet: 'all',
        laps: 0,
        players: ps,
        ai: pickOpponents(ps.map((p) => p.racerId), f.battle.aiCount, Date.now() & 0xffff, 0),
        seed: (Date.now() & 0xffffff) >>> 0,
        battleTime: f.battle.time,
        intro: true,
      },
      (r) => {
        const notes = recordProgress(r);
        app.ui.show(
          resultsScreen(app, r, {
            notes,
            buttons: [
              { label: 'Rematch ↻', cls: 'yellow', action: () => startBattle() },
              { label: 'Change arena', action: () => (app.endSession(), afterUnlocks(() => app.screens.battleSetup())) },
              { label: 'Menu', cls: 'ghost', action: () => (app.endSession(), afterUnlocks(() => (app.audio.playMusic('menu'), app.screens.mainMenu()))) },
            ],
          }),
        );
      },
    );
  };

  // ---------------------------------------------------------------- Time Trial
  const startTimeTrial = (trackId: string): void => {
    const f = app.flow;
    const ps = players().slice(0, 1);
    const rec = app.save.records[trackId];
    const staff = staffGhost(trackId);
    let ghost: SessionConfig['ghost'] = null;
    if (rec?.hasGhost && (f.tt.ghost === 'best' || f.tt.ghost === 'both')) {
      const enc = app.saves.loadGhost(trackId);
      const data = enc ? GhostData.decode(enc) : null;
      if (data) ghost = { data, racerId: rec.racer, kart: rec.kart };
    }
    const staffCfg = f.tt.ghost === 'staff' || f.tt.ghost === 'both' ? { data: staff.data, racerId: staff.racerId, kart: staff.kart } : null;
    run(
      { mode: 'timeTrial', trackId, speedClass: 'pro', mirror: false, items: false, itemSet: 'all', laps: 3, players: ps, ai: [], seed: 1, ghost, staffGhost: staffCfg, intro: false },
      (r) => {
        const me = r.results[0];
        const notes = recordProgress(r);
        if (!me.projected) {
          const imp = updateRecord(app.save, trackId, me.finishTime, me.bestLap, ps[0].racerId, ps[0].kart);
          if (imp.best) {
            notes.unshift('🏁 NEW BEST TIME!');
            if (r.ghost && !app.saves.saveGhost(trackId, r.ghost)) app.save.records[trackId].hasGhost = false;
          } else if (imp.lap) notes.unshift('⚡ New best lap!');
          if (me.finishTime < staff.time && !app.save.records[trackId].beatStaff) {
            app.save.records[trackId].beatStaff = true;
            notes.unshift('⭐ You beat the staff ghost!');
          }
          evaluateChallenges(app.save, null);
          app.saves.markDirty();
        }
        app.ui.show(
          resultsScreen(app, r, {
            title: `${findTrack(trackId).name} — ${formatTime(me.finishTime)}`,
            notes: [...notes, `Laps: ${me.lapTimes.map(formatTime).join('  ·  ')}`, `Staff ghost: ${formatTime(staff.time)}`],
            buttons: [
              { label: 'Retry ↻', cls: 'yellow', action: () => startTimeTrial(trackId) },
              { label: 'Other track', action: () => (app.endSession(), afterUnlocks(() => app.screens.trackSelect())) },
              { label: 'Menu', cls: 'ghost', action: () => (app.endSession(), afterUnlocks(() => (app.audio.playMusic('menu'), app.screens.mainMenu()))) },
            ],
          }),
        );
      },
    );
  };

  const reg: ScreenRegistry = {
    title: () => app.ui.show(titleScreen(app)),
    slots: () => app.ui.show(slotsScreen(app)),
    nameEntry: (slot) => app.ui.show(nameEntryScreen(app, slot)),
    mainMenu: () => {
      if (!app.saves.data) {
        reg.slots();
        return;
      }
      afterUnlocks(() => app.ui.show(mainMenuScreen(app)));
    },
    players: () => app.ui.show(playersScreen(app)),
    classSelect: (next) => app.ui.show(classSelectScreen(app, next)),
    racerSelect: (p, next) => app.ui.show(racerSelectScreen(app, p, next)),
    garage: (back) => app.ui.show(garageScreen(app, back)),
    cupSelect: () =>
      app.ui.show(
        cupSelectScreen(
          app,
          (cupId) => {
            app.flow.cupId = cupId as never;
            const ps = players();
            const ai = pickOpponents(ps.map((p) => p.racerId), 8 - ps.length, (Date.now() & 0xffff) >>> 0, 2);
            startCup(new GrandPrix(cupId, app.flow.speedClass, app.flow.mirror, ps, ai, (Date.now() & 0xffffff) >>> 0));
          },
          () => reg.classSelect(() => reg.racerSelect(0, () => (app.flow.players === 2 ? reg.racerSelect(1, () => reg.cupSelect()) : reg.cupSelect()))),
        ),
      ),
    vsCupPick: () =>
      app.ui.show(
        cupSelectScreen(
          app,
          (cupId) => {
            const f = app.flow;
            const ps = players();
            const ai = pickOpponents(ps.map((p) => p.racerId), f.vs.aiCount, (Date.now() & 0xffff) >>> 0, 1);
            startCup(new GrandPrix(cupId, f.speedClass, f.mirror, ps, ai, (Date.now() & 0xffffff) >>> 0, 'versus', undefined, f.vs.items, f.vs.itemSet, f.vs.laps));
          },
          () => reg.vsOptions(),
        ),
      ),
    trackSelect: () =>
      app.ui.show(
        trackSelectScreen(
          app,
          (id) => (app.flow.mode === 'timeTrial' ? app.ui.show(ttSetupScreen(app, id)) : startVsRace(id)),
          () => (app.flow.mode === 'timeTrial' ? reg.racerSelect(0, () => reg.trackSelect()) : reg.vsOptions()),
          app.flow.mode === 'timeTrial',
          app.flow.mode !== 'timeTrial',
        ),
      ),
    vsOptions: () => app.ui.show(vsOptionsScreen(app)),
    battleSetup: () => app.ui.show(battleSetupScreen(app)),
    startBattle,
    startTimeTrial,
    settings: (back) => app.ui.show(settingsScreen(app, back)),
    pause: () => app.ui.showOverlay(pauseOverlay(app)),
    restart: () => {
      app.ui.closeOverlay(false);
      if (lastCfg && lastDone) {
        if (app.gp && lastCfg.mode !== 'timeTrial') {
          // restarting a cup race: undo nothing (points are only added at the finish)
        }
        run({ ...lastCfg, seed: (lastCfg.seed + 101) >>> 0 }, lastDone);
      }
    },
    confirm: (text, yes, no) => app.ui.showOverlay(confirmOverlay(app, text, yes, no)),
    collection: () => app.ui.show(collectionScreen(app)),
    challenges: () => app.ui.show(challengesScreen(app)),
    records: () => app.ui.show(recordsScreen(app)),
  };
  app.screens = reg;
}

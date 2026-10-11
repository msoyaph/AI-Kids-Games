import { Kart, RespawnState } from './kart';
import type { World } from './world';
import type { TrackModel } from './track/trackModel';

/**
 * Lap counting, race positions, wrong-way detection and finishing.
 * Progress is a continuous unwrapped distance; implausible jumps are ignored, so cutting across the infield
 * (or driving backwards over the line) never earns a lap.
 */
export class RaceTracker {
  /** Finish order (kart indices). */
  readonly finishOrder: number[] = [];
  private readonly order: Kart[];
  /** Time the leader finished (others get a grace period, then are auto-placed). */
  leaderFinishTime = -1;
  /** Seconds after the first finisher before the race ends for everyone. */
  readonly graceTime = 25;
  /** All local players finished → race can end early (AI positions are projected). */
  allPlayersFinished = false;

  constructor(
    readonly world: World,
    readonly track: TrackModel,
    readonly laps: number,
  ) {
    this.order = [...world.karts];
    world.postStep.push((dt) => this.update(dt));
  }

  /** Place karts on the starting grid. order[i] = kart index for grid slot i. */
  placeGrid(gridOrder: number[]): void {
    const sp = { x: 0, y: 0, z: 0, yaw: 0 };
    gridOrder.forEach((ki, slot) => {
      const k = this.world.karts[ki];
      this.track.gridSlot(slot, sp);
      k.place(sp.x, sp.y, sp.z, sp.yaw);
      this.track.resetHint(sp.x, sp.y, sp.z, k.hint);
      this.track.query(sp.x, sp.y + 0.5, sp.z, k.hint, k.ground);
      const s = k.ground.s;
      k.lastS = s;
      k.progress = s > this.track.length / 2 ? s - this.track.length : s;
      k.safeS = s;
      k.lapsDone = 0;
      k.rank = slot + 1;
    });
    this.sortRanks(true);
  }

  private update(dt: number): void {
    const w = this.world;
    const L = this.track.length;
    for (const k of w.karts) {
      if (k.respawnState === RespawnState.Carried) {
        // Respawn puts us back at safeS: re-sync progress (never gain distance).
        const s = k.ground.s;
        let ds = s - k.lastS;
        if (ds > L / 2) ds -= L;
        if (ds < -L / 2) ds += L;
        if (ds < 0) k.progress += ds;
        k.lastS = s;
        continue;
      }
      if (k.respawnState !== RespawnState.None) continue;
      const g = k.ground;
      const s = g.s;
      let ds = s - k.lastS;
      if (ds > L / 2) ds -= L;
      if (ds < -L / 2) ds += L;
      if (Math.abs(ds) < 25) k.progress += ds;
      k.lastS = s;
      k.ribbon = g.ribbon;
      // safe respawn point: on solid ground near the road
      if (k.grounded && g.hit && Math.abs(g.d) < g.halfWidth + 1 && g.ribbon === 0) k.safeS = s;
      else if (k.grounded && g.hit && g.ribbon > 0) k.safeS = s;

      // shortcut stat: entering a shortcut ribbon
      if (g.ribbon > 0 && k.grounded && k.ribbonEntered !== g.ribbon) {
        k.ribbonEntered = g.ribbon;
        k.raceStats.shortcuts++;
        w.events.push({ type: 'shortcut', kart: k.index });
      } else if (g.ribbon === 0 && Math.abs(g.d) < g.halfWidth) {
        k.ribbonEntered = 0;
      }

      // wrong way: moving against the track direction for a while
      const along = k.vx * g.dirX + k.vz * g.dirZ;
      const facing = Math.sin(k.yaw) * g.dirX + Math.cos(k.yaw) * g.dirZ;
      const wrong = !k.finished && w.phase === 'race' && facing < -0.3 && (along < -2 || Math.abs(k.speed) < 2);
      if (wrong) {
        k.wrongWayTime += dt;
        if (k.wrongWayTime > 1.2 && k.wrongWayTime - dt <= 1.2) w.events.push({ type: 'wrongWay', kart: k.index, on: true });
      } else if (k.wrongWayTime > 0) {
        if (k.wrongWayTime > 1.2) w.events.push({ type: 'wrongWay', kart: k.index, on: false });
        k.wrongWayTime = 0;
      }

      // laps
      if (!k.finished && w.phase !== 'countdown' && w.phase !== 'intro') {
        while (k.progress >= (k.lapsDone + 1) * L) {
          k.lapsDone++;
          const lapTime = w.raceTime - k.lapStart;
          k.lapStart = w.raceTime;
          k.lapTimes.push(lapTime);
          if (lapTime < k.bestLap) k.bestLap = lapTime;
          if (k.lapsDone >= this.laps) {
            this.finishKart(k, w.raceTime);
            break;
          }
          w.events.push({ type: 'lap', kart: k.index, lap: k.lapsDone + 1, time: lapTime, final: k.lapsDone + 1 === this.laps });
        }
      }
    }
    this.sortRanks(false);
    // End conditions
    if (w.phase === 'race') {
      const players = w.karts.filter((k) => k.isPlayer);
      this.allPlayersFinished = players.length > 0 && players.every((k) => k.finished);
      const everyone = w.karts.every((k) => k.finished);
      const graceOver = this.leaderFinishTime >= 0 && w.raceTime - this.leaderFinishTime > this.graceTime;
      if (everyone || graceOver) this.finishRemaining();
    }
  }

  private finishKart(k: Kart, time: number): void {
    k.finished = true;
    k.finishTime = time;
    this.finishOrder.push(k.index);
    k.rank = this.finishOrder.length;
    if (this.leaderFinishTime < 0) this.leaderFinishTime = time;
    this.world.events.push({ type: 'finish', kart: k.index, rank: k.rank, time });
  }

  /** End the race: unfinished karts are placed by progress with a projected time. */
  finishRemaining(): void {
    const w = this.world;
    const L = this.track.length;
    const rest = w.karts.filter((k) => !k.finished).sort((a, b) => b.progress - a.progress);
    for (const k of rest) {
      const remaining = Math.max(0, this.laps * L - k.progress);
      const avgSpeed = Math.max(8, k.progress / Math.max(1, w.raceTime));
      k.finished = true;
      k.finishTime = w.raceTime + remaining / avgSpeed;
      this.finishOrder.push(k.index);
      k.rank = this.finishOrder.length;
      k.projected = true;
    }
    if (w.phase === 'race') w.phase = 'done';
  }

  private sortRanks(initial: boolean): void {
    const o = this.order;
    // insertion sort (tiny array, mostly sorted already)
    for (let i = 1; i < o.length; i++) {
      const k = o[i];
      let j = i - 1;
      while (j >= 0 && this.ahead(k, o[j])) {
        o[j + 1] = o[j];
        j--;
      }
      o[j + 1] = k;
    }
    for (let i = 0; i < o.length; i++) {
      const k = o[i];
      const r = i + 1;
      if (k.rank !== r) {
        if (!initial && !k.finished && this.world.phase === 'race') this.world.events.push({ type: 'rank', kart: k.index, from: k.rank, to: r });
        k.rank = r;
      }
      if (!initial && this.world.phase === 'race' && !k.finished) {
        if (r > k.raceStats.worstPosition) k.raceStats.worstPosition = r;
        if (r !== 1) k.raceStats.ledWholeRace = false;
      }
    }
  }

  private ahead(a: Kart, b: Kart): boolean {
    if (a.finished && b.finished) return a.finishTime < b.finishTime;
    if (a.finished !== b.finished) return a.finished;
    return a.progress > b.progress;
  }

  /** Karts in race order. */
  get standings(): readonly Kart[] {
    return this.order;
  }

  /** 0..1 fraction of the race completed by kart k. */
  fraction(k: Kart): number {
    return Math.max(0, Math.min(1, k.progress / (this.laps * this.track.length)));
  }

  /** Current lap number for display (1-based, clamped). */
  lapOf(k: Kart): number {
    return Math.max(1, Math.min(this.laps, k.lapsDone + 1));
  }
}

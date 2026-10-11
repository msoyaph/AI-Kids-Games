import { DT, RUN_LENGTH } from '../config/balance';
import { BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { updateDirector } from './director';
import { enemyContacts, killDepleted, updateEnemies, updateEnemyShots } from './enemyAI';
import { updateHazards } from './hazards';
import { updateGems, updatePickups } from './pickups';
import { updateProjectiles } from './projectiles';
import { updateShrines } from './shrines';
import { updatePlayer } from './player';
import { recomputePlayerStats } from './stats';
import { beginLevelUp, openChest } from './upgrades';
import { updateWeapons } from './weapons';
import type { SimInput, World } from './world';

function savePrevious(w: World): void {
  const p = w.player;
  p.px = p.x;
  p.py = p.y;
  p.pz = p.z;
  const e = w.enemies;
  e.px.set(e.x.subarray(0, e.count));
  e.py.set(e.y.subarray(0, e.count));
  e.pz.set(e.z.subarray(0, e.count));
  const s = w.enemyShots;
  s.px.set(s.x.subarray(0, s.count));
  s.py.set(s.y.subarray(0, s.count));
  s.pz.set(s.z.subarray(0, s.count));
  const g = w.gems;
  g.px.set(g.x.subarray(0, g.count));
  g.py.set(g.y.subarray(0, g.count));
  g.pz.set(g.z.subarray(0, g.count));
  const pk = w.pickups;
  pk.px.set(pk.x.subarray(0, pk.count));
  pk.py.set(pk.y.subarray(0, pk.count));
  pk.pz.set(pk.z.subarray(0, pk.count));
}

function updateTimers(w: World): void {
  const p = w.player;
  if (p.iframes > 0) p.iframes = Math.max(0, p.iframes - DT);
  if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - DT * 3);
  if (p.alive && p.stats.regen > 0 && p.hp < p.stats.maxHp) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * DT);
  const b = p.buffs;
  let changed = false;
  if (b.might > 0 && (b.might -= DT) <= 0) {
    b.might = 0;
    changed = true;
  }
  if (b.haste > 0 && (b.haste -= DT) <= 0) {
    b.haste = 0;
    changed = true;
  }
  if (b.fortune > 0 && (b.fortune -= DT) <= 0) {
    b.fortune = 0;
    changed = true;
  }
  if (b.ward > 0) b.ward = Math.max(0, b.ward - DT);
  if (changed) recomputePlayerStats(w);
}

function compact(w: World): void {
  w.enemies.compact();
  w.projectiles.compact();
  w.hazards.compact();
  w.enemyShots.compact();
  w.gems.compact();
  w.pickups.compact();
}

/** Dawn at 20:00 (or the Regent's defeat) wins the run after a short celebration. */
function checkVictory(w: World): void {
  const d = w.director;
  if (!d.dawn && w.time >= RUN_LENGTH && w.options.stress === 0) {
    d.dawn = true;
    d.victoryT = 3;
    w.events.push(Ev.Banner, 0, 0, 0, 0, 0, 0, BANNER.dawn);
    // the Gloom melts away in the sunlight
    const e = w.enemies;
    for (let i = 0; i < e.count; i++) {
      if (!e.alive[i]) continue;
      e.alive[i] = 0;
      w.events.push(Ev.EnemyDie, e.x[i], e.y[i], e.z[i], e.type[i], e.scale[i], 0);
    }
    w.director.bossUid = 0;
  }
  if (d.victoryT > 0) {
    w.player.iframes = Math.max(w.player.iframes, 0.5);
    d.victoryT -= DT;
    if (d.victoryT <= 0) w.state = 'won';
  }
}

/** Advance the world by one fixed 1/60 s tick. */
export function step(w: World, input: SimInput): void {
  if (w.state !== 'playing') return;
  w.tick++;
  w.time += DT;
  savePrevious(w);

  updatePlayer(w, input);
  if (!w.director.dawn && w.director.victoryT <= 0) updateDirector(w);
  checkVictory(w);

  const e = w.enemies;
  w.grid.build(e.x, e.z, e.alive, e.count);
  updateEnemies(w);

  updateWeapons(w);
  updateProjectiles(w);
  updateHazards(w);

  enemyContacts(w);
  updateEnemyShots(w);
  updateGems(w);
  updatePickups(w);
  updateShrines(w);
  updateTimers(w);
  killDepleted(w);
  compact(w);

  if (w.state === 'playing') {
    if (w.pendingChests > 0) {
      w.pendingChests--;
      w.chestRewards = openChest(w);
      w.state = 'chest';
    } else if (w.pendingLevels > 0) {
      beginLevelUp(w);
      w.state = 'levelup';
    }
  }
}

/** UI closed the chest reward screen. */
export function closeChest(w: World): void {
  w.chestRewards = [];
  if (w.state === 'chest') w.state = 'playing';
}

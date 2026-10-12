import { Rng } from '../core/rng';
import { dayKey } from '../core/time';
import { DAILIES, DAILY_BONUS, DAILY_BY_ID } from '../data/dailies';
import { STICKERS } from '../data/stickers';
import type { GameEvent } from './events';
import type { DailyProgress, SaveData } from './save/schema';
import type { GameState } from './state';

/** Pick today's three challenges (deterministic for a day + slot). */
export function pickDailies(save: SaveData, day: string): DailyProgress[] {
  const rng = new Rng(`${day}#${save.slot}#${save.createdAt}`);
  const pool = DAILIES.filter((d) => d.available(save));
  rng.shuffle(pool);
  return pool.slice(0, 3).map((d) => ({ id: d.id, progress: 0, done: false }));
}

/** Make sure today's challenges exist (new day = new challenges). */
export function ensureDailies(save: SaveData, now: Date = new Date()): boolean {
  const day = dayKey(now);
  if (save.daily.day === day && save.daily.list.length) return false;
  save.daily = { day, list: pickDailies(save, day) };
  return true;
}

export function dailyGoal(save: SaveData, id: string): number {
  const d = DAILY_BY_ID[id];
  return d ? d.goal[save.difficulty] : 1;
}

export function dailyText(save: SaveData, id: string): string {
  const d = DAILY_BY_ID[id];
  return d ? d.text.replace('{n}', String(dailyGoal(save, id))) : id;
}

/** Event listener: count progress, give rewards, sticker milestones. */
export function dailyListener(e: GameEvent, st: GameState): void {
  if (e.type === 'daily') return;
  const save = st.data;
  if (!save.daily.list.length) return;
  for (const p of save.daily.list) {
    if (p.done) continue;
    const def = DAILY_BY_ID[p.id];
    if (!def) continue;
    const n = def.count(e);
    if (n <= 0) continue;
    p.progress = Math.min(dailyGoal(save, p.id), p.progress + n);
    st.markDirty();
    if (p.progress >= dailyGoal(save, p.id)) {
      p.done = true;
      st.addCoins(def.reward);
      st.bump('dailiesDone');
      st.post({ kind: 'daily', id: p.id });
      st.emit({ type: 'daily', id: p.id });
      if (save.daily.list.every((q) => q.done)) {
        st.addCoins(DAILY_BONUS);
        st.post({ kind: 'toast', icon: 'gift', text: `All daily challenges done! +${DAILY_BONUS} bonus coins!` });
      }
      for (const s of STICKERS) {
        if (s.source.kind === 'daily' && save.stats.dailiesDone >= s.source.count && st.addUnique(save.stickers, s.id)) st.post({ kind: 'sticker', id: s.id });
      }
    }
  }
}

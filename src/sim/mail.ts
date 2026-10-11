/** Mail: letters arrive in the morning when their conditions are met. */
import { LETTERS } from '../data/mail';
import type { LetterDef } from '../data/story-types';
import { hearts } from './friendship';
import { newGameHooks, type Sim } from './sim';
import { registerSystem } from './systems';

export const LETTER: Record<string, LetterDef> = {};
for (const l of LETTERS) LETTER[l.id] = l;

/** Extra letters added by systems at runtime (quests, story) by id. */
export function sendLetter(sim: Sim, id: string): void {
  if (sim.state.mail.some((m) => m.id === id)) return;
  sim.state.mail.push({ id });
  sim.state.flags[`mail.${id}`] = 1;
}

export function unreadCount(sim: Sim): number {
  return sim.state.mail.filter((m) => !m.read).length;
}

export function checkMail(sim: Sim): number {
  const st = sim.state;
  let n = 0;
  for (const l of LETTERS) {
    if (st.flags[`mail.${l.id}`]) continue;
    const w = l.when;
    if (w.day !== undefined && st.day < w.day) continue;
    if (w.hearts && hearts(sim, w.hearts[0]) < w.hearts[1]) continue;
    if (w.flag && !st.flags[w.flag]) continue;
    sendLetter(sim, l.id);
    n++;
  }
  return n;
}

/** Claim a letter's attachment once. Returns a description or null. */
export function claimAttachment(sim: Sim, id: string): string | null {
  const m = sim.state.mail.find((x) => x.id === id);
  const l = LETTER[id];
  if (!m || !l?.attach || m.claimed) return null;
  m.claimed = true;
  const a = l.attach;
  const out: string[] = [];
  if (a.item) {
    sim.give(a.item, a.n ?? 1);
    out.push('item');
  }
  if (a.recipe && !sim.p.recipes.includes(a.recipe)) {
    sim.p.recipes.push(a.recipe);
    sim.ev.emit('toast', { text: 'You learned a new recipe!', icon: 'ui.book' });
    out.push('recipe');
  }
  if (a.coins) {
    sim.p.coins += a.coins;
    out.push('coins');
  }
  return out.join(',');
}

newGameHooks.push((sim) => void checkMail(sim));

registerSystem({
  id: 'mail',
  startDay(sim) {
    const n = checkMail(sim);
    if (n) sim.morningNotes.push(`You have ${n} new letter${n > 1 ? 's' : ''} in your mailbox!`);
  },
});

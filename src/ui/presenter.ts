import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { dialogue } from '../data/dialogue';
import { MISSION_BY_ID, CHAPTER_NAMES } from '../data/missions';
import { PART_BY_ID } from '../data/parts';
import { STICKER_BY_ID } from '../data/stickers';
import { drawToCanvas } from '../gfx/atlas';
import { drawSticker } from '../gfx/art/stickers';
import type { UiMessage } from '../systems/state';
import { showDialogue } from './dialogue';
import { h } from './dom';
import { celebrate } from './fx';
import { closeTopModal, openModal } from './modal';
import { speak } from './speech';
import { toast } from './toast';
import { button, iconEl } from './widgets';

/**
 * Turns messages from the game systems into things the player sees: dialogue, toasts and
 * celebration popups. Blocking items (dialogue, popups) are shown one at a time.
 */
type Job = () => Promise<void>;
const queue: Job[] = [];
let running = false;
let holds = 0;

/** Pause the presenter (e.g. during scene changes or cutscenes). */
export function holdPresenter(on: boolean): void {
  holds = Math.max(0, holds + (on ? 1 : -1));
  if (!on) void pump();
}

export function presenterBusy(): boolean {
  return running || queue.length > 0;
}

function enqueue(job: Job): void {
  queue.push(job);
  void pump();
}

async function pump(): Promise<void> {
  if (running || holds > 0) return;
  running = true;
  while (queue.length && holds === 0) {
    const job = queue.shift()!;
    try {
      await job();
    } catch (err) {
      console.warn('presenter job failed', err);
    }
  }
  running = false;
}

/** Hooks for other systems (custscenes etc). */
export const presenterHooks = {
  cutscene: (_id: string): Promise<void> => Promise.resolve(),
  badge: (_id: string): Promise<void> => Promise.resolve(),
  codex: (_id: string): void => {},
  daily: (_id: string): void => {},
  fact: (_id: string): Promise<void> => Promise.resolve(),
};

function popup(content: HTMLElement[], okLabel = 'Yay!', testId = 'popup'): Promise<void> {
  return new Promise((resolve) => {
    const panel = h('div', { class: 'panel col center celebrate', 'data-testid': testId }, ...content, button(okLabel, 'check', () => closeTopModal(), { color: 'green', size: 'big', id: 'btn-popup-ok' }));
    openModal(panel, { onClose: () => resolve(), dismissable: true });
  });
}

function missionDone(id: string): Promise<void> {
  const def = MISSION_BY_ID[id];
  if (!def) return Promise.resolve();
  celebrate();
  sfx('missionDone');
  const r = def.rewards;
  const rewards = h('div', { class: 'rewards' });
  if (r.coins) rewards.append(h('div', { class: 'reward' }, iconEl('coin'), `+${r.coins}`));
  for (const p of r.parts ?? []) rewards.append(h('div', { class: 'reward' }, iconEl('wrench'), PART_BY_ID[p]?.name ?? p));
  for (const s of r.stickers ?? []) rewards.append(h('div', { class: 'reward' }, drawToCanvas(48, 48, (c, w) => drawSticker(c, s, w / 2, w / 2, w * 0.46)), STICKER_BY_ID[s]?.name ?? s));
  const next = S.missions.currentObjective();
  speak('Mission complete!');
  return popup([
    h('div', { class: 'h2' }, 'Mission Complete!'),
    h('div', { class: 'h3' }, def.title),
    rewards,
    next ? h('div', { class: 'next-up' }, iconEl('flag'), `Next: ${next.mission.title}`) : null,
  ].filter(Boolean) as HTMLElement[], 'Yay!', 'mission-done');
}

function chapterBanner(ch: number): Promise<void> {
  celebrate();
  sfx('fanfare');
  speak(`Chapter ${ch}. ${CHAPTER_NAMES[ch] ?? ''}`);
  return popup([h('div', { class: 'chapter-num' }, `Chapter ${ch}`), h('div', { class: 'h2' }, CHAPTER_NAMES[ch] ?? ''), h('div', { class: 'muted' }, 'New places are on the Star Map!')], 'Let\'s go!', 'chapter-banner');
}

function objectiveToast(missionId: string): void {
  const cur = S.missions.objective(missionId);
  const prog = S.missions.progress(missionId);
  if (!cur || !prog) return;
  const need = cur.count ?? 1;
  if (prog.count > 0 && prog.count < need) toast(`${cur.text}: ${Math.floor(prog.count)} / ${need}`, cur.icon ?? 'target', 1800);
  else if (prog.count === 0) {
    toast(`Next: ${cur.text}`, cur.icon ?? 'flag', 2600);
    sfx('objective');
  }
}

export function handleMessage(m: UiMessage): void {
  switch (m.kind) {
    case 'dialogue': {
      const lines = dialogue(m.id);
      if (lines.length) enqueue(() => showDialogue(lines));
      break;
    }
    case 'objective':
      objectiveToast(m.mission);
      break;
    case 'missionDone':
      enqueue(() => missionDone(m.id));
      break;
    case 'chapter':
      enqueue(() => chapterBanner(m.chapter));
      break;
    case 'sticker': {
      const def = STICKER_BY_ID[m.id];
      if (def) {
        toast(`New sticker: ${def.name}!`, 'sticker', 2800);
        sfx('sticker');
      }
      break;
    }
    case 'toast':
      toast(m.text, m.icon);
      break;
    case 'cutscene':
      enqueue(() => presenterHooks.cutscene(m.id));
      break;
    case 'badge':
      enqueue(() => presenterHooks.badge(m.id));
      break;
    case 'codex':
      presenterHooks.codex(m.id);
      break;
    case 'daily':
      presenterHooks.daily(m.id);
      break;
    case 'fact':
      enqueue(() => presenterHooks.fact(m.id));
      break;
  }
}

/** Drain the state's outbox (call every frame). */
export function pumpMessages(): void {
  const st = S.state;
  if (!st || !st.outbox.length || S.game.isSwitching) return;
  const msgs = st.outbox.splice(0, st.outbox.length);
  for (const m of msgs) handleMessage(m);
}

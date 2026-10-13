/**
 * The script runner: plays a story script step by step, waiting for the dialogue box, choices,
 * spars, fades and walks. The overworld provides the host (what each step looks like).
 */
import type { Outcome } from '../core/battle/engine';
import { evalFlags, fillText, type Cmd, type Script } from '../core/script';
import { storyFlags, type Dir } from '../core/state';
import { SCRIPTS } from '../data/dialogue/index';
import { ITEMS } from '../data/items';
import { QUEST_BY_ID } from '../data/quests';
import type { Session } from './session';

export interface ScriptHost {
  say(text: string, who?: string): Promise<void>;
  ask(text: string, options: string[], who?: string): Promise<number>;
  fade(dir: 'out' | 'in'): Promise<void>;
  wait(seconds: number): Promise<void>;
  spar(trainer: string): Promise<Outcome>;
  wild(o: { species: string; level: number; guardian?: boolean }): Promise<Outcome>;
  partner(species: string): Promise<void>;
  /** A lost spar without a story "lose" branch: wake at the last Rest Stop, rested, nothing lost. */
  lostSpar(): Promise<void>;
  shop(id: string): Promise<void>;
  base(): Promise<void>;
  tower(): Promise<void>;
  credits(): Promise<void>;
  beacon(id: string): Promise<void>;
  walk(who: string, path: string): Promise<void>;
  face(who: string, dir: Dir): void;
  warp(map: string, x: number, y: number, dir?: Dir): Promise<void>;
  emote(who: string, emote: string): Promise<void>;
  music(id: string): void;
  sfx(id: string): void;
  toast(text: string): void;
  tutorial(id: string): Promise<void>;
  /** Flags changed: people may appear or leave. */
  refresh(): void;
}

export async function runScript(session: Session, host: ScriptHost, script: Script | string, depth = 0): Promise<void> {
  const list = typeof script === 'string' ? SCRIPTS[script] : script;
  if (!list || depth > 20) return;
  const s = session.state;
  const text = (t: string) => fillText(t, session.names());
  for (const cmd of list) await step(cmd);

  async function step(c: Cmd): Promise<void> {
    if ('say' in c) return host.say(text(c.say), c.who && text(c.who));
    if ('ask' in c) {
      const pick = await host.ask(text(c.ask), [c.yesText ?? 'Yes', c.noText ?? 'No'], c.who && text(c.who));
      return runScript(session, host, pick === 0 ? c.yes : c.no ?? [], depth + 1);
    }
    if ('set' in c) { s.flags.add(c.set); host.refresh(); return; }
    if ('clear' in c) { s.flags.delete(c.clear); host.refresh(); return; }
    if ('if' in c) return runScript(session, host, evalFlags(c.if, storyFlags(s, session.dex.species)) ? c.then : c.else ?? [], depth + 1);
    if ('give' in c) {
      const n = c.n ?? 1;
      session.give(c.give, n);
      host.sfx('item');
      host.toast(`Got ${n > 1 ? `${n} ` : ''}${ITEMS[c.give]?.name ?? c.give}!`);
      return;
    }
    if ('take' in c) {
      const n = c.take ? c.n ?? 1 : 0;
      s.bag[c.take] = Math.max(0, (s.bag[c.take] ?? 0) - n);
      host.toast(`Gave ${n > 1 ? `${n} ` : ''}${ITEMS[c.take]?.name ?? c.take}.`);
      return;
    }
    if ('coins' in c) { s.coins += c.coins; host.toast(`Got ${c.coins} coins!`); return; }
    if ('heal' in c) { session.healAll(); return; }
    if ('rest' in c) { session.healAll(); session.setRestHere(); session.save(); return; }
    if ('spar' in c) {
      const out = await host.spar(c.spar);
      if (out === 'won') return runScript(session, host, c.win ?? [], depth + 1);
      if (c.lose) return runScript(session, host, c.lose, depth + 1);
      return host.lostSpar();
    }
    if ('wild' in c) {
      const out = await host.wild(c.wild);
      if (out === 'befriended') return runScript(session, host, c.friend ?? c.win ?? [], depth + 1);
      if (out === 'won') return runScript(session, host, c.win ?? [], depth + 1);
      if (out === 'lost') return c.lose ? runScript(session, host, c.lose, depth + 1) : host.lostSpar();
      return;
    }
    if ('partner' in c) return host.partner(c.partner);
    if ('warp' in c) return host.warp(c.warp, c.x, c.y, c.dir);
    if ('walk' in c) return host.walk(c.walk, c.path);
    if ('face' in c) { host.face(c.face, c.dir); return; }
    if ('wait' in c) return host.wait(c.wait);
    if ('fade' in c) return host.fade(c.fade);
    if ('quest' in c) {
      const before = s.quests[c.quest];
      s.quests[c.quest] = c.stage;
      const q = QUEST_BY_ID[c.quest];
      if (q && before !== c.stage) host.toast(c.stage < 0 ? `Quest done: ${q.title}!` : `New goal: ${q.stages[c.stage] ?? q.title}`);
      return;
    }
    if ('tutorial' in c) return host.tutorial(c.tutorial);
    if ('music' in c) { host.music(c.music); return; }
    if ('sfx' in c) { host.sfx(c.sfx); return; }
    if ('beacon' in c) { s.flags.add(c.beacon); await host.beacon(c.beacon); host.refresh(); return; }
    if ('shop' in c) return host.shop(c.shop);
    if ('base' in c) return host.base();
    if ('tower' in c) return host.tower();
    if ('credits' in c) return host.credits();
    if ('show' in c) { s.flags.add(`show:${c.show}`); host.refresh(); return; }
    if ('hide' in c) { s.flags.delete(`show:${c.hide}`); host.refresh(); return; }
    if ('emote' in c) return host.emote(c.who ?? 'player', c.emote);
    if ('goto' in c) return runScript(session, host, c.goto, depth + 1);
  }
}

import { S } from '../app/services';
import { CHATTER } from '../data/chatter';
import type { Line } from '../data/dialogueTypes';
import { crewHooks } from './crewHooks';

const counters: Record<string, number> = {};

/** What a crew member says when tapped: a mission hint if they gave your mission, otherwise chatter. */
export function crewTalk(id: string): Line[] {
  const cur = S.missions.currentObjective();
  if (cur && cur.mission.giver === id) {
    return [
      { who: id, text: `Let's do "${cur.mission.title}"!` },
      { who: id, text: cur.obj.hint ?? `${cur.obj.text}.` },
    ];
  }
  if (id === 'pip') {
    const fact = crewHooks.fact();
    if (fact) return [{ who: 'pip', text: 'Here is a space fact!', mood: 'wow' }, { who: 'pip', text: fact }];
  }
  const list = CHATTER[id] ?? ['Hello!'];
  const n = counters[id] ?? Math.floor(Math.random() * list.length);
  counters[id] = n + 1;
  return [{ who: id, text: list[n % list.length] }];
}

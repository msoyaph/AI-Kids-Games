// Stall hints: when the tracked mission makes no progress for a while of real play (not idle,
// not in menus), Pemberly calls on the Glowpad with a short, specific hint and the map marks
// the spot. Runtime-only; nothing here is saved.
import { MISSION_BY_ID } from '../data/missions';
import type { MissionDef, Objective } from '../data/questTypes';
import { item, RECIPES } from '../data/registry';
import { NPC_BY_ID, VILLAGER_BY_ID } from '../data/villagers';
import type { Game } from './game';
import { active, allDone, deliverableCount, markerTarget, objectiveLive, objectiveValue, questRT } from './quests';

/** Seconds of active play without progress before a hint. */
export const STALL_SEC = 6 * 60;
/** Seconds without input after which the player counts as idle (away). */
export const IDLE_SEC = 30;

interface HintRT {
  key: string;
  stuck: number;
  /** time since the last check (checks run twice a second) */
  acc: number;
  /** hints sent this session per mission */
  sent: Record<string, number>;
}

export function hintRT(g: Game): HintRT {
  let r = g.runtime.hints as HintRT | undefined;
  if (!r) {
    r = { key: '', stuck: 0, acc: 0, sent: {} };
    g.runtime.hints = r;
  }
  return r;
}

/** The mission the HUD tracks: the chosen one if still active, else the first active mission. */
export function trackedMission(g: Game): MissionDef | undefined {
  const t = MISSION_BY_ID[g.state.quests.tracked];
  if (t && g.state.quests.active[t.id]) return t;
  return active(g)[0];
}

/** First objective the player still has to do (or -1 when only the turn-in is left). */
export function openObjective(g: Game, m: MissionDef): number {
  if (m.turnIn && allDone(g, m)) return -1;
  for (let i = 0; i < m.objectives.length; i++) if (!objectiveValue(g, m, i).done && objectiveLive(g, m, i)) return i;
  return -1;
}

function progressKey(g: Game, m: MissionDef): string {
  return `${m.id}|${m.objectives.map((_, i) => objectiveValue(g, m, i).value).join(',')}|${g.state.player.inv.reduce((n, s) => n + (s?.qty ?? 0), 0)}`;
}

/** Player is actually playing right now (in the world, not idle, not in a menu). */
export function playingActively(g: Game): boolean {
  return g.mode === 'play' && g.idleSec < IDLE_SEC;
}

export function stepHints(g: Game, frameDt: number): void {
  const rt = hintRT(g);
  // only count time that is actively played; check progress twice a second
  if (playingActively(g)) rt.acc += frameDt;
  if (rt.acc < 0.5) return;
  const dt = rt.acc;
  rt.acc = 0;
  const m = trackedMission(g);
  if (!m) {
    rt.key = '';
    rt.stuck = 0;
    return;
  }
  // Any change in objective progress or pocket contents counts as progress.
  const key = progressKey(g, m);
  if (key !== rt.key) {
    rt.key = key;
    rt.stuck = 0;
    return;
  }
  rt.stuck += dt;
  if (rt.stuck < STALL_SEC) return;
  rt.stuck = 0;
  const obj = openObjective(g, m);
  g.emit('missionStalled', { id: m.id, obj });
  sendHint(g, m, obj);
}

export function sendHint(g: Game, m: MissionDef, obj = openObjective(g, m), asked = false): void {
  const rt = hintRT(g);
  rt.sent[m.id] = (rt.sent[m.id] ?? 0) + 1;
  rt.stuck = 0;
  g.emit('hintShown', { id: m.id, asked });
  const lines = ["[happy]Ring ring! It's Pemberly, on your Glowpad.", ...hintLines(g, m, obj)];
  if (markerTarget(g, m)) lines.push('[happy]I put a big star on your map. Open the Map to see it!');
  // replace an older unread hint instead of stacking them
  const inbox = questRT(g).inbox;
  const old = inbox.findIndex((x) => x.hint);
  if (old >= 0) inbox.splice(old, 1);
  inbox.push({ speaker: 'pemberly', lines, hint: true });
}

const nameOf = (id: string) => VILLAGER_BY_ID[id]?.name ?? NPC_BY_ID[id]?.name ?? id;
const hourText = (h: number) => (h === 12 ? '12 noon' : h > 12 ? `${h - 12} PM` : `${h} AM`);

/** Where a material comes from, in a few simple words. */
function sourceOf(id: string): string {
  switch (id) {
    case 'branch':
      return 'Shake trees, or look under them.';
    case 'fiber':
      return 'Pull weeds to get it.';
    case 'timber':
      return 'Hit trees with your hatchet.';
    case 'stone':
    case 'iron':
    case 'clay':
      return 'Hit big rocks with your shovel or hatchet.';
    case 'glowstone':
      return 'Hit big rocks. Glow Pebbles show up more at night.';
    case 'lens':
      return 'You found it at the old lighthouse.';
    case '$nativeFruit':
      return 'Shake the fruit trees on the island.';
    case 'pie':
      return 'Tansy is baking it for you.';
  }
  if (id.startsWith('shell_')) return 'Look for shells on the beach.';
  const r = RECIPES.find((x) => x.result === id);
  if (r) return 'You can make it at your workbench.';
  return '';
}

const EVENT_HINT: Record<string, (o: Extract<Objective, { kind: 'event' }>) => string> = {
  fishCaught: () => 'Stand by the water and use your rod. When the fish bites, press the button fast!',
  bugCaught: () => 'Hold your net. Walk slowly up to a bug, then swing!',
  crafted: (o) => `Go to your workbench and make a ${item(String(o.filter?.item ?? '')).name}.`,
  woodChopped: () => 'Hit trees with your hatchet. Each tree gives a few pieces a day.',
  itemSold: () => 'Talk to Fennimore and sell fruit, shells, fish and bugs.',
  itemBought: () => 'Talk to Fennimore at the shop and buy something.',
  donated: () => 'Catch fish and bugs, or dig up fossils. Then give them to Vesper.',
  fossilAssessed: () => 'Dig up a fossil with your shovel. Then bring it to Vesper at the museum.',
  location: () => 'Walk up to the museum door to go inside.',
  slept: () => 'Go home and sleep in your bed. The night goes by fast!',
  planted: () => 'Plant flower seeds in the grass. Pick the seeds in your bag.',
  flowerBred: () => 'Plant two flowers next to each other. Water them every day. A new color may grow!',
  climbed: () => 'Face a cliff wall and use your Rope Ladder.',
  eventFinished: (o) => (o.filter?.kind === 'bugoff' ? 'Talk to Kip to start a bug-off. Catch lots of bugs fast!' : 'Talk to Juno to start the fishing contest. Catch lots of fish fast!'),
};

const STATE_HINT: Record<string, (o: Extract<Objective, { kind: 'state' }>, g: Game) => string> = {
  hasStruct: () => 'This one needs a night. Go to sleep, and it will be ready in the morning!',
  residents: () => 'Your new neighbors move in tonight. Go to sleep, and say hi in the morning!',
  homeLevel: () => 'Talk to Pemberly at Lantern Hall about a bigger home. Then sleep, and it will be built!',
  plot: (o) => `Talk to Pemberly to place ${nameOf(o.arg ?? '')}'s plot. Find a flat, open spot.`,
  museum: (o, g) => `Give Vesper more fish, bugs and fossils. You have given ${g.state.museum.donated.length} of ${o.n}.`,
  bridges: () => 'Ask Pemberly for a bridge at Lantern Hall. Then stand by the river, face the water, and build.',
  ramps: () => 'Ask Pemberly for a ramp at Lantern Hall. Then stand near a cliff, face it, and build.',
  visited: () => 'Climb all the way to the top of the cliffs. Use your ladder or a ramp.',
  visitedEast: () => 'Walk over your new bridge and explore the other side!',
  flag: () => 'Walk up to the old lighthouse at the very top and look at it.',
  plazaDecor: () => 'Put furniture around the plaza. Pick it in your bag, then place it on the ground.',
  plazaFlowers: () => 'Plant flowers near the plaza. Seeds are sold at the shop.',
  rating: () => 'Make the island nicer! Open Island Glow on your Glowpad to see how.',
  stat: (o) => (o.arg === 'digSpots' ? 'Look for little cracks in the ground. Dig there with your shovel.' : o.arg === 'loanPaid' ? 'Talk to Pemberly at Lantern Hall to pay your loan. Sell things to Fennimore to get Glints.' : ''),
};

/** Early-reader hint lines for objective `i` of mission `m` (-1 = turn-in). */
export function hintLines(g: Game, m: MissionDef, i: number): string[] {
  if (i < 0) return [`[happy]You did it all! Now go and talk to ${nameOf(m.turnIn ?? m.giver)}.`];
  const o = m.objectives[i]!;
  let text = '';
  switch (o.kind) {
    case 'talk': {
      const hour = Math.floor(g.state.clock.minute / 60);
      text = o.afterHour !== undefined && hour < o.afterHour ? `Come and see ${nameOf(o.npc)} after ${hourText(o.afterHour)}. Until then, have fun!` : `Go and talk to ${nameOf(o.npc)}.`;
      break;
    }
    case 'deliver': {
      const need = o.qty - (g.state.quests.active[m.id]?.counts[i] ?? 0);
      const have = deliverableCount(g, o);
      const what = o.item && !o.item.startsWith('$') ? item(o.item).name : o.cat === 'fossil' ? 'fossil' : o.cat === 'foreignFruit' ? 'fruit from far away' : 'island fruit';
      if (have >= need) text = `You have what ${nameOf(o.npc)} needs! Go and give it to ${nameOf(o.npc)}.`;
      else {
        text = `${nameOf(o.npc)} needs ${need} ${what}. You have ${have}.`;
        const src = o.cat === 'fossil' ? 'Dig up a fossil, and ask Vesper to look at it.' : o.cat === 'foreignFruit' ? 'Fennimore sells fruit from far away.' : sourceOf(o.item ?? '');
        if (src) text += ` ${src}`;
      }
      break;
    }
    case 'event':
      text = EVENT_HINT[o.event]?.(o) ?? '';
      break;
    case 'state':
      text = STATE_HINT[o.fn]?.(o, g) ?? '';
      break;
  }
  return [`[neutral]${text || `Try this: ${o.label}.`}`];
}

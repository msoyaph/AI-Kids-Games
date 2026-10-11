import './ui/styles.css';
import { App } from './app';
import { questRT } from './sim/quests';
import { rollWeather, WEATHER_LABEL } from './sim/weather';
import { hotItem } from './sim/economy';
import { item } from './data/registry';
import { CHALLENGES } from './data/challenges';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const app = new App(canvas, ui);

// Opening narration for a brand-new island.
app.onNewGame = (g) => {
  questRT(g).inbox.unshift({
    speaker: '',
    lines: [
      '[neutral]After many quiet days at sea, your little boat bumps against a weathered dock.',
      '[happy]Driftlight Isle! Somewhere past the plaza, a lantern is glowing in the window of Lantern Hall.',
    ],
  });
};

(window as unknown as { __lc: unknown }).__lc = app;

// Notice board: tomorrow's weather, today's hot item, contests and a rotating tip.
const BOARD_TIPS = [
  'Rocks give stone, clay, iron — and sometimes Glow Pebbles, especially at night.',
  'Trees share up to 3 pieces of timber each day. Spread the chopping around!',
  'Message bottles wash up on the beach every day. Each one holds a recipe.',
  'Watered flowers next to the same kind can sprout brand-new colors overnight.',
  'Fish shadows come in sizes 1 to 6. The biggest ones put up a fight.',
  'Villagers love gifts that match their taste. Check the Neighbors app on your Glowpad.',
];
app.boardHooks.push(() => {
  const g = app.game!;
  const s = g.state;
  const notes = [
    `Weather tomorrow: ${WEATHER_LABEL[rollWeather(s.seed, s.clock.day + 1)]}.`,
    `The Curled Leaf's hot item today: ${item(hotItem(g)).name} — sells for double!`,
    `Today's challenges: ${s.challenges.list.map((c) => CHALLENGES.find((d) => d.id === c.id)?.label).filter(Boolean).join(' · ')}`,
  ];
  if (s.quests.done.includes('m4_tourney')) notes.push('Juno hosts a fishing tournament once a day — ask her for a rematch!');
  if (s.quests.done.includes('m4_bugoff')) notes.push('Kip is always up for another bug-off.');
  notes.push(`Tip: ${BOARD_TIPS[s.clock.day % BOARD_TIPS.length]}`);
  return notes;
});

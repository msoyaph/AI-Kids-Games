import './ui/styles.css';
import { App } from './app';
import { questRT } from './sim/quests';
import { rollWeather, weatherName } from './sim/weather';
import { SEASONS, SEASON_DAYS, SEASON_ICON, SEASON_NAME } from './sim/seasons';
import { hotItem } from './sim/economy';
import { item } from './data/registry';
import { CHALLENGES } from './data/challenges';
import { CONTEST_DAYS, FESTIVALS } from './data/festivals';
import { VILLAGER_BY_ID } from './data/villagers';
import { birthdayToday, contestDay, festivalToday, happeningsOpen, meteorNight, merchantHere } from './sim/happenings';

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
    `Weather tomorrow: ${weatherName(rollWeather(s.seed, s.clock.day + 1), s.season.day === SEASON_DAYS && !s.season.paused ? (s.season.index + 1) % 4 : s.season.index)}.`,
    `${SEASON_ICON[SEASONS[s.season.index]!]} It's ${SEASON_NAME[SEASONS[s.season.index]!]}, day ${s.season.day} of ${SEASON_DAYS}.${s.season.paused ? ' (Seasons are paused.)' : ''}`,
    `The Curled Leaf's hot item today: ${item(hotItem(g)).name} — sells for double!`,
    `Today's challenges: ${s.challenges.list.map((c) => CHALLENGES.find((d) => d.id === c.id)?.label).filter(Boolean).join(' · ')}`,
  ];
  const fest = festivalToday(g);
  if (fest) notes.push(`🎉 Today: the ${fest.name}! ${fest.goal}`);
  else {
    const next = FESTIVALS.find((f) => f.season === SEASONS[s.season.index] && f.day > s.season.day);
    if (next && happeningsOpen(g)) notes.push(`🎉 Coming up: the ${next.name} on day ${next.day} of ${SEASON_NAME[next.season]}.`);
  }
  if (s.quests.done.includes('m4_tourney')) notes.push(`🎣 Juno's Fishing Tournament: day ${CONTEST_DAYS.tournament} of every season${contestDay(g, 'tournament') ? ' — that is today!' : '.'}`);
  if (s.quests.done.includes('m4_bugoff')) notes.push(`🦋 Kip's Bug-Off: day ${CONTEST_DAYS.bugoff} of every season${contestDay(g, 'bugoff') ? ' — that is today!' : '.'}`);
  if (merchantHere(g)) notes.push('🪶 Wanda the traveling merchant is on the beach by the dock today!');
  const bday = birthdayToday(g);
  if (bday) notes.push(`🎂 Happy birthday, ${VILLAGER_BY_ID[bday]?.name}! Visit with a gift.`);
  if (meteorNight(g)) notes.push('🌠 Stargazers say: shooting stars tonight after 8 PM!');
  notes.push(`Tip: ${BOARD_TIPS[s.clock.day % BOARD_TIPS.length]}`);
  return notes;
});

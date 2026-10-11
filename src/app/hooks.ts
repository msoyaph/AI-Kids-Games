import { sfx } from '../audio/sfx';
import { BADGES, BADGE_BY_ID } from '../data/badges';
import { CODEX, CODEX_BY_ID } from '../data/codex';
import { DAILY_BONUS } from '../data/dailies';
import { factsFor } from '../data/facts';
import { COURSES, COURSE_BY_ID, type Medal } from '../data/races';
import { drawToCanvas } from '../gfx/canvas';
import { drawBadge } from '../gfx/art/badges';
import { boardHooks } from '../scenes/boardHooks';
import { drawCodexPicture } from '../gfx/art/codexPicture';
import { completeHooks } from '../scenes/completeHooks';
import { crewHooks } from '../scenes/crewHooks';
import { raceHooks } from '../scenes/director';
import { hubHooks } from '../scenes/hubHooks';
import { codexPercent } from '../systems/codex';
import { dailyGoal, dailyText, ensureDailies } from '../systems/daily';
import { finishRace } from '../systems/race';
import { formatRaceTime } from '../core/mathx';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { closeTopModal, openModal } from '../ui/modal';
import { presenterHooks } from '../ui/presenter';
import { readAloudOn, speak } from '../ui/speech';
import { toast } from '../ui/toast';
import { button, iconEl } from '../ui/widgets';
import { S } from './services';

/** Badge counts the hub shows as a little red dot until you look at the Awards screen. */
let seenBadges = -1;
let seenCodex = -1;

function factCard(subject: string): Promise<void> {
  const e = CODEX_BY_ID[subject];
  const facts = factsFor(subject);
  if (!e || !facts.length) return Promise.resolve();
  const fact = facts[Math.floor(Math.random() * facts.length)];
  const pic = drawToCanvas(90, 90, (c, w, hh) => drawCodexPicture(c, e, w, hh));
  const card = h(
    'div',
    { class: 'fact-card hit', 'data-testid': 'fact-card' },
    pic,
    h('div', { class: 'grow' }, h('div', { class: 'fact-head' }, `Did you know? ${e.name}`), h('div', { class: 'fact-text' }, fact.text)),
    button('Read to me', 'speaker', () => speak(fact.text, { force: true }), { round: true, size: 'small', color: 'white', sound: null }),
  );
  for (const old of S.game.topLayer.querySelectorAll('.fact-card')) old.remove();
  S.game.topLayer.append(card);
  sfx('fact');
  if (readAloudOn()) speak(`Did you know? ${fact.text}`);
  const close = () => {
    card.classList.add('out');
    setTimeout(() => card.remove(), 400);
  };
  card.addEventListener('click', close);
  setTimeout(close, 9000);
  // Non-blocking: the game keeps going.
  return Promise.resolve();
}

/** Badges celebrate without stopping the game (no popup in the middle of a landing!). */
function badgePopup(id: string): Promise<void> {
  const b = BADGE_BY_ID[id];
  if (!b) return Promise.resolve();
  celebrate(30);
  sfx('badge');
  if (readAloudOn()) speak(`New badge! ${b.name}`);
  const pic = drawToCanvas(90, 98, (c, w, hh) => drawBadge(c, b, w, hh, true));
  const card = h('div', { class: 'badge-toast hit', 'data-testid': 'badge-popup' }, pic, h('div', null, h('div', { class: 'fact-head' }, 'New badge!'), h('div', { class: 'h3' }, b.name), h('div', { class: 'badge-desc' }, b.desc)));
  for (const old of S.game.topLayer.querySelectorAll('.badge-toast')) old.remove();
  S.game.topLayer.append(card);
  const close = () => {
    card.classList.add('out');
    setTimeout(() => card.remove(), 400);
  };
  card.addEventListener('click', close);
  setTimeout(close, 4200);
  return new Promise((r) => setTimeout(r, 900));
}

function raceResult(course: string, seconds: number): void {
  const res = finishRace(S.state, course, seconds);
  const def = COURSE_BY_ID[course];
  const names: Record<Medal, string> = { gold: 'Gold medal!', silver: 'Silver medal!', bronze: 'Bronze medal!', none: 'You finished!' };
  const colors: Record<Medal, string> = { gold: '#ffc83d', silver: '#c9d2ee', bronze: '#e0a050', none: '#4dd4ff' };
  if (res.medal !== 'none') celebrate(res.medal === 'gold' ? 90 : 50);
  sfx(res.medal === 'gold' ? 'fanfare' : 'missionDone');
  const pic = drawToCanvas(120, 130, (c, w, hh) => drawBadge(c, { id: 'r', name: '', desc: '', glyph: res.medal === 'none' ? 'flag' : 'medal', color: colors[res.medal], check: () => true }, w, hh, true));
  const t = S.state.tuning.raceTimeMult;
  const panel = h(
    'div',
    { class: 'panel col center celebrate', 'data-testid': 'race-result' },
    h('div', { class: 'h2' }, names[res.medal]),
    pic,
    h('div', { class: 'h3' }, `${def?.name}: ${formatRaceTime(seconds)}`),
    res.best ? h('div', { class: 'muted' }, 'New best time!') : null,
    def ? h('div', { class: 'muted' }, `Gold ${formatRaceTime(def.medals.gold * t)} · Silver ${formatRaceTime(def.medals.silver * t)} · Bronze ${formatRaceTime(def.medals.bronze * t)}`) : null,
    res.coins ? h('div', { class: 'reward' }, iconEl('coin'), `+${res.coins}`) : null,
    h('div', { class: 'row' },
      button('Race again', 'reset', () => {
        closeTopModal();
        void S.game.go('flight', { from: 'saturn', to: 'saturn', course });
      }, { color: 'white', id: 'btn-race-again' }),
      button('Keep flying', 'rocket', () => closeTopModal(), { color: 'green', id: 'btn-race-ok' }),
    ),
  );
  openModal(panel);
}

function dailyTab(list: HTMLElement, detail: HTMLElement): void {
  const d = S.state.data;
  ensureDailies(d);
  list.append(h('div', { class: 'chapter-head' }, 'Today\'s challenges'));
  for (const p of d.daily.list) {
    const goal = dailyGoal(d, p.id);
    const bar = h('div', { class: 'meter-bar daily-bar' }, h('div', { class: 'meter-fill fuel', style: `width:${Math.round((p.progress / goal) * 100)}%` }));
    list.append(h('div', { class: `mission-row daily ${p.done ? 'done' : ''}`, 'data-testid': `daily-${p.id}` }, iconEl(p.done ? 'check' : 'calendar'), h('div', { class: 'grow' }, h('div', { class: 'mr-title' }, dailyText(d, p.id)), bar), h('span', { class: `chip ${p.done ? 'done' : 'new'}` }, p.done ? 'Done!' : `${Math.floor(p.progress)}/${goal}`)));
  }
  detail.append(
    h('div', { class: 'h2' }, 'Daily Challenges'),
    h('div', { class: 'detail-text' }, 'Three new challenges every day! Each one gives star-coins.'),
    h('div', { class: 'detail-text' }, `Finish all three for ${DAILY_BONUS} bonus coins.`),
    h('div', { class: 'muted' }, `Challenges done so far: ${d.stats.dailiesDone}`),
  );
}

function racesTab(list: HTMLElement, detail: HTMLElement): void {
  const d = S.state.data;
  if (!d.flags.racesOpen) {
    list.append(h('div', { class: 'empty-note' }, 'Races open after you visit Saturn in Chapter 4!'));
    return;
  }
  const t = S.state.tuning.raceTimeMult;
  for (const c of COURSES.filter((x) => !x.practice)) {
    const rec = d.races[c.id];
    const medal = rec?.medal ?? 'none';
    const row = h('div', { class: 'mission-row', 'data-testid': `race-${c.id}` }, iconEl(medal === 'none' ? 'trophy' : 'badge'), h('div', { class: 'grow' }, h('div', { class: 'mr-title' }, c.name), h('div', { class: 'mr-kind' }, rec ? `Best ${formatRaceTime(rec.best)} · ${medal === 'none' ? 'no medal yet' : `${medal} medal`}` : `Gold: ${formatRaceTime(c.medals.gold * t)}`)), button('Race!', 'play', () => void S.game.go('flight', { from: 'saturn', to: 'saturn', course: c.id }), { color: 'green', size: 'small', id: `btn-race-${c.id}` }));
    list.append(row);
  }
  detail.append(
    h('div', { class: 'h2' }, 'Saturn Ring Races'),
    h('div', { class: 'detail-text' }, 'Fly through every ring in order as fast as you can. The clock starts at the first ring!'),
    h('div', { class: 'detail-text' }, 'Win medals for star-coins. A gold medal gives a special sticker!'),
    h('div', { class: 'muted' }, S.state.difficulty === 'easy' ? 'On Easy, medal times are extra generous.' : 'Tip: use Boost on long straight parts.'),
  );
}

/** Connect the Phase 7 systems (codex, badges, dailies, races) to the UI. */
export function installHooks(): void {
  presenterHooks.fact = (id) => factCard(id);
  presenterHooks.badge = (id) => badgePopup(id);
  // Several discoveries at once become one friendly toast.
  let codexBatch: string[] = [];
  let codexTimer: number | null = null;
  presenterHooks.codex = (id) => {
    if (!CODEX_BY_ID[id]) return;
    codexBatch.push(id);
    if (codexTimer !== null) return;
    codexTimer = window.setTimeout(() => {
      const ids = codexBatch;
      codexBatch = [];
      codexTimer = null;
      if (ids.length === 1) toast(`New Codex page: ${CODEX_BY_ID[ids[0]].name}!`, 'book', 2400);
      else toast(`${ids.length} new Codex pages!`, 'book', 2400);
    }, 700);
  };
  presenterHooks.daily = () => {
    toast('Daily challenge done! Star-coins!', 'calendar', 2600);
    sfx('missionDone');
  };
  boardHooks.daily = dailyTab;
  boardHooks.races = racesTab;
  raceHooks.finished = (scene, course, seconds) => {
    if (scene.isRacing()) raceResult(course, seconds);
    else {
      S.state.emit({ type: 'gates', course });
      scene.floatText('All rings done!', '#8cff66');
    }
  };
  hubHooks.dots = () => {
    const d = S.state.data;
    if (seenBadges < 0) seenBadges = d.badges.length;
    if (seenCodex < 0) seenCodex = d.codex.length;
    return { badges: d.badges.length - seenBadges, codex: d.codex.length - seenCodex };
  };
  hubHooks.onEnter = () => {
    ensureDailies(S.state.data);
  };
  crewHooks.fact = () => {
    const known = S.state.data.codex.filter((id) => factsFor(id).length);
    const pool = known.length ? known : ['earth', 'moon', 'sun'];
    const subject = pool[Math.floor(Math.random() * pool.length)];
    const facts = factsFor(subject);
    return facts[Math.floor(Math.random() * facts.length)]?.text ?? null;
  };
  completeHooks.codexPercent = () => codexPercent(S.state.data.codex);
  completeHooks.badges = () => ({ earned: S.state.data.badges.length, total: BADGES.length });
  S.game.onSceneChange.push((name) => {
    if (name === 'badges') seenBadges = S.state.data.badges.length;
    if (name === 'codex') seenCodex = S.state.data.codex.length;
  });
  void CODEX;
}

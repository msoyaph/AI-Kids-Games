import './style.css';
import { audioState, configure, music, sfx, unlock } from './audio';
import { botTurn } from './bot';
import { coach } from './coach';
import { GAME } from './config';
import { CHAR_BY_ID, HOSTS, hostById } from './data/characters';
import { DAYS } from './data/days';
import { FOOD_BY_ID } from './data/menu';
import { UPGRADES, type UpgradeId } from './data/upgrades';
import { renderPortraits } from './render/portraits';
import { View } from './render/view';
import { buy, levelOf, nextCost } from './shop';
import { discard, giveSamples, LIVES, newGame, ringBell, stars, step, STEP, tap, type SimEvent, type State, type Target } from './sim';
import { dayOpen, defaultSave, endlessOpen, load, persistent, recordDay, recordEndless, save, type Save } from './storage';

type Screen = 'title' | 'how' | 'shop' | 'play' | 'paused' | 'results';

/**
 * Capture route: ?scene=title|play|results|cast (and optionally &seed=N&day=N&host=<id>&endless=1)
 * shows a fixed, good-looking moment for the website's previews and screenshots. In capture mode
 * a helper plays the day and nothing is ever saved, so captures never touch a player's progress.
 * ?auto=1 lets the helper play a normal day (also without saving), for trying things out.
 * ?guests=N makes a shorter (or longer) day, for tests and for trying things out.
 * ?quality=low draws without shadows at a lower resolution (the browser tests use it on CI,
 * where WebGL is drawn in software).
 * &clean=1 (with ?scene=title or results) hides the menu card and centers the host, for artwork.
 * ?scene=cast is every host waving in a row, also for artwork.
 */
const params = new URLSearchParams(location.search);
const scene = params.get('scene') as 'title' | 'play' | 'results' | 'cast' | null;
/** The cast picture's line-up, with the first host in the middle. */
const CAST = ['single', 'vanilla', 'minty', 'cookie', 'raspberry', 'double'];
const capture = scene !== null;
const auto = capture || params.has('auto');
const seedFrom = () => Number(params.get('seed')) || (capture ? 7 : Math.floor(Math.random() * 1e6));
const dayParam = Math.min(DAYS.length, Math.max(1, Math.floor(Number(params.get('day'))) || 4)) - 1;
const guestsParam = Math.min(30, Math.max(0, Math.floor(Number(params.get('guests'))) || 0));
const low = params.get('quality') === 'low';
const clean = capture && params.has('clean');

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const screens: Record<Exclude<Screen, 'play'>, HTMLElement> = { title: $('#title'), how: $('#how'), shop: $('#shop'), paused: $('#paused'), results: $('#results') };
const hud = $('#hud'), coachEl = $('#coach'), soundButton = $<HTMLButtonElement>('#sound'), musicButton = $<HTMLButtonElement>('#music');
const COIN = '<i class="coin" aria-hidden="true"></i>';

let data: Save = auto ? defaultSave() : load();
// The helper modes can try any host without touching a save.
if (auto && params.get('host')) data = { ...data, host: hostById(params.get('host') ?? undefined).id };
let state: State = newGame(seedFrom(), 0, { host: data.host });
let screen: Screen = 'title';
let picked = 0;
let overFor = 0;
let earned = 0;
let botRest = 0;
let trayKey = '?';
let coachText = '';
let slots: HTMLButtonElement[] = [];
let shopFrom: Screen = 'title';

/** The game is all 3D. Without WebGL, say so kindly instead of showing a blank page. */
function makeView(): View {
  try {
    return new View($<HTMLCanvasElement>('#game'), $('#overlay'), {
      tap: target => ask(target),
      bell: () => { if (screen === 'play') { unlock(); ringBell(state); } },
      cake: () => shareCake(),
    }, low);
  } catch (error) {
    for (const el of Object.values(screens)) el.hidden = true;
    $('#no-3d').hidden = false;
    throw error;
  }
}
const view = makeView();
const portraits = renderPortraits(HOSTS);
view.setHost(hostById(data.host));

/** The day to offer first: the earliest open day that has no star yet, else the last open one. */
function suggestDay(): number {
  let last = 0;
  for (let i = 0; i < DAYS.length; i++) {
    if (!dayOpen(data, i)) break;
    last = i;
    if ((data.days[i]?.stars ?? 0) === 0) return i;
  }
  return last;
}

/** The newest open day: Endless Rush uses its menu. */
function lastOpenDay(): number {
  let last = 0;
  for (let i = 0; i < DAYS.length && dayOpen(data, i); i++) last = i;
  return last;
}

function renderTitle(): void {
  const hosts = $('#hosts');
  hosts.textContent = '';
  for (const def of HOSTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'host';
    b.style.setProperty('--bg', def.bg);
    b.setAttribute('aria-pressed', String(def.id === data.host));
    b.setAttribute('aria-label', `Play as ${def.name}. ${def.perk ? `${def.perk.name}: ${def.perk.text}` : ''}`);
    b.innerHTML = `<img alt="" src="${portraits[def.id]}">`;
    b.addEventListener('click', () => {
      unlock();
      sfx.tap();
      data = { ...data, host: def.id };
      if (!auto) save(data);
      view.setHost(def);
      show('title');
    });
    hosts.append(b);
  }
  const me = hostById(data.host);
  $('#perk').innerHTML = `<b>${me.name}</b>${me.perk ? ` · ${me.perk.name}: ${me.perk.text}` : ''}`;

  const days = $('#days');
  days.textContent = '';
  DAYS.forEach((day, i) => {
    const open = dayOpen(data, i), got = data.days[i]?.stars ?? 0;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day';
    b.disabled = !open;
    b.setAttribute('aria-pressed', String(i === picked));
    b.setAttribute('aria-label', open ? `Day ${i + 1}, ${day.name}: ${got} of 3 stars` : `Day ${i + 1}: not open yet`);
    b.innerHTML = `${i + 1}<small>${'★'.repeat(got)}<i>${'★'.repeat(3 - got)}</i></small>`;
    b.addEventListener('click', () => { picked = i; unlock(); sfx.tap(); show('title'); });
    days.append(b);
  });
  $('#play').textContent = `Play Day ${picked + 1}`;
  const rush = $<HTMLButtonElement>('#endless');
  rush.disabled = !endlessOpen(data);
  rush.textContent = endlessOpen(data) ? (data.endlessBest ? `Endless Rush · best ${data.endlessBest}` : 'Endless Rush') : 'Endless Rush opens after Day 3';
  $('#shop-button').innerHTML = `Shop · ${COIN}${data.coins}`;
}

function renderShop(): void {
  $('#shop-coins').textContent = String(data.coins);
  const box = $('#upgrades');
  box.textContent = '';
  for (const up of UPGRADES) {
    const level = levelOf(data, up.id), cost = nextCost(data, up.id), max = up.costs.length;
    const row = document.createElement('div');
    row.className = 'upgrade';
    row.innerHTML = `<div><b>${up.name}</b><span class="pips" role="img" aria-label="Level ${level} of ${max}">${'<i class="on"></i>'.repeat(level)}${'<i></i>'.repeat(max - level)}</span><p>${up.text}</p></div>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = cost === null ? 'Got it all' : `${COIN}${cost}`;
    b.disabled = cost === null || data.coins < cost;
    b.setAttribute('aria-label', cost === null ? `${up.name}: all bought` : `Buy ${up.name} for ${cost} coins`);
    b.addEventListener('click', () => purchase(up.id));
    row.append(b);
    box.append(row);
  }
}

function purchase(id: UpgradeId): void {
  unlock();
  const next = buy(data, id);
  if (!next) {
    sfx.nope();
    return;
  }
  data = next;
  if (!auto) save(data);
  sfx.coins(2);
  renderShop();
  // Keep the keyboard where it was: the list was rebuilt.
  ($('#upgrades').querySelector<HTMLButtonElement>('button:not(:disabled)') ?? $('#shop-back')).focus();
}

function show(next: Screen): void {
  const before = screen;
  screen = next;
  for (const [name, el] of Object.entries(screens)) el.hidden = name !== next;
  hud.hidden = next !== 'play' && next !== 'paused';
  coachEl.hidden = next !== 'play' || !coachText;
  soundButton.textContent = `Sound: ${data.sound ? 'on' : 'off'}`;
  soundButton.setAttribute('aria-pressed', String(data.sound));
  musicButton.textContent = `Music: ${data.music ? 'on' : 'off'}`;
  musicButton.setAttribute('aria-pressed', String(data.music));
  $('#storage-note').hidden = auto || persistent();
  if (next === 'title') renderTitle();
  if (next === 'shop') renderShop();
  music(next !== 'paused');
  frameHero();
  if (next === before) return;
  const focus = next === 'title' ? '#play' : next === 'how' ? '#how-back' : next === 'shop' ? '#shop-back' : next === 'paused' ? '#resume' : next === 'results' ? ($('#next').hidden ? '#again' : '#next') : null;
  if (focus) $(focus).focus();
}

/** Tell the view where the host can stand on a menu screen: beside the card, or above it. */
function frameHero(): void {
  const card = (screen === 'results' ? screens.results : screens.title).querySelector<HTMLElement>('.card');
  if (!card || !card.offsetParent) return;
  if (clean) {
    card.style.visibility = 'hidden';
    view.setHeroRect({ x0: 0.2, y0: 0.08, x1: 0.8, y1: 0.96 });
    return;
  }
  const r = card.getBoundingClientRect(), w = innerWidth, h = innerHeight;
  const beside = Math.max(0, r.left) * h >= Math.max(0, r.top) * w;
  view.setHeroRect(beside ? { x0: 0.02, y0: 0.05, x1: Math.max(0.1, r.left / w), y1: 0.97 } : { x0: 0.04, y0: 0.02, x1: 0.96, y1: Math.max(0.1, r.top / h) });
}

function start(day: number, endless = false): void {
  unlock();
  state = newGame(seedFrom(), day, { guests: guestsParam, host: data.host, upgrades: data.upgrades, endless });
  if (!endless) picked = state.dayIndex;
  overFor = 0;
  botRest = 0.6;
  trayKey = '?';
  coachText = '';
  view.setHost(hostById(state.hostId));
  view.reset();
  $('#day-pill').textContent = endless ? 'Endless Rush' : `Day ${state.dayIndex + 1} · ${state.day.name}`;
  $('#total').textContent = String(state.day.guests);
  $('#of').hidden = endless;
  $('#lives').hidden = !endless;
  // One tray space for each thing this host can carry.
  const tray = $('#tray');
  for (const old of slots) old.remove();
  slots = Array.from({ length: state.mods.tray }, (_, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.addEventListener('click', () => { slot.blur(); putBack(i); });
    tray.append(slot);
    return slot;
  });
  show('play');
}

function finish(): void {
  const index = state.dayIndex, next = index + 1;
  const streak = state.bestStreak > 1 ? `Best run: ${state.bestStreak} happy friends in a row.` : '';
  let canNext = false;
  if (state.endless) {
    const record = state.served > data.endlessBest;
    earned = state.served > 0 ? 3 : 0;
    if (!auto) {
      data = recordEndless(data, state.served, state.coins);
      save(data);
    }
    $('#results-title').textContent = record && state.served > 0 ? 'A new best!' : 'What a rush!';
    $('#stars').hidden = true;
    $('#r-main').innerHTML = `Happy friends: <b>${state.served}</b>`;
    $('#r-note').textContent = record ? streak : `Your best is ${data.endlessBest}. ${streak}`;
  } else {
    earned = stars(state);
    const firstPass = earned > 0 && !dayOpen(data, next);
    if (!auto) {
      data = recordDay(data, index, earned, state.coins);
      save(data);
    }
    $('#results-title').textContent = ['Let’s try again!', 'Day done!', 'Great job!', 'Perfect day!'][earned];
    const starBox = $('#stars');
    starBox.hidden = false;
    starBox.innerHTML = [0, 1, 2].map(i => `<span class="${i < earned ? '' : 'off'}">★</span>`).join('');
    starBox.setAttribute('aria-label', `${earned} of 3 stars`);
    $('#r-main').innerHTML = `Happy friends: <b>${state.served}</b> of <b>${state.day.guests}</b>`;
    const fresh = next < DAYS.length ? DAYS[next].menu.filter(f => !state.day.menu.includes(f)) : [];
    $('#r-note').textContent = earned === 0 ? 'Make half of your friends happy to open the next day.'
      : next >= DAYS.length ? 'That was the last day. You run the best counter in town!'
      : firstPass && fresh.length ? `New tomorrow: ${fresh.map(f => FOOD_BY_ID[f].label).join(' and ')}!`
      : earned < 3 ? 'Make every friend happy for three stars.' : streak;
    canNext = next < DAYS.length && (auto ? earned > 0 : dayOpen(data, next));
    picked = canNext ? next : index;
  }
  $('#r-coins').textContent = String(state.coins);
  $('#next').hidden = !canNext;
  $('#next').textContent = `Play Day ${next + 1}`;
  show('results');
  if (earned > 0) {
    view.confetti();
    sfx.win(earned);
  } else sfx.giveup();
}

/** A tap on a station or a friend. */
function ask(target: Target): void {
  if (screen !== 'play') return;
  unlock();
  if (tap(state, target)) sfx.tap();
  else sfx.nope();
}

function putBack(slot: number): void {
  if (screen !== 'play') return;
  unlock();
  discard(state, slot);
}

/** Free cake for everyone waiting (a few rounds a day). */
function shareCake(): void {
  if (screen !== 'play') return;
  unlock();
  if (!giveSamples(state)) sfx.nope();
}

function sound(e: SimEvent): void {
  switch (e.type) {
    case 'arrive': sfx.pop(); break;
    case 'order': sfx.voice(CHAR_BY_ID[state.guests.find(g => g.uid === e.uid)?.char ?? '']?.voice ?? 1); break;
    case 'start': sfx.start(); break;
    case 'ready': sfx.ready(); break;
    case 'collect': sfx.collect(); break;
    case 'deliver': sfx.deliver(); break;
    case 'complete': sfx.happy(); sfx.coins(e.hearts); break;
    case 'giveup': sfx.giveup(); break;
    case 'nomatch': case 'trayfull': sfx.nope(); break;
    case 'bell': sfx.bell(); break;
    case 'samples': sfx.happy(); break;
    case 'discard': sfx.pop(); break;
    default: break;
  }
}

function drain(): void {
  for (const e of state.events) {
    view.handle(e, state);
    sound(e);
  }
  state.events.length = 0;
}

/** Write text only when it changed, so the page is not touched every frame. */
function setText(selector: string, text: string): void {
  const el = $(selector);
  if (el.textContent !== text) el.textContent = text;
}

function updateHud(): void {
  setText('#coins', String(state.coins));
  setText('#happy', String(state.served));
  $('#streak').hidden = state.streak < 2;
  setText('#streak b', String(state.streak));
  if (state.endless) {
    const left = Math.max(0, LIVES - state.missed), lives = $('#lives');
    if (lives.dataset.left !== String(left)) {
      lives.dataset.left = String(left);
      lives.innerHTML = '<i class="life"></i>'.repeat(left) + '<i class="life off"></i>'.repeat(LIVES - left);
      lives.setAttribute('aria-label', `${left} of ${LIVES} chances left`);
    }
  }
  const key = state.host.tray.join(',');
  if (key !== trayKey) {
    trayKey = key;
    slots.forEach((slot, i) => {
      const food = state.host.tray[i];
      slot.innerHTML = food ? `<img alt="" src="${view.icons[food]}">` : '';
      slot.disabled = !food;
      slot.setAttribute('aria-label', food ? `${FOOD_BY_ID[food].label} on the tray. Tap to put it back.` : 'Empty tray space');
    });
  }
  // The helper text shows on the first day, and until the player has finished a couple of days.
  const text = !auto && (data.plays < 2 || (state.dayIndex === 0 && !state.endless)) ? coach(state) : '';
  if (text !== coachText) {
    coachText = text;
    coachEl.textContent = text;
    coachEl.hidden = !text;
  }
}

const pause = () => { if (screen === 'play' && !state.over) show('paused'); };
const resume = () => { unlock(); if (screen === 'paused') show('play'); };

function helper(): void {
  botRest -= STEP;
  if (botRest <= 0 && botTurn(state)) botRest = 0.5;
}

let last = performance.now(), acc = 0;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (screen === 'play') {
    for (acc += dt; acc >= STEP; acc -= STEP) {
      if (auto) helper();
      step(state);
    }
    drain();
    updateHud();
    view.sync(state, dt);
    if (state.over) {
      overFor += dt;
      if (overFor > 1.7) {
        if (scene === 'play') start(state.dayIndex, state.endless);
        else finish();
      }
    }
  } else {
    acc = 0;
    if (screen === 'paused') view.sync(state, 0);
    else if (scene === 'cast') view.cast(dt, CAST.map(id => hostById(id)), DAYS[DAYS.length - 1].menu);
    else if (screen === 'results') view.hero(dt, earned > 0 ? 'cheer' : 'sad', earned > 0 ? 'happy' : 'sad', state.day.menu);
    else view.hero(dt, 'wave', 'neutral', DAYS[picked].menu);
  }
  requestAnimationFrame(frame);
}

// Buttons, keys, and pausing whenever the game loses focus (another tab, or a tap outside the
// iframe on the website).
$('#play').addEventListener('click', () => start(picked));
$('#endless').addEventListener('click', () => start(lastOpenDay(), true));
$('#next').addEventListener('click', () => start(picked));
$('#again').addEventListener('click', () => start(state.dayIndex, state.endless));
$('#menu').addEventListener('click', () => show('title'));
$('#quit').addEventListener('click', () => { if (!state.endless) picked = state.dayIndex; show('title'); });
$('#resume').addEventListener('click', resume);
$('#pause-button').addEventListener('click', pause);
$('#how-button').addEventListener('click', () => show('how'));
$('#how-back').addEventListener('click', () => show('title'));
for (const id of ['#shop-button', '#shop-results']) $(id).addEventListener('click', () => { unlock(); shopFrom = screen; show('shop'); });
$('#shop-back').addEventListener('click', () => show(shopFrom === 'results' ? 'results' : 'title'));
function toggle(key: 'sound' | 'music'): void {
  data = { ...data, [key]: !data[key] };
  if (!auto) save(data);
  unlock();
  configure(data.sound, data.music);
  show(screen);
}
soundButton.addEventListener('click', () => toggle('sound'));
musicButton.addEventListener('click', () => toggle('music'));

addEventListener('keydown', event => {
  unlock();
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (screen === 'play') pause();
    else if (screen === 'paused') resume();
    else if (screen === 'how') show('title');
    else if (screen === 'shop') show(shopFrom === 'results' ? 'results' : 'title');
    return;
  }
  if (screen !== 'play' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const digit = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
  const spot = ['KeyQ', 'KeyW', 'KeyE'].indexOf(event.code);
  if (digit) ask({ kind: 'station', index: Number(digit[1]) - 1 });
  else if (spot >= 0) ask({ kind: 'guest', spot });
  else if (event.code === 'KeyB') ringBell(state);
  else if (event.code === 'KeyC') shareCake();
  else if (event.code === 'Backspace' && state.host.tray.length) putBack(state.host.tray.length - 1);
  else return;
  event.preventDefault();
  document.body.classList.add('keys');
});
addEventListener('pointerdown', unlock);
if (!capture) {
  addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
}
addEventListener('resize', () => { view.resize(); frameHero(); });

// The read-only test hook: tests and the website's preview capture read the game through it.
// snapshot() returns a copy, so nothing outside can change the game or its saves.
Object.defineProperty(window, GAME.hook, {
  value: Object.freeze({
    title: GAME.title,
    snapshot: () => structuredClone({
      screen, day: state.dayIndex + 1, endless: state.endless, time: state.time, coins: state.coins, served: state.served, missed: state.missed, over: state.over,
      stars: stars(state), toSpawn: state.toSpawn, lives: LIVES - state.missed, streak: state.streak, samples: state.samples,
      playingAs: state.hostId, chosenHost: data.host, trayMax: state.mods.tray, mods: state.mods, host: state.host, stations: state.stations,
      guests: state.guests.map(g => ({ uid: g.uid, char: g.char, spot: g.spot, phase: g.phase, order: g.order, patience: g.patience / g.patienceMax })),
      persistent: persistent(), audio: audioState(), unlockedDays: DAYS.filter((_, i) => dayOpen(data, i)).length,
      savedCoins: data.coins, upgrades: data.upgrades, endlessBest: data.endlessBest,
    }),
  }),
});

configure(data.sound, data.music);
picked = suggestDay();
const rush = params.has('endless');
if (scene === 'play') {
  start(dayParam, rush);
  for (let i = 0; i < 26 / STEP && !state.over; i++) {
    helper();
    step(state);
    state.events.length = 0;
  }
} else if (scene === 'results') {
  state = newGame(seedFrom(), dayParam, { guests: guestsParam, host: data.host, endless: rush });
  for (let i = 0; i < 900 / STEP && !state.over; i++) {
    helper();
    step(state);
    state.events.length = 0;
  }
  finish();
} else {
  show('title');
  if (scene === 'cast') screens.title.style.visibility = 'hidden';
}
requestAnimationFrame(frame);

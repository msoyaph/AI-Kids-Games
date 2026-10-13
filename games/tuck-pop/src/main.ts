/**
 * Tuck Pop: boot, screens, the HUD, saving, and the loop. The rules live in src/sim (pure), the
 * canvas in src/render, playing input in play.ts.
 */
import './style.css';
import { GAME } from './config';
import { theme as themeById } from './data/themes';
import { pollPad, type PadButton } from './input/gamepad';
import { Play } from './play';
import { layout as computeLayout, type Insets, type Layout, type Rect } from './render/layout';
import { Scene, type View } from './render/scene';
import { finishTweens, setTweenSpeed, tweensRunning, updateTweens } from './render/tween';
import { audioState, configure, music, play as sfx, setHidden, unlock } from './audio/sound';
import { defaults, load as loadProfile, save as saveProfile, type Profile } from './save/profile';
import { dropRun, loadRun, saveRun } from './save/run';
import { persistent, writeFailed } from './save/storage';
import { addSingle, canMove, newGame, rescues, shuffle, undo, type Difficulty, type Game, type Move } from './sim/game';
import { DAILY_MOVES, dailyGame, dailySeed, dayNumber } from './sim/daily';
import { multText } from './sim/scoring';
import { TUNING } from './tuning';
import { autoMove, captureScene, captureSpeed, sceneGame } from './capture';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const params = new URLSearchParams(location.search);
const capture = params.has('scene');

// ---- profile and settings ----
// The capture route never reads or writes saves: it plays with fresh defaults.
const loaded = capture ? { profile: defaults(), readOnly: true } : loadProfile();
let profile: Profile = loaded.profile;
const readOnly = loaded.readOnly;
const persist = () => { if (capture) return; if (!saveProfile(profile, readOnly) && !readOnly) storageTrouble(); };

const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => profile.settings.motion === 'less' || (profile.settings.motion === 'auto' && systemReduced.matches);

// ---- the canvas ----
const canvasEl = $<HTMLCanvasElement>('#stage');
const scene = new Scene();
let lay: Layout;
let game: Game = newGame({ mode: 'classic', difficulty: profile.settings.difficulty, seed: 1 });

function insets(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const v = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  probe.remove();
  return v;
}
const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const view = (): View => ({ theme: themeById(profile.settings.theme), look: { contrast: profile.settings.contrast }, symbols: profile.settings.symbols, item: 'gem' });

// ---- screens ----
type ScreenId = 'home' | 'play' | 'pause' | 'over' | 'offer' | 'settings' | 'help';
const overlays: ScreenId[] = ['home', 'pause', 'over', 'offer', 'settings', 'help'];
let screen: ScreenId = 'home';
let settingsBack: ScreenId = 'home';
function show(next: ScreenId) {
  screen = next;
  for (const id of overlays) $(`#${id}`).hidden = id !== next;
  // Focus left on a button that just got hidden would turn the next Enter into a click on it.
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest('.screen[hidden]')) active.blur();
  // the game stays visible under pause, offer, over and settings-from-pause
  const overGame = !(next === 'home' || next === 'help' || (next === 'settings' && settingsBack === 'home'));
  $('#hud').hidden = !overGame;
  scene.showWorld(overGame);
  const focus: Partial<Record<ScreenId, string>> = { home: '#classic', pause: '#resume', over: '#again', offer: '#offer-no', settings: '#settings-done', help: '#help-done' };
  if (focus[next] && !capture) requestAnimationFrame(() => $(focus[next]!).focus({ preventScroll: true }));
  if (next === 'home') { refreshHome(); syncMusic(); }
  scene.dirty = true;
}

// ---- HUD ----
const place = (el: HTMLElement, r: Rect) => { el.style.left = `${r.x}px`; el.style.top = `${r.y}px`; el.style.width = `${r.w}px`; el.style.height = `${r.h}px`; };
function positionHud() {
  document.body.classList.toggle('landscape', !lay.portrait);
  const panel = { ...lay.hud, w: lay.portrait ? lay.hud.w - lay.pause.w - 12 : lay.hud.w };
  place($('#score-panel'), panel);
  place($('#pause-btn'), lay.pause);
  place($('#helpers'), lay.helpers);
  document.querySelectorAll<HTMLButtonElement>('.slot-btn').forEach(b => {
    const k = Number(b.dataset.slot);
    place(b, k === 3 ? scene.bonusRect() : lay.slots[k]!);
  });
}

let shownScore = 0;
function updateHud(instant = false) {
  const best = bestFor(game);
  if (instant) shownScore = game.score;
  $('#best-label').textContent = game.mode === 'daily' ? "Today's best" : 'Best';
  $('#moves-left').hidden = !game.movesLimit;
  if (game.movesLimit) $('#moves').textContent = String(Math.max(0, game.movesLimit - game.moves));
  $('#score').textContent = String(shownScore);
  $('#best').textContent = String(Math.max(best, game.score));
  const h = profile.helpers;
  const free = game.mode === 'relax' && game.freeUndo > 0;
  $('#undo-count').textContent = free ? 'free' : String(h.undo);
  $('#undo').classList.toggle('free', free);
  $('#shuffle-count').textContent = String(h.shuffle);
  $('#single-count').textContent = String(h.single);
  $<HTMLButtonElement>('#undo').disabled = !game.undo || game.over || (!free && h.undo <= 0);
  $<HTMLButtonElement>('#shuffle').disabled = game.over || h.shuffle <= 0;
  $<HTMLButtonElement>('#single').disabled = game.over || h.single <= 0 || !!game.bonus;
  $('#undo').setAttribute('aria-label', `Undo, ${free ? 'free this game' : `${h.undo} left`}`);
  $('#shuffle').setAttribute('aria-label', `Shuffle the pieces, ${h.shuffle} left`);
  $('#single').setAttribute('aria-label', `Single block, ${h.single} left`);
  document.querySelectorAll<HTMLButtonElement>('.slot-btn').forEach(b => {
    const k = Number(b.dataset.slot), s = k === 3 ? game.bonus : game.tray[k];
    b.hidden = !s; b.setAttribute('aria-label', s ? `Piece ${k + 1}: ${describePiece(s.piece.id, s.piece.size)}${playCtl.selected === k ? ', picked' : ''}` : '');
    b.setAttribute('aria-pressed', String(playCtl.selected === k));
  });
}
function describePiece(id: string, size: number) {
  const names: Record<string, string> = { dot: 'one block', i2: 'a line of 2', i3: 'a line of 3', i4: 'a line of 4', i5: 'a line of 5', c3: 'a small corner', c5: 'a big corner', o2: 'a 2 by 2 square', o3: 'a 3 by 3 square', l4: 'an L shape', t4: 'a T shape', s4: 'a zigzag', r6: 'a 2 by 3 block' };
  const fam = id.replace(/[a-d]$/, '').replace(/^j4$/, 'l4').replace(/^r(23|32)$/, 'r6').replace(/^(i[2-5])[hv]$/, '$1');
  const dir = /^i[2-5]h$/.test(id) || id === 'r23' ? ', lying down' : /^i[2-5]v$/.test(id) || id === 'r32' ? ', standing up' : '';
  return `${names[fam] ?? `${size} blocks`}${dir}`;
}
function bestFor(g: Game) {
  if (g.mode === 'daily') return profile.daily.find(([d]) => dailySeed(d) === g.seed)?.[1] ?? 0;
  return g.mode === 'relax' ? profile.best.relax : g.difficulty === 'normal' ? profile.best.normal : profile.best.easy;
}
/** Today as yyyymmdd, in the player's own time zone. */
function today() { const d = new Date(); return dayNumber(d.getFullYear(), d.getMonth() + 1, d.getDate()); }

// ---- messages ----
let toastTimer = 0;
function toast(text: string) { const t = $('#toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => (t.hidden = true), 3200); }
function say(text: string) { $('#live').textContent = text; }
let storageWarned = false;
function storageTrouble() { if (storageWarned || !writeFailed()) return; storageWarned = true; toast('Your device is out of space, so progress is kept only until you close the game.'); }

// ---- playing ----
const playCtl = new Play(scene, {
  picked: () => { sfx('pick'); buzz(8); },
  moved: onMove,
  ended: onEnded,
  invalid: () => { sfx('no'); buzz(20); },
  changed: () => updateHud(),
});

function onMove(m: Move) {
  const l = lay;
  sfx('place'); buzz(10);
  if (m.points.lines) {
    sfx('clear', Math.min(12, (m.points.streak - 1) * 2), m.points.lines); buzz(25);
    scene.fx.kick(Math.min(1, 0.25 + m.points.lines * 0.12));
    scene.fx.flash(performance.now(), m.boardClear ? 0.5 : 0.25 + m.points.lines * 0.05);
    const size = Math.max(28, l.cell * (0.9 + Math.min(0.6, (m.points.streak - 1) * 0.1) + (m.points.lines - 1) * 0.08));
    const word = `${m.points.word}\n+${m.points.total}`;
    const colors: Record<string, string> = { 'Nice!': '#ff8a3d', 'Super!': '#ff5c8a', 'Amazing!': '#8f6bff', 'Wow!': '#24b47e', 'Board clear!': '#ff4fa3' };
    scene.fx.word(word, l.board.x + l.board.w / 2, l.board.y + l.board.h * 0.4, m.boardClear ? size * 1.15 : size, colors[m.points.word] ?? '#ff8a3d', 1, m.boardClear ? 1.5 : 1.1, l.board.w * 0.96);
    if (m.points.streak >= 2) scene.fx.word(`Streak ${multText(m.points.multHalves)}`, l.board.x + l.board.w / 2, l.board.y + l.board.h * 0.4 + size * 1.45, Math.max(22, size * 0.55), '#ffb52e', 1, 1.2, l.board.w * 0.9);
    say(`${m.points.word} ${m.points.lines} ${m.points.lines === 1 ? 'line' : 'lines'}, plus ${m.points.total} points.${m.points.streak >= 2 ? ` Streak ${m.points.streak}.` : ''}`);
  }
  if (m.boardClear) { sfx('boardClear'); scene.fx.confetti(l.w, l.cell, 70); scene.fx.rings(l.board.x + l.board.w / 2, l.board.y + l.board.h / 2, l.board.w); }
  if (m.reshuffled) toast('Nothing fit, so here are new pieces!');
  // passing your best during a game: a cheer, once
  const best = bestFor(game);
  if (!passedBest && best > 0 && game.score > best) {
    passedBest = true;
    scene.fx.word('New best!', l.board.x + l.board.w / 2, l.board.y + l.board.h * 0.18, Math.max(26, l.cell * 0.8), '#ffb52e', 1, 1.4, l.board.w * 0.9);
    scene.fx.confetti(l.w, l.cell, 40); sfx('best'); say('You beat your best score!');
  }
  profile.stats.lines += m.points.lines; profile.stats.placed += m.piece.size; if (m.boardClear) profile.stats.clears++;
  profile.stats.bestStreak = Math.max(profile.stats.bestStreak, game.bestStreak);
  earnFromPoints(m.points.total);
  if (!capture) { if (!saveRun(game)) storageTrouble(); persist(); }
  updateHud();
}

/** Classic and Relax earn a helper every 2,500 points (whichever helper the player has fewest of). */
function earnFromPoints(points: number) {
  if (game.mode !== 'classic' && game.mode !== 'relax') return;
  const h = profile.helpers, every = TUNING.helpers.classicPointsPerHelper;
  h.progress += points;
  while (h.progress >= every) { h.progress -= every; const text = earnHelper(); if (text) toast(text); }
}

function onEnded() {
  if (!game.over) return;
  if ((game.mode === 'classic' || game.mode === 'relax') && game.end === 'stuck' && game.continues < TUNING.helpers.continues) {
    const r = rescues(game), h = profile.helpers;
    const can = { undo: r.undo && h.undo > 0, shuffle: r.shuffle && h.shuffle > 0, single: r.single && h.single > 0 };
    if (can.undo || can.shuffle || can.single) {
      $('#offer-undo').hidden = !can.undo; $('#offer-shuffle').hidden = !can.shuffle; $('#offer-single').hidden = !can.single;
      $('#offer-undo').textContent = `Undo (${h.undo} left)`; $('#offer-shuffle').textContent = `Shuffle (${h.shuffle} left)`; $('#offer-single').textContent = `Single block (${h.single} left)`;
      show('offer'); say('No room for these pieces. Use a helper to keep going?');
      return;
    }
  }
  finishGame();
}

function finishGame() {
  let prev: number, isBest: boolean;
  let earned = '';
  if (game.mode === 'daily') {
    const day = today(), entry = profile.daily.find(([d]) => dailySeed(d) === game.seed);
    prev = entry?.[1] ?? 0;
    isBest = game.score > prev;
    const first = !entry;
    if (entry) entry[1] = Math.max(entry[1], game.score); else profile.daily.push([dailySeed(day) === game.seed ? day : dayFromSeed(game.seed), game.score]);
    profile.daily = profile.daily.slice(-30);
    profile.stats.dailies++;
    if (first) earned = earnHelper();
  } else {
    const key = game.mode === 'relax' ? 'relax' : game.difficulty;
    prev = profile.best[key as keyof Profile['best']];
    isBest = game.score > prev && game.score > 0;
    if (isBest) profile.best[key as keyof Profile['best']] = game.score;
  }
  profile.stats.games++;
  persist(); if (!capture) dropRun(game.mode as 'classic' | 'relax' | 'daily');
  const titles: Record<string, string> = { daily: 'Daily puzzle done!', relax: 'What a cozy game!', classic: 'Great game!' };
  $('#over-title').textContent = isBest && game.mode !== 'daily' ? 'A new best!' : game.mode === 'classic' && game.score >= prev * 0.8 && prev > 0 ? 'So close to your best!' : titles[game.mode] ?? 'Great game!';
  $('#new-best').hidden = !isBest;
  $('#final').textContent = String(game.score);
  $('#final-best-label').textContent = game.mode === 'daily' ? "Today's best" : 'Your best';
  $('#final-best').textContent = String(Math.max(prev, game.score));
  $('#stat').textContent = game.mode === 'daily' && game.end === 'moves' ? `You used all ${DAILY_MOVES} moves and cleared ${game.lines} ${game.lines === 1 ? 'line' : 'lines'}. A new puzzle comes tomorrow!` : statLine(game);
  $('#earned').hidden = !earned; $('#earned').textContent = earned;
  $('#again').textContent = game.mode === 'daily' ? 'Try today\'s puzzle again' : 'Play again';
  show('over');
  if (isBest) { sfx('best'); scene.fx.confetti(lay.w, lay.cell, 110); } else sfx('over');
  say(`${$('#over-title').textContent} Score ${game.score}. ${$('#stat').textContent} ${earned}`);
}

/** The Daily seed's date, for a run finished after midnight (looked up in the last two days). */
function dayFromSeed(seed: number) {
  const d = new Date();
  for (let i = 0; i < 3; i++) { const n = dayNumber(d.getFullYear(), d.getMonth() + 1, d.getDate()); if (dailySeed(n) === seed) return n; d.setDate(d.getDate() - 1); }
  return today();
}

/** One helper, whichever the player has fewest of (up to the cap). Returns the message, or ''. */
function earnHelper(): string {
  const h = profile.helpers, order = ['undo', 'shuffle', 'single'] as const;
  const pick = order.find(k => h[k] === Math.min(h.undo, h.shuffle, h.single)) ?? 'undo';
  if (h[pick] >= TUNING.helpers.cap) return '';
  h[pick]++; sfx('helper');
  return `You earned a helper: ${pick === 'single' ? 'Single block' : pick === 'undo' ? 'Undo' : 'Shuffle'}!`;
}

function statLine(g: Game) {
  const options = [
    g.lines > 0 ? `You cleared ${g.lines} ${g.lines === 1 ? 'line' : 'lines'}!` : '',
    g.bestStreak >= 3 ? `Your longest streak was ${g.bestStreak} clears in a row!` : '',
    g.boardClears > 0 ? `You cleared the whole board ${g.boardClears === 1 ? 'once' : `${g.boardClears} times`}!` : '',
    `You placed ${g.placed} blocks!`,
  ].filter(Boolean);
  return options[g.seed % options.length]!;
}

function useHelper(kind: 'undo' | 'shuffle' | 'single', fromOffer = false) {
  const h = profile.helpers;
  const free = kind === 'undo' && game.mode === 'relax' && game.freeUndo > 0;
  if (!free && h[kind] <= 0) return;
  const ok = kind === 'undo' ? undo(game) : kind === 'shuffle' ? shuffle(game) : addSingle(game);
  if (!ok) { sfx('no'); return; }
  if (free) game.freeUndo--; else h[kind]--;
  if (fromOffer) game.continues++;
  sfx('helper'); buzz(15);
  playCtl.start(game);
  if (!canMove(game) && !game.over) { /* a helper that didn't help: the offer appears again */ }
  if (!capture) { saveRun(game); persist(); }
  updateHud(true);
  show('play');
}

// ---- starting ----
function syncMusic() { music({ theme: profile.settings.theme, calm: game.mode === 'relax' && screen !== 'home' }); }

let passedBest = false;
function startGame(g: Game) {
  game = g;
  passedBest = false;
  setTweenSpeed(g.mode === 'relax' ? 1.4 : 1);
  syncMusic();
  scene.fx.clear(); finishTweens();
  playCtl.reduced = reduced();
  playCtl.start(g);
  updateHud(true);
  show('play');
  if (!capture) saveRun(g);
}
/** A fresh game of the same kind (the Daily replays today's puzzle). */
function again(): Game { return game.mode === 'daily' ? dailyGame(today()) : newGame({ mode: game.mode, difficulty: game.difficulty, seed: freshSeed() }); }
function newClassic(difficulty: Difficulty) { unlock(); startGame(newGame({ mode: 'classic', difficulty, seed: freshSeed() })); }
function freshSeed() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]!; }

function refreshHome() {
  const run = capture ? null : loadRun('classic');
  $('#continue').hidden = !run || run.moves === 0;
  $('#classic').classList.toggle('primary', !run || run.moves === 0);
  if (run) $('#continue-info').textContent = `Classic ${run.difficulty === 'normal' ? 'Normal' : 'Easy'} · score ${run.score}`;
  const d = profile.settings.difficulty;
  const best = d === 'normal' ? profile.best.normal : profile.best.easy;
  $('#classic-best').textContent = best ? `Best ${best} on ${d === 'normal' ? 'Normal' : 'Easy'}` : d === 'normal' ? 'Bigger pieces as you score' : 'Fill lines, pop blocks';
  document.querySelectorAll<HTMLButtonElement>('.segmented button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.difficulty === d)));
  const relax = capture ? null : loadRun('relax');
  $('#relax-info').textContent = relax && relax.moves > 0 ? `Pick up where you left off · score ${relax.score}` : profile.best.relax ? `Calm and cozy · best ${profile.best.relax}` : 'Calm and cozy, no rush';
  const t = today(), done = profile.daily.find(([d]) => d === t);
  $('#daily-info').textContent = done ? `Today's best ${done[1]} · play again any time` : 'A new puzzle every day';
  $('#storage-note').hidden = capture || persistent();
}

// ---- settings ----
function applySettings() {
  const s = profile.settings, t = themeById(s.theme);
  const root = document.documentElement.style;
  root.setProperty('--ink', t.ink); root.setProperty('--panel', t.panel); root.setProperty('--accent', t.accent);
  root.setProperty('--t', String([1, 1.2, 1.4][s.text]));
  document.body.style.background = t.bg[0];
  document.body.classList.toggle('hc', s.contrast);
  configure({ sound: s.sound, music: s.music, volume: s.volume });
  if (screen) syncMusic();
  if (scene.fx) { scene.fx.reduced = reduced(); scene.fx.shakeOn = s.shake; scene.reducedDeco = reduced(); }
  playCtl.reduced = reduced();
}
function bindSettings() {
  const s = profile.settings;
  const box = (id: string, key: 'sound' | 'music' | 'haptics' | 'shake' | 'symbols' | 'contrast' | 'readAloud') => {
    const el = $<HTMLInputElement>(id); el.checked = s[key];
    el.onchange = () => { s[key] = el.checked; afterSetting(key === 'symbols' || key === 'contrast'); };
  };
  box('#set-sound', 'sound'); box('#set-music', 'music'); box('#set-haptics', 'haptics'); box('#set-shake', 'shake'); box('#set-symbols', 'symbols'); box('#set-contrast', 'contrast'); box('#set-read', 'readAloud');
  const vol = $<HTMLInputElement>('#set-volume'); vol.value = String(Math.round(s.volume * 100)); vol.oninput = () => { s.volume = Number(vol.value) / 100; afterSetting(false); };
  const motion = $<HTMLSelectElement>('#set-motion'); motion.value = s.motion; motion.onchange = () => { s.motion = motion.value as typeof s.motion; afterSetting(false); };
  const text = $<HTMLSelectElement>('#set-text'); text.value = String(s.text); text.onchange = () => { s.text = Number(text.value) as 0 | 1 | 2; afterSetting(false); };
}
function afterSetting(redraw: boolean) {
  applySettings(); persist();
  if (redraw) { scene.setView(view()); scene.syncBoard(game); scene.syncTray(game); }
  updateHud();
}

// ---- haptics ----
let lastBuzz = 0;
function buzz(ms: number) {
  if (!profile.settings.haptics || capture) return;
  const now = performance.now();
  if (now - lastBuzz < 70) return;
  lastBuzz = now;
  try { if (typeof navigator.vibrate === 'function' && (navigator.userActivation?.hasBeenActive ?? true)) navigator.vibrate(ms); } catch { /* blocked in a sandboxed iframe */ }
}

// ---- input ----
function pointerPos(e: PointerEvent) { const r = canvasEl.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function bindInput() {
  addEventListener('pointerdown', () => { unlock(); syncMusic(); }, { capture: true });
  canvasEl.addEventListener('pointerdown', e => {
    unlock();
    if (screen !== 'play') return;
    try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
    const p = pointerPos(e); playCtl.down(p.x, p.y, e.pointerId, e.pointerType !== 'mouse');
  });
  canvasEl.addEventListener('pointermove', e => { if (screen !== 'play') return; const p = pointerPos(e); playCtl.move(p.x, p.y, e.pointerId, e.buttons !== 0); });
  canvasEl.addEventListener('pointerup', e => { if (screen === 'play') playCtl.up(e.pointerId); });
  canvasEl.addEventListener('pointercancel', e => playCtl.cancel(e.pointerId));
  canvasEl.addEventListener('lostpointercapture', e => playCtl.cancel(e.pointerId));
  // no zoom, double-tap zoom or page scrolling during play (iOS Safari)
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.target === canvasEl || e.touches.length > 1) e.preventDefault(); }, { passive: false });

  addEventListener('keydown', e => {
    unlock(); syncMusic();
    if (screen === 'play') {
      if (e.code === 'KeyU' || (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); useHelper('undo'); return; }
      const target = e.target as HTMLElement;
      // keys on a focused button (Tab between buttons, Enter to press) stay the browser's, except the board keys
      if (e.code === 'Tab' && target.closest('#helpers, #pause-btn')) return;
      if ((e.code === 'Enter' || e.code === 'Space') && target.tagName === 'BUTTON' && !target.classList.contains('slot-btn')) return;
      if (playCtl.key(e.code)) { e.preventDefault(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pause(); }
    } else if (e.code === 'Escape') back();
  });
  document.querySelectorAll<HTMLButtonElement>('.slot-btn').forEach(b => b.addEventListener('click', () => { playCtl.key(`Digit${Number(b.dataset.slot) + 1}`); }));
}

function pause() { if (screen === 'play') { show('pause'); sfx('tap'); } }
function back() {
  if (screen === 'pause') show('play');
  else if (screen === 'settings') show(settingsBack);
  else if (screen === 'help') show('home');
  else if (screen === 'offer') declineOffer();
}
function declineOffer() { finishGame(); }

function bindButtons() {
  const on = (id: string, fn: () => void) => $(id).addEventListener('click', () => { unlock(); sfx('tap'); fn(); });
  on('#classic', () => newClassic(profile.settings.difficulty));
  on('#continue', () => { const run = loadRun('classic'); if (run) { unlock(); startGame(run); } });
  on('#relax', () => { const run = loadRun('relax'); startGame(run && run.moves > 0 ? run : newGame({ mode: 'relax', seed: freshSeed() })); });
  on('#daily', () => { const run = loadRun('daily'); startGame(run && run.seed === dailySeed(today()) && run.moves > 0 ? run : dailyGame(today())); });
  document.querySelectorAll<HTMLButtonElement>('.segmented button').forEach(b => b.addEventListener('click', () => { profile.settings.difficulty = b.dataset.difficulty as Difficulty; persist(); refreshHome(); }));
  on('#pause-btn', pause);
  on('#resume', () => show('play'));
  on('#restart', () => { dropRun(game.mode as 'classic' | 'relax' | 'daily'); startGame(again()); });
  on('#quit', () => show('home'));
  on('#pause-settings', () => { settingsBack = 'pause'; show('settings'); });
  on('#settings-btn', () => { settingsBack = 'home'; show('settings'); });
  on('#settings-done', () => show(settingsBack));
  on('#help-btn', () => show('help'));
  on('#help-done', () => show('home'));
  on('#again', () => startGame(again()));
  on('#over-home', () => show('home'));
  on('#offer-undo', () => useHelper('undo', true));
  on('#offer-shuffle', () => useHelper('shuffle', true));
  on('#offer-single', () => useHelper('single', true));
  on('#offer-no', declineOffer);
  on('#undo', () => useHelper('undo'));
  on('#shuffle', () => useHelper('shuffle'));
  on('#single', () => useHelper('single'));
}

// gamepad in menus: the d-pad moves focus through the visible buttons, A presses, B goes back
function menuPad(buttons: PadButton[]) {
  for (const b of buttons) {
    if (b === 'b') { back(); continue; }
    const host = screen === 'play' ? $('#hud') : $(`#${screen}`);
    const items = [...host.querySelectorAll<HTMLElement>('button:not([hidden]):not([disabled]), input, select')].filter(el => el.offsetParent !== null && !el.classList.contains('slot-btn'));
    if (!items.length) continue;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (b === 'down' || b === 'right') items[(i + 1) % items.length]!.focus();
    else if (b === 'up' || b === 'left') items[(i - 1 + items.length) % items.length]!.focus();
    else if (b === 'a') (document.activeElement as HTMLElement | null)?.click();
  }
}

// ---- loop ----
const pad: PadButton[] = [];
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const presses = pollPad(dt, pad);
  if (presses.length) {
    unlock();
    if (screen === 'play') {
      const rest = playCtl.pad(presses);
      for (const b of rest) { if (b === 'start') pause(); else if (b === 'x') useHelper('undo'); }
    } else if (presses.includes('start') && screen === 'pause') show('play');
    else menuPad(presses);
  }
  if (capture && screen === 'play') autoplay(dt);
  const animating = updateTweens(dt);
  if (shownScore !== game.score) { shownScore += Math.max(1, Math.ceil((game.score - shownScore) * Math.min(1, dt * 12))); if (shownScore > game.score) shownScore = game.score; $('#score').textContent = String(shownScore); }
  scene.frame(dt, animating);
  requestAnimationFrame(frame);
}

function resize() {
  lay = computeLayout(innerWidth, innerHeight, insets());
  scene.resize(lay, dpr());
  scene.syncBoard(game); scene.syncTray(game); scene.streak(game.streak, game.dry); scene.selectSlot(playCtl.selected);
  positionHud();
}

// ---- capture mode: the game plays itself ----
let autoWait = 0.8;
function autoplay(dt: number) {
  autoWait -= dt * captureSpeed;
  if (autoWait > 0 || playCtl.locked || tweensRunning() > 0 && !game.over) return;
  if (game.over) { autoWait = 1.4; startGame(sceneGame(captureScene!, game.seed + 1)); return; }
  const c = autoMove(game);
  if (!c) return;
  autoWait = 0.55;
  playCtl.glide(c.slot, c.pos, 0.62 / captureSpeed);
}

// ---- the read-only test hook ----
function hook() {
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => structuredClone({
        screen, mode: game.mode, difficulty: game.difficulty, score: game.score, best: bestFor(game), over: game.over, end: game.end,
        board: Array.from(game.colors), tray: game.tray.map(t => (t ? { id: t.piece.id, color: t.color } : null)), bonus: game.bonus?.piece.id ?? null,
        streak: game.streak, moves: game.moves, lines: game.lines, trayNo: game.trayNo, seed: game.seed,
        helpers: { ...profile.helpers }, settings: { ...profile.settings }, play: playCtl.describe(),
        layout: { board: lay.board, slots: lay.slots, cell: lay.cell, portrait: lay.portrait, lift: lay.lift, bonus: scene.bonusRect() },
        canMove: canMove(game), particles: scene.fx.alive(), tweens: tweensRunning(), audio: audioState(), persistent: persistent(), readOnly,
      }),
    }),
  });
}

// ---- boot ----
async function boot() {
  lay = computeLayout(innerWidth, innerHeight, insets());
  try { await scene.init(canvasEl, lay, view(), dpr()); } catch (err) { console.warn('WebGL unavailable', err); $('#nogl').hidden = false; return; }
  applySettings(); bindSettings(); bindButtons(); bindInput(); positionHud();
  addEventListener('resize', () => requestAnimationFrame(resize));
  visualViewport?.addEventListener('resize', () => requestAnimationFrame(resize));
  document.addEventListener('visibilitychange', () => setHidden(document.hidden));
  systemReduced.addEventListener?.('change', () => applySettings());
  hook();
  scene.syncBoard(game); scene.syncTray(game);
  if (captureScene) {
    startGame(sceneGame(captureScene));
    $('#hud').hidden = !new URLSearchParams(location.search).has('hud');
  } else show('home');
  requestAnimationFrame(frame);
}
void boot();

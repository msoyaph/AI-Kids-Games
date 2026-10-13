import './style.css';
import { GAME } from './config';
import { newGame, step, STEP, timeLeft, WORLD, type State, type Vec } from './sim';
import { draw, resize } from './render';
import { direction, listen, padConfirm } from './input';
import { load, persistent, save, type Save } from './storage';
import { audioState, puff, ting, unlock } from './audio';

type Screen = 'title' | 'play' | 'paused' | 'results';

/**
 * Capture route: ?scene=title|play|results (and optionally &seed=N) shows a fixed, good-looking
 * moment for the website's previews and screenshots. In capture mode the comet flies itself
 * and nothing is ever saved, so captures never touch a player's progress.
 */
const params = new URLSearchParams(location.search);
const scene = params.get('scene') as Screen | null;
const capture = scene !== null;
const seedFrom = () => Number(params.get('seed')) || (capture ? 7 : Math.floor(Math.random() * 1e6));
/** ?seconds=N makes a shorter (or longer) round, for tests and for trying things out. */
const duration = Math.min(600, Math.max(3, Number(params.get('seconds')) || 60));

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#game');
const ctx = canvas.getContext('2d')!;
const screens = { title: $('#title'), paused: $('#paused'), results: $('#results') };
const hud = $('#hud'), soundButton = $<HTMLButtonElement>('#sound');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let data: Save = capture ? { v: 2, best: 0, plays: 0, sound: true } : load();
let state: State = newGame(seedFrom(), duration);
let screen: Screen = 'title';

function show(next: Screen) {
  screen = next;
  for (const [name, el] of Object.entries(screens)) el.hidden = name !== next;
  hud.hidden = next === 'title';
  $('#best').textContent = String(data.best);
  $('#final').textContent = String(state.score);
  $('#streak').textContent = String(state.bestStreak);
  soundButton.textContent = `Sound: ${data.sound ? 'on' : 'off'}`;
  soundButton.setAttribute('aria-pressed', String(data.sound));
  $('#storage-note').hidden = capture || persistent();
  const focus = next === 'title' ? '#play' : next === 'paused' ? '#resume' : next === 'results' ? '#again' : null;
  if (focus) $(focus).focus();
}

function start() {
  unlock();
  state = newGame(seedFrom(), duration);
  show('play');
}

function finish() {
  if (!capture) {
    data = { ...data, best: Math.max(data.best, state.score), plays: data.plays + 1 };
    save(data);
  }
  show('results');
}

const pause = () => { if (screen === 'play') show('paused'); };
const resume = () => { unlock(); if (screen === 'paused') show('play'); };

/** Where the comet is, as a 0–1 fraction of the canvas (the world is letterboxed into it). */
function playerOnCanvas(): Vec {
  const { width, height } = canvas, scale = Math.min(width / WORLD.w, height / WORLD.h);
  return { x: ((width - WORLD.w * scale) / 2 + state.player.x * scale) / width, y: ((height - WORLD.h * scale) / 2 + state.player.y * scale) / height };
}

/** Capture mode's autopilot: glide toward the next star ahead, and away from a cloud that's close. */
function autopilot(): Vec {
  const p = state.player, ahead = state.things.filter(thing => thing.x > p.x - 10).sort((a, b) => a.x - b.x);
  const cloud = ahead.find(thing => thing.kind === 'cloud' && thing.x - p.x < 320 && Math.abs(thing.y - p.y) < 130);
  if (cloud) return { x: 0, y: cloud.y > p.y || p.y > WORLD.h - 200 ? -0.9 : 0.9 };
  const target = ahead.find(thing => thing.kind === 'star');
  if (!target) return { x: 0, y: 0 };
  const dy = target.y - p.y;
  return { x: 0, y: Math.abs(dy) < 8 ? 0 : Math.sign(dy) * Math.min(0.85, Math.abs(dy) / 120) };
}

let last = performance.now(), acc = 0;
function frame(now: number) {
  acc = Math.min(acc + (now - last) / 1000, 0.25);
  last = now;
  if (screen === 'play') {
    const input = capture ? autopilot() : direction(playerOnCanvas());
    for (; acc >= STEP && !state.over; acc -= STEP) {
      for (const event of step(state, input)) event === 'star' ? ting(state.streak, data.sound) : puff(data.sound);
    }
    if (state.over && !capture) finish();
    if (state.over && capture) state = newGame(seedFrom());
    $('#score').textContent = String(state.score);
    $('#time').textContent = String(timeLeft(state));
  } else {
    acc = 0;
    if (padConfirm()) (screen === 'paused' ? resume : start)();
  }
  draw(ctx, state, now, reducedMotion);
  requestAnimationFrame(frame);
}

// Events: buttons, Escape / P to pause, and pause whenever the game loses focus (another tab,
// or a tap outside the iframe on the website).
$('#play').addEventListener('click', start);
$('#again').addEventListener('click', start);
$('#resume').addEventListener('click', resume);
$('#pause-button').addEventListener('click', pause);
soundButton.addEventListener('click', () => { data = { ...data, sound: !data.sound }; if (!capture) save(data); unlock(); show(screen); });
addEventListener('keydown', event => {
  unlock();
  if (event.code === 'Escape' || event.code === 'KeyP') screen === 'play' ? pause() : resume();
});
addEventListener('pointerdown', unlock);
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('resize', () => resize(canvas));
listen(canvas);
resize(canvas);

// The read-only test hook: tests and the website's preview capture read the game through it.
// snapshot() returns a copy, so nothing outside can change the game or its saves.
Object.defineProperty(window, GAME.hook, {
  value: Object.freeze({
    title: GAME.title,
    snapshot: () => structuredClone({ screen, score: state.score, streak: state.streak, bestStreak: state.bestStreak, sleepy: state.sleepy > 0, timeLeft: timeLeft(state), over: state.over, player: state.player, things: state.things, persistent: persistent(), audio: audioState(), best: data.best }),
  }),
});

if (scene === 'play') { state = newGame(seedFrom()); for (let i = 0; i < 240; i++) step(state, autopilot()); show('play'); }
else if (scene === 'results') { state = newGame(seedFrom()); state.score = 31; state.bestStreak = 12; state.over = true; show('results'); }
else show('title');
requestAnimationFrame(frame);

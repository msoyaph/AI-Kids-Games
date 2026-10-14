import './style.css';
import { GAME } from './config';
import { audioState, ting, unlock } from './audio';
import { load, persistent, save, type Save } from './storage';
import { SIM } from './data/tuning';
import { Showcase, type SceneName } from './game/showcase';
import { ALL_TILES, COLS, LANES, type Tile } from './sim/board';
import { PLANT_MODELS, type PlantModelId } from './render/models/plants';
import { Governor, guessTier, isSoftwareRenderer, urlTier, type QualityTier } from './render/quality';
import { thumbnail } from './render/thumbs';
import { GardenView } from './render/view';
import { Hud } from './ui/hud';
import { layout, needsRotate, type Insets } from './ui/layout';

/**
 * Phase 1: the style frame. The title screen shows the Meadow garden alive behind it; Play opens the
 * board with its HUD, where tapping (or clicking, or Enter on the cursor) plants the chosen card on
 * a free tile. Capture routes: ?scene=title | style | stress, with ?quality=low|medium|high. In
 * capture mode nothing is ever saved.
 */
const params = new URLSearchParams(location.search);
const sceneParam = params.get('scene');
const capture = sceneParam !== null;
const sceneName: SceneName = sceneParam === 'stress' ? 'stress' : sceneParam === 'squint' ? 'squint' : 'style';

type Screen = 'title' | 'play' | 'paused';
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#game');
const screens = { title: $('#title'), paused: $('#paused') };
const soundButton = $<HTMLButtonElement>('#sound');
// the squint scene stands still, so every unit is measured in its resting pose
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || sceneName === 'squint';
const noWebGL2 = (window as unknown as { __noWebGL2?: boolean }).__noWebGL2 === true;

const CARDS: { id: PlantModelId; cost: number; recharge: number }[] = [{ id: 'comfrey', cost: 50, recharge: 5 }, { id: 'rowan', cost: 100, recharge: 5 }, { id: 'boxwood', cost: 75, recharge: 12 }];
/** The style frame's compost: enough for Comfrey, not for Rowan, while Boxwood recharges. */
const COMPOST = 85;

let data: Save = capture ? { v: 2, best: 0, plays: 0, sound: true } : load();
let screen: Screen = 'title';

if (!noWebGL2) boot();

function boot() {
  const gpu = String((window as unknown as { __gardenGpu?: string }).__gardenGpu ?? '');
  const software = isSoftwareRenderer(gpu);
  const forced = urlTier();
  const tier: QualityTier = forced ?? guessTier(navigator, globalThis.screen, gpu);
  const view = new GardenView(canvas, tier, tier !== 'low' && !software);
  const governor = forced || software ? null : new Governor(tier);
  const show = new Showcase(sceneName, 7, sceneName === 'squint' && params.has('empty'));
  const hud = new Hud();
  let cursor: Tile = { lane: 2, col: 2 };
  let highlight: Tile | null = null;
  let t = 0, last = performance.now(), contextLost = false;
  const frames: number[] = [], work: number[] = [];

  // safe-area insets, measured from CSS env() so the layout matches what the page can use
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const insets = (): Insets => {
    const cs = getComputedStyle(probe);
    return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  };

  function resize() {
    const w = innerWidth, h = innerHeight, ins = insets();
    view.resize(w, h, ins);
    hud.layout(layout(w, h, ins));
    const rotate = needsRotate(w, h);
    $('#rotate').hidden = !rotate;
    if (rotate) pause();
  }

  function showScreen(next: Screen) {
    screen = next;
    for (const [name, el] of Object.entries(screens)) el.hidden = name !== next;
    hud.root.hidden = next === 'title';
    soundButton.textContent = `Sound: ${data.sound ? 'on' : 'off'}`;
    soundButton.setAttribute('aria-pressed', String(data.sound));
    $('#storage-note').hidden = capture || persistent();
    const focus = next === 'title' ? '#play' : next === 'paused' ? '#resume' : null;
    if (focus && !capture) $(focus).focus();
  }

  const start = () => { unlock(); showScreen('play'); };
  const pause = () => { if (screen === 'play') showScreen('paused'); };
  const resume = () => { unlock(); if (screen === 'paused' && !needsRotate(innerWidth, innerHeight)) showScreen('play'); };

  const free = (tile: Tile) => show.isFree(tile);
  function plantAt(tile: Tile | null) {
    if (!tile || screen !== 'play') return;
    if (show.plantAt(hud.selectedId as PlantModelId, tile, t)) ting(2, data.sound);
  }

  // pointer: a tap plants the chosen card; dragging a card onto the garden plants it where it's let go
  let down: { x: number; y: number; at: number } | null = null;
  canvas.addEventListener('pointerdown', e => { unlock(); down = { x: e.clientX, y: e.clientY, at: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 14 && performance.now() - down.at < 700) plantAt(view.pick(e.clientX, e.clientY, free));
    down = null;
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && screen === 'play') highlight = view.pick(e.clientX, e.clientY, free); });
  canvas.addEventListener('pointerleave', () => { highlight = null; });
  let dragging: number | null = null;
  hud.cards.addEventListener('pointerdown', e => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!card) return;
    dragging = e.pointerId;
    hud.cards.setPointerCapture(e.pointerId);
    hud.select([...hud.cards.children].indexOf(card));
  });
  hud.cards.addEventListener('pointermove', e => {
    if (dragging !== e.pointerId) return;
    const over = document.elementFromPoint(e.clientX, e.clientY);
    highlight = over === canvas ? view.pick(e.clientX, e.clientY, free) : null;
  });
  hud.cards.addEventListener('pointerup', e => {
    if (dragging !== e.pointerId) return;
    dragging = null;
    if (document.elementFromPoint(e.clientX, e.clientY) === canvas) plantAt(view.pick(e.clientX, e.clientY, free));
    highlight = null;
  });

  // keyboard: number keys pick a card, arrows move the garden cursor, Enter or Space plants
  addEventListener('keydown', e => {
    unlock();
    if (e.code === 'Escape' || e.code === 'KeyP') { screen === 'play' ? pause() : resume(); return; }
    if (screen !== 'play') return;
    const n = Number(e.key);
    if (n >= 1 && n <= CARDS.length) hud.select(n - 1);
    const move: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const m = move[e.code];
    if (m) {
      cursor = { lane: Math.max(0, Math.min(LANES - 1, cursor.lane + m[0])), col: Math.max(0, Math.min(COLS - 1, cursor.col + m[1])) };
      highlight = cursor;
      e.preventDefault();
    }
    if (e.code === 'Enter' || e.code === 'Space') { plantAt(cursor); highlight = cursor; e.preventDefault(); }
  });

  $('#play').addEventListener('click', start);
  $('#resume').addEventListener('click', resume);
  $('#pause-button').addEventListener('click', pause);
  $('#speed').addEventListener('click', () => {
    const b = $('#speed'), fast = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(fast));
    b.setAttribute('aria-label', `Speed: ${fast ? 'double' : 'normal'}`);
    b.textContent = fast ? '2×' : '1×';
  });
  soundButton.addEventListener('click', () => { data = { ...data, sound: !data.sound }; if (!capture) save(data); unlock(); showScreen(screen); });
  if (!capture) {
    addEventListener('blur', pause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  }
  addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); contextLost = true; });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; view.setQuality(view.tier); });

  const pct = (list: number[], q: number) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))]! : 0; };

  function frame(now: number) {
    const real = Math.min((now - last) / 1000, SIM.maxFrame);
    last = now;
    const began = performance.now();
    if (screen !== 'paused') {
      const fast = $('#speed').getAttribute('aria-pressed') === 'true' && screen === 'play';
      const dt = real * (fast ? 2 : 1);
      t += dt;
      show.update(dt, t);
    }
    // the style frame's cards: Boxwood's recharge sweeps round and starts again, Rowan waits for compost
    if (sceneName === 'style') CARDS.forEach((c, i) => hud.cardState(i, c.id === 'boxwood' ? 1 - ((t / c.recharge) % 1) : 0, c.cost <= COMPOST));
    if (!contextLost) {
      view.draw(show.frame(t, reduced, screen === 'play' ? highlight : null));
      view.render();
    }
    const spent = performance.now() - began;
    frames.push(real * 1000); work.push(spent);
    if (frames.length > 240) { frames.shift(); work.shift(); }
    const next = governor?.sample(real);
    if (next) view.setQuality(next);
    requestAnimationFrame(frame);
  }

  // The read-only test hook: tests and the website's preview capture read the game through it.
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => structuredClone({
        screen, scene: show.scene, ...view.stats(), software, gpu,
        frameMs: { p50: pct(frames, 0.5), p95: pct(frames, 0.95) }, cpuMs: { p50: pct(work, 0.5), p95: pct(work, 0.95) },
        counts: { plants: show.plants.length, critters: show.critters.length, berries: show.berries.length, leaves: show.leaves.length, compost: show.compost.length },
        selected: hud.selectedId, planted: show.planted, highlight,
        tiles: ALL_TILES.map(tile => ({ ...tile, ...view.tileOnScreen(tile), free: show.isFree(tile) })),
        cards: hud.cardRects(), persistent: persistent(), audio: audioState(),
      }),
    }),
  });

  // ?debug exposes the view for inspecting the scene from the console (never used by the game)
  if (params.has('debug')) Object.assign(window, { __gardenView: view });
  resize();
  hud.setCards(CARDS.map(c => ({ ...c, image: thumbnail(view.renderer, PLANT_MODELS[c.id]()) })));
  view.draw(show.frame(t, reduced, null));
  void view.warm().catch(() => {}).finally(() => {
    $('#boot').hidden = true;
    showScreen(sceneParam === 'title' || !capture ? 'title' : 'play');
    requestAnimationFrame(now => { last = now; frame(now); });
  });
}

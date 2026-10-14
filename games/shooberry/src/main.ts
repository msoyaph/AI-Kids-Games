import './style.css';
import { GAME } from './config';
import { audioState, sfx, setVolumes, unlock } from './audio/engine';
import { Music, type Track } from './audio/music';
import { LEVELS, levelById, plantsAt, WORLD_DEFS, type Level } from './data/levels';
import { CHALLENGES, dailyLevel, GARDEN_PARTY } from './data/modes';
import { INVADERS, PLANTS as ROSTER, WORLDS, type WorldId } from './data/roster';
import { BOSSES, PLANTS, SIM } from './data/tuning';
import { BOSS_BOOK, nameOf, tipOf } from './data/invaderBook';
import { FACTS } from './data/facts';
import { Play } from './game/play';
import { hintFor } from './game/hints';
import { bindKeys, bindPointer, Pads, type PlayControls } from './input/controls';
import { CRITTER_MODELS } from './render/models/critters';
import { PLANT_MODELS } from './render/models/plants';
import type { Model } from './render/models/types';
import { Governor, guessTier, isSoftwareRenderer, urlTier, type QualityTier } from './render/quality';
import { thumbnail } from './render/thumbs';
import { GardenView } from './render/view';
import { freshSave, load, save, type SaveData, type Settings } from './save/save';
import { persistent, remove } from './save/storage';
import { chooseSeeds, makeBot } from './sim/bot';
import { ALL_TILES, COLS, LANES, type Tile } from './sim/board';
import { canPlant, CURLING, plantAt, stars as starsOf } from './sim/game';
import type { Command, GameState, LevelSpec } from './sim/types';
import { Hud, TROWEL } from './ui/hud';
import { layout, needsRotate, type Insets } from './ui/layout';
import * as M from './ui/menus';

/**
 * Shooberry: plant friendly helpers, shoo the critters, save the picnic. Test and capture routes
 * (never saving over a real save): ?level=<id>[&seeds=a,b], ?quickstart, ?unlockall,
 * ?testmode=1&speed=N, ?quality=low|medium|high, ?scene=title|play|wave|boss|planting|world&w=<id>|stress.
 */
const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const capture = scene !== null;
const unlockAll = params.has('unlockall');
const testSpeed = params.get('testmode') === '1' ? Math.max(1, Math.min(16, Number(params.get('speed')) || 1)) : 1;
const shortcut = capture || params.has('level') || params.has('quickstart');
const noWebGL2 = (window as unknown as { __noWebGL2?: boolean }).__noWebGL2 === true;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

type Mode = 'adventure' | 'challenge' | 'party' | 'daily' | 'demo';
interface Context { mode: Mode; spec: LevelSpec; level?: Level; offered: string[]; seeds: string[] }

let data: SaveData = capture ? freshSave() : load();
/** Test shortcuts never overwrite a real save. */
const noSave = capture || (shortcut && persistent() && localStorageHasSave());
function localStorageHasSave() { try { return !!localStorage.getItem(`${GAME.storagePrefix}save`); } catch { return false; } }
const store = () => { if (!noSave) save(data); };

if (!noWebGL2) boot();

function boot() {
  const gpu = String((window as unknown as { __gardenGpu?: string }).__gardenGpu ?? '');
  const software = isSoftwareRenderer(gpu);
  const forced = urlTier() ?? (data.settings.quality !== 'auto' ? data.settings.quality : null);
  const tier: QualityTier = forced ?? guessTier(navigator, globalThis.screen, gpu);
  const canvas = $<HTMLCanvasElement>('#game');
  const view = new GardenView(canvas, tier, tier !== 'low' && !software);
  let governor = forced || software ? null : new Governor(tier);
  const hud = new Hud();
  const music = new Music();
  const reducedSystem = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced = () => reducedSystem || data.settings.reducedMotion;

  // ---------------------------------------------------------------- pictures (cached thumbnails)
  const thumbs = new Map<string, string>();
  const PINECONE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><ellipse cx="20" cy="22" rx="12" ry="14" fill="#a8693c" stroke="#2b1910" stroke-width="2.5"/><path d="M12 16h16M11 22h18M12 28h16" stroke="#7a4a28" stroke-width="2"/></svg>')}`;
  const thumb = (id: string) => {
    if (id === CURLING.card) return PINECONE;
    let url = thumbs.get(id);
    if (url) return url;
    const make = (PLANT_MODELS as Record<string, () => Model>)[id] ?? (CRITTER_MODELS as Record<string, () => Model>)[id];
    url = make ? thumbnail(view.renderer, make(), 160, id in PLANT_MODELS ? 0 : 0.7) : '';
    thumbs.set(id, url);
    return url;
  };

  // ---------------------------------------------------------------- progress
  const starsFor = (id: string) => data.stars[id] ?? 0;
  const levelOpen = (l: Level) => unlockAll || l.worldIndex + l.index === 0 || starsFor(LEVELS[LEVELS.indexOf(l) - 1]!.id) > 0;
  const worldOpen = (wi: number) => unlockAll || wi === 0 || starsFor(LEVELS[wi * 10 - 1]!.id) > 0;
  const modesOpen = () => unlockAll || starsFor('meadow-10') > 0;
  const furthest = () => { let last = LEVELS[0]!; for (const l of LEVELS) if (levelOpen(l)) last = l; return last; };
  const unlockedPlants = () => (unlockAll ? plantsAt(4, 9) : plantsAt(furthest().worldIndex, furthest().index));
  const totalStars = () => LEVELS.reduce((a, l) => a + starsFor(l.id), 0);

  // ---------------------------------------------------------------- settings
  const applySettings = () => {
    setVolumes(data.settings.music, data.settings.sfx);
    document.body.classList.toggle('large', data.settings.largeText);
    document.body.classList.toggle('calm', data.settings.reducedMotion);
    music.on = data.settings.music > 0;
  };
  applySettings();

  /** Read-aloud with the device's own voices only (cloud voices would send the text away). */
  const say = (text: string) => {
    try {
      const synth = globalThis.speechSynthesis;
      if (!synth) return;
      const voice = synth.getVoices().find(v => v.localService && v.lang.startsWith('en'));
      if (!voice) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.rate = 0.95;
      synth.speak(u);
    } catch { /* no speech here: the text is on screen */ }
  };

  // ---------------------------------------------------------------- screens
  let screen: M.ScreenId | null = null;
  let previous: M.ScreenId[] = [];
  let ctx: Context | null = null;
  let play: Play | null = null;
  let demo: Play | null = null;
  let demoBot: ((g: GameState) => Command[]) | null = null;
  let mapWorld: WorldId = 'meadow';
  let bookKind: 'seeds' | 'critters' = 'seeds';

  const go = (next: M.ScreenId | null, remember = true) => {
    if (remember && screen && next && screen !== next && screen !== 'tip') previous.push(screen);
    screen = next;
    M.showScreen(next);
    hud.root.hidden = next !== null && next !== 'paused' && next !== 'tip' ? true : !play;
    if (!next && play) play.paused = false;
    if (next === 'title') { M.title({ modes: modesOpen() }, persistent()); music.play('menu'); }
    if (next === 'map') drawMap();
    if (next === 'challenges') M.challenges(CHALLENGES.map(c => ({ id: c.id, name: c.name, blurb: c.blurb, stars: starsFor(c.id) })), id => startContext(challengeContext(id)));
    if (next === 'books') M.books(bookKind, data, thumb, unlockAll, say);
    if (next === 'settings') M.settings(data.settings, s => changeSettings(s), startOver);
  };
  const back = () => {
    if (screen === 'paused') return resume();
    if (screen === 'tip') return;
    const prev = previous.pop() ?? 'title';
    if (prev === 'paused' && play) { go('paused', false); return; }
    go(prev, false);
  };

  const drawMap = () => {
    const worlds = WORLD_DEFS.map((w, wi) => ({ id: w.id, open: worldOpen(wi) }));
    M.map(mapWorld, worlds, LEVELS.map(l => ({ id: l.id, world: l.world, index: l.index, boss: !!l.row.boss, open: levelOpen(l), stars: starsFor(l.id) })), totalStars(), w => { mapWorld = w; drawMap(); }, id => { const l = levelById(id)!; startContext({ mode: 'adventure', spec: l, level: l, offered: l.plants, seeds: [] }); });
  };

  function changeSettings(s: Settings) {
    const qualityChanged = s.quality !== data.settings.quality;
    data.settings = s;
    applySettings();
    store();
    if (qualityChanged) {
      governor = s.quality === 'auto' && !software ? new Governor(view.tier) : null;
      if (s.quality !== 'auto') view.setQuality(s.quality);
    }
  }

  function startOver() {
    remove('save');
    data = freshSave();
    applySettings();
    go('title', false);
    previous = [];
  }

  // ---------------------------------------------------------------- levels
  const challengeContext = (id: string): Context => { const c = CHALLENGES.find(x => x.id === id)!; return { mode: 'challenge', spec: c, offered: c.plants.filter(p => unlockedPlants().includes(p) || c.fixedSeeds?.includes(p)), seeds: [] }; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function startContext(c: Context) {
    unlock();
    ctx = c;
    if (c.spec.fixedSeeds || c.spec.curling || c.spec.noPlanting) return beginPlay(c, c.spec.fixedSeeds ?? []);
    const remembered = data.lastSeeds[c.spec.id] ?? [];
    const kinds = [...new Set(c.spec.waves.flatMap(w => w.spawns.map(s => s.critter)))];
    const recommend = () => chooseSeeds(c.spec, c.offered, c.spec.seedSlots, 'good', 1);
    M.seeds({ title: c.level ? `${WORLDS.find(w => w.id === c.level!.world)!.name} ${c.level.index + 1}` : c.spec.name, slots: c.spec.seedSlots, offered: c.offered, chosen: remembered.length ? remembered : recommend(), critters: kinds, newCritter: c.level?.row.meet, dusk: !!c.spec.dusk }, thumb, chosen => beginPlay(c, chosen), recommend);
    go('seeds');
  }

  /** Tips shown before a level, the first time each thing appears. */
  function tipsFor(c: Context): { id: string; image: string; heading: string; text: string }[] {
    const out: { id: string; image: string; heading: string; text: string }[] = [];
    if (c.mode === 'adventure' && !data.seen.tips.includes('start')) out.push({ id: 'start', image: thumb('comfrey'), heading: 'Welcome to the picnic!', text: 'Pick a plant card, then tap a garden spot to plant it. Comfrey makes compost to pay for plants, and Rowan flicks berries to shoo critters home. Keep them away from the picnic snacks!' });
    const row = c.level?.row;
    if (row?.unlock && !data.seen.plants.includes(row.unlock)) { const p = ROSTER.find(x => x.id === row.unlock)!; out.push({ id: `plant:${p.id}`, image: thumb(p.id), heading: `New plant: ${p.name}`, text: `${p.does} ${FACTS[p.id] ?? ''}` }); }
    if (row?.meet && !data.seen.critters.includes(row.meet)) out.push({ id: `critter:${row.meet}`, image: thumb(row.meet), heading: `Here comes the ${nameOf(row.meet)}!`, text: tipOf(row.meet) });
    if (c.level?.id === 'greenhouse-1' && !data.seen.tips.includes('trowel')) out.push({ id: 'trowel', image: thumb('comfrey'), heading: 'The trowel', text: 'Need room for a different plant? Choose the trowel card, then tap a plant to dig it up. You don\'t get compost back, so dig wisely!' });
    const boss = c.spec.waves.flatMap(w => w.spawns).find(s => s.critter in BOSSES)?.critter;
    if (boss && !data.seen.critters.includes(boss)) { const b = BOSS_BOOK.find(x => x.id === boss)!; out.push({ id: `critter:${boss}`, image: thumb(boss), heading: `${b.name} is coming!`, text: b.tip }); }
    return out;
  }

  function beginPlay(c: Context, seeds: string[]) {
    ctx = c;
    c.seeds = seeds;
    if (c.mode !== 'demo' && seeds.length) { data.lastSeeds[c.spec.id] = seeds; store(); }
    const seed = (c.mode === 'daily' ? 7 : 1) + (c.spec.id.length * 13);
    play = new Play(c.spec, seeds, { seed, autoCollect: data.settings.autoCollect, speed: data.settings.speed }, music);
    play.testSpeed = testSpeed;
    play.onEvent = e => { if (e.type === 'won' || e.type === 'lost') window.setTimeout(() => finish(), 900); if (e.type === 'umbrella' && !data.seen.tips.includes('umbrella')) { data.seen.tips.push('umbrella'); store(); play!.banner = { text: 'The picnic umbrella popped open! Each lane has one.', kind: 'wave', until: play!.game.t + 3.5 }; } };
    const kinds = [...seeds, ...(c.spec.prePlanted ?? []).map(p => p.plant), ...new Set(c.spec.waves.flatMap(w => w.spawns.map(s => s.critter)))];
    if (c.spec.waves.flatMap(w => w.spawns).some(s => s.critter === 'grand-snail')) kinds.push('ants');
    if (c.spec.waves.flatMap(w => w.spawns).some(s => s.critter === 'parade-float')) kinds.push('snail', 'ants', 'mouse', 'roly-poly', 'gecko');
    if (c.spec.endless) kinds.push(...INVADERS.map(i => i.id).filter(id => !['moths', 'owlet', 'kite-crow'].includes(id)));
    view.setWorld(c.spec.world, c.spec.specials);
    view.prepare(kinds);
    hud.setLevel(c.spec, play.game.cards.map(card => ({ id: card.plant, image: thumb(card.plant) })), !c.spec.noPlanting && !c.spec.curling);
    resize();
    music.play(c.spec.world as Track);
    cursor = { lane: 2, col: 2 };
    // remember what the player has met (for the books)
    for (const k of kinds) { const list = k in PLANTS ? data.seen.plants : data.seen.critters; if (!list.includes(k) && (k in PLANTS ? seeds.includes(k) || true : true)) list.push(k); }
    const tips = c.mode === 'demo' || shortcut ? [] : tipsFor(c);
    const nextTip = () => {
      const t = tips.shift();
      if (!t) { store(); go(null, false); previous = []; return; }
      if (!data.seen.tips.includes(t.id)) data.seen.tips.push(t.id);
      play!.paused = true;
      M.tip(t.image, t.heading, t.text, nextTip, say, data.settings.readAloud);
      go('tip', false);
    };
    nextTip();
  }

  function finish() {
    if (!play || !ctx || !play.game.result || screen === 'result') return;
    const g = play.game, won = g.result === 'won', got = starsOf(g), c = ctx;
    if (c.mode === 'demo') return;
    if (c.mode === 'party') {
      const waves = Math.max(0, g.wave - 1), best = waves > data.partyBest;
      if (best) data.partyBest = waves;
      store();
      M.result({ won: false, stars: 0, title: best ? 'A new best!' : 'What a party!', message: `You kept the picnic safe for ${waves} wave${waves === 1 ? '' : 's'}. Your best is ${data.partyBest}.`, buttons: [{ label: 'Play again', big: true, run: () => beginPlay(c, c.seeds) }, { label: 'Menu', run: () => { play = null; go('title', false); previous = []; } }] }, thumb);
      go('result', false);
      return;
    }
    if (won) {
      data.stars[c.spec.id] = Math.max(starsFor(c.spec.id), got);
      if (c.mode === 'daily') data.daily[c.spec.id.replace('daily-', '')] = Math.max(data.daily[c.spec.id.replace('daily-', '')] ?? 0, got);
    }
    store();
    const next = c.level ? LEVELS[LEVELS.indexOf(c.level) + 1] : undefined;
    const buttons: M.ResultInfo['buttons'] = [];
    if (won && next && c.mode === 'adventure') buttons.push({ label: 'Next level', big: true, run: () => startContext({ mode: 'adventure', spec: next, level: next, offered: next.plants, seeds: [] }) });
    if (!won) buttons.push({ label: 'Try again', big: true, run: () => beginPlay(c, c.seeds) });
    if (!won && !c.spec.fixedSeeds && !c.spec.curling && !c.spec.noPlanting) buttons.push({ label: 'Change seeds', run: () => startContext(c) });
    if (won) buttons.push({ label: 'Play again', run: () => beginPlay(c, c.seeds) });
    buttons.push({ label: c.mode === 'adventure' ? 'Map' : 'Menu', run: () => { play = null; go(c.mode === 'adventure' ? 'map' : c.mode === 'challenge' ? 'challenges' : 'title', false); previous = ['title']; } });
    const finale = c.level?.id === 'cloud-10';
    M.result({
      won, stars: got,
      title: won ? (finale ? 'You saved the Snack Parade picnic!' : got === 3 ? 'Perfect picnic!' : 'You did it!') : 'Try again!',
      message: won ? (finale ? 'Every critter went home happy, and the picnic is safe. Thank you, gardener!' : got === 3 ? 'Every snack is still in the basket.' : `${got} snack${got === 1 ? '' : 's'} saved. Can you keep all three?`) : hintFor(play.thieves, c.seeds),
      unlock: won && next?.row.unlock ? next.row.unlock : undefined, buttons,
    }, thumb);
    go('result', false);
  }

  const pause = () => { if (play && !screen && !play.game.result) { play.paused = true; go('paused'); } };
  const resume = () => { unlock(); if (play && screen === 'paused' && !needsRotate(innerWidth, innerHeight)) { previous = []; go(null, false); } };
  $('#resume').addEventListener('click', resume);
  $('#restart').addEventListener('click', () => { if (ctx) beginPlay(ctx, ctx.seeds); });
  $('#leave').addEventListener('click', () => { const mode = ctx?.mode; play = null; previous = ['title']; go(mode === 'adventure' ? 'map' : mode === 'challenge' ? 'challenges' : 'title', false); });
  $('#pause-button').addEventListener('click', pause);
  $('#speed').addEventListener('click', () => toggleSpeed());
  const toggleSpeed = () => {
    if (!play) return;
    play.speed = play.speed === 1 ? 2 : 1;
    const b = $('#speed');
    b.setAttribute('aria-pressed', String(play.speed === 2));
    b.setAttribute('aria-label', `Speed: ${play.speed === 2 ? 'double' : 'normal'}`);
    b.textContent = `${play.speed}×`;
  };
  document.querySelectorAll<HTMLElement>('[data-back]').forEach(b => b.addEventListener('click', back));
  document.querySelectorAll<HTMLElement>('[data-go]').forEach(b => b.addEventListener('click', () => {
    unlock(); sfx('click');
    const to = b.dataset.go!;
    if (to === 'party') { const offered = unlockedPlants(); startContext({ mode: 'party', spec: GARDEN_PARTY, offered, seeds: [] }); return; }
    if (to === 'daily') { const d = dailyLevel(today(), unlockedPlants()); startContext({ mode: 'daily', spec: d, offered: d.plants, seeds: [] }); return; }
    go(to as M.ScreenId);
  }));
  document.querySelectorAll<HTMLButtonElement>('#books [data-book]').forEach(b => b.addEventListener('click', () => { bookKind = b.dataset.book as 'seeds' | 'critters'; M.books(bookKind, data, thumb, unlockAll, say); }));

  // ---------------------------------------------------------------- the garden's controls
  let cursor: Tile = { lane: 2, col: 2 };
  let hovered: Tile | null = null;
  let keyboard = false;
  const playing = () => !!play && !screen && !play.game.result && !play.paused;
  const selected = () => hud.selectedId;
  const plantable = (t: Tile) => !!play && (selected() === TROWEL ? !!plantAt(play.game, t.lane, t.col) : selected() === CURLING.card ? true : canPlant(play.game, selected(), t.lane, t.col));
  const act = (t: Tile | null) => {
    if (!play || !t) return;
    const g = play.game, card = hud.selected;
    if (selected() === TROWEL) { if (plantAt(g, t.lane, t.col)) play.command({ type: 'dig', lane: t.lane, col: t.col }); return; }
    if (g.grid[t.lane]![t.col]!.kind === 'pebble') { play.command({ type: 'clear', lane: t.lane, col: t.col }); return; }
    const c = g.cards[card];
    if (!c) return;
    if (c.wait > 0 || g.compost < (c.plant === CURLING.card ? CURLING.cost : PLANTS[c.plant]!.cost)) { sfx('nope'); return; }
    if (!plantable(t)) { sfx('nope'); return; }
    play.command({ type: 'plant', card, lane: t.lane, col: t.col });
  };
  const controls: PlayControls = {
    tap(x, y) {
      if (!play) return;
      unlock();
      keyboard = false;
      hud.hideInfo();
      // a compost pickup under the finger is collected first
      const reach = Math.max(36, view.tilePx() * 0.55);
      const p = play.game.pickups.map(q => ({ q, s: view.pickupOnScreen(q.lane, q.x) })).filter(o => Math.hypot(o.s.x - x, o.s.y - y) < reach).sort((a, b) => Math.hypot(a.s.x - x, a.s.y - y) - Math.hypot(b.s.x - x, b.s.y - y))[0];
      if (p) { play.command({ type: 'collect', pickup: p.q.id }); return; }
      const pebble = view.pick(x, y, t => play!.game.grid[t.lane]![t.col]!.kind === 'pebble');
      if (pebble && play.game.grid[pebble.lane]![pebble.col]!.kind === 'pebble' && selected() !== TROWEL) { act(pebble); return; }
      act(view.pick(x, y, plantable));
    },
    hover(x, y) { hovered = x === null || !play ? null : view.pick(x, y, plantable); if (x !== null) keyboard = false; },
    hold(x, y, card) {
      if (!play) return;
      if (card && card !== TROWEL) { hud.showInfo(card, x, y); return; }
      const t = view.pick(x, y);
      const p = t ? plantAt(play.game, t.lane, t.col) : null;
      if (p) hud.showInfo(p.kind, x, y);
    },
    release() { hud.hideInfo(); },
    drop(card, x, y) { hud.select(card); act(view.pick(x, y, plantable)); },
    selectCard(i) { if (i < hud.cardCount) { hud.select(i); sfx('click'); } },
    nextCard(dir) { hud.select((hud.selected + dir + hud.cardCount) % hud.cardCount); sfx('click'); },
    moveCursor(dl, dc) { keyboard = true; cursor = { lane: Math.max(0, Math.min(LANES - 1, cursor.lane + dl)), col: Math.max(0, Math.min(COLS - 1, cursor.col + dc)) }; },
    confirm() { keyboard = true; unlock(); act(cursor); },
    cancel() { hud.select(0); hud.hideInfo(); },
    collectAll() { play?.command({ type: 'collectAll' }); },
    trowel() { const i = [...hud.cards.children].findIndex(c => (c as HTMLElement).dataset.plant === TROWEL); if (i >= 0) hud.select(i); },
    pause,
    speed: toggleSpeed,
    playing,
  };
  bindPointer(canvas, hud.cards, controls);
  hud.cards.addEventListener('click', e => { const card = (e.target as HTMLElement).closest('.card'); if (card) hud.select([...hud.cards.children].indexOf(card)); });
  bindKeys(controls, { back: () => { if (screen === 'tip') return; back(); }, active: () => !!screen });
  const pads = new Pads(controls, { back: () => { if (screen !== 'tip') back(); }, active: () => !!screen });

  // ---------------------------------------------------------------- layout and lifecycle
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const insets = (): Insets => { const cs = getComputedStyle(probe); return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 }; };
  function resize() {
    const w = innerWidth, h = innerHeight, ins = insets();
    view.resize(w, h, ins);
    hud.layout(layout(w, h, ins));
    const rotate = needsRotate(w, h);
    $('#rotate').hidden = !rotate;
    if (rotate) pause();
  }
  addEventListener('resize', resize);
  if (!capture) {
    addEventListener('blur', pause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); store(); } });
  }
  addEventListener('pagehide', store);
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; view.setQuality(view.tier); });
  let lost = false;

  // ---------------------------------------------------------------- the demo garden behind the menus (and capture scenes)
  function startDemo(levelId = 'meadow-6', forward = 40) {
    const l = levelById(levelId)!;
    demo = new Play(l, chooseSeeds(l, l.plants, l.seedSlots, 'good', 3), { seed: 3, autoCollect: true, speed: 1 });
    demoBot = makeBot('good', 3);
    view.setWorld(l.world, l.specials);
    view.prepare([...l.plants, ...l.pool]);
    for (let i = 0; i < forward * 60 && !demo.game.result; i++) { for (const cmd of demoBot(demo.game)) demo.command(cmd); demo.tick(1 / 60); }
  }

  // ---------------------------------------------------------------- the frame loop
  const frames: number[] = [], work: number[] = [];
  let last = performance.now(), t = 0;
  const pct = (list: number[], q: number) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))]! : 0; };
  function frame(now: number) {
    const real = Math.min((now - last) / 1000, SIM.maxFrame);
    last = now;
    const began = performance.now();
    pads.poll(now);
    t += real;
    const active = play ?? demo;
    if (play) play.tick(real);
    else if (demo) {
      if (demoBot) for (const cmd of demoBot(demo.game)) demo.command(cmd);
      demo.tick(real);
      if (demo.game.result) startDemo();
    }
    if (active && !lost) {
      const highlight = play && playing() ? (keyboard ? cursor : hovered) : null;
      view.draw(active.frame(t, reduced(), highlight, highlight ? plantable(highlight) : true));
      view.render();
    }
    if (play) hud.update(play.game, play.bump, play.banner);
    music.update();
    const spent = performance.now() - began;
    frames.push(real * 1000); work.push(spent);
    if (frames.length > 240) { frames.shift(); work.shift(); }
    const next = governor?.sample(real);
    if (next) view.setQuality(next);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- the read-only test hook
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => {
        const g = (play ?? demo)?.game;
        return structuredClone({
          screen: screen ?? (play ? 'play' : 'none'), mode: ctx?.mode ?? null, level: g?.spec.id ?? null, t: g?.t ?? 0, result: g?.result ?? null, stars: g ? starsOf(g) : 0,
          compost: g?.compost ?? 0, snacks: g?.snacks ?? 0, umbrellas: g?.umbrellas ?? [], progress: g?.progress ?? 0, wave: g?.wave ?? 0,
          critters: (g?.critters ?? []).map(c => ({ kind: c.kind, lane: c.lane, x: c.x, mood: c.mood, patience: c.patience })),
          plants: (g?.grid ?? []).flatMap((row, lane) => row.flatMap((cell, col) => (cell.kind === 'plant' ? [{ kind: cell.plant.kind, lane, col, health: cell.plant.health }] : []))),
          pickups: (g?.pickups ?? []).map(p => ({ id: p.id, lane: p.lane, x: p.x, screen: view.pickupOnScreen(p.lane, p.x) })),
          tiles: ALL_TILES.map(tile => ({ ...tile, ...view.tileOnScreen(tile), free: g ? g.grid[tile.lane]![tile.col]!.kind === 'free' : true })),
          cards: hud.cardRects().map((r, i) => ({ ...r, ready: (g?.cards[i]?.wait ?? 0) <= 0 })), selected: hud.selectedId, cursor, taps: play?.tapsTaken ?? 0,
          ...view.stats(), software, gpu, frameMs: { p50: pct(frames, 0.5), p95: pct(frames, 0.95) }, cpuMs: { p50: pct(work, 0.5), p95: pct(work, 0.95) },
          settings: data.settings, saved: { stars: data.stars, partyBest: data.partyBest }, persistent: persistent(), noSave, audio: audioState(),
        });
      },
    }),
  });

  // ---------------------------------------------------------------- start
  resize();
  const levelParam = params.get('level');
  const sceneLevel: Record<string, [string, number]> = { play: ['meadow-7', 110], wave: ['meadow-7', 110], boss: ['meadow-10', 330], planting: ['greenhouse-3', 26], stress: ['meadow-6', 0] };
  if (scene === 'world') { const w = params.get('w') ?? 'meadow'; startDemo(`${w}-6`, 120); }
  else if (scene && scene !== 'title' && sceneLevel[scene]) startDemo(...sceneLevel[scene]!);
  else startDemo();
  if (scene === 'stress') stress(demo!.game);
  void view.warm().catch(() => {}).finally(() => {
    $('#boot').hidden = true;
    if (levelParam || params.has('quickstart')) {
      const l = levelById(levelParam ?? 'meadow-1') ?? LEVELS[0]!;
      const seeds = params.get('seeds')?.split(',').filter(s => s in PLANTS) ?? [];
      const c: Context = { mode: 'adventure', spec: l, level: l, offered: l.plants, seeds: [] };
      if (seeds.length) beginPlay(c, seeds); else startContext(c);
    } else if (capture && scene !== 'title') { go(null, false); hud.root.hidden = true; }
    else go('title', false);
    requestAnimationFrame(now => { last = now; frame(now); });
  });

  /** The stress scene: a full board (45 plants of 8 kinds), 40 critters and 150 shots, kept busy. */
  function stress(g: GameState) {
    const kinds = ['comfrey', 'rowan', 'boxwood', 'maple', 'lambs-ear', 'basil', 'lavender', 'wisteria'];
    view.prepare([...kinds, 'snail', 'ants', 'mouse', 'roly-poly', 'magpie', 'beetle']);
    for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < COLS; col++) {
      const kind = kinds[(lane * COLS + col) % kinds.length]!;
      g.grid[lane]![col] = { kind: 'plant', plant: { id: 9000 + lane * 10 + col, kind, lane, col, health: 1e9, max: 1e9, wait: 1e9, bornAt: -10, actedAt: -10 } };
    }
    const crit = ['snail', 'ants', 'mouse', 'roly-poly', 'magpie', 'beetle'];
    for (let i = 0; i < 40; i++) g.critters.push({ id: 8000 + i, kind: crit[i % crit.length]!, boss: false, lane: i % LANES, x: 1 + (i * 0.23) % 9, toLane: i % LANES, laneT: 1, patience: 1e9, max: 1e9, armour: 0, shield: 0, slow: 1, slowUntil: 0, heldUntil: 1e12, hopsLeft: 0, nextHop: 0, hopFrom: 0, hopTo: 0, hopAt: -10, under: false, carrying: null, dropAt: -1, mood: 'walk', moodAt: 0, nextTrick: 1e12, withSnack: false, lured: true, waited: true, rushUntil: 0, group: 8000 + i });
    for (let i = 0; i < 150; i++) g.shots.push({ id: 7000 + i, kind: (['berry', 'pod', 'floss', 'samara'] as const)[i % 4], lane: i % LANES, x: (i * 0.37) % 9.5, speed: 0, power: 0, pierce: true, hit: [8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, ...Array.from({ length: 30 }, (_, k) => 8010 + k)], lob: null, air: false, glide: 1e9 });
    g.spec = { ...g.spec, waves: [], endless: true };
    demoBot = null;
  }
}

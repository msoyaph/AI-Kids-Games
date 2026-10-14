import './style.css';
import { GAME } from './config';
import { audio, sfx } from './audio/engine';
import { CROPS } from './data/crops';
import { CHAPTERS } from './data/chapters';
import { NEIGHBOR } from './data/cast';
import { xpForLevel } from './data/tuning';
import { Play } from './game/play';
import { showcaseFarm, styleFrameFarm, styleFramePoints } from './game/showcase';
import { itemModel, itemSize } from './game/placing';
import { Ghost } from './render/ghost';
import { tileFits } from './sim/build';
import { occupancy } from './sim/world';
import { tileAt as tileAtMap } from './sim/map';
import { Controller } from './input/controller';
import type { TileRef } from './input/pick';
import { boxPoints, tileWidthOnScreen, YAW_STEP, ZOOM } from './render/camera';
import { objPoints, showFrame, startFrame, startPoints } from './game/framing';
import { StoryFlow } from './game/storyFlow';
import { openArea, setRailSide } from './ui/layout';
import { onLockedLand } from './render/objects';
import { Governor, guessTier, isSoftwareRenderer, urlTier, type QualityTier } from './render/quality';
import { FarmView } from './render/view';
import { loadFarm, saveFarm } from './save/save';
import { loadSettings, saveSettings, type Settings } from './save/settings';
import { persistent } from './save/storage';
import { seasonName, seasonOf, type Season } from './sim/clock';
import { newFarm, type Farm } from './sim/state';
import { advance, catchUp, type SimEvent } from './sim/tick';
import { levelOf } from './sim/world';
import { fill, h } from './ui/h';
import { Hud } from './ui/hud';
import { icon } from './ui/icons';
import { Panels } from './ui/panels';
import { settingsPanel } from './ui/settingsPanel';
import { speak, stopSpeaking } from './ui/speech';

declare global { interface Window { __noWebGL2?: boolean } }

/** What a visiting neighbour says, by the farm's beauty rating. */
const VISIT_LINES: Record<string, string> = {
  Sleepy: 'So much room to grow here!', Tidy: 'Everything’s so neat and tidy!', Pretty: 'What a pretty farm!',
  Lovely: 'Lovely! I could stay all day.', 'Picture-perfect': 'Picture-perfect! The whole town should see this.',
};

/**
 * Capture route for the website's previews and screenshots: ?scene=title|farm (and &seed=N, &t=
 * seconds of farm time, &yaw=0..7, &zoom=px per tile, &x= &z= camera target). It shows a staged farm
 * in memory and never reads or writes the player's save.
 */
const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const capture = scene !== null;
const num = (k: string) => (params.has(k) && Number.isFinite(Number(params.get(k))) ? Number(params.get(k)) : null);
/** ?speed=N runs farm time N times faster (1–120): for tests and trying things out. */
const speed = Math.min(120, Math.max(1, num('speed') ?? 1));

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function boot() {
  const canvas = $<HTMLCanvasElement>('#farm');
  const uiRoot = $('#ui');
  const settings: Settings = loadSettings();
  const loadedRaw = capture ? null : loadFarm();
  // an unreadable save was copied aside (or can't be, so this visit won't save over it)
  const brokenSave = loadedRaw?.status === 'broken' ? loadedRaw : null;
  const loaded = loadedRaw && loadedRaw.status !== 'broken' ? loadedRaw : null;
  const staged = scene === 'showcase' || scene === 'build' || scene === 'fair' || scene === 'ending';
  const farm: Farm = staged ? showcaseFarm(num('seed') ?? 7) : scene === 'styleframe' ? styleFrameFarm(num('seed') ?? 7) : loaded && loaded.status !== 'future' ? loaded.farm : newFarm(capture ? num('seed') ?? 7 : Math.floor(Math.random() * 2 ** 31));
  const futureSave = loaded?.status === 'future' || (brokenSave !== null && !brokenSave.kept);
  if (capture) {
    farm.t = num('t') ?? farm.t;
    farm.cam = { x: num('x') ?? farm.cam.x, z: num('z') ?? farm.cam.z, yawStep: num('yaw') ?? farm.cam.yawStep, zoom: num('zoom') ?? farm.cam.zoom ?? 0 };
  }

  // quality: the URL, then Settings, then a guess from the device; software WebGL always gets Low
  const forced = urlTier();
  let tier: QualityTier = forced ?? (settings.quality === 'auto' ? guessTier() : settings.quality);
  const view = new FarmView(canvas, farm.cam, tier !== 'low');
  try {
    const gl = view.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (isSoftwareRenderer(name)) tier = 'low';
  } catch { /* no renderer info */ }
  const governor = settings.quality === 'auto' && !forced && !capture ? new Governor(tier) : null;
  view.setQuality(tier);

  const panels = new Panels(uiRoot);
  type Screen = 'title' | 'farm';
  let screen: Screen = 'title';
  let glLost = false;
  const reduced = () => settings.reducedMotion;

  // --- feedback: floating numbers over tiles, and spoken lines ---
  const floats = h('div.floats', { 'aria-hidden': 'true' });
  uiRoot.appendChild(floats);
  /** Floating labels: readable pills over a tile that rise and fade; several at once stack up instead of overlapping. */
  const floating: { el: HTMLElement; x: number; y: number; until: number }[] = [];
  function float(tile: TileRef, text: string, kind: 'good' | 'info' = 'good') {
    const p = view.tileOnScreen(tile.x, tile.z);
    const now = performance.now();
    for (let i = floating.length - 1; i >= 0; i--) if (floating[i]!.until < now) floating.splice(i, 1);
    const stack = floating.filter(f => Math.abs(f.x - p.x) < 90 && Math.abs(f.y - p.y) < 60).length;
    const el = h('span.float', { class: kind, style: `left:${p.x}px;top:${p.y - 34 - stack * 38}px` }, text);
    floats.appendChild(el);
    floating.push({ el, x: p.x, y: p.y, until: now + 1600 });
    setTimeout(() => el.remove(), 1700);
  }
  function say(text: string) {
    panels.toast(text);
    if (settings.readAloud) speak(text);
  }

  const play = new Play({
    farm: () => farm,
    view,
    panels,
    changed: () => { dirty = true; },
    float,
    say,
    toolChanged: () => refreshTools(),
    did: (kind, tile) => view.life.helpers.react(kind, tile.x, tile.z, performance.now() / 1000),
  });

  // --- placing things: the ghost in the farm, and a bar with Turn, Place and Cancel ---
  const ghost = new Ghost();
  view.scene.add(ghost.group);
  const placeBar = h('div.place-bar', { role: 'toolbar', 'aria-label': 'Placing' });
  placeBar.hidden = true;
  uiRoot.appendChild(placeBar);
  let placeKey = '';
  function refreshPlaceBar() {
    const p = play.placing;
    placeBar.hidden = !p;
    if (!p) { placeKey = ''; return; }
    const fits = play.placingFits();
    const key = `${JSON.stringify(p.item)}|${p.at.x},${p.at.z},${p.at.rot}|${fits.ok}|${p.moved}`;
    if (key === placeKey) return;
    placeKey = key;
    const size = itemSize(farm, p.item);
    const cost = play.placingCost();
    const moving = p.item.kind === 'move';
    fill(placeBar,
      h('span.place-name', null, h('b', null, moving ? `Moving: ${play.placingName()}` : play.placingName()), h('small', null, !p.moved ? 'Tap where it should go' : fits.ok ? 'Tap it again or press Place' : fits.why)),
      size.w !== size.d || p.item.kind === 'buy' || moving ? h('button', { 'aria-label': 'Turn it (R)', onclick: () => play.turnPlacing() }, icon('turn', 24), 'Turn') : null,
      h('button.go', { disabled: !fits.ok || !p.moved, onclick: () => play.confirmPlacing() }, icon('check', 24), cost ? `Place · ${cost}` : 'Place'),
      moving ? h('button', { onclick: () => play.putAwayMoving() }, 'Put away') : null,
      h('button', { 'aria-label': 'Cancel', onclick: () => play.cancelPlacing() }, icon('close', 22)));
  }

  const hud = new Hud(uiRoot, {
    menu: () => openMenu(),
    turn: dir => { controller.turn(dir); sfx.turn(); },
    zoom: dir => { view.goal.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, view.goal.zoom * (dir > 0 ? 1.3 : 1 / 1.3))); },
    tool: id => { play.pickTool(id); showTool(); },
    goals: () => story.tapGoal(),
  });
  /** "Show me": glide to these tiles unless they are all on screen already. Returns false if there was nothing to show. */
  function showMe(tiles: { x: number; z: number }[]): boolean {
    if (!tiles.length) return false;
    const open = { x0: view.insets.left, y0: 0, x1: view.width - view.insets.right, y1: view.height };
    const o = view.openCenter();
    const onScreen = tiles.every(t => {
      const p = view.tileOnScreen(t.x, t.z);
      return p.x > open.x0 + 24 && p.x < open.x1 - 24 && Math.abs(p.y - o.y) < (view.height / 2) * 0.62;
    });
    if (onScreen) return false;
    const f = showFrame(tiles, view.goal, view.width, view.height, view.insets);
    if (f) { view.glideTo(f); sfx.turn(); }
    return !!f;
  }
  // --- one-time tips: a small card above the tool bar that never blocks the farm ---
  let tipEl: HTMLElement | null = null, tipTimer = 0;
  function showTip(title: string, text: string) {
    tipEl?.remove();
    clearTimeout(tipTimer);
    const el = h('aside.tip-card', { role: 'status', 'aria-live': 'polite' },
      h('b', null, title), h('p', null, text),
      h('button.primary', { onclick: () => { el.remove(); if (tipEl === el) tipEl = null; } }, 'Got it'));
    tipEl = el;
    uiRoot.appendChild(el);
    tipTimer = window.setTimeout(() => { el.remove(); if (tipEl === el) tipEl = null; }, 22000);
  }

  const story = new StoryFlow({
    farm: () => farm,
    panels,
    readAloud: () => settings.readAloud,
    hints: () => settings.hints,
    say,
    changed: () => { dirty = true; refreshHud(); },
    showMe: tiles => showMe(tiles),
    hintTiles: () => play.hintTiles(),
    playing: () => screen === 'farm' && !capture && !glLost,
    showTip,
  });

  /** A tool for something that's off screen: glide there. */
  function showTool() {
    if (play.building || play.placing) return;
    const tiles = play.toolTiles();
    if (!tiles.length) return;
    const visible = tiles.some(t => {
      const p = view.tileOnScreen(t.x, t.z);
      const o = view.openCenter();
      return p.x > view.insets.left + 24 && p.x < view.width - view.insets.right - 24 && Math.abs(p.y - o.y) < (view.height / 2) * 0.62;
    });
    if (!visible) showMe(tiles);
  }
  hud.visible = false;
  const refreshTools = () => {
    hud.setTools(play.tools(), play.building ? (play.buildSub === 'move' ? 'b-move' : play.buildSub === 'erase' ? 'b-erase' : 'b-decor') : play.tool);
    document.documentElement.classList.toggle('building', play.building);
  };
  refreshTools();

  const controller = new Controller(canvas, view, {
    tapTile: (tile, s) => { if (controller.lastDevice === 'touch' || controller.lastDevice === 'mouse') controller.cursor = null; view.showHighlight(tile); flashUntil = performance.now() + 700; play.tap(tile, s.x, s.y); },
    wantsPaint: tile => play.wantsPaint(tile),
    paintTile: tile => play.paint(tile),
    paintEnd: () => play.paintEnd(),
    command: name => {
      if (name === 'menu') { if (panels.back()) return; if (play.placing) play.cancelPlacing(); else if (play.building) play.setBuilding(false); else openMenu(); }
      else if (name === 'back') { if (panels.back()) return; if (play.placing) play.cancelPlacing(); else if (play.building) play.setBuilding(false); else if (play.tool !== 'hand') { play.tool = 'hand'; refreshTools(); } }
      else if (name === 'build') { if (!panels.open) play.setBuilding(!play.building); }
      else if (name === 'undo') play.undoBuild();
      else if (name === 'rotatePiece') play.turnPlacing();
      else if (name === 'tools') { if (!panels.open) hud.focusTools(); }
      else if (name.startsWith('tool')) {
        // the number keys match the labels on the tool bar (Shop is 7, Build 8, Town 9)
        const t = play.tools().find(x => x.key === name.slice(4));
        if (t) { play.pickTool(t.id); showTool(); }
      }
    },
    active: () => screen === 'farm' && !panels.open && !glLost && !hud.toolsFocused,
    reducedMotion: reduced,
  });
  // the tool bar, when it has focus (gamepad X or T): arrows and the d-pad move along it, Enter / A
  // picks a tool, Escape / B goes back to the farm
  hud.tools.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); panels.moveFocus(-1, 0, hud.tools); }
    else if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); panels.moveFocus(1, 0, hud.tools); }
    else if (k === 'Escape') { e.preventDefault(); canvas.focus({ preventScroll: true }); }
  });
  hud.tools.addEventListener('click', () => { if (controller.lastDevice === 'pad' || controller.lastDevice === 'key') canvas.focus({ preventScroll: true }); });
  let flashUntil = 0;

  // --- settings ---
  function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--ts', String([1, 1.15, 1.3][settings.textSize]));
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('colorblind', settings.colorblind);
    root.classList.toggle('left-handed', settings.leftHanded);
    setRailSide(settings.leftHanded ? 'left' : 'right');
    audio.setVolumes(settings.volume);
    if (!settings.readAloud) stopSpeaking();
  }
  applySettings();
  function onSettings(s: Settings) {
    Object.assign(settings, s);
    applySettings();
    resize(); // the open area moves with the tool rail
    if (!capture) saveSettings(settings);
    if (!forced) {
      const want: QualityTier = settings.quality === 'auto' ? governor?.tier ?? guessTier() : settings.quality;
      if (want !== view.tier) view.setQuality(want);
    }
  }
  const openSettings = () => panels.show('Settings', settingsPanel(structuredClone(settings), onSettings));

  // --- screens ---
  let title: HTMLElement | null = null;
  function showTitle() {
    screen = 'title';
    hud.visible = false;
    title?.remove();
    const hasSave = !!loaded && loaded.status !== 'future' && !capture;
    title = h('section.title-screen', { 'aria-label': GAME.title },
      h('h1.logo', null, GAME.title, h('small', null, 'Grow a farm the whole town will love')),
      h('div.title-buttons', null,
        h('button.big.primary', { onclick: () => startFarm() }, hasSave ? 'Keep farming' : 'Start farming'),
        h('button', { onclick: openSettings }, icon('gear', 24), ' Settings')),
      !persistent() && !capture ? h('p.note.storage-note', null, 'This browser can’t keep your farm, so it lasts until you close the game.') : null,
      loaded?.status === 'future' ? h('p.note.storage-note', null, 'Your farm was saved by a newer version of this game, so it stays safe and untouched. This visit plays a new farm that won’t be saved.') : null,
      brokenSave ? h('p.note.storage-note', null, brokenSave.kept
        ? 'Your saved farm couldn’t be read, so a copy is kept safe and untouched. You can start a new farm.'
        : 'Your saved farm couldn’t be read, so it stays safe and untouched. This visit plays a new farm that won’t be saved.') : null);
    uiRoot.appendChild(title);
    requestAnimationFrame(() => title?.querySelector<HTMLElement>('.primary')?.focus({ preventScroll: true }));
  }

  let awayGiven = false;
  function startFarm() {
    audio.unlock();
    title?.remove();
    title = null;
    screen = 'farm';
    hud.visible = true;
    refreshHud();
    canvas.focus({ preventScroll: true });
    // "while you were away": a small, capped head start for growing things (never anything taken)
    if (!awayGiven && loaded?.savedAt && !capture) {
      awayGiven = true;
      const away = (Date.now() - loaded.savedAt) / 1000;
      const bonus = catchUp(farm, away);
      if (bonus >= 60) say(`While you were away, your crops grew for ${Math.round(bonus / 60)} more minute${bonus >= 120 ? 's' : ''}.`);
    }
    if (!capture) story.start();
  }

  function openMenu() {
    if (screen !== 'farm' || panels.open) return;
    const close = () => panels.close();
    panels.show('Menu', h('div.menu-list', null,
      h('button.primary', { onclick: close }, 'Back to the farm'),
      h('button', { onclick: () => { close(); openSettings(); } }, icon('gear', 26), 'Settings'),
      h('button', { onclick: () => { close(); save(); showTitle(); } }, icon('farm', 26), 'Title screen')), { kind: 'card' });
  }

  // --- things that happen on their own ---
  function onEvent(e: SimEvent) {
    switch (e.type) {
      case 'rain-start': say('Rain! Every growing crop gets a drink.'); break;
      case 'compost-ready': say('A bag of compost is ready in the barn.'); break;
      case 'season': say(`${seasonName(e.season as Season)} is here! New seeds are in season.`); break;
      case 'safety-net':
        panels.show('A seed pouch!', h('div', null,
          h('p', null, `Coins are low, so here are ${e.seeds} free plantings of the cheapest seeds. Plant them, pick them and sell them, and you’re back in business!`)),
        { kind: 'card' });
        break;
      case 'new-orders': if (!farm.flags.sawOrders) { farm.flags.sawOrders = 1; say('New orders on the board by the dock!'); } break;
      case 'boat-back': {
        const coins = e.orders.reduce((s, o) => s + o.coins, 0);
        sfx.coins();
        say(`The Little Lark is back from Larkford: +${coins} coins!`);
        break;
      }
      case 'goods-ready': break;
      case 'endless-done':
        sfx.levelUp();
        for (const g of e.goals) say(`Goal done: ${g.text}! +${g.coins} coins.`);
        break;
      case 'coop-done':
        sfx.levelUp();
        panels.show('Co-op order done!', h('p', null, `You and ${NEIGHBOR[e.coop.neighbor]?.who ?? 'your neighbour'} filled the big order together: +${e.coop.coins} coins!`), { kind: 'card' });
        break;
      case 'visit': {
        const n = NEIGHBOR[e.visit.neighbor];
        if (!n) break;
        view.town.startVisit(n.id, performance.now() / 1000);
        const line = VISIT_LINES[e.visit.tier] ?? 'What a lovely farm!';
        say(`${n.who} from ${n.farm} came to visit: “${line}” They left ${e.visit.gift.coins} coins${e.visit.gift.item ? ' and a little gift' : ''}.`);
        break;
      }
      case 'level-up': {
        sfx.levelUp();
        const fresh = CROPS.filter(c => c.level === e.level).map(c => c.name);
        panels.show(`Farm level ${e.level}!`, h('div', null,
          h('p', null, 'Your farm is growing up.'),
          fresh.length ? h('p', null, `New seeds: ${fresh.join(', ')}.`) : null), { kind: 'card' });
        break;
      }
    }
  }

  function refreshHud() {
    const level = levelOf(farm);
    const lo = xpForLevel(level), hi = xpForLevel(level + 1);
    hud.setDate(farm.t);
    hud.setCoins(farm.coins);
    hud.setLevel(level, hi > lo ? (farm.xp - lo) / (hi - lo) : 1);
    if (play.placing || play.building || capture) hud.setGoal(play.hint(), null);
    else { const g = story.goal(); hud.setGoal(g.text, g.progress); }
  }

  // --- saving ---
  let dirty = false;
  let lastSaveT = farm.t;
  /** The browser's storage is full: say so once, keep playing, and try again with every save. */
  let storageFull = false;
  function save() {
    if (capture || futureSave || screen !== 'farm') return;
    farm.cam = { ...view.goal };
    const ok = saveFarm(farm, Date.now());
    lastSaveT = farm.t;
    dirty = false;
    if (!ok && persistent() && !storageFull) {
      storageFull = true;
      panels.show('Out of room to save', h('div', null,
        h('p', null, 'This browser has run out of room to save your farm.'),
        h('p', null, 'Don’t worry: your farm is still here, and the last save is safe. Keep playing! The game will save again as soon as there is room.'),
        h('p.note', null, 'A grown-up can make room by closing other tabs or freeing up space on this device.')), { kind: 'card', keepsTime: true });
    } else if (ok && storageFull) {
      storageFull = false;
      say('Your farm is saving again.');
    }
  }
  document.addEventListener('visibilitychange', () => {
    audio.setHidden(document.hidden);
    if (document.hidden) save();
  });
  addEventListener('pagehide', save);

  // --- the 3D drawing can be lost (a phone under pressure): pause with a friendly card ---
  let glCard: HTMLElement | null = null;
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    glLost = true;
    glCard = h('div.glcard', { role: 'alert' }, h('p.storage-note', null, 'Taking a little break… the farm will be back in a moment.'));
    uiRoot.appendChild(glCard);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    glLost = false;
    view.setQuality(view.tier);
    glCard?.remove();
    glCard = null;
  });

  // Escape closes the top panel; the arrow keys move between its buttons
  addEventListener('keydown', e => {
    if (!panels.open) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && e.key !== 'Escape') return;
    if (e.key === 'Escape') { e.preventDefault(); panels.back(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); panels.moveFocus(0, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); panels.moveFocus(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); panels.moveFocus(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); panels.moveFocus(-1, 0); }
  });

  // --- the gesture that unlocks sound ---
  const unlock = () => audio.unlock();
  addEventListener('pointerdown', unlock, { passive: true });
  addEventListener('keydown', unlock);

  // safe-area insets, measured once per resize from a probe element
  const insetProbe = h('div', { style: 'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)' });
  document.body.appendChild(insetProbe);
  function resize() {
    const cs = getComputedStyle(insetProbe);
    const px = (v: string) => parseFloat(v) || 0;
    view.resize(innerWidth, innerHeight, { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) });
  }
  addEventListener('resize', resize);
  resize();
  // a new farm (or a capture without a zoom) starts framed on the farmhouse and its fields
  if (!(farm.cam.zoom > 0)) {
    // the style frame shows its whole corner where it fits, otherwise the farmhouse and fields like any start
    const corner = scene === 'styleframe' ? startFrame(farm, view.width, view.height, view.insets, styleFramePoints(farm), [0]) : null;
    const home = scene === 'styleframe' ? [...farm.objects.filter(o => o.def === 'cottage' || (o.kind === 'field' && o.x <= 39 && o.z <= 39)).flatMap(objPoints), ...boxPoints(35, 42.5, 38, 44.5, 0, 0)] : undefined;
    const f = corner?.fits ? corner : startFrame(farm, view.width, view.height, view.insets, home);
    farm.cam = { x: f.x, z: f.z, yawStep: f.yawStep, zoom: f.zoom };
    Object.assign(view.goal, farm.cam);
    view.snapToGoal();
  }

  // --- the loop ---
  /** Draw calls and triangles of the last frames (the hook reports the steady and the busiest). */
  const drawnLog: [number, number][] = [];
  let last = performance.now();
  let fps = 60;
  let lastPadA = 0;
  let hudAt = 0;
  function frame(now: number) {
    const real = Math.min(0.25, (now - last) / 1000);
    last = now;
    const dt = Math.min(0.1, real);
    fps = fps * 0.95 + (real > 0 ? 1 / real : 60) * 0.05;
    const pad = controller.update(dt);
    // menus by gamepad: d-pad moves focus, A presses, B goes back
    if (pad && !panels.open && screen === 'farm' && hud.toolsFocused) {
      if (pad.pressed.has('left') || pad.pressed.has('up')) panels.moveFocus(-1, 0, hud.tools);
      if (pad.pressed.has('right') || pad.pressed.has('down')) panels.moveFocus(1, 0, hud.tools);
      if (pad.pressed.has('a') && now - lastPadA > 200) { lastPadA = now; (document.activeElement as HTMLElement | null)?.click(); canvas.focus({ preventScroll: true }); }
      if (pad.pressed.has('b')) canvas.focus({ preventScroll: true });
    } else if (pad && (panels.open || screen === 'title')) {
      const scope = panels.topEl ?? title;
      if (pad.pressed.has('up')) panels.moveFocus(0, -1, scope);
      if (pad.pressed.has('down')) panels.moveFocus(0, 1, scope);
      if (pad.pressed.has('left')) panels.moveFocus(-1, 0, scope);
      if (pad.pressed.has('right')) panels.moveFocus(1, 0, scope);
      if (pad.pressed.has('a') && now - lastPadA > 200) { lastPadA = now; (document.activeElement as HTMLElement | null)?.click(); }
      if (pad.pressed.has('b')) panels.back();
    }
    const playing = screen === 'farm' && !panels.stopsTime && !document.hidden && !glLost;
    if (playing) for (const e of advance(farm, dt * speed)) onEvent(e);
    if (screen === 'farm') {
      if (now - hudAt > 200) { hudAt = now; refreshHud(); story.tick(); }
      if (farm.t - lastSaveT > 30 || (dirty && farm.t - lastSaveT > 3)) save();
    }
    view.setReducedMotion(reduced());
    view.setWorld(seasonOf(farm.t), farm.unlocked);
    view.objects.badges = settings.colorblind;
    view.syncFarm(farm, onLockedLand(farm));
    view.animals.update(farm, now / 1000, view.view.yaw, reduced());
    view.town.update(farm, now / 1000, reduced());
    const shown = controller.cursor ?? (controller.lastDevice === 'mouse' ? controller.hover : null);
    if (play.placing) {
      // the mouse and the gamepad cursor carry the ghost; touch moves it with taps
      if (shown) {
        const p = play.placing;
        const before = `${p.at.x},${p.at.z}`;
        play.moveGhost(shown);
        if (`${p.at.x},${p.at.z}` === before && !p.moved) p.moved = true;
      }
      const p = play.placing;
      const occ = occupancy(farm);
      if (p.item.kind === 'move') occ.forEach((id, k) => { if (id === (p.item as { id: number }).id) occ.delete(k); });
      const ax = Math.min(55, Math.max(0, p.at.x)), az = Math.min(55, Math.max(0, p.at.z));
      const level = tileAtMap(ax, az).level;
      const model = itemModel(farm, p.item);
      ghost.show(model.key, model.make, p.at, itemSize(farm, p.item), (x, z) => tileFits(farm, x, z, level, occ));
      view.objects.hiddenId = p.item.kind === 'move' ? p.item.id : null;
      view.showHighlight(null);
    } else {
      ghost.hide();
      view.objects.hiddenId = null;
      if (shown) view.showHighlight(shown);
      else if (now > flashUntil) view.showHighlight(null);
    }
    refreshPlaceBar();
    if (!glLost) {
      view.update(dt, farm.t);
      view.render(dt);
      const st = view.stats();
      drawnLog.push([st.drawCalls, st.triangles]);
      if (drawnLog.length > 90) drawnLog.shift();
    }
    if (governor && screen === 'farm') {
      const next = governor.sample(real);
      if (next) view.setQuality(next);
    }
    requestAnimationFrame(frame);
  }

  // --- the read-only test hook: copies only, never changes the farm or its save ---
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => structuredClone({
        screen, capture, panel: panels.open, t: farm.t, season: seasonOf(farm.t), coins: farm.coins, xp: farm.xp, level: levelOf(farm),
        unlocked: [...farm.unlocked], tool: play.tool, seed: play.seed, inv: farm.inv, freeSeeds: farm.freeSeeds,
        fields: farm.objects.filter(o => o.kind === 'field').map(o => ({ x: o.x, z: o.z, crop: o.kind === 'field' ? o.crop : null, ready: o.kind === 'field' && !!o.crop && farm.t >= o.readyAt, watered: o.kind === 'field' && o.watered })),
        camera: { ...view.goal, yaw: view.view.yaw / YAW_STEP }, cursor: controller.cursor, lastDevice: controller.lastDevice,
        quality: view.tier, fps: Math.round(fps), persistent: persistent(), audio: audio.state, ...view.stats(),
        drawn: drawnLog.length ? {
          calls: [Math.min(...drawnLog.map(d => d[0])), Math.max(...drawnLog.map(d => d[0]))],
          triangles: [Math.min(...drawnLog.map(d => d[1])), Math.max(...drawnLog.map(d => d[1]))],
        } : null,
      }),
      /** Where a tile's middle is on screen (CSS px), for tests that tap it. */
      tileOnScreen: (x: number, z: number) => { const p = view.tileOnScreen(x, z); return { x: p.x, y: p.y }; },
      /** What a tap at (x, y) would pick. */
      pickAt: (x: number, y: number) => view.pick(x, y),
      openArea: () => { const c = view.openCenter(); return { x: c.x, y: c.y }; },
      /** Where the farmhouse and fields are on screen now, the open area, and how wide a tile is at the target. */
      startView: () => ({
        open: openArea(view.width, view.height, view.insets),
        points: startPoints(farm).map(p => { const s = view.project(p.x, p.y, p.z); return { x: s.x, y: s.y }; }),
        tilePx: tileWidthOnScreen(view.camera, view.width, view.height, view.view.x, view.view.y, view.view.z),
      }),
    }),
  });

  $('#boot').classList.add('done');
  setTimeout(() => $('#boot').remove(), 500);
  if (scene === 'farm' || staged || scene === 'styleframe') {
    startFarm();
    // capture scenes for the website's previews and the trailer
    if (scene === 'build') play.setBuilding(true);
    if (scene === 'fair') { farm.flags.fairEarly = 1; story.openFair(false); }
    if (scene === 'ending') { farm.story.chapter = CHAPTERS.length; farm.story.creditsSeen = false; story.showCredits(); }
  }
  else showTitle();
  requestAnimationFrame(frame);

}

if (window.__noWebGL2) {
  Object.defineProperty(window, GAME.hook, { value: Object.freeze({ title: GAME.title, snapshot: () => ({ screen: 'no-webgl' }) }) });
} else {
  try {
    boot();
  } catch (err) {
    // the 3D engine couldn't start: say so kindly instead of showing a blank page
    console.warn(err);
    document.getElementById('boot')?.remove();
    document.body.appendChild(h('div.early', { role: 'alert', 'data-testid': 'no-webgl' },
      h('h1', null, 'The farm couldn’t start'), h('p', null, 'This device couldn’t start the 3D drawing. Try reloading, or another browser.'),
      h('button', { onclick: () => location.reload() }, 'Try again')));
  }
}

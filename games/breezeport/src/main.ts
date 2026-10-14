/**
 * Breezeport: boot, the screens (title, town), the loop, saving, and the read-only test hook.
 *
 * Capture routes for the website's previews and the review shots (they never read or write a save):
 *   ?scene=styleframe  the phase 0 style frame (one block of the seaside town)
 *   ?scene=title       the title screen over the style frame
 *   ?scene=town        a brand-new town (&seed=)
 *   ?scene=showcase    a big, grown Breezeport near the end of the story (&seed=; &festival=1 for the
 *                      festival night; &hud=0 hides the interface; &map=happy|traffic|green|svc:school
 *                      shows a map)
 *   (&quality=low|medium|high &zoom= &yaw= &x= &z= &t= &season=)
 * ?speed=N (1–120) runs town time faster, for tests.
 */
import './style.css';
import { GAME } from './config';
import { audio, sfx } from './audio/engine';
import { music } from './audio/music';
import { THING } from './data/things';
import { PARK_LOOP, STANDING, styleFrameCity, styleFramePoints } from './game/styleframe';
import { showcaseTown } from './game/showcase';
import { Play, type Overlay } from './game/play';
import { StoryFlow } from './game/storyFlow';
import { CHAPTERS } from './data/chapters';
import { CAST } from './data/cast';
import { Controller } from './input/controller';
import { frameView, startZoomMin, tileWidthOnScreen, YAW_STEP, ZOOM } from './render/camera';
import { startFrame } from './game/framing';
import { Ghost } from './render/ghost';
import { Governor, guessTier, isSoftwareRenderer, urlTier, type QualityTier } from './render/quality';
import { StreetLife } from './render/streetlife';
import { CityView } from './render/view';
import { infoCard } from './ui/info';
import { thought, wishFor } from './ui/thought';
import { cityHallPanel } from './ui/cityhall';
import { districts } from './sim/districts';
import { seaEdge } from './sim/map';
import { titleScreen } from './ui/title';
import { loadSettings, saveSettings, type Settings } from './save/settings';
import { loadSlot, saveSlot, BACKUP_EVERY, type SlotNo } from './save/slots';
import { persistent } from './save/storage';
import { dateLabel, DAY_SEC, duskAmount, SEASON_DAYS, SEASONS, seasonName, seasonOf, type Season } from './sim/clock';
import { newTown } from './sim/newtown';
import { RFLAG, type Town } from './sim/state';
import { Sim, type SimEvent } from './sim/tick';
import { entryOf } from './sim/traffic';
import { toolOpen } from './sim/unlocks';
import { centerOf } from './sim/world';
import { h } from './ui/h';
import { Hud, TOOLS, type ToolId } from './ui/hud';
import { openArea, setRailSide } from './ui/layout';
import { Panels } from './ui/panels';
import { settingsPanel } from './ui/settingsPanel';
import { speak, stopSpeaking } from './ui/speech';
import { icon } from './ui/icons';

declare global { interface Window { __noWebGL2?: boolean } }

const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const capture = scene !== null;
const num = (k: string) => (params.has(k) && Number.isFinite(Number(params.get(k))) ? Number(params.get(k)) : null);
const speed = Math.min(120, Math.max(1, num('speed') ?? 1));

function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#town')!;
  const uiRoot = document.querySelector<HTMLElement>('#ui')!;
  const settings: Settings = loadSettings();

  // the town on screen: the style frame (title and captures) until a slot is opened
  let town: Town = scene === 'town' ? newTown(num('seed') ?? 7) : scene === 'showcase' ? showcaseTown(num('seed') ?? 7) : styleFrameCity(num('seed') ?? 7);
  if (scene === 'styleframe' || scene === 'title' || !scene) {
    const wanted = params.get('season') as Season | null;
    const si = wanted && SEASONS.includes(wanted) ? SEASONS.indexOf(wanted) : 1;
    town.t = (num('t') ?? DAY_SEC * 0.38) + si * SEASON_DAYS * DAY_SEC + DAY_SEC;
  } else if (num('t') !== null) town.t = num('t')!;
  let slot: SlotNo | null = null;
  let sim = new Sim(town);

  const forced = urlTier();
  let tier: QualityTier = forced ?? (settings.quality === 'auto' ? guessTier() : settings.quality);
  const view = new CityView(canvas, { x: town.cam.x, z: town.cam.z, yawStep: num('yaw') ?? town.cam.yawStep, zoom: num('zoom') ?? 0 }, tier !== 'low');
  try {
    const gl = view.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (isSoftwareRenderer(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '')) tier = 'low';
  } catch { /* no renderer info */ }
  const governor = settings.quality === 'auto' && !forced && !capture ? new Governor(tier) : null;
  view.setQuality(tier);
  const ghost = new Ghost();
  view.scene.add(ghost.group);

  const panels = new Panels(uiRoot);
  type Screen = 'title' | 'town';
  let screen: Screen = scene === 'town' || scene === 'styleframe' || scene === 'showcase' ? 'town' : 'title';
  let glLost = false;

  // --- street life: drawn from the town (the citizen and traffic simulations drive it from phase 4) ---
  let lifeKey = '';
  function refreshLife(force = false) {
    const pop = sim.census.population;
    const key = `${town.version}|${Math.round(pop / 10)}`;
    if (view.life) view.life.load = sim.traffic;
    if (!force && key === lifeKey) return;
    lifeKey = key;
    const staged = town === styleTown;
    const tier = view.tier === 'low' ? 0 : view.tier === 'medium' ? 1 : 2;
    const carTrips = sim.trips?.car ?? 0;
    const counts = staged ? { cars: 16, buses: 1, walkers: 64 } : { cars: Math.min([30, 50, 70][tier]!, Math.round(carTrips / 6)), buses: 0, walkers: 0 };
    const life = new StreetLife(town, town.seed * 13 + 1, counts, staged ? [PARK_LOOP] : []);
    if (staged) for (const [x, z, hd] of STANDING) life.addStanding(x, z, hd);
    else {
      const c = sim.census;
      const places = town.things.filter(t => { const d = THING[t.def]; return d && (d.class === 'shop' || d.class === 'work' || d.class === 'park' || d.class === 'civic' || d.class === 'transit' || d.class === 'landmark'); }).map(t => entryOf(town, t));
      life.setTrips(c.homes.map(h => ({ id: h.id, entry: entryOf(town, h) })), places, Math.min([80, 150, 220][tier]!, Math.round(pop / 2.5)));
      life.setRoutes(town.routes.map(r => ({ ids: r.stops, entries: r.stops.map(id => { const t = town.things.find(x => x.id === id); return t ? entryOf(town, t) : -1; }), color: r.color })));
      // a tram for every 24 tiles of track (when there are stops to serve), riders on the bike lanes
      let tramTiles = 0, bikeTiles = 0;
      for (let i = 0; i < town.rflags.length; i++) { if (!town.roads[i]) continue; if (town.rflags[i]! & RFLAG.tram) tramTiles++; if (town.rflags[i]! & RFLAG.bike) bikeTiles++; }
      const tramStops = town.things.some(t => t.def === 'tramstop');
      life.setLanes(tramStops && tramTiles >= 6 ? Math.min(4, Math.ceil(tramTiles / 24)) : 0, Math.min([12, 24, 36][tier]!, Math.round(bikeTiles / 3), 2 + Math.round((sim.trips?.bike ?? 0) / 2)));
    }
    life.load = sim.traffic;
    view.setLife(life);
  }
  const styleTown = town;

  // --- feedback: floating numbers over tiles, and spoken lines ---
  const floats = h('div.floats', { 'aria-hidden': 'true' });
  uiRoot.appendChild(floats);
  function float(x: number, z: number, text: string, kind: 'good' | 'info' = 'good') {
    const p = view.project(x, 0.9, z);
    const el = h('span.float', { class: kind, style: `left:${p.x}px;top:${p.y - 30}px` }, text);
    floats.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
  // district names float over the town when you zoom out (districts grow by themselves)
  const labels = h('div.district-labels', { 'aria-hidden': 'true' });
  uiRoot.appendChild(labels);
  let labelKey = '', labelList: { el: HTMLElement; x: number; z: number }[] = [];
  function placeLabels() {
    const far = screen === 'town' && view.view.zoom < 46 && !panels.open;
    labels.hidden = !far;
    if (!far) return;
    const key = `${town.version}|${town.things.length}`;
    if (key !== labelKey) {
      labelKey = key;
      labels.replaceChildren();
      labelList = districts(town).filter(d => d.homes + d.shops + d.works + d.parks >= 6).map(d => {
        const el = h('span.district', { class: d.kind === 'Downtown' ? 'downtown' : d.kind === 'Waterfront' ? 'waterfront' : d.kind === 'Park district' ? 'park' : 'suburbs' }, d.kind);
        labels.appendChild(el);
        return { el, x: d.x + 1, z: d.z + 1 };
      });
    }
    for (const l of labelList) {
      const p = view.project(l.x, 2.4, l.z);
      l.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
    }
  }
  function say(text: string) {
    panels.toast(text);
    if (settings.readAloud) speak(text);
  }

  // --- the HUD and the tools ---
  let dirty = false;
  /** The Bay Festival's night is showing (the story's ending). */
  let festivalOn = false;
  const hud = new Hud(uiRoot, {
    menu: () => openMenu(),
    turn: dir => { controller.turn(dir); sfx.turn(); },
    zoom: dir => { view.goal.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, view.goal.zoom * (dir > 0 ? 1.3 : 1 / 1.3))); },
    tool: id => { play.pickTool(id); refreshTools(); },
    goals: () => story.openGoals(),
  });
  const play = new Play({
    town: () => town, sim: () => sim, view, ghost, panels, root: uiRoot, say, float,
    changed: () => { dirty = true; },
    toolChanged: () => refreshTools(),
    info: id => openInfo(id),
    cityHall: () => openCityHall(),
    overlay: (o: Overlay) => { if (o !== 'off' && !town.flags.openedMaps) { town.flags.openedMaps = 1; dirty = true; } view.setOverlay(o, sim.census, settings.colorblind, sim.traffic); },
  });
  const story = new StoryFlow({
    town: () => town, sim: () => sim, panels, say, readAloud: () => settings.readAloud,
    openCreative: () => { if (!settings.creative) { settings.creative = true; if (!capture) saveSettings(settings); } },
    changed: () => { dirty = true; refreshTools(); },
    festival: () => festival(),
  });
  const openTools = () => TOOLS.map(t => t.id).filter(id => toolOpen(town, id));
  function refreshTools() { hud.setTools(openTools(), play.tool); }

  const controller = new Controller(canvas, view, {
    tapTile: (tile, s, via) => {
      if (screen !== 'town') return;
      // a tap on a citizen (Look): their thought bubble
      if (play.tool === 'look' && !play.placing && via !== 'pad' && via !== 'key') {
        const who = view.citizenAt(s.x, s.y);
        if (who) { showThought(who); return; }
      }
      play.tapTile(tile, via);
    },
    wantsPaint: tile => screen === 'town' && play.wantsPaint(tile),
    paintTile: tile => play.paintTile(tile),
    paintEnd: () => play.paintEnd(),
    command: name => {
      if (screen !== 'town') return;
      if (name === 'menu') { if (!play.back()) openMenu(); }
      else if (name === 'back') play.back();
      else if (name === 'tools') hud.focusTools();
      else if (name === 'maps') { play.pickTool('maps'); refreshTools(); }
      else if (name === 'undo') play.undoLast();
      else if (name === 'rotatePiece') play.turnPlacing();
      else if (name.startsWith('tool')) { const id = openTools()[Number(name.slice(4)) - 1]; if (id) { play.pickTool(id); refreshTools(); } }
    },
    active: () => screen === 'town' && !panels.open && !glLost && !hud.toolsFocused,
    reducedMotion: () => settings.reducedMotion,
  });
  hud.tools.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); panels.moveFocus(-1, 0, hud.tools); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); panels.moveFocus(1, 0, hud.tools); }
    else if (e.key === 'Escape') { e.preventDefault(); canvas.focus({ preventScroll: true }); }
  });

  // --- settings ---
  function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--ts', String([1, 1.15, 1.3][settings.textSize]));
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('colorblind', settings.colorblind);
    root.classList.toggle('left-handed', settings.leftHanded);
    setRailSide(settings.leftHanded ? 'left' : 'right');
    audio.setVolumes(settings.volume);
    view.setReducedMotion(settings.reducedMotion);
    if (!settings.readAloud) stopSpeaking();
  }
  applySettings();
  function onSettings(s: Settings) {
    Object.assign(settings, s);
    applySettings();
    resize();
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
    festivalOn = false;
    view.festival.set(town, false);
    play.cancel();
    hud.visible = false;
    play.tray.hidden = true;
    title?.remove();
    if (town !== styleTown) { town = styleTown; sim = new Sim(town); refreshLife(true); frameStyle(); }
    title = titleScreen({
      settings, persistent: persistent() && !capture, panels,
      open: n => openSlot(n),
      create: (n, mode, name) => createTown(n, mode, name),
      settingsPanel: openSettings,
    });
    uiRoot.appendChild(title);
  }

  function openSlot(n: SlotNo) {
    const r = loadSlot(n);
    if (!r.town) {
      if (r.status === 'future') say('That town was saved by a newer version of the game, so it stays safe and untouched.');
      else if (r.status === 'broken') say(r.kept ? 'That town couldn’t be read. A copy is kept safe.' : 'That town couldn’t be read, so it stays safe and untouched.');
      return;
    }
    if (r.fromBackup) say('Your last save couldn’t be read, so your town from a few minutes before is back.');
    enterTown(r.town, n);
  }

  function createTown(n: SlotNo, mode: Town['mode'], name: string) {
    const t = newTown(Math.floor(Math.random() * 2 ** 31), mode);
    t.name = name;
    enterTown(t, n);
    save(true);
  }

  function enterTown(t: Town, n: SlotNo | null) {
    audio.unlock();
    town = t;
    slot = n;
    sim = new Sim(town);
    title?.remove();
    title = null;
    screen = 'town';
    hud.visible = true;
    settings.lastSlot = n ?? settings.lastSlot;
    if (!capture) saveSettings(settings);
    if (!(town.cam.zoom > 0)) frameStart();
    else { Object.assign(view.goal, town.cam); view.snapToGoal(); }
    lastSaveT = town.t;
    refreshLife(true);
    play.pickTool('look');
    refreshTools();
    refreshHud();
    canvas.focus({ preventScroll: true });
    if (!capture) story.start();
  }

  function openMenu() {
    if (screen !== 'town' || panels.open) return;
    const close = () => panels.close();
    panels.show('Menu', h('div.menu-list', null,
      h('button.primary', { onclick: close }, `Back to ${town.name}`),
      h('button', { onclick: () => { close(); openCityHall(); } }, icon('cityhall', 26), 'City Hall: budget and numbers'),
      h('button', { onclick: () => { close(); openSettings(); } }, icon('gear', 26), 'Settings'),
      h('button', { onclick: () => { close(); save(true); showTitle(); } }, icon('look', 26), 'Save and go to the title screen')), { kind: 'card' });
  }

  function openInfo(id: number) {
    const thing = town.things.find(t => t.id === id);
    if (!thing) return;
    if (thing.def === 'cityhall') { openCityHall(); return; }
    panels.show(THING[thing.def]!.name, infoCard(town, sim.refresh(), thing, { play, say, changed: () => { dirty = true; } }), { kind: 'card', keepsTime: true });
  }
  /** A citizen's thought bubble: what their home wishes for most, with Show me. */
  function showThought(who: { x: number; z: number; home?: number }) {
    const home = who.home ? town.things.find(t => t.id === who.home) : undefined;
    const n = home ? sim.census.needs.get(home.id) : undefined;
    const p = view.project(who.x, 0.6, who.z);
    thought(uiRoot, p.x, p.y, wishFor(n, town), home ? () => { const c = centerOf(home); view.glideTo({ x: c.x, z: c.z }); } : null);
    sfx.tap();
    if (settings.readAloud) speak(wishFor(n, town));
  }
  function openCityHall() {
    if (!town.flags.openedCityHall) { town.flags.openedCityHall = 1; dirty = true; }
    panels.show('City Hall', cityHallPanel(town, sim.refresh(), sim.trips, { say, changed: () => { dirty = true; sim.refresh(true); } }), { keepsTime: true });
  }

  /** The Bay Festival: night falls, lanterns and kites, then the credits. */
  function festival() {
    town.story.creditsSeen = true;
    dirty = true;
    sfx.cheer();
    // night falls over the festival: lanterns, kites and fireworks, framed on the stage
    festivalOn = true;
    view.festival.set(town, true);
    const heart = town.things.find(t => t.def === 'stage') ?? town.things.find(t => t.def === 'cityhall');
    // frame the stage with the beach and the bay behind it, where the kites and fireworks are
    if (heart) { const c = centerOf(heart); view.glideTo({ x: c.x, z: (c.z + seaEdge(c.x)) / 2 + 2, zoom: 44 }); }
    say(`The Bay Festival begins! The whole bay has come to ${town.name}.`);
    setTimeout(credits, settings.reducedMotion ? 4000 : 12000);
  }
  function credits() {
    if (!festivalOn) return;
    panels.show('The Bay Festival!', h('div.credits', null,
      h('p.big-line', null, `The whole bay came to ${town.name}! Lanterns glow, kites fly over the beach, and everyone dances by the stage.`),
      h('h3', null, 'With'),
      h('ul.cast', null, ...CAST.map(p => h('li', null, h('b', null, p.name), ` ${p.role}`))),
      h('h3', null, 'Made for'),
      h('p', null, 'AI Kids Games, with Claude. Every building, car and citizen was made in code, and every sound was made with music synths.'),
      h('p.note', null, 'Thank you for playing! Your town keeps going: new goals arrive, and Creative mode is always there.'),
      h('button.big.primary', { onclick: () => { panels.close(); festivalOn = false; view.festival.set(town, false); } }, 'Back to my town')), { kind: 'full', noClose: true });
  }
  void CHAPTERS;

  // --- things that happen by themselves ---
  function onEvent(e: SimEvent) {
    switch (e.type) {
      case 'built': { const c = centerOf(e.thing); if (onScreen(c.x, c.z)) sfx.built(); break; }
      case 'level-up': { const c = centerOf(e.thing); float(c.x, c.z, `${THING[e.thing.def]!.name}!`, 'info'); sfx.levelUp(); break; }
      case 'collected': { const c = centerOf(e.thing); if (onScreen(c.x, c.z)) { float(c.x, c.z, `+${e.coins}`); sfx.coins(); } break; }
      case 'grant':
        panels.show('A city grant!', h('div', null, h('p', null, `Coins were running low, so the region sent ${town.name} a city grant. Coins are back up, and upkeep is half price for a day.`), h('p.note', null, 'Tip: homes pay a little to the town every minute, and shops’ coin bubbles fill as people shop.')), { kind: 'card' });
        break;
      case 'first-family': say('The first family moved in! Welcome home.'); sfx.cheer(); break;
      case 'season': say(`${seasonName(e.season)} is here!`); break;
      case 'new-day': break;
    }
  }
  const onScreen = (x: number, z: number) => { const p = view.project(x, 0, z); return p.x > 0 && p.y > 0 && p.x < view.width && p.y < view.height && !p.behind; };

  function refreshHud() {
    const c = sim.census;
    hud.set({ date: dateLabel(town.t), population: c.population, happiness: c.happy, coins: town.coins, creative: town.mode === 'creative' });
    if (town === styleTown) { hud.setGoal('Open the park', 0.66); return; }
    const hint = play.hint();
    if (hint) hud.setGoal(hint, null);
    else { const g = story.goal(); hud.setGoal(g.text, g.progress); }
  }

  // --- saving: every 30 s of play when something changed, and whenever the page hides or closes ---
  let lastSaveT = town.t, lastBackupT = -Infinity, storageFull = false;
  function save(force = false) {
    if (capture || screen !== 'town' || slot === null) return;
    if (!force && !dirty && town.t - lastSaveT < 30) return;
    town.cam = { x: view.goal.x, z: view.goal.z, yawStep: view.goal.yawStep, zoom: view.goal.zoom };
    const backup = town.t - lastBackupT >= BACKUP_EVERY;
    const r = saveSlot(slot, town, sim.census.population, backup);
    if (r === 'ok' && backup) lastBackupT = town.t;
    lastSaveT = town.t;
    dirty = false;
    if (r !== 'ok' && persistent() && !storageFull) {
      storageFull = true;
      panels.show('Out of room to save', h('div', null,
        h('p', null, 'This browser has run out of room to save your town.'),
        h('p', null, 'Don’t worry: your town is still here, and the last save is safe. Keep playing! The game will save again as soon as there is room.'),
        h('p.note', null, 'A grown-up can make room by closing other tabs or freeing up space on this device.')), { kind: 'card', keepsTime: true });
    } else if (r === 'ok' && storageFull) { storageFull = false; say('Your town is saving again.'); }
  }
  document.addEventListener('visibilitychange', () => { audio.setHidden(document.hidden); if (document.hidden) save(true); });
  addEventListener('pagehide', () => save(true));

  // --- the 3D drawing can be lost (a phone under pressure): pause with a friendly card ---
  let glCard: HTMLElement | null = null;
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    glLost = true;
    glCard = h('div.glcard', { role: 'alert' }, h('p.storage-note', null, 'Taking a little break… the town will be back in a moment.'));
    uiRoot.appendChild(glCard);
  });
  canvas.addEventListener('webglcontextrestored', () => { glLost = false; view.setQuality(view.tier); glCard?.remove(); glCard = null; });

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
  const unlock = () => audio.unlock();
  addEventListener('pointerdown', unlock, { passive: true });
  addEventListener('keydown', unlock);

  // safe-area insets, measured once per resize from a probe element (Fieldlark's way)
  const insetProbe = h('div', { style: 'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)' });
  document.body.appendChild(insetProbe);
  function resize() {
    const cs = getComputedStyle(insetProbe);
    const px = (v: string) => parseFloat(v) || 0;
    view.resize(innerWidth, innerHeight, { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) });
  }
  addEventListener('resize', resize);
  resize();

  function frameStyle() {
    const f = frameView(styleFramePoints(), view.width, view.height, openArea(view.width, view.height, view.insets), 0, { yaws: [view.goal.yawStep], minZoom: startZoomMin(view.width, view.height), maxZoom: ZOOM.max, fill: 0.86 });
    Object.assign(view.goal, { x: num('x') ?? f.x, z: num('z') ?? f.z, zoom: num('zoom') ?? f.zoom });
    view.snapToGoal();
  }
  /** A new town starts framed on City Hall and Main Street. */
  function frameStart() {
    const f = startFrame(view.width, view.height, view.insets);
    Object.assign(view.goal, { x: num('x') ?? f.x, z: num('z') ?? f.z, zoom: num('zoom') ?? f.zoom, yawStep: num('yaw') ?? 0 });
    view.snapToGoal();
  }
  if (town === styleTown) frameStyle(); else frameStart();
  refreshLife(true);

  // --- the loop ---
  const drawnLog: [number, number][] = [];
  let last = performance.now(), fps = 60, hudAt = 0;
  function frame(now: number) {
    const real = Math.min(0.25, (now - last) / 1000);
    last = now;
    const dt = Math.min(0.1, real);
    fps = fps * 0.95 + (real > 0 ? 1 / real : 60) * 0.05;
    const pad = controller.update(dt);
    if (pad && (panels.open || screen === 'title')) {
      const scope = panels.topEl ?? title;
      if (pad.pressed.has('up')) panels.moveFocus(0, -1, scope);
      if (pad.pressed.has('down')) panels.moveFocus(0, 1, scope);
      if (pad.pressed.has('left')) panels.moveFocus(-1, 0, scope);
      if (pad.pressed.has('right')) panels.moveFocus(1, 0, scope);
      if (pad.pressed.has('a')) (document.activeElement as HTMLElement | null)?.click();
      if (pad.pressed.has('b')) panels.back();
    }
    const playing = screen === 'town' && town !== styleTown && !panels.stopsTime && !document.hidden && !glLost;
    if (playing) for (const e of sim.advance(dt * speed)) onEvent(e);
    if (screen === 'town') {
      if (now - hudAt > 200) { hudAt = now; refreshHud(); refreshLife(); if (town !== styleTown && !panels.open) story.tick(); }
      save();
    }
    play.hover(controller.cursor ?? (controller.lastDevice === 'mouse' ? controller.hover : null));
    view.marks.cursor(controller.cursor && !play.placing ? controller.cursor : null);
    view.setWorld(seasonOf(town.t));
    view.syncCity(town);
    // captures keep the music off (trailers have their own soundtrack)
    music.on = !capture;
    music.mode = screen === 'title' ? 'title' : festivalOn ? 'festival' : 'town';
    music.update(seasonOf(town.t), festivalOn ? 0 : duskAmount(town.t));
    if (!glLost) {
      // the festival is always at night
      view.update(dt, festivalOn ? Math.floor(town.t / DAY_SEC) * DAY_SEC + DAY_SEC * 0.95 : town.t);
      view.render(dt);
      placeLabels();
      const st = view.stats();
      drawnLog.push([st.drawCalls, st.triangles]);
      if (drawnLog.length > 90) drawnLog.shift();
    }
    if (governor && screen === 'town') { const next = governor.sample(real); if (next) view.setQuality(next); }
    requestAnimationFrame(frame);
  }

  // --- the read-only test hook: copies only ---
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => structuredClone({
        screen: screen === 'town' ? 'city' : screen, capture, slot, mode: town.mode, name: town.name, t: town.t, coins: Math.floor(town.coins),
        population: sim.census.population, happy: sim.census.happy, demand: sim.census.demand, chapter: town.story.chapter,
        things: town.things.length, roads: town.roads.reduce((n, r) => n + (r ? 1 : 0), 0), routes: town.routes.length,
        tool: play.tool, sub: play.sub, placing: play.placing ? { ...play.placing } : null, panel: panels.open,
        camera: { ...view.goal, yaw: view.view.yaw / YAW_STEP }, cursor: controller.cursor, lastDevice: controller.lastDevice,
        quality: view.tier, fps: Math.round(fps), persistent: persistent(), audio: audio.state, reducedMotion: settings.reducedMotion, season: seasonOf(town.t),
        ...view.stats(),
        drawn: drawnLog.length ? {
          calls: [Math.min(...drawnLog.map(d => d[0])), Math.max(...drawnLog.map(d => d[0]))],
          triangles: [Math.min(...drawnLog.map(d => d[1])), Math.max(...drawnLog.map(d => d[1]))],
        } : null,
      }),
      tileOnScreen: (x: number, z: number) => { const p = view.tileOnScreen(x, z); return { x: p.x, y: p.y }; },
      pickAt: (x: number, y: number) => view.pick(x, y),
      openArea: () => openArea(view.width, view.height, view.insets),
      tilePx: () => tileWidthOnScreen(view.camera, view.width, view.height, view.view.x, 0, view.view.z),
    }),
  });

  document.querySelector('#boot')!.classList.add('done');
  setTimeout(() => document.querySelector('#boot')?.remove(), 500);
  if (screen === 'title') showTitle();
  else if (scene === 'town' || scene === 'showcase') {
    enterTown(town, null);
    if (params.get('festival') === '1') { festivalOn = true; view.festival.set(town, true); }
    if (params.get('hud') === '0') { hud.visible = false; play.tray.hidden = true; uiRoot.classList.add('bare'); }
    // a map over the town for previews (it is drawn on the ground, so the canvas shows it)
    const map = params.get('map');
    if (map && /^(happy|traffic|green|svc:[a-z]+)$/.test(map)) view.setOverlay(map, sim.refresh(true), settings.colorblind, sim.traffic);
  }
  else { hud.visible = true; hud.setTools(TOOLS.map(t => t.id), 'look' as ToolId); refreshHud(); hud.setGoal('Open the park', 0.66); }
  requestAnimationFrame(frame);
}

if (window.__noWebGL2) {
  Object.defineProperty(window, GAME.hook, { value: Object.freeze({ title: GAME.title, snapshot: () => ({ screen: 'no-webgl' }) }) });
} else {
  try {
    boot();
  } catch (err) {
    console.warn(err);
    document.getElementById('boot')?.remove();
    document.body.appendChild(h('div.early', { role: 'alert', 'data-testid': 'no-webgl' },
      h('h1', null, 'The town couldn’t start'), h('p', null, 'This device couldn’t start the 3D drawing. Try reloading, or another browser.'),
      h('button', { onclick: () => location.reload() }, 'Try again')));
  }
}

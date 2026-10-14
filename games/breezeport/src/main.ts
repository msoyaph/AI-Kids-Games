/**
 * The style frame's entry point (phase 0): one staged city block, at the tier the URL asks for, with
 * the HUD laid out as the game will have it. It never reads or writes storage.
 *   ?scene=styleframe&quality=low|medium|high (&zoom= &yaw= &x= &z= &t= &seed= &season=)
 */
import './style.css';
import { GAME } from './config';
import { PARK_LOOP, STANDING, styleFrameCity, styleFramePoints } from './game/styleframe';
import { frameView, startZoomMin, ZOOM } from './render/camera';
import { guessTier, isSoftwareRenderer, urlTier, type QualityTier } from './render/quality';
import { StreetLife } from './render/streetlife';
import { CityView } from './render/view';
import { dateLabel, SEASONS, SEASON_DAYS, DAY_SEC, seasonOf, type Season } from './sim/clock';
import { h } from './ui/h';
import { Hud } from './ui/hud';
import { openArea } from './ui/layout';

declare global { interface Window { __noWebGL2?: boolean } }

const params = new URLSearchParams(location.search);
const num = (k: string) => (params.has(k) && Number.isFinite(Number(params.get(k))) ? Number(params.get(k)) : null);

function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#town')!;
  const uiRoot = document.querySelector<HTMLElement>('#ui')!;
  const city = styleFrameCity(num('seed') ?? 7);
  // the season: summer unless asked (the frame's day starts in late morning)
  const wanted = params.get('season') as Season | null;
  const seasonIndex = wanted && SEASONS.includes(wanted) ? SEASONS.indexOf(wanted) : 1;
  city.t = (num('t') ?? DAY_SEC * 0.38) + seasonIndex * SEASON_DAYS * DAY_SEC + DAY_SEC;

  let tier: QualityTier = urlTier() ?? guessTier();
  const view = new CityView(canvas, { x: 9, z: 12, yawStep: num('yaw') ?? 0, zoom: num('zoom') ?? 0 }, tier !== 'low');
  try {
    const gl = view.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (isSoftwareRenderer(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '')) tier = 'low';
  } catch { /* no renderer info */ }
  view.setQuality(tier);
  view.setLife(new StreetLife(city, (num('seed') ?? 7) * 13 + 1, { cars: 16, buses: 1, walkers: 64 }, [PARK_LOOP]));
  for (const [x, z, heading] of STANDING) view.life!.addStanding(x, z, heading);

  const hud = new Hud(uiRoot);
  hud.set({ goal: 'Open the park', progress: 0.66, date: dateLabel(city.t), population: 248, happiness: 86, coins: 3460 });

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
  // frame the block: as big as fits, never under the phone or computer starting minimum
  if (!(view.goal.zoom > 0)) {
    const f = frameView(styleFramePoints(), view.width, view.height, openArea(view.width, view.height, view.insets), 0, {
      yaws: [view.goal.yawStep], minZoom: startZoomMin(view.width, view.height), maxZoom: ZOOM.max, fill: 0.86,
    });
    Object.assign(view.goal, { x: num('x') ?? f.x, z: num('z') ?? f.z, zoom: f.zoom });
  } else if (num('x') !== null || num('z') !== null) {
    Object.assign(view.goal, { x: num('x') ?? view.goal.x, z: num('z') ?? view.goal.z });
  }
  Object.assign(view.view, { x: view.goal.x, z: view.goal.z, zoom: view.goal.zoom });

  const drawnLog: [number, number][] = [];
  let last = performance.now();
  let fps = 60;
  function frame(now: number) {
    const real = Math.min(0.25, (now - last) / 1000);
    last = now;
    const dt = Math.min(0.1, real);
    fps = fps * 0.95 + (real > 0 ? 1 / real : 60) * 0.05;
    view.setWorld(seasonOf(city.t));
    view.syncCity(city);
    view.update(dt, city.t);
    view.render(dt);
    const st = view.stats();
    drawnLog.push([st.drawCalls, st.triangles]);
    if (drawnLog.length > 90) drawnLog.shift();
    requestAnimationFrame(frame);
  }

  // the read-only test hook: copies only
  Object.defineProperty(window, GAME.hook, {
    value: Object.freeze({
      title: GAME.title,
      snapshot: () => structuredClone({
        screen: 'city', capture: true, quality: view.tier, fps: Math.round(fps), camera: { ...view.goal }, season: seasonOf(city.t),
        ...view.stats(),
        drawn: drawnLog.length ? {
          calls: [Math.min(...drawnLog.map(d => d[0])), Math.max(...drawnLog.map(d => d[0]))],
          triangles: [Math.min(...drawnLog.map(d => d[1])), Math.max(...drawnLog.map(d => d[1]))],
        } : null,
      }),
    }),
  });

  document.querySelector('#boot')!.classList.add('done');
  setTimeout(() => document.querySelector('#boot')?.remove(), 500);
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

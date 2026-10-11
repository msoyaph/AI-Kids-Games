import './ui/styles.css';
import { GameLoop } from './core/loop';
import { GameRenderer } from './render/renderer';
import { InputManager } from './input/manager';
import { World } from './sim/world';
import { TrackModel } from './sim/track/trackModel';
import { TEST_LOOP } from './data/tracks/testLoop';
import { RaceTracker } from './sim/race';
import { RaceView } from './render/raceView';
import { formatTime, ordinal } from './core/math';
import { AiController } from './sim/ai/aiController';
import { ItemSystem } from './sim/items/itemSystem';

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function boot(): Promise<void> {
  const bootUi = window.__boot;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLDivElement;
  let gr: GameRenderer;
  try {
    gr = new GameRenderer(canvas);
  } catch (err) {
    console.warn('WebGL init failed', err);
    bootUi?.fail();
    return;
  }
  bootUi?.set(0.3, 'Building track');
  await nextFrame();

  const input = new InputManager(uiRoot);
  input.inRace = true;
  if (gr.isTouch) input.touch.show(true);

  const params = new URLSearchParams(location.search);
  const track = new TrackModel(TEST_LOOP, params.has('mirror'));
  const cfg = { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' };
  const world = new World({
    ground: track,
    speedClass: 'pro',
    seed: 1,
    racers: [
      { racerId: 'calex', kart: cfg, player: 0 },
      { racerId: 'calex', kart: { ...cfg, paint: 'ocean' }, player: -1 },
      { racerId: 'calex', kart: { ...cfg, paint: 'ocean' }, player: -1 },
      { racerId: 'calex', kart: { ...cfg, paint: 'ocean' }, player: -1 },
    ],
    countdownTime: 3,
  });
  const race = new RaceTracker(world, track, 3);
  race.placeGrid([1, 2, 3, 0]);
  const autodrive = params.has('autodrive');
  if (autodrive) world.karts[0].player = -1;
  const ai = new AiController(world, track);
  if (autodrive) world.karts[0].player = 0;
  const items = new ItemSystem(world, track, track, { set: 'all' });
  ai.attachItems(items);
  world.karts[0].autoAccel = gr.isTouch;
  bootUi?.set(0.6, 'Planting trees');
  await nextFrame();
  const view = new RaceView(gr, world, { track }, [0]);
  view.attachItems(items);

  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;top:8px;left:8px;font:700 14px monospace;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;white-space:pre';
  uiRoot.appendChild(hud);
  (window as unknown as { __calex: unknown }).__calex = { world, input, track, race, ai, items };

  const loop = new GameLoop({
    step: (dt) => {
      const k = world.karts[0];
      if (!autodrive) input.fillKartInput(0, k.input, k.autoAccel, world.phase === 'race');
      world.step(dt);
      world.events.drain((e) => view.onEvent(e));
    },
    render: (alpha, frameDt) => {
      input.poll(frameDt);
      if (gr.quality.sample(frameDt)) gr.applyQuality();
      view.update(alpha, frameDt, [world.karts[0].input.lookBack]);
      view.render();
      const k = world.karts[0];
      const st = gr.stats();
      const cd = world.phase === 'countdown' ? ` COUNTDOWN ${Math.ceil(world.countdownTime - world.phaseTime)}` : '';
      hud.textContent =
        `${gr.quality.fps} fps · ${gr.quality.level} · dpr ${gr.quality.pixelRatio().toFixed(2)} · calls ${st.calls} · tris ${st.triangles}\n` +
        `${ordinal(k.rank)} · lap ${race.lapOf(k)}/3 · ${formatTime(world.raceTime)}${cd}\n` +
        `item ${k.rouletteTime > 0 ? '???' : k.item ?? '-'}${k.itemUses > 1 ? ' x' + k.itemUses : ''} threat ${k.threat.toFixed(2)}\nspeed ${(k.speed * 3.6).toFixed(0)} km/h  drift ${k.drifting ? k.driftTier : '-'}  boost ${k.boostTime.toFixed(2)}  ${k.grounded ? 'ground' : 'air'} ${k.offroad ? 'OFFROAD' : ''} ${k.wrongWayTime > 1.2 ? 'WRONG WAY' : ''}`;
    },
  });
  bootUi?.set(1, 'Ready');
  loop.start();
  bootUi?.done();
}

void boot();

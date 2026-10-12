import { ELEMENT_ORDER } from '../data/elements';
import { mapById } from '../data/maps';
import { TOWER_IDS, TOWERS } from '../data/towers';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { h, setText } from '../ui/dom';
import type { App } from './App';
import type { Nav } from './flow';
import { GameScreen } from './GameScreen';

/** Shared perf numbers (read by the overlay and by scripts/perf.mjs). */
export interface PerfStats {
  frames: number;
  simMs: number;
  viewMs: number;
  enemies: number;
  projectiles: number;
  particles: number;
}

const KINDS: EnemyId[] = ['gloop', 'zoomkin', 'clankbot', 'puffbat', 'mendy', 'splitblob', 'bubbleimp'];

/**
 * `?stress=300` — a busy battlefield for performance testing on real devices:
 * every tower type at level 3 and N creatures kept alive (they keep poofing
 * and respawning, so particles, coins and text all stay busy).
 */
export function startStress(app: App, nav: Nav, count: number, opts: { overlay?: boolean; onQuit?: () => void; mapId?: string } = {}): GameScreen {
  const map = mapById(opts.mapId ?? 'w2m2') ?? mapById('w2m2')!;
  const screen = new GameScreen(
    app,
    { map, difficulty: 'normal', mode: 'endless', seed: 7, startCoins: 1e7, startCrystals: 6, autoWaves: false, benchmark: true, hero: 'vanguard', abilities: ['meteor', 'chrono'] },
    { quit: opts.onQuit ?? (() => nav.title()), restart: () => startStress(app, nav, count, opts) },
  );
  app.show(screen);
  const g = screen.game;
  for (const el of ELEMENT_ORDER) g.chooseElement(el);
  g.lives = 1e9;
  const grid = g.grid;
  // Every tower type once, then extra projectile towers (multishot ones) to load the renderer.
  const shooters = TOWER_IDS.filter((id) => TOWERS[id].behavior === 'bullet');
  let k = 0;
  for (let y = 2; y < grid.rows - 1; y += 3) {
    for (let x = 2; x < grid.cols - 2; x += 1) {
      const id = k < TOWER_IDS.length ? TOWER_IDS[k]! : shooters[k % shooters.length]!;
      const t = g.build(id, x, y);
      if (t) {
        t.level = 3;
        k++;
      }
    }
  }
  // Synthetic load: projectile towers fire 80x faster so 300+ shots are in the air.
  for (const t of g.towers) if (t.def.behavior === 'bullet' || t.def.behavior === 'mortar') t.rateMult = 80;
  g.sendNextWave();
  const open: number[] = [];
  for (let i = 0; i < grid.cols * grid.rows; i++) if (grid.isOpen(i) && g.flow.next[i]! >= 0) open.push(i);
  let n = 0;
  let nextCast = 2;
  let clock = 0;
  screen.onFrame((dt) => {
    // the commander joins in: hero special whenever ready, a meteor / chrono field every few seconds
    clock += dt;
    if (!screen.paused) g.useHeroSpecial();
    if (clock >= nextCast && g.enemies.length) {
      nextCast = clock + 3;
      const e = g.enemies[(n * 31) % g.enemies.length]!;
      for (const id of ['meteor', 'chrono'] as const) {
        g.abilityCooldown[id] = 0;
        g.castAbility(id, e.x, e.y);
      }
    }
    let guard = 40; // spread spawning over frames
    while (g.enemies.length < count && guard-- > 0) {
      const id = KINDS[n++ % KINDS.length]!;
      const e = g.debugSpawn(id, ENEMIES[id].elemental ? ELEMENT_ORDER[n % 6]! : null, n);
      if (!e) break;
      e.hp = e.maxHp = 2500;
      if (id === 'bubbleimp') e.shield = ELEMENT_ORDER[n % 6]!;
      if (!e.flying) {
        const c = open[(n * 7919) % open.length]!;
        e.x = e.px = grid.cellX(c) + 0.5;
        e.y = e.py = grid.cellY(c) + 0.5;
        e.cell = c;
        e.wcell = g.flow.next[c]!;
        e.wx = grid.cellX(e.wcell) + 0.5;
        e.wy = grid.cellY(e.wcell) + 0.5;
      }
    }
  });
  if (opts.overlay !== false) showPerfOverlay(app, screen);
  return screen;
}

/** Small FPS meter (stress mode / ?fps=1). */
export function showPerfOverlay(app: App, screen: GameScreen): void {
  const el = h('div', {
    style:
      'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--safe-bottom) + 120px);background:rgba(0,0,0,.65);color:#fff;font:700 13px ui-monospace,monospace;padding:6px 10px;border-radius:8px;z-index:60;pointer-events:none;white-space:nowrap',
  });
  screen.el.append(el);
  const stats: PerfStats = { frames: 0, simMs: 0, viewMs: 0, enemies: 0, projectiles: 0, particles: 0 };
  (window as unknown as { __perf?: PerfStats }).__perf = stats;
  let acc = 0;
  let frames = 0;
  let worst = 0;
  screen.onFrame((dt) => {
    acc += dt;
    frames++;
    stats.frames++;
    worst = Math.max(worst, dt);
    stats.simMs = screen.profile.simMs;
    stats.viewMs = screen.profile.viewMs;
    stats.enemies = screen.game.enemies.length;
    stats.projectiles = screen.game.projectiles.length;
    stats.particles = screen.view.particleCount;
    if (acc >= 0.5) {
      setText(
        el,
        `${Math.round(frames / acc)} fps · worst ${Math.round(worst * 1000)}ms · sim ${screen.profile.simMs.toFixed(1)} · draw ${screen.profile.viewMs.toFixed(1)}ms · ` +
          `creatures ${stats.enemies} · shots ${stats.projectiles} · fx ${stats.particles} · ${app.quality.tier} · ${app.stage.resolution.toFixed(2)}x · ${app.stage.rendererName}`,
      );
      acc = 0;
      frames = 0;
      worst = 0;
    }
  });
}

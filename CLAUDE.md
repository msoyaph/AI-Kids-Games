# Space Sky — notes for Claude

A space exploration adventure game for kids aged 6–10, built for the "Ai Kids Games" site.
Vite + TypeScript (strict) + Three.js 0.186.1 (WebGL2) + postprocessing 6.39.5, shipped as ONE self-contained
`dist/index.html`. The 2D PixiJS version lives on `main`; the 3D upgrade is on branch `space-sky-3d`
(plan: ~/.claude/plans/logical-toasting-walrus.md). During the port, screens not yet moved to 3D still use Pixi
(created lazily); Pixi is deleted in 3D Phase 7.

## Commands
- `npm run dev` — dev server (Vite). In the desktop app use `.claude/launch.json` → `spacesky-dev` (port 5391).
- `npm run build` — typecheck + single-file build → `dist/index.html`.
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests on desktop/tablet/phone viewports (build first; serves dist on :4392).
- `npm run pacing` — pacing simulation (estimated minutes per chapter on Easy/Normal).
- `npm run svgs` — export the site banner + thumbnail SVGs to `site-assets/`.
- URL flags: `?fps` (FPS + tier + draw calls/tris meter), `?debug` (`window.__spacesky` = S), `?q=low|medium|high`
  (force a tier), `?stress` (heaviest settings, for perf runs).
- Debug hooks: `__spacesky.game.advance(frames)` steps logic + renders even when the tab is hidden (the desktop
  browser pane is usually "hidden", so rAF is throttled), `renderOnce()` repaints.

## 3D architecture (branch space-sky-3d)
- `src/r3/` render core: `R3.ts` (WebGLRenderer, quality tier + governor, post chain, env map, context-loss screen),
  `post.ts` (one merged EffectPass: mipmap bloom, ACES filmic tone mapping, saturation/contrast, vignette, FXAA on
  Medium; MSAA×4 render target on High; Low = no post, renderer ACES), `env.ts` (procedural PMREM studio env),
  `bake.ts` (`bakeCube`: GPU-bake a GLSL `vec4 bake(vec3 dir)` into a cube map once), `shaders/noise.ts`
  (simplex/fbm/ridged/cells; fbm needs `OCTAVES` define), `space/sky.ts` (nebula cube bake cache, stars at
  infinity, HDR sun quads), `fx/particles.ts` (pooled Points particles), `dispose.ts`, `materials.ts`.
- Custom fragment shaders end with `OUTPUT_GLSL` (tonemapping + colorspace includes) so Low tier matches.
- Shared GPU resources set `userData.shared = true` (`markShared`); `Scene3D.destroy` frees everything else.
- `systems/quality.ts`: tier profiles (DPR cap, post, bake sizes, asteroid/particle/star budgets, shadows) and
  `QualityGovernor` (render scale first, then tier; Auto ceiling = detected tier). Settings: `quality`, `comfort`
  (null = follow prefers-reduced-motion, see `app/comfort.ts`), `flipY`.
- Scenes: `app/BaseScene.ts` (DOM + lifecycle) → `Scene3D` (`world`, `camera`, `time`) or legacy `Scene` (Pixi).
  `Game.go` compiles a 3D scene's shaders (`compileAsync`) behind the fade. Own rAF loop; pauses when hidden.
- `index.html` checks WebGL2 before the bundle runs and shows a friendly "can't run" screen (`__noWebGL2`).
- Planets (`r3/space/`): `recipes.ts` (per-body 3D look: true colors for real bodies, magic look for Zephyra,
  tilt, rings, clouds, emissive), `planetShaders.ts` (ONE bake program, uniform `uKind`; cube rgb=albedo a=height;
  runtime shader: bump, soft terminator, ocean glint, atmosphere, ring shadows; ring shader with planet shadow;
  halo on back faces), `planets.ts` (`createPlanet(id, radius, {renderer, profile, detail})` → `PlanetView`,
  call `update(time, sunDir)` each frame; bakes ref-counted in an LRU with a per-tier byte budget;
  `group.userData.onDispose` releases them). `wormhole.ts` (billboard swirl). `?gallery[&focus=a,b]` review page.
- `ui/pictures.ts`: 3D snapshots of bodies for the DOM (Codex, fact cards, map card) via `r3/snapshot.ts`
  (HDR render target → CPU ACES + sRGB, transparent background); falls back to Canvas2D art.
- Star map (`scenes/StarMapScene.ts`, `systems/orbitMap.ts`): orbit layout (not to scale), drag/pinch/wheel
  orbit camera, screen-space tap picking (`pickTarget`), labels/mission flag as DOM, launch + warp cinematic
  (tap to skip; Comfort = short, no tunnel/FOV kick), then `mapHooks.fly`.
- `scripts/shot.mjs <path> <out.png> [w h waitMs js]` (env `NEWGAME=1`, `BASE=`) for headless screenshots
  against the dev server (the desktop browser pane is portrait/hidden, so use this for visual review).
- Tone mapping: ACES filmic (AgX looked too pastel for the vivid kid look). Space scenes use
  `world.environmentIntensity = 0.45`.

## Architecture (2D, still used by unported screens)
- **Hybrid rendering**: Pixi draws the world (flight, map, landing, platformer, hub backdrop). A DOM layer (`#ui`)
  draws menus, HUD, dialogue, touch controls. `#ui` is laid out in *logical units* (≥960×720) and scaled with a CSS
  transform; Pixi's stage is scaled the same way (`app/stage.ts`). Safe-area insets are exposed as CSS vars `--safe-*`.
- **Fixed timestep** 60 Hz logic + interpolated render (`app/loop.ts`). Rendering stops when the tab is hidden.
- **Scenes** (`src/scenes/*`) extend `app/Scene.ts`; each owns `root` (Pixi Container) and `ui` (DOM). Created fresh
  per visit via `game.go(name, params)`; registered in `main.ts`.
- **Services** live on `S` (`app/services.ts`), filled during boot.
- **Pure logic** in `src/systems/*` (no Pixi/DOM) so it can be unit tested.
- **Content** is typed data in `src/data/*` (parts, bodies, characters, stickers, facts, missions, levels...).
  All space facts live in `src/data/facts.ts` for parent/teacher review.
- **Art** is procedural: Canvas2D vector drawing (`gfx/canvas.ts`, `gfx/art/*`) baked into atlases (`gfx/atlas.ts`)
  at bake resolution = min(2, dpr × scale). Planets/rocket are baked lazily as single textures (`gfx/textures.ts`).
  UI icons are inline SVG strings (`ui/icons.ts`). No external assets, no web fonts.

## Status
- [x] Phase 1: scaffold, single-file build, Pixi + DPR/resize, atlases, loading screen, title.
- [x] Phase 2: flight physics (systems/flight.ts), sector generator (systems/flightWorld.ts), input (input/input.ts + input/touch.ts), FlightScene + HUD, Tuggy tow.
- [x] Phase 3: StarMapScene, LandingScene (systems/landing.ts), ExploreScene (systems/level.ts, platformer.ts, reachability.ts), tiles/themes, dialogue UI, read-aloud.
- [x] Phase 4: HangarScene (parts, half-star stats, try-on), ShopScene (outfits, room decor), systems/economy.ts.
- [x] Phase 5: systems/missions.ts (data-driven engine), data/missions/*, presenter (ui/presenter.ts), director (scenes/director.ts), Hub/Board/Lounge scenes, save manager + migrations.
- [x] Phase 6: 27 main + 16 side missions (data/missions/*), 19 levels (data/levels/*, auto-registered), story dialogue (data/dialogueStory.ts), CutsceneScene (zibbo/starpath/wormhole/finale), CreditsScene, CompleteScene.
- [x] Phase 7: data/facts.ts (ALL facts), data/codex.ts, systems/codex.ts, data/badges.ts (40), systems/daily.ts, systems/race.ts, CodexScene, BadgesScene (badges + sticker book), app/hooks.ts wiring.
- [x] Phase 8: SlotsScene (3 slots, erase with confirm), CreatorScene (name, suit, helmet, skin, hair, face, difficulty), ui/settings.ts (volume, difficulty, read aloud, tips, fullscreen, help, erase), save tests.
- [x] Phase 9: audio/audio.ts (Web Audio synth, ~45 SFX), audio/music.ts (seeded composer + lookahead sequencer, 14 tracks, crossfades), onboarding tips (data/tips.ts, ui/tips.ts), hub shooting stars.
- [x] Phase 10: Playwright e2e (smoke, new game, save/reload, flight touch+keys, every level, cutscenes/credits, sandboxed iframe, file://) on desktop/tablet/phone; pacing model (systems/pacing.ts, `npm run pacing`); fact-check pass; menu nav (ui/menuNav.ts); story triggers (data/triggers.ts, non-blocking radio cards); hint timer; README + site SVGs.

## 3D status (branch space-sky-3d)
- [x] 3D Phase 1: deps pinned, WebGL2 gate, R3 core, quality tiers/governor/settings, post chain, sky, particles,
  Game/Scene port with lazy Pixi; Title, Slots, Creator, Credits, Complete on 3D backdrops.
- [x] 3D Phase 2: planet library (all 28 bodies + Sun), rings/clouds/atmospheres, gallery, 3D star map with
  warp cinematic, 3D Codex pictures, "Space Is Huge!" Codex page (`scale`, unlocked on launch).
- [ ] 3 rocket · [ ] 4 flight · [ ] 5 characters · [ ] 6 landing/explore · [ ] 7 hub/menus
  (remove Pixi) · [ ] 8 cutscenes · [ ] 9 perf · [ ] 10 tests/review/handoff

## Current numbers
- Pacing model: Easy ≈ 6.7 h with all side missions (≈ 5.5 h story + free play); Normal ≈ 5.7 h.
- Perf (tablet profile, DPR 2, M3 GPU): 60 fps, p95 16.7 ms in belt flight / big levels; still 60 fps with 4× CPU throttle.
- Build: dist/index.html ≈ 1.1 MB.

## Content conventions
- Puzzles remember being solved via flags `solved:<puzzle>`, `reached:<marker>`, `door:<id>`; the mission engine treats
  an already-solved puzzle/marker as complete when its objective starts (no soft-locks from doing things early).
- Mission items/samples in levels use `when: { mission }` so they only appear while needed.
- Areas on multi-area worlds use `unlock` conds (flags set by mission `startFlags`).
- Level files: `LEVEL=<id,...> npx vitest run tests/unit/levels.test.ts` checks one level (reachability, soft-locks).

## Gotchas
- Headless Chromium renders WebGL in software (~10 fps) unless launched with `--use-angle=metal --enable-gpu` (set in playwright.config.ts).
- Bobbing/animated buttons never count as "stable" for Playwright: tests use `click({ force: true })` or `navTo()` in tests/e2e/helpers.ts.
- Dialogue freezes gameplay; anything that can happen mid-flight/explore should use `radio` (non-blocking) or toasts, not `dialogue`.
- `npm audit` flags `braces` via `vite-plugin-singlefile → micromatch` — build-time only, not shipped.
- Port 5173 is used by another project on this machine; use 5391/4391/4392.
- zsh: don't start an `echo` argument with `=` (equals expansion) and quote `--include='*.ts'` globs.

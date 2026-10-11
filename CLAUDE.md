# Space Sky — notes for Claude

A space exploration adventure game for kids aged 6–10, built for the "Ai Kids Games" site.
Vite + TypeScript (strict) + Three.js 0.186.1 (WebGL2) + postprocessing 6.39.5, shipped as ONE self-contained
`dist/index.html`. The 2D PixiJS version lives on `main`; the 3D upgrade is on branch `space-sky-3d`
(plan: ~/.claude/plans/logical-toasting-walrus.md). Pixi is gone from this branch (every screen is 3D).

## Commands
- `npm run dev` — dev server (Vite). In the desktop app use `.claude/launch.json` → `spacesky-dev` (port 5391).
- `npm run build` — typecheck + single-file build → `dist/index.html`.
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests on desktop/tablet/phone viewports (build first; serves dist on :4392).
- `npm run pacing` — pacing simulation (estimated minutes per chapter on Easy/Normal).
- `npm run svgs` — export the site banner + thumbnail SVGs to `site-assets/`.
- `npm run perf` — perf runs (tablet 1024×768 @2x, CPU ×1/×4/×6, each tier, hub/belt/rings/level/finale), a
  two-lap 11-scene memory check and boot time → `perf-results/latest.{md,json}` (build first; serves dist on :4393).
- `npm run shots -- --q low,medium,high [--only hub,map] [--size 1560x720]` — screenshot every scene into `shots/`
  (gitignored); `node scripts/montage.mjs out.png 3 a.png b.png ...` tiles them for review.
- The build fails above 3 MB (`scripts/check-size.mjs`).
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
- Scenes: `app/BaseScene.ts` (DOM + lifecycle) → `Scene3D` (`world`, `camera`, `time`; or a borrowed world + `local`).
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
- Rocket (`r3/models/rocket.ts`, `rocketMaterials.ts`, `systems/rocketFit.ts`): `new RocketModel(loadout, {glossy})`,
  origin at body middle, nose +y, windows/cargo +z. Every part is built from rocketFit numbers (body profile,
  nose/engine/fin/pod/cargo placement), so all 46,656 outlines fit (unit-tested). `setLoadout(next, slot)` snaps
  the part on (easeOutBack + `onSnap` callback). `update(dt, thrust, boost)` drives flames (`r3/fx/flame.ts`),
  blinkers, party lights, spinners. Shared materials/geometries are cached + `markShared`; the painted body
  CanvasTexture (pattern + stickers) is per rocket. `r3/fx/trail.ts` = camera-facing ribbon (ring buffer).
- Hangar (`scenes/HangarScene.ts`): the stage rocket hovering over the Academy hangar turntable, drag to spin
  (`hangar-spin`), camera focus per tab framed into the left column (`focusPose`); try-ons snap parts on; card
  thumbnails via `ui/rocketThumbs.ts` (queued 3D snapshots). `?rockets[&n=4&seed=x&gloss=0]` = contact sheet.
- 3D flight: `systems/flight3d.ts` (pure sim: auto-forward cruise, stick turns yaw/pitch, auto-level, Easy aim
  assist + planet orbit-hug, same boost/fuel/gravity/slingshot/bump/comet/pickup rules as flight.ts, hoop gates
  crossed by plane test, soft bounds bubble; `raceTune` for races: nimbler, half gravity, no slingshots),
  `systems/world3d.ts` (`liftLayout`: 2D buildFlight → 3D heights; Saturn ring ice flat in the ring plane; race
  `heights` in data/races.ts), `systems/flightBot.ts` (autopilot used by tests/unit/flightBots.test.ts and pacing).
  World axes: map (x, y) + height h → three.js (x, h, y) via `toV`. Directors return FlightTarget with optional h.
  Scene: `scenes/FlightScene.ts` (Scene3D), `r3/flight/flightView.ts` (planets, instanced coins/fuel/ice/glimmers,
  asteroid LOD buckets, comets with dust+ion tails away from the Sun, hoops, satellites), `r3/flight/flightFx.ts`
  (ChaseCam never rolls, ≤6° FOV kick, SpeedDust, Easy GuideTrail, DOM FloatLabels). Gamepad B = action in play.
- Characters (`r3/models/characters.ts`, `faces.ts`): `new Character(id, profile?, {helmet, frame})`, ~1 unit
  tall, feet at origin, facing +z; kinds from data/characters.ts (human, player/cadet with every Creator option and
  shop outfit, robot, tuggy, alien, elder, critter). Joint groups (hips/torso/head/shoulders/elbows/hips/knees),
  procedural anims via `setAnim` ('idle','wave','celebrate','talk','walk','run','jump','fall','hover','push',
  'carry'), `mood`, `talk(on)`, `freeze(mood)` for stills. Faces = shared 4x2 canvas sheets per style; expression =
  texture offset on a per-character clone. `?chars[&ids=a,b&anim=wave&mood=wow&talk]` review page.
- Portraits (`ui/portraits.ts`): `portraitEl(id, cssSize, mood, profile?, {frame})` = cached 3D snapshot on the
  character's colored disc (2D fallback); used by dialogue, radio, hub, board, lounge, slots, shop, hangar, Codex.
  `warmPortraits` pre-draws the main cast after the hub loads. Creator shows a live 3D cadet (setViewOffset).
- Post: NO multisampled render targets (they corrupted frames on ANGLE-Metal with many draws) → FXAA in its own
  pass after the merged bloom/tone-map pass (FXAA merged with bloom caused dark halos). Bloom threshold 1.25.
- `scripts/shot.mjs <path> <out.png> [w h waitMs js]` (env `NEWGAME=1`, `BASE=`) for headless screenshots
  against the dev server (the desktop browser pane is portrait/hidden, so use this for visual review).
- Tone mapping: ACES filmic (AgX looked too pastel for the vivid kid look). Space scenes use
  `world.environmentIntensity = 0.45`.
- 2.5D exploration (`scenes/ExploreScene.ts`, same platformer/level/reachability logic): 1 tile = 1 world unit,
  y up with the level's bottom row on y = 0 (`wx/wy` convert level pixels), gameplay on z = 0. Camera: FOV 30,
  15.6 rows visible, lifted 2.4 units looking slightly down, follows like the 2D one (45% / 55%). Test hooks:
  `current.player` (PPlayer) and `current.world2` (PlatWorld); `snapCamera()`.
  `systems/tileMesh.ts` = pure mesher (layers ground/lip/rock/ice/platform/goo/trim, bevelled blocks, surface
  caps, `buildBackTerrain`, `surfaceSpots`, `groundBelow`), unit-tested. `r3/surface/`: `terrain.ts`
  (LevelTerrain: one mesh per layer + back terrain + instanced tufts/pebbles/shards), `look.ts` (canvas detail
  textures, per-theme materials, `surfaceLight`: sun dir/colors, Zephyra's 2 suns, fog), `sky.ts` (SurfaceSky:
  gradient dome or the real starry sky on airless worlds, the theme's sky planet pinned to its screen spot,
  two scenery layers by style; `layerZ` pushes them back for landings), `props.ts` (+ propKit/propsBasic/
  propsActive/propsMachines/propsDeco: every level thing as `Prop {group, update?}`, origin bottom-center,
  +z faces the camera). `r3/models/rover.ts`. Blob shadows on Low/Medium, real sun shadows on High. The action
  prompt floats above the target (`.prompt-anchor`). `?props[&theme=moon&set=deco|machines|plants&on&game]`.
- 3D landing (`scenes/LandingScene.ts`, same `systems/landing.ts` sim in a fixed 1280-px sim space, 64 px = 1
  unit): orbit swoop chase-cam (2.6 s, 1.2 s in Comfort; tap/`btn-skip-swoop`/action skips), then a low 3/4
  camera that frames rocket + pad and comes down with you; pad beam, landing ring (green over the pad), drop
  line, height meter (`altitude`) next to the speed gauge, dust ring on touchdown.
- The Academy (`r3/rooms/academy*.ts`: Layout = all dimensions/poses/spots, Kit/Atlas = merged building parts and
  one painted canvas atlas, Rooms, Exterior, Decor): a dollhouse cutaway (upper: board | codex | badges; ground:
  lounge | shop | lobby; hangar wing; launch pad) at dusk. `scenes/academyStage.ts` keeps ONE `AcademyStage`
  (Academy + crew Characters + your rocket on the turntable + the current camera pose) alive across the hub
  screens; `Game.register(name, f, {stage: 'academy'})` makes moves between them camera glides (no curtain,
  `.glide-in` DOM). Screens extend `scenes/AcademyScene.ts` (borrowed world, `local` group freed on exit,
  `showRoom(pose)` uses `fitFov` for narrow screens). The stage is released when a non-stage scene shows
  (main.ts onSceneChange) or the GPU context is restored. Codex: the planet hologram over the library projector
  shows through `.holo-window`; Shop: the 3D cadet on the try-on stage; Hangar: the stage rocket (`syncRocket`).
  Subjects beside panels are framed with `r3/framing.ts` `focusPose` (view offset; unit-tested). Hub taps:
  `AcademyStage.pick` (crew boxes, then `roomAt`). `?academy[&room=board&cast&decor=all&spin&ui]` review page.
- Characters are rigid-skinned after building (`bakeRig`): joints are Bones, static parts merge into one
  SkinnedMesh per material kind with plain colors as vertex colors (~7 draws per character, ~4 on Low where
  `rigOptions.coarse` shares one lit material). Hide a limb by scaling its bone (not `.visible`). Portraits pass
  `merge: false`. `disposeObject` also disposes skeletons (their bone textures leaked one texture per character).
- Rockets merge each part's static pieces per material (`mergePart`; animated blinkers/party lights/spinners/halo/
  flames stay separate, part groups stay for snap-on). Thumbnails pass `merge: false`.
- `?stress` freezes the quality governor so a forced tier (`?q=`) is measured as-is.
- Cutscenes: `scenes/CutsceneScene.ts` runs a `Staging` from `scenes/cutscenes.ts` (Zibbo at the Academy stage,
  star path by Neptune, wormhole dive + tunnel, Star Beacon relight on Zephyra): an intro camera path, a shot +
  acting per dialogue line (`showDialogue(lines, {onLine})`), timed cues, fireworks, an outro. Camera paths are
  `systems/timeline.ts` (Catmull-Rom keys, eased ends, `fromHere`, `dueCues`; unit-tested). Everything runs in
  `render()` because dialogue freezes `update()`. Framing rule: the dialogue box covers the bottom ~35%, so close-ups
  look at a point below the face. Credits = a fly-past of every world (planets stream in/out) with your rocket;
  the completion screen shows your cadet on a podium beside your rocket. `node scripts/shots.mjs` (+
  `scripts/montage.mjs`) screenshots every scene per tier for review.
- Measure tiers with `?q=low|medium|high`: Auto picks High on this Mac (shadows add ~80 draw calls in levels).

## Architecture (shared)
- **Rendering**: Three.js draws the world; a DOM layer (`#ui`) draws menus, HUD, dialogue, touch controls. `#ui` is
  laid out in *logical units* (≥960×720) and scaled with a CSS transform (`app/stage.ts`). Safe-area insets are
  exposed as CSS vars `--safe-*`.
- **Fixed timestep** 60 Hz logic + interpolated render (`app/loop.ts`). Rendering stops when the tab is hidden.
- **Scenes** (`src/scenes/*`) extend `app/Scene3D.ts` (`world`, `camera`, `ui` DOM). Created fresh per visit via
  `game.go(name, params)`; registered in `main.ts`.
- **Services** live on `S` (`app/services.ts`), filled during boot.
- **Pure logic** in `src/systems/*` (no rendering/DOM) so it can be unit tested.
- **Content** is typed data in `src/data/*` (parts, bodies, characters, stickers, facts, missions, levels...).
  All space facts live in `src/data/facts.ts` for parent/teacher review.
- **Art** is procedural: 3D models/shaders in `src/r3/*`; Canvas2D drawing (`gfx/canvas.ts`, `gfx/art/*`) for DOM
  pictures (badges, stickers, glyphs, 2D fallbacks) and canvas textures. UI icons are inline SVG strings
  (`ui/icons.ts`). No external assets, no web fonts.

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
- [x] 3D Phase 3: rocket from all 52 hangar items (+ sticker decals), fit system + tests, flames, trails, 3D hangar
  turntable with snap-on animation and sparkles, 3D card thumbnails, two-column settings panel.
- [x] 3D Phase 4: 3D flight (chase cam, steering, Easy assists, comfort), all flight content in 3D, Tuggy tow,
  Saturn ring races with hoops, bots for every trip and race, pacing +3 warp/swoop cinematics (Easy 6.7 h, Normal 5.7 h).
- [x] 3D Phase 5: 3D cast (cadet + all options/outfits, crew, robots, Tuggy, Zephyrans, glimmer) with faces,
  expressions and procedural animations; 3D portraits everywhere in the DOM; live 3D Creator; 3D Tuggy in flight.
- [x] 3D Phase 6: 3D landing (swoop, framing camera, landing aids, height meter) and 2.5D exploration of all 20
  areas (tile mesher, theme terrain/sky/scenery with the real sky planets, ~60 3D props, 3D cadet/rover/NPCs/
  Zibbo, floating prompts). Medium: 80–136 draw calls in levels, ~50–70 in landings.
- [x] 3D Phase 7: the Academy diorama (7 rooms, exterior, launch pad, dusk sky, 10 decorations) shared by hub,
  board, hangar, lounge, codex, badges and shop with camera glides; 3D Codex hologram, shop try-on stage,
  hangar turntable; 3D cutscene sets; character rigid skinning; Pixi removed (1.49 MB build).
- [x] 3D Phase 8: timeline-staged cutscenes synced to dialogue lines, credits fly-past, 3D completion screen,
  screenshot tooling (scripts/shots.mjs, scripts/montage.mjs).
- [x] 3D Phase 9: perf harness (`npm run perf`), Low-tier coarse character merge + rocket part merge (Low hub
  95→63 calls, levels ~66), skeleton/bone-texture leak fixed (memory flat over two 11-scene laps), `?stress`,
  3 MB size guard, readable empty save slots.
- [x] 3D Phase 10: 2D-save continuation e2e (`tests/fixtures/save-2d-chapter3.json`, made by the main build with
  `scripts/make-2d-save.mjs`), flake-proofed flight/settings e2e (42 e2e pass), before/after screenshots, pacing
  re-run (Easy 6.7 h, Normal 5.7 h), README for 3D (size, controls, settings, site art recapture).

## Current numbers
- Pacing model: Easy ≈ 6.7 h with all side missions (≈ 5.5 h story + free play); Normal ≈ 5.7 h.
- Perf (tablet profile 1024×768 @2x, headless M3, `perf-results/latest.md`): Low and Medium 59–60 fps in every
  heavy scene at CPU ×1/×4/×6; High 51–60 (dips only at ×6). Draw calls: Low ≤ 66, Medium ≤ 103, High ≤ 158.
  Boot to title ≈ 0.6 s. Memory flat across scene changes (≈ 45 MB heap).
- Build: dist/index.html ≈ 1.1 MB on main; ≈ 1.44 MB on space-sky-3d (budget 3 MB).

## Content conventions
- Puzzles remember being solved via flags `solved:<puzzle>`, `reached:<marker>`, `door:<id>`; the mission engine treats
  an already-solved puzzle/marker as complete when its objective starts (no soft-locks from doing things early).
- Mission items/samples in levels use `when: { mission }` so they only appear while needed.
- Areas on multi-area worlds use `unlock` conds (flags set by mission `startFlags`).
- Level files: `LEVEL=<id,...> npx vitest run tests/unit/levels.test.ts` checks one level (reachability, soft-locks).

## Gotchas
- Headless Chromium renders WebGL in software (~10 fps) unless launched with `--use-angle=metal --enable-gpu` (set in playwright.config.ts).
- Bobbing/animated buttons never count as "stable" for Playwright: tests use `click({ force: true })` or `navTo()` in tests/e2e/helpers.ts.
  A forced click still hits whatever is on top at that spot (a fading panel, a dialogue): poll for the result
  (`expect.poll` / `toPass`) or call `el.click()` via `evaluate`. Never assume N seconds of input = N seconds of
  game time; under parallel e2e load the frame rate drops.
- The 2D-save fixture must come from the `main` build: `git worktree add <dir> main`, `npm ci --prefer-offline`,
  `npx vite build && npx vite preview --port 4394`, then `node scripts/make-2d-save.mjs`.
- Dialogue freezes gameplay; anything that can happen mid-flight/explore should use `radio` (non-blocking) or toasts, not `dialogue`.
- `npm audit` flags `braces` via `vite-plugin-singlefile → micromatch` — build-time only, not shipped.
- Port 5173 is used by another project on this machine; use 5391/4391/4392.
- Don't put two surfaces at the same depth (the hangar wall touched the back panel → z-fighting line).
- zsh: don't start an `echo` argument with `=` (equals expansion) and quote `--include='*.ts'` globs.

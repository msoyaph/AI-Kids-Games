# Tuck Pop: a kid-friendly block puzzle (slug `tuck-pop`)

An original 8×8 block puzzle for ages 6+, phone-first. The brief is
[docs/prompts/tuck-pop.md](../../docs/prompts/tuck-pop.md); the approved plan is summarised
below. Built from `templates/game-starter` (`npm run new-game`). Branch `seventh-game`.

## Rules that never change

- **Name:** Tuck Pop, chosen by the owner on 2026-10-13 from five candidates checked against
  app listings. It was renamed from the working slug `blocks-wip` before any game code existed,
  so nothing was ever saved under the old prefix. Slug `tuck-pop`, storage prefix `tuckpop.`,
  hook `window.__tuckpop`. `game.json` kept `site.status` "In development" (off the website)
  until phase 9; it is now "Ready to play".
- **Originality:** never name the game that inspired it or any other block-puzzle title anywhere
  (code, docs, manifest, README). Its layout, wording, score badges, palette and sounds are off
  limits too. Everything is drawn in code and synthesized with Web Audio; no asset files.
- **Kid safety:** no ads or revive videos, purchases, premium currency, streak pressure, red dots
  or "!" badges, comparisons with other players, cross-promotion, network requests, tracking,
  accounts or chat.
- **Contract:** one self-contained `dist/index.html` under 1,000,000 bytes (`scripts/check-build.mjs`
  warns at 800 KB) that works from file:// and in the site's sandboxed iframe
  (`allow-scripts allow-same-origin allow-pointer-lock`). Build-only CSP without `unsafe-eval`, so
  Pixi needs `pixi.js/unsafe-eval`.
- **Storage:** keys `tuckpop.save` (profile), `tuckpop.run` (current Classic game), probe
  `tuckpop.__probe`. Never `clear()` or touch other keys. Saves are versioned with migrations;
  frozen fixtures must keep loading.
- **Testing on this shared Mac:** never run a browser test while any other test or capture runs
  (`pgrep -fl "[p]laywright test|[v]itest"` must print nothing), and never run unit and browser
  tests at the same time.
- Commit after each phase, and update this file.

## Plan (approved 2026-10-13)

- **Rendering:** PixiJS 8.22 `WebGLRenderer` directly (`manageImports:false`), Sprites only, with
  every texture drawn by Canvas 2D into one atlas per theme. No Pixi Graphics, Text or Assets
  (measured: about 404 KB for Pixi). Own rAF loop that renders only on change; DPR ≤ 2; context
  loss re-uploads from the kept canvases.
- **`src/sim/`** is pure and seeded (no DOM, Pixi, `Date` or `Math.random`): two 32-bit ints per
  board, about 37 fixed shapes with precomputed placement masks, rows and columns cleared together.
- **Fair dealer:**
  - every tray has a piece that fits;
  - Easy, Relax and Adventure trays can always be fully placed;
  - on Normal, trays can be fully placed while the board is open. The "open" threshold rises
    above 25,000 points so strong play still ends.
  - Fixed operation budget, and a random stream per tray.
- **Scoring:**
  - +1 per block placed.
  - Lines score 10, 30, 60, 100, 150 or 210 for 1 to 6 at once.
  - A streak multiplies line points ×1–×4; 3 moves without a clear end it.
  - Board clear: +300.
  - Words always show the points ("Super! +60").
- **Modes:**
  - **Classic:** Easy (the default for a first play) or Normal.
  - **Relax:** one free reshuffle when nothing fits, one free Undo, slower effects, calm music.
  - **Adventure:** 60 levels in 4 worlds, with goals for lines, gems/fruit, stones and score in N
    moves; stars unlock worlds at 20, 55 and 95.
  - **Daily:** seeded by date, best score per day, no streaks.
- **Helpers (earned):** Undo, Shuffle, Single block. Start with 2/1/2, capped at 5. Classic game
  over offers them with no timer.
- **Themes:** classic, wood, candy, ocean, space, night, unlocked by play. Accessibility:
  colorblind symbols, high contrast, larger text, read-aloud, keyboard and gamepad, 48 px targets.
- **Tests:**
  - unit tests;
  - bots (casual ≥ 3 min average on Normal, ≥ 5 min on Easy/Relax; strong ≥ 6× casual and always
    ends);
  - an Adventure solver whose solutions are stored and replayed in CI;
  - Playwright on Chromium and WebKit (phone, tablet, desktop, portrait and landscape).

## Status

0. COMPLETE (2026-10-13): scaffolded (as `blocks-wip`, then renamed to `tuck-pop` once the
   owner picked the name), listing drafted (status "In development"),
   1 MB build check, Pixi dependency. Repo side:
   - Puzzle and Casual genres;
   - the trademark blocklist;
   - the "In development" status;
   - CI's precise "what changed" picker (`.github/scripts/what-changed.mjs`);
   - Space Sky's and Light Crossing's browser suites moved to `npm run release:local`, enforced by
     the production guard.

1. COMPLETE: core rules in `src/sim/`:
   - `pieces.ts`: 37 shapes, 13 families, 3 tiers, precomputed masks.
   - `board.ts`: branch-free full row/column finder.
   - `scoring.ts`, `solver.ts` (budgeted "can all be placed").
   - `dealer.ts`: the fair dealer, written in full and tuned in phase 2.
   - `game.ts`: moves, clears including stones and gems, streak, deals, game over, Undo, Shuffle,
     Single, Relax's free reshuffle, move limits and goals.

   Plus `core/rng.ts` (from Cliff Valley), `core/bits.ts` and `tuning.ts`. Tests: rules, game,
   purity (no DOM, clock or Math.random in sim/core). The starter's Star Catch files (`sim.ts`,
   `render.ts`, `main.ts` …) remain until phase 3 replaces them.
2. COMPLETE: fair dealer tuned with bots (`src/sim/bot.ts`, `npm run sim` → `reports/sim.md`).
   - **Casual bot:** a young player. It looks at the held pieces (sometimes one), never plans the
     order, uses a softmax over lines, snugness and holes, and makes 8% careless moves.
   - **Strong bot:** plans the whole tray with a beam of 8.
   - **Dealer changes found by simulation:**
     - Normal prefers random draws that can be fully placed, even on crowded boards (otherwise the
       draw where most pieces fit). Open boards still get the I3 guarantee.
     - A gradual warm-up: below 2,000 points a Normal tray is built to fit with chance 1 − s/2000.
       A hard switch made a cliff at 1,000.
     - Past 10,000 points the open threshold rises one cell per 500 points, and one fewer draw is
       tried per 1,000 points, so strong games end.
   - **Results** (20k casual, 400 strong):
     - Casual: Normal averages 4.4 min (p50 3.8), Easy 6.4, Relax 12.0.
     - Strong, Normal: median 42 min, score 15k (17× casual), never capped.
     - Strong, Easy: endless by design (built trays): it hits the 4,000-move cap.
   - **Board clears are rare** for casual play (≈0.01 per game); consider a kinder tray when the
     board is nearly empty (phase 4).
   - **Tests:** `dealer.test.ts` (I1–I5 on 10k played boards plus 200 crowded ones, budget) and
     `balance.test.ts` (CI-sized, fixed seeds, about 6 s).
3. COMPLETE: playable Classic.
   - **Rendering:** `render/scene.ts` (Pixi `WebGLRenderer` with `skipExtensionImports`, sprites
     only, renders on change, context loss), `atlas.ts` + `paint.ts` (all art in Canvas 2D),
     `layout.ts` (pure; portrait and landscape, safe areas, the panel frame, the streak band, per-piece
     tray fit), `fx.ts` (pooled sparkles and confetti, FlashLimiter, words, shake), `tween.ts`,
     `words.ts` (text textures).
   - **Input:** `play.ts`: drag with a touch lift, forgiving snap, ghost and line hints, ease-back,
     tap-to-place, keys, gamepad, and `glide()` for autoplay. `input/gamepad.ts`.
   - **Saves:** `save/storage.ts` (starter's, plus remove and write-failed), `profile.ts` (v1 schema,
     MIGRATIONS chain, sanitize, newer-version read-only, size guard), `run.ts` (Classic and Relax
     runs with Undo, rules version).
   - **App:** `main.ts`: screens, HUD placement, helpers, the game-over offer, settings, hook,
     haptics. `capture.ts`: `?scene=play|combo|clear`, bot autoplay with real glides.
   - **Build:** 463 KB.
   - **Pitfall:** focus left on a button in a just-hidden screen turned the next Enter into a click
     on it, so `show()` blurs it.
   - **Shared Mac:** run browser tests through `sh scripts/when-idle.sh npx playwright test` (it
     waits while any other test or capture runs).
4. COMPLETE: effects and sound.
   - **Audio** (`audio/`):
     - `engine.ts`: one context; iOS unlock; hidden-tab suspend; sfx and music buses into
       `masterChain` (glue compressor → limiter → tanh soft clip, from Vanex Defense).
     - `voices.ts`: tone, bell, mallet, noise, kick, pad.
     - `sound.ts`: pick, place, a clear chime whose pitch climbs with the streak and gains notes
       with more lines, board clear, no, tap, helper, star, best/win, over.
     - `music.ts`: per-theme recipes (BPM, key, lead, drums), a seeded melody, a four-chord
       loop, and a look-ahead scheduler (25 ms tick, 0.15 s ahead). Relax plays a calm, drumless
       version at 0.8× tempo.
   - **Effects:**
     - Two-line words ("Super!\n+60"), shrunk to fit the board, colored by word.
     - Streak text under them; a mid-game "New best!" cheer with confetti.
     - Board-clear rings (expanding, fading) and confetti.
     - `render/flash.ts` FlashLimiter (unit-tested: ≤3 glows a second); the home screen's
       drifting blocks.
   - **Tried and dropped:** a "board-clear offer" in built trays. Casual boards rarely get near
     empty, so it changed nothing (≈0.01 board clears per game).
   - **Tooling:** `npm run shots` (scripts/shots.ts) takes review screenshots of capture-route
     moments into `reports/shots/` (git-ignored). The browser pane pauses rAF while hidden, so use
     this for timed moments.
5. COMPLETE: Relax, Daily and helpers.
   - **Relax:** free Undo shown as "free", a free reshuffle (sim), calm music, slower effects, the
     helper offer too, and "What a cozy game!". Its run resumes from the home button.
   - **Daily:** `sim/daily.ts`. The seed is `hash32(0xDA11, yyyymmdd)` of the player's local date;
     3–5 clumps with no full line; 40 moves; trays built to fit with weights [40, 45, 15].
     - **Why built trays:** with Normal dealing only 66% of casual games finished.
     - **Progress:** the profile keeps the best per day (30 days). The first finish of a day earns
       a helper. A run resumes the same day.
     - **No pressure:** "A new puzzle comes tomorrow!", no streaks.
   - **Helpers:** `earnHelper()` gives whichever the player has fewest of, up to the cap of 5.
     Earned from 2,500 Classic/Relax points and the first Daily of a day; Adventure adds stars and
     worlds.
   - **Runs:** `run.ts` also stores Daily runs (with move limit and weights).
   - **Home:** the drifting blocks stay in bands clear of the menu.
6. COMPLETE: Adventure (`sim/adventure.ts`, `src/data/levels.json`, `scripts/levels.ts`).
   - **Structure:** 60 levels in 4 worlds: Meadow (cherries, classic look), Ocean (pearls), Candy
     (gems), Space (comets). Each level has one goal (lines, items, stones, score) and a move
     limit.
   - **Stars:** 3★ ≤ par3 moves, 2★ ≤ par2. Worlds open at 20, 55 and 95 stars; levels open in
     order.
   - **Help when stuck:** one free reshuffle per level, plus the helper offer.
   - **Rewards:** first 3★ earns a helper; finishing a world earns 2.
   - **Clock:** an optional clock badge in worlds 3–4 that never affects stars (`profile.clock`).
   - **`npm run levels` (about 75 s):**
     - generates layouts from a progression table (spare items and stones, no full lines);
     - a beam-64 solver proves each win and stores its moves in
       `tests/fixtures/adventure-solutions.json`;
     - par3 = max(solver + slack, a narrow "good player" search);
     - grows the move limit (capped) until the casual bot meets its world's floor.
   - **Casual 1★ rates:** W1 93%, W2 82%, W3 74%, W4 56% (floors 90/75/60/45).
   - **Casual bot:** now aims at goal items and stones.
   - **Tests:** `adventure.test.ts` checks well-formed data, that the data hash matches the
     fixture, that every solution replays to 3★, the per-world casual floors (−5% margin), stars
     and unlocks.
   - **Capture:** `?scene=adventure` (Candy level 32, or `&level=N`) and `?scene=map`. Adventure
     shows the world's theme and music.
   - **Pitfall:** adding moves didn't help casual play, because casual losses are being stuck
     mid-tray, not running out of moves. The free reshuffle and spare stones fixed it.
7. COMPLETE: themes and accessibility.
   - **Themes:** a screen of six cards (`#themes`) with swatches, "Playing now / Tap to use /
     locked + progress". Unlock rules in `data/unlocks.ts` (pure, tested): Treehouse 1,000 in one
     Classic game, Candy 10★, Lagoon 100 lines, Star Trip all Ocean levels, Moonlight 3 Dailies.
     Checked after every game and level, and cheered on the result card. The theme changes board,
     blocks, background and music (`syncView`).
   - **Accessibility:**
     - Colorblind symbols (every block, tray and drag); high contrast (atlas outlines and white
       board, CSS borders); text 100/120/140%; reduced motion.
     - Read-aloud: `say()` speaks when it's on and `speechSynthesis` exists (the toggle is
       hidden otherwise).
     - Keyboard and gamepad for menus and play.
   - **Capture:** `?scene=themes` (all six, 3 s each, or `&theme=`), `?scene=themes-screen`, and
     look switches `&symbols=1&contrast=1&text=N`.
   - **Review:** shots of all six themes, with and without symbols, on phone and desktop (contact
     sheets in `reports/`).
8. COMPLETE: hardening and the full browser suite.
   - **Saves:** frozen fixtures `tests/fixtures/saves/` (v1 full, a pre-release v0). `saves.test.ts`
     covers migration and repair, the newer-version read-only rule, the size guard (maximal under
     4 KB; Daily trims to 14; over 50 KB refused), full storage (memory plus a one-time note),
     prefix-only keys, exact run round-trips with Undo, dropped stale or broken runs, and separate
     Classic/Relax/Daily runs.
   - **Playwright:** 8 projects (Chromium and WebKit × desktop, tablet, phone, phone landscape),
     160 tests, all passing locally (about 2.5 min).
     - `touch.spec`: real touch through CDP on Chromium, touch pointer events on WebKit. Lift
       above the finger, ghost, snap, ease-back, tap-to-place.
     - `gamepad.spec`: a fake standard pad for menus and play. Each press is a tap of exactly one
       frame of the game's polling (see the CI pitfalls in phase 9).
     - `contract.spec`: file://, full storage, pixels really drawn (PNG reader), reduced motion,
       ≤3 glows a second, capture scenes never save.
     - `smoke.spec`: modes, resume, iframe, themes and settings.
   - **Hook:** adds drag position, frames drawn, reduced motion, glows in the last second, level,
     theme, themes, stars.
   - **`npm run perf`** (headed Chromium, Metal, 390×844 @3×, CPU throttled 4×): combo,
     adventure and play all hold the M3 Pro's 120 Hz display (p95 10 ms, 0% of frames over 20 ms),
     and the heap stays flat.
   - **Pitfalls:**
     - Centered screens taller than a landscape phone spilled out of reach above the scroll
       area. Fixed with growing spacers (`.screen::before/::after`).
     - Touch lift is now 1.1 cells (at least 44 px); 1.4 cells plus half a tall piece lifted it
       off short landscape boards.
     - tsx's `__name` helper needs a page shim (`perf.ts`).
     - `when-idle.sh` must skip its own parent shells (their command lines mention the test
       command) and orphaned workers.
9. COMPLETE: site integration (2026-10-13).
   - **Listing:** `game.json` 1.0.0 "Ready to play", order 7, accent #ffe0b8, cover layers float
     and twinkle; capture route `?scene=combo&seed=7`.
   - **Build:** imported 508 KB (`npm run import-game -- tuck-pop`); the storage audit is clean.
   - **Art:** `apps/site/public/media/tuck-pop/`. `cover.svg` plus `cover-float.svg` and
     `cover-twinkle.svg` were drawn from the Sunny palette by a generator (reusable block
     symbols, a dot pattern; 9.7 KB). The logo uses the game's per-letter colors
     (`apps/site/scripts/art/logos.ts`), plus `og/tuck-pop.jpg`.
   - **Previews:** `apps/site/scripts/capture/tuck-pop.ts` records 4 takes (combo, board-clear,
     adventure, themes) cropped to [320, 180, 1280, 720], giving an 8 s loop (MP4 720 KB, WebM
     709 KB) and 5 stills.
   - **Capture pitfall:** the game renders only on change, so the canvas recording got 0 fps. The
     capture route now draws every frame.
   - **Site:** tests (age counts, the Puzzle/Casual categories, a launch entry with start and
     resume), STORAGE_AUDIT row, README game table now generated by `npm run manifests` (simple
     format until the showcase moves to aikids.games), llms.txt, sitemap.
   - **CI pitfalls** (GitHub's runners have only software WebGL; frames come at about 5 fps):
     - `scene.software` (SwiftShader, llvmpipe and the like, from `WEBGL_debug_renderer_info`)
       renders at 1×. A governor drops to 1× after 2 s of frames over 45 ms. `dt` is capped at 0.1 s.
     - Retired textures (an atlas after a rebuild, finished words) are destroyed 5 s later, and
       `rebuild()` re-syncs everything it shows. A governor redraw in the middle of a word crashed
       WebKit on Linux (`t.alphaMode` of a destroyed texture).
     - A fake gamepad press held across test round-trips lasted six slow frames, and the d-pad's
       auto-repeat (0.32 s, then every 0.11 s) moved focus twice. Presses now last one frame.
     - `E2E_SOFTWARE=1 npx playwright test` runs Chromium on SwiftShader locally, closer to CI.
10. COMPLETE: released in site 2.4.0 on 2026-10-13 (PR msoyaph/AI-Kids-Games#10, merge commit
    22fb160). The release record is in apps/site/DEPLOYMENT.json and the root CLAUDE.md.

## Commands

```bash
npm run dev --workspace games/tuck-pop
npm test --workspace games/tuck-pop          # unit tests (vitest)
npm run build --workspace games/tuck-pop     # typecheck, build, contract check
npm run test:e2e --workspace games/tuck-pop  # Playwright (nothing else may be testing)
```

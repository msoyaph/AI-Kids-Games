# Tuck Pop: a kid-friendly block puzzle (slug `tuck-pop`)

An original 8×8 block puzzle for ages 6+, phone-first. The brief is
[docs/prompts/tuck-pop.md](../../docs/prompts/tuck-pop.md); the approved plan is summarised
below. Built from `templates/game-starter` (`npm run new-game`). Branch `seventh-game`.

## Rules that never change

- **Name:** Tuck Pop, chosen by the owner on 2026-10-13 from five candidates checked against
  app listings. It was renamed from the working slug `blocks-wip` before any game code existed,
  so nothing was ever saved under the old prefix. Slug `tuck-pop`, storage prefix `tuckpop.`,
  hook `window.__tuckpop`. `game.json` keeps `site.status` "In development", which keeps the game
  off the website, until phase 9.
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
2. Fair dealer and bots.
3. Playable Classic.
4. Effects and sound.
5. Relax, Daily and helpers.
6. Adventure.
7. Themes and accessibility.
8. Hardening and the full browser suite.
9. Site integration, then a pull request with CI green and the preview link.
10. Release, after the owner's approval.

## Commands

```bash
npm run dev --workspace games/tuck-pop
npm test --workspace games/tuck-pop          # unit tests (vitest)
npm run build --workspace games/tuck-pop     # typecheck, build, contract check
npm run test:e2e --workspace games/tuck-pop  # Playwright (nothing else may be testing)
```

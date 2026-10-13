# Agentmon — working notes (read this first when resuming)

Creature-befriending pixel RPG for ages 7–12 (Ai Kids Games). Brief: `docs/prompts/agentmon.md`.
Approved plan (2026-10-13): `games/agentmon/docs/PLAN.md`. The owner's instruction: implement all 14
phases end to end, autonomously; only stop for disk < 2 GB (after cleaning our own files), a change
that would affect another game's behaviour or saves, or the production release.

**Resume:** "Continue Agentmon from CLAUDE.md" → read this file, then the **Progress** section, and
carry on from "Next".

## Workspace (another session is active)
- Agentmon lives in its own git worktree: `~/Documents/AI-Kids-Games-agentmon`, branch `agentmon`,
  based on Tuck Pop's phase 0 commit `4e03eae` (CI picker, `npm run release:local`, the
  "In development" status, Puzzle/Casual genres).
- The main checkout `~/Documents/AI-Kids-Games` belongs to the Tuck Pop session (branch
  `seventh-game`, folder `games/blocks-wip` → renamed `tuck-pop` there). Never touch that checkout,
  that branch or that game's folder. Our branch carries `games/blocks-wip` from the base commit;
  leave it alone.
- **Heavy runs:** before any browser test, capture or long simulation run
  `node games/agentmon/scripts/quiet-check.mjs` (or `--wait`). Never run heavy work alongside
  another session's tests.
- **Disk:** check free space at the start of every phase (`df -h ~`). Under 2 GB: clean only our
  own regenerable files (games/agentmon/test-results, dist, reports/tmp); still under → stop and ask.
- Before every commit: `git log` for commits this session didn't make (the other session commits
  to its own branch; only `agentmon` matters here). Commit trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rules that never change
- One self-contained `dist/index.html` under **2,500,000 bytes** (`scripts/check-build.mjs`),
  works from file:// and in the site's sandboxed iframe, **no network requests** (build CSP).
- Storage: only keys starting `agentmon.` (`agentmon.slot1..3`, `agentmon.slotN.bak` only around a
  version migration, `agentmon.settings`, `agentmon.records`, probe `agentmon.__probe`). Never
  `localStorage.clear()`, never enumerate other keys. Saves are versioned; never break old saves.
  Each slot ≤ 300 KB (our own budget test: worst case ≤ 64 KB).
- Kid safety: nobody gets hurt ("tuckered out" → nap), no loss of creatures ever, losing → last
  Rest Stop healed with nothing taken, no gambling-like randomness, no ads/purchases/accounts/
  chat/trading. Flashing ≤ 3 per second. Touch targets ≥ 48 px. Reduced motion respected.
- Originality: no names/creatures/designs/items/places/music/UI/catchphrases from any franchise;
  no capture devices; no gyms/badges/elite four. Every name is web-checked; every design reviewed
  for lookalikes (log below).
- `site.status` stays **"In development"** until the last phase (keeps it off the site).
- Read-aloud uses only local speech voices (`localService`), since cloud voices would send text
  over the network.

## Commands (from the repo root of the worktree)
```bash
npm run typecheck --workspace games/agentmon
npm test --workspace games/agentmon            # unit tests (tests/unit)
npm run test:sim --workspace games/agentmon    # balance, level curve, playthrough bot, pacing (tests/sim)
npm run build --workspace games/agentmon       # typecheck + single-file build + contract check
node games/agentmon/scripts/quiet-check.mjs && npm run test:e2e --workspace games/agentmon
npm run dev --workspace games/agentmon         # http://127.0.0.1:5246
npm run check                                  # repo hygiene + build sync (root)
```
Ports: dev 5246, preview 4246.

## Architecture (see docs/PLAN.md for the full design)
- `src/core/` pure logic (no DOM/Pixi): rng, battle, creatures, world, puzzles, story, quests, save.
- `src/data/` typed content: elements, species, moves, items, maps, dungeons, trainers, dialogue,
  quests, `facts.ts` (every real fact, one reviewable file), names.
- `src/tuning.ts` every balance number.
- `src/art/` palette, pixel canvas, atlas, creature shape recipes, tiles, characters.
- `src/render/` Pixi scenes. `src/ui/` DOM menus and dialogue. `src/input/`, `src/audio/`, `src/game/`.
- Reused code (copied, adapted): Cliff Valley's PixelCanvas/Atlas/renderer/rng/audio engine;
  TheaBonk's glass stick (`input/stick.ts`, `ui/glass.css`).

## Decisions (small calls the plan didn't cover; newest last)
- 2026-10-13 Build budget is 2,500,000 bytes (decimal "2.5 MB", the stricter reading).
- 2026-10-13 Vitest runs `tests/unit` (npm test, also CI's default) and `tests/sim` (npm run test:sim).
- 2026-10-13 Playwright projects: chromium/webkit × desktop (1280×720), tablet (Galaxy Tab S4 /
  iPad gen 7), phone (Pixel 7 / iPhone 13); traces and screenshots only on failure, no video.
- 2026-10-13 Trademark list gains other monster-taming and RPG franchise names (manifest validator).

## IP log (names or designs changed after a check)
_(none yet)_

## Progress
| Phase | Status |
|---|---|
| 0 Scaffold, budget, RPG genre, CLAUDE.md | done |
| 1 Core rules (battle, energy, status, xp, AI, befriend, save codec) | next |
| 2 Content data + balance sim + level curve | |
| 3 Art foundation (renderer, atlas, 52 creature recipes, tiles, characters, sheet) | |
| 4 Overworld (maps, movement, NPCs, dialogue + read-aloud, encounters, inputs, Rest Stops, shops) | |
| 5 Battle + befriend scenes, evolution | |
| 6 Puzzles + 6 Trials + solver tests + field abilities | |
| 7 World + story content, post-game | |
| 8 Menus, Agent Base, save slots, tutorials, stuck helper, reading level | |
| 9 Audio | |
| 10 Headless bot × 3 difficulties, pacing, retune | |
| 11 Browser tests | |
| 12 Visual + IP review | |
| 13 Site, previews, art, PR (stop before production) | |

**Next:** phase 1. The starter's Star Catch files (`src/sim.ts`, `render.ts`, `main.ts`, the smoke
test) are still in place and get replaced as the real game lands.

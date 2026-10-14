# Farm WIP — working notes (read this first when resuming)

A 3D farm-building and management game for ages 8–14, for AI Kids Games. "Farm WIP" (slug `farm-wip`)
is the **working name**: the owner picks the final name from the five in "Names" before the site step,
and phase 11 renames everything. Brief: `docs/prompts/farm-wip.md`. Approved plan (2026-10-13):
`games/farm-wip/docs/PLAN.md`, which holds the full game design, architecture and the 13 phases.

**Resume:** "Continue Farm WIP from CLAUDE.md" → read this file, then **Progress**, and carry on from
"Next".

## Workspace (other sessions are active)
- Own git worktree: `~/Documents/FarmerTown/AI-Kids-Games-farm`, branch `farm-wip`, cut from
  `origin/main` f331dd9 (release 2.7.0, Agentmon). The branch has no upstream. Push or open a PR only
  when the owner asks.
- The main checkout `~/Documents/AI-Kids-Games` belongs to another session (branch
  `game-trailers`). Never touch that checkout or other sessions' worktrees.
- **Heavy runs:** `node games/farm-wip/scripts/quiet-check.mjs` before any browser test, Vitest run,
  capture or long simulation. **Respect its exit code:** 0 means quiet, so go ahead; 1 means busy, so
  wait and don't start; with `--wait`, a non-zero exit after 2 hours means stop and tell the owner.
  `sh scripts/when-quiet.sh e2e|sim …` (from games/farm-wip) waits, then runs. It exits 75 if the
  machine is still busy after 2 hours. The quiet check counts Vitest as heavy, so unit tests wait too.
  Never run unit and browser tests at the same time, and never run CPU- or GPU-heavy work while
  another session's e2e is running.
- **Disk:** run `df -h ~` at the start of every phase. Under 2 GB: clean only our own regenerable
  files (test-results, dist, playwright-report). If it is still under, stop and ask.
- Before every commit: check `git log` for commits this session didn't make. Commit messages are
  "Farm WIP, phase N: …", with a `Tests:` line and the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rules that never change
- One self-contained `dist/index.html` under **3 MiB** (`scripts/check-build.mjs`; aim for about
  1.8 MB). It works from file:// and in the site's sandboxed iframe, with **no network requests**
  (build CSP + check).
- Storage: only keys starting `farmwip.` (save, settings, probe `farmwip.__probe`). Never
  `localStorage.clear()`, never enumerate other keys. Saves are versioned and migrated. The prefix
  changes once, at the rename in phase 11, before any player has a save.
- **Kindness rules** (from the brief; tested):
  - no energy and no real-world timers: the clock runs only while the farm is on screen and active;
  - nothing wilts, spoils, dies or gets sick, and animals are always fine;
  - "while you were away" is capped at 10 minutes of growth and only helps;
  - no premium currency, purchases, ads, accounts, chat, sharing or network;
  - no streaks and no red dots;
  - the safety net means nobody is ever stuck broke.
- **Different from Cliff Valley:**
  - a 3D diorama with no avatar, energy, mining, inherited farm or train;
  - its own crops (only Wheat, Strawberry and Pumpkin overlap), buildings, cast and look.
- **Originality:**
  - no names, characters, art, UI layouts, currencies or text from the inspiration or its publisher
    (both are on the trademark blocklist);
  - every name is web-checked, and every design is reviewed for lookalikes (IP log below);
  - all models are built in code, all audio is synthesized, and there are no asset files.
- `site.status` stays **"In development"** until the site step (phase 12).
- Read-aloud uses only local speech voices (`localService`), because cloud voices would send text
  over the network.
- Three.js is pinned at exactly **0.186.1**, like the other 3D games.
- The sim (`src/sim/`) is pure: no DOM, no `Date`, no `Math.random`. It uses a seeded RNG, and a
  purity test enforces this.

## Commands (from the repo root of the worktree)
```bash
npm run typecheck --workspace games/farm-wip
node games/farm-wip/scripts/quiet-check.mjs && npm test --workspace games/farm-wip
npm run build --workspace games/farm-wip       # typecheck + single-file build + contract check
(cd games/farm-wip && sh scripts/when-quiet.sh e2e)   # browser tests, once quiet
npm run dev --workspace games/farm-wip         # http://127.0.0.1:5446
npm run check                                  # repo hygiene + build sync (root)
```
Ports: dev 5446, preview 4446. They are computed from the slug and don't collide with any other
game's. Tuck Pop is 4444/5444.

## Architecture
See `docs/PLAN.md` → "Architecture". This section is updated as each phase lands.

## Decisions (small calls the plan didn't cover; newest last)
- 2026-10-13: the brief stopped at "…seasonal looks". The owner chose the plan's defaults:
  - 60 fps on mid-range phones, with tiers + governor;
  - a build of at most 3 MiB;
  - Chromium + WebKit e2e;
  - a playthrough bot;
  - stop before the production release.
- 2026-10-13: the delivery vehicle is a little **river boat**, not a cart or a train. Cliff Valley
  has a train, and a river already runs along the starting plot.
- 2026-10-13: the currency is plain **coins**, as the brief says, with an original coin design: a
  wheat-sheaf stamp.

## Names (phase 0: five proposals, web-checked; the owner picks one before the site step)
**How they were checked (2026-10-13).** Web searches limited to each store's domain: the App Store
(apps.apple.com), Google Play, Steam and itch.io. Then general web searches for any game, app, toy,
board game, brand or trademark with the same name. My own spot-check searches repeated each
finalist's search. These are search-index checks, not registry searches: run the owner's pick through
USPTO, EUIPO and UKIPO before launch.

**Proposals.** None turned up a game, app, toy or brand with the same name:
1. **Fieldlark.** "Field lark" is an old folk name for the skylark, and "a lark" is a bit of fun. It
   fits the town of Larkford and the boat, the Little Lark. Nothing on the App Store, Google Play,
   Steam or itch.io. The nearest itch.io project is "Fenlark", a different name.
2. **Brightacre.** "Bring the sleepy farm back to bright life." Nothing in any store and no
   brand. The nearest names are "Brightwood Adventures" and "BrightFarms" (produce), both
   different.
3. **Hayloft Hill.** Cozy, alliterative and easy to read. Nothing in any store; only holiday
   cottages called "The Hayloft". "Hay" faintly echoes a big farm game's title.
4. **Sprout & Sail.** Names both halves of the game, growing and boat deliveries. Nothing in any
   store. Several unrelated games are called just "Sprout", and there is a farming game "Sprout
   Valley".
5. **Commonfield.** Says "community farm" directly; the common field was a historical shared
   farming field. Nothing in any store. It may sound a little dry for kids.

**Spares:** Acre & Oar, Furrow & Ferry, Croplet, Sunnyrow.

**Checked and dropped:**
- **Furrowfield:** it is the farming island in a big publisher's building game, with the same
  restore-a-farm premise, and it echoes a farming board game's setting.
- **Plotwise:** an iOS math puzzle game.
- **Tillbrook:** sounds the same as "Tilbrook", a browser game about building a rural valley.
- **Greenrow:** a large home-furnishings brand.
- **Rowhaven:** crowded "-haven" farm-game names.
- **Sowtown:** the "-town" ending echoes farm-game titles, and "sow" can be an insult.
- **Patchwork Acres:** a well-known board game is called "Patchwork".

**Place and cast names checked the same way:**
- **Larkford** (the town) is fine: it is only the village in an adult novel series.
- **Plumridge Orchard** and **Nannyberry Farm** are clear.
- Neighbor "Reedbank" → **Reedmere**: as two words, "Reed Bank" is a disputed sea area.
- The boat "the Lark" → **the Little Lark**: "Lark" is a cigarette brand.

## IP log (names or designs changed after a check)
Other companies' games are described here, not named (this is a public repo).
- The owner's project name "FarmerTown Ville" ends in "-Ville", like the inspiration's title. It is
  never used in the game or its listing. The working name is "Farm WIP".
- Title candidates dropped after the 2026-10-13 checks (details in "Names"):
  - Furrowfield: a big publisher's farm island;
  - Plotwise: an iOS puzzle game;
  - Tillbrook: a sound-alike rural building game;
  - Greenrow: a furnishings brand;
  - Rowhaven and Sowtown: they echo farm-game titles;
  - Patchwork Acres: a famous board game.
- Neighbor farm "Reedbank" → **Reedmere**: "Reed Bank" is a disputed sea area.
- Boat "the Lark" → **the Little Lark**: "Lark" is a cigarette brand.

## Progress
| Phase | Status |
|---|---|
| 0 Setup and names | done |
| 1 Engine and world | — |
| 2 Fields and crops | — |
| 3 Orchards and animals | — |
| 4 Production | — |
| 5 Build mode and land | — |
| 6 Town and neighbors | — |
| 7 Story and progression | — |
| 8 Books and ledger | — |
| 9 Look and sound | — |
| 10 Balance, performance, QA | — |
| 11 Name and rename | waits for the owner's pick |
| 12 Site step | — |

**Next:** phase 1 (engine and world), then phase 2 (fields and crops).

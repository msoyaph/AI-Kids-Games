# Ai Kids Games monorepo

Public repo msoyaph/AI-Kids-Games: the aikids.games website plus every game's full source.
`apps/site/` is the static Vite + React site (Vercel Root Directory; its own CLAUDE.md holds
the site's rules and history). `games/<slug>/` is each game's complete project, imported with
`git subtree` (full history). `templates/game-starter/` is the starter for new games.
npm workspaces with one root lockfile; Node 24 (`.nvmrc`).

Commands (root): `npm run dev | build | test | test:e2e` (site), `npm run import-game -- <slug>`,
`npm run check` (repo hygiene + build sync). Per game: `npm run <script> --workspace games/<slug>`.

## Hard rules

- Never edit a built game. `apps/site/public/games/<slug>/index.html` is produced only by
  `npm run import-game -- <slug>`, which builds games/<slug> and records bytes, SHA-256 and a
  hash of the build inputs (index.html, package.json, src/, public/, vite.config.*, tsconfig*)
  in apps/site/BUILD_IMPORTS.json. CI (`scripts/check-builds.ts`) fails on any drift.
- Saves are sacred: never change a game's storage keys or break existing saves. Every game owns
  its own key prefix and probe (apps/site/STORAGE_AUDIT.md); the site owns aikg:. No global
  clears, no touching another owner's keys. Re-audit storage on every import.
- Kid safety: no ads, tracking, analytics, accounts, chat or requests to other origins, in the
  site or any game. The website collects no data; listing requests go through GitHub.
- Never use other companies' game titles or trademarks in names, descriptions, topics, tags or
  keywords. A game README may carry an "Inspirations" line with "not affiliated with or
  endorsed by" wording.
- Public repo: no files over 10 MB, no local machine paths, no .vercel/.openai/captures/
  worktrees, and never a self-hosted runner (`scripts/check-repo.ts` enforces this).
- Production deploys only from `main` with CI green and the release's approval recorded in
  apps/site/DEPLOYMENT.json (`apps/site/scripts/check-deployment.ts`).
- Before every commit, check `git log` for commits this session did not make; if any appear,
  stop and tell the owner. Don't rewrite history.

## Consolidation and aikids.games launch (release 2.1.0) — progress

Owner decisions: TheaBonk and Light Crossing are pulled in last (their own sessions were
active); commit emails stay as they are. Two later owner tasks are folded into this release:
"Release TheaBonk v2" (merge theabonk-upgrade if its full verification passes, tag v2.0.0,
touch listing, recapture, save carry-over, in-site touch tests) and "Release Light Crossing
v2.0.0" (import tag v2.0.0, SHA-256 7730e932…b732c8, listing from docs/registry-entry.json,
recapture, save carry-over, in-site touch tests). Both ship in site release 2.1.0.

- Step 0 (merges and tags in each game's own project, after its full verification):
  Vanex Defense v2.0.0 (281 unit, 68 e2e), Space Sky v2.0.0 (230 unit, 42 e2e), Calex Cart
  v0.2.0 (244 unit, 124 e2e), Cliff Valley v1.0.0 (79 unit, 4 sim, 18 e2e), Light Crossing
  v2.0.0 (already merged and tagged by its session; rebuild matches the reported hash).
  TheaBonk: theabonk-upgrade had 2 of 61 e2e failing on chromium-phone (5-minute touch
  playthrough: the touch bot is defeated at 3:30–4:00 on Relaxed; quality governor: Auto stays
  on Tablet at 24× CPU throttle), reproducible in isolation; NOT merged, owner told (2026-10-11).
  The monorepo has TheaBonk at its live version (main 9f10c36, rebuilds byte-for-byte to the
  live build); when its project passes, bring the upgrade in with
  `git subtree pull --prefix=games/theabonk <TheaBonk project> main`. Light Crossing's live v1
  build came from b9bd99e (also byte-for-byte).
- Step 1: monorepo at ~/Documents/AI-Kids-Games, subtree imports with full history (monorepo
  tags <slug>-v<version>), workspaces + one lockfile, site on Vite 8, import-game,
  check-builds, check-repo, clean-up (nested/self-hosted workflows, launch configs, lockfiles,
  .openai, local paths). Builds in the site are still the live ones until step 3 re-imports.
- Pushed 2026-10-11 (owner OK before the remaining test runs finished): main + 5 game tags to
  github.com/msoyaph/AI-Kids-Games (public). Description, homepage (current live address until
  aikids.games), 20 topics, Discussions, Dependabot alerts, secret scanning + push protection,
  private vulnerability reporting.
- Vercel (project ai-kids-games, team real-tours) is linked to the repo with Root Directory
  apps/site. Until release 2.1.0: production branch = `release`, a locked placeholder branch at
  the root commit (only .gitignore), so every push to main is a Preview. Second key: the guard
  needs AIKG_ALLOW_PRODUCTION = the version, set only in Vercel's Production environment, plus
  the DEPLOYMENT.json approval and branch main. Fork PRs need approval (gitForkProtection).
  At release: bump apps/site to 2.1.0 + record approval, set AIKG_ALLOW_PRODUCTION=2.1.0
  (Production only), switch the production branch to main (PATCH /v9/projects/:id/branch),
  push main, then delete the release branch (remove its protection first).
- Step 2 (manifests): games/<slug>/game.json for all six (schema docs/game.schema.json, validator
  scripts/lib/manifest.ts with a trademark list; site.order sets list order). npm run manifests
  generates apps/site/src/data/games.generated.ts, llms.txt (root + apps/site/public); README table
  between GAMES markers once the showcase exists. TheaBonk's manifest describes live v1.
- Step 3 (visible part, owner asked to show it on the preview first): new builds imported
  (byte-identical to each game's own verified build), Cliff Valley added (Farming category, logo
  via scripts/art/logos.ts). TEMPORARY ART for cliff-valley, vanex-defense, space-sky,
  calex-cart (src/data/temporary-art.ts + public/media/<slug>/temp/, OG regenerated from it):
  replace with consistent covers/loops after the capture work, then delete the entries.
  STORAGE_AUDIT.md redone (npm run audit-storage): ≈3.4 MB at every cap, ≈1.2 MB heavy play.
  Branding on home/About/meta; /list-your-game (collects nothing; GitHub form behind ExitGuard).
- Step 7 done early: templates/game-starter (Star Catch), npm run new-game, docs/CREATE-A-GAME.md,
  docs/prompts (six original briefs, other titles replaced by genre words), issue forms, PR
  template, CONTRIBUTING/SECURITY/CODE_OF_CONDUCT/BRAND/LICENSE, AGENTS.md, CITATION.cff.
- Monorepo verification (all six games' own tests inside the monorepo): TheaBonk v1 80 unit +
  5 e2e; Light Crossing 222 + 191 (3 workers; 6 workers plus Docker load caused 4 real-time
  touch flakes); Vanex 281 + 68; Space Sky 230 + 42 (a rerun on a quiet machine; one failure
  came from my image encoding during its run); Calex 244 + 124 + track validator; Cliff Valley
  79 + 4 sim + 18. Lesson: never run CPU/GPU-heavy work (sharp AVIF, captures) during e2e runs.
- Pitfall: commit helper scripts cd into the monorepo, but the session shell's cwd is the old
  site folder (no remote): always cd ~/Documents/AI-Kids-Games before git push.

## Release 2.1.0 — LIVE 2026-10-12 at https://ai-kids-games-fawn.vercel.app
- Owner asked to ship the passed games now ("once done, deploy the updates to live production …
  so my kids can play"; then "deploy the live vercel production the passed games"). dc4a5f7 =
  PR #2, fast-forwarded to main; production dpl_565CFC3FJtQh2oMy2m4mGboRM9r3. Local full suite
  (GPU) 94/0, hosted suite on the PR preview 94/0, logged-out production suite 94/0 (23 device
  skips each); Lighthouse mobile home 99/100/100/100, details 99/100/100/100, play 73 (exempt).
- Vercel now: production branch main; Production-only env AIKG_ALLOW_PRODUCTION=2.1.0 and
  SITE_ORIGIN=https://ai-kids-games-fawn.vercel.app (switch to https://aikids.games once that domain
  is registered and verified). The release placeholder branch is deleted.
- main is protected ("CI passed" required, admins included): every change goes through a PR, and
  every merge to main deploys production (a new release needs a version bump + approval).
- aikids.games is NOT registered (registry RDAP 404, NXDOMAIN). The domains are attached to the
  project; owner must register it, then add A 216.150.1.1 + 216.150.16.1 (apex) and CNAME
  b958b7994f87b614.vercel-dns-016.com (www), then set SITE_ORIGIN and the vercel.app → apex 308.
- TheaBonk v2 stays out: quiet-machine rerun → quality governor passes (earlier failures = busy
  machine); 5-minute touch playthrough still fails (bonked at 4:09 on Relaxed). Diagnosis: test
  assumption after the phase 13 balance sweep made Relaxed harder (playerHp 1.5→1.18, damageTaken
  0.7→0.92, hearts 1.6→1.3, Landing Bonk 2.5→2.0, Meadow map mods); the touch bot taps the first
  card with input latency. Owner to fix in TheaBonk's project.
- Next (owner requests): the sizzle reel with HyperFrames (npx hyperframes@0.8.133, cached,
  telemetry off) in marketing/sizzle/, storyboard first in plan mode; recapture all art in the
  consistent style and drop the temporary art; README showcase; TheaBonk v2 when fixed.

## Ship TheaBonk's touch controls + fullscreen play (owner task, 2026-10-12)
Release rule from the owner: 2.1.0 is live, so step 1 ships at once as patch 2.1.1; steps 2–3
(TheaBonk v2 + fullscreen play) ship together as the next release once preview checks pass.
"I approve both. Record the approvals so the production guard allows them." Work happens in a
second worktree (~/Documents/AI-Kids-Games-ship) because the main checkout holds another
session's uncommitted sizzle-reel work — never touch that checkout's files.
- Step 1 (2.1.1): src/lib/devices.ts `computerOnly(game)` = no Touch in controls.types, or
  only Computer in supportedDevices (straight from game.json); `touchOnlyDevice()` = no fine
  pointer + coarse pointer / touch points. Play page: computer-only game on a touch-only device
  → "<title> needs a keyboard and mouse or a game controller for now. Touch controls are coming
  soon!" with Back (to details) and "I have a keyboard or controller" (holds for the visit, no
  storage); the game is not downloaded meanwhile. Cards add "· Computer game", details add a
  note under Works on. All of it disappears when the manifest lists Touch + phone/tablet.
  tests/devices.test.ts, tests/e2e/touch-gate.spec.ts (skips once no game is computer-only);
  e2e `boot()` presses through the screen. The copy promises touch "soon": only TheaBonk is
  computer-only; make that sentence conditional if a computer-only game without touch plans
  is ever added.

## Sizzle reel v1 (branch sizzle-reel; owner approved the storyboard, end card says aikids.games)

Built as code in `marketing/sizzle/` (workspace @ai-kids-games/sizzle; see its README). HyperFrames
0.8.133 via npx (telemetry off), GSAP 3.13.0 from npm, ffmpeg-static (Homebrew ffmpeg is broken on
this Mac: missing libx265) and @ffprobe-installer/ffprobe for HyperFrames' ffprobe.
1. COMPLETE: storyboard (STORYBOARD.md, storyboard/*.jpg).
2. Capture (`npm run reel:capture -- <slug>`, routes in capture/games/): Calex, TheaBonk (live v1,
   the site's route with sound on), Vanex, Space Sky, Light Crossing done except the tablet take;
   Cliff Valley next. Shared capture lib (apps/site/scripts/capture/lib.ts) gained device sizes,
   an audio tap (AudioNode.connect → MediaStreamDestination, mixed in a recorder AudioContext whose
   resume() must not be awaited without a timeout before a user gesture) and an output dir.
   Pitfalls found:
   - This Mac's screen is 120 Hz: `canvas.captureStream(60)` samples a 120 fps game unevenly
     (8/17/25 ms). Record with `captureStream(120)` and resample to 60 in the trim (even).
     `captureStream()` with no rate gave Light Crossing no frames at all.
   - A covered or touched capture window stalls frames; run.ts rejects takes with stalls.
   - Vanex at quality "high" drops to ~46 fps with a full maze; use "medium". Its speed button
     text is CSS-uppercased ("3X"). Escape with no dialog open pauses the game.
   - Space Sky: wait ~1.5 s on the title before clicking Play (the intro swallows clicks).
   - Light Crossing camera.zoom scales the distance (0.7 = closest). Never return dev.start()'s
     Game object through page.evaluate (serializing it can hang).
   - Never pgrep/pkill with a pattern that matches the waiting shell's own command line.
   - Another session works in the worktree ~/Documents/AI-Kids-Games-ship (branch
     theabonk-touch-gate) and runs browser tests there; the capture waits for them.
3–6. Written, not yet run: music/ (synth + score from the cut's blocks), compose/build.ts,
   render/ (media trims and mix, HyperFrames renders, encodes, captions, publish), review/run.ts;
   site: components/Trailer.tsx (Home button + dialog, About inline), styles, tests
   (tests/trailer.test.ts, tests/e2e/trailer.spec.ts). Web files go to apps/site/public/trailer/.

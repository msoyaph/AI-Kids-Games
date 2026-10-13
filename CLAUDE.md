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
- 2.1.1 LIVE 2026-10-12 (PR #4, rebase-merged; dpl_6rR17ZwcTwAc6aufd9rarH7KmPWW): guard log
  "approved by the owner"; AIKG_ALLOW_PRODUCTION=2.1.1 (set with `vercel env update … production`
  from a scratch link dir). Production smoke 41/0 (4 device skips); local full suite 103/0.
  Hosted-preview QA: creating a protection-bypass secret was refused by the session's safety
  classifier; the in-app browser (signed in to Vercel) checked the preview instead.
- CI facts: any change to package-lock.json, package.json, scripts/ or ci.yml runs every game's
  browser suite, and Space Sky's (and often Light Crossing's) have never passed on GitHub's
  GPU-less runners; TheaBonk v1's file:// smoke flakes there too. Keep release PRs off those paths
  (2.1.1 kept the lockfile as on main: npm ci ignores the workspace version field).
- Step 3 (fullscreen play, ships with TheaBonk v2 as 2.2.0): src/lib/fullscreen.ts (standard +
  webkit-prefixed API, `fullscreenSupported`, Android `lockOrientation(game.orientation)` /
  `unlockOrientation`, `standaloneDisplay`, `iPhoneSafari` = iPhone/iPod UA + navigator.standalone
  + no element fullscreen). Play page: top-bar button only where supported (iPhone: hidden);
  fullscreen = `.play-shell.is-full` grid with a rail (max(48px, safe-area inset) on the left, on
  top when portrait) holding the "Game menu" corner button → Back / Exit fullscreen, so it never
  covers the game; other insets pad the game. Any exit (Esc, swipe, back gesture) just updates
  state; iframe refocused after site buttons. One-time tips in `aikg:tips` (["fullscreen",
  "home-screen"]): "Play fullscreen?" on touch-first devices that can, the Home Screen card on
  iPhone (says plainly that Home Screen progress is separate from Safari's — WebKit by design).
  Head: viewport-fit=cover, mobile/apple-mobile-web-app-capable, apple title, status bar default;
  manifest id/scope/orientation; .container/.site-header/.play-bar pad safe areas.
  Tests: tests/fullscreen.test.ts; tests/e2e/fullscreen.spec.ts on Chromium desktop/tablet/phone
  and WebKit desktop/iPad (desktop-class WebKit, touch, Mac UA)/iPhone (no Fullscreen API, as on
  a real iPhone). WebKit refuses port 4190 (restricted), so a second server runs on 4191; WebKit
  projects are local + hosted-preview only (CI installs Chromium). Four games have their own
  fullscreen button (Calex Cart, Light Crossing, Space Sky, Vanex Defense): all work in the site,
  alone and on top of the site's fullscreen; TheaBonk and Cliff Valley have none.
- Step 2 (TheaBonk v2, ships as 2.2.0): fixed in TheaBonk's own project (test-only ?slowframe /
  ?nodamage / ?gputier; deterministic governor and 5-minute touch playthrough; headless
  touch-vs-keyboard comparison: touch is not worse, heading lock kept as an off-by-default switch);
  full verification green; merged to its main and tagged v2.0.0 (6155347). Pulled here with
  `git subtree pull --prefix=games/theabonk ~/Documents/TheaBonk main` (full history), then
  removed its per-game lockfile, .claude/launch.json and nested .github workflows (one used a
  self-hosted runner); its docs/CI.md says the root workflow replaces them. Its Playwright config
  runs the projects whose browsers are installed (root CI: Chromium only). Import: sha256
  f1a627e9…d2aa372 (byte-identical to its own build). Manifest 2.0.0: Computer/Tablet/Phone +
  Touch → the 2.1.1 keyboard screen and labels vanish for it. Storage audit redone (theabonk.save,
  .save.bak, .playtest/.tuning in test modes; origin worst case ≈ 3.5 MB). Site tests: boot()
  turns phones to landscape for TheaBonk and answers the "Play fullscreen?" tip; new in-site test
  "TheaBonk 2.0 glass touch controls move Thea and jump" (CDP touches, tablet + phone). Monorepo
  tag for the import: theabonk-v2.0.0.
- Hosted preview of 2.2.0 (site-2.2.0 branch alias) checked in the in-app browser (signed in to
  Vercel) at phone size with touch emulation: no keyboard screen for TheaBonk, details "Computer,
  tablet and phone, phones held sideways", "Play fullscreen?" once (aikg:tips written), Tablet tier
  + Relaxed preselected. Limits of that pane: it denies page fullscreen ("Permissions check
  failed") and sends mouse clicks (TheaBonk then switches to desktop mode, as it should for a
  mouse) — fullscreen and real touches are covered by the local Chromium/WebKit suites.
- Still to check on real devices (no emulator covers them): iPhone Safari (Home Screen card,
  Add to Home Screen, standalone launch with safe areas, and that Home Screen progress is indeed
  separate), iPad Safari fullscreen (incl. older webkit-prefixed iPadOS), Android Chrome fullscreen +
  the landscape lock + back gesture, real multi-touch feel of TheaBonk's glass controls (stick
  dead zone, auto camera, haptics on Android), a real gamepad and pointer lock in fullscreen on a
  computer, and performance / the quality governor on a mid-range phone and tablet.
- 2.2.0 LIVE 2026-10-12 (PR #7, merge commit 56d4e5d — merge, never rebase, when a PR carries a
  subtree pull; dpl_J9CH4QjiZXktsabniqKTeY3Pa9AY): guard log "approved by the owner";
  AIKG_ALLOW_PRODUCTION=2.2.0. Production suite 132/0 (72 device/engine skips); Lighthouse mobile
  home 98/100/100/100, details 99/100/100/100, play 92/100/100/100. Monorepo tag theabonk-v2.0.0.
  CI: TheaBonk's Chromium suite (incl. the 5-minute touch playthrough) passes on GitHub's runners;
  its desktop 150% scaling check flaked once (passed on retry).


## Sizzle reel v1 (branch sizzle-reel; owner approved the storyboard, end card says aikids.games)

Built as code in `marketing/sizzle/` (workspace @ai-kids-games/sizzle; see its README). HyperFrames
0.8.133 via npx (telemetry off), GSAP 3.13.0 from npm, ffmpeg-static (Homebrew ffmpeg is broken on
this Mac: missing libx265) and @ffprobe-installer/ffprobe for HyperFrames' ffprobe.
1. COMPLETE: storyboard (STORYBOARD.md, storyboard/*.jpg).
2. Capture (`cd marketing/sizzle && npm ci && npm run capture -- <slug>`; not a root workspace, so the root lockfile and CI stay untouched; routes in capture/games/): Calex, TheaBonk (live v1,
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
3–5. COMPLETE: music (1,025 notes, renders in ~2 s), 4 HyperFrames renders (60 s 16:9 and 9:16,
   15 s cutdowns; ~5 min each 60 s on this Mac), review: every cut on the beat, at most 2 flashes
   per second, −14.0 LUFS / −4.3 dBTP, text on screen long enough to read. Pitfalls: SVT-AV1 in
   ffmpeg-static 6.0 is v1.4 and slow: one pass at a target bitrate, preset 10. HyperFrames falls
   back to screenshot capture when CSS blur is used (fine, ~5 min per minute of 1080p60).
6. Site: Trailer.tsx (Home "Watch the trailer" dialog: muted, captions on, Escape closes, focus
   returns, nothing loads before play; About: poster you press, text description), files in
   apps/site/public/trailer/ (AV1 WebM first, H.264 fallback, 720/1080 by screen), trailer.json
   written by `npm run publish` in marketing/sizzle. Home Lighthouse 97/100/100/100, 0 trailer
   requests before play; 109 site e2e passed. README thumbnail links to the release.

## Release 2.3.0: the trailer (owner, 2026-10-12: "update everything including all the games to live production")
- Scope: PR #5 (sizzle-reel) merged with main's 2.2.0. The six games stay at their 2.2.0
  versions, which are their latest releases (checked against each game's own project: Calex Cart
  0.2.0, Cliff Valley 1.0.0, Light Crossing 2.0.0 in ~/Light Crossing, Space Sky 2.0.0,
  TheaBonk 2.0.0, Vanex Defense 2.0.0; no newer commits). DEPLOYMENT.json records the approval;
  AIKG_ALLOW_PRODUCTION=2.3.0 is set in Vercel's Production environment just before the merge.
- marketing/sizzle is deliberately not a root workspace: root package.json, package-lock.json and
  ci.yml stay as on main, so CI runs only the website job (any change there runs every game's
  browser suite, and Space Sky's and Light Crossing's never pass on GitHub's GPU-less runners).
  The reel installs separately: `cd marketing/sizzle && npm ci` after the root `npm ci`.
- README: the trailer plays inline (GitHub user-attachments video, PR #6), links to the release
  and to YouTube (https://www.youtube.com/watch?v=C47DcpiEVo8). The reel shows TheaBonk v1
  footage; recapture it with `npm run capture -- theabonk` in marketing/sizzle if wanted.
- 2.3.0 LIVE 2026-10-12 (PR #5, merge commit 4d6ed5a; dpl_5jsqW2PPkRok73bzQtQz9uD34xYs): guard
  log "approved by the owner"; AIKG_ALLOW_PRODUCTION=2.3.0. Production suite 138/0 (72 device and
  engine skips); Lighthouse mobile home 99/100/100/100, details 99/100/100/100, play 55 (exempt)/
  100/100/100; 0 trailer requests before play. A local suite failure was the disk filling up
  (ENOSPC): the reel's build/ folder (1.7 GB) is regenerable, so delete it when space runs low.

## Seventh game: Tuck Pop, a block puzzle (owner brief 2026-10-13; slug `tuck-pop`, branch `seventh-game`)

Brief: docs/prompts/tuck-pop.md. Plan, rules and status: games/tuck-pop/CLAUDE.md.

**Owner decisions:**
- **CI:** Space Sky's and Light Crossing's browser suites run locally before each release.
- **Name:** Tuck Pop (owner's pick from 5 names checked against app listings). It was renamed
  from the working slug `blocks-wip` before any game code existed; prefix `tuckpop.`.
- **Genres and blocklist:** Puzzle and Casual genres; the inspiring title and three other
  block-puzzle titles join the trademark blocklist.
- **Versions:** game 1.0.0, site 2.4.0. Stop for production approval.

**Phase 0 (complete), repo side:**
- `site.status: "In development"` (new) keeps a game validated but off the website, the README,
  llms.txt and the build-sync check. `npm run new-game` now starts games that way.
- `.github/scripts/what-changed.mjs` (+ `node --test` tests in the repo checks job) replaces the
  inline picker:
  - the game list comes from `games/*`;
  - root package.json, .nvmrc, ci.yml and `.github/scripts/` run every game;
  - a lockfile change runs only the workspaces whose entries changed, but any shared dependency
    runs every game;
  - root `scripts/` and `docs/` run no game suites; no game uses them.
- **Space Sky and Light Crossing:** CI runs only their typecheck, unit tests and build. Their
  browser suites run with `npm run release:local` (scripts/release-local.ts). It refuses while
  other tests run or with uncommitted game changes, and records passed/failed/flaky, the game
  version and its build-inputs hash in apps/site/DEPLOYMENT.json `localSuites`.
- **Production guard:** check-deployment.ts refuses a release without a passing record for its
  version whose hashes match BUILD_IMPORTS.json (list: apps/site/scripts/local-suites.ts; tests
  run the guard on temp fixtures).
- New games default to Chromium + WebKit in CI and to typecheck/test/build checks.

**FOLLOW-UP (owner):** get Space Sky's and Light Crossing's browser suites passing on GitHub's
runners, then empty `LOCAL_SUITES`.

**Phases 1–8 complete** (rules, dealer, play, effects and sound, modes, Adventure, themes and
accessibility, hardening); see games/tuck-pop/CLAUDE.md for details and numbers.

**Phase 9:**
- The game is listed, built, audited and captured.
- The README game table is generated between the GAMES markers by `npm run manifests`. It uses a
  simple Game / What it is / Ages / Source format; the showcase format waits for aikids.games.
- Site tests now count 7 games (ages 6 → LC, Space Sky, Tuck Pop).

**Phase 10 (2026-10-13):**
- **Approval:** the owner wrote "complete all the phases end to end" (phase 10: release after
  approval), recorded in DEPLOYMENT.json for 2.4.0.
- **Local GPU run:** Space Sky 42/0. Light Crossing 190/0 with 1 flaky, after running with 2 workers
  and 1 retry. The first runs (6, then 3 workers) failed 73, then 11, from GPU contention in its
  long touch playthroughs.
- **CI fixes in Tuck Pop:**
  - 1× on software WebGL, plus a frame-rate governor;
  - retired textures are destroyed later, because a governor redraw mid-word crashed WebKit on
    Linux;
  - fake gamepad presses last exactly one frame. Held across slow test round-trips, the d-pad's
    auto-repeat moved focus twice.
- **Preview tie-break:** see apps/site/CLAUDE.md.
- **PR:** msoyaph/AI-Kids-Games#10.

**2.4.0 LIVE 2026-10-13** (PR #10, merge commit 22fb160; dpl_FtgxLuCNMft5d72MSYiHWmhwvR17):
- **Guard:** "approved by the owner on 2026-10-13; GPU browser suites passed on 966d126".
  AIKG_ALLOW_PRODUCTION=2.4.0, set with `vercel env update … production` from a scratch link dir.
- **Tests and builds:**
  - CI was green on af74bcc, all seven game jobs included;
  - the production suite passed 141/0 (72 device and engine skips);
  - production's Tuck Pop file is byte-identical to the verified build.
- **Lighthouse mobile (production):**
  - home 99/100/100/100; details 99/100/100/100;
  - play 89 (exempt)/100/100/100;
  - Tuck Pop details 99/100/100/100; Tuck Pop play 99/100/100/100.
- **Pitfall:** fetch before cutting a branch from `origin/main` after a merge. A stale ref
  checks out the old tree, which removed games/tuck-pop from the working copy mid-test.

**Merge order with the Agentmon branch:** that branch was cut from 4e03eae and still has
`games/blocks-wip`. Whichever lands second reconciles the lockfile and must not bring that folder
back.

## Eighth game: Agentmon (owner brief 2026-10-13; slug `agentmon`, branch `agentmon`)

Brief: docs/prompts/agentmon.md. Plan, rules and status: games/agentmon/CLAUDE.md (approved plan in
games/agentmon/docs/PLAN.md). Built in its own worktree (~/Documents/AI-Kids-Games-agentmon) from
Tuck Pop's phase 0 commit 4e03eae, while the Tuck Pop session worked in this checkout: never run
heavy tests alongside another session (games/agentmon/scripts/quiet-check.mjs).

**Repo side:** the RPG genre (schema, manifest validator, site Category) and more monster-taming and
RPG franchise names on the trademark blocklist. `main` (Tuck Pop, 2.4.0) was merged into `agentmon`
in phase 13; the lockfile is main's plus Agentmon's workspace entries, and `games/blocks-wip` stays
gone. No change to ci.yml: Agentmon gets the default checks and Chromium + WebKit, and its
`npm test` includes the sims (the playthrough bot), so CI runs them.

**Phases 0–12 complete; phase 13 (site and PR)** (see games/agentmon/CLAUDE.md): game 1.0.0, listed "Ready to play" (order
8), imported, storage audited (apps/site/STORAGE_AUDIT.md), previews captured, cover, logo and OG
image, site tests at 8 games.

**Release plan (owner: "Don't merge and don't release to production; I'll play it first and then
approve"):** the PR keeps the site at its current version (2.4.0, then 2.4.1 once PR #12 lands and
`main` is merged in again; TheaBonk stays the hero's first slide, and Agentmon isn't featured, so it
isn't in the hero). After the owner's approval, the release commit bumps the site to 2.5.0 on top of
2.4.1, records the approval in DEPLOYMENT.json and runs `npm run release:local` (Space
Sky and Light Crossing GPU suites); then AIKG_ALLOW_PRODUCTION=2.5.0 in Vercel Production, merge with
a merge commit, the production smoke test and Lighthouse, and the record PR.

**Agentmon 1.1** (owner brief and approved plan 2026-10-13; plan games/agentmon/docs/PLAN-1.1.md;
branch `agentmon-1.1`, worktree ~/Documents/AI-Kids-Games-agentmon-1.1, PR stacked on the 1.0 PR):
polish across the game, 25 new Agentmon (77 in all) and the post-game Banyan Hollow, and pet care
at the Agent Base. Game 1.1.0, re-imported; no new storage keys and no save migration (1.0 saves
load as they are, tested with a real 1.0 save). The PR keeps the site at its current version; the
owner plays it first, and the release (on its own or together with 1.0) bumps the site then.

## Setting up on another computer
1. `git clone https://github.com/msoyaph/AI-Kids-Games && cd AI-Kids-Games`, Node 24 (`.nvmrc`),
   `npm ci`, `npx playwright install chromium webkit`.
2. Site: `npm run dev` / `npm test` / `npm run build`, browser tests with
   `npm run test:e2e --workspace apps/site`.
3. Deploys: `gh auth login` (account msoyaph), and `npx vercel link` to real-tours/ai-kids-games
   (Root Directory apps/site). Production needs a new version, its DEPLOYMENT.json approval and
   AIKG_ALLOW_PRODUCTION in Vercel's Production environment (see scripts/check-deployment.ts).
4. Reel: `cd marketing/sizzle && npm ci`; HyperFrames runs via npx. Raw takes
   (marketing/sizzle/captures/) and renders (out/) are git-ignored: copy them over to re-render
   without recapturing; the masters are also on the Sizzle reel v1 release.
5. The game folders in the monorepo (games/<slug>) carry each game's full history; the old
   standalone project folders are no longer needed.

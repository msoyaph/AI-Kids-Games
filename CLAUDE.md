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

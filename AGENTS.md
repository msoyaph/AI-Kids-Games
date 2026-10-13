# AGENTS.md: working in the AI Kids Games repo

Instructions for AI coding assistants (and humans) working here. Claude Code also reads
`CLAUDE.md`, which holds the project's running notes; this file is the stable guide.

## What this repo is

- `apps/site/`: the AI Kids Games website (Vite, React, React Router, strict TypeScript). Static
  pages per route, a strict Content Security Policy, no data collection. It ships each game as
  one committed file, `apps/site/public/games/<slug>/index.html`, played in a sandboxed iframe.
- `games/<slug>/`: each game's complete project with its own tests and docs. `game.json` is the
  single source of truth for its listing.
- `community/<slug>/`: **community games** by anyone, source only, submitted in pull requests
  ([SUBMITTING.md](SUBMITTING.md), [MODERATION.md](MODERATION.md)). They are not workspaces. They
  are built with `tooling/community-kit` and served by `apps/play` from their own addresses, never
  from the website's origin.
- `templates/game-starter/`: *Star Catch*, the smallest complete game that follows the contract.
- `scripts/`: repo tooling. `docs/`: guides, the manifest schema and the example briefs.
- npm workspaces with one root lockfile. Node 24.

## Commands

```bash
npm ci
npm run dev                                   # website at http://127.0.0.1:5190
npm test                                      # website unit tests
npm run test:e2e                              # website browser tests
npm run check                                 # repo hygiene + committed builds match sources
npm run manifests                             # regenerate site registry, README table, llms.txt
npm run import-game -- <slug>                 # build a game and copy it into the website
npm run new-game -- <slug> --title "Title"    # new game from the starter
npm run <script> --workspace games/<slug>     # any game's own scripts (typecheck, test, build, ...)
npm run new-community-game -- <slug> --handle @nickname   # a community game from the starter
npm run dev:community -- <slug>               # play a community game while building it
npm run check-submission -- <slug>            # every check a community game must pass
npm run review-submission -- <PR>             # the owner's review kit (MODERATION.md)
```

## The game contract (every game, no exceptions)

1. `npm run build` produces one self-contained `dist/index.html` that works offline, from
   `file://` and in `sandbox="allow-scripts allow-same-origin allow-pointer-lock"`.
2. **No network requests** of any kind: no CDNs, web fonts, analytics, ads, embeds or APIs.
3. **One storage prefix** per game. Every `localStorage` key starts with it. Never call
   `localStorage.clear()` and never touch, list or delete other keys: all games and the website
   share one origin. Saves are versioned and migrated; never break existing saves or rename keys.
4. **Kid-safe:** no ads, purchases, loot boxes, accounts, chat, tracking or personal data.
   Age-appropriate content, honest content notes, flashing at or under 3 per second, readable
   text, 48 px touch targets, reduced-motion support.
5. **Original:** no other companies' game titles, characters, names, art, music or trademarks, in
   the game or in its listing (names, descriptions, tags, keywords). A game's README may name its
   inspirations with "not affiliated with or endorsed by" wording; nothing else may.
6. A **read-only test hook** on `window` and a **capture route** (a URL like `?scene=...`) that
   shows a good moment without saving anything.
7. **Tests:** unit tests for the rules and a browser test that plays the built file, with no
   console errors and no requests to other origins.

## Rules for changes

- **Never edit a built game** in `apps/site/public/games/`. Change the game's source, then run
  `npm run import-game -- <slug>`. CI fails if a game's source changed without a re-import.
- After editing a `game.json`, run `npm run manifests` and commit the generated files.
- Keep the website's privacy promises: no new origins in its CSP, no cookies, no analytics, and
  outbound links keep the grown-up check.
- **Never add a self-hosted runner** or a workflow that uses one: this repository is public.
- **Community games:** when helping someone submit a game, follow SUBMITTING.md's section for
  assistants and change only that game's `community/<slug>/` folder. Never copy a community game
  into `apps/site/public/games/`, run `npm install` in its folder, or set its `approval` or
  `listing` (only the owner's review tool does). Community pull requests run under `pull_request`
  only, with read-only permissions and no secrets; never use `pull_request_target`.
- Production deploys need the owner's approval for each release (see `apps/site/DEPLOYMENT.json`
  and `apps/site/scripts/check-deployment.ts`); never bypass or weaken that guard.
- Run the affected game's own checks (typecheck, unit, build, browser tests) and `npm run check`
  before committing. Keep commits focused and describe what changed and how it was tested.

## Building a new game with an AI assistant

Start from a written brief: genre, ages, the core loop, content, controls for every device,
accessibility, the contract above, and a definition of done. Plan first, build in phases, run the
game and the tests after each phase, commit, and keep the game's `CLAUDE.md` up to date. The
six original briefs in [docs/prompts](docs/prompts/) are worked examples, and
[docs/CREATE-A-GAME.md](docs/CREATE-A-GAME.md) is the step-by-step guide.

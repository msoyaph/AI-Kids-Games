# The AI Kids Games app for AI assistants (apps/mcp)

An MCP server (Streamable HTTP, stateless, no sign-in) plus one MCP Apps widget, so that ChatGPT,
Claude and other assistants can show AI Kids Games as cards and let families try a game in the
conversation. README.md describes it; TESTING.md is the manual test guide;
docs/COMPATIBILITY.md is the research (2026-10-13).

**Plan:** ~/.claude/plans/humming-crunching-aho.md (owner-approved with changes, 2026-10-13).
**Branch:** `mcp-app` in the worktree ~/Documents/AI-Kids-Games-mcp. It is a draft PR that I never
merge.

## Rules

**Builds and saves**
- Never change a game build. The player runs only bytes whose SHA-256 matches
  apps/site/BUILD_IMPORTS.json (catalog `build.sha256`). It checks this in the widget, and the server
  checks it again before serving `aikg://games/<slug>/index.html`.
- The game frame keeps the website's sandbox exactly: `allow-scripts allow-same-origin allow-pointer-lock`,
  `allow="fullscreen; gamepad"`.

**Privacy**
- Tools take fixed choices only (enums and numbers), never free text.
- No cookies and no logging. `onerror` stays silent, and tests spy on the console.
- Rate limiting holds a keyed hash of the address in memory for at most a minute.

**Links and sizes**
- Links go only to SITE_ORIGIN and the GitHub repo, with no query strings (`widget/src/links.ts`), and
  open the host's way: `window.openai.openExternal`, else `ui/open-link`.
- At most 2 actions per card, 1 per list item and 2 links per widget.

**Branding and voice**
- No logo, brand bar or badge in ChatGPT, which shows our name and icon itself. Host fonts everywhere,
  with the site's green as the accent.
- Brand spelling "AI Kids Games".
- Labels say "aikids.games" only when SITE_ORIGIN is `https://aikids.games`.
- Speak to parents and caregivers; never invite a child to use the assistant. No other companies'
  titles (tests/text.test.ts runs `trademarksIn`).

**Releases**
- The catalog comes only from `npm run manifests`: released ("Ready to play") games, plus approved
  community games (card-only).
- Production needs the owner's approval in DEPLOYMENT.json and `AIKG_ALLOW_PRODUCTION`
  (scripts/check-deployment.ts). It ships together with the site release whose Privacy, For Parents,
  FAQ and Terms pages describe the app.
- Before any browser test: `node games/agentmon/scripts/quiet-check.mjs --wait`, then 60 quiet
  seconds.
- Harness ports: 4330 host, 4331 sandbox proxy, 4332 website files, 4333 MCP. `npm run inspect` uses
  4334/4335.

## Owner decisions (2026-10-13)

1. MCP previews are public: Vercel Authentication is off on `ai-kids-games-mcp` only.
2. Cliff Valley is card-only (`embed: site`): its PixiJS build needs `unsafe-eval`. The follow-up is
   at the end of this file.
3. Cards: primary **Play on aikids.games** (the label follows the site address), secondary **Try it
   here** (in-chat play). Card-only games: **Play on aikids.games** + **See all games**.
4. A short Terms page on the site, as a draft for the owner to review.
5. ChatGPT listing materials are ready; submission waits for aikids.games.
6. If the harness shows Calex Cart or Light Crossing freezing without gamepad access, they become
   card-only, with the fix written up for their own projects.

## Decisions made while building

- **SDK:** `@modelcontextprotocol/server` 2.2.0 with its own `createMcpHandler` (both eras), not
  `mcp-handler`. Exact versions at least two weeks old; `@modelcontextprotocol/core` is pinned to 2.2.0,
  so only one copy is installed.
- **Bridge:** the widget uses a small bridge, not ext-apps' App class (about 400 KB with the client and
  zod). The harness checks it against the official AppBridge.
- **One widget** (`ui://aikg/widget-v1.html`) for list, card and player, so "Try it here" turns the
  card into the player without a model turn.
- **Loading the game:** fetch from the site, else `resources/read` through the host; never a frame
  from another origin (Claude restricts `frameDomains`).
- **Play needs one tap:** the Start button, or "Try it here", is needed for fullscreen and sound, and
  so re-rendered chat history never downloads a game.
- **Storage note:** shows unless the widget's own `aikg:mcp-seen` date is over a day old. ChatGPT always
  shows it, as its storage isn't reliable.
- **Rate limits:** 120/min per address; 3000/min for Anthropic's and OpenAI's published ranges
  (src/data/egress.json; `npm run refresh-egress`), because all of Claude's traffic comes from one
  range; 12000/min per instance.
- **Vercel:** Build Output API with a Node adapter (src/node.ts). Project `ai-kids-games-mcp`
  (prj_rM7pNnMHXnRmsPNKuPTR8vgzDPgL, team real-tours), not Git-connected until release.
  - Previews only via `npm run deploy:preview` (build + `vercel deploy --prebuilt --target preview`;
    it records the address in DEPLOYMENT.json).
  - The link file `apps/mcp/.vercel/project.json` is written by hand (git-ignored), never with
    `vercel link`, which can connect Git.
  - **Incident 2026-10-13:** the very first plain `vercel deploy --prebuilt` of the new project landed
    in **production** (`ai-kids-games-mcp.vercel.app`). A prebuilt upload skips the build's gate.
    - It was removed within minutes (`vercel remove`; the alias now answers 404) and redeployed as a
      preview.
    - Since then the build writes `.vercel/output/builds.json` with its target, which is
      `preview` unless the production gate approved.
    - Never run a plain `vercel deploy` for this project.
- **CI:** an `mcp` job (typecheck, unit, build, Inspector, harness on Chromium), required by "CI
  passed". what-changed maps apps/mcp to no game.

## Progress

1. COMPLETE (8dcafb7): the manifest fields `embed`, `moods` and `sessionMinutes`, and the generated
   catalog.
2. COMPLETE (aeb993a): server, widget, 47 unit tests.
3. COMPLETE: harness, Inspector checks (26/26 in both eras), Playwright (Chromium, WebKit, and Firefox
   for the gamepad spec), site copy (Privacy, For Parents, FAQ, Terms), CI, docs and listing materials.
   - Gamepad: `getGamepads()` works in host-like frames in all three engines, so Calex Cart and Light
     Crossing stay playable; the hardening is in docs/FOLLOW-UPS.md.
   - Known, harmless notices from inside games (tests/e2e/harness.ts KNOWN):
     - Agentmon's data: fonts are blocked by host CSPs;
     - Calex's accelerometer;
     - WebKit: Space Sky's and Vanex's own fullscreen requests are rejected without a handler.
4. COMPLETE: preview deploy (DEPLOYMENT.json `preview`).
5. IN PROGRESS: release. Owner, 2026-10-14: "Ok deploy to production the MCP updates".
   - Versions: MCP app 1.0.0, website 2.9.0 (Privacy, For Parents, FAQ, Terms).
   - Steps: approvals in both DEPLOYMENT.json files; `release:local`; Git-connect the project
     (Root Directory apps/mcp, production branch main); AIKG_ALLOW_PRODUCTION on all three projects;
     CI green; merge #24; production checks; a record PR.
   - No directory submission.

6. MCP app 1.1.0 (Fieldlark branch, owner's go 2026-10-14: "approved to bump the catalog app's version
   when Fieldlark is added (full-screen). It still goes live only with my production approval."):
   - The catalog gains Fieldlark (`embed: fullscreen`) from `npm run manifests`.
   - Its pause signal (widget/src/signals.ts): the game's Menu or Settings is open
     (`section.panel[aria-label="Menu"|"Settings"]`), which is when its farm clock stops; the farm never
     "ends" (endless goals after the credits). tests/widget-logic.test.ts checks the marks in the build.
   - **1.1.0 LIVE 2026-10-14** with website release 2.10.0 (PR #28; dpl_HmqBs1KTnMZC5hNnPn8jioQ1Qi4v):
     approved in DEPLOYMENT.json, and the guard logged "MCP app 1.1.0 approved by the owner".
     Shooberry follows as MCP app 1.2.0.

## Follow-ups (not in this PR)

- **Cliff Valley:** add `import 'pixi.js/unsafe-eval';` at the top of `src/render/renderer.ts`, as
  Vanex Defense, Tuck Pop and Agentmon do. A scratch experiment confirmed it is enough: the patched
  build starts under an assistant-like CSP, where the current one fails (docs/FOLLOW-UPS.md). It is a
  new game build: re-import, storage re-audit, its own suites. Then set `embed` to `fullscreen`.
- **aikids.games:** once it is registered, set SITE_ORIGIN on both projects, serve `/mcp` on the brand
  domain, then submit to the directories.

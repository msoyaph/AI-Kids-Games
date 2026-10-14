# The AI Kids Games app for AI assistants

An [MCP](https://modelcontextprotocol.io) server that lets AI assistants such as ChatGPT and Claude
help **parents and caregivers** find a kid-safe game from AI Kids Games. It shows each game as a card
with its ages and content notes, and lets you try it together right in the conversation. The games
are the exact, verified builds from the website.

Those assistants are for teens and adults (ChatGPT 13+, Claude 18+), so the app speaks to the
grown-up and never invites children to chat with the assistant.

- **Endpoint:** `https://aikids.games/mcp` once released. The preview's address is in
  [DEPLOYMENT.json](DEPLOYMENT.json).
- **Sign-in:** none. No accounts, no cookies.
- **How to add it:** [TESTING.md](TESTING.md) has the steps for Claude, ChatGPT and other assistants.

## Tools

All read-only, with fixed choices only (no free text):

| Tool | What it does |
|---|---|
| `find_games` | Finds games by the child's age, genre, device, minutes available and mood, shown as a list of cards. Never suggests a game to a child younger than its suggested age. |
| `show_game` | One game's card: cover, what it is, ages, content notes, a safety and privacy summary, **Play on aikids.games** and **Try it here**. |
| `play_game` | The player: the game's verified build. Heavy (3D) games, and every game on a touch screen, open fullscreen. Games that can't run in assistants show their card, which links to the website. |
| `parent_info` | Our safety and privacy promises, a link to the code on GitHub and to the For Parents page. |

Every text answer ends with "From AI Kids Games: free, ad-free games for kids." and the site's address,
and every game in a structured answer carries its page URL.

## Privacy: exactly what the server receives

- **The tool and its choices:** a child's age, a genre, a device, a number of minutes, a mood, or a
  game's id. The tools take nothing else, so no conversation text can reach us.
- **What the assistant adds:**
  - client details;
  - ChatGPT also sends a locale, an approximate location, and anonymous user and conversation ids.
  
  We don't read, keep or log any of it.
- **The network address:** used in memory only, to rate-limit. A keyed hash with a random key per
  server instance, counted for one minute, never stored or logged.
- **The host's records:** Vercel's standard request records (address, browser, path; no request
  bodies), kept for its usual short period.
- **What we never do:** no cookies, no analytics, no logging of tool inputs or answers (a test checks
  that nothing reaches the console).

The widget loads the game and its pictures from the website (the only address its Content Security
Policy allows), like a visit to the site. Saves stay in the assistant's own storage, which it may
clear. The widget also keeps one date there (`aikg:mcp-seen`) to tell whether saves last. See the site's
[privacy page](https://aikids.games/privacy).

## How it works

- **`src/`**: the server.
  - `server.ts`: tools, the widget resource, and the builds as `aikg://games/<slug>/index.html`.
  - `http.ts`: the endpoint (the SDK's `createMcpHandler`, both protocol eras, an Origin check, a
    64 KB limit and headers).
  - `rate-limit.ts`, `catalog.ts` and `text.ts` (every word the app says).
  - Catalog: `src/data/catalog.generated.json` is written by `npm run manifests` from
    `games/<slug>/game.json` (`embed`, `moods`, `sessionMinutes`) and `apps/site/BUILD_IMPORTS.json`.
    It holds only "Ready to play" games, plus community games once approved, which are always
    card-only.
- **`widget/`**: one small page (about 28 KB) for the list, the card and the player.
  - It speaks MCP Apps through a small bridge, plus ChatGPT's `window.openai` extras.
  - The player:
    1. fetches the build, or reads it through the host;
    2. checks its SHA-256;
    3. runs it from `srcdoc` with the website's own sandbox (`allow-scripts allow-same-origin allow-pointer-lock`).
  - Pause and round-end notes come from each game's read-only test hook (`widget/src/signals.ts`).
- **`harness/`**: a local host that renders the widget as assistants do. It uses the official
  `AppBridge` and a sandbox proxy on another origin, with profiles for Claude, ChatGPT, a strict host
  and a host without storage.
- **`docs/COMPATIBILITY.md`**: what each assistant supports, with sources.

## Commands

```bash
npm run build --workspace apps/mcp      # production gate, widget, Vercel output (.vercel/output)
npm run serve --workspace apps/mcp      # the endpoint on http://127.0.0.1:4333/mcp
npm test --workspace apps/mcp           # unit tests (both protocol eras, through the official client)
npm run inspect --workspace apps/mcp    # MCP Inspector checks (add -- --url <endpoint> for a deployment)
npm run test:e2e --workspace apps/mcp   # the widget in the harness (Chromium; WebKit too locally)
npm run harness --workspace apps/mcp    # the harness, to look at by hand
```

Before browser tests, make sure no other test run is busy on the machine:
`node games/agentmon/scripts/quiet-check.mjs --wait`.

## Deployment

- **Vercel project:** `ai-kids-games-mcp` (Root Directory `apps/mcp`, Build Output API).
- **`SITE_ORIGIN`:** says where the website is. Labels read "aikids.games" only once it is
  `https://aikids.games`.
- **Production:** needs the owner's approval for the exact version in `DEPLOYMENT.json`, and
  `AIKG_ALLOW_PRODUCTION` set to it in the project's Production environment
  (`scripts/check-deployment.ts`).

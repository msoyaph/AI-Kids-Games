# Create a game for Ai Kids Games

This guide walks you through making a browser game that follows the Ai Kids Games **game
contract**, from an empty folder to a game that runs on the website on your own computer. You can
write it yourself, or build it with an AI coding assistant the way every game here was made.

## 1. The game contract

Every game in this repo, and every game listed on aikids.games, must:

1. **Be one file.** `npm run build` produces a single self-contained `dist/index.html` with all
   code, styles, art and sound inlined. It works offline, opened from `file://`, and inside a
   sandboxed iframe (`sandbox="allow-scripts allow-same-origin allow-pointer-lock"`).
2. **Make no network requests.** No CDNs, web fonts, analytics, ads, embeds or APIs.
3. **Own one storage prefix.** Every `localStorage` key starts with the game's prefix (for
   example `mygame.`). Wrap storage in try/catch and keep playing (with a friendly note) when it is
   blocked. Never call `localStorage.clear()` or touch other keys. Version your saves and migrate
   old ones, so players never lose progress.
4. **Be kid-safe by design.** No ads, purchases, loot boxes, accounts, chat or personal data. Age-
   appropriate content, honest content notes, flashing at or under 3 per second, readable text and
   48 px touch targets. Original names, characters, art and sound only.
5. **Expose a read-only test hook** (`window.__<name>`) that tests and preview captures can read,
   and that never changes saves on its own.
6. **Offer a capture route:** a URL (for example `?scene=title`) that shows a good-looking moment
   without touching the player's saves, for the site's previews and screenshots.
7. **Ship a `game.json` manifest** (see [game.schema.json](game.schema.json)) and **tests**: unit
   tests for the game logic and at least one browser test that loads the build, plays for a while
   and checks for console errors and network requests.

## 2. Start from the template

```bash
npm ci
npm run new-game -- my-game --title "My Game"
npm install
npm run dev --workspace games/my-game
```

[`templates/game-starter`](../templates/game-starter) is *Star Catch*, a tiny, complete game that
already follows the contract: a canvas game loop, keyboard, mouse, touch and gamepad input, safe
namespaced storage with a versioned save, a read-only test hook, a capture route, a `game.json`,
and Vitest + Playwright tests. `new-game` copies it to `games/my-game` and gives it your title, a
storage prefix (`mygame.`), a test hook (`window.__mygame`) and its own ports. Replace the rules
(`src/sim.ts`) and the art (`src/render.ts`) with yours, and keep the plumbing.

## 3. Build it with an AI coding assistant

All six games were built with [Claude Code](https://claude.com/claude-code) from a written brief.
The briefs are in [docs/prompts](prompts/). A good brief:

- names the game, the ages and the genre, and asks for **original** characters and names;
- fixes the tech stack and the contract above (single file, no network, storage prefix, iframe-safe);
- lists the core loop, the content, the controls for every device, and accessibility needs;
- asks the assistant to plan first, then work in phases, run the tests and commit after each phase,
  and keep a `CLAUDE.md` with notes, commands and status;
- ends with a definition of done: tests that must pass, a size budget, and a final report.

[AGENTS.md](../AGENTS.md) at the repo root tells any AI coding assistant how this repo works.

## 4. Check it

```bash
npm run typecheck --workspace games/my-game
npm test --workspace games/my-game
npm run build --workspace games/my-game        # also checks the contract
npm run test:e2e --workspace games/my-game
```

Then play it on a phone, a tablet and a computer, and go through the kid-safety checklist in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## 5. Try it on the website locally

```bash
npm run import-game -- my-game      # builds it and copies the one file into the site
npm run manifests                   # adds it to the site's game list
npm run dev                         # http://127.0.0.1:5190/game/my-game
```

Draw a cover and logo in `apps/site/public/media/my-game/` and record previews with
`npm run capture-previews --workspace apps/site -- my-game` (see `apps/site/ADDING_A_GAME.md`).

## 6. Share it

- **In this repo:** open a pull request. Games hosted here must be original first-party work that
  the maintainers review in full, because games share the website's origin.
- **On your own site:** fork the repo and give your site and games their own name and look (see
  [BRAND.md](../BRAND.md)).
- **On aikids.games:** listing outside games is coming soon. Open a *Game listing request* issue
  to register interest.

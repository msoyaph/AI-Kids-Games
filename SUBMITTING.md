# Submitting a game to AI Kids Games

Made a kid-safe game? Send it in, and if it's approved it appears in **Community games** on
[AI Kids Games](https://ai-kids-games-fawn.vercel.app/community), with credit to your nickname.
This guide is for people **and for AI coding assistants**; the
[section for assistants](#for-ai-coding-assistants) at the end is a step-by-step version.

> **Grown-ups first.** Games are submitted on GitHub, which is for people **13 and older**. Kids,
> ask a parent or guardian to do it with you. **Never share personal information**: no real names
> of kids, ages, schools, photos or contact details, in the game, its description, your commits or
> your pull request. Use a nickname like `@star-maker`.

## What every game needs

Every community game follows the same rules as our own games, and the checker tests all of them.

- **Kid-safe by design:** no ads, purchases, loot boxes, subscriptions, accounts, chat, tracking or
  personal information.
- **Original work:** its own name, characters, art and music. No other companies' games,
  characters, names or trademarks, in the game or in its description.
- **One file, no internet:** it's built from your source into one file that makes **no network
  requests at all**. Draw art in code (or small SVGs in `src/`) and make sounds with Web Audio.
- **Saves that play nicely:** every saved key starts with the game's own prefix (for example
  `stargarden.`); never `localStorage.clear()`, and never touch anything else.
- **Gentle and readable:** honest ages and content notes, at most **3 flashes a second**, readable
  text, **48 px** touch targets, and it can be played with a keyboard.
- **Open source:** it's published under the **MIT license**, so anyone can read every line.

## 1. Set up

You need a free GitHub account, [Git](https://git-scm.com) and [Node.js](https://nodejs.org) 22 or
newer.

1. **Fork** this repository on GitHub, then clone your fork.
2. In the folder, run `npm ci` to install the shared tools.

## 2. Start your game

```bash
npm run new-community-game -- my-game --handle @your-nickname --title "My Game"
npm run dev:community -- my-game        # play it while you build
```

This copies the starter game (*Star Catch*) into `community/my-game/` and fills in `game.json`.
The slug (`my-game`) is lowercase words joined by hyphens, and becomes the game's address.

What's in the folder:

| File | What it's for |
|---|---|
| `game.json` | The listing: title, description, ages, content notes, controls, devices, your nickname and the originality statement. [docs/community-game.schema.json](docs/community-game.schema.json) explains every field. |
| `index.html`, `src/` | The game. Rules in `src/sim.ts`, drawing in `src/render.ts`, sounds in `src/audio.ts`, saves in `src/storage.ts`. |
| `tests/unit/` | Tests for your rules (optional but recommended). |
| `package.json` | Only `dependencies`, from the allowed list below. |
| `README.md` | About your game. `AGENTS.md` and `CLAUDE.md` guide AI assistants. |

**Allowed:** `.ts`, `.tsx`, `.js`, `.css`, `.html`, `.json`, `.md` and `.svg` files, in `src/`,
`tests/unit/` or the top-level files above, up to 200 KB each and 2 MB in all.
**Not allowed:** images, audio or other binary files, minified or built code, `dist/`, lockfiles,
config files (`vite.config.*`, `tsconfig.json`...) and hidden files. We build every game with our
own shared setup in `tooling/community-kit`.

**Packages:** most games need none. The only ones allowed are listed in
[tooling/community-kit/allowlist.json](tooling/community-kit/allowlist.json) (today `three`,
`@types/three` and `pixi.js`), at exactly those versions. Never run `npm install` in your folder.

## 3. Make it yours, with an AI helper if you like

Change the rules, the drawings and the sounds, then describe the game honestly in `game.json`,
replacing all the starter wording. Keep the plumbing working:

- the **test hook** `window.__mygame` with its `snapshot()` (the checker uses it);
- the **capture routes** listed in `game.json` (`?scene=title`, `?scene=play&seed=7`...), which
  show a moment of the game without saving anything;
- saving through `src/storage.ts`, under your prefix.

An AI coding assistant can help. For example, you could ask:

> Make a small game for a 7-year-old in this folder (community/my-game). Keep the starter's
> structure: src/main.ts, src/sim.ts, src/render.ts and src/storage.ts, the test hook and the
> ?scene= capture routes. Draw everything in code and make sounds with Web Audio: no images, fonts
> or anything from the internet. Then run npm run check-submission -- my-game and fix every problem
> it reports.

## 4. Check it

```bash
npm run check-submission -- my-game
```

This runs every check our reviewers run, and prints ✓ or ✗ for each with a **How to fix** line for
every problem:

| Check | What it looks for |
|---|---|
| Files, manifest, dependencies | The rules above; no starter wording left in `game.json`; no taken slug or prefix. |
| No outside access | No `fetch`, XHR, WebSockets, `sendBeacon`, outside URLs, remote scripts, styles or fonts, `eval` or `new Function`, links that leave the game, or ad and tracking code. |
| Storage | Saves only under your prefix; no `clear()`, `sessionStorage`, IndexedDB or cookies. |
| Content | Rude or hateful words, other companies' names, and topics a reviewer should look at closely (warnings). |
| Type check, unit tests, build | Your TypeScript and tests pass, and the build is one file of at most 2 MB. |
| Contract | The test hook works and every capture route draws something. |
| Browser play test | 20 seconds of play inside the website's own sandbox: no errors and no requests. |
| Storage while playing, flash safety, accessibility | Real saves stay under the prefix, at most 3 flashes a second, 48 px targets, and the game answers the keyboard. |

Run it until everything passes. The full report is in `community/my-game/.check/report.md` (and
`report.json`); that folder is never committed. A **!** is a warning for the reviewer, not a
failure.

## 5. Open a pull request

1. Commit with a sign-off: `git commit -s -m "Add My Game"`. The `-s` adds a `Signed-off-by:` line
   certifying the [Developer Certificate of Origin](https://developercertificate.org): that the
   work is yours to share. Every commit needs it; to fix older ones, run
   `git rebase --signoff main` and push again.
2. Push to a branch in your fork, for example `community/my-game`.
3. Open a pull request to `main`, adding `?template=game-submission.md` to the address of the
   "Open a pull request" page, and fill in the checklist.

The pull request may change **only your own `community/my-game/` folder**. Anything else (shared
code, workflows, other games, the website) makes it fail.

## 6. What happens next

1. **Automated checks.** For a first pull request, a maintainer approves the checks to run. CI then
   checks the scope and sign-offs and runs `check-submission` again.
2. **A person reviews it.** The owner plays your game, reads every word in it and looks through the
   code. If something needs changing, you'll get a friendly note on the pull request; push a fix and
   it's checked again.
3. **Approved.** Your pull request is merged and the owner records the approval, tied to exactly the
   source they reviewed. With the next release, your game appears in Community games, playing from
   its own separate address (`aikg-my-game.vercel.app`), which can't reach the website or other
   games.
4. **Changes later.** Open a new pull request; each new version is reviewed and approved the same
   way before it goes live.

A game can be **unlisted** at any time if a problem turns up; nothing is deleted. Anyone can report
a problem from the game's page. [MODERATION.md](MODERATION.md) describes how reviews work.

## For AI coding assistants

You're helping someone build and submit a community game. Follow these steps in order, and don't
skip the checks.

1. **Scope.** Work only inside `community/<slug>/`. Never edit anything else in the repository: not
   the website, the shared scripts, the workflows, `package.json` or the lockfile. Never run
   `npm install` inside the game's folder.
2. **Start.** If the folder doesn't exist, run
   `npm run new-community-game -- <slug> --handle @<nickname>` from the repository root. Ask the
   person for a nickname; never use or record a real name.
3. **Build the game** in `src/`, keeping the starter's structure, the test hook `window.__<id>`
   with `snapshot()`, and the capture routes in `game.json`. Draw in code, make sounds with Web
   Audio, and save only through `src/storage.ts` under the prefix in `game.json`.
4. **Never** add network code (`fetch`, XHR, WebSocket, EventSource, `sendBeacon`, outside URLs,
   `<script src>`, remote CSS or fonts), `eval`, `new Function`, string timers, `document.write`,
   `window.open`, cookies, `sessionStorage`, IndexedDB or `localStorage.clear()`. Use packages only
   from `tooling/community-kit/allowlist.json`, at exactly those versions.
5. **Keep it kid-safe and original:** age-appropriate, no ads, purchases, accounts, chat or personal
   data, no other companies' names or characters, at most 3 flashes a second, 48 px touch
   targets, and keyboard play.
6. **Describe it** in `game.json`, replacing every piece of starter wording: tagline, short and long
   descriptions, ages, content notes, controls (`quickStart` and `howToPlay`), devices, and an
   honest originality statement that mentions the AI assistant.
7. **Check it:** run `npm run check-submission -- <slug>` from the repository root. Read
   `community/<slug>/.check/report.json`: each failed check has `problems`, each with a `message`,
   a `fix` and often a `file` and `line`. Fix every problem whose severity isn't `warn`, then run
   it again. Repeat until it ends with `PASS`.
8. **Hand over.** Tell the person what you built and what the checks found, and remind them to
   commit with `git commit -s` and open the pull request with the game-submission template. Don't
   push or open pull requests on their behalf unless they ask.

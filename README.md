<h1 align="center">Ai Kids Games</h1>

<p align="center"><b>The games kids love. None of the stuff parents don't.</b><br>
No ads. No subscriptions. No sign-ups. No tracking. Just play, or build your own.</p>

<p align="center">
  <img alt="aikids.games: launching soon" src="https://img.shields.io/badge/aikids.games-launching%20soon-0B7A50?style=flat-square">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0B7A50?style=flat-square"></a>
  <a href="#the-games"><img alt="Games: 6" src="https://img.shields.io/badge/games-6-0B7A50?style=flat-square"></a>
  <img alt="No ads · No tracking" src="https://img.shields.io/badge/no%20ads%20%C2%B7%20no%20tracking-%E2%9C%93-0B7A50?style=flat-square">
</p>

Kids deserve the same fun as everyone else: racing, building, exploring and defending, without ads, loot boxes, subscriptions or strangers in chat. Ai Kids Games takes the kinds of games kids already love and rebuilds them from scratch to be kid-safe by design. Every game is free, runs offline in a single file, and is open source, so anyone can learn from it, remix it, or make their own.

## The games

> **Launching soon on [aikids.games](https://aikids.games).** The full showcase, with covers,
> gameplay previews and Play links, goes here when the site moves to its new home.

| Game | What it is | Source |
|---|---|---|
| **TheaBonk** | A 3D action roguelite: bonk back waves of cartoon monsters until dawn. | [games/theabonk](games/theabonk) |
| **Light Crossing** | A cozy island life-sim: make friends, fish, catch bugs and light the old lighthouse. | [games/light-crossing](games/light-crossing) |
| **Vanex Defense** | Elemental tower defense: build a maze of towers and hold the line. | [games/vanex-defense](games/vanex-defense) |
| **Space Sky** | Build a rocket and explore the solar system in 3D, with real space facts. | [games/space-sky](games/space-sky) |
| **Calex Cart** | An original 3D kart racer with cups, ghosts, Driving School and split-screen. | [games/calex-cart](games/calex-cart) |
| **Cliff Valley** | A cozy pixel-art farming life-sim: grow crops, raise animals and fix up the valley. | [games/cliff-valley](games/cliff-valley) |

## Why Ai Kids Games

Most games for kids come wrapped in things that have nothing to do with play: ads, in-app
purchases, loot boxes, subscriptions, sign-ups, tracking and chat with strangers. Ai Kids Games
keeps the play and leaves the rest out.

- **Real games.** Kart racing, farming, tower defense, space adventures and more, with depth,
  progression and polish, not cut-down "kids' versions".
- **Kid-safe by design.** Nothing to buy, nobody to talk to, nothing that phones home.
- **Open source.** Every line of every game is here to read, learn from and remix.
- **Offline.** Each game is a single HTML file that runs in any modern browser, with or without
  an internet connection.

## For parents

- **No ads, purchases, subscriptions, accounts or chat.** There is nothing to buy and nobody to
  talk to.
- **No tracking.** The website and the games use no analytics, cookies, trackers or third-party
  services, and make no requests to other websites.
- **What stays on the device:** game progress, settings, favorites and recently played games are
  kept in the browser's local storage on your device. Nothing is sent anywhere. Clearing the
  browser's site data removes them.
- **Age guidance and content notes** for every game, with honest notes about conflict, reading
  and difficulty, plus the controls each game needs.
- **Links that leave the site** show a "grown-up check" first.

## Play now

The games are moving to **[aikids.games](https://aikids.games)**, launching soon. Each game in
`games/` also builds into one file you can open on your own computer (see *Running locally*).

## Build your own game

Every game here follows the same simple contract: one self-contained HTML file, no network
requests, its own storage prefix, kid-safe content, and tests. A starter template and a
step-by-step guide, including how to build a game with an AI coding assistant, are on the way.

## List your game on aikids.games

**Coming soon.** We plan to list kid-safe games made by others. Listed games will need to meet
the kid-safety checklist in [CONTRIBUTING.md](CONTRIBUTING.md), be original work (no other
companies' characters, names or trademarks), and follow the game contract. The website itself
never collects any data: listing requests will go through GitHub.

## Made with AI

The games and the website were built with [Claude Code](https://claude.com/claude-code), working
from written briefs: the genre, ages, content rules, controls, the single-file contract and a
definition of done. The original briefs will be shared in `docs/prompts/` as examples.

## Tech stack

- **Games:** TypeScript (strict), Vite with a single-file build, [Three.js](https://threejs.org)
  for the 3D games and [PixiJS](https://pixijs.com) for the 2D ones. Every model, sprite, sound and
  song is generated in code: there are no asset files.
- **Website:** Vite, React and React Router, with static pages per route, self-hosted fonts and a
  Content Security Policy that only allows its own origin.
- **Tests:** Vitest for game logic and simulations, Playwright for browser tests on desktop,
  tablet and phone sizes in Chromium and WebKit.

## Running locally

You need Node.js 24 (see `.nvmrc`).

```bash
npm ci
npm run dev                                    # the website, http://127.0.0.1:5190
npm run dev --workspace games/cliff-valley     # one game on its own
npm run build --workspace games/cliff-valley   # its single-file build in games/cliff-valley/dist
npm test                                       # the website's unit tests
npm run check                                  # repo hygiene and build checks
```

Each game's own README lists its controls, tests and tools.

## Repo structure

```
apps/site/          the website (Vite + React): pages, the committed game builds, art and previews
games/<slug>/       each game's complete project, with its full history
docs/               guides for the whole repo
scripts/            repo tooling: import-game, build and repo checks
```

The website ships each game as one committed file, `apps/site/public/games/<slug>/index.html`.
It is never edited by hand: `npm run import-game -- <slug>` builds the game and copies it in, and
a check fails if a game's source changes without a re-import.

## Contributing

Bug reports, ideas and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md)
(including the kid-safety checklist) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security or
privacy problems: see [SECURITY.md](SECURITY.md).

## License and credits

- Code and games: [MIT License](LICENSE). The Ai Kids Games name and logo identify the official
  site; forks use their own name and branding (see [BRAND.md](BRAND.md)).
- The website's typeface is [Nunito](https://fonts.google.com/specimen/Nunito) by Vernon Adams,
  under the SIL Open Font License (`apps/site/src/assets/fonts/OFL.txt`).
- Built with Three.js, PixiJS, React, Vite, Vitest and Playwright, all under the MIT or Apache 2.0
  licenses.

# Security policy

Ai Kids Games is played by children, so we treat safety and privacy problems as urgent.

## Reporting a problem

Please **don't open a public issue** for a security or privacy problem. Report it privately with
GitHub's **[Report a vulnerability](https://github.com/msoyaph/AI-Kids-Games/security/advisories/new)**
button (Security tab → Advisories). Include:

- what you found and where (the website, a game, or the repo's tooling);
- how to reproduce it, with the browser and device;
- what could happen if someone misused it.

We'll confirm we got it within a few days, keep you updated, and credit you in the fix if you'd like.

## What counts

Anything that could let a game or the website:

- send data anywhere, load anything from another site, or track a player;
- read, change or delete another game's saves or the site's favorites;
- show content that isn't age-appropriate, or link children off the site without the grown-up check;
- run code from a pull request on someone's computer (for example, a self-hosted runner).

Also: leaked secrets in the repo or its history, and weaknesses in the build or deployment
pipeline.

## How the project protects players

- The website and every game make **no requests to other origins**. The site's Content Security
  Policy only allows its own origin, and each game is one self-contained file.
- No accounts, ads, analytics, chat or personal data. Game progress stays in the browser.
- Games run in a sandboxed iframe (`allow-scripts allow-same-origin allow-pointer-lock`). Because
  they share the site's origin, **only reviewed first-party games are hosted**; third-party games
  would need a separate domain (see `apps/site/ADDING_A_GAME.md`).
- **Self-hosted runners are never used** with this public repository. Pull requests from forks
  need a maintainer's approval before their preview deployments run.
- Secret scanning and Dependabot alerts are on.
- Production deploys need the owner's recorded approval for each release.

## Supported versions

Only the current release on https://aikids.games and the `main` branch are supported.

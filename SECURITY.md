# Security policy

AI Kids Games is played by children, so we treat safety and privacy problems as urgent.

## Reporting a problem

Please **don't open a public issue** for a security or privacy problem. Report it privately with
GitHub's **[Report a vulnerability](https://github.com/msoyaph/AI-Kids-Games/security/advisories/new)**
button (Security tab → Advisories). Include:

- what you found and where (the website, a game, or the repo's tooling);
- how to reproduce it, with the browser and device;
- what could happen if someone misused it.

We'll confirm we got it within a few days, keep you updated, and credit you in the fix if you'd like.

## What counts

Anything that could let a game (including a community game) or the website:

- send data anywhere, load anything from another site, or track a player;
- read, change or delete another game's saves or the site's favorites;
- show content that isn't age-appropriate, or link children off the site without the grown-up check;
- run code from a pull request on someone's computer (for example, a self-hosted runner).

Also: leaked secrets in the repo or its history, and weaknesses in the build or deployment
pipeline, including anything that lets a community pull request reach outside its folder, run with
more permissions, or go live without the owner's approval. A problem with a community game's
*content* can be reported in public with the *Report a problem with a community game* form.

## How the project protects players

- The website and every game make **no requests to other origins**. The site's Content Security
  Policy only allows its own origin, and each game is one self-contained file.
- No accounts, ads, analytics, chat or personal data. Game progress stays in the browser.
- Games run in a sandboxed iframe (`allow-scripts allow-same-origin allow-pointer-lock`). Our own
  games share the site's origin, so **only reviewed first-party games are hosted there**.
- **Community games** (by anyone, [SUBMITTING.md](SUBMITTING.md)) are built from source and served
  from their own address, `aikg-<slug>.vercel.app`: a separate site, whose policy allows no
  connections and which only the website may frame. Each passes automated checks, and the owner's
  approval is tied to the exact source reviewed ([MODERATION.md](MODERATION.md)). Their pull requests
  run only under `pull_request`, read-only and without secrets, and may change only their own
  folder.
- **Self-hosted runners are never used** with this public repository. Pull requests from forks
  need a maintainer's approval before their preview deployments run.
- Secret scanning and Dependabot alerts are on.
- Production deploys need the owner's recorded approval for each release.

## Supported versions

Only the current release on the website (https://ai-kids-games-fawn.vercel.app) and the `main` branch are supported.

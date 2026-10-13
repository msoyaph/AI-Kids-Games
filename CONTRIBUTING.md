# Contributing to AI Kids Games

Thank you for helping make games kids love, without the stuff parents don't. Bug reports, game
ideas, fixes, new games and better docs are all welcome.

> **Before you start:** GitHub's terms require everyone with an account to be **13 or older**. If
> you're younger, ask a parent, guardian or teacher to post for you. **Never share personal
> information** in issues, pull requests, discussions, commit messages or games: no real names of
> kids, ages, schools, addresses, photos, phone numbers or social media handles.

## Ways to help

- **Report a bug:** open an issue with the *Bug report* form. Say which game, which device and
  browser, and what happened.
- **Suggest a game or a feature:** use the *Game idea* form, or start a Discussion.
- **Fix something:** pick an issue, comment that you're on it, and open a pull request.
- **Build a game:** start from `templates/game-starter` (`npm run new-game -- <slug>`) and read
  [docs/CREATE-A-GAME.md](docs/CREATE-A-GAME.md).
- **List your game on AI Kids Games:** coming soon. Open a *Game listing request* issue to get in
  line.

## Kid-safety checklist (every pull request)

Every game and every change to the site must keep all of these true:

- [ ] **No ads, purchases, loot boxes, subscriptions or upsells.**
- [ ] **No accounts, sign-ups, chat, user-to-user messaging or user-generated content shared with
      other players.**
- [ ] **No tracking or analytics**, and **no network requests to any other site**: no CDNs, fonts,
      embeds or APIs. Each game is one self-contained HTML file that works offline.
- [ ] **No personal information is asked for or stored.** Player names are nicknames that stay on
      the device.
- [ ] **Storage stays in the game's own prefix** (for example `mygame.`), with no
      `localStorage.clear()` and no touching other keys. Saves are versioned and old saves migrate.
- [ ] **Content suits the stated ages:** no realistic violence, gore, horror or romance for young
      players; flashing stays at or under 3 per second; content notes are honest.
- [ ] **Original work only:** no other companies' characters, art, music, names or trademarks,
      in the game or in its listing. A game's README may name inspirations with "not affiliated
      with or endorsed by" wording.
- [ ] **Accessible:** readable text, 48 px touch targets, reduced-motion support, and controls
      that are explained in the game.
- [ ] **Tests pass:** the game's own unit and browser tests, `npm run check` and the site's tests.

## How the repo works

- `apps/site/` is the AI Kids Games website (Vite, React, TypeScript).
- `games/<slug>/` is each game's full project. Its `game.json` is the single source of truth for
  its listing; run `npm run manifests` after changing it.
- The site ships each game as one committed file, `apps/site/public/games/<slug>/index.html`.
  **Never edit it by hand.** After changing a game, run `npm run import-game -- <slug>`; CI fails
  if a game's source changed without a re-import.
- Pull requests are checked on GitHub's standard runners only. Self-hosted runners are never used
  with this public repository.

```bash
npm ci
npm run dev                                   # the website on http://127.0.0.1:5190
npm run dev --workspace games/cliff-valley    # one game on its own
npm test && npm run check                     # site unit tests, repo and build checks
```

## Pull requests

- Keep each pull request focused on one change, and describe what you changed and how you tested it.
- Fill in the checklist in the pull request template.
- Pull requests from forks need a maintainer's approval before CI and preview deployments run.
- By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE)
  and that you follow our [Code of Conduct](CODE_OF_CONDUCT.md).

Security problems: please don't open a public issue. See [SECURITY.md](SECURITY.md).

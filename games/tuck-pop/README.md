# Tuck Pop

A bright, friendly block puzzle for ages 6 and up, for Ai Kids Games. Drag chunky pieces onto an
8×8 board, fill rows and columns to clear them, and chain clears into streaks. Classic, Relax,
Adventure (60 levels) and a Daily puzzle; helpers you earn by playing, never buy; six themes to
unlock.

Play it on the Ai Kids Games website, or open the built `dist/index.html` directly: it's one
self-contained file that works offline. Notes, plan and status are in [CLAUDE.md](CLAUDE.md); the
brief is in [docs/prompts](../../docs/prompts/tuck-pop.md); the balance report is
[reports/sim.md](reports/sim.md).

## How to play

Drag a piece from the tray onto the board (or tap a piece, then tap the board). Fill a whole row
or column to make it pop. Pieces don't turn. Clear several lines at once, or keep clearing move
after move, for bigger scores. Keyboard: 1, 2, 3 pick a piece, the arrows move it, Enter places
it, Escape puts it back, U undoes. Gamepad: LB and RB pick, the d-pad moves, A places, B puts it
back, X undoes, Start pauses.

## Modes

- **Classic** (Easy or Normal): endless, for your best score. A fair dealer means bad luck alone
  never ends a game.
- **Relax:** calm music, slower effects, a free Undo and a free reshuffle.
- **Adventure:** 60 levels in four worlds (Meadow, Ocean, Candy, Space): clear lines, collect
  cherries, pearls, gems and comets, break stones or reach a score, for up to three stars.
- **Daily puzzle:** the same puzzle for everyone each day, 40 moves, your best score; nothing is
  lost if you skip a day.

Helpers (Undo, Shuffle, Single block) and six themes are earned by playing, never bought.

Like every game here: no ads, purchases, accounts, chat, tracking or network requests. All art is
drawn in code and all sound is synthesized with the Web Audio API.

## Commands

```bash
npm run dev          # http://localhost:5444
npm run typecheck
npm test             # unit tests (Vitest)
npm run build        # one self-contained dist/index.html under 1 MB
npm run test:e2e     # Playwright browser tests (Chromium and WebKit; see scripts/when-idle.sh)
npm run sim          # bot balance report (reports/sim.md)
npm run levels       # rebuild and re-prove the Adventure levels
npm run shots        # review screenshots (reports/shots/)
npm run perf         # throttled-phone frame rate on the real GPU
```

MIT licensed.

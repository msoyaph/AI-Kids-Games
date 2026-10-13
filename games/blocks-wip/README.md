# Blocks (working title)

A bright, friendly block puzzle for ages 6 and up, for Ai Kids Games. Drag chunky pieces onto an
8×8 board, fill rows and columns to clear them, and chain clears into streaks. Classic, Relax,
Adventure (60 levels) and a Daily puzzle; helpers you earn by playing, never buy; six themes to
unlock.

**In development.** The name is a working title and the game is not on the website yet. Notes,
plan and status are in [CLAUDE.md](CLAUDE.md); the brief is in
[docs/prompts](../../docs/prompts/blocks-wip.md).

Like every game here: no ads, purchases, accounts, chat, tracking or network requests. All art is
drawn in code and all sound is synthesized with the Web Audio API.

## Commands

```bash
npm run dev          # http://localhost:5542
npm run typecheck
npm test             # unit tests (Vitest)
npm run build        # one self-contained dist/index.html under 1 MB
npm run test:e2e     # Playwright browser tests
```

MIT licensed.

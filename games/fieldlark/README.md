# Fieldlark

A tiny, complete browser game that follows the AI Kids Games **game contract**. Fly a firefly
around the night sky and catch as many stars as you can in 60 seconds. It's small on purpose:
replace the rules, the art and the name with your own game, and keep the plumbing.

## What it shows you

| Contract rule | Where |
|---|---|
| One self-contained `dist/index.html`, no network at all (a strict Content Security Policy is added to the build) | `vite.config.ts`, `scripts/check-build.mjs` |
| Every saved key starts with the game's prefix; no `clear()`, no touching other keys | `src/config.ts`, `src/storage.ts` |
| Safe storage that keeps working when it's blocked, versioned saves with migration | `src/storage.ts` |
| Game rules separate from drawing, seeded so tests replay exactly | `src/sim.ts` |
| Keyboard, mouse, touch and gamepad, with 48 px buttons and safe areas for notches | `src/input.ts`, `src/style.css` |
| Pauses when it loses focus; sound starts on the first tap or key | `src/main.ts`, `src/audio.ts` |
| A read-only test hook, `window.__fieldlark.snapshot()` | `src/main.ts` |
| A capture route for the website's previews: `?scene=title`, `?scene=play` or `?scene=results`, plus `&seed=N`; it never saves | `src/main.ts` |
| A `game.json` manifest for the website listing | `game.json` |
| Unit tests for the rules and storage, browser tests for play, saves, the capture route and the sandboxed iframe | `tests/` |

All art is drawn in code and the sound is made with the Web Audio API, so there are no asset
files. `?seconds=N` makes a shorter round for testing.

## Commands

```bash
npm run dev          # http://localhost:5769
npm run typecheck
npm test             # unit tests (Vitest)
npm run build        # dist/index.html, then the contract check
npm run test:e2e     # browser tests (Playwright) on the built file, desktop and phone
```

## Kid-safety rules

No ads, purchases, loot boxes, accounts, chat, tracking or network requests. No personal
information: player names, if any, are nicknames kept on the device. Original names, characters,
art and music only. Content that suits the stated ages, flashing at or under 3 per second, and
readable text. The full checklist is in the repo's `CONTRIBUTING.md`.

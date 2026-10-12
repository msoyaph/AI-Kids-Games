# Star Catch (Ai Kids Games starter)

A minimal canvas game that follows the Ai Kids Games game contract. When you turn it into a new
game, keep these working and update this file with your own notes, commands and status.

## Rules that never change

- `npm run build` makes one self-contained `dist/index.html`; `scripts/check-build.mjs` and the
  build-only Content Security Policy fail the build if anything would load from elsewhere.
- No network requests, ads, purchases, accounts, chat, analytics or personal data.
- Storage: every key starts with `GAME.storagePrefix` (`src/config.ts`). Never call
  `localStorage.clear()`, never enumerate or touch other keys. Bump `SAVE_VERSION` and extend
  `migrate()` whenever the save changes shape; old saves must keep loading.
- The test hook (`window[GAME.hook].snapshot()`) only returns copies. The capture route
  (`?scene=`) never saves.
- Original names, characters, art and sound, all generated in code.
- Tests: `npm test` and `npm run test:e2e` must pass before every commit.

## Layout

- `src/config.ts` slug, title, storage prefix, hook name
- `src/sim.ts` the rules (pure, seeded, fixed step), unit-tested
- `src/storage.ts` safe namespaced storage and save versions, unit-tested
- `src/input.ts` keyboard, pointer (touch or mouse), gamepad
- `src/render.ts` canvas drawing; the HUD is HTML so captures of the canvas stay clean
- `src/audio.ts` Web Audio sound, unlocked on the first gesture
- `src/main.ts` screens, the loop, pause on blur, the hook and the capture route

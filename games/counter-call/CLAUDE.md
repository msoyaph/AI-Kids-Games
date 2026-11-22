# Counter Call

A 3D restaurant game (Three.js) for ages 6+, built from `templates/game-starter`'s contract.
The host, Minty, comes from the owner's hand-drawn design sheet (front view).

## Status

Version 1.0.0, "Ready to play", list position 12, shipped with site release 2.13.0 (the site's
side is in `apps/site/CLAUDE.md`). After any change to the build inputs: `npm run import-game --
counter-call`, recapture the previews if the game looks different, and re-audit storage. Not done
yet: gamepad support, WebKit and tablet browser-test projects, play on real phones and tablets.

## Rules that never change

- `npm run build` makes one self-contained `dist/index.html`; `scripts/check-build.mjs` and the
  build-only Content Security Policy fail the build if anything would load from elsewhere.
- No network requests, ads, purchases, accounts, chat, analytics or personal data.
- Every model, texture, icon and sound is generated in code. There are no asset files.
- Storage: every key starts with `GAME.storagePrefix` (`src/config.ts`). Never call
  `localStorage.clear()`, never enumerate or touch other keys. Bump `SAVE_VERSION` and extend
  `migrate()` whenever the save changes shape; old saves must keep loading.
- The test hook (`window.__countercall.snapshot()`) only returns copies. The capture route
  (`?scene=`) and `?auto=1` never save.
- Original names and characters. Nobody gets hurt and nothing is scary.
- `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` must pass before every
  commit.

## Layout

- `src/config.ts` slug, title, storage prefix, hook name
- `src/data/characters.ts` the character registry: the six hosts you can play as (Minty, Single
  Scoop, Double Scoop, Vanilla, Raspberry and Cookie Cream, each with a perk) and the friends, as data
- `src/data/menu.ts` foods and the left-to-right station order; `src/data/days.ts` the eight days;
  `src/data/upgrades.ts` what the shop sells
- `src/sim.ts` the rules (pure, seeded, fixed step) and the room's `LAYOUT`; unit-tested. `modsFor`
  turns the host's perk and the shop upgrades into numbers; `pace` and `RUSH` ramp Endless Rush
- `src/shop.ts` buying upgrades with saved coins (pure)
- `src/bot.ts` a helper that plays by tapping, for the capture route and the difficulty tests
- `src/coach.ts` the first days' hint text
- `src/storage.ts` safe namespaced storage and save versions
- `src/render/kit.ts` cached shapes and materials; `faces.ts` canvas-drawn faces;
  `chibi.ts` the big-head character builder; `food.ts` food models and their icons;
  `portraits.ts` little pictures of the hosts for the menu;
  `world.ts` the diner; `view.ts` camera, per-frame sync, floating buttons and effects
- `src/audio.ts` Web Audio sounds and the tune, unlocked on the first gesture
- `src/main.ts` screens, the loop, input, pause on blur, the hook and the capture route
- `tests/unit/` rules, difficulty, storage and registry; `tests/e2e/smoke.spec.ts` plays the built
  file by keys and by taps, checks saves, the capture route and the sandboxed iframe

## Things worth knowing

- The camera looks from behind the counter toward -z. Stations sit nearest the camera, so their
  appliances stay low and to the left of each station, or they hide Minty. Friends stand a little
  back from the counter (`LAYOUT.guestZ`) so the counter does not hide their faces.
- Heads are very big: arms raised straight up or out are hidden behind the head and twin tails,
  so waving and cheering poses reach forward instead.
- A new host needs a registry entry with `role: 'host'` and a `perk` whose id `modsFor` knows.
  The menu picker, portraits and save all follow from the registry.
- The save is version 2 (`host`, `upgrades`, `endlessBest` were added); version 1 saves migrate.
- Coins are earned in play and spent only in the shop. Changing prices or what a level does?
  `tests/unit/sim.test.ts` checks that Endless Rush still always ends, even with every upgrade.
- On menu screens the host stands in the free part of the screen: `main.ts` measures the card
  (`frameHero`) and `view.ts` fits the camera to that space.
- A new character needs only a registry entry. A new hair style, eye style or accessory needs a
  case in `chibi.ts` or `faces.ts`. A new food needs a row in `menu.ts`, a model in `food.ts`, an
  appliance in `world.ts` and a day that puts it on the menu.
- Changing a day's numbers? `tests/unit/sim.test.ts` plays every day with the helper, quick and
  slow, and fails if a day becomes too hard.
- The dev server binds to 127.0.0.1 (the in-app browser cannot reach an IPv6-only server).
- The floating station buttons and order bubbles move with the scene and bounce when ready, so
  browser tests tap them with `force: true` (Playwright would otherwise wait for them to hold still).
- `?guests=N` shortens a day; the save test uses `?guests=1`.
- `?quality=low` turns off shadows and smoothing and draws at 1x. CI sets `E2E_LOW=1`, which makes
  the browser tests ask for it, because GitHub's runners draw WebGL in software.

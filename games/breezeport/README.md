# Breezeport

A 3D city builder for ages 8–14. You're the junior mayor of Breezeport, a sleepy seaside town on a
sunny bay. Draw roads, zone homes, shops and workplaces, build parks, a school, a library and a
clinic, run buses and a tram, and keep your citizens happy until the whole bay comes to the
festival. There is no energy, nothing ever burns down, and you can never get stuck broke.

Made for [AI Kids Games](../../README.md). Everything is original and built in code: every
building, car and citizen is modelled in TypeScript, and every sound is synthesized. It plays on
phones, tablets and computers with touch, mouse and keyboard, or a gamepad.

## Commands (from the repo root)

```bash
npm run dev --workspace games/breezeport        # http://127.0.0.1:5715
npm run typecheck --workspace games/breezeport
npm test --workspace games/breezeport           # unit tests and the playthrough sims
npm run build --workspace games/breezeport      # dist/index.html, then the contract check
npm run test:e2e --workspace games/breezeport   # browser tests on the built file
```

The design, the phases and the budgets are in [docs/PLAN.md](docs/PLAN.md). Working notes,
decisions and the IP log are in [CLAUDE.md](CLAUDE.md).

## The game contract

- **One file:** a self-contained `dist/index.html` under 3 MiB, with no network requests (a strict
  Content Security Policy, checked by `scripts/check-build.mjs`).
- **Storage:** every key starts with `breezeport.`, and the game never clears or reads anyone
  else's keys. Saves are compact and versioned, with migrations.
- **Pure rules:** `src/sim/` has no DOM, no clock and no `Math.random`, so the playthrough bot and
  the tests replay exactly.
- **Test hook:** `window.__breezeport.snapshot()`.
- **Capture route:** `?scene=…` for previews; it never saves.

## Kid-safety rules

No ads, purchases, premium currency, accounts, chat, invites, tracking or network requests. No
streaks or red dots. No fires, disasters or crime. Original names, characters, art and music only.

Inspirations: the city-building genre. Not affiliated with or endorsed by any other game or company.

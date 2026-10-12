## What changed

<!-- What does this pull request do, and why? -->

## How I tested it

<!-- Which tests did you run? Which devices and browsers did you play it on? -->

## Kid-safety checklist

- [ ] No ads, purchases, loot boxes, subscriptions or upsells
- [ ] No accounts, sign-ups, chat or sharing between players
- [ ] No tracking or analytics, and no requests to any other website (one self-contained file per game)
- [ ] No personal information asked for or stored, and none in this pull request
- [ ] Storage stays in the game's own prefix; old saves still load
- [ ] Content suits the stated ages, content notes are honest, flashing ≤ 3 per second
- [ ] Original work only: no other companies' characters, names, art, music or trademarks
- [ ] Accessible: readable text, 48 px touch targets, reduced motion respected
- [ ] If a game changed: `npm run import-game -- <slug>` re-imported its build
- [ ] Tests pass: the game's own tests, `npm test` and `npm run check`

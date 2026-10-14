# Agentmon

A gentle creature-befriending pixel RPG for ages 7–12, for Ai Kids Games. You're the newest Field
Agent at the Academy in Brightmoor. A static fog has dimmed the six Beacons of Sunreach: travel the
region, make friends with 52 original Agentmon, solve the puzzle Trials and relight every Beacon.
About 8 hours of story, plus a post-game with three more guardians, the Challenge Tower and rematches.

Play it on the Ai Kids Games website, or open the built `dist/index.html` directly: it's one
self-contained file that works offline. Notes, decisions and status are in [CLAUDE.md](CLAUDE.md);
the approved plan is [docs/PLAN.md](docs/PLAN.md) and the brief is in
[docs/prompts](../../docs/prompts/agentmon.md).

## How to play

- **Walk** with the arrow keys or WASD, a gamepad, the touch stick, or tap or click a spot to walk
  there. Tap a person, a door or a wild Agentmon to walk up to it.
- **A** (Z, Space or Enter; gamepad A; the glass A button) talks, picks and confirms. **B** (X,
  Escape or Backspace; gamepad B) goes back. **Menu** (M or Tab; gamepad Start) opens your team,
  bag, Field Guide, map, quests, the Agent Base and settings.
- **Friendly spars:** pick a move (the ★ is a good pick), Rest to get energy back, or switch
  friends. Nobody gets hurt: a tired Agentmon just takes a nap. Losing sends you to the last Rest
  Stop, rested, with nothing taken.
- **Befriending:** when a wild Agentmon is tired, choose Befriend. In the **Spark Ring**, tap when
  the spark is in the glow; a favourite snack, its mood and how tired it is make the glow bigger.
  **Mood Match** (in Settings) has no timing at all: pick what fits its mood. No luck, no capture
  devices: skill and the things you can see decide it.
- **Trials:** six puzzle dungeons (blocks and switches, vines and colour gates, mine carts, light
  beams and mirrors, ice sliding, and all of them together). Every room has Reset and a Hint.
- **Field abilities:** befriend an Agentmon of an element to snip vines, shove boulders, paddle,
  light caves, melt ice walls, ride updrafts, power machines or freeze stepping stones.

There are 8 elements, 52 Agentmon (16 families of three plus four guardians), about 90 moves, 5
mild statuses, 3 difficulties (change any time), hints, 1×/2× battle speed and a real nature fact
for every Agentmon in the Field Guide. Settings include text size, read-aloud (local voices only),
reduced motion, a colourblind mode and separate volumes.

Like every game here: no ads, purchases, accounts, chat, trading, tracking or network requests.
All art is drawn in code and all music and sound are synthesized with the Web Audio API (no effect
flashes more than three times a second, and a limiter keeps the volume gentle).

## Saves

Three save slots plus settings, all in this browser under the `agentmon.` prefix (`agentmon.slot1`
to `slot3`, `agentmon.settings`, `agentmon.records`), with autosave on map changes, after spars and
when the page is hidden. A full slot is about 18 KB at most. If storage is full or blocked, the old
save is kept and the game says so.

## Commands

```bash
npm run dev          # http://localhost:5246
npm run typecheck
npm test             # unit tests and the sims (balance, level curve, the playthrough bot)
npm run test:sim     # just the sims; they write reports/balance.md, level-curve.md and pacing.md
npm run build        # one self-contained dist/index.html (about 1 MB; the budget is 2.5 MB)
npm run test:e2e     # Playwright on Chromium and WebKit, at phone, tablet and desktop sizes
```

The playthrough bot (`src/sim/bot.ts`) plays from Gran's house to the credits on every difficulty
with all three partners, and fuzzed runs (wandering, losing on purpose, saving and reloading) must
never get stuck. Reports: [balance](reports/balance.md), [level curve](reports/level-curve.md),
[pacing](reports/pacing.md) and the [visual and IP review](reports/visual-review.md).

Capture routes for the website's previews (never saving): `?scene=battle`, `befriend` (`&mode=mood`),
`evolution`, `town` (`&map=id,x,y`), `dungeon` (`&trial=…&room=…`), `guide` (`&page=…`) and `sheet`
(all 52), each with `&seed=N`; `&play=1` plays the moment out. The read-only test hook is
`window.__agentmon.snapshot()`.

MIT licensed.

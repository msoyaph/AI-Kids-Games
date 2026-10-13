# Pacing and playthrough report

Written by `tests/sim/playthrough.test.ts`. The bot (`src/sim/bot.ts`) plays the whole story with the
game's own rules and keeps a clock of what a kid would spend. The pacing model adds what a kid does
beyond the bot's straight line:

- walking × 2 (looking around, detours, walking back and forth)
- 10 s to say hello to each townsperson once
- 6 min for each side quest
- 2 min a chapter in menus (Field Guide, Agent Base, team, settings) × 14 chapters
- the wild spars kids usually have on the way (each chapter's `pathSpars`, 60 s each) beyond the bot's
- about 25 friends by the credits (2.5 min each) beyond the bot's

The bot's own clock: walking 0.2 s a tile, reading 1 s a line plus 2.5 words a second, spars 8 s a
turn (choosing plus the animations at 1×), befriending, puzzles 60 s a room plus 4 s a move.
This is a model of a typical unhurried kid, not a measurement; real play varies a lot.

## Runs

| Difficulty | Seed | Result | Bot clock | Model total | Steps | Wild / trainer spars | Lost | Friends | Rests | Rooms | Final team |
|---|---|---|---|---|---|---|---|---|---|---|---|
| easy | 1 | credits | 3.12 h | 7.28 h | 3520 | 63 / 16 | 1 | 11 | 30 | 36 | druzarch 45, fluffkorn 43, bouldwom 43, canopant 43, galehum 43, pyrolanterne 43 |
| easy | 2 | credits | 2.92 h | 7.26 h | 3398 | 54 / 17 | 2 | 10 | 26 | 36 | voltabill 44, canopant 43, fluffkorn 43, galehum 43, hardigrade 42, pyrolanterne 43 |
| easy | 3 | credits | 3.04 h | 7.40 h | 5141 | 54 / 17 | 3 | 10 | 24 | 36 | maplegale 44, canopant 43, fluffkorn 42, grandatee 42, pyrolanterne 43, citrivolt 43 |
| normal | 1 | credits | 3.25 h | 7.57 h | 5740 | 55 / 19 | 6 | 11 | 31 | 36 | druzarch 45, fluffkorn 45, bouldwom 44, canopant 44, pyrolanterne 44, galefin 44 |
| normal | 2 | credits | 2.99 h | 7.33 h | 3113 | 56 / 17 | 4 | 9 | 26 | 36 | voltabill 45, canopant 43, fluffkorn 43, galehum 43, hardigrade 43, pyrolanterne 43 |
| normal | 3 | credits | 3.01 h | 7.36 h | 4429 | 55 / 18 | 9 | 9 | 21 | 36 | maplegale 44, canopant 43, fluffkorn 42, grandatee 42, pyrolanterne 43, voltabill 43 |
| hard | 1 | credits | 3.65 h | 8.12 h | 6246 | 52 / 25 | 12 | 10 | 34 | 36 | druzarch 48, fluffkorn 48, bouldwom 47, canopant 47, galehum 47, pyrolanterne 47 |
| hard | 2 | credits | 3.50 h | 8.08 h | 7099 | 50 / 27 | 15 | 7 | 28 | 36 | voltabill 49, canopant 47, fluffkorn 47, galehum 47, hardigrade 48, pyrolanterne 47 |
| hard | 3 | credits | 3.65 h | 8.00 h | 4223 | 62 / 26 | 13 | 8 | 34 | 36 | maplegale 50, canopant 49, fluffkorn 49, bouldwom 49, grandatee 49, pyrolanterne 49 |

## Normal, seed 1: where the time goes

| Part | Time |
|---|---|
| walking | 31 min |
| more wild spars (to the chapters' usual number) | 36 min |
| more friends (Field Guide collecting) | 35 min |
| reading | 27 min |
| spars | 72 min |
| befriending | 4 min |
| puzzles | 69 min |
| menus and story moments | 35 min |
| chatting with townspeople | 13 min |
| side quests | 132 min |
| **Total** | **7.57 h** |

(76 townspeople; 22 side quests.)

## Normal, by main quest stage (bot clock, minutes)

| Stage | Minutes |
|---|---|
| 0 | 1 |
| 1 | 3 |
| 2 | 4 |
| 3 | 2 |
| 4 | 21 |
| 5 | 4 |
| 6 | 34 |
| 7 | 6 |
| 8 | 8 |
| 9 | 14 |
| 10 | 4 |
| 11 | 31 |
| 12 | 10 |
| 13 | 15 |
| 14 | 11 |
| 15 | 27 |

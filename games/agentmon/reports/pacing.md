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
| easy | 1 | credits | 3.09 h | 7.42 h | 4782 | 59 / 16 | 2 | 9 | 28 | 36 | druzarch 44, fluffkorn 42, canopant 42, grandatee 42, maplegale 42, starwisp 43 |
| easy | 2 | credits | 2.94 h | 7.22 h | 3661 | 62 / 16 | 2 | 8 | 24 | 36 | voltabill 44, canopant 42, galehum 42, hardigrade 42, fluffkorn 42, druzarch 42 |
| easy | 3 | credits | 2.81 h | 7.33 h | 4543 | 49 / 15 | 1 | 8 | 22 | 36 | maplegale 41, canopant 40, fluffkorn 40, grandatee 40, citrivolt 40, starwisp 42 |
| normal | 1 | credits | 3.22 h | 7.47 h | 4323 | 63 / 17 | 4 | 9 | 27 | 36 | druzarch 45, fluffkorn 44, canopant 44, grandatee 44, maplegale 44, voltabill 44 |
| normal | 2 | credits | 3.09 h | 7.41 h | 5350 | 60 / 16 | 2 | 9 | 29 | 36 | voltabill 44, canopant 43, galehum 43, hardigrade 43, fluffkorn 43, druzarch 43 |
| normal | 3 | credits | 3.09 h | 7.39 h | 3659 | 61 / 17 | 6 | 9 | 26 | 36 | maplegale 45, canopant 44, fluffkorn 44, grandatee 43, starwisp 45, citrivolt 44 |
| hard | 1 | credits | 3.57 h | 7.96 h | 6959 | 58 / 22 | 11 | 9 | 32 | 36 | druzarch 48, fluffkorn 47, canopant 47, galehum 47, hardigrade 47, grandatee 46 |
| hard | 2 | credits | 3.28 h | 7.75 h | 4976 | 57 / 20 | 9 | 7 | 30 | 36 | voltabill 48, canopant 48, galehum 48, hardigrade 48, fluffkorn 48, starwisp 49 |
| hard | 3 | credits | 3.19 h | 7.58 h | 3815 | 57 / 18 | 6 | 8 | 31 | 36 | maplegale 47, canopant 46, fluffkorn 46, grandatee 46, bouldwom 47, starwisp 47 |

## Normal, seed 1: where the time goes

| Part | Time |
|---|---|
| walking | 28 min |
| more wild spars (to the chapters' usual number) | 28 min |
| more friends (Field Guide collecting) | 40 min |
| reading | 26 min |
| spars | 74 min |
| befriending | 3 min |
| puzzles | 69 min |
| menus and story moments | 34 min |
| chatting with townspeople | 13 min |
| side quests | 132 min |
| **Total** | **7.47 h** |

(79 townspeople; 22 side quests.)

## Normal, by main quest stage (bot clock, minutes)

| Stage | Minutes |
|---|---|
| 0 | 1 |
| 1 | 3 |
| 2 | 4 |
| 3 | 2 |
| 4 | 20 |
| 5 | 4 |
| 6 | 29 |
| 7 | 6 |
| 8 | 9 |
| 9 | 17 |
| 10 | 6 |
| 11 | 30 |
| 12 | 11 |
| 13 | 17 |
| 14 | 9 |
| 15 | 24 |

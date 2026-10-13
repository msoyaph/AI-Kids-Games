<!-- The brief as the owner wrote it. Other companies' game titles are replaced with a description
in [brackets]. The approved plan and its follow-up decisions are in games/agentmon/CLAUDE.md. -->

# Project: Build "Agentmon", a creature-befriending RPG for ages 7–12 (inspired by monster-taming RPGs)

Build the eighth game for Ai Kids Games: a complete 2D pixel-art adventure where kids become new Field Agents, befriend creatures called Agentmon, train a team, solve puzzle dungeons, and restore the region's beacons. The story takes about 8 hours, with post-game goals after. Phone-first, and great on tablets and computers.

Work in the AI-Kids-Games monorepo. Scaffold with `npm run new-game -- agentmon` from the starter template, and follow `docs/CREATE-A-GAME.md` and `AGENTS.md`. Work on a new branch. Start in plan mode: show me the plan before building. Commit after each phase and keep the game's CLAUDE.md updated, so a new session can resume. Don't run heavy browser tests at the same time as other test runs.

## Originality and IP (hard requirement)
- Inspired by the monster-taming genre, but fully original. Don't use any names, creatures, designs, items, places, music, UI layouts or catchphrases from [a famous creature-collecting franchise], [two other monster-taming games] or any other franchise. No creature may resemble an existing franchise creature; review every design for this.
- **No capture devices of any kind.** No balls or spinners, and nothing thrown at creatures in the overworld. Creatures join through befriending inside battle (see Befriending).
- **Original structure:** no "gyms", "badges" or "Elite Four". Use the Trial and Beacon system below.
- **Element names** must be your own original set, not a copy of any franchise's type list.
- Suggest one backup game name, in case I need to change "Agentmon".
- All art is pixel art generated in code (palette-indexed pixel maps baked into atlases, like Cliff Valley), and all audio is synthesized. No asset files.

## Kid-friendly design (hard requirement)
- **Nobody gets hurt.** Battles are friendly sparring. A creature that runs out of energy is "tuckered out" and rests; it is never defeated, injured or lost. No permanent loss of creatures, ever.
- **No randomness that feels like gambling:** no loot boxes, gacha, paid or random packs, or slot-machine-style rewards.
- **No ads, purchases, accounts, chat, online trading or network requests.**
- **Losing a battle** sends you to the last Rest Stop with your team healed and nothing taken away.
- **Reading:** short sentences at a reading level that suits ages 7–12. Read-aloud for all dialogue (browser speech synthesis, failing gracefully).
- **The antagonists** are a misguided group, not villains: for example, collectors who want to keep Agentmon in a show. The story ends with understanding, not punishment.

## World and story (~8 hours)
- **Setting:** an original region with 6 towns, routes between them, a coastline, a forest, mountains, a desert canyon, an icy peak and a sky island.
- **Story:** the player joins the Field Agent Academy. A strange static fog is making wild Agentmon grumpy and dimming the region's six Beacons. Each Beacon sits at the end of a Trial: a themed puzzle dungeon, plus a friendly showdown with the Trial Keeper and their team.
- **Characters:** a friendly rival who grows over the story, a mentor, and a cast of townspeople with small side quests.
- **Finale:** relight the last Beacon, meet the region's guardian Agentmon, a celebration, then credits.
- **Post-game:** befriend the remaining rare Agentmon, complete the Field Guide, the Challenge Tower (local records), and rematches with stronger teams.

## Agentmon
- **Roster:** 48 original Agentmon in 16 families (most with 3 growth stages), plus 4 rare guardians.
  - Each has an element, stats, a personality trait, a move set learned by level, and a growth stage with an evolution animation.
  - Designs are cute and appealing, never scary.
- **Elements:** 8 original elements with a clear strengths-and-weaknesses chart. Every element has a distinct color and icon, so it's colorblind-friendly.
- **Rare variants:** occasional rare color variants for collectors, earned through play, never purchased.
- **Field Guide:** every species gets a page that fills in as you meet and befriend it. Each page includes one real nature or science fact related to its inspiration (an animal, a plant, weather, a mineral). Put every real fact in one reviewable file, accurate and simply worded.

## Battles
- **Turn-based 1-vs-1,** with a team of up to 6 and switching.
- **Energy:** each creature has an energy bar that moves spend; resting a turn restores some.
- **Moves:** about 90 original moves covering attacks, buffs, shields and mild status effects (Sleepy, Dizzy, Soaked, Toasty, Chilly), all shown with icons and plain-language tooltips.
- **Hints (on by default for young players):** show whether a move will be super effective, and suggest a good move.
- **Pace:** battle speed 1×/2×, and skippable animations.
- **Experience:** shared across the team (a setting), so kids aren't forced to grind.
- **Difficulty:** Easy, Normal and Hard, changeable any time, scaling wild and Keeper levels and the AI.

## Befriending
- When a wild Agentmon's energy is low, the player can try **Befriend**, which opens a short, fun friendship mini-game. Ideas: a timing "spark" that sweeps around a heart ring, a rhythm of taps, or matching the creature's mood shown as an emoji.
- **Chance:** higher when the creature is tired, when you offer its favorite snack, or when the mood is right. A miss isn't a punishment: the creature might lose interest and wander off.
- **Storage:** new friends join the team, or go to the Agent Base, where kids can visit them in a cozy habitat, pet them and give snacks.
- **Nicknames:** chosen from a generated name list (no free typing), which keeps saves and screenshots kid-safe.

## Exploration and puzzles
- A top-down overworld with tall grass, caves and water where wild Agentmon appear. Encounters show visibly in the world (no surprise random battles), so kids can choose to engage or avoid.
- **Trial dungeons** with original puzzles: pushing blocks onto switches, ice sliding, light beams and mirrors, color gates, moving platforms and element-based obstacles (vines cut by Leaf, rocks moved by Stone, and so on).
- **Field abilities:** befriended Agentmon unlock travel abilities (for example crossing water or lighting dark caves), which open new areas.
- **Places to stop:** Rest Stops heal the team for free; shops sell snacks, berries and gear for in-game coins earned in battles and quests.

## Controls and UX
- **Touch:** tap-to-move plus the glass-style joystick used in TheaBonk and Calex Cart; reuse that code if practical, so the games feel like one family. A big A/B button pair.
- **Other inputs:** keyboard + mouse, and gamepad.
- **Menus:** large touch targets (48 px or more), the team screen, bag, Field Guide, map, quests and settings.
- **Settings:** text size, read-aloud, battle speed, hints, difficulty, reduced motion, colorblind mode and volume.
- **Onboarding:** a short interactive tutorial the first time each mechanic appears, and gentle hints if a player seems stuck.

## Look and sound
- **Art:** 16×16 tiles and 32×32 battle sprites in a bright, friendly pixel style. Battle animations are playful (bouncy hits, sparkles), with no impact gore or scary effects.
- **Flash safety:** no effect flashes more than 3 times per second.
- **Audio:** synthesized chiptune-style music per town, route, dungeon and battle type, with a special theme for the guardians. Each Agentmon gets a cute synthesized cry. Include a mixing pass with a limiter.

## Tech and the game contract
Follow the starter template and the site's game contract:
- Vite + TypeScript (strict mode), and PixiJS with crisp integer pixel scaling.
- **Build:** one self-contained `dist/index.html` under 2.5 MB. It must work from file:// and inside the site's sandboxed iframe, with no network requests.
- **Storage:**
  - every key uses the `agentmon.` prefix;
  - 3 save slots, versioned with migrations, each under 300 KB (use compact formats for the creature storage);
  - autosave, and handle full storage gracefully.
- **Architecture:** game logic is decoupled from rendering. Creatures, moves, elements, maps, dungeons, trainers, dialogue, quests and facts live in typed data files, so adding content means adding data. One tuning file holds all balance values. Use a seeded RNG.
- **Hooks:** a read-only `window.__agentmon` test hook and a preview capture route: a battle with a super-effective hit, a befriending moment, an evolution, a town, a puzzle dungeon.
- **Manifest:** a `game.json` with ages "7–12", categories Adventure and RPG, genre-based keywords (creature collecting, turn-based RPG, pixel art, puzzle dungeons; no franchise names), controls, devices, and play time ("About 8 hours, plus post-game").
- **Performance:** 60 FPS on mid-range phones and tablets.

## Testing and balance
- **Unit tests:** damage and element math, energy, status effects, experience and growth, befriending odds, the AI's move choice, puzzle rules (every dungeon solvable), save migration and the storage budget.
- **Balance simulation:**
  - thousands of AI-vs-AI battles to check that no element, creature or move dominates;
  - a level-curve check so that Trial Keepers are beatable without grinding on Easy and Normal.
- **Headless playthrough:** a bot plays from a new game to the credits on each difficulty with no soft-locks, and a pacing model targets about 8 hours on Normal.
- **Browser tests** (Playwright, Chromium and WebKit; phone, tablet and desktop):
  - a touch-only opening playthrough: new game, first befriend, first battle, first Rest Stop, first Trial puzzle;
  - keyboard and gamepad menus;
  - save and reload;
  - file:// and the sandboxed iframe;
  - no console errors and no network requests.
- **Visual review:** screenshot every town, dungeon, battle type and all 52 Agentmon; review them critically, including checking that no creature resembles an existing franchise creature.

## Add it to Ai Kids Games
- Import the build with `npm run import-game -- agentmon`, run the storage audit, and capture previews, cover, logo and Open Graph image in the site's style.
- Make sure the site's grid works with eight games.
- Open a pull request, get CI green, and give me the preview link. **Stop before the production release:** I'll play it first and then approve.

## Definition of done
- Completable from a new game to the credits with no soft-locks on every difficulty. Every Agentmon is obtainable without luck-based grinding.
- All tests pass locally and in CI. The build is under 2.5 MB, and saves stay within budget.
- At the end, give me:
  - screenshots of a battle, befriending, a dungeon puzzle, a town and the Field Guide;
  - a sheet of all 52 Agentmon;
  - the balance and pacing results, the build size and the preview link;
  - known issues.

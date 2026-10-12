# Cliff Valley: the original brief

This is the brief Cliff Valley was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/cliff-valley](../../games/cliff-valley) for what it became.

---

# Project: Build "Cliff Valley", a complete farming life-sim for ages 8–14 (inspired by [a well-known farming life-sim])

You are building a complete, polished, playable browser game from scratch. The player moves to an overgrown farm in Cliff Valley, grows crops, raises animals, explores the mines, makes friends with the villagers, and helps restore the valley over one in-game year. The main story takes about 7–8 hours, followed by open-ended play. It will be published on "Ai Kids Games", a kid-friendly game website, and must run smoothly on computers, tablets and phones.

Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit. Keep a CLAUDE.md file updated with architecture notes, commands and current status, so a new session can resume where you left off.

## Originality (hard requirement)
The game is *inspired by* [a well-known farming life-sim] but must be fully original. Do not use any of its names, characters, places, items, creatures, festivals, music, UI layouts or art. Invent Cliff Valley's own villagers, story, shops, mine creatures and events. Real crops, animals, fish and minerals are fine.

## Kid-friendly content (hard requirement)
- **No romance, dating or marriage.** Villager relationships are friendships, with friendship cutscenes and a "best friends" level.
- **No alcohol or gambling.** Machines make juice, jam and cheese; the town hangout is a café; nothing resembles a casino.
- **Mild mine combat only:** cartoon cave critters that bounce away and poof into sparkles. No blood and nothing scary.
- **No harsh penalties:** fainting in the mines or staying up too late means you wake up at home with nothing lost.
- **No ads, purchases, tracking, external links, network requests or chat.** Never ask for personal information such as the player's real birthday.
- Text is written for confident young readers: short sentences and friendly humor.

## Different from Light Crossing
The site already has Light Crossing, a 3D island life sim. Cliff Valley must feel clearly different: 2D pixel art, a farm-first daily rhythm with energy and seasons, animals, a deep mine, cooking, skills, and a valley restoration story.

## Tech stack
- Vite + TypeScript (strict mode)
- PixiJS (WebGL with automatic fallback) for crisp 2D pixel art: nearest-neighbor scaling, integer scaling, and no blurry sprites.
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html`. It must work from file:// and inside a sandboxed iframe, with no external requests, no CDN and no web fonts. Keep the build under 2.5 MB.
- **All art is pixel art written in code:** sprites authored as palette-indexed pixel maps in TypeScript (16×16 tiles, 16×32 characters), baked into texture atlases at startup. No image files.
- **All audio is synthesized** with the Web Audio API, including cozy chiptune-style music per season, location and weather.
- Persistence via localStorage, wrapped in try/catch and versioned with migrations, with 3 save slots. All keys use the `cliffvalley.` prefix.
- Vitest for unit tests. Playwright for browser tests on desktop, tablet and phone viewports.

## Storage budget (important)
The game shares about 5 MB of browser storage with five other games and the site. Keep each save slot under 300 KB, using compact formats such as run-length encoding for farm tiles. Handle a full storage area gracefully: show a friendly message and never corrupt a save.

## Time and seasons
- An in-game day lasts about 12 real minutes, from 6:00 to 2:00. The clock pauses in menus, dialogue and cutscenes.
- Four seasons of 10 days each make up one year. Each season has its own look, crops, forage, fish and festival.
- **Weather:** sun, rain (which waters crops), storms, wind with blowing leaves, and snow in winter.
- **Saving:** the game saves when the player sleeps, plus a suspend save when quitting mid-day so nothing is lost.
- **Bedtime:** after midnight the player gets sleepy. At 2:00 they fall asleep wherever they are, with no penalty.
- A calendar shows festivals and villager birthdays.

## Farming
- Clear the overgrown farm: weeds, stones, stumps and logs.
- **Crops:** till, plant, water and harvest 24+ crops across the seasons, including multi-harvest crops and crops that grow on trellises. Crops have quality stars, and fertilizer improves them.
- **Farm tools:** sprinklers (3 tiers), scarecrows (crows nibble unprotected crops, mildly), fences, paths, and occasional giant crops.
- **Trees:** fruit trees, and tappers that make syrup and resin.
- **Greenhouse:** unlocked through the restoration story, for growing any crop year-round.
- **Tools:** hoe, watering can, axe, pickaxe, scythe and fishing rod, each upgradable through 3 tiers at the blacksmith.

## Animals
- A coop and a barn, each with 2 upgrades, holding chickens, ducks, rabbits, cows, goats and sheep.
- Feed, pet and care for animals to raise their happiness, which affects their products: eggs, milk, wool, feathers and fur.
- A pet dog or cat, chosen at the start and given a name.
- A silo for hay, and a hay-cutting routine.

## Mining
- **A 40-floor mine** in themed layers: earth, frost, lava-free "glow caves" and a crystal core. There's an elevator every 5 floors, ladders hidden under rocks, and ores, gems and geodes to find.
- Mild combat with a bonk stick and slingshot against cartoon critters (slimes, bats and rock crabs) that bounce away when hit.
- The mine's deepest floor is a story milestone with a special discovery.

## Fishing, foraging and cooking
- **Fishing:** an original skill-based minigame with a different mechanic from Light Crossing's. 30+ fish found by location, season, weather and time of day, plus crab pots.
- **Foraging:** seasonal forage, berry bushes, beach shells, and artifact spots.
- **Cooking:** a kitchen, after the first house upgrade, with 30+ recipes. Food restores energy and gives short buffs. Players learn recipes from villagers and a radio cooking show.

## Crafting and machines
- 60+ crafting recipes unlocked through skills, villagers and story.
- **Machines:** preserves jar, juicer, cheese press, loom, furnace, bee house, oil press and recycler. Each processes goods over time and shows clear progress icons.
- Chests with color labels, and a tidy inventory with sorting.

## Skills
Farming, Foraging, Fishing, Mining and Cooking each level up to 10. At levels 5 and 10, players choose between two perks, explained simply.

## Economy and town
- A shipping bin where items are paid for overnight, with an end-of-day earnings summary.
- **Shops:** a general store, blacksmith (tool upgrades and geodes), carpenter (house and building upgrades), animal ranch, fishing shop and café. Each has opening hours and its own shopkeeper.
- **Upgrades:** the farmhouse upgrades twice (kitchen first, then more rooms). Farm buildings include a coop, barn, silo, well and shed.
- **Quests:** a help-wanted board with simple daily requests from villagers.

## Villagers and friendship
- 12–15 original villagers with personalities, homes, jobs, daily and seasonal schedules, birthdays, and gift likes and dislikes.
- Friendship hearts go up to 10. At certain heart levels, players unlock short friendship cutscenes about each villager's own story. All cutscenes are wholesome and family-friendly.
- Villagers mail the player letters, recipes and small gifts.

## Story: restoring the valley (~7–8 hours)
- The player inherits Cliffside Farm from a great-aunt who helped found the valley. A big storm before the game began damaged the Valley Hall, the old bridge, the greenhouse and the mine lift.
- **Restoration boards:** the Valley Hall has themed restoration boards (crops, forage, fish, animal products, minerals, crafted goods). Completing each board repairs part of the valley and unlocks new areas or features: the bridge to the quarry, the mine lift, the beach pier, the greenhouse, and the valley train for visitors.
- **One festival per season**, each with an activity: a spring planting fair with a seed race, a summer berry fair, an autumn harvest show where you can enter your best produce, and a winter starlight night with gift exchanges.
- **Finale:** at the end of year one, the restored Valley Hall reopens with a celebration cutscene where villagers thank the player, followed by credits.
- **After the credits:** keep playing with year-two goals (collections, a full museum, all friendships, a perfect farm rating), a farm evaluation, and repeating festivals.

## Collections
- A shipping collection, a fish log, a museum for minerals and artifacts with rewards for donations, and a cooking log.
- 40+ achievements.

## Controls and UX
- **Keyboard + mouse:** WASD to move, mouse to target tiles, number keys for the toolbar.
- **Gamepad** via the Gamepad API, with a tile cursor.
- **Touch:** tap to move or interact, a virtual joystick option, a big tool button, and clear tile highlighting so young players never till the wrong tile.
- **HUD:** clock, date, weather, season, energy bar, coins and the toolbar.
- **Menus:** inventory, skills, friendships, collections, map, calendar, quests and settings.
- Short onboarding tips the first time each mechanic appears, plus gentle hints if a player seems stuck.
- **Settings:** volume, text size, read-aloud for dialogue (using the browser's speech synthesis, failing gracefully if unavailable), reduced motion, and screen shake.

## Performance (tablets first)
- 60 FPS on mid-range tablets and phones, and on laptops with integrated graphics.
- Chunked tile rendering, sprite batching, culling of off-screen villagers and objects, and object pooling, with no allocation in the hot loop.
- Simulate villagers and animals cheaply when off-screen.
- Adaptive quality, with an in-game benchmark under Settings → "Test performance" (and `?bench=1`) that shows FPS on screen.
- Handle WebGL context loss: pause, show "Tap to continue", then restore.

## Architecture
- A system-based design, with game logic decoupled from rendering so it can be unit tested and simulated headlessly.
- All content lives in typed data files: crops, items, recipes, fish, minerals, villagers, schedules, dialogue, gifts, restoration boards, festivals, quests and achievements. Adding content should mean adding data.
- One typed tuning file for all balance values: prices, growth times, energy costs and skill XP.
- A seeded RNG for daily rolls such as forage, mine layouts and weather.
- **Test hooks:** a read-only `window.__cliffvalley` hook (like the other games) so tests and the Ai Kids Games preview capture can drive the game.

## Phases
1. Scaffold the project, set up the single-file build, add the pixel-art pipeline (palette maps baked into atlases with integer scaling), and render the farm map with movement and camera.
2. Add the time and day system, sleeping, the save system with migrations, energy and the HUD.
3. Add tools and farming: clearing, tilling, planting, watering, growth and harvest, plus the shipping bin and economy.
4. Build the town map, the shops with opening hours, and the inventory and chests.
5. Add villagers with schedules, dialogue, gifts, friendship and the calendar.
6. Add animals, buildings, carpenter upgrades and the pet.
7. Add the mine with floors, ores, geodes and mild combat.
8. Add fishing, foraging and crab pots.
9. Add cooking, crafting, machines and skills with perks.
10. Add the story: restoration boards, unlocks, friendship cutscenes, festivals, the finale and credits.
11. Add seasons and weather visuals, the museum, collections, achievements and post-game goals.
12. Add audio, polish, onboarding, touch and gamepad controls, and accessibility settings.
13. Do a performance pass: profile the busiest scenes (a full farm at harvest, the town during a festival, deep mine floors) on throttled tablet and phone profiles.
14. **Testing and pacing:**
    - unit tests for growth, economy, schedules, friendship, machines and save migration;
    - a headless playthrough where a bot plays from a new game through the year-one finale;
    - a pacing model with a target of 7–8 hours;
    - Playwright tests on desktop, tablet and phone, including file:// and the sandboxed iframe, with no console errors or network requests.
15. **Playtest mode and CI:**
    - `?playtest=1` records local-only stats with export (a JSON file standalone, or a Copy box inside the iframe), plus `npm run analyze-playtests`;
    - a GitHub Actions workflow that runs the tests in a low-quality mode on standard runners;
    - an optional self-hosted Mac runner workflow, with a warning to use it only with a private repository.

## Ai Kids Games integration
- The final `dist/index.html` will be dropped into `public/games/cliff-valley/` on the Ai Kids Games site and run inside its sandboxed iframe.
- In the README, include:
  - a ready-to-paste registry entry: slug `cliff-valley`, title "Cliff Valley", categories Cozy and Adventure, age guidance "Ages 8–14", content notes (for example "Farming and friendship, mild cartoon cave critters"), controls (keyboard + mouse, gamepad, touch), devices (computer, tablet, phone) and play time ("About 7–8 hours, plus endless farming");
  - the list of storage keys and the measured save size;
  - a capture route for the site's `npm run capture-previews` (for example the farm at harvest, a festival, a mine floor, fishing at sunset).

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` under 2.5 MB that works from file:// and inside a sandboxed iframe.
- The game is completable from a new game through the year-one finale and credits, with no soft-locks, and every restoration board is completable.
- Saves survive reloads, each slot stays within the storage budget, and all tests pass with no console errors.
- 60 FPS on the throttled tablet profile.
- README.md covers how to play, controls, building, and how to add crops, villagers, recipes and events.
- At the end, give me:
  - a summary of what was built and screenshots of each season, the town, a festival and the mine;
  - the estimated playtime per season;
  - benchmark results and the build size;
  - known issues and suggested next steps.

# Light Crossing: the original brief

This is the brief Light Crossing was built from with [Claude Code](https://claude.com/claude-code), copied
as written except that other companies' game titles are replaced with a genre description in
[brackets]. The finished game grew beyond it in later rounds of work; see
[games/light-crossing](../../games/light-crossing) for what it became.

---

# Project: Build a complete cozy island life-sim called Light Crossing (inspired by [a well-known island life-sim])

You are building a complete, polished, playable browser game from scratch. The target is a finishable game with roughly 6 hours of content: a clear story arc, missions, challenges, and an ending. Work autonomously through the phases below. Start in plan mode: read this whole brief, propose a file structure and phase plan, then execute phase by phase. After each phase: run the game, run tests, fix errors, and make a git commit with a clear message. Keep a CLAUDE.md file updated with architecture notes, commands, and current status.

## Originality (hard requirement)
The game is *inspired by* [a well-known island life-sim] but must be fully original. Do not use any [that game's] names, characters (no raccoon shopkeeper, no dog assistant, etc.), item names, UI layouts, music, or assets. Invent an original setting, original villager characters with their own personalities, and an original guide character. If the title is still "[GAME NAME]", suggest 3 original titles and pick one. All art must be procedural low-poly geometry built in code, with a soft, cozy pastel palette. All audio, including gentle procedural background music, must be synthesized with the Web Audio API. Do not use external asset files.

## Tech stack
- Vite + TypeScript (strict mode)
- Three.js with a tilted top-down camera and a gently curved "rolling world" horizon effect
- No backend. The game is fully client-side.
- Use `vite-plugin-singlefile` so `npm run build` produces ONE self-contained `dist/index.html`. It must work when opened inside a sandboxed iframe: no external requests, no CDN, no web fonts.
- Persistence via localStorage, wrapped in try/catch, with 3 save slots and autosave. Saves must be versioned with a migration function.
- Vitest for unit tests. Playwright for one smoke test (new game starts, player walks, no console errors for 30s).

## World and time
- A procedurally generated island from a seed, built on a tile grid. It has rivers, cliffs (2 height levels), beaches, a pond, a forest area, and a town plaza. The same seed always yields the same island.
- An accelerated in-game clock: 1 in-game day ≈ 15 real minutes, with morning, day, evening, and night lighting. The player can sleep to skip to the next morning.
- Daily weather (sunny, cloudy, rain, rare rainbow) affects which fish and bugs appear.
- The story spans about 20 in-game days, which keeps the total around 6 hours.

## Core activities
- **Tools:** net, fishing rod, shovel, axe, watering can, and ladder. Flimsy versions break; sturdier versions are unlocked through crafting.
- **Fishing:** a timing minigame with fish shadows of different sizes. 30+ original fish types vary by location, time, and weather.
- **Bug catching:** a stealthy approach mechanic. 30+ original bugs.
- **Foraging:** fruit trees, shells on beaches, branches, weeds, and buried items marked by dig spots.
- **Fossils:** dig spots yield unidentified fossils, assessed at the museum. 15+ original fossils.
- **Gardening:** plant flowers and saplings. Watered flowers can cross-breed new colors.
- **Crafting:** a workbench with 40+ recipes (tools, furniture, decorations), unlocked through missions and found recipe cards.
- **Economy:** sell items at the shop for an original currency. Prices vary by rarity. The shop's stock rotates daily.
- **Home:** start in a tent, then upgrade through a small house to a big house via loans paid off with currency. The interior uses a grid-based furniture placement editor with rotate, move, and store, plus wallpaper and flooring.
- **Museum:** donate fish, bugs, and fossils. Each wing fills up visibly, and completing a wing unlocks a reward.

## Villagers and social
- 8 original animal villagers, each with a personality type, a home, a daily schedule, and unique dialogue.
- A friendship meter raised by talking, gifting (with likes and dislikes), and finishing their requests.
- Villagers give daily requests: deliver an item, find a lost item, catch a specific fish.
- Villagers arrive progressively as the island develops. New homes are placed by the player.

## Story missions (the ~6 hour arc)
Structure the game into 5 chapters, each with 4–6 main missions shown in a quest log with clear objectives and markers:
1. **Arrival:** set up camp, learn the tools, meet the guide, catch your first fish and bug.
2. **Settling in:** build the shop, upgrade to a house, invite the first villagers.
3. **Growing town:** open the museum, build bridges and ramps to reach new areas, and unlock the cliff tops.
4. **Community:** help villagers with personal storylines, host a fishing tournament and a bug-off event, and decorate the plaza.
5. **Grand festival (finale):** raise the island rating to 5 stars through decorations, flowers, villagers, and museum progress, then host the grand festival as the ending cutscene, followed by credits.

After the credits the player can keep playing freely. Show a completion screen with playtime, museum %, friendship levels, and challenges completed.

## Challenges
- 3 rotating daily challenges (e.g. "catch 5 fish", "sell 3,000 coins of fruit"), rewarding a secondary currency.
- 40+ achievements with tiered badges (e.g. 10/50/100 fish caught), viewable in a journal.
- Collection trackers: a catalog of all fish, bugs, fossils, recipes, and furniture, showing seen and owned status.
- Timed events: the fishing tournament and bug-off, with score targets and prize tiers.

## UI / UX
- Screens: title, save slot select, character creator (name, color, simple face options), pause menu, inventory (20 slots, upgradeable to 40), crafting menu, quest log, map, catalog/journal, furniture editor, shop, settings (volume, text speed, camera options).
- Dialogue boxes with typewriter text, villager name tags, and simple portrait expressions.
- A phone-style menu app for map, quests, catalog, challenges, and settings.
- Controls: keyboard + mouse, gamepad via the Gamepad API, and touch controls on small screens.
- Cozy juice: footstep dust, leaf particles, item pop-ups, catch fanfares, and gentle screen transitions.
- Show a short onboarding tooltip the first time each mechanic is used.

## Architecture
- Use a system-based design, with game logic decoupled from rendering so it can be unit tested.
- All content lives in typed data files: fish, bugs, fossils, items, recipes, villagers, dialogue, missions, challenges, and achievements. Adding content should mean adding data, not code.
- Use a mission/quest engine built from triggers, objectives, and rewards, defined in data.
- Use a seeded RNG for world generation and daily rolls.
- Use chunked or instanced rendering for trees, flowers, and grass. Must hold 60 FPS on a mid-range laptop.

## Phases
1. Scaffold the project, set up the single-file build, generate the island, and add player movement, camera, and day/night.
2. Add tools, foraging, inventory, and the save system.
3. Add fishing, bug catching, digging, and fossils.
4. Add the economy, shop, crafting, and home upgrades with the furniture editor.
5. Add villagers, dialogue, friendship, and requests.
6. Add the mission engine and chapters 1–5 with the finale.
7. Add challenges, achievements, the catalog, and events.
8. Add terraforming-lite: bridges, ramps, and placing villager homes.
9. Add audio, polish, onboarding, and settings.
10. Testing and pacing: unit tests for the economy, crafting, quest triggers, and save migration, plus the Playwright smoke test. Write a pacing simulation script that estimates time per chapter, and tune rewards and costs so a typical player finishes in about 5.5–6.5 hours.

## Definition of done
- `npm run dev` runs the game locally. `npm run build` produces a single `dist/index.html` that works when double-clicked and inside a sandboxed iframe.
- The game is completable from new game to the festival ending and credits, with no soft-locks. Every mission must be completable from any reachable state.
- Saves survive reloads, and all tests pass with no console errors.
- README.md covers how to play, controls, how to build, and how to add content.
- At the end, give me a summary of what was built, the estimated playtime per chapter, known issues, and suggested next steps.

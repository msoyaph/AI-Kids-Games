<!-- The brief as the owner wrote it. Other companies' game and company names are replaced with a
description in [brackets]. The owner attached three screenshots as a quality and density reference
only; they are logged in games/breezeport/CLAUDE.md and never committed. The approved plan is in
games/breezeport/docs/PLAN.md, and its follow-up decisions are in games/breezeport/CLAUDE.md. The
game is called Breezeport (the owner's pick); "City WIP" was the working name, and "Agent City
Builders" below is the owner's project label, which never ships. After phase 0 the owner wrote:
"Go, Breezeport. Once done and complete, deploy the game to live production. Then create a 1 minute
sizzle reel YT 1920×1080 and 1080x1920 video game. Should be exciting and should excite and wonder
kids to play." That replaces the brief's "stop before production". -->

# Project: Build "Agent City Builders", a 3D city-building game for ages 8–14 (inspired by [a city-building social game])

Build a polished 3D city builder where kids become the junior mayor of a small town and grow it into a lively, happy city. They lay out roads and neighborhoods, build homes, shops, parks and public services, plan transit, and keep citizens happy. About 6–8 hours of goals and story, then an open-ended city and a Creative mode. Phone, tablet and computer.

Work in the AI-Kids-Games monorepo, on your own worktree and branch from the latest `main`. Follow the repo rules:
- never run heavy work alongside another session's tests, and respect the quiet check's exit code;
- run the full browser suites against previews, never against production.

**Start after Fieldlark has merged.** Reuse its rendering stack (approved look, lighting, shaders, culling and instancing, camera, sideways-phone side rail, compact save approach, quality tiers and budgets): either extract it into a shared package or copy and adapt it, whichever is cleaner. Propose which in the plan.

## 0. Plan and style frame (show me, then wait)
- **The design:** how each system below works, and the phases.
- **Pacing and saves:** a pacing target, and a save-size estimate for a maximum city (keep the worst case under 150 KB, since the site's storage is shared and nearly full).
- **Five name candidates,** checked against app stores, games and the web. I'll pick one.
- **A style frame:** one city block with homes, a shop, a park, a road with traffic, citizens walking and a public building, at Low, Medium and High on a phone and on desktop. The attached screenshots are a quality and density reference only.

Wait for my "go" and my name pick, then work autonomously to the pull request.

## Originality and IP (hard requirement)
- *Inspired by* the city-builder genre, but fully original. No names, characters, buildings, art, UI, currencies or text from [that game], any [game by its publisher] or any other game.
- Add [that game's title] to the trademark blocklist. Keep an IP log; the attached screenshots are logged as quality references only and never committed.
- All 3D models and art are generated in code, and all audio is synthesized.

## Different from Fieldlark (hard requirement)
This is about *planning a city*: roads, zoning, services, transit and citizen happiness. No farming, crops or production chains. Its own setting, story, characters and visual identity, even though it shares Fieldlark's engine.

## Kid-friendly design: what we leave out (hard requirement)
- **No energy, no real-world timers.** Businesses pay out on in-game time that passes only while playing, collected automatically or with a tap, never "come back in 8 hours".
- **Nothing is ever destroyed.** No fires, disasters or crime. Missing services only lower happiness a little and show a helpful hint.
- **No premium currency,** no purchases, no ads.
- **No "invite friends",** no neighbors needed to staff buildings, no gifting requests, no accounts, no chat, no network requests.
- **No streaks** and no red notification dots.
- **Never stuck broke:** a city grant safety net always lets you recover.

## The city
- **Roads and zones:** draw roads on a grid, and zone homes, shops, workplaces and parks. Districts appear naturally: downtown, suburbs, waterfront, a park district.
- **Buildings:** homes grow citizens; shops and workplaces need customers and workers nearby. Public services (school, library, clinic, fire station as a "safety" service, park, community center) cover an area and raise happiness. Original landmarks unlock through the story.
- **Citizens:** visible people walking, cycling, taking buses and driving, with simple needs (home, work, fun, nature, services). Tapping a citizen shows a friendly thought bubble about what they want.
- **Happiness and population:** an overall city happiness and population. Overlays (happiness, services, traffic, greenery) show where to improve. These colored overlay maps are also a gentle lesson in reading data.
- **Budget:** a simple city budget (income from homes and shops, upkeep for services) shown in friendly charts at City Hall. Mistakes only slow growth.
- **Transit and traffic:** bus routes you draw, bike lanes and later a small tram. Traffic jams are visible and fixed by better planning.
- **Green city:** parks, trees, solar roofs and recycling centers improve happiness and an eco rating. Short, real explanations of why.
- **Seasons and night:** the approved look in all seasons, with streetlights and lit windows at night and seasonal decorations.

## Goals and story
- The kids become the junior mayor of a small seaside town, helped by a friendly city planner and a cast of citizens with requests.
- Story chapters unlock new building types and districts, ending with a big city festival, credits, and endless play with new goals.
- **Creative mode:** unlocked after the first chapter. Unlimited budget, everything unlocked, nothing judged. Pure building.

## Controls and UX
- **Inputs:** touch (tap, drag to draw roads and zones, pinch zoom, pan, rotate in 45° steps), mouse and keyboard, and gamepad (a tile cursor).
- **Layout:** Fieldlark's sideways-phone side rail and HUD patterns. 48 px tap targets, and the same tile-size minimums and tap-reachability tests.
- **Settings:** read-aloud, larger text, colorblind patterns on overlays, reduced motion.
- Onboarding the first time each tool appears, plus gentle hints if a player seems stuck.

## Tech and the game contract
- **Build:** one self-contained `dist/index.html`, under 3 MB. It must work from file:// and inside the site's sandboxed iframe, with no network requests.
- **Saves:** a compact save format, 3 slots, migrations, and a full storage area handled with a friendly message. Save when the page is hidden or closed.
- **Data:** buildings, zones, services, citizens' needs, story and facts in typed data files. One tuning file holds all balance values, with a seeded RNG.
- **Simulation:** lightweight, separate from rendering, and unit-testable.
- **Manifest:** a `game.json` with ages "8–14", categories Simulation and Strategy, genre keywords (city builder, city planning, 3D city game; no franchise names), and the `embed`, `moods` and `sessionMinutes` fields.
- **Performance:** 60 FPS on mid-range phones with a maximum city (hundreds of buildings, many cars and citizens). The Low tier is measured after culling against Fieldlark's budgets.
- **Lessons from earlier games:**
  - frame-rate-independent test helpers;
  - quick taps latched so they always count;
  - one browser worker on CI;
  - test shortcuts never overwrite a real save.

## Testing and balance
- **Unit tests:** zoning, coverage, happiness, the budget, transit, citizens' needs, save migration and the storage cap.
- **Simulation:**
  - a bot builds from a new town through the festival ending, with no dead ends;
  - no single strategy dominates;
  - pacing within 6–8 hours.
- **Browser tests** (Chromium and WebKit; phone portrait and sideways, tablet and desktop):
  - drawing roads, zoning and placing buildings by touch and by mouse;
  - overlays, the budget screen and Creative mode;
  - save and reload, file://, and the sandboxed iframe;
  - no console errors and no network requests.
- **Visual review:** every district, season, night and menu at each tier, compared against the style frame.

## Ship
- Finalize the name.
- Import the build into the site, run the storage audit, and make the previews, cover, logo, Open Graph image and the 15-second trailer.
- Set the MCP catalog's `embed` field, and check the site grid with the new game count.
- Open a pull request, get CI green, and give me the preview link. **Stop before production;** I'll approve the release myself.

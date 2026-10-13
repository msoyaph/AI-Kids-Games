<!-- The brief as the owner wrote it, in two messages (the first was cut off at the browser
tests). Other companies' game titles are replaced with a description in [brackets]. "Block Smash"
was the brief's working title; the owner then chose the name Tuck Pop. -->

# Project: Build "Block Smash", a kid-friendly block puzzle game (inspired by [a popular mobile block puzzle])

Build the seventh game for Ai Kids Games: a polished, satisfying block puzzle where players drag pieces onto an 8×8 board and clear full rows and columns. Ages 6+, phone-first but great on tablets and computers. It must be as fun and juicy as the best block puzzles, with none of their pressure tactics.

Work in the AI-Kids-Games monorepo. Scaffold with `npm run new-game -- <slug>` from `templates/game-starter/` and follow `docs/CREATE-A-GAME.md` and `AGENTS.md`. Work on a new branch. Start in plan mode: show me the plan before building. Commit after each phase and keep the game's CLAUDE.md updated. Don't run heavy browser tests at the same time as other test runs.

## Originality (hard requirement)
- The game is *inspired by* [a popular mobile block puzzle] but fully original. Don't use its name, logo, UI layout, wording ("No Space Left", "Can you Top that?", score badges like "SSS"), colors as a set, sounds or art. No other companies' game titles anywhere, including keywords and the manifest.
- If the title is still "[GAME NAME]", suggest 3 original names and pick the best.
- All art is generated in code, and all audio is synthesized with the Web Audio API. No asset files.

## Kid-safety: what we deliberately leave out
The popular versions of this genre use these, and we don't:
- **No ads**, including "watch a video to revive". If a second chance exists, it's earned in play (see Helpers) and never tied to a timer.
- **No purchases and no premium currency.** Themes and helpers are earned by playing.
- **No daily-streak pressure:** nothing is lost by skipping a day. No red notification dots or "!" badges designed to pull kids back.
- **No "Better than 45% of players"** or any comparison that needs online data. Personal bests stay on the device.
- **No cross-promotion** ("More Games", other apps' icons).
- **No network requests, tracking, accounts or chat.**

## Core game
- **Board and tray:** an 8×8 board, with a tray of 3 pieces drawn from a set of original polyomino shapes (single block up to 3×3 squares, lines up to 5, L, T, S and corner shapes). Pieces can't be rotated, as in the genre.
- **Placing:**
  - drag a piece from the tray onto the board. While dragging, the piece lifts above the finger so it's never hidden under it;
  - a ghost preview shows where it will land and which lines would clear;
  - forgiving snapping, and a smooth return to the tray if dropped somewhere invalid.
- **Clearing:** full rows and columns clear together, with satisfying effects.
- **Scoring:** points for blocks placed and lines cleared, and multi-line clears score more.
  - A combo streak (clearing on consecutive placements) builds a multiplier.
  - Clearing the whole board gives a big "Board clear!" bonus.
  - Use original, encouraging words ("Nice!", "Super!", "Amazing!"), and always show the exact points earned.
- **Game over:** when no tray piece fits anywhere. Show a gentle game-over card with the score, personal best, a short stat ("You cleared 23 lines!") and Play again. No guilt, no countdown.
- **Fair dealing:** a piece generator tuned so every tray has at least one piece that fits when dealt (always on Easy). Normal mixes in harder sets as the score grows, and the board never becomes hopeless through bad luck alone. Test this.

## Modes
- **Classic:** endless; aim for your best score.
- **Relax:** made for younger kids. If no piece fits, the tray reshuffles once for free, and game over only comes after that. Slower effects, calm music.
- **Adventure:** an original journey map of 60 levels across 4 themed worlds (for example Meadow, Ocean, Candy and Space). Each level has a clear goal with 1–3 stars:
  - clear 10 lines;
  - collect the gems or fruit embedded in the board;
  - clear around stone blocks;
  - reach a target score in a set number of moves.

  No timers on early levels; timers appear only as optional challenges. Worlds unlock with stars.
- **Daily puzzle:** a seeded puzzle that is the same for everyone each day, with a local best. Missing days costs nothing.

## Helpers (earned, never bought)
- Three helpers earned by playing (for example from line clears or level stars):
  - **Undo** reverses the last placement;
  - **Shuffle** deals a new tray;
  - **Single block** places one 1×1 block anywhere.
- Give a small starting supply, and a free Undo on Relax.
- At game over in Classic, if the player has a helper, offer "Use a helper to keep going?" with no timer.

## Look, feel and sound
- **Look:** bright, chunky, tactile blocks with soft bevels and glossy highlights.
- **Themes:** 6 original themes (classic blocks, wood, candy, ocean, space, night) unlocked by playing. Each theme changes the board, the blocks, the background and the music.
- **Juice:** snap-in squash, a line-clear sweep with sparkles, combo text that grows with the streak, a board-clear celebration, subtle screen shake (with a toggle) and a confetti best-score moment.
- **Flash safety:** no effect flashes more than 3 times per second, and celebrations glow rather than strobe. Reduced motion turns off shake and big effects.
- **Audio:** calm, upbeat synthesized music per theme, and satisfying sounds for pick-up, placement, clears (the pitch rises with the combo) and the best score. Mix carefully, with a limiter on the master output.
- **Haptics:** short vibrations for placement and clears where supported, with a toggle.

## Accessibility
- **Colorblind mode:** each block color gets a distinct symbol pattern, so color is never the only cue.
- **High contrast and larger text** options.
- **Keyboard and gamepad play:** select a tray piece, move it on the board with the arrow keys or d-pad, and place it with Enter or A. Every action is possible without a mouse or touch.
- **Read-aloud** for level goals and tips, using the browser's built-in speech synthesis and failing gracefully.
- Tap targets of at least 48 px.

## Tech and the game contract
Follow the starter template and the site's game contract:
- Vite + TypeScript (strict mode), and PixiJS for rendering and effects.
- **Build:** one self-contained `dist/index.html` under 1 MB. It must work from file:// and inside the site's sandboxed iframe, with no network requests.
- **Layout:** portrait-first (phones), with a layout that adapts to landscape tablets and desktops (board centered, tray beside or below). Respect safe-area insets, and prevent zoom, scroll and pull-to-refresh during play.
- **Storage:** every key uses the game's own prefix. Keep each save under 50 KB, handle full storage gracefully, and version the save with migrations. Saves hold the best scores, Adventure progress, helpers, themes, settings, and the current Classic game, so a reload resumes it.
- **Hooks:** a read-only `window.__<slug>` test hook, plus a preview capture route for the site's `npm run capture-previews` (a big combo clear, a board clear, an Adventure level, a theme showcase).
- **Manifest:** a `game.json` with ages "6+", categories Puzzle and Casual, genre-based keywords (block puzzle, line clear, brain game, relaxing), controls (touch, mouse, keyboard, gamepad) and devices (phone, tablet, computer).
- **Performance:** 60 FPS on low-end phones. Pool particles and avoid allocation in the hot loop.

## Testing and balance
- **Unit tests:** placement rules, row and column clears (including both at once), scoring and combos, game-over detection, the fair dealer (always at least one placeable piece on Easy), Adventure goals, helpers, the daily seed and save migration.
- **Bot simulation:** a bot plays thousands of Classic games to tune the generator and scoring. Targets to propose in the plan, for example:
  - a casual bot's games last at least 3 minutes on average;
  - a strong bot can reach high scores without it going on forever.

  Also check that every Adventure level is beatable by the bot, with 3 stars possible.
- **Browser tests** (Playwright, Chromium and WebKit; phone, tablet and desktop; portrait and landscape):
  - drag-and-drop by real touch, and by mouse, including tap-to-select then tap-to-place;
  - keyboard-only play, and gamepad menus;
  - a Classic game resumes correctly after a reload;
  - file:// and the site's sandboxed iframe;
  - no console errors, no network requests, and saves only under the game's prefix.

## Visual review
Screenshot every theme, mode and celebration on phone and desktop, review them critically, and fix anything cluttered or cheap-looking. Include the colorblind and high-contrast modes.

## Add it to Ai Kids Games
- Import the build, run the storage audit, and capture previews, cover, logo and Open Graph image in the site's style.
- Make sure the site's grid stays balanced with seven games.
- Update the README game table, `llms.txt` and the sitemap, generated from the manifest.
- Open a pull request, get CI green, and give me the preview link. Stop before production.

## Definition of done
- All modes are complete, and all tests pass locally and in CI.
- The build is under 1 MB, works offline from one file, and holds 60 FPS on the throttled phone profile.
- The game appears on the site preview with its art and previews.
- At the end, give me: phone screenshots of each mode and theme, the bot balance results, the build size, the preview link, and known issues.

## Owner decisions on the plan
1. **CI:** Space Sky's and Light Crossing's typecheck, unit tests and build stay in CI; their browser tests move to a local pre-release run that is a required release step, recorded for the release in `apps/site/DEPLOYMENT.json`. Refine CI's "what changed" check so a new game runs only its own suite. Follow-up: get those two suites passing on CI later.
2. **Name:** don't ship as "Block Smash" (too crowded). Use a neutral working slug; propose 5 short, distinctive, kid-friendly names checked against app listings; the owner picks one. Finalize the name, slug and storage prefix before the game is added to the site. No release ever ships with the working name.
3. **Categories:** add Puzzle and Casual. Add [the inspiring game] and [three other well-known block-puzzle titles] to the trademark blocklist.
4. **Versions:** game 1.0.0, site 2.4.0. Stop for the owner's production approval before releasing.

# Touch audit (before the touch pass)

**Method:**
- `scripts/touch-audit.ts` opened 37 staged screens in Chromium and WebKit with touch emulation, on a phone (390×844, both orientations) and a tablet (820×1180).
- Each screen got an automatic layout check: off screen, under a simulated notch or home bar, tap targets under 48 px, overlapping tap targets, HUD covering a menu, text under 12 px.
- The first run found 950 issues (257 distinct). I reviewed the screenshots myself and read the input code.

**Ratings:** ✅ works well · ⚠️ awkward · ❌ impossible with touch alone.

## Findings

### Getting started

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Title, slots, Continue | ⚠️ | ⚠️ | "Continue" and "Delete" on the save cards are 32 px tall. |
| Character creator | ❌ landscape / ⚠️ portrait | ✅ | In landscape the panel runs off the bottom and doesn't scroll, so "Set sail!" can't be reached. Swatches and chips are 32 px. |
| Typing a name | ⚠️ | ⚠️ | Nothing keeps the field visible above the on-screen keyboard (no `visualViewport` handling, no `interactive-widget`). |
| Saving by sleeping | ✅ | ✅ | Tap A at the bed. |
| Pause / Save / Quit to title | ❌ | ❌ | The pause menu only opens with Esc or Start. Touch players can't quit to the title or save from a menu. |

### Moving around

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Walking | ⚠️ | ⚠️ | The floating stick only works in the bottom-left quarter, there's no tap-to-move, and there's no visible hint. |
| Running | ⚠️ | ⚠️ | You either push to the very edge or hold a pink button labelled "B". |
| Sneaking up on bugs | ⚠️ | ⚠️ | Needs two thumbs: hold A with the net raised while steering. A partial push isn't quieter. |
| Interiors in and out | ✅ | ✅ | Walk to the door. |
| Ramps | ✅ | ✅ | |

### Activities

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Tool ring | ❌ | ❌ | There's no way to open it by touch: the "Tool" button only cycles. When it does open, 7 tools at a fixed 130 px radius crowd a 360 px phone. |
| Axe, shovel, can, net, rod, ladder | ⚠️ | ⚠️ | There's no highlight of the tile a tool will hit, so it's easy to dig or chop the wrong spot. |
| Fishing: cast and bite | ✅ | ✅ | Tap A. |
| Fishing: reel minigame | ❌ portrait / ⚠️ | ⚠️ | On portrait phones the reel bar sits on top of the A button and catches the touch, so you can't hold A to reel. Elsewhere A is the only place you can hold. |
| Bug catching | ⚠️ | ⚠️ | See sneaking. |
| Digging, foraging, chopping | ⚠️ | ⚠️ | No target highlight. |

### People

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Talking | ✅ | ✅ | Tap the box to go on. |
| Dialogue choices | ⚠️ | ⚠️ | Choices are 42 px tall, and the 🔊 button overlaps the last choice. |
| Gifts and deliveries | ⚠️ | ✅ | The picker works, but its buttons are small. |

### Shops and crafting

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Buy and sell, several at once | ⚠️ | ⚠️ | Buy/Sell tabs and ✕ are 32 px. Toasts cover the panel. |
| Craft several | ⚠️ | ⚠️ | ×1 / ×5 / All and the category tabs are 32 px. |
| Recipe tracking | ⚠️ | ⚠️ | 📌 is small, and the HUD ✕ is about 20 px. |
| Museum donations | ⚠️ | ✅ | Buttons are 42 px, "Close" is 32 px. |

### Decorating

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Furniture editor | ❌ portrait / ⚠️ | ⚠️ | The button bar and list cover most of the room on phones, and there's no drag (tap to pick, tap to place). Landscape phone: "Done" sits under the notch and the list is cut off. |
| Wall, surface, undo | ⚠️ | ✅ | They work, but there's no clear "on the table" choice. |
| Outdoor decorations | ⚠️ | ✅ | The nudge buttons are small. |
| Closet and outfits | ❌ landscape / ⚠️ | ✅ | In landscape the outfits run off the bottom and don't scroll. The tabs and "Take out" are small. |
| Dye station | ⚠️ | ✅ | Small buttons. |

### The island

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Glowpad apps | ⚠️ | ✅ | ✕ and "‹ Apps" are 32 px. In landscape phones the Glowpad is a cramped portrait card. |
| Placing homes, bridges, ramps | ⚠️ | ⚠️ | It works with the stick and A, but the prompt says "Esc to cancel" and there's no Cancel button. |

### Events

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Contests | ⚠️ | ⚠️ | On portrait phones the contest timer overlaps the clock. The rest is the same as fishing and bugs. |
| Festivals | ⚠️ | ✅ | Flower Fair and Harvest Feast are handed in by talking (fine). Star Night is pick-ups (fine). Lantern Skate steering works, but the rings are hard to judge without tap-to-move. |

### Settings

| Item | Phone | Tablet | What's wrong |
|---|---|---|---|
| Text size, read-aloud, quality | ⚠️ | ⚠️ | Chips are 32 px and the sliders are thin. |
| Playtest export | ⚠️ | ⚠️ | The hidden version line is a 12 px tap target. |
| Benchmark | ✅ | ✅ | |

### Across the whole game

- **HUD:**
  - Toasts stack in the middle of phone screens, cover the mission tracker, and sit above every menu (z-index 5), covering buttons.
  - The clock pill is 240 px wide on phones.
  - The tool card and touch buttons crowd the bottom-right corner.
  - The action prompt overlaps the B button on portrait phones.
- **Safe areas:**
  - Only the top edge used `env(safe-area-inset-*)`.
  - In landscape the clock, tracker, A button, Glowpad button and editor "Done" sit under the notch.
- **Mobile browser:**
  - iOS ignores `user-scalable=no`, so pinch and double-tap zoom still work.
  - Nothing stops pull-to-refresh or long-press callouts.
  - Audio unlocks on `touchstart`, but iOS needs `touchend`.
  - Read-aloud isn't primed by a tap, so iOS may stay silent.
  - There's no fullscreen button, and no pause when the app goes to the background (it only saves).
- **Quality:** Auto picks Medium on 8-core phones. The aim is Low on every phone.

## Fix plan

1. **Touch controls** (`src/ui/touch.ts`, a touch layer over the canvas):
   - **Stick:** a floating stick that starts anywhere. A small push sneaks (🐾, quiet and slow), a bigger push walks, and the edge runs. The zones are drawn on the stick.
   - **Tap-to-move:** tap the ground to walk there. Tap a person, door or item with empty hands to walk up and use it. Tap the glowing target again to use a tool.
   - **Buttons:** a big contextual A button with a label ("Chop", "Talk"); a Run button; a Tool button that shows your tool and opens the ring; Bag; Glowpad; and a ≡ menu for pause/save/quit.
   - **Placement:** on-screen "✔ Place" and "✕ Cancel" buttons. Prompts are worded for whichever input you're using.
   - **Fishing:** while a fish bites or reels, a touch anywhere holds or taps. The reel bar moves out of the way and doesn't catch touches.
   - **Other inputs:** the controls hide when a keyboard or gamepad is used, and come back on touch.
2. **Target highlight:** a ring on the tile that the action or tool will affect. It's green when something will happen, grey when not, and at the bobber spot for the rod.
3. **HUD layout:** a small layout pass that keeps the clock, tracker, money, toasts, prompt, tips, reel and contest timer from overlapping each other or the controls, inside the safe area. Toasts queue (2 at a time on phones), never cover a menu, and show inline in the open panel when they belong to it.
4. **Touch CSS:** 48 px minimum tap targets on touch devices, readable text (12 px or more), safe-area variables on every edge-anchored element, and menus that scroll within the safe area (creator, closet, Glowpad, shop).
5. **Editor:** drag a piece to move it. A big toolbar has Turn, Nudge arrows, Walls, "On table/floor", Put away, Undo and Done. The pieces list becomes a drawer, so the room stays visible on phones.
6. **Mobile browser:**
   - no zoom, pull-to-refresh, callouts or selection during play, while menus still scroll;
   - the keyboard-safe name field;
   - audio unlock on `touchend`, and read-aloud primed by a tap;
   - a fullscreen button only where it works;
   - pause, save and silence when the app is hidden, then resume;
   - Auto picks Low on phones;
   - "Tap to continue" after context loss works by touch.
7. **Tests:**
   - a Playwright touch suite (Chromium and WebKit × phone and tablet × portrait and landscape) that plays Chapter 1 with touch only, plus touch spot checks;
   - a layout suite (every screen × every viewport × both engines);
   - a throttled benchmark;
   - all existing tests.

## After the touch pass

Every item above is now ✅ on phones and tablets, in portrait and landscape, in Chromium and WebKit.
The layout checker finds 0 issues on every screen × viewport × engine (`e2e/layout.spec.ts`).

Before / after on a phone (390×844 and 844×390): [portrait](compare-phone-portrait.jpg),
[landscape](compare-phone-landscape.jpg) (each pair: before on the left, after on the right; single shots in
`before/` and `after/`).

| Was | Now |
|---|---|
| ❌ Pause / save / quit | ☰ button: Resume, Save, Settings, Full screen (where supported), Controls, Save & quit |
| ❌ Tool ring | The Tools button (it shows what's in your hand) opens the ring, which sizes itself to the safe area |
| ❌ Reel on portrait phones | Hold anywhere on the screen to reel. The reel bar sits in the HUD lane and never catches touches |
| ❌ Creator / closet in landscape | Every menu scrolls inside the safe area. "Set sail!" and the outfits are always reachable |
| ❌ Editor on portrait phones | Drag pieces. The pieces list is a drawer (＋ Add). One toolbar: nudge, Turn, On table/floor, Put away, Walls, Undo |
| ⚠️ Walking / running / sneaking | Floating stick anywhere: a small push sneaks (🐾), a bigger push walks, the edge runs. Or tap to walk there |
| ⚠️ Which tile will I dig? | A ring on the exact tile the action touches (green when something will happen) |
| ⚠️ Small tap targets, 🔊 over choices | 48 px minimum on touch devices. 🔊 moved inside the dialogue box |
| ⚠️ Placement "Esc to cancel" | ✔ Place / ✕ Cancel buttons, and prompts worded for the input in use |
| ⚠️ HUD overlaps, toasts over menus | HUD layout pass: nothing overlaps, toasts queue and only use free space, HUD buttons sit above the touch layer |
| ⚠️ Notch / home bar | Everything sits inside the safe area (tested with simulated notches) |
| ⚠️ iOS zoom, pull-to-refresh, callouts | Blocked during play. Menus still scroll |
| ⚠️ iOS audio / read-aloud | Unlocked on the first tap (touchend + a silent buffer; speech primed) |
| ⚠️ Background / lock | Saves, pauses (pause menu), silences audio; resumes cleanly |
| ⚠️ Auto quality on phones | Phones start on Low |

### Bugs found while testing by touch

- `<html>` got the class `touch`, which is also the touch layer's class. The page became `pointer-events: none`, so
  the editor and the "Tap to continue" card couldn't be tapped on touch devices. The class is now `touch-ui`.
- The mission tracker's 🔊 and the recipe tracker's ✕ sat under the full-screen touch layer: tapping them walked
  you somewhere instead.
- After a Bluetooth keyboard was used, the browser's fake mouse click that follows a tap made the game think the
  mouse was in use, so the touch buttons never came back.
- A fast skater could pass through a Lantern Skate ring between checks (now checked every frame along the path).
- The ring showed the tile in front while A would pick up the branch underfoot (the ring now follows the action).
- Tapping a building's walls or roof didn't count as tapping the building.
- WebKit draws buttons without a font size at 11 px; they now default to 15 px.
- Putting the rod away left the line in the water, so touch stayed in "hold anywhere to reel" mode. Swapping
  tools now reels the line in.
- Tapping Fennimore behind the shop counter did nothing (no path to him). Taps on someone behind a counter now
  walk you up to the counter.
- With the net out and a bug sitting on a tree, A shook the tree instead of swinging the net (with every input,
  not just touch). The net wins now when a bug is in reach.
- Tapping the workbench could walk you to the ground behind it: at this camera angle a low object covers the
  tile behind it, and picking went by the nearest tile centre. A tap inside a building's (or the workbench's)
  outline on screen now picks it; ground in front of it, trees and people still win where they're in front.
- The Crafting, Shop and Pockets tips waited until no menu was open, so they appeared after you'd left that
  menu. They now show inside the menu, under its title (`TipManager.inline` / `App.tipInside`).
- On small phones the full mission list covered part of the room (the tent's bed). Small screens show just the
  next step and "+N more"; the Glowpad's Missions app has the whole list.

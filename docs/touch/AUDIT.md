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

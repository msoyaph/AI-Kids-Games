# Ai Kids Games redesign: design plan (step 1)

Status: approved by the owner on 2026-10-11, with these decisions:
1. Use the Vercel production domain for now.
2. Real loading progress is approved; the CSP allows `connect-src 'self'` only.
3. Replace all five games' art. Each game's cover, logo and capture route lives
   in its own files so they can be redone (Vanex Defense is being restyled for
   ages 10–14, and Space Sky is moving to 3D).
4. No "Tap to start". The 90+ Performance target applies to home and details.
   The play page is exempt from Performance only; Accessibility, Best Practices
   and SEO must still be 90+.
5. The balanced grid must work for any count. Screenshot-test it with 1, 4, 6, 7
   and 12 games using temporary mock entries.

## Design principles

1. **The games bring the color.** The interface is neutral. Only cover art, logos
   and gameplay video are colorful. There are no gradient washes or tinted panels.
2. **One action color.** Go green is used only for Play and primary buttons.
   Nothing else uses it: not links, chips, icons, hearts or focus rings.
3. **Every word earns its place.** Use sentence case everywhere. No eyebrow labels,
   counters, "Ready to play", art captions, or arrows on links. The only arrows
   point somewhere real: Back, and next or previous in the gallery.
4. **Text never sits on art.** Text goes beside the media on wide screens and below
   it on phones. Logos are the one exception: they are drawn to sit on art.
5. **Motion has a purpose.** Motion is limited to gameplay previews, slow cover
   idle layers, and immediate feedback to taps and hovers (150 ms or less). There
   are no entrance animations. With reduced motion, everything is still.
6. **Big, plain and obvious.** Every target is at least 48 px, and Play buttons are
   56 px. Words are short and simple. Keyboard focus is always visible.
7. **Light and private.** Every byte comes from our own origin. The home page's
   initial load stays under 500 KB, excluding preview videos.

## Palette

Six named colors. Each one has a light value and a dark value.

| Name | Light | Dark | Used for |
|---|---|---|---|
| Paper | `#F5F6F8` | `#0F1115` | Page background (cool, not cream) |
| Surface | `#FFFFFF` | `#181B21` | Cards, header, panels, badges, heart button |
| Ink | `#16191F` | `#F1F3F6` | Text, icons, focus ring, saved heart |
| Slate | `#5A6272` | `#A2A9B6` | Secondary text and form-control borders |
| Mist | `#E2E5EA` | `#2A2E37` | Hairlines, chip outlines, image placeholders |
| Go | `#0B7A50` | `#3CCB86` | Play and primary buttons only. White text in light mode, `#08130D` in dark |

Contrast:
- Ink on Paper is 17:1.
- Slate on Paper is 5.7:1 in light mode and 8.0:1 in dark mode.
- Button text on Go is 5.4:1 in light mode and 9.0:1 in dark mode.
- The focus ring is a 3 px Ink outline with a 3 px offset. It is visible on every
  surface and on art.

## Typeface and type scale

**Nunito** (variable, SIL OFL), self-hosted as one Latin WOFF2 file of about 40 KB
through `@fontsource-variable/nunito`. It makes no font requests to other origins.
Its rounded terminals feel friendly, and its open shapes and generous x-height stay
readable for young readers. Letter spacing is 0 everywhere except display text.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Display | 40/44 (phone 30/34) | 750, −0.01em | Page titles (one per page) |
| Title | 28/34 (phone 24/30) | 700 | Section headings |
| Heading | 20/26 | 700 | Card titles, panel headings |
| Body | 17/26 | 500 | Paragraphs, descriptions |
| Small | 15/22 | 600 | Badges, category, facts, chips, footer |
| Button | 17/20 (Play 20/24) | 750 | All buttons |

Spacing uses an 8-point scale: 4, 8, 12, 16, 24, 32, 48 and 64. Corner radius is 12 for
controls, 16 for media and cards, and full pills for badges and chips. There are no
shadows at rest. Hovered cards get one soft shadow.

## Media formats

- **Card ratio: 16:9 landscape.** It matches every game's real screen, so
  previews need no cropping.
- **Cover safe area:** the top 22% of every cover and the outer 6% on each side
  hold only background (sky, water, space). The age badge sits top left, and
  the heart sits top right. The subject lives in the lower-middle area.
- At rest, a **card** shows the new SVG cover art with slow idle layers. On
  hover, keyboard focus or touch-in-view, the gameplay loop fades in over it.
  The **hero** and the **details page** show the gameplay loop, with its gameplay
  poster frame as the still. With reduced motion, Save-Data or a video error,
  the still image stays in place.

## Preview playback rules (shared by the hero, cards and details)

- **One preview controller.** At most one video plays on the page at a time.
- **Desktop** (`hover: hover`): the hero loop plays while it is in view. A card
  plays while hovered or focused, and the hero pauses meanwhile.
- **Touch** (`hover: none`): the preview that is at least 60% in view and closest
  to the center of the viewport plays. All the others pause.
- **Lazy loading:** a `<video>` gets no `src` and `preload="none"` until it is
  first needed. The WebM source is listed first, then MP4. The video is always
  `muted`, `loop` and `playsinline`.
- **Still images instead of video:** `prefers-reduced-motion`,
  `navigator.connection.saveData`, or any video error. The still is the poster
  (AVIF, WebP or JPG through `<picture>`) or the cover art.
- **Loops:** 960×540 at 30 fps, 7–8 s, made of 3–4 moments joined by short
  crossfades. The last moment crossfades into the first, so the wrap is seamless.
  Each loop is H.264 MP4 and VP9 WebM with no audio. Each file is encoded to a
  bitrate cap that keeps it under 800 KB.

## How the gameplay capture works (step 2)

The survey of all five source projects found:
- Every game draws its HUD and menus in the DOM, over a single game canvas.
- Each production build exposes a usable hook. These are already used by our tests:
  - TheaBonk: `__theabonk`
  - Light Crossing: `__lc`
  - Vanex Defense: `__vanexTest` plus `?map=`, `?seed=` and `?stress=`
  - Space Sky: `__spacesky` via `?debug`
  - Calex Cart: `__calex`, whose AI can drive the player's kart

**Browser.** Playwright with full Chromium (`channel: 'chromium'`) and the Metal
flags the game projects use: `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`.
The viewport is 1920×1080. Each game is loaded on its own from the unchanged
`public/games/<slug>/index.html`. All helper code is injected at run time, so no
file changes.

**Recording.** `canvas.captureStream(60)` feeds MediaRecorder (VP9, about 40 Mbps).
Because the HUD is DOM, the footage is HUD-free automatically. For the one
DOM-dependent moment (TheaBonk's level-up cards), I'll record the tab with
the HUD hidden. If real-time capture stutters, I'll fall back to frame-stepping
with the games' own `advance()` and `debugStep()` hooks. Each scenario records
a longer take and logs event timestamps (boss spawned, fish caught, drift tier,
item hit, glider launch). ffmpeg (`ffmpeg-static`) cuts about 2 s around each
event, scales to 960×540, crossfades the moments into a seamless loop and encodes
MP4 and WebM to the size cap. sharp writes the AVIF, WebP and JPG stills.

| Game | Moments and how they're reached |
|---|---|
| TheaBonk | The 16:00 "ring" wave of 40 Gloomlings around Thea (director time and event index, god mode). A level-up choice (`pendingLevels = 1`, tab capture). Grumblecap boss (event index 4, time 299). A dense `?stress` horde against the Bonk Ring |
| Light Crossing | The title island at 17:30 as an establishing orbit. A sunset walk (`clock.minute = 18*60`, driven movement). Catching a fish (add a rod, face water, cast, wait for a bite, press E). The lantern festival (`view.startFestival()` at 20:30 with the lighthouse lit) |
| Vanex Defense | Towers firing at a wave (`?map=w1m1&diff=easy`, towers built through the real UI). Combo towers (`?stress=60` puts every combo at level 3). A boss: King Gloop at wave 10, played up to at 3× speed with an automated maze |
| Space Sky | Flying past Saturn's rings (`go('flight')` and a ship teleport, as in its e2e test). A landing on Mars (auto-lander). Exploring Zephyra Village (`go('explore')`) |
| Calex Cart | The AI takes over Calex's kart on Seashell Boardwalk and Canyon Run. Cuts are picked from the `driftTier`, `itemHit` and glider `launch` events |

Raw takes go in a git-ignored `captures/` folder. The published files go in
`public/media/<slug>/`:
- `loop.mp4` and `loop.webm`
- `poster.{avif,webp,jpg}`
- `shot-1…6.{avif,webp,jpg}`, plus 480 px thumbnails
- `cover.svg` with its layer SVGs, and `logo.svg`

The Open Graph images go in `public/og/<slug>.jpg`. To add a future game, write
one scenario file, `scripts/capture/<slug>.ts`, and run
`npm run capture-previews -- <slug>`.

## Wireframes

### Game card (desktop and phone are the same; only the width changes)

```
┌──────────────────────────────────────┐
│ (Ages 6+)                       (♡) │  ← safe band: background only
│                                      │
│          cover art, 16:9             │  ← hover/focus/in-view: gameplay
│        subject lives down here       │     loop crossfades in (200 ms)
└──────────────────────────────────────┘
  Light Crossing                          Heading 20/26, Ink
  Cozy                                    Small 15/22, Slate
```

The whole card is one link to the details page. The heart is a separate button.
"Ready to play", the tagline, the colored category chips and the title arrow are
gone. "Coming soon" replaces the category only for placeholder games.

### Home, desktop (1440)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [■] Ai Kids Games          Games   Favorites   For parents     [⌕] [◐] │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐                           │
│ │                                          │   [ GAME LOGO ]           │
│ │                                          │                           │
│ │      gameplay loop, 16:9 (7/12 cols)     │   Make a little island    │
│ │                                          │   shine.                  │
│ │                                          │   Ages 6+                 │
│ │                                          │   [ ▶ Play ]              │
│ └──────────────────────────────────────────┘                           │
│  [▭][▭][▭][▭][▭]  [❚❚]   ← mini covers of all five games pick a slide  │
│                                                                        │
│ All games                                                              │
│ (All) (Action) (Adventure) (Cozy) (Learning) (Racing) (Strategy)       │
│                                                Player age [Any age ▾]  │
│ ┌───────────────────────────────┐ ┌───────────────────────────────┐   │
│ │            card               │ │            card               │   │
│ └───────────────────────────────┘ └───────────────────────────────┘   │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐   │
│ │       card         │ │       card         │ │       card         │   │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘   │
│                                                                        │
│ Play again  [▭ TheaBonk] [▭ Space Sky]   ← only after something is played│
├────────────────────────────────────────────────────────────────────────┤
│ No ads, no tracking, no accounts.     For parents · Privacy · About   © │
└────────────────────────────────────────────────────────────────────────┘
```

- **Hero slides.** Each slide shows the loop, the logo, one line of
  description, the age and Play. That's all. The slide advances after one loop,
  about 8 seconds. It pauses while hovered or focused, and the pause button
  stays. With reduced motion, there is no rotation and no pause button. The page
  has a visually hidden `<h1>` ("Ai Kids Games"), and each logo is an `<img>`
  whose alt text is the game's title.
- **Slide picker.** Five mini covers replace the dots and the "02 / 02"
  counter. They show all five games at once, and kids who can't read yet can
  still use them. Each has a 48 px target and an `aria-label` with the game's name.
- **Balanced grid.** A 6-column grid splits any count into full rows, with the
  wider rows first: 5 → 2 + 3, 4 → 2 + 2, 7 → 2 + 2 + 3, and 1 → 1 wide. No empty
  slots. Filtering reflows the grid the same way.
- **Category rows.** The rows (Action, Adventure…) render automatically below
  the grid once the catalog has 12 or more games.
- **Removed:** the headline, the intro paragraph, the "What feels fun?" chips row,
  the safety strip and the end note. "No ads, no tracking, no accounts" moves to
  the footer. Favorites live on their own page and in the nav count.

### Home, phone (390)

```
┌────────────────────────────┐
│ [■] Ai Kids Games  [⌕] [◐] │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ gameplay loop, 16:9    │ │
│ └────────────────────────┘ │
│ [ GAME LOGO ]              │
│ Make a little island shine.│
│ Ages 6+                    │
│ [ ▶ Play            ]      │  ← full width, 56 px
│ [▭][▭][▭][▭][▭]   [❚❚]     │
│                            │
│ All games                  │
│ (All)(Action)(Advent… ⟶    │  ← chips scroll sideways
│ Player age [Any age ▾]     │
│ ┌────────────────────────┐ │
│ │ card, full width       │ │
│ └────────────────────────┘ │
│  Light Crossing            │
│  Cozy                      │
│  …                         │
├────────────────────────────┤
│ Home  Games  Favorites  Parents │ ← bottom nav stays
└────────────────────────────┘
```

On a tablet in portrait, the hero stacks as it does on a phone. The grid has two
columns, and the first card spans both when the count is odd.

### Game details, desktop

```
← All games
┌──────────────────────────────────────────┐   [ GAME LOGO ]
│                                          │
│          gameplay loop, 16:9             │   Arrive on Driftlight Isle,
│                                          │   pitch a tent and build a
│                                          │   cozy island life…
│                                          │
└──────────────────────────────────────────┘   [ ▶ Play ]   [♡ Save]
──────────────────────────────────────────────────────────────────────────
 ☺ Ages 6+     ◷ About 6 hours     ▭ ▯ ▯ Computer, tablet, phone     ⌨ 🖱 🎮 ✋
──────────────────────────────────────────────────────────────────────────
 Screenshots
 [ shot ][ shot ][ shot ][ shot ][ shot ]     ← click or Enter opens the lightbox

 How to play                                For grown-ups
 1 Walk with WASD or drag on the left.      Peaceful island life with no
 2 Press E or A to talk, fish and dig.      combat… (content notes)
 3 Help the island get ready for the        Privacy · For parents
   lantern festival.
 ▸ All controls   ← disclosure with the exact, full keyboard,
                    gamepad and touch guidance

 More games
 [card][card][card][card]                   ← the other four, 2 + 2 balanced
```

The facts row uses icons with short visible labels. The controls icons have
tooltips and accessible names. Numbered steps are kept because how to play
really is a sequence. On a phone, everything stacks in this order: loop, logo,
description, full-width Play, Save, facts as a 2 × 2 grid, sideways-scrolling
screenshots, steps, notes, then more games. The lightbox is a native `<dialog>`
with Previous and Next buttons, arrow keys and Escape, and it returns focus to
the thumbnail that opened it.

### Play page

```
┌──────────────────────────────────────────────────────────┐
│ ← Back              Light Crossing          [⤢ Fullscreen]│  ← slim 56 px bar (kept)
├──────────────────────────────────────────────────────────┤
│                                                          │
│            ┌──────────────────────────┐                  │
│            │   cover art (16:9), idle │                  │
│            └──────────────────────────┘                  │
│                 [ GAME LOGO ]                            │
│            ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░   Loading 62%             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The progress bar is real. The page streams the game's HTML from our own origin
and measures it against the byte size recorded in BUILD_IMPORTS.json. The iframe
then loads from the browser cache through an ETag revalidation. This needs the
site CSP's `connect-src` to change from `'none'` to `'self'`. It is still
same-origin only. Without streaming support, the bar becomes an indeterminate
one, which is static under reduced motion. "Taking a little longer…" and
"Try again" stay. The iframe sandbox and permissions don't change.

### Other pages

- **Search (`/games`):** Display title "Find a game", a search field, category
  chips, the age select, and the balanced grid.
- **Favorites:** a title, the grid, and an empty state with one line and one button.
- **For parents:** three short promises as a plain list, a compact table of the
  games (age and content notes), the clear-lists panel, and a link to Privacy.
- **Privacy (new):** no accounts, ads, analytics or tracking; game progress stays
  on the device; the hosting provider (Vercel) processes standard request data,
  such as IP addresses, to deliver the site.
- **About:** two short paragraphs and one button.
- **404:** "This page wandered off." and a button home.

## Self-review against the brief and generic AI-site defaults

I checked my first draft against both, and changed it in these places:

| Found in my draft | Why it failed | Revised to |
|---|---|---|
| The hero slide also had a category and a "Details" link | The brief lists loop, logo, one line, age and Play. Anything more is noise | Exactly those five things. Cards below already lead to details |
| A "Play again" row sat between the hero and the grid | The brief asks for a single grid directly below the hero | "Play again" moves below the grid. It is a compact row of small covers, shown only after something has been played |
| A red heart for saved favorites | It added a second accent color | The heart is filled Ink when saved. Its state is also in `aria-pressed` and the label |
| A coral Play button, which I considered | It was too close to the clay-accent default | Go green. Green means go, and it matches the existing brand mark |
| Dots plus a "1 / 5" counter | A counter is noise, and dots are abstract | Mini covers of all five games, so they double as a preview of the catalog |
| Long how-to-play steps, copied as they are | The brief asks for short steps | 3 short "Quick start" steps per game. The exact full controls stay under an "All controls" disclosure, so accuracy isn't lost |
| "Have fun. Take breaks." under the play-page title | Decorative | Removed |

Checks that the plan already passes:
- **Warm cream and clay:** the background is cool neutral, with one green accent.
- **Identical cards with gradient washes:** there are no washes or tints. The grid
  uses a 2 + 3 rhythm, and each cover is real illustrated art.
- **All-caps eyebrows:** none, anywhere.
- **An arrow on every link:** arrows appear only on Back and gallery navigation.
- **Other defaults avoided:** no emoji icons (the wireframes use placeholders for
  line icons), no glass effects, and no giant centered headline over art.
- **Brief coverage:** all five games are in the hero, and art never sits under
  text. Cards have no "Ready to play" or captions. There is a 48 px minimum
  target, light and dark themes, focus rings, and reduced-motion stills.

## Choices I made that you may want to change

- **Production domain:** no domain was given, so I'll use the Vercel production domain.
- **CSP:** `connect-src 'self'` is needed for a real loading percentage. Everything stays same-origin.
- **Old art:** the three provided cover and thumbnail pairs are replaced, because the
  brief asks for one consistent style.
- **Quick-start steps:** I'll write three per game from each game's real controls.
  The full guidance is kept word for word under "All controls".
- **Play page:** Performance is exempt there (owner decision 4), because a 1 MB
  game boots inside the page. There is no "Tap to start" step.

## Delivery steps (one commit each, with CLAUDE.md updated each time)

1. This design plan.
2. Gameplay capture pipeline: `npm run capture-previews -- <slug>`, the five
   captures, and the generated loops, posters and screenshots.
3. New SVG covers with idle layers, title logos and Open Graph images.
4. Design system and site shell: font, tokens, header, footer, buttons and dark mode.
5. Preview player and cards: lazy loading, hover and focus play, one-at-a-time
   on touch, and the reduced-motion, Save-Data and error fallbacks.
6. Pages: Home, Details (gallery and lightbox), Play loading screen, Search,
   Favorites, For Parents, About, 404 and Privacy.
7. Launch metadata: robots.txt, sitemap, canonical URLs, favicons and per-page Open Graph images.
8. Tests, then a visual review at desktop, tablet and phone in light and dark,
   then a Lighthouse pass with fixes.
9. Vercel preview and the hosted suite, the approval guard, production, protection
   check, logged-out smoke test and report.

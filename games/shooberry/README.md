# Shooberry

A bright 3D lane-strategy game for ages 7 and up, for Ai Kids Games. Silly critters are sneaking
toward the picnic snacks: plant friendly garden helpers in the lanes to shoo them home. Nobody gets
hurt. Critters poof into leaves and run off, nibbled plants just wilt, and a lost level is simply
tried again with a hint.

Play it on the Ai Kids Games website, or open the built `dist/index.html` directly. It's one
self-contained file that works offline. Notes, decisions, status and the IP log are in
[CLAUDE.md](CLAUDE.md), and the brief is in [docs/prompts](../../docs/prompts/shooberry.md).

## How to play

- **Plant:** choose a plant card, then tap or click a garden spot (or drag the card onto the
  garden). Press and hold a card or a plant to read about it. The trowel card digs a plant up to make
  room (no compost back).
- **Compost** pays for plants. Earthworms leave compost piles, Comfrey and Yarrow make it, and
  shooed critters drop leaves that turn into compost. It's collected for you; turn that off in
  Settings to tap the piles yourself.
- **The picnic:** a critter that reaches the blanket grabs a snack and runs home. Each lane has a
  pop-up picnic umbrella that opens once to send nearby critters back. Three snacks saved means
  three stars, and a level is lost only when all three are gone.
- **Keyboard:** arrow keys or WASD move the garden cursor, 1–9 or Q and E choose a plant, Enter or
  Space plants, T picks the trowel, C collects all compost, F switches speed, Escape or P pauses.
- **Gamepad:** stick or d-pad moves the cursor, LB and RB choose a plant, A plants, B cancels,
  X collects all compost, Y switches speed, Start pauses.

24 plants based on real garden plants, 20 critters, 5 mini-bosses and the giant Snack Parade float,
in 50 Adventure levels over five worlds: the Meadow Picnic, the Greenhouse (water channels), the
Pumpkin Patch at dusk (evening flowers), the Desert Garden (hot tiles) and the Cloud Garden (gaps
and updrafts). Plus the endless Garden Party, 20 Challenges (including Pinecone Curling) and a
Daily garden with no streaks. The Seed Book has a real fact for every plant, and some plants help
their real-life companions ("Garden Friends").

Settings: music and sound volumes, auto-collect, double speed, colourblind patterns, less motion,
bigger text, read-aloud tips (local voices only) and Low, Medium or High graphics (Automatic picks
one and adjusts while you play).

Like every game here: no ads, purchases, accounts, chat, timers, tracking or network requests. All
art is built in code and all music and sound are synthesized with the Web Audio API. No effect
flashes more than three times a second, and a limiter keeps the volume gentle.

## Saves

One save, `shooberry.save`, in this browser: settings, stars per level, the Garden Party best,
Daily results, what you've met (for the books) and your last seeds per level. It's versioned with
migrations and stays well under 100 KB. It's written after each level, on settings changes and when
the page is hidden or closed. If storage is blocked, the game still plays and says progress lasts
until it closes. Test shortcuts (`?level`, `?quickstart`) never overwrite a real save.

## Commands

```bash
npm run dev          # http://localhost:5338
npm run typecheck
npm test             # unit tests, plus the bots' balance and pacing runs (reports/)
npm run build        # one self-contained dist/index.html (budget 2.5 MB)
npm run test:e2e     # Playwright on Chromium and WebKit, at phone (landscape), tablet and desktop sizes
npx tsx scripts/balance.ts   # the balance table, quickly
```

The bots (`src/sim/bot.ts`) play every Adventure level, Challenge and sample Dailies: the good bot
wins all 50 levels, and the casual bot (slower, with mistakes) wins every level within two tries.
Reports: [balance](reports/balance.md), [pacing](reports/pacing.md), [framing](reports/framing.md)
and [performance](reports/perf.md).

Capture routes for the website's previews (never saving): `?scene=title`, `wave`, `boss`,
`planting`, `world&w=<meadow|greenhouse|dusk|desert|cloud>` and `stress` (a full board). Test
routes: `?level=<id>[&seeds=a,b]`, `?quickstart`, `?unlockall`, `?quality=low|medium|high` and
`?testmode=1&speed=N[&bot=good|casual]`. The read-only test hook is `window.__shooberry.snapshot()`.

MIT licensed.

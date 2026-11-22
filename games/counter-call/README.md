# Counter Call

A cozy 3D restaurant game for kids. Friends walk up to the counter and call out what they would
like; you cook it, carry it and serve it before their patience runs out. Play as **Minty**,
**Single Scoop**, **Double Scoop**, **Vanilla**, **Raspberry** or **Cookie Cream**.

An AI Kids Games game: it follows the game contract in [docs/CREATE-A-GAME.md](../../docs/CREATE-A-GAME.md)
(one self-contained HTML file, no network, its own storage prefix, everything drawn and played
from code).

## How to play

1. Look at the bubble over a friend to see what they want.
2. Tap a station to start cooking. It dings when the food is ready.
3. Tap the station again to put the food on Minty's tray (it holds three things).
4. Tap the friend to serve them. Faster service earns more hearts and coins.

You can line up four taps in a row. Ring the counter bell to call the next friend in sooner
(they tip extra). Tap food on the tray to put it back. Make at least half of the day's friends
happy to open the next day; make everyone happy for three stars. There are eight days, and new
stations open as you go: juice and fries, then burgers, ice cream and pizza.

More to play with:

- **Six hosts**, each with a perk: Minty walks faster, friends wait longer for Single Scoop,
  Double Scoop carries one more thing, Vanilla cooks faster, Raspberry has one more round of free
  cake, and Cookie Cream's friends tip one more coin.
- **Bonus coins** for bringing a whole order at once and for a run of happy friends in a row.
- **Free cake:** tap the cake stand when friends get restless and everyone waiting is happy to
  wait all over again. One round a day, more with the Bigger cake upgrade.
- **The shop:** spend coins on faster shoes and stoves, comfy mats, a tip jar, more cake and a
  bigger tray.
- **Endless Rush** (opens after day 3): friends keep coming, hungrier and less patient, until
  three of them go home. How many can you make happy?

| | Mouse / touch | Keyboard |
|---|---|---|
| Use a station | tap it or its button | `1` to `5` |
| Serve a friend | tap them or their bubble | `Q` `W` `E` |
| Ring the bell | tap it | `B` |
| Share free cake | tap the cake stand | `C` |
| Put food back | tap it on the tray | `Backspace` |
| Pause | the pause button | `P` or `Escape` |

## The character registry

Every character is one entry in [src/data/characters.ts](src/data/characters.ts): a name, a
favorite food, how patient they are, a voice pitch and a `look` (skin, hair color and style, eye
style, outfit, accessories). The 3D model in [src/render/chibi.ts](src/render/chibi.ts) and the
face in [src/render/faces.ts](src/render/faces.ts) are built from that entry, so adding a friend
is adding one object to the list.

The six hosts (`role: 'host'`, the characters you can play as) come from hand-drawn design
sheets, and each has a `perk`:

- **Minty:** a puffy fringe, two droopy twin tails, a bun with a hair stick, teal arch eyes, a bow
  tie and a buttoned shirt (`twintailBun` hair, `arches` eyes).
- **Single Scoop:** one big scoop of a bun with a ruffled edge, a swept fringe, chunky tails with
  zigzag ties, a frilly bow and a round skirt with a zigzag trim (`scoopBun` hair, `arches` eyes,
  `bubble` outfit).
- **Double Scoop:** two scoop buns with a waffle wafer, big waffle-block twin tails, blue arch
  eyes, a bow tie and a big bow at the back (`doubleScoop` hair).
- **Vanilla:** golden waves that end in a curl, a big bun with a wafer stick in it, a flower clip,
  a flower at the collar, wide bell sleeves and curly ribbons at the hips (`vanillaCurls` hair,
  `bell` outfit).
- **Raspberry:** a bun like a raspberry, a bow bigger than her head, short side locks, a collar
  bow with a red gem and an apron with a pocket (`berryBow` hair, `apron` outfit).
- **Cookie Cream:** two clouds of cream hair dotted with cookie crumbs, a fringe striped with
  cookie, a cookie of a bun with two wafer sticks, and a belted coat with crumb-spotted tails
  (`cookieCream` hair, `coat` outfit).

## Commands

From the repo root (after `npm ci`), add `--workspace games/counter-call` to each, or run them
from this folder:

```bash
npm run dev          # http://127.0.0.1:5342
npm run typecheck
npm test             # unit tests (Vitest): rules, difficulty, storage, registry
npm run build        # dist/index.html, then the contract check
npm run test:e2e     # browser tests (Playwright) on the built file, desktop and phone
npm run preview      # serve the built file, http://127.0.0.1:4342
```

`PW_CHANNEL=chrome npm run test:e2e` runs the browser tests in an installed Google Chrome
instead of Playwright's own browser.

Handy addresses while developing:

- `?scene=title`, `?scene=play` or `?scene=results` (plus `&day=N&seed=N&host=single&endless=1`)
  shows a fixed moment with a helper playing; it never saves.
- `?scene=cast` shows all six hosts waving in a row; `&clean=1` with `?scene=title` hides the menu
  card and centers the host. Both are for artwork.
- `?auto=1` lets the helper play a normal day, also without saving.
- `?guests=N` makes a shorter (or longer) day.
- `?quality=low` draws without shadows at a lower resolution. `E2E_LOW=1` makes the browser tests
  use it, as CI does (it draws WebGL in software).

## Kid-safety rules

No ads, purchases, loot boxes, accounts, chat, tracking or network requests. No personal
information. Original names, characters, art and sound only, all made in code. Nobody gets hurt:
a friend who waits too long just says "Next time!" and heads home. Coins are only earned by
playing and only spent in the in-game shop: nothing costs real money. Progress (stars, coins,
upgrades, the chosen host, sound settings) is kept in this browser under the `countercall.` prefix
and nowhere else.

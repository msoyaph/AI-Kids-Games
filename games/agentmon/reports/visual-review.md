# Visual and IP review (phase 12)

A critical look at everything a player sees, and a lookalike check against well-known creature
franchises, toys and games. Franchise creatures are described, not named (this is a public repo).
Every change is also in CLAUDE.md (IP log or Decisions).

How it was made (2026-10-13):

- `npx tsx scripts/creature-sheet.ts` (all 52 at 32×32, normal and `--shimmer`, plus `--poses --small`
  for the five poses and the 16×16 overworld size),
- `npx tsx scripts/backdrop-sheet.ts` (the 12 battle backdrops),
- one screenshot per map (all 57, a kid's-eye view at 1280×720), every Trial's first, middle and last
  room, every menu page, a battle, both befriend games, evolution and the title, from the built
  `dist/index.html` through the capture routes (`sh scripts/when-quiet.sh shots …`).

## Agentmon (all 52)

The same style throughout: a dark outline, top-left light, round shapes, sparkle eyes and blush, so
the 52 read as one world. Each family keeps a clear silhouette from stage 1 to 3 (a kid can tell
which ones belong together), and the shimmer colours change the palette, never the shape.

Lookalike check, family by family (each one against creature franchises' archetypes and known toys):

| # | Family | Verdict |
|---|---|---|
| 1–3 | Spinnet, Twirlwing, Maplegale (maple seed) | OK (fixed in phase 3: wings to the sides, rotor on top) |
| 4–6 | Druzling, Druzette, Druzarch (geode) | OK (fixed in phase 3: sandy rock, crystals in a tummy window) |
| 7–9 | Buzzbill, Zipbill, Voltabill (platypus) | OK: brown with a yellow zigzag bill, no hat; the teal shimmer has a blue bill |
| 10–12 | Kernip, Poplet, Fluffkorn (popcorn) | OK (Fluffkorn fixed in phase 3) |
| 13–15 | Snipsy, Leafhauler, Canopant (leafcutter ant) | OK: ants are not a franchise archetype here; the leaf umbrella and banner are their own |
| 16–18 | Hummet, Whirrbird, Galehum (hummingbird) | OK: flower hat, long bill, no bee or fairy parts |
| 19–21 | Burrowby, Burrowbat, Bouldwom (wombat) | OK |
| 22–24 | Lullakin, Lullatee, Grandatee (manatee) | OK: no fins-as-arms seal look; sea-grass scarf and coral crown |
| 25–27 | Dewpud, Mossbub, Hardigrade (tardigrade) | OK (moss fixed in phase 3) |
| 28–30 | Fiddlit, Frondle, Fernadore (fern) | OK (Frondle fixed in phase 3) |
| 31–33 | Gleamgrub, Silklight, Starwisp (glowworm) | OK: a soft grub with a lantern tail, hanging silk with glowing beads, a starry body; no candle or chandelier (changed before drawing) |
| 34–36 | Glintle, Prismble, Fluorelle (fluorite) | OK: cubes and an octahedron; nothing like a known gem creature |
| 37–39 | Zestle, Zestwick, Citrivolt (lemon battery) | **Changed** (see below) |
| 40–42 | Hailbit, Hailroll, Hailcastle (hailstone) | OK (cloud fixed in phase 3) |
| 43–45 | Scarfcub, Scarfpaw, Scarfspire (snow leopard) | **Changed** (see below) |
| 46–48 | Bathlet, Steambly, Thermabara (capybara) | OK: towel and a hot spring on its back |
| 49 | Archwyn (sandstone arch) | OK |
| 50 | Tidecrest (moon snail) | OK |
| 51 | Frostmantle (snowshoe hare) | OK (changed from a musk ox before drawing) |
| 52 | Aurelune (aurora kite) | OK (changed from a paper lantern before drawing) |

Changes made in this review:

- **Lemon line.** The first drawings were round yellow bodies with a green sprout on top (too close to
  a famous yellow seed creature), and the copper and zinc "battery" dots sat on the cheeks of a
  yellow electric creature: the one signature a famous yellow electric creature is known for. Now each
  is lemon-shaped with pointed ends and peel pores, with a copper strip and a zinc strip poked into
  the top like a real lemon battery and a tiny zigzag spark between them. A first try joined the
  strips with a wire, which looked like a handbag handle; the strips now stand apart.
- **Snow leopard line.** The blurb and fact say the tail wraps round like a scarf, but the tail was
  drawn in nearly the body's white, so the line read as plain white cats. The tail is now a banded
  grey scarf round the neck and the spots are rosettes (rings), so they read as snow leopards.

## Battle backdrops (11)

Meadow, beach, forest, cave, mountain, desert, snow, sky, Trial, town and indoor: simple layered
skies and ground in the region's colours; the creatures stay the brightest thing on screen. The
snow one is pale but still separates sky from ground. No issues.

## The world (all 57 maps)

- **Towns** (Brightmoor, Saltwhistle, Mossgrove, Cragtop, Dunehollow, Frostfall, Sky Island): each has
  its plaza, lamps, signs and houses in the region's colours (palms in Dunehollow, snowy pines in
  Frostfall, cloud paths and bridges on the Sky Island). Readable at a glance: doors, signs and people
  stand out from the ground. No issues.
- **Routes** (Meadow Path, Sandy Shore, Cliff Road, the woods, Glimmer Cave, the slopes, Canyon Trail,
  Dune Flats, Frost Pass, Updraft Ridge, Starlit Meadow, Deep Blue Cove): tall grass, water, cliffs and
  rocks are clear; wild Agentmon are visible on the map (no hidden encounters). Glimmer Cave is dark
  with a soft circle of light round the player, as designed. The Spotlight Club's lure towers (striped
  poles with a dish) read as machines, not as anything scary.
- **Homes, Rest Stops and shops**: one cosy wooden style, the same in every town on purpose (a kid
  learns to spot the Rest Stop's heart nest and the shop counter anywhere).
- **Trial halls and tops: changed.** All twelve used the same wooden room with bookshelves, which
  didn't fit a hollow tree, a mine or an ice summit. Each Trial now has its own walls and floor,
  matching its puzzle rooms: white and sea-blue tiles with a striped wall (Lighthouse), tree-ring
  floor and bark walls with moss (Canopy's hollow tree), grey stone with timber beams (Old Mine),
  sandstone tiles and layered red rock (Redrock), ice tiles and ice bricks (Summit), lavender tiles
  under a starry wall (Beacon Spire). Map themes 8–13; `tests/unit/ground.test.ts` checks every
  terrain in every theme paints a real colour (it caught a wavy-wall bug while this was made).

## Trials (puzzle rooms)

The first, middle and last room of each of the 9 Trials (6 big, 3 small). Every room has its title
and number, Reset, Hint and Leave at the top; blocks, plates, gates, mirrors, beams, carts, ice and
vines are distinct shapes as well as colours (each colour's switches and gates also carry its own
shape: circle, triangle or square, so they work without telling colours apart). No issues.

## Menus and screens

- **Pause menu** (Team, Bag, Field Guide, Map, Quests, Agent Base, Settings, Save): big buttons with
  icons and words, the coin count, "Back to playing" in the accent colour. No issues.
- **Field Guide**: grid of all 52 with numbers and names; ones you haven't met are silhouettes; an
  entry shows the element, stage, stars, the blurb, the real fact (boxed), how it grows, where it
  lives and the research tip. No issues.
- **Map, Quests, Bag, Agent Base, Settings, Team**: plain cards, clear headings, short lines. No issues.
- **Battle**: cards with element icon, level and energy bar above each Agentmon, the message bar at
  the bottom, big crisp sprites on the region backdrop. No issues.
- **Spark Ring**: ring, heart, glowing arc and "Spark 2 of 3"; the friend floats above. No issues.
- **Mood Match**: the mood emoji, one plain sentence and four big choices. The capture left the
  battle's message bar empty under it; the capture now says a line first, as the game does.
- **Evolution**: sparkles and a soft glow (no flashing), then "… grew into …!". No issues.
- **Title: changed.** The Play button sat on top of the parade of Agentmon walking across the grass,
  which looked cluttered. The title block now sits in the sky above the parade, with a bigger
  outlined logo, on computers and phones alike.

## Summary of changes

| What | Why | Where it's logged |
|---|---|---|
| Lemon line redrawn as lemon batteries | lookalike risk (sprout; cheek dots on a yellow electric creature) | CLAUDE.md IP log |
| Snow leopard line: scarf tail and rosettes | art didn't match the blurb or the fact | CLAUDE.md Decisions |
| Six Trial interior styles (themes 8–13) | every Trial hall looked like a house | CLAUDE.md Decisions |
| Title block above the parade, bigger logo | Play button overlapped the creatures | CLAUDE.md Decisions |
| Mood Match capture says a line | empty message bar in the capture | CLAUDE.md Decisions |

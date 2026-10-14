# Agentmon 1.1 plan (approved by the owner, 2026-10-13)

The owner approved this plan as presented (the plan page with the polish list, the design direction,
the before/after mockups and the new creature sheet). Status and decisions: ../CLAUDE.md, "1.1".

## Goals
1. **Design polish** across the whole game, keeping the quality rules: flash safety (`src/render/fx.ts`
   and its test), reduced motion, colourblind mode, 48 px touch targets, the glass joystick, 60 fps on
   mid-range phones, a single file under 2.5 MB.
2. **25 new Agentmon** (8 families of three, numbers 53–76, plus the guardian Verdanyan, 77), all
   original, each from a real animal, plant or mineral with a fact in facts.ts.
3. **Pet care at the Agent Base**: pet, feed, play, dress. No guilt mechanics, nothing to buy.

## The 10 polish items (from the 1.0 review)
1. Menus look like plain forms → one component system ("stickers"), redesigned Team, Bag, Field Guide.
2. Flat, small battle stage → backgrounds per area and time of day, bigger cards, turn banner.
3. Agentmon barely move → breathing and blinking idle, happy, bump and tuckered-out poses; 64 px
   battle sprites (faces and outline scale with the body).
4. Move effects all alike → a distinct shape per element (flame, droplet, leaf, pebble, swirl,
   snowflake, zigzag, four-point star), colourblind-friendly.
5. Still overworld → ambient life (butterflies, falling leaves, fireflies at dusk), animated water and
   foliage, a gentle day-to-evening tint, smoother area transitions, more decoration variety.
6. Every interior is the same room → a look per kind of building (home, shop, Rest Stop, Academy).
7. Dialogue has no speaker → portraits with expressions and a styled name tag.
8. Field Guide grid of grey cells → element-framed cards, element filters, habitats, a big entry page.
9. Flat title → morning sky, hills, the logo, the parade on a path.
10. One UI sound → open, confirm, back, page and error sounds; befriend games without the grey dim.

## Design direction
- Palette: plum ink #2a1f3d is the only outline and text colour; paper #fff8ec and #fbecd2; gold
  #ffcf5c primary; heart pink #ff8fb0; each element one colour plus one shape everywhere; four
  time-of-day grades (morning, day, evening, night).
- Components: 3 px plum outline, 16 px radius, top highlight, 4 px plum drop shadow that a pressed
  button sinks into. Button, chip, card, panel with a title tab, energy bar with a number (warm under
  40% with a "Tired" label), glass HUD, toast, dialogue box with portrait.
- Type: Nunito (SIL OFL), 3 weights, Latin subset, bundled (~70 KB); tabular figures for numbers.
- Motion: idle breathing, entrance hops, element-shaped effects, spring panels, iris transitions; all
  off with reduced motion; every repeating brightness effect in fx.ts under 3 a second.

## New Agentmon (numbers are save ids: never renumber)
| # | Family (element, inspiration) | Names | Habitats |
|---|---|---|---|
| 53–55 | Flare, bombardier beetle | Puffbit, Puffbeetle, Geyserguard | Cliff Road; Canyon Trail |
| 56–58 | Tide, mangrove | Stiltsprout, Wadewood, Mangromere | Sandy Shore; Deep Blue Cove |
| 59–61 | Leaf, stick and leaf insects | Sprigling, Twigstride, Leafwarden | Whisper Woods; Updraft Ridge |
| 62–64 | Stone, lithops | Lithlet, Lithopsy, Stonebloom | Dune Flats; Frostfall Slopes |
| 65–67 | Gust, flying fish | Glidelet, Skimfin, Galefin | Sandy Shore; Deep Blue Cove |
| 68–70 | Frost, springtail | Snowskip, Springfrost, Bounceberg | Mossgrove Woods (first Frost before ch 6); Frost Pass |
| 71–73 | Volt, elephantnose fish | Chinspark, Zapsnoot, Voltrunk | Glimmer Cave; Frost Pass |
| 74–76 | Glow, pyrosome | Glimmerpod, Lumitube, Pyrolanterne | Saltwhistle tide pools; Deep Blue Cove |
| 77 | Leaf guardian, banyan tree | Verdanyan | Banyan Hollow, after its three quests |

New post-game area **Banyan Hollow** (from Starlit Meadow through a root tunnel): rope bridges, lantern
seeds, a pond, a Rest Stop in a hollow trunk. Quests: Lantern Seeds, The Root Relay (no timer), Tea in
the Grove. Every new Agentmon can be befriended without luck (guaranteed visible spawns; the guardian
through its quest).

## Pet care
Pet, Feed (snacks from the bag), Play (Bubble Catch: can't be lost), Dress (hats, bows, scarves).
Reactions from each Agentmon's poses and cry. Hearts 0–5 only ever go up and only unlock a "Best
buddy" ribbon; nothing decays, nothing is sad or hungry, no battle bonus. 12 accessories, all earned.

## Balance, Field Guide, saves
About a dozen new moves (a signature per family plus shared ones); every element 48–52%, nobody
dominant; level curves need no grinding on Easy and Normal; the bot on every difficulty. Field Guide
of 77 with filters; the 52-reward stays, a new 77 reward (Golden Guide badge and rainbow scarf).
Save version 2 (hearts, accessories, what each friend wears); every 1.0 save keeps working; a maximal
slot stays far under 300 KB. Build target under 1.6 MB.

## Phases
1. Foundations: components, font, tokens, UI sounds; painter (64 px battle sprites, poses).
2. New Agentmon: recipes, data, moves, facts, habitats; balance; IP log.
3. Battles: backgrounds, entrances, element effects, bars, turn feedback.
4. Overworld: decoration, ambient life, water and foliage, tint, transitions, interiors.
5. Menus: Team, Bag, Field Guide; dialogue portraits.
6. Banyan Hollow, quests, Verdanyan.
7. Pet care and accessories.
8. Saves and tests; visual review (before/after, the 77 sheet, lookalikes).
9. Release prep: 1.1.0, import, audit, previews and art, PR with CI green and the preview link; stop.

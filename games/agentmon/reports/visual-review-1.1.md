# Agentmon 1.1 visual review (2026-10-13)

Every screen type was captured before (1.0) and after (1.1) on a phone (390 × 844) and a computer
(1280 × 720), and the creature art was reviewed on sheets. The review tools are committed:

| Tool | What it draws |
|---|---|
| `scripts/creature-sheet.ts` | all 77 Agentmon at 32 px (`--poses`, `--shimmer`, `--small`) |
| `scripts/size-compare.ts` | 32 px at 2× beside the 64 px battle sprite in every pose |
| `scripts/backdrop-sheet.ts` | every battle backdrop at every time of day |
| `scripts/accessory-sheet.ts` | every accessory on twelve different body shapes |
| `scripts/portrait-sheet.ts` | every named character's portrait in every expression |
| `scripts/shots.mjs` | capture routes (`&bg=`, `&tod=`, `&map=`) |
| `scripts/menu-shots.mjs` | a click-through of the dialogue box, Team, friend page, Care, Dress up, Bubble Catch, Bag and Field Guide |

## Screens

| Screen | 1.0 | 1.1 |
|---|---|---|
| Title | flat sky and grass, Agentmon drifting about | morning meadow backdrop, a parade of 16 Agentmon walking a path |
| Overworld | still | swaying grass, water glints, butterflies, leaves, fireflies, snow; evening and night tint; glowing lamps; baked flowers, mushrooms, shells |
| Rooms | one wallpaper and floor for every building | Rest Stops, shops and the Academy each have their own |
| Map changes | a plain fade | an iris on the player |
| Battle | one flat backdrop per place; 32 px sprites; on phones the two overlapped | 4 times of day per place; 64 px sprites that fit the stage; staggered on phones; shadows; entrances; element-shaped effects; the acting card lifts |
| Befriending | the scene greyed out | a light wash; Mood Match sits low so the Agentmon stays in view |
| Dialogue | a name tag | a portrait with a face that fits the line |
| Team / friend page / Bag | plain lists | element edges, chips, energy and experience bars, move cards, tabs |
| Field Guide | grey grid, small entry | element-framed cards, filters, badges, big entry page with the growth chain and habitats |
| Agent Base | Pet and Snack buttons | a Care page (pet, snacks, Bubble Catch, dressing up) |

## Findings and fixes

- 1.0's two battle sprites overlapped on phones held upright: sprites now fit the stage at a
  whole-number scale, and tall stages stand the two staggered. The other side's card first sat
  beside it and covered the face it turns toward you; it now sits above its head.
- 64 px sprites first had a 1 px outline (half of 32 px's), cut outlines where drawings reach past
  the 32×32 space, and thin dots and lines: the outline, rims, dots and lines are now a design pixel,
  and a 10 px margin shows every drawing whole.
- Verdanyan's canopy and Pyrolanterne's open end were cut flat at 32 px: both now fit.
- The first accessories sat on whatever was highest (Spinnet's wing, Hailcastle's cloud,
  Glimmerpod's bubbles): they now find the head from where the painter drew the face.
- Capes hid behind the body and looked like a mat: they now fan out wider than the body.
- A chosen accessory, filter or Bag tab lost its gold highlight while hovered: fixed.

## The 25 new designs (lookalike pass)

| # | Agentmon | Check |
|---|---|---|
| 53–55 | Puffbit, Puffbeetle, Geyserguard | an orange-headed beetle with a blue shell and steam puffs; the first draft (a teakettle) was dropped before review (see the IP log). Not a ladybug pattern. |
| 56–58 | Stiltsprout, Wadewood, Mangromere | a seedling, then a tree on stilt roots in water; no face on a trunk-pretending body |
| 59–61 | Sprigling, Twigstride, Leafwarden | a stick insect with sprouts, then a leaf insect |
| 62–64 | Lithlet, Lithopsy, Stonebloom | two-lobed living stones with a flower; the desert-rose drafts were dropped (IP log) |
| 65–67 | Glidelet, Skimfin, Galefin | a blue flying fish with wing fins and a spray trail |
| 68–70 | Snowskip, Springfrost, Bounceberg | a round grey-blue springtail with antennae and ice on its back |
| 71–73 | Chinspark, Zapsnoot, Voltrunk | a purple elephantnose fish with a long chin-trunk and yellow zigzags |
| 74–76 | Glimmerpod, Lumitube, Pyrolanterne | lilac tube colonies with a cyan glow (the green version read as a pickle; IP log) |
| 77 | Verdanyan | a banyan tree with a face and many trunks, lanterns in the canopy |

None of the 77 needed a change for resemblance in this pass. Names were web-checked when they were
drafted; the IP log in `../CLAUDE.md` lists the 12 dropped names and 3 redrawn designs.

## Known issues (small, left as they are)

- Rooms draw the skirting board at the bottom of both wall rows (1.0 did the same).
- Accessories show at 32 and 64 px (menus, spars), not on the 16 px overworld sprites.
- On a phone held upright at 1× (390 px CSS wide) the title's parade is small; at a phone's real 2×
  it draws at twice the size.

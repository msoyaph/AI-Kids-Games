# Vanex Defense — style guide ("Crystal-Tech Fantasy")

Audience: ages 10–14. Grown-up, readable, strategic. Kid-safe: no gore, no horror, no faces with scared or
hurt expressions. Defeated constructs shatter into crystal shards and dissolve into energy.

Screenshots of the one-map slice (Breach Point, `w1m1`) live in `docs/screenshots/slice/`; the old look is in
`docs/screenshots/before/` for comparison.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Abyss | `#0B1020` | page / canvas background |
| Panel | `#141B2E` (translucent) | HUD panels, sheets, modals |
| Hairline | `#2A3A5C` | 1 px panel borders, table rules |
| Vanex cyan | `#3EE6FF` | primary actions, focus glow, friendly energy |
| Gold | `#FFC845` | currency, level notches, rewards |
| Danger | `#FF4D6A` | lives lost, sell, warnings, boss lenses |
| Success | `#3DFFA0` | positive deltas (upgrade previews) |
| Ink | `#070B16` | 2 px outlines on all sprites |
| Steel | `#1C2436` → `#7F90B3` | tower plinths, construct chassis |

Element energies keep their colour **and** a unique shape (colour-blind safe):

| Element | Colour | Shape |
| --- | --- | --- |
| Fire | `#FF6A2B` | flame |
| Water | `#2FA8FF` | drop |
| Nature | `#39E07A` | leaf |
| Light | `#FFD84A` | star |
| Shadow | `#A06BFF` | crescent |
| Earth | `#D9A066` | hexagon |

Terrain is darker and desaturated (slate roads, engraved build plates, crystal sprouts) so towers and
constructs pop on small screens.

## Art rules

- Sharp, angular silhouettes; 2 px ink outline; top-left rim light and one glint.
- **Towers:** octagonal metal plinth + element rune ring (dual ring for combos). Level 1 steel → L2 rivets and
  reinforced trim → L3 gold trim + crystal core (specialization silhouette goes here) → L4 radiant halo with
  orbiting crystals. Level notches (diamonds) under every tower.
- **Constructs (enemies):** crystal beetles, skitter drones, stone golems, shadow wisps (abstract energy),
  mender constructs, geode brutes, warded sentinels. Sensor-lens "eyes" only — no faces. Element chip on the
  body (colour + shape). Bosses are big constructs: Prism Matriarch, Iron Titan, Tempest Engine and
  Archon Null (a levitating obsidian monolith whose element core sits in its chest).
- **Effects:** energy bolts, hex vapour fields, rune rings for pulses and splashes. Defeat = shard burst +
  dissolve ring + hex coin. Text pops are short labels: `CRIT 465`, `SHATTER ×4`, `WARD`, `LEVEL 3`.
- Flash safety: no full-screen flashes; glows are small and short (formal ≤3 flashes/s limiter in Phase 12).

## Typography (system fonts only)

- Headings / labels / numbers: `"Avenir Next Condensed", "Bahnschrift", "DIN Alternate", "Roboto Condensed",
  "Arial Narrow", system-ui` — uppercase, tracked, weight 700–800.
- Body: `system-ui, "Segoe UI", Roboto, "Noto Sans", sans-serif`.
- Stats use tabular numerals.

## UI

- Dark translucent panels with chamfered corners (`clip-path`), 1 px hairline border, cyan focus glow.
- Rectangular buttons, min 48 px tall (44 px in compact landscape); primary = cyan, reward = gold,
  destructive = red, secondary = ghost.
- HUD shows real numbers: labelled Lives / Gold / Wave, DPS on every build card, tower sheet with a
  **Stat | Now | Next level** table (green = better, red = worse), targeting, sell value, damage dealt.
- Short landscape phones: tower sheet docks to the side away from the selected tower so it stays visible.

## Tone and cast

- Middle-school reading level, short sentences, confident and a little dry.
- You are the **Commander** of the Vanex Defense Grid.
- **PIP** (Prismatic Intelligence Protocol): your tactical AI drone. Helpful, dry wit
  ("I logged that as a 'flawless-ish' defense.").
- **Dax Okoro**, Chief Engineer: research and gadgets (from Phase 7).
- **The Shardbound**: constructs animated by a rogue rift engine, led by **Archon Null**, an ancient
  construct intelligence. Imposing, never horror.
- Worlds: Verdant Reach → Ember Wastes → Frostspire Peaks → Hollow Deep → Skyforge Ruins → Rift Citadel.

## Audio direction (Phase 10)

Hybrid epic: taiko/tom drums, saw string pads, brass stabs, pulse arps; minor/dorian; 118–140 bpm;
per-world variations, boss themes, adaptive intensity layers, master limiter.

# Track authoring guide

Tracks are pure data (`TrackData` in `src/data/types.ts`). The engine bakes them into a drivable model
(`src/sim/track/trackModel.ts`) and a procedural mesh (`src/render/trackMesh.ts`). Adding a track = adding a data file.

## Files
- `src/data/tracks/<cup>/<trackName>.ts` — one track per file, exporting a `TrackData` constant.
- `src/data/tracks/<cup>/index.ts` — lists the cup's 4 tracks in race order.
- `src/data/props/<cup>.ts` — scenery and hazard model recipes for that cup's themes (names must be globally unique).
- `src/data/cups.ts` — cup definitions (which 4 track ids).

## Layout DSL (`src/data/tracks/builder.ts`)
Describe the loop like a toy train set. Heading 0 drives toward +Z; `right()` turns clockwise seen from above.
Total turning should be ±360° (the builder spreads any leftover position error so the loop closes).

```ts
const L = layout({ x: 0, z: 0, heading: 0, y: 0 }, [
  straight(160, { mark: 'start' }),           // marks record the control-point u at the END of a segment
  right(90, 40, { y: 4 }),                     // y = elevation at the end of the segment (linear)
  straight(60, { markStart: 'bridge', w: 12 }),// w = road width at the end of the segment
  left(120, 28, { bank: 6 }),                  // manual bank (degrees, + lifts the left edge)
  ...
]);
L.points   // TrackPoint[] for TrackData.points
L.marks.x  // u position of mark x (use for features)
L.pos.x    // world {x,y,z,heading} at mark x
offset(L.pos.x, fwd, right, y?) // a point relative to a mark — handy for shortcut control points
```

Positions of features are in control-point units `u` (3.5 = halfway between points 3 and 4). Use marks.

## Physics cheat-sheet (Pro class)
- Top speed ≈ 26 m/s (Rookie 21, Champion 30). Good laps are ~900–1400 m → 35–50 s.
- Normal steering turns ~2.2 rad/s → minimum comfortable radius ≈ 12 m at full speed; tight hairpins (R < 15) slow the AI.
- Drifting covers radii ~10–40 m. Corners of R 18–45 m over 60–180° are the most fun to drift.
- Trick ramp (`kind: 'trick'`): launches with vy ≈ 8.5 → ~0.5 s airtime, ~13 m of flight. Gaps after trick ramps must be < 10 m.
- Glider ramp (`kind: 'glider'`) + `gaps`: the glider deploys automatically. It rises ~3.5 m in the first second, then sinks ≤ 4.5 m/s.
  A level gap of up to ~60 m is safe; land lower for longer flights. Put the ramp lip right before the gap.
- `gravity: 0.5` on a track (moon) makes every jump ~2× longer. `zones: [{kind:'lowgrav'}]` does it locally; `'water'` adds drag + bubbles + blue fog.
- Slopes over ~35% feel like walls; keep elevation changes gradual (the validator warns > 42%).

## Edges, shoulders and supports
- `edge` (default for both sides) and `edges` spans: `wall` (barrier), `drop` (fall off → drone respawn), `open` (low fence; the
  boundary is invisible unless a shortcut ribbon continues there).
- `shoulder` = off-road strip width beyond the road (slows karts). Drop edges get a narrow kerb instead.
- Keep drop edges mostly on straights or gentle bends — the AI should rarely fall (validator warns at > 8 falls per race).
- `supports`: `pillars` (bridges), `blocks` (buildings under rooftop roads), `rock` (floating islands) are drawn under elevated road.

## Shortcuts (every track needs at least one risky shortcut)
A shortcut is an open spline (`points`) with its own width/edge/surface, joining the main road at `joinFrom`/`joinTo` (u).
- Start and end points must lie on the main road (use `offset(L.pos.mark, 0, lateral)`), heights must match (±1.5 m).
- Keep entry/exit angles shallow (< ~35°): karts can't turn 90° at speed and the AI uses pure pursuit.
- Risk ideas: off-road surface (needs a Turbo Can), narrow drop-edged planks, a gap with a ramp, hazards on the line.
- Aim for 10–35 % shorter than the road it skips. `aiUse` (0..1) tunes how often AI takes it.
- Keep a shortcut's ramps and gaps clear of the main road's shoulder (start them a few metres out), otherwise the
  main road's railing can catch karts flying over them.
- Water/low-gravity `zones` also apply to shortcuts that skip that stretch; set `shortcuts: false` on a zone for a
  dry bridge over a river.
- `layout()` mark headings come from the last short segment of a curve, so a mark at the end of a curve can point
  10–15° off the true tangent — allow for that when placing props with `offset()`.

## Items, boosts, hazards
- `itemRows` (3–4 per track): rows of item pods across the road.
- `boostPads`: `{ at, offset (-1..1), width? }`.
- `hazards`: `roller` (side-to-side ball), `crab` (side-stepping critter), `bumper` (pinball pop), `geyser` (periodic launch),
  `swinger` (pendulum across the road). `model` names a prop recipe; `amp` (fraction of half-width), `period`, `phase`.

## Look
- `palette` (road, kerbs, off-road, walls, sides), `sky` (gradient, fog, ground plane colour/height or `null` for none,
  `backdrop`: mountains | skyline | clouds | dunes | stars, `night`).
- `scatter`: random props along both sides (density per 100 m, distance range from the boundary). On tracks with no
  ground plane, add `float: [min, max]` to scatter floating props (clouds, balloons, islands) around road height.
- `props`: hand-placed landmarks (`y` defaults to the ground height).
- Recipes are `ModelPart[]` (box/sphere/ico/cyl/cone/torus/capsule/wedge with position/scale/rotation/colour). Unit sizes: box 1×1×1,
  sphere/ico radius 0.5, cyl/cone radius 0.5 × height 1, torus outer diameter 1, wedge 1×1×1 rising toward −Z.

## Validate
```bash
npx tsx scripts/validateTracks.ts 'my-track-*'   # geometry checks + 8 AI racing normal and mirrored
node scripts/svg2png.mjs sim-report/tracks/my-track.svg   # top-down map (x is flipped so it reads like a map)
```
The validator fails on self-overlapping road, shortcuts that don't join the road, or AI that can't finish.
Then drive it: `npm run dev` → `http://localhost:5173/?track=<id>` (add `&autodrive` to watch the AI, `&mirror` for mirror mode).

# Ai Kids Games sizzle reel: storyboard and music plan (step 1)

A 60-second reel for the website, the README and social media. Kids should think "I want to play
that"; parents should think "finally, games I can trust". Built as code with **HyperFrames 0.8.133**
(Apache-2.0, already cached on this machine, telemetry off) instead of Remotion, as the owner asked.
For the record: Remotion's free license also fits (individuals, companies of up to 3 people,
non-profits); larger companies need its paid Company License.

The sheets in `storyboard/` show one still per shot. Gameplay stills are real screenshots of the
current builds (taken earlier by each game's project); title cards are brand mock-ups. Final shots
are recaptured at 1920×1080, 60 fps on the real GPU in step 2.

## Timing grid

Music at **124 BPM**: a beat is 0.484 s, a bar 1.935 s, and **31 bars = 60.0 s**. Every cut lands on
a bar or a beat; the edit and the music read the same timing constants, so they can't drift apart.

Readability rule for a 7-year-old: a line stays on screen at least `words ÷ 1.8 + 0.5` seconds
(4 words → 2.7 s). Headlines are at least 64 px tall at 1080p; secondary lines at least 40 px.

## Shot list (16:9)

| # | Time (s) | Bars | Shot (all real gameplay unless marked) | On screen |
|---|---|---|---|---|
| 1 | 0.0–2.9 | 1–2 | Calex Cart: drift with sparks through Lantern Village at night (Frost Cup), HUD-free | — |
| 2 | 2.9–3.9 | 2 | Logo sting (mark pops, wordmark wipes in) | Ai Kids Games |
| 3 | 3.9–6.8 | 3–4 | Slow, softly blurred montage (Light Crossing island, Space Sky planet) under type | **The games kids love.** |
| 4 | 6.8–9.7 | 4–5 | Same montage continues | **None of the stuff parents don't.** (line 1 stays) |
| 5–7 | 9.7–15.5 | 6–8 | **Calex Cart:** Avalanche Peak drift · Neon Nightway boost · a race with the position HUD | Logo, "Drift, boost and chase the finish.", Ages 10–14 |
| 8–10 | 15.5–21.3 | 9–11 | **TheaBonk:** the horde rushes in · level-up choice (HUD) · Grumblecap, the mushroom boss | Logo, "Small hero. Mighty big bonks.", Ages 8+ |
| 11–13 | 21.3–27.1 | 12–14 | **Vanex Defense:** a maze of towers in Frostspire Peaks · towers along a Skyforge sky lane · the Prism Matriarch boss | Logo, "Build the maze. Hold the line.", Ages 10–14 |
| 14–16 | 27.1–32.9 | 15–17 | **Space Sky:** 3D flight past a ringed planet · landing on the Moon's glowing pad · exploring Europa | Logo, "Your rocket. A universe of wonder.", Ages 6–10 |
| 17–19 | 32.9–38.7 | 18–20 | **Light Crossing:** Lantern Skate festival · the island in autumn · a decorated home | Logo, "Make a little island shine.", Ages 6+ |
| 20–22 | 38.7–44.5 | 21–23 | **Cliff Valley:** harvest on Clover Farm · Starlight Night festival · the crystal mine | Logo, "Grow a farm, make friends, fix the valley.", Ages 8–14 |
| 23 | 44.5–48.4 | 24–25 | Brand card; each phrase lands on a beat and stays, so all four are readable together | No ads. · No subscriptions. · No sign-ups. · No tracking. |
| 24 | 48.4–52.3 | 26–27 | Code-drawn generic phone (Calex Cart race with the glass controls being used) and tablet (Light Crossing played by touch) | Phones, tablets and computers |
| 25 | 52.3–56.1 | 28–29 | Brand card | **Free and open source.** then **Build your own.**; small: github.com/msoyaph/AI-Kids-Games · List your game: coming soon |
| 26 | 56.1–60.0 | 30–31 | End card | Logo · The games kids love. · **aikids.games** · Play free |

Showcase order follows the brief's energy curve: racing, action, strategy, space wonder, cozy
island, farming. Each game block is 3 bars (5.8 s): shots of 1.9 s each, with the game's logo,
pitch and age badge from beat 2 to the last beat (4.8 s on screen). The pitches and ages come from
each game's `game.json`. Only current game names appear; no other companies' titles, logos or
characters; no real people, no stock footage. TheaBonk is shown as its live v1 build; if v2 lands,
its shots are recaptured with one command.

**Style:** the site's palette (Paper #F5F6F8, Ink #16191F, Go #0B7A50 / #3CCB86), self-hosted
Nunito, the site's logo mark, rounded 16 px corners. **One signature transition:** the next shot
opens inside a rounded card that grows from the bottom-left to full frame over 6 frames (no white
flash, no zooms through black). Titles slide up 24 px and fade in over 8 frames.

## Music plan

An original track, composed and rendered in code (no samples, no licensed music, no services):
**124 BPM, F major**, bright and bouncy, kid-friendly. Rendered offline by a deterministic
TypeScript synthesizer to 48 kHz stereo WAV: soft sine kick, clap on 2 and 4, shaker 16ths, a
round low-passed bass, a plucky marimba-like lead, a warm pad, a glockenspiel for sparkles, and
gentle filtered-noise swishes.

| Bars | Section | Music |
|---|---|---|
| 1–2 | Cold open | Full groove from the first frame; a glockenspiel sparkle and a short pause on the logo sting |
| 3–5 | Tagline | Breakdown: pad chords (F–C–Dm–B♭), soft pluck melody, kick on 1 and 3; a filter sweep builds into bar 6 |
| 6–23 | Showcase | Main hook over I–V–vi–IV, one phrase per game; a light swish at each game change; a colour per game (saw stab for racing, punchier drums for action, arpeggio for strategy, glockenspiel shimmer for space, ukulele-like pluck for the island, whistle lead for the farm) |
| 24–27 | Promise and devices | Half-time; a clap and a bass note under each phrase |
| 28–29 | Open source | Riser back into the hook |
| 30–31 | End card | Final hook, ending on F with a sparkle and a short ring-out |

**Real game sound effects** under key moments (about 8 in total, mixed well under the music): the
games make their sounds with Web Audio, so the capture taps each game's own audio output while
recording (Calex boost, TheaBonk bonk and level-up chime, Vanex tower zap, Space Sky landing chime,
Light Crossing festival lanterns, Cliff Valley harvest pop).

**Mastering:** gentle bus compression and a limiter in the synthesizer, then a two-pass loudness
normalization of the final mix to **−14 LUFS integrated, true peak ≤ −1 dBTP** (ffmpeg's loudnorm,
from `ffmpeg-static`). A `beats.json` lists every bar start; the review checks each cut against it.

## How it will be built (after approval)

- `marketing/sizzle/` (npm workspace): `reel.config.ts` (timing grid, sections), a `reel` entry per
  game listing its shots (capture take, in/out points, vertical focus), the synthesizer, the
  HyperFrames compositions generated from the data (16:9, 9:16, two 15 s cutdowns), and scripts.
- **Capture (step 2):** the site's capture tooling (`apps/site/scripts/capture/`), extended with
  reel takes per game and an audio tap; routes updated for the upgraded builds (Vanex 2.0, Space
  Sky 3D, Calex 0.2, Light Crossing 2.0) and a new one for Cliff Valley. Phone and tablet shots are
  recorded at true device sizes with real touches on the glass controls.
  `npm run capture -- <slug> (in marketing/sizzle)` recaptures one game; nothing is captured while tests run.
- **Render:** `npm run reel` renders the master, the vertical cut, the cutdowns, the web encodes,
  the poster and the thumbnail, then runs the checks.
- **Vertical:** each shot carries a focus point and, for wide scenes, a stacked layout (the shot on
  top, the title band below), so nothing is just centre-cropped.
- **Checks (step 5):** contact sheets every 0.5 s; a frame-by-frame luminance flash audit (no more
  than 3 flashes in any one-second window); readability at phone size; loudness and true peak;
  cuts against `beats.json`.
- **Website and GitHub (step 6):** a "Watch the trailer" button with an accessible player
  (play on click, sound off until turned on, captions, keyboard, Escape closes), the reel on About,
  self-hosted files under 8 MB that load only on play; a GitHub Release "Sizzle reel v1" with the
  master and vertical files; the thumbnail in the README linked to the release.

## Decision needed

**The end card says aikids.games, but that domain isn't registered yet** (the registry has no
record of it). The reel can show it as planned if you register it before publishing; otherwise the
end card can show the current address, ai-kids-games-fawn.vercel.app, until it is.

## Changes made during production

- **Tablet shot:** Cliff Valley played by touch (harvesting with the Interact button), not Light
  Crossing. Recording the whole browser tab, which is needed to include the on-screen touch
  controls, was too costly on Light Crossing's page: it couldn't hold a smooth frame rate.
- **Light Crossing:** the decorated home is Tansy's house (a villager's home the game decorates).
  The island in autumn and the Lantern Skate are live play with the closest camera a player can
  pick. The Harvest Feast is a blurred background under the tagline.
- **Vanex Defense:** the Prism Matriarch arrives at wave 10 on Sky Lane (Skyforge Ruins), where
  the road runs through the middle of the frame. The towers stay in Frostspire Peaks for the maze
  shot.
- **Cliff Valley:** Starlight Night is a walk through the decorated, snowy square. The festival's
  sky lanterns need a present to give, and the scene's fresh farmer has none.
- **Game sounds:** Space Sky's sound is the rocket's boost (the Moon landing chime falls outside
  the shot). There are 9 game sounds in all, each about 10 LU under the music.
- **Quality settings:** Vanex Defense and Space Sky are recorded at their "medium" tier, and the
  Cliff Valley tablet at its normal size. At "high", busy scenes dropped below 60 fps on the
  capture Mac.

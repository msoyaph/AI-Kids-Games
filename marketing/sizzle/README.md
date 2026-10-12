# Ai Kids Games sizzle reel

A 60-second trailer, plus 15-second cutdowns, made entirely from code:

- real gameplay recorded from the built games;
- an original soundtrack composed and rendered in TypeScript;
- [HyperFrames](https://hyperframes.heygen.com) 0.8.133 compositions generated from data.

There is no stock footage, no real people and no licensed music. The plan and the shot list are
in [STORYBOARD.md](STORYBOARD.md).

## Rebuild it

```bash
npm run reel:capture -- calex-cart   # record one game's takes (repeat per game)
npm run reel                         # music, compositions, renders, encodes, review, publish
```

Run both from the repo root. Never capture or render while tests are running: capture needs the
whole GPU, and the capture script refuses to start if tests are running.

Each step can also run on its own, from `marketing/sizzle`:

| Command | What it does |
|---|---|
| `npm run capture -- <slug> [--only=<take>]` | Records takes from `apps/site/public/games/<slug>/index.html` in headed Chromium on the real GPU (Metal), at 1920×1080 and 60 fps, with the game's own sound. Raw takes go to `captures/` (git-ignored). |
| `npm run music` | Renders the soundtrack of every cut to `build/music/` and writes the bar and beat grid to `beats.json`. |
| `npm run compose` | Trims each shot to 60 fps, mixes the game sounds under the music (−14 LUFS, true peak ≤ −1 dBTP) and writes one HyperFrames project per cut and format to `build/<cut>-<16x9\|9x16>/`. |
| `npm run render [-- <cut>-<format>]` | Renders with HyperFrames, then writes the deliverables to `out/`. |
| `npm run review` | Builds contact sheets every 0.5 s, then checks flashes, readability, loudness, true peak and cuts against the beat grid. Writes `out/review/report.md`. |
| `npm run publish` | Copies the web trailer into the site (`apps/site/public/trailer/`, `apps/site/src/data/trailer.json`) and the README thumbnail into `docs/media/`. |

## How it is put together

- **`reel.config.ts`** is the single source of truth: the 124 BPM timing grid, every cut, shot and line of text. Game titles, pitches, ages and logos come from each game's `game.json` and the site's media. A line of text stays on screen for at least words ÷ 1.8 + 0.5 seconds, and `checkCut()` enforces it.
- **`capture/games/<slug>.ts`** has one route per game. Each route drives the real build through its production hooks and controls, the same way the game's own tests do. Phone and tablet shots use true device sizes and real touches (CDP) on the glass controls.
- **`music/`** is a deterministic synthesizer (`synth.ts`) plus a score (`score.ts`) that is composed from the cut's own blocks. That is why every section change lands on a cut.
- **`compose/build.ts`** generates the HyperFrames HTML: the card-grow transition, the titles, the game cards and the code-drawn generic devices. The 9:16 version is reframed on each shot's focus point (a sharp square over a blurred copy), not centre-cropped.
- **`render/`** handles the HyperFrames render, the masters, the web encodes (H.264 and AV1, each under 8 MB), the poster, the thumbnail and the captions (`.vtt`, describing the music and game sounds).

## Deliverables (`out/`)

| File | Use |
|---|---|
| `ai-kids-games-reel-16x9.mp4` | Master, 1920×1080, 60 fps, H.264 + AAC |
| `ai-kids-games-reel-9x16.mp4` | Vertical, 1080×1920, reframed |
| `ai-kids-games-cutdown-16x9.mp4`, `ai-kids-games-cutdown-9x16.mp4` | 15-second cutdowns |
| `trailer-1080.{mp4,webm}`, `trailer-720.{mp4,webm}` | Web encodes for the site (each under 8 MB) |
| `trailer-poster.{jpg,webp}`, `trailer-thumbnail.jpg` | Poster and 1280×720 thumbnail |
| `ai-kids-games-<cut>.en.vtt` | Captions |

The master and the vertical version are attached to the GitHub release
[Sizzle reel v1](https://github.com/msoyaph/AI-Kids-Games/releases/tag/sizzle-reel-v1).

## Inline video in the GitHub README

GitHub only plays a video inline in a README when it is uploaded through the web editor. The API
and the command line can't do it. To add one:

1. On github.com, open `README.md` and click the pencil (Edit).
2. Drag `out/trailer-720.mp4` (under 10 MB) into the editor where the video should go. GitHub uploads it and inserts a `https://github.com/user-attachments/assets/…` link on its own line.
3. Commit the change (on a branch, through a pull request, since `main` is protected).

That link renders as a player. Keep the thumbnail link above it for places that don't play video.

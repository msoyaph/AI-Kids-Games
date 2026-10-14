<!-- The brief as the owner wrote it. Other companies' game and company names are replaced with a
description in [brackets]. The brief ended at "seasonal looks"; for the rest (performance, testing,
the site step, the definition of done) the owner chose the plan's defaults. The approved plan is in
games/farm-wip/docs/PLAN.md, and its follow-up decisions are in games/farm-wip/CLAUDE.md. "Farm WIP"
is the working name until the owner picks the final one. -->

# Project: Build "FarmerTown Ville", a 3D farm-building and management game for ages 8–14 (inspired by [a farm-building social game])

Build the tenth game for Ai Kids Games: a polished 3D farm game where kids design and grow their own farm, run production chains, fill orders for the town, expand their land and decorate. About 6–8 hours of goals and story, then open-ended play. Phone, tablet and computer.

Work in the AI-Kids-Games monorepo. Scaffold with `npm run new-game -- <working-slug>` from the starter template, and follow `docs/CREATE-A-GAME.md`, `AGENTS.md` and the repo rules. Use your own worktree and branch from the latest `main`; other sessions may be active. Never run heavy tests alongside another session's tests, and always respect the quiet check's exit code. Start in plan mode and show me the plan before building. Commit after each phase and keep the game's CLAUDE.md updated so a new session can resume.

## Name
Use a neutral working name and slug. In phase 0, propose 5 short, original names, checked against app stores and games. I'll pick one before the site step.

## Different from Cliff Valley (hard requirement)
The site already has Cliff Valley, a 2D pixel-art farming life sim with a walking character, energy, mining and villagers. This game must feel clearly different:
- a 3D farm diorama you build and manage from above, with no walking avatar;
- the depth is in layout, production chains, orders and planning;
- a different story and setting (not an inherited farm);
- its own crops, buildings and visual identity.

## Originality and IP (hard requirement)
- *Inspired by* the farm-builder genre, but fully original. No names, characters, art, UI layouts, currencies or text from [that game] or any [game by its publisher].
- Add [that game's title] and [its publisher] to the trademark blocklist. Keep an IP log in the game's CLAUDE.md.
- All 3D models and art are generated in code, and all audio is synthesized. No asset files.

## Kid-friendly design: what we leave out (hard requirement)
- **No energy and no real-world timers.** Crops and machines run on in-game time that passes only while playing: crops take minutes, not hours. An optional "while you were away" catch-up can only help, capped and gentle.
- **Nothing ever wilts, dies, spoils or gets sick** from being left alone. No guilt mechanics.
- **No premium currency,** no purchases, no ads.
- **No real people:** no "ask your friends" requests, no gifting spam, no social sharing, no accounts, no chat, no network requests. Neighbors are friendly computer-controlled farms.
- **No daily-login streaks** and no red notification dots.
- **You can never get stuck broke:** a free starter-seed safety net always lets you recover.

## The farm
- **Land:** a starting plot that expands into new land areas: a meadow, an orchard hill, a pond, a riverside and a hilltop. Areas unlock through farm level and goals, paid for with in-game coins.
- **Crops:** 30 crops, each based on a real crop with a real fact in the Crop Book. Seasonal crops, rain that waters the fields, and quality stars that depend on care.
- **Bonuses that teach:**
  - crop rotation;
  - bees pollinating nearby orchards;
  - composting scraps into fertilizer.
- **Orchards:** trees and berry bushes that produce again and again.
- **Animals:** chickens, cows, goats, sheep, ducks, bees and a farm dog, each with a pen or barn.
  - Feeding and brushing raise happiness, which improves products.
  - Animals are always fine when left alone.
- **Production buildings:** mill, bakery, dairy, juice press, jam kitchen, loom and kitchen, with chains such as wheat → flour → bread and wool → yarn → sweater, queued orders and upgrade levels.
- **Build mode:**
  - place, move and rotate buildings, fields, paths, fences and decorations on a grid, with snapping and undo;
  - paint paths and plant flowers;
  - a farm beauty rating;
  - decoration sets earned through play.

## Goals and story
- **Setting:** the kids take on a sleepy community farm that supplies a small town. Over the seasons, they bring it back to life for the town's big Harvest Fair. Write an original story with a small cast: a mentor, friendly neighbor farmers, and town characters who place orders.
- **Orders:** a town order board, plus delivery by an original vehicle (a cart, a boat or a small train). Special story requests come from characters.
- **Harvest Fair:** a seasonal contest where you enter your best produce and goods, judged on quality.
- **Neighbor farms:** a few computer-controlled neighbor farms with personalities. They trade, help with co-op orders, and visit to admire your farm.
- **Progression:** farm levels, a goal list for each chapter, and an ending with credits, then endless play with new goals.

## Learning (light, never preachy)
- **Crop Book and Animal Book:** real facts, simply worded, all in one reviewable file.
- **Farm Ledger:** simple charts of what you grew, made and earned, plus a "profit per crop" hint that teaches planning.
- **Market prices** that shift a little by season, so kids learn when to sell or store.

## Controls and UX
- **Touch:** tap to harvest, plant and collect; drag to plant several fields in a row; pinch to zoom; drag to pan; two-finger rotate in 45° steps.
- **Mouse and keyboard:** click, drag, scroll to zoom, Q and E to rotate, and shortcuts for build mode.
- **Gamepad:** a tile cursor, triggers for zoom, bumpers to rotate.
- **Tap picking:** taps pick tiles by raycasting, with generous hit areas. Add a unit test that every tile is reachable by tap at every supported screen size.
- **Interface:** a crisp 2D overlay for the HUD and menus, with 48 px targets and a clear goal tracker.
- **Settings:** volume, larger text, read-aloud for dialogue and tips (speech synthesis, failing gracefully), colorblind icons for crop readiness and quality, reduced motion.
- Short onboarding the first time each mechanic appears, plus gentle hints if a player seems stuck.

## 3D look and performance
- **Engine:** Three.js (pinned version) on WebGL 2, with a friendly message on devices without it.
- **Look:** a bright, warm, stylized 3D diorama, with soft materials, rim light, day-to-dusk lighting and seasonal looks

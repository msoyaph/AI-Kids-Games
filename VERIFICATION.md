# Launch verification — October 11, 2026

- Build passes registry validation, strict TypeScript, Vite and route metadata.
  All five source/public/dist game hashes match BUILD_IMPORTS.json. Each game
  directory contains only index.html; compiled games are unchanged.
- Vitest: 20 unit tests pass, including minimum-age filtering, registry/list
  validation, namespaced storage migration, blocked storage and quota failures.
- Playwright: 47 applicable cases pass across desktop (1440×1000), tablet
  (iPad Pro 11 Chromium touch profile) and phone (iPhone 13 Chromium touch
  profile). There are 16 intentional device-specific skips. Completed across
  targeted runs after correcting test orientation and scene-transition timing.
- All five games: Home → details → play; required iframe permissions; first
  gesture starts audio; no site/game console errors or page exceptions for
  20 seconds; no other-origin requests; save/settings survive an iframe reload.
- Each viewport's sequential five-game check preserves all favorites, recent
  history and preceding games' saves. Clearing catalog lists preserves saves.
- TheaBonk obtains pointer lock; all five play views enter/exit fullscreen in
  desktop Chromium. All four advertised gamepad implementations respond to a
  simulated standard controller. Vanex does not advertise gamepad support.
- Touch events build a Vanex tower, move Light Crossing and Space Sky, and
  operate Calex steering/drift/brake/item controls. Space Sky and Calex rotate
  to landscape while retaining touch input. Phone TheaBonk notice passes.
- Browse minimum-age filter, new categories, existing favorites/search/theme,
  parent controls, 404 behavior, reduced motion and layout checks pass.
- Network throttling: 40 KiB/s throughput, 200 ms latency, cache disabled;
  loading screen stays visible during the download and disappears after load.
- Rendered game banners/thumbnails and catalog layout reviewed. All art,
  fonts, scripts and game resources are local.

The storage audit is clean; see STORAGE_AUDIT.md. No original game source
changes are required. Native iPad Safari, physical phones/controllers and
device-specific audio/fullscreen behavior still need owner checks using the
preview checklist in LAUNCH_REPORT.md. Chromium device profiles are not Safari.

Vercel preview and deployed cache headers are recorded in LAUNCH_REPORT.md
after deployment. Production requires explicit owner approval.

# Shared-origin storage audit — 2026-10-11

Result: CLEAN. All five final builds have distinct storage keys. No build calls
localStorage.clear(), or clears/deletes another game's or the site's keys.
The imported bytes are recorded in BUILD_IMPORTS.json and match their originals.

| Owner | Persistent keys | Temporary availability probe |
|---|---|---|
| TheaBonk | `theabonk.save` | `__theabonk_probe__` |
| Light Crossing | `lightcrossing.slot0`, `lightcrossing.slot1`, `lightcrossing.slot2`, `lightcrossing.settings` | `__lc_probe__` |
| Vanex Defense | `vanex-defense-save` | `__vanex_probe__` |
| Space Sky | `spacesky.slot.0`, `spacesky.slot.1`, `spacesky.slot.2`, `spacesky.settings` | `__spacesky_probe__` |
| Calex Cart | `calexcart.slot.1`, `calexcart.slot.2`, `calexcart.slot.3`, `calexcart.settings`, `calexcart.lastSlot`, `calexcart.ghost.<slot>.<track>` | `__calex_probe__` |
| Ai Kids Games | `aikg:favorites`, `aikg:recent` | none |

Calex ghost slots are 1–3; track suffix is the game's track ID. Availability probes
write/remove only the listed unique temporary key. All other accesses use the
persistent keys above. Memory Maps/Sets and rendering-library clear() calls are
not localStorage operations.

## Method and ownership

Inspected inline compiled JavaScript in all five source dist/index.html files:
localStorage references, aliases (ls/backing/storage), getItem/setItem/removeItem,
optional calls, clear, key/length enumeration, templates and wrapper callers.
Parsed compiled scripts and reviewed relevant operation contexts; cross-checked
original storage modules and every caller to resolve dynamic keys.

- TheaBonk: src/core/storage.ts wraps a tested Storage reference. src/meta/save.ts
  calls it with the single `theabonk.save` key. The wrapper has an unused scoped
  remove method; there is no storage enumeration or global clear.
- Light Crossing: src/sim/save.ts prefixes every wrapper access with
  `lightcrossing.`. Slots 0–2 and global settings are the only callers. Removing
  a slot removes its exact key. No enumeration or clear.
- Vanex Defense: src/app/save.ts reads/writes a single constant key; reset removes
  that key then writes defaults. The availability probe only removes itself.
- Space Sky: src/systems/save/storage.ts wrappers are called by saveManager.ts
  for slots 0–2 and settings.ts for `spacesky.settings`. Slot deletion is exact.
- Calex Cart: src/save/save.ts uses the `calexcart` prefix throughout. ghostKeys()
  enumerates storage length/key but accepts only keys starting with
  `calexcart.ghost.${slot}.`. deleteSlot() deletes its exact slot key and only
  that filtered list. It never removes a broad prefix or all origin keys.
- Site: merges/deduplicates valid legacy lists into aikg: keys. Removes
  `aikidsgames.favorites`/`aikidsgames.recent` only after successful migration;
  retains them when writing fails. Clear saved lists deletes only these four
  site-owned keys, leaving all game saves untouched.

No required storage changes in the original game projects were found. Compiled
builds were not edited. Repeat this audit for every imported update; first-party
same-origin games can access the entire origin and must be trusted.

Browser persistence, sequential-game clobber checks and runtime storage access
instrumentation are covered by the launch Playwright tests and LAUNCH_REPORT.md.

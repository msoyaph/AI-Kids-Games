# Shared-origin storage audit (release 2.1.0, 2026-10-11)

Result: **CLEAN.** All six games and the website keep their data under their own keys. No build
calls `localStorage.clear()`, uses sessionStorage, IndexedDB, cookies or Cache Storage, or reads,
changes or deletes another owner's keys. Every build is the exact file recorded in
`BUILD_IMPORTS.json` (`npm run check:builds`).

Every game shares one origin with the site (same-origin iframe), so this audit is repeated for
every import: `npm run audit-storage` scans the committed builds, and each game's storage source is
read by hand.

## Keys

| Owner | Persistent keys | Only in special modes | Availability probe (written and removed at once) |
|---|---|---|---|
| Ai Kids Games (site) | `aikg:favorites`, `aikg:recent` | none | none |
| TheaBonk 1.0.0 | `theabonk.save` | none | `__theabonk_probe__` |
| Light Crossing 2.0.0 | `lightcrossing.slot0`–`slot2`, `lightcrossing.settings` | `lightcrossing.playtest.slot0`–`slot2` (`?playtest=1`) | `lightcrossing.__probe` |
| Vanex Defense 2.0.0 | `vanex-defense-save`, `vanex-defense-save-backup` (written once when an older save is upgraded) | `vanex-defense-playtest` (`?playtest=1`) | `__vanex_probe__` |
| Space Sky 2.0.0 | `spacesky.slot.0`–`slot.2`, `spacesky.settings` | none | `__spacesky_probe__` |
| Calex Cart 0.2.0 | `calexcart.slot.1`–`slot.3`, `calexcart.settings`, `calexcart.lastSlot`, `calexcart.ghost.<slot>.<track>` | `calexcart.playtest` (playtest mode) | `calexcart.__probe` |
| Cliff Valley 1.0.0 | `cliffvalley.slot.1`–`slot.3`, `cliffvalley.settings` | `cliffvalley.playtest` (`?playtest=1`) | `cliffvalley.__probe` |

The site never adds `?playtest=1` or similar to a game's address, so the special-mode keys only
appear when someone opens a game file directly with that option.

Three probes predate the per-game prefixes (`__theabonk_probe__`, `__vanex_probe__`,
`__spacesky_probe__`). Each is unique to its game, set and removed in the same call, and unchanged
from the builds already live, so nothing can collide; renaming them would need a change inside the
game.

## How each owner stays in its lane

- **Site:** `src/lib/storage.ts` reads and writes only `aikg:favorites` and `aikg:recent`, merges
  the legacy `aikidsgames.favorites` / `aikidsgames.recent` lists once and removes them only after
  a successful migration. "Clear saved lists" removes only the site's own keys.
- **TheaBonk:** `src/core/storage.ts` wraps a probed `Storage`; `src/meta/save.ts` uses the single
  `theabonk.save` key. No enumeration or removal of other keys.
- **Light Crossing:** `src/sim/save.ts` prefixes every access with `lightcrossing.`. Its `keys()`
  enumerates storage but keeps only keys starting with that prefix (used to measure its own
  usage); slot deletion removes its exact key.
- **Vanex Defense:** `src/app/save.ts` uses constant keys; resetting removes `vanex-defense-save`
  and writes defaults. The probe removes only itself.
- **Space Sky:** `src/systems/save/storage.ts` wrappers are called by `saveManager.ts` for the three
  slots and by `settings.ts`; erasing a slot removes its exact key.
- **Calex Cart:** `src/save/save.ts` and `storage.ts` use the `calexcart` prefix throughout.
  `ourKeys(prefix)` enumerates storage but keeps only keys starting with the (always `calexcart.`)
  prefix; deleting a slot removes its slot key and only that slot's ghost keys.
- **Cliff Valley:** `src/core/storage.ts` prefixes every access with `cliffvalley.`; its usage
  meter enumerates storage but skips every key without the prefix.

## Worst case for all six games plus the site

Sizes are in characters (localStorage counts string length; 1 KB = 1,024 characters). Browsers
allow about 5 MB (5,242,880 characters) per origin.

| Owner | Every key at its cap (incl. special modes) | Heavy normal play (all three slots used) | Basis |
|---|---|---|---|
| Site | < 1 KB | < 1 KB | two short lists of game slugs |
| TheaBonk 1.0.0 | 7 KB | 7 KB | v2's fully maxed save is 6.6 KB; v1 stores less |
| Light Crossing 2.0.0 | 1,093 KB | 70 KB | 300 KB cap per slot (enforced), 64 KB per playtest slot; a finished story is about 23 KB per slot |
| Vanex Defense 2.0.0 | 160 KB | 10 KB | save < 50 KB worst case (tested), one-time backup of an older save, playtest ≤ 60 KB |
| Space Sky 2.0.0 | 92 KB | 30 KB | real chapter-3 save 2.6 KB; ≤ 30 KB per slot for a finished game |
| Calex Cart 0.2.0 | 1,106 KB | 1,000 KB | the game's own worst case, 1.08 MB: a ghost on all 20 tracks in all 3 slots, a full playtest log and settings |
| Cliff Valley 1.0.0 | 1,051 KB | 100 KB | 300 KB budget per slot, playtest ≤ 150 KB; a year-one finale save measured 32 KB |
| **Total** | **≈ 3.4 MB** | **≈ 1.2 MB** | |

Even with every key of every game at its cap (which no real player reaches: Light Crossing's and
Cliff Valley's slot caps are about 10 times their largest real saves), the origin stays about
1.6 MB under the 5 MB limit. Heavy normal play uses about a quarter of it, and most of that is
Calex Cart's optional time-trial ghosts. If a browser ever runs out of room, every game keeps the
previous save intact and tells the player (Calex Cart first frees its own playtest log).

## Method

1. `npm run audit-storage`: scans each committed build for storage APIs, key-like strings and risky
   calls (clear, enumeration, sessionStorage, IndexedDB, cookies, Cache Storage).
2. Read each game's storage module and every caller in its source (`games/<slug>/src`) to resolve
   dynamic keys and confirm that every enumeration is filtered to the game's own prefix.
3. Sizes from each game's own budgets, storage tests and measured saves (see its README).
4. Browser tests on the site check that saves survive a reload and that games leave each other's
   keys alone (`tests/e2e/launch.spec.ts`).

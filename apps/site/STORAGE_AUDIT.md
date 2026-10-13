# Shared-origin storage audit (Tuck Pop added, 2026-10-13)

Result: **CLEAN.** All seven games and the website keep their data under their own keys. No build
calls `localStorage.clear()`, uses sessionStorage, IndexedDB, cookies or Cache Storage, or reads,
changes or deletes another owner's keys. Every build is the exact file recorded in
`BUILD_IMPORTS.json` (`npm run check:builds`).

Every game shares one origin with the site (same-origin iframe), so this audit is repeated for
every import: `npm run audit-storage` scans the committed builds, and each game's storage source is
read by hand.

## Keys

| Owner | Persistent keys | Only in special modes | Availability probe (written and removed at once) |
|---|---|---|---|
| AI Kids Games (site) | `aikg:favorites`, `aikg:recent`, `aikg:tips` (one-time play-page tips answered, ≤ 40 bytes) | none | none |
| TheaBonk 2.0.0 | `theabonk.save`, `theabonk.save.bak` (written once when a 1.0 save is upgraded) | `theabonk.playtest` (`?playtest=1`), `theabonk.tuning` (`?tune=1`) | `__theabonk_probe__` |
| Light Crossing 2.0.0 | `lightcrossing.slot0`–`slot2`, `lightcrossing.settings` | `lightcrossing.playtest.slot0`–`slot2` (`?playtest=1`) | `lightcrossing.__probe` |
| Vanex Defense 2.0.0 | `vanex-defense-save`, `vanex-defense-save-backup` (written once when an older save is upgraded) | `vanex-defense-playtest` (`?playtest=1`) | `__vanex_probe__` |
| Space Sky 2.0.0 | `spacesky.slot.0`–`slot.2`, `spacesky.settings` | none | `__spacesky_probe__` |
| Calex Cart 0.2.0 | `calexcart.slot.1`–`slot.3`, `calexcart.settings`, `calexcart.lastSlot`, `calexcart.ghost.<slot>.<track>` | `calexcart.playtest` (playtest mode) | `calexcart.__probe` |
| Cliff Valley 1.0.0 | `cliffvalley.slot.1`–`slot.3`, `cliffvalley.settings` | `cliffvalley.playtest` (`?playtest=1`) | `cliffvalley.__probe` |
| Tuck Pop 1.0.0 | `tuckpop.save` (profile), `tuckpop.run` (the Classic, Relax and Daily games in progress) | none (its capture route never reads or writes storage) | `tuckpop.__probe` |

The site never adds `?playtest=1` or similar to a game's address, so the special-mode keys only
appear when someone opens a game file directly with that option.

Three probes predate the per-game prefixes (`__theabonk_probe__`, `__vanex_probe__`,
`__spacesky_probe__`). Each is unique to its game, set and removed in the same call, and unchanged
from the builds already live, so nothing can collide; renaming them would need a change inside the
game.

## How each owner stays in its lane

- **Site:** `src/lib/storage.ts` reads and writes only `aikg:favorites`, `aikg:recent` and
  `aikg:tips` (which one-time play-page tips were answered: "Play fullscreen?" and the iPhone Home
  Screen card), merges the legacy `aikidsgames.favorites` / `aikidsgames.recent` lists once and
  removes them only after a successful migration. "Clear saved lists" removes only the site's own
  lists (the tips stay answered).
- **TheaBonk 2.0.0:** `src/core/storage.ts` wraps a probed `Storage` (in-memory fallback); every key
  starts with `theabonk.`: `theabonk.save` (1.5 KB new, 6.6 KB fully maxed, settings and touch
  layout included), a one-time `theabonk.save.bak` copy of a 1.0 save before its first v2 write,
  and `theabonk.playtest` (≤ 60 KB) / `theabonk.tuning` (≤ 2 KB) only in their test modes, which
  the site never turns on. The build's other `theabonk-…` strings are export file names, format
  tags and a hash seed, not keys. No enumeration or removal of other keys; its own storage test
  keeps everything under 100 KB.
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
- **Tuck Pop:** `src/save/storage.ts` prefixes every access with `tuckpop.` (from `src/config.ts`)
  and never enumerates or clears; a finished game removes only its own `tuckpop.run` entry (and the
  key itself once no game is in progress). Its unit tests check that other owners' keys are left
  untouched and that a full store keeps play going from memory.

## Worst case for all seven games plus the site

Sizes are in characters (localStorage counts string length; 1 KB = 1,024 characters). Browsers
allow about 5 MB (5,242,880 characters) per origin.

| Owner | Every key at its cap (incl. special modes) | Heavy normal play (all three slots used) | Basis |
|---|---|---|---|
| Site | < 1 KB | < 1 KB | two short lists of game slugs and the answered tips |
| TheaBonk 2.0.0 | 75 KB | 13 KB | fully maxed save 6.6 KB and its one-time 1.0 backup (both measured by the game's storage test), playtest ≤ 60 KB, tuning ≤ 2 KB |
| Light Crossing 2.0.0 | 1,093 KB | 70 KB | 300 KB cap per slot (enforced), 64 KB per playtest slot; a finished story is about 23 KB per slot |
| Vanex Defense 2.0.0 | 160 KB | 10 KB | save < 50 KB worst case (tested), one-time backup of an older save, playtest ≤ 60 KB |
| Space Sky 2.0.0 | 92 KB | 30 KB | real chapter-3 save 2.6 KB; ≤ 30 KB per slot for a finished game |
| Calex Cart 0.2.0 | 1,106 KB | 1,000 KB | the game's own worst case, 1.08 MB: a ghost on all 20 tracks in all 3 slots, a full playtest log and settings |
| Cliff Valley 1.0.0 | 1,051 KB | 100 KB | 300 KB budget per slot, playtest ≤ 150 KB; a year-one finale save measured 32 KB |
| Tuck Pop 1.0.0 | 53 KB | 7 KB | the profile is refused over 50 KB (enforced) and a maximal one is under 4 KB (tested); the games in progress are at most about 0.8 KB each, three at once |
| **Total** | **≈ 3.5 MB** | **≈ 1.2 MB** | |

Even with every key of every game at its cap (which no real player reaches: Light Crossing's and
Cliff Valley's slot caps are about 10 times their largest real saves), the origin stays about
1.5 MB under the 5 MB limit. Heavy normal play uses about a quarter of it, and most of that is
Calex Cart's optional time-trial ghosts. If a browser ever runs out of room, every game keeps the
previous save intact and tells the player (Calex Cart first frees its own playtest log).

## Community games (not on this origin)

Community games (`community/<slug>/`, SUBMITTING.md) never share this origin. Each plays from its own
address (`aikg-<slug>.vercel.app`, a separate site), so it can't read or change the website's
`aikg:` keys or any first-party game's saves, and other community games can't read its saves. In
an iframe, browsers also keep its storage separate per top-level site. They are still held to the
same rules, checked by `npm run check-submission`:
- every key starts with the game's own prefix, which no other game (first-party or community) may
  share or overlap;
- no `clear()`, sessionStorage, IndexedDB, cookies or Cache Storage;
- a static scan of the source, plus a 20-second browser run that records every storage call.

They are left out of the size budget above, because their storage belongs to their own origin.

## Method

1. `npm run audit-storage`: scans each committed build for storage APIs, key-like strings and risky
   calls (clear, enumeration, sessionStorage, IndexedDB, cookies, Cache Storage).
2. Read each game's storage module and every caller in its source (`games/<slug>/src`) to resolve
   dynamic keys and confirm that every enumeration is filtered to the game's own prefix.
3. Sizes from each game's own budgets, storage tests and measured saves (see its README).
4. Browser tests on the site check that saves survive a reload and that games leave each other's
   keys alone (`tests/e2e/launch.spec.ts`).

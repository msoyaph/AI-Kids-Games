# Follow-ups for the games' own projects

The app never changes a game build: it runs only bytes whose SHA-256 matches the verified import.
So everything below is a change for a game's **own** project. Each would ship as a normal game
release, with a re-import, a storage re-audit and its own suites. Each finding comes from the local
harness (`npm run test:e2e --workspace apps/mcp`): a cross-origin sandbox proxy with `allow=""` and
the spec's default CSP, as assistants use.

## Cliff Valley: run in assistants (owner request)

**Finding:**
- Its PixiJS build doesn't include PixiJS's eval-free module.
- PixiJS's renderer then checks for `unsafe-eval` and throws under any Content Security Policy
  without it.
- Every assistant's widget CSP is such a policy, so the game can't start there. It is card-only
  (`embed: "site"`) for now.
- On the website it works, because game files are served without a CSP.

**Fix:**
1. Add PixiJS's official module for environments that block `unsafe-eval`, as Vanex Defense
   (`src/render/Stage.ts`), Tuck Pop and Agentmon already do. Put it at the very top of
   `games/cliff-valley/src/render/renderer.ts`, before anything else from PixiJS is used:

   ```ts
   import 'pixi.js/unsafe-eval'; // no eval(): assistants' Content Security Policy forbids it
   ```

2. Then, in this repo:
   - `npm run import-game -- cliff-valley`;
   - `npm run audit-storage`;
   - set `"embed": "fullscreen"` in `games/cliff-valley/game.json`;
   - `npm run manifests`;
   - re-run the harness suite (its gamepad spec then covers Cliff Valley too).

**Experiment (2026-10-13; scratch only, the source was restored and nothing was committed):**
1. Built Cliff Valley with that one line added (`npm run build:only --workspace games/cliff-valley`:
   one self-contained file, 1,173,203 bytes; its build check passed).
2. Ran both builds from `srcdoc` under an assistant-like CSP (`script-src 'self' 'unsafe-inline'`, no
   `'unsafe-eval'`) in Chromium.

| Build | Result |
|---|---|
| Current (verified) | "Sorry! Cliff Valley could not start on this device." PixiJS throws "Current environment does not allow unsafe-eval, please use pixi.js/unsafe-eval module to enable support." |
| With the import | It starts: the title screen ("Start Playing", "Settings"), a WebGL canvas, the `__cliffvalley` hook in `title` mode, and no errors. |

So the official module is enough. No other change to Cliff Valley is needed for it to run in
assistants. Its saves, storage keys and gameplay are untouched by the import, which only replaces how
PixiJS compiles shaders and uniform uploads.

## Calex Cart and Light Crossing: `navigator.getGamepads()` without a guard

Both call it every frame. The Gamepad spec allows it to throw a `SecurityError` where the `gamepad`
permission isn't granted, and assistant frames grant no permissions (MCP Apps has none for gamepads).

**Result: not confirmed.**
- In the harness's host-like frame (cross-origin, `allow=""`), `getGamepads()` returns normally in
  Chromium, WebKit and Firefox (2026-10-13; `tests/e2e/gamepad.spec.ts` prints it per browser and
  game).
- Both games played for 8 s with no errors, so they stay playable in assistants (`embed:
  "fullscreen"`).

**Recommended hardening anyway:** a browser that starts enforcing the policy would stop their frame
loops. Guard the call in each game's own source:
- `games/calex-cart/src/input/manager.ts` (three places) and `src/ui/screens/menus.ts`;
- `games/light-crossing/src/input/input.ts`.

```ts
function pads(): (Gamepad | null)[] {
  try { return typeof navigator.getGamepads === 'function' ? [...navigator.getGamepads()] : []; }
  catch { return []; } // no gamepad permission in this frame (e.g. inside an AI assistant)
}
```

## Space Sky and Vanex Defense: unhandled fullscreen rejections (WebKit)

**Finding:**
- In WebKit, both games call the Fullscreen API themselves, and the promise rejects ("Permission
  policy 'Fullscreen' check failed") because assistant frames have no fullscreen permission.
- Nothing catches the rejection, so it is reported as an uncaught error.
- The games keep running. The host's own fullscreen mode is what the app uses.

**Fix:** catch the promise wherever the game calls `requestFullscreen()` or
`webkitRequestFullscreen()`, e.g. `el.requestFullscreen?.().catch(() => showToast(...))`.

## Agentmon: its fonts in assistants

**Finding:**
- Its three Nunito fonts are `data:` URIs.
- Assistants' CSPs have no `font-src data:`, so the browser refuses them (a console notice).
- The text falls back to the system font.

**Fix (optional):** nothing to fix in the game. If the owner wants its own font in assistants too,
the font would have to come from the website's origin instead, which would be a game build change.

## Calex Cart: tilt sensors

**Finding:**
- Assistant frames give no accelerometer permission, so the browser logs a permissions-policy notice
  and tilt steering is unavailable.
- Touch, keys and gamepads still steer.

**Fix:** none needed.

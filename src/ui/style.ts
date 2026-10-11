/** All UI CSS (inlined into the single-file build). Cozy parchment + wood look, big touch targets. */
export const CSS = `
:root {
  --paper: #f6ecd2; --paper2: #ead8b0; --paper3: #dcc694; --ink: #3b2a1f; --ink2: #6a5040;
  --wood: #8f603d; --wood-d: #5a3a25; --leaf: #4f9e48; --leaf-d: #2c6a30; --sun: #f5b942; --sun-l: #ffd77a;
  --sky: #4f7fe0; --rose: #d2434a; --plum: #6a4f8c;
  --text-scale: 1; --ui: 1;
  --font: "Trebuchet MS", "Verdana", "Segoe UI", system-ui, sans-serif;
}
#ui { position: fixed; inset: 0; pointer-events: none; font-family: var(--font); color: var(--ink);
  font-size: calc(16px * var(--text-scale)); line-height: 1.3; z-index: 10; }
#ui * { box-sizing: border-box; }
#ui .layer { position: absolute; inset: 0; pointer-events: none; }
#ui .interactive, #ui button, #ui input, #ui select, #ui .slot, #ui .modal { pointer-events: auto; }
.reduced-motion #ui * { transition: none !important; animation: none !important; }

.panel { background: var(--paper); border: 3px solid var(--wood-d); border-radius: 8px;
  box-shadow: inset 0 0 0 2px var(--paper2), 0 4px 0 rgba(0,0,0,.35); }
.panel.dark { background: #2b2433ee; color: var(--paper); border-color: #1a1520; box-shadow: inset 0 0 0 2px #3d3c4e, 0 4px 0 rgba(0,0,0,.35); }

.btn { font: inherit; font-weight: 700; color: var(--ink); background: linear-gradient(var(--sun-l), var(--sun));
  border: 3px solid var(--wood-d); border-radius: 10px; box-shadow: 0 3px 0 var(--wood-d); padding: 8px 16px;
  min-height: 44px; min-width: 44px; cursor: pointer; touch-action: manipulation; }
.btn:hover { filter: brightness(1.06); }
.btn:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--wood-d); }
.btn:focus-visible { outline: 3px solid var(--sky); outline-offset: 2px; }
.btn.green { background: linear-gradient(#9fdc84, #5cae4c); }
.btn.blue { background: linear-gradient(#a8c8ff, #6f9cf0); }
.btn.gray { background: linear-gradient(#efe6d6, #cfc2aa); }
.btn.red { background: linear-gradient(#ffb0a8, #e06a5c); }
.btn.small { min-height: 36px; padding: 4px 10px; font-size: .9em; }
.btn[disabled] { opacity: .5; cursor: default; filter: grayscale(.4); }
.icon-btn { width: 48px; height: 48px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }

.ico { display: inline-block; image-rendering: pixelated; image-rendering: crisp-edges; background-repeat: no-repeat; vertical-align: middle; flex: none; }

/* HUD */
.hud-clock { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right));
  padding: 6px 12px 6px 10px; min-width: 168px; font-weight: 700; transform-origin: top right; transform: scale(var(--ui)); }
.hud-clock .row { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.hud-clock .time { font-size: 1.35em; letter-spacing: .5px; }
.hud-clock .coins { color: #7a4a10; }
.hud-clock .sleepy { color: var(--plum); }
.hud-left { position: absolute; top: max(8px, env(safe-area-inset-top)); left: max(8px, env(safe-area-inset-left)); display: flex; gap: 8px;
  transform-origin: top left; transform: scale(var(--ui)); }
.hud-loc { padding: 6px 12px; font-weight: 700; align-self: center; }
.hud-energy { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); width: 30px; height: 150px;
  padding: 3px; display: flex; flex-direction: column-reverse; transform-origin: bottom right; transform: scale(var(--ui)); }
.hud-energy .fill { width: 100%; border-radius: 3px; background: linear-gradient(90deg, #7ed957, #4f9e48); transition: height .2s; }
.hud-energy .fill.low { background: linear-gradient(90deg, #ffb35c, #e4862e); }
.hud-energy .fill.empty { background: #d2434a; }
.hud-energy .lbl { position: absolute; top: -26px; left: 50%; transform: translateX(-50%); }
.hud-hp { right: calc(max(10px, env(safe-area-inset-right)) + 38px); }
.hud-hp .fill { background: linear-gradient(90deg, #ff8a8a, #d2434a); }
.toolbar { position: absolute; left: 50%; bottom: max(8px, env(safe-area-inset-bottom)); transform: translateX(-50%) scale(var(--ui)); transform-origin: bottom center;
  display: flex; gap: 3px; padding: 5px; }
.slot { position: relative; width: 46px; height: 46px; background: var(--paper2); border: 2px solid var(--paper3); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: manipulation; }
.slot.sel { border-color: var(--rose); box-shadow: 0 0 0 2px var(--sun) inset; background: #fff6dc; }
.slot .n { position: absolute; right: 2px; bottom: 0; font-size: 12px; font-weight: 800; color: var(--ink); text-shadow: 0 0 2px #fff, 0 0 2px #fff; }
.slot .k { position: absolute; left: 3px; top: 0; font-size: 10px; color: var(--ink2); }
.slot .q { position: absolute; left: 0; bottom: 0; }
.slot.drag-over { border-color: var(--sky); }
.slot .water { position: absolute; left: 4px; bottom: 3px; height: 4px; border-radius: 2px; background: #4f9fe8; box-shadow: 0 0 0 1px #1b3363; }
.toolname { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(max(8px, env(safe-area-inset-bottom)) + 66px * var(--ui));
  padding: 3px 12px; font-weight: 700; opacity: 0; transition: opacity .3s; white-space: nowrap; }
.toolname.show { opacity: 1; }

/* Toasts */
.toasts { position: absolute; top: calc(max(8px, env(safe-area-inset-top)) + 80px); left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 6px; width: min(92vw, 520px); }
.toast { padding: 8px 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; animation: toastIn .25s ease-out; text-align: center; }
.toast.out { opacity: 0; transition: opacity .4s; }
@keyframes toastIn { from { transform: translateY(-10px); opacity: 0; } to { transform: none; opacity: 1; } }
.pickup { position: absolute; left: 12px; bottom: calc(80px * var(--ui) + 16px); display: flex; flex-direction: column; gap: 4px; }
.pickup .item { padding: 4px 10px 4px 6px; display: flex; gap: 6px; align-items: center; font-weight: 700; animation: toastIn .2s; }

/* Modal */
.modal-bg { position: absolute; inset: 0; background: rgba(20, 16, 28, .45); display: flex; align-items: center; justify-content: center; pointer-events: auto; padding: 12px; }
.modal { max-width: min(94vw, 560px); max-height: 92vh; overflow: auto; padding: 18px 20px; }
.modal h2 { margin: 0 0 10px; font-size: 1.4em; }
.actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 14px; }
.modal p { margin: 6px 0; }

/* Title */
.title-wrap { position: absolute; inset: 0; z-index: 5; background: radial-gradient(ellipse at center, rgba(20,16,28,.15) 0%, rgba(20,16,28,.55) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; pointer-events: auto; padding: 16px; }
.logo { font-size: clamp(44px, 11vw, 96px); font-weight: 900; color: #fff3c4; letter-spacing: 2px; text-align: center; line-height: .95;
  text-shadow: 0 4px 0 #a0522d, 0 8px 0 #5a3a25, 0 10px 18px rgba(0,0,0,.4); }
.logo small { display: block; font-size: .28em; letter-spacing: 4px; color: #ffe7a0; text-shadow: 0 2px 0 #5a3a25; margin-top: 10px; }
.title-menu { display: flex; flex-direction: column; gap: 10px; min-width: min(80vw, 300px); }
.title-menu .btn { font-size: 1.15em; }
.slots { display: flex; flex-direction: column; gap: 10px; }
.slotcard { display: flex; align-items: center; gap: 12px; padding: 10px 12px; text-align: left; width: 100%; }
.slotcard .meta { flex: 1; }
.slotcard .meta b { font-size: 1.1em; }
.slotcard .sub { color: var(--ink2); font-size: .9em; }
.form-row { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }
.form-row label { font-weight: 700; }
.form-row .hint { font-size: .85em; color: var(--ink2); }
.inp { font: inherit; padding: 8px 10px; border: 3px solid var(--wood-d); border-radius: 8px; background: #fffdf4; min-height: 44px; }
.choice-row { display: flex; gap: 8px; flex-wrap: wrap; }
.choice { border: 3px solid var(--paper3); border-radius: 10px; background: var(--paper2); padding: 6px 10px; min-height: 44px; cursor: pointer; font: inherit; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.choice.on { border-color: var(--rose); background: #fff6dc; }
.swatch { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--paper3); cursor: pointer; }
.swatch.on { border-color: var(--rose); box-shadow: 0 0 0 2px #fff inset; }
.preview-canvas { image-rendering: pixelated; width: 96px; height: 192px; }

/* Day end */
.dayend { width: min(94vw, 480px); padding: 18px; }
.dayend .list { max-height: 40vh; overflow: auto; margin: 8px 0; }
.dayend .line { display: flex; align-items: center; gap: 8px; padding: 3px 0; border-bottom: 1px dashed var(--paper3); }
.dayend .line .v { margin-left: auto; font-weight: 700; color: #7a4a10; }
.dayend .total { font-size: 1.3em; font-weight: 900; text-align: right; margin-top: 6px; }

.fade { position: absolute; inset: 0; background: #0d0a14; opacity: 0; transition: opacity .6s; pointer-events: none; }
.fade.on { opacity: 1; pointer-events: auto; }
.fade .msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--paper); font-size: 1.3em; font-weight: 700; text-align: center; padding: 20px; }

.fps { position: absolute; left: 8px; bottom: 8px; padding: 4px 8px; font: 700 13px/1.2 ui-monospace, Menlo, monospace; pointer-events: none; white-space: pre; }

@media (max-width: 520px), (max-height: 520px) {
  :root { --ui: .82; }
}
@media (max-width: 380px) {
  :root { --ui: .74; }
}
`;

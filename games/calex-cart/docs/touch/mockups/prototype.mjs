// Throwaway design prototype of the glass touch controller (NOT project code). Injected into the running game by
// the mockup / measurement scripts. Variants: .gc-fake (layered gradients, no blur), .gc-blur (real backdrop
// blur, High only), .gc-hc (high contrast). States are set with classes/CSS variables for the mockups.

export const CSS = `
.gc { position:absolute; inset:0; pointer-events:none; z-index:30; --s:1; font-family: inherit; }
.gc * { box-sizing:border-box; }
/* ---- shared glass skin ------------------------------------------------------------------------------------ */
.gc .glass {
  position:absolute; border-radius:50%;
  /* double rim: light inner highlight + dark outer hairline = readable on white sand AND on night streets */
  border: calc(2px * var(--s)) solid rgba(255,255,255,0.62);
  box-shadow:
    0 0 0 calc(1px * var(--s)) rgba(12,8,40,0.38),           /* dark hairline outside the rim */
    0 calc(6px * var(--s)) calc(16px * var(--s)) rgba(8,4,30,0.32),   /* soft drop shadow */
    inset 0 calc(5px * var(--s)) calc(10px * var(--s)) rgba(255,255,255,0.32), /* top inner light */
    inset 0 calc(-8px * var(--s)) calc(14px * var(--s)) rgba(14,8,48,0.30);   /* bottom inner shade */
  color:#fff; display:flex; align-items:center; justify-content:center; flex-direction:column;
  font-weight:900; letter-spacing:.05em; text-shadow: 0 1px 0 rgba(10,6,40,.55), 0 0 6px rgba(10,6,40,.35);
}
/* fake glass: frost = layered translucent gradients (a sheen band, a navy tint so white sand doesn't swallow it) */
.gc-fake .glass {
  background:
    linear-gradient(160deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 38%, rgba(255,255,255,0) 52%),
    radial-gradient(circle at 50% 120%, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%),
    rgba(30,22,86,0.30);
}
/* real blur (High tier only, when the benchmark allows): same layers, lighter tint, frosted backdrop */
.gc-blur .glass {
  background:
    linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 52%),
    rgba(30,22,86,0.18);
  -webkit-backdrop-filter: blur(calc(9px * var(--s))) saturate(1.5);
  backdrop-filter: blur(calc(9px * var(--s))) saturate(1.5);
}
/* high contrast: solid deep fill, thick white rim + black outline, no see-through */
.gc-hc .glass {
  background: rgba(16,10,52,0.82);
  border: calc(3px * var(--s)) solid #fff;
  box-shadow: 0 0 0 calc(2px * var(--s)) #000, 0 calc(4px * var(--s)) calc(10px * var(--s)) rgba(0,0,0,.45);
}
.gc .tint { position:absolute; inset:0; border-radius:inherit; pointer-events:none; }
/* ---- joystick ---------------------------------------------------------------------------------------------- */
.gc .stick { width:calc(150px * var(--s)); height:calc(150px * var(--s)); }
.gc .stick .ticks { position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 calc(14px * var(--s)); font-size:calc(22px * var(--s)); opacity:.55; }
.gc .stick.ghost { opacity:.38; }
.gc .knob {
  position:absolute; left:50%; top:50%; width:calc(66px * var(--s)); height:calc(66px * var(--s)); margin:calc(-33px * var(--s)) 0 0 calc(-33px * var(--s));
  border-radius:50%; transform: translate(calc(var(--kx, 0) * 42px * var(--s)), calc(var(--ky, 0) * 42px * var(--s)));
  /* glossy bead: the specular spot sits opposite the push, so it "rolls" as the knob moves */
  background:
    radial-gradient(circle at calc(38% - var(--kx, 0) * 12%) calc(30% - var(--ky, 0) * 12%), rgba(255,255,255,0.95) 0 9%, rgba(255,255,255,0.35) 22%, rgba(255,255,255,0) 46%),
    radial-gradient(circle at 50% 78%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%),
    radial-gradient(circle at 50% 50%, rgba(120,110,255,0.55), rgba(40,26,120,0.75) 100%);
  border: calc(2px * var(--s)) solid rgba(255,255,255,0.75);
  box-shadow: 0 0 0 calc(1px * var(--s)) rgba(12,8,40,.45), 0 calc(6px * var(--s)) calc(12px * var(--s)) rgba(8,4,30,.45), inset 0 calc(-6px * var(--s)) calc(10px * var(--s)) rgba(8,4,40,.45);
}
.gc-hc .knob { background: radial-gradient(circle at 38% 30%, #fff 0 10%, rgba(255,255,255,.2) 30%, rgba(0,0,0,0) 50%), #3b2bd0; border: calc(3px * var(--s)) solid #fff; box-shadow: 0 0 0 calc(2px * var(--s)) #000; }
.gc .trail { position:absolute; left:50%; top:50%; width:calc(66px * var(--s)); height:calc(66px * var(--s)); margin:calc(-33px * var(--s)) 0 0 calc(-33px * var(--s)); border-radius:50%;
  background: radial-gradient(circle, rgba(255,255,255,.35), rgba(255,255,255,0) 70%); transform: translate(calc(var(--tx, 0) * 42px * var(--s)), calc(var(--ty, 0) * 42px * var(--s))); opacity: var(--to, 0); }
/* drift tier: ring glows in the tier colour AND shows 1–3 chevrons + the tier word (not colour alone) */
.gc .stick.tier1 { --tc: #3fa7ff; } .gc .stick.tier2 { --tc: #ff9f1c; } .gc .stick.tier3 { --tc: #ff4dd2; }
.gc .stick[class*="tier"] { border-color: var(--tc); box-shadow: 0 0 0 calc(1px * var(--s)) rgba(12,8,40,.38), 0 0 calc(18px * var(--s)) calc(3px * var(--s)) var(--tc), inset 0 0 calc(16px * var(--s)) var(--tc); }
.gc .tierbadge { position:absolute; top:calc(-26px * var(--s)); left:50%; transform:translateX(-50%); padding:calc(1px * var(--s)) calc(8px * var(--s)); border-radius:999px;
  background: rgba(16,10,52,.82); border: calc(2px * var(--s)) solid var(--tc); color: var(--tc); font-size: calc(13px * var(--s)); white-space:nowrap; display:none; }
.gc .stick[class*="tier"] .tierbadge { display:block; }
/* ---- buttons ----------------------------------------------------------------------------------------------- */
.gc .btn { font-size: calc(15px * var(--s)); }
.gc .btn .ico { font-size: calc(26px * var(--s)); line-height:1; margin-bottom: calc(2px * var(--s)); }
.gc .btn .ico svg { width: calc(46px * var(--s)); height: calc(46px * var(--s)); display:block; }
.gc .btn .lbl { font-size: calc(12px * var(--s)); opacity:.95; }
.gc .drift { width:calc(124px * var(--s)); height:calc(124px * var(--s)); }
.gc .drift .tint { background: radial-gradient(circle at 50% 35%, rgba(255,111,174,.35), rgba(255,111,174,.12) 70%); }
.gc .item  { width:calc(96px * var(--s));  height:calc(96px * var(--s)); }
.gc .item .tint { background: radial-gradient(circle at 50% 35%, rgba(76,224,210,.32), rgba(76,224,210,.10) 70%); }
.gc .brake { width:calc(70px * var(--s));  height:calc(70px * var(--s)); }
.gc .go    { width:calc(70px * var(--s));  height:calc(70px * var(--s)); }
.gc .go .tint { background: radial-gradient(circle at 50% 35%, rgba(140,255,107,.35), rgba(140,255,107,.1) 70%); }
.gc .look  { width:calc(56px * var(--s));  height:calc(56px * var(--s)); }
.gc .pause { width:calc(50px * var(--s));  height:calc(50px * var(--s)); border-radius: calc(16px * var(--s)); }
.gc-hc .tint { display:none; }
/* pressed: sinks, brightens, inner glow + a soft ripple ring */
.gc .down { transform: translateY(calc(2px * var(--s))) scale(.95); filter: brightness(1.25);
  box-shadow: 0 0 0 calc(1px * var(--s)) rgba(12,8,40,.38), 0 calc(2px * var(--s)) calc(6px * var(--s)) rgba(8,4,30,.3), inset 0 0 calc(22px * var(--s)) rgba(255,255,255,.45); }
.gc .ripple { position:absolute; inset: calc(-10px * var(--s)); border-radius:inherit; border: calc(3px * var(--s)) solid rgba(255,255,255,.55); opacity:.7; }
/* countdown GO: glass pulse */
.gc .go.pulse { box-shadow: 0 0 0 calc(1px * var(--s)) rgba(12,8,40,.38), 0 0 0 calc(8px * var(--s)) rgba(140,255,107,.35), 0 0 calc(24px * var(--s)) calc(6px * var(--s)) rgba(140,255,107,.55), inset 0 calc(5px * var(--s)) calc(10px * var(--s)) rgba(255,255,255,.32); }
.gc .zone { position:absolute; left:0; top:22%; bottom:0; width:45%; border-right: 2px dashed rgba(255,255,255,.45); background: rgba(255,255,255,.04); }
.gc .zone span { position:absolute; left: 12px; top: 8px; font-size: 12px; opacity: .8; }
`;

/**
 * Build the controller for a viewport. opts: { variant: 'fake'|'blur'|'hc', size: 0.85|1|1.15, w, h, stick: {x,y,kx,ky,tier,ghost,trail},
 * drift:{down}, item:{icon}, go:{show,pulse}, lefty, zone }
 */
export function build(o) {
  const s = o.size * Math.min(1.25, Math.max(0.72, Math.min(o.w / 844, o.h / 390) * (o.h >= 700 ? 0.92 : 1)));
  const pad = 14;
  const R = (x) => (o.lefty ? o.w - x : x);
  const els = [];
  const at = (cls, cx, cy, inner = '', extra = '') => `<div class="glass ${cls}" style="left:${R(cx)}px;top:${cy}px;transform-origin:center;${extra}"><div class="tint"></div>${inner}</div>`;
  // centre-positioned helper (translate -50%)
  const c = (cls, cx, cy, size, inner = '', down = false) =>
    `<div class="glass btn ${cls}${down ? ' down' : ''}" style="left:${R(cx) - (size * s) / 2}px;top:${cy - (size * s) / 2}px"><div class="tint"></div>${inner}${down ? '<div class="ripple"></div>' : ''}</div>`;
  const st = o.stick ?? {};
  const sx = st.x ?? 150 * s + pad + 10;
  const sy = st.y ?? o.h - 150 * s / 2 - pad - 18;
  const tierWord = ['', 'MINI ›', 'SUPER ››', 'ULTRA ›››'][st.tier ?? 0];
  if (o.zone) els.push(`<div class="zone" style="${o.lefty ? 'left:auto;right:0;border-right:0;border-left:2px dashed rgba(255,255,255,.45)' : ''}"><span>steer zone · touch anywhere here</span></div>`);
  els.push(
    `<div class="glass stick${st.ghost ? ' ghost' : ''}${st.tier ? ' tier' + st.tier : ''}" style="left:${R(sx) - 75 * s}px;top:${sy - 75 * s}px">` +
      `<div class="ticks"><span>‹</span><span>›</span></div>` +
      `<div class="trail" style="--tx:${st.tx ?? 0};--ty:${st.ty ?? 0};--to:${st.trail ? 0.8 : 0}"></div>` +
      `<div class="trail" style="--tx:${(st.tx ?? 0) * 0.5};--ty:${(st.ty ?? 0) * 0.5};--to:${st.trail ? 0.45 : 0}"></div>` +
      `<div class="knob" style="--kx:${st.kx ?? 0};--ky:${st.ky ?? 0}"></div>` +
      `<div class="tierbadge">${tierWord}</div></div>`,
  );
  // right cluster: DRIFT big at the thumb's rest spot, ITEM above-left, BRAKE left, GO above (auto-accel off)
  const dx = o.w - pad - 10 - 124 * s / 2;
  const dy = o.h - pad - 14 - 124 * s / 2;
  els.push(c('drift', dx, dy, 124, '<div class="ico">✨</div><div class="lbl">DRIFT</div>', o.drift?.down));
  els.push(c('item', dx - 112 * s, dy - 70 * s, 96, `<div class="ico">${o.item?.icon ?? '🎁'}</div>${o.item?.icon ? '' : '<div class="lbl">ITEM</div>'}`, o.item?.down));
  els.push(c('brake', dx - 128 * s, dy + 30 * s, 70, '<div class="ico" style="font-size:' + 18 * s + 'px">⏹</div><div class="lbl">BRAKE</div>', o.brake?.down));
  if (o.go?.show) els.push(c('go' + (o.go.pulse ? ' pulse' : ''), dx + 6 * s, dy - 112 * s, 70, '<div class="lbl" style="font-size:' + 16 * s + 'px">GO</div>'));
  els.push(c('look', o.lefty ? 40 + pad : o.w - 40 * s - pad, 40 * s + pad + 58 * s, 56, '<div class="ico" style="font-size:' + 20 * s + 'px">👀</div>'));
  els.push(c('pause', o.w / 2, 30 * s + 6, 50, '<div class="ico" style="font-size:' + 16 * s + 'px">II</div>'));
  return `<div class="gc gc-${o.variant}" style="--s:${s}">${els.join('')}</div>`;
}

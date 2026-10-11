import type { App } from '../../game/app';
import { hudRects, isPortrait, targetSize, toSaved, CONTROL_IDS, type Layout, type Rect } from '../../input/touch/layout';
import { button, h, type Screen } from '../ui';

/**
 * Settings → Touch controls → Edit layout. The real glass controls go into edit mode over the menu scene: drag a
 * control to move it, drag its yellow corner to resize it. HUD areas are no-go zones; the other controls make
 * room; nothing can leave the safe area. One layout per orientation (landscape / tablet portrait).
 */
export function touchLayoutScreen(app: App, back: () => void): Screen {
  const touch = app.input.touch;
  const s = app.saves.settings;
  touch.setMode(s.touchSteer === 'tilt' ? 'joystick' : s.touchSteer);
  touch.configure(s.touch, s.hudSize);
  touch.setAutoAccel(false); // show GO too, so it can be placed
  touch.show(true);
  const vp = touch.viewport();
  const orient = isPortrait(vp) ? 'portrait' : 'landscape';
  const hint = h('div', { class: 'hint' }, 'Drag a control to move it. Drag its yellow corner to make it bigger or smaller.');
  const bar = h('div', { class: 'tl-bar panel' }, h('div', { style: 'font-weight:900;font-size:15px;margin-bottom:2px' }, `✏️ Edit layout · ${orient}`), hint);
  const zones = hudRects(vp, s.touch.leftHanded).map((r) => h('div', { class: 'tl-nogo', style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` }, 'HUD'));
  let flash = 0;
  const hud = hudRects(vp, s.touch.leftHanded);
  /** Park the toolbar where it covers no control and no HUD (it moves out of the way as controls move). */
  const placeBar = (L: Layout): void => {
    const bw = bar.offsetWidth || 360;
    const bh = bar.offsetHeight || 110;
    const ys = [vp.h * 0.5, vp.h * 0.36, vp.h * 0.64, vp.h * 0.24, vp.h * 0.78];
    const xs = [vp.w / 2, vp.w * 0.38, vp.w * 0.62];
    const cover = (r: Rect): number => {
      let n = 0;
      for (const id of CONTROL_IDS) {
        const c = L[id];
        const rad = targetSize(c.d) / 2 + 6;
        const nx = Math.min(Math.max(c.x, r.x), r.x + r.w);
        const ny = Math.min(Math.max(c.y, r.y), r.y + r.h);
        if ((c.x - nx) ** 2 + (c.y - ny) ** 2 < rad * rad) n += 10;
      }
      for (const h2 of hud) if (r.x < h2.x + h2.w && r.x + r.w > h2.x && r.y < h2.y + h2.h && r.y + r.h > h2.y) n += 1;
      return n;
    };
    let best = { x: vp.w / 2, y: vp.h / 2, n: Infinity };
    for (const y of ys) {
      for (const x of xs) {
        const r = { x: x - bw / 2, y: Math.max(4, Math.min(vp.h - bh - 4, y - bh / 2)), w: bw, h: bh };
        const n = cover(r);
        if (n < best.n) best = { x, y: r.y + bh / 2, n };
        if (n === 0) break;
      }
      if (best.n === 0) break;
    }
    bar.style.left = `${best.x}px`;
    bar.style.top = `${best.y}px`;
  };
  touch.startEditing((L, blocked) => {
    placeBar(L);
    bar.classList.toggle('blocked', blocked);
    hint.textContent = blocked ? 'That spot is taken (the edge, the HUD or another control) — it will snap to the nearest free place.' : 'Drag a control to move it. Drag its yellow corner to make it bigger or smaller.';
    if (blocked) {
      window.clearTimeout(flash);
      flash = window.setTimeout(() => bar.classList.remove('blocked'), 600);
    }
  });
  const finish = (): void => {
    touch.stopEditing();
    touch.show(false);
    touch.setMode(s.touchSteer);
    back();
  };
  const save = (): void => {
    const L = touch.editedLayout;
    if (L) {
      const def = touch.defaultFor(vp);
      s.touch = { ...s.touch, layout: { ...(s.touch.layout ?? {}), [orient]: toSaved(L, def, vp, s.touch.leftHanded) } };
      app.saveSettings();
      app.toast('Layout saved');
    }
    finish();
  };
  const reset = (): void => {
    const layout = { ...(s.touch.layout ?? {}) };
    delete layout[orient];
    s.touch = { ...s.touch, layout: layout.landscape || layout.portrait ? layout : undefined };
    app.saveSettings();
    touch.stopEditing();
    touch.configure(s.touch, s.hudSize);
    touch.startEditing((L, blocked) => {
      placeBar(L);
      bar.classList.toggle('blocked', blocked);
    });
    if (touch.editedLayout) placeBar(touch.editedLayout);
  };
  bar.appendChild(h('div', { class: 'menu-row', style: 'justify-content:center;margin-top:8px' }, button('Save ✓', save, 'small yellow'), button('Reset to default', reset, 'small'), button('Cancel', finish, 'small ghost')));
  const el = h('div', { class: 'touch-editor' }, ...zones, bar);
  requestAnimationFrame(() => touch.editedLayout && placeBar(touch.editedLayout));
  // while a control is being dragged the toolbar steps back (it never catches the finger)
  const dragging = (on: boolean): void => {
    bar.classList.toggle('dragging', on);
  };
  touch.onEditDrag = dragging;
  return {
    el,
    onBack: finish,
    fullCover: false,
    focus: bar.querySelector('.yellow') as HTMLElement,
    onExit: () => {
      touch.onEditDrag = undefined;
      if (touch.isEditing) touch.stopEditing();
    },
  };
}

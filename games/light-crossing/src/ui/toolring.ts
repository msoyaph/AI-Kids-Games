// Radial tool picker.
import type { App } from '../app';
import { item } from '../data/registry';
import type { Command } from '../input/input';
import { equipKind, ownedToolKinds, putAway, TOOL_LABEL, TOOL_ORDER } from '../sim/tools';
import { h, type Panel } from './dom';
import { iconImg } from './icons';

export function toolRing(app: App): Panel {
  const g = app.game!;
  const kinds = ownedToolKinds(g);
  const ring = h('div', { class: 'ring' });
  const p: Panel = {
    modal: true,
    el: h('div', { class: 'screen' }, h('div', { class: 'dim', onclick: () => app.ui.pop(p) }), ring),
    command(c: Command) {
      if (c === 'toolRing') {
        app.ui.pop(p);
        return true;
      }
      return false;
    },
  };
  const all = [...TOOL_ORDER.filter((k) => kinds.includes(k)), 'none' as const];
  // as big as the screen allows (inside the safe area), but never so tight the buttons touch
  const safe = app.hudLayout.safe();
  const room = Math.min(safe.right - safe.left, safe.bottom - safe.top);
  const R = Math.max(Math.min(150, (room - 96) / 2), 46 / Math.sin(Math.PI / Math.max(3, all.length)));
  const cx = (safe.left + safe.right) / 2, cy = (safe.top + safe.bottom) / 2;
  all.forEach((k, i) => {
    const a = (i / all.length) * Math.PI * 2 - Math.PI / 2;
    const slot = k === 'none' ? null : g.state.player.inv.find((s) => s && item(s.id).tool?.kind === k);
    const b = h('button', { class: 'ring-btn', 'data-nav': '', style: `left:${cx + Math.cos(a) * R}px;top:${cy + Math.sin(a) * R}px` }, slot ? iconImg(slot.id) : h('span', { style: 'font-size:26px;color:#8a7a96' }, '○'), h('div', { class: 'tiny' }, k === 'none' ? 'Hands' : TOOL_LABEL[k]));
    b.addEventListener('click', () => {
      if (k === 'none') putAway(g);
      else equipKind(g, k);
      app.ui.pop(p);
    });
    ring.append(b);
  });
  if (!kinds.length) ring.append(h('div', { class: 'panel center', style: 'padding:16px' }, 'No tools yet — craft some at a workbench!'));
  return p;
}

/** Crafting & cooking screens, machine input picker, skills tab, perk choice, radio, special items. */
import { TILE } from '../core/math';
import { tryItem } from '../data/items';
import { MACHINE } from '../data/machines';
import { CRAFT, CRAFTS, DISHES } from '../data/recipes';
import { SKILL_DEFS } from '../data/skills';
import { placeHooks } from '../sim/actions';
import { DISH, choosePerk, cook, craft, hasIngredients, haveCount, ingredientName, pendingPerk, radioShow } from '../sim/crafting';
import { canDescend, enterFloor } from '../sim/mine';
import { loadMachine, machineInputs, minutesLeft } from '../sim/machines';
import { remove } from '../sim/inventory';
import { combat, hitCritter } from '../sim/critters';
import { mineHooks } from '../sim/tools';
import { level, levelProgress, MAX_LEVEL } from '../sim/skills';
import type { WorldObject } from '../sim/types';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { iconName, itemName } from '../ui/itemview';
import { registerTab } from '../ui/menu';
import { HOOKS, type Game } from './game';

placeHooks.push((sim, id) => {
  if (id === 'beeHouse' && !sim.here.def.outdoor) return { ok: false, msg: 'Bee houses need to go outside, near flowers!' };
  return null;
});

function ingRow(g: Game, ing: [string, number][]): HTMLElement {
  const row = h('div', { class: 'ing' });
  for (const [key, n] of ing) {
    const have = haveCount(g.sim.p.inv, key);
    const ok = have >= n;
    const ico = key.includes(':') ? 'ui.bag' : iconName(key);
    row.appendChild(h('span', { class: 'ing-i' + (ok ? '' : ' miss'), title: ingredientName(key) }, icon(ico, 16), ` ${Math.min(have, 999)}/${n} ${ingredientName(key)}`));
  }
  return row;
}

function craftTab(g: Game, rerender: () => void): HTMLElement {
  const sim = g.sim;
  const el = h('div');
  el.appendChild(h('p', { style: 'margin:0 0 8px' }, 'Make things with what you\'ve gathered! Level up your skills to learn more recipes.'));
  const rows = h('div', { class: 'rows' });
  const known = CRAFTS.filter((c) => sim.p.crafts.includes(c.id));
  const sorted = [...known.filter((c) => hasIngredients(sim.p.inv, c.ing)), ...known.filter((c) => !hasIngredients(sim.p.inv, c.ing))];
  for (const c of sorted) {
    const out = c.out ?? c.id;
    const ok = hasIngredients(sim.p.inv, c.ing);
    const btn = h('button', { class: 'btn small green', disabled: !ok }, 'Make');
    btn.addEventListener('click', () => {
      const r = craft(sim, c.id);
      if (r.ok) {
        g.sfx('craft');
        g.toasts.pickup(iconName(out), `+${c.n ?? 1} ${itemName(out)}`);
        rerender();
      } else if (r.msg) g.toasts.show(r.msg);
    });
    rows.appendChild(h('div', { class: 'row' + (ok ? '' : ' locked') }, icon(iconName(out), 32), h('div', { class: 'nm' }, h('b', null, `${itemName(out)}${(c.n ?? 1) > 1 ? ` ×${c.n}` : ''}`), h('small', null, tryItem(out)?.desc ?? ''), ingRow(g, c.ing)), btn));
  }
  const locked = CRAFTS.length - known.length;
  el.appendChild(rows);
  el.appendChild(h('p', { class: 'hint', style: 'font-size:.85em;color:var(--ink2)' }, `${known.length} recipes known · ${locked} more to discover`));
  return el;
}

export function openKitchen(g: Game): void {
  const sim = g.sim;
  let close = () => {};
  const wrap = h('div', { class: 'wide-modal' });
  const render = () => {
    wrap.innerHTML = '';
    wrap.appendChild(h('h2', null, 'Kitchen'));
    const known = DISHES.filter((d) => sim.p.recipes.includes(d.id));
    wrap.appendChild(h('p', { style: 'margin:0 0 6px' }, `You know ${known.length} of ${DISHES.length} recipes. Learn more from friends, the radio on Restdays, and your Cooking skill!`));
    const rows = h('div', { class: 'rows' });
    const sorted = [...known.filter((d) => hasIngredients(sim.p.inv, d.ing)), ...known.filter((d) => !hasIngredients(sim.p.inv, d.ing))];
    for (const d of sorted) {
      const ok = hasIngredients(sim.p.inv, d.ing);
      const btn = h('button', { class: 'btn small green', disabled: !ok }, 'Cook');
      btn.addEventListener('click', () => {
        const r = cook(sim, d.id);
        if (r.ok) {
          g.sfx('cook');
          g.toasts.pickup(iconName(d.id), `+1 ${d.name}`);
          render();
        } else if (r.msg) g.toasts.show(r.msg);
      });
      rows.appendChild(h('div', { class: 'row' + (ok ? '' : ' locked') }, icon(iconName(d.id), 32), h('div', { class: 'nm' }, h('b', null, d.name), h('small', null, `+${d.energy} energy${d.buff ? ' · gives a boost' : ''}${sim.state.col.cooked[d.id] ? ` · made ${sim.state.col.cooked[d.id]}×` : ''}`), ingRow(g, d.ing)), btn));
    }
    wrap.appendChild(rows);
    wrap.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn green', onclick: () => close() }, 'Done')));
  };
  render();
  close = g.modals.show(wrap, { cancel: () => {} });
  g.sfx('open');
}

function machinePicker(g: Game, o: WorldObject, x: number, y: number): void {
  const sim = g.sim;
  const m = MACHINE[o.id];
  if (!m) return;
  if (o.inp || (m.auto && o.t !== undefined && !o.out)) {
    const left = minutesLeft(o);
    const hrs = Math.ceil(left / 60);
    g.toasts.show(`${m.name} is busy${o.inp ? ` with ${itemName(o.inp)}` : ''}. Ready in about ${hrs >= 24 ? Math.ceil(hrs / 24) + ' day' + (hrs >= 48 ? 's' : '') : hrs + ' hour' + (hrs !== 1 ? 's' : '')}!`, 'obj.bubble.busy');
    return;
  }
  if (m.auto) {
    g.toasts.show(m.desc);
    return;
  }
  const opts = machineInputs(sim, o.id);
  let close = () => {};
  const rows = h('div', { class: 'rows' });
  if (!opts.length) rows.appendChild(h('p', null, `Nothing in your bag fits. ${m.desc}`));
  const seen = new Set<string>();
  for (const { slot, rule } of opts) {
    const s = sim.p.inv[slot]!;
    const key = s.id + '|' + s.q;
    if (seen.has(key)) continue;
    seen.add(key);
    const btn = h('button', { class: 'btn small green' }, 'Use');
    btn.addEventListener('click', () => {
      const r = loadMachine(sim, o, slot);
      close();
      if (r.ok) {
        g.sfx('machine');
        sim.here.touch(x, y);
      } else if (r.msg) g.toasts.show(r.msg);
    });
    const extra = (rule.extra ?? []).map(([e, n]) => ` + ${n} ${itemName(e)}`).join('');
    rows.appendChild(h('div', { class: 'row' }, icon(iconName(s.id), 32), icon('ui.menu', 16), icon(iconName(rule.out.id), 32), h('div', { class: 'nm' }, h('b', null, `${rule.use ?? 1} ${itemName(s.id)}${extra} → ${itemName(rule.out.id)}`), h('small', null, `Takes about ${Math.max(1, Math.round(rule.minutes / 60))} hours`)), btn));
  }
  close = g.modals.show(h('div', { class: 'wide-modal' }, h('h2', null, m.name), h('p', { style: 'margin:0 0 6px' }, m.desc), rows, h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => close() }, 'Close'))), { cancel: () => {} });
}

function skillsTab(g: Game): HTMLElement {
  const sim = g.sim;
  const el = h('div', { class: 'skills' });
  for (const sd of SKILL_DEFS) {
    const lv = level(sim, sd.id);
    const prog = levelProgress(sim.p.xp[sd.id] ?? 0);
    const perks = sd.perks.flat().filter((p) => sim.p.perks.includes(p.id));
    el.appendChild(
      h('div', { class: 'skill panel' },
        icon(sd.icon, 32),
        h('div', { class: 'si' },
          h('b', null, `${sd.name} · Level ${lv}${lv >= MAX_LEVEL ? ' ⭐' : ''}`),
          h('small', null, sd.desc),
          h('div', { class: 'lvl' }, h('div', { class: 'fill', style: `width:${Math.round((lv >= MAX_LEVEL ? 1 : prog) * 100)}%` })),
          perks.length ? h('small', null, 'Perks: ' + perks.map((p) => `${p.name} (${p.desc})`).join(' · ')) : h('small', null, 'Choose a perk at levels 5 and 10!'),
        ),
      ),
    );
  }
  return el;
}

export function offerPerk(g: Game, then?: () => void): boolean {
  const pend = pendingPerk(g.sim);
  if (!pend) return false;
  const sd = SKILL_DEFS.find((s) => s.id === pend.skill)!;
  const [a, b] = sd.perks[pend.tier];
  const pick = (id: string) => {
    choosePerk(g.sim, id);
    g.sfx('fanfare');
    if (!offerPerk(g, then)) then?.();
  };
  let close = () => {};
  close = g.modals.ask(`${sd.name} level ${pend.tier === 0 ? 5 : 10}!`, h('div', null,
    h('p', null, 'Choose a perk. Both are great — pick the one that fits how you like to play!'),
    h('div', { class: 'perks' },
      h('button', { class: 'perk panel', onclick: () => { close(); pick(a.id); } }, h('b', null, a.name), h('span', null, a.desc)),
      h('button', { class: 'perk panel', onclick: () => { close(); pick(b.id); } }, h('b', null, b.name), h('span', null, b.desc)),
    ),
  ), [], false);
  return true;
}

function useSpecial(g: Game, id: string): void {
  const sim = g.sim;
  switch (id) {
    case 'homeWhistle': {
      remove(sim.p.inv, id, 1);
      g.sfx('whistle');
      void g.fader.out('Whee!', 300).then(() => {
        sim.state.mine.floor = 0;
        sim.warpTo('farm', 29, 10, 0);
        g.enterLocation();
        void g.fader.in(300);
      });
      return;
    }
    case 'ropeLadder': {
      if (sim.p.loc !== 'mine') return void g.toasts.show('Use the rope ladder inside the mine.');
      const r = canDescend(sim);
      if (!r.ok) return void g.toasts.show(r.msg ?? '');
      remove(sim.p.inv, id, 1);
      enterFloor(sim, sim.state.mine.floor + 1);
      g.enterLocation();
      return;
    }
    case 'popBomb': {
      if (sim.p.loc !== 'mine' && sim.p.loc !== 'quarry') return void g.toasts.show('Pop Bombs only work in the mine or the quarry.');
      remove(sim.p.inv, id, 1);
      const t = sim.playerTile();
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 5) continue;
          for (let k = 0; k < 6; k++) if (!mineHooks.hit(sim, sim.here, t.x + dx, t.y + dy, 9)) break;
        }
      for (const c of combat(sim).critters) if (!c.dead && Math.hypot(c.x - sim.p.x, c.y - sim.p.y) < 40) hitCritter(sim, c, 2, c.x - sim.p.x, c.y - sim.p.y);
      g.fx.burst(g.atlas.tex('fx.spark'), sim.p.x, sim.p.y - 8, 24, { color: 0xfff0a0, speed: 120, up: 40, life: 0.6, gravity: 60 });
      g.sfx('pop');
      g.shake(5);
      return;
    }
    case 'rainCharm': {
      remove(sim.p.inv, id, 1);
      sim.state.tomorrow = Math.floor(sim.state.day / 10) % 4 === 3 ? 'snow' : 'rain';
      g.sfx('magic');
      g.toasts.show('You hear distant thunder... it will rain tomorrow!', 'ui.rain');
      return;
    }
  }
}

export function installCrafting(_g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.ing { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; font-size: .82em; }
.ing-i { display: inline-flex; align-items: center; gap: 2px; }
.ing-i.miss { color: var(--rose); }
.skills { display: flex; flex-direction: column; gap: 8px; max-height: 56vh; overflow: auto; }
.skill { display: flex; gap: 10px; padding: 8px; align-items: flex-start; box-shadow: none; }
.skill .si { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.skill small { color: var(--ink2); font-size: .82em; }
.lvl { height: 10px; background: var(--paper2); border-radius: 5px; overflow: hidden; border: 2px solid var(--paper3); }
.lvl .fill { height: 100%; background: linear-gradient(90deg, #9fdc84, #5cae4c); }
.perks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.perk { font: inherit; text-align: left; padding: 10px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; min-height: 90px; }
.perk:hover { outline: 3px solid var(--sun); }
@media (max-width: 480px) { .perks { grid-template-columns: 1fr; } }
`;
  document.head.appendChild(style);
  registerTab({ id: 'craft', label: 'Craft', icon: 'item.chest', render: (host, rerender) => craftTab(host as unknown as Game, rerender) }, 1);
  registerTab({ id: 'skills', label: 'Skills', icon: 'ui.star2', render: (host) => skillsTab(host as unknown as Game) }, 2);
  HOOKS.trigger.kitchen = (game) => openKitchen(game);
  HOOKS.trigger.radio = (game) => {
    const r = radioShow(game.sim);
    game.sfx(r.recipe ? 'fanfare' : 'radio');
    game.modals.ask('Valley Radio', r.text, [{ label: 'Click', primary: true }]);
  };
  HOOKS.inspect.push((game, o, x, y) => {
    if (o.k !== 'machine' && o.k !== 'beehouse') return false;
    machinePicker(game, o, x, y);
    return true;
  });
  HOOKS.useItem = (game, id) => useSpecial(game, id);
  HOOKS.afterDay.push((game, next) => {
    if (!offerPerk(game, next)) next();
  });
  void TILE;
  void CRAFT;
  void DISH;
}

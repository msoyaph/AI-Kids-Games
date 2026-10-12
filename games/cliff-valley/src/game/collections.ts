/** Collections tab, museum donations & displays, achievement toasts, year-two goals. */
import { Sprite } from 'pixi.js';
import { TILE } from '../core/math';
import { ACHIEVEMENTS, ACHIEVEMENT } from '../data/achievements';
import { FISH } from '../data/fish';
import { ITEMS, tryItem } from '../data/items';
import { DISHES } from '../data/recipes';
import { MUSEUM_LIST, MUSEUM_REWARDS, canDonate, checkAchievements, donateToMuseum, farmRating } from '../sim/collections';
import { canShip } from '../sim/economy';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { iconName, itemName } from '../ui/itemview';
import { registerTab } from '../ui/menu';
import { HOOKS, type Game } from './game';
import { keeperAtCounter } from '../sim/npcs';
import { JOURNAL } from './villagers';

type Sub = 'ship' | 'fish' | 'museum' | 'cook' | 'ach';
let sub: Sub = 'ship';

function cell(g: Game, id: string, have: boolean, extra?: string): HTMLElement {
  const el = h('div', { class: 'col-cell' + (have ? '' : ' no'), title: have ? `${itemName(id)}${extra ? ' — ' + extra : ''}` : '???' }, icon(iconName(id), 32));
  el.addEventListener('click', () => g.toasts.show(have ? `${itemName(id)}${extra ? ' — ' + extra : ''}` : 'Not found yet!'));
  return el;
}

function collectionsTab(g: Game, rerender: () => void): HTMLElement {
  const st = g.sim.state;
  const el = h('div');
  const tabs = h('div', { class: 'tabs' });
  const subs: [Sub, string][] = [['ship', 'Shipped'], ['fish', 'Fish'], ['museum', 'Museum'], ['cook', 'Cooking'], ['ach', 'Achievements']];
  for (const [k, label] of subs) {
    const b = h('button', { class: 'tab' + (sub === k ? ' on' : '') }, label);
    b.addEventListener('click', () => {
      sub = k;
      rerender();
    });
    tabs.appendChild(b);
  }
  el.appendChild(tabs);
  const grid = h('div', { class: 'col-grid' });
  let count = 0, total = 0;
  if (sub === 'ship') {
    const ids = Object.values(ITEMS).filter((d) => canShip(d.id) && ['crop', 'fruit', 'flower', 'forage', 'animal', 'artisan', 'fish', 'crab', 'mineral', 'gem', 'food'].includes(d.cat) && !d.id.startsWith('juice.') && !d.id.startsWith('jam.') && !d.id.startsWith('pickles.')).map((d) => d.id);
    for (const id of ids) {
      const n = st.col.shipped[id] ?? 0;
      if (n) count++;
      total++;
      grid.appendChild(cell(g, id, n > 0, n ? `shipped ${n}` : undefined));
    }
  } else if (sub === 'fish') {
    for (const f of FISH) {
      const n = st.col.fish[f.id] ?? 0;
      if (n) count++;
      total++;
      grid.appendChild(cell(g, f.id, n > 0, n ? `caught ${n} · biggest ${st.col.fishSize[f.id]} cm` : undefined));
    }
  } else if (sub === 'museum') {
    for (const id of MUSEUM_LIST) {
      const have = st.col.museum.includes(id);
      if (have) count++;
      total++;
      grid.appendChild(cell(g, id, have, have ? 'donated' : undefined));
    }
  } else if (sub === 'cook') {
    for (const d of DISHES) {
      const n = st.col.cooked[d.id] ?? 0;
      if (n) count++;
      total++;
      grid.appendChild(cell(g, d.id, n > 0, n ? `cooked ${n}` : g.sim.p.recipes.includes(d.id) ? 'recipe known' : undefined));
    }
  } else {
    const list = h('div', { class: 'rows' });
    for (const a of ACHIEVEMENTS) {
      const have = st.achievements.includes(a.id);
      if (have) count++;
      total++;
      list.appendChild(h('div', { class: 'row' + (have ? '' : ' locked') }, icon(a.icon, 32), h('div', { class: 'nm' }, h('b', null, have ? `🏆 ${a.name}` : a.name), h('small', null, a.desc))));
    }
    el.appendChild(h('p', { style: 'margin:4px 0' }, `${count} / ${total} achievements`));
    el.appendChild(list);
    return el;
  }
  el.appendChild(h('p', { style: 'margin:4px 0' }, `${count} / ${total} collected`));
  el.appendChild(grid);
  return el;
}

function openMuseum(g: Game): void {
  const sim = g.sim;
  let close = () => {};
  const wrap = h('div', { class: 'wide-modal' });
  const render = () => {
    wrap.innerHTML = '';
    const n = sim.state.col.museum.length;
    const next = MUSEUM_REWARDS.find(([k]) => k > n);
    wrap.append(
      h('h2', null, 'Valley Museum'),
      h('p', { style: 'margin:0 0 6px' }, `"Splendid! Each donation helps rebuild our collection — 'collection' meaning a careful group of special things!" You've donated ${n} of ${MUSEUM_LIST.length}.${next ? ` Next reward at ${next[0]}: ${next[1].text}.` : ''}`),
    );
    const rows = h('div', { class: 'rows' });
    const seen = new Set<string>();
    sim.p.inv.forEach((s) => {
      if (!s || seen.has(s.id) || !canDonate(sim, s.id)) return;
      seen.add(s.id);
      const btn = h('button', { class: 'btn small green' }, 'Donate');
      btn.addEventListener('click', () => {
        const r = donateToMuseum(sim, s.id);
        if (!r.ok) return;
        g.sfx('fanfare');
        g.toasts.show(`Donated ${itemName(s.id)}! Thank you!`, iconName(s.id));
        if (r.reward) g.modals.ask('A thank-you gift!', `Professor Ottilie gives you ${r.reward} for helping the museum!`, [{ label: 'Wonderful!', primary: true }]);
        checkAchievements(sim);
        sim.here.objVersion++;
        render();
      });
      rows.appendChild(h('div', { class: 'row' }, icon(iconName(s.id), 32), h('div', { class: 'nm' }, h('b', null, itemName(s.id)), h('small', null, tryItem(s.id)?.desc ?? '')), btn));
    });
    if (!seen.size) rows.appendChild(h('p', null, 'You have nothing new to donate right now. Find minerals in the mine, crack geodes, and dig up dig spots!'));
    wrap.append(rows, h('div', { class: 'actions' }, h('button', { class: 'btn green', onclick: () => close() }, 'Done')));
  };
  render();
  close = g.modals.show(wrap, { cancel: () => {} });
}

/** Show donated items on the museum's pedestals and cases. */
let shelfSprites: Sprite[] = [];
function museumDisplay(g: Game): void {
  for (const s of shelfSprites) s.removeFromParent();
  shelfSprites = [];
  const sim = g.sim;
  if (sim.p.loc !== 'museum') return;
  const loc = sim.here;
  const spots = loc.def.props.filter((p) => p.kind === 'pedestal' || p.kind === 'case');
  sim.state.col.museum.slice(0, spots.length).forEach((id, i) => {
    const p = spots[i];
    const s = new Sprite(g.atlas.tex(iconName(id)));
    s.anchor.set(0.5, 1);
    s.scale.set(0.75);
    s.x = p.x * TILE + 8;
    s.y = p.y * TILE + (p.kind === 'case' ? 8 : 6);
    s.zIndex = (p.y + 1) * TILE + 1;
    s.label = 'nocull';
    g.view.sorted.addChild(s);
    shelfSprites.push(s);
  });
}

export function installCollections(_g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.col-grid { display: grid; grid-template-columns: repeat(auto-fill, 44px); gap: 4px; max-height: 50vh; overflow: auto; justify-content: center; }
.col-cell { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--paper2); border-radius: 6px; cursor: pointer; }
.col-cell.no .ico { filter: brightness(0) opacity(.25); }
.rating { font-size: 1.4em; color: #e4a020; letter-spacing: 2px; }
`;
  document.head.appendChild(style);
  registerTab({ id: 'collections', label: 'Collections', icon: 'ui.star3', render: (host, rerender) => collectionsTab(host as unknown as Game, rerender) }, 4);
  HOOKS.trigger.museum = (game) => {
    if (!keeperAtCounter(game.sim, 'museum', 'ottilie')) {
      game.toasts.show('Professor Ottilie isn\'t at the desk right now.');
      return;
    }
    openMuseum(game);
  };
  HOOKS.onEnter.push((game) => museumDisplay(game));
  HOOKS.onAttach.push((game) => {
    game.sim.ev.on('achievement', (e) => {
      const a = ACHIEVEMENT[e.id];
      game.toasts.show(`🏆 Achievement: ${a.name}!`, a.icon, 4500);
      game.sfx('achievement');
    });
  });
  JOURNAL.push((game) => {
    const sim = game.sim;
    if (!sim.state.story.finale && sim.state.day < 40) return null;
    const r = farmRating(sim);
    const sec = h('div', null, h('h3', { style: 'margin:12px 0 6px' }, 'Year 2 Goals'), h('div', { class: 'rating', 'aria-label': `${r.stars} of 5 stars` }, '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)), h('p', { style: 'margin:2px 0 6px;font-size:.9em' }, r.stars >= 5 ? 'A perfect farm! Rosemary would be beaming.' : 'Work toward a perfect 5-star farm rating!'));
    for (const p of r.parts) sec.appendChild(h('div', { class: 'row' }, h('div', { class: 'nm' }, h('b', null, `${p.name}: ${p.got}/${p.max}`), h('small', null, p.got >= p.max ? '✅ Done!' : p.tip))));
    return sec;
  });
}

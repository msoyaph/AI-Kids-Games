// Service panels: crafting, shop, Lantern Hall, storage, museum desk, exhibits, notice board.
import { fmt } from '../core/math';
import { RECIPE_BY_ID, RECIPES, item } from '../data/registry';
import type { RecipeDef } from '../data/types';
import { canCraft, craft, ingredientStatus, knowsRecipe } from '../sim/crafting';
import { buy, canSell, dailyStock, hotItem, sellPrice, sellSlot, type StockEntry } from '../sim/economy';
import type { Game } from '../sim/game';
import { canOrderUpgrade, homeTier, nextUpgrade, orderUpgrade, payLoan } from '../sim/housing';
import { takeFromStorage, putInStorage } from '../sim/inventory';
import { assessFossil, canDonate, donateSlot, museumPercent, wingCount, WING_TOTAL } from '../sim/museum';
import type { Display } from '../sim/interior';
import { findStructure } from '../sim/structures';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';
import { InventoryPanel, slotButton } from './inventory';

function frame(title: string, body: HTMLElement, onClose: () => void, width = 'min(720px, 96vw)', extraHead?: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'dim' }),
    h(
      'div',
      { class: 'panel center', style: `width:${width};max-height:90vh;display:flex;flex-direction:column;padding:18px` },
      h('h2', null, title, h('span', { class: 'spacer' }), extraHead ?? null, btn('✕', onClose, 'small ghost')),
      body,
    ),
  );
}

// ---------------- crafting ----------------

const CRAFT_TABS: { id: string; label: string; test: (r: RecipeDef) => boolean }[] = [
  { id: 'tools', label: 'Tools', test: (r) => !!item(r.result).tool || r.result === 'lantern_kit' },
  { id: 'indoor', label: 'Furniture', test: (r) => item(r.result).cat === 'furniture' && !item(r.result).furn?.outdoor },
  { id: 'outdoor', label: 'Outdoor', test: (r) => !!item(r.result).furn?.outdoor },
  { id: 'other', label: 'Other', test: (r) => !item(r.result).tool && item(r.result).cat !== 'furniture' && r.result !== 'lantern_kit' },
];

export class CraftPanel implements Panel {
  name = 'craft';
  el: HTMLElement;
  modal = true;
  private tab = 'tools';
  private list = h('div', { class: 'craft-list scroll' });
  private detail = h('div', { class: 'craft-detail' });
  private tabs = h('div', { class: 'tabs' });
  private sel = '';
  constructor(private ui: UIManager, private g: Game) {
    const body = h('div', { class: 'craft' }, this.tabs, h('div', { class: 'craft-body' }, this.list, this.detail));
    this.el = frame('Workbench', body, () => ui.pop(this), 'min(820px, 96vw)');
    const firstWithRecipes = CRAFT_TABS.find((t) => RECIPES.some((r) => knowsRecipe(g, r.id) && t.test(r)));
    if (firstWithRecipes) this.tab = firstWithRecipes.id;
    this.render();
  }
  command(c: string): boolean {
    if (c === 'tabNext' || c === 'tabPrev') {
      const i = CRAFT_TABS.findIndex((t) => t.id === this.tab);
      this.tab = CRAFT_TABS[(i + (c === 'tabNext' ? 1 : CRAFT_TABS.length - 1)) % CRAFT_TABS.length]!.id;
      this.sel = '';
      this.render();
      return true;
    }
    return false;
  }
  render(): void {
    clear(this.tabs);
    for (const t of CRAFT_TABS) {
      const n = RECIPES.filter((r) => knowsRecipe(this.g, r.id) && t.test(r)).length;
      this.tabs.append(btn(`${t.label} ${n}`, () => {
        this.tab = t.id;
        this.sel = '';
        this.render();
      }, `small ${this.tab === t.id ? 'primary' : ''}`));
    }
    clear(this.list);
    const tab = CRAFT_TABS.find((t) => t.id === this.tab)!;
    const known = RECIPES.filter((r) => knowsRecipe(this.g, r.id) && tab.test(r));
    if (!known.length) this.list.append(h('div', { class: 'muted', style: 'padding:12px' }, 'No recipes here yet. Find recipe bottles on the beach, help neighbors, and follow the story to learn more!'));
    for (const r of known) {
      const ok = canCraft(this.g, r);
      const row = h('button', { class: `craft-row ${ok ? '' : 'missing'} ${this.sel === r.id ? 'sel' : ''}`, 'data-nav': '' }, iconImg(r.result, 'icon'), h('span', { class: 'nm' }, item(r.result).name), ok ? h('span', { class: 'tag', style: 'background:#e3f6f3' }, 'Ready') : null);
      row.addEventListener('click', () => {
        this.sel = r.id;
        this.showDetail(r);
        this.list.querySelectorAll('.craft-row').forEach((e) => e.classList.remove('sel'));
        row.classList.add('sel');
      });
      row.addEventListener('focus', () => this.showDetail(r));
      this.list.append(row);
    }
    const r = RECIPE_BY_ID[this.sel] ?? known[0];
    if (r) this.showDetail(r);
    else clear(this.detail);
    this.ui.focusFirst(this);
  }
  private showDetail(r: RecipeDef): void {
    clear(this.detail);
    const def = item(r.result);
    const st = ingredientStatus(this.g, r);
    this.detail.append(
      h('div', { class: 'row' }, iconImg(r.result, 'icon big'), h('div', null, h('div', { style: 'font-weight:800;font-size:18px' }, def.name, (r.qty ?? 1) > 1 ? ` ×${r.qty}` : ''), h('div', { class: 'muted tiny' }, def.desc))),
      h('h3', null, 'Materials'),
      h(
        'div',
        { class: 'col', style: 'gap:6px' },
        st.map((m) => h('div', { class: `ing ${m.have >= m.need ? 'ok' : 'no'}` }, iconImg(m.id, 'icon sm'), h('span', { style: 'flex:1' }, item(m.id).name), h('b', null, `${m.have}/${m.need}`))),
      ),
    );
    const b = btn('Craft!', () => {
      if (craft(this.g, r.id)) {
        this.sel = r.id;
        this.render();
      }
    }, 'primary');
    if (!canCraft(this.g, r)) b.disabled = true;
    this.detail.append(h('div', { style: 'margin-top:12px' }, b));
  }
}

// ---------------- shop ----------------

export class ShopPanel implements Panel {
  name = 'shop';
  el: HTMLElement;
  modal = true;
  private mode: 'buy' | 'sell' = 'buy';
  private body = h('div', { class: 'col scroll', style: 'gap:8px;min-height:280px' });
  private picked = new Set<number>();
  private stock: StockEntry[];
  private off: () => void;
  private buyBtn!: HTMLButtonElement;
  private sellBtn!: HTMLButtonElement;
  constructor(private ui: UIManager, private g: Game) {
    const stage = findStructure(g, 'shop') ? 'shop' : 'cart';
    this.stock = dailyStock(g, stage);
    this.buyBtn = btn('Buy', () => this.setMode('buy'), 'small primary');
    this.sellBtn = btn('Sell', () => this.setMode('sell'), 'small');
    const head = h('div', { class: 'row' }, this.buyBtn, this.sellBtn);
    this.el = frame(stage === 'shop' ? 'The Curled Leaf' : "Fennimore's Cart", h('div', { class: 'col' }, h('div', { class: 'speech' }, h('b', null, 'Fennimore: '), stage === 'shop' ? 'Welcome, welcome! Everything is curled, cozy and fairly priced.' : 'Psst! Fine wares from my trusty cart. I buy just about anything, too!'), head, this.body), () => ui.pop(this), 'min(720px, 96vw)');
    this.off = g.bus.on('money', () => ui.has(this) && this.render());
    this.render();
  }
  onClose(): void {
    this.off();
  }
  command(c: string): boolean {
    if (c === 'tabNext' || c === 'tabPrev') {
      this.setMode(this.mode === 'buy' ? 'sell' : 'buy');
      return true;
    }
    return false;
  }
  private setMode(m: 'buy' | 'sell'): void {
    this.mode = m;
    this.buyBtn.classList.toggle('primary', m === 'buy');
    this.sellBtn.classList.toggle('primary', m === 'sell');
    this.picked.clear();
    this.render();
  }
  render(): void {
    clear(this.body);
    const g = this.g;
    this.body.append(h('div', { class: 'row' }, h('div', { class: 'pill' }, h('span', { class: 'glint' }, '✦'), fmt(g.state.player.glints)), h('span', { class: 'muted tiny' }, `Today's hot item: ${item(hotItem(g)).name} (sells for double!)`)));
    if (this.mode === 'buy') {
      const grid = h('div', { class: 'shop-grid' });
      for (const e of this.stock) {
        const sold = e.limited && g.state.shop.sold.includes(e.id);
        const card = h('button', { class: `shop-card ${sold ? 'sold' : ''}`, 'data-nav': '' }, iconImg(e.id, 'icon big'), h('div', { class: 'nm' }, item(e.id).name), h('div', { class: 'price' }, sold ? 'Sold out' : `✦ ${fmt(e.price)}`));
        if (sold) card.setAttribute('disabled', '');
        card.addEventListener('click', () => {
          if (sold) return;
          if (buy(g, e)) this.render();
        });
        grid.append(card);
      }
      this.body.append(grid);
    } else {
      const grid = h('div', { class: 'inv-grid' });
      const p = g.state.player;
      let total = 0;
      for (let i = 0; i < p.invSize; i++) {
        const s = p.inv[i];
        const ok = !!s && canSell(s.id) && i !== p.equipped;
        const b = slotButton(g, i, s, `${this.picked.has(i) ? 'picked' : ''} ${ok ? '' : 'locked'}`);
        if (s && this.picked.has(i)) total += sellPrice(g, s.id) * s.qty;
        b.addEventListener('click', () => {
          if (!ok) return;
          if (this.picked.has(i)) this.picked.delete(i);
          else this.picked.add(i);
          this.render();
          const again = this.body.querySelector(`[data-slot="${i}"]`) as HTMLElement | null;
          if (again) this.ui.focus(again);
        });
        if (s) b.title = `${item(s.id).name} — ✦ ${fmt(sellPrice(g, s.id))} each`;
        grid.append(b);
      }
      const sellBtn = btn(`Sell selected for ✦ ${fmt(total)}`, () => {
        const slots = [...this.picked].sort((a, b) => b - a);
        let earned = 0;
        for (const i of slots) earned += sellSlot(g, i);
        this.picked.clear();
        if (earned > 0) g.toast(`Sold for ${fmt(earned)} Glints!`, 'good');
        this.render();
      }, 'primary');
      if (!this.picked.size) sellBtn.disabled = true;
      const quick = h('div', { class: 'row wrap' });
      for (const [label, cats] of [
        ['All fish', ['fish']],
        ['All bugs', ['bug']],
        ['All fruit', ['fruit']],
        ['All shells', ['shell']],
      ] as const) {
        quick.append(btn(label, () => {
          p.inv.forEach((s, i) => {
            if (s && (cats as readonly string[]).includes(item(s.id).cat) && canSell(s.id)) this.picked.add(i);
          });
          this.render();
        }, 'small'));
      }
      this.body.append(h('div', { class: 'muted tiny' }, 'Pick items to sell (fish and bugs you have not donated yet are worth showing the museum first!)'), grid, quick, h('div', { class: 'row' }, sellBtn));
    }
    this.ui.focusFirst(this);
  }
}

// ---------------- Lantern Hall ----------------

export class HallPanel implements Panel {
  name = 'hall';
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'col', style: 'gap:10px' });
  constructor(private ui: UIManager, private g: Game, private extra: { label: string; run: () => void }[] = []) {
    this.el = frame('Lantern Hall', h('div', { class: 'col' }, h('div', { class: 'speech' }, h('b', null, 'Pemberly: '), 'Welcome to Lantern Hall! How can I help today?'), this.body), () => ui.pop(this), 'min(560px, 96vw)');
    this.render();
  }
  render(): void {
    clear(this.body);
    const g = this.g;
    const home = g.state.home;
    const up = nextUpgrade(g);
    const can = canOrderUpgrade(g);
    if (home.level >= 0) {
      this.body.append(h('div', null, h('b', null, 'Your home: '), homeTier(home.level).name));
      if (home.upgradeReadyDay) this.body.append(h('div', { class: 'tag' }, 'Construction underway — ready tomorrow!'));
      if (home.loan > 0) {
        this.body.append(h('div', null, `Loan remaining: ✦ ${fmt(home.loan)} of ${fmt(home.loanTotal)}`));
        const row = h('div', { class: 'row wrap' });
        for (const amt of [1000, 5000, 10000]) {
          const b = btn(`Pay ${fmt(amt)}`, () => {
            payLoan(g, amt);
            this.render();
          }, 'small');
          if (g.state.player.glints <= 0) b.disabled = true;
          row.append(b);
        }
        const all = btn('Pay what I can', () => {
          payLoan(g, home.loan);
          this.render();
        }, 'small primary');
        if (g.state.player.glints <= 0) all.disabled = true;
        row.append(all);
        this.body.append(row);
      }
      if (up) {
        const b = btn(`Upgrade to ${up.name} (loan ✦ ${fmt(up.cost)})`, () => {
          g.ui.confirm(`Build the ${up.name}? You'll take on a ✦ ${fmt(up.cost)} loan, paid back whenever you like.`, () => {
            orderUpgrade(g);
            this.render();
          });
        }, 'primary');
        if (!can.ok) {
          b.disabled = true;
          this.body.append(b, h('div', { class: 'muted tiny' }, can.reason ?? ''));
        } else this.body.append(b);
      }
    }
    for (const e of this.extra) this.body.append(btn(e.label, e.run));
    this.body.append(btn('Lumen Exchange', () => g.ui.open('lumens')), btn('Close', () => this.ui.pop(this), 'ghost'));
    this.ui.focusFirst(this);
  }
}

// ---------------- storage ----------------

export class StoragePanel implements Panel {
  name = 'storage';
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'col scroll', style: 'gap:8px' });
  constructor(private ui: UIManager, private g: Game) {
    this.el = frame('Storage', this.body, () => ui.pop(this), 'min(680px, 96vw)');
    this.render();
  }
  render(): void {
    clear(this.body);
    const g = this.g;
    const st = g.state.home.storage;
    this.body.append(h('div', { class: 'muted tiny' }, 'Select something to take it into your pockets. Overflow from full pockets lands here too.'));
    const grid = h('div', { class: 'inv-grid' });
    st.forEach((s, i) => {
      const b = h('button', { class: 'slot', 'data-nav': '', title: item(s.id).name }, iconImg(s.id), s.qty > 1 ? h('span', { class: 'qty' }, String(s.qty)) : null);
      b.addEventListener('click', () => {
        if (!takeFromStorage(g, i)) g.toast('Your pockets are full!', 'warn');
        this.render();
      });
      grid.append(b);
    });
    if (!st.length) grid.append(h('div', { class: 'muted', style: 'grid-column: 1 / -1' }, 'Storage is empty.'));
    this.body.append(grid, h('div', { class: 'row' }, btn('Put items away…', () => {
      this.ui.push(new InventoryPanel(this.ui, g, { title: 'Put away', filter: (s) => !item(s.id).key, onPick: (slot) => {
        putInStorage(g, slot);
        this.render();
        return false;
      } }));
    }, 'primary'), btn('Close', () => this.ui.pop(this))));
    this.ui.focusFirst(this);
  }
}

// ---------------- museum ----------------

export class MuseumPanel implements Panel {
  name = 'museum';
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'col', style: 'gap:10px' });
  constructor(private ui: UIManager, private g: Game, greeting = 'Ah, a visitor! Have you brought me something marvelous?') {
    this.el = frame('Professor Vesper', h('div', { class: 'col' }, h('div', { class: 'speech' }, h('b', null, 'Vesper: '), greeting), this.body), () => ui.pop(this), 'min(560px, 96vw)');
    this.render();
  }
  render(): void {
    clear(this.body);
    const g = this.g;
    const bar = (label: string, n: number, total: number) => h('div', { class: 'prog' }, h('span', null, `${label} ${n}/${total}`), h('div', { class: 'bar' }, h('div', { style: `width:${(n / total) * 100}%` })));
    this.body.append(
      h('div', null, h('b', null, `Collection: ${museumPercent(g)}% complete`)),
      bar('Fish', wingCount(g, 'fish'), WING_TOTAL.fish),
      bar('Bugs', wingCount(g, 'bugs'), WING_TOTAL.bugs),
      bar('Fossils', wingCount(g, 'fossils'), WING_TOTAL.fossils),
    );
    const donatable = g.state.player.inv.some((s) => s && canDonate(g, s.id));
    const d = btn('Donate…', () => {
      this.ui.push(
        new InventoryPanel(this.ui, g, {
          title: 'Donate to the museum',
          filter: (s) => canDonate(g, s.id),
          info: () => 'Not in the museum yet!',
          onPick: (slot) => {
            const id = g.state.player.inv[slot]?.id;
            if (donateSlot(g, slot) && id) g.toast(`Vesper: "A ${item(id).name}! Splendid, simply splendid!"`, 'good', id);
            this.render();
            return !g.state.player.inv.some((s) => s && canDonate(g, s.id));
          },
        }),
      );
    }, 'primary');
    if (!donatable) d.disabled = true;
    const fossils = g.state.player.inv.reduce((a, s) => a + (s?.id === 'fossil_unknown' ? s.qty : 0), 0);
    const a = btn(`Assess fossils (${fossils})`, () => {
      const found: string[] = [];
      while (g.state.player.inv.some((s) => s?.id === 'fossil_unknown')) {
        const id = assessFossil(g);
        if (!id) break;
        found.push(item(id).name);
      }
      if (found.length) g.toast(`Vesper identified: ${found.join(', ')}`, 'good');
      this.render();
    });
    if (!fossils) a.disabled = true;
    this.body.append(h('div', { class: 'row wrap' }, d, a, btn('Close', () => this.ui.pop(this), 'ghost')));
    this.ui.focusFirst(this);
  }
}

export function exhibitPanel(ui: UIManager, d: Display): Panel {
  const def = item(d.item);
  const p: Panel = {
    modal: true,
    el: frame(
      d.filled ? def.name : 'Empty display',
      h('div', { class: 'row', style: 'gap:16px' }, d.filled ? iconImg(d.item, 'icon big') : h('div', { class: 'icon big', style: 'font-size:48px;text-align:center' }, '?'), h('div', null, d.filled ? def.desc : 'Something belongs here... keep exploring and donating!')),
      () => ui.pop(p),
      'min(480px, 94vw)',
    ),
  };
  return p;
}

// ---------------- notice board ----------------

export function boardPanel(ui: UIManager, notes: string[]): Panel {
  const p: Panel = {
    modal: true,
    el: frame('Notice Board', h('div', { class: 'col', style: 'gap:8px' }, notes.map((n) => h('div', { class: 'note' }, n))), () => ui.pop(p), 'min(520px, 94vw)'),
  };
  return p;
}

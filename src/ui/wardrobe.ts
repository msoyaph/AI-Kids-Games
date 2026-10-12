// The closet + mirror: tap clothes to put them on or take them off, save 3 outfits,
// and the dye station (one flower of a color dyes a piece that color).
import { CLOTH_SLOTS, DYE_COLORS, DYE_FLOWER_COLORS, DYE_NAMES, SLOT_ICON, SLOT_LABEL, type ClothSlot } from '../data/clothing';
import { item } from '../data/registry';
import type { Command } from '../input/input';
import type { Game } from '../sim/game';
import { dye, dyesInPockets, isClothing, OUTFIT_SLOTS, saveOutfit, slotOf, stash, takeOff, takeOut, wear, wearOutfit, wornVisuals } from '../sim/wardrobe';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';
import { playerPortraitURL } from './portraits';

function frame(title: string, onClose: () => void, ...body: HTMLElement[]): HTMLElement {
  return h(
    'div',
    { class: 'screen', style: 'z-index:9' },
    h('div', { class: 'dim', onclick: onClose }),
    h('div', { class: 'panel center wardrobe' }, h('h2', null, title, h('span', { class: 'spacer' }), btn('✔ Done', onClose, 'primary')), ...body),
  );
}

export class WardrobePanel implements Panel {
  name = 'wardrobe';
  el: HTMLElement;
  modal = true;
  private tab: ClothSlot = 'top';
  private portrait = h('img', { class: 'wd-portrait', alt: 'You' }) as HTMLImageElement;
  private tabs = h('div', { class: 'wd-tabs' });
  private grid = h('div', { class: 'wd-grid scroll' });
  private under = h('div', { class: 'row' });
  private outfits = h('div', { class: 'wd-outfits' });
  private say = h('div', { class: 'editor-say' });

  constructor(private ui: UIManager, private g: Game) {
    this.el = frame('Closet', () => ui.pop(this), h('div', { class: 'wd-body' }, h('div', { class: 'wd-left' }, this.portrait, this.say, h('h3', null, 'My outfits'), this.outfits), h('div', { class: 'wd-right' }, this.tabs, this.grid, this.under)));
    // clothes in your pockets go into the closet when you open it
    for (let i = 0; i < g.state.player.inv.length; i++) if (g.state.player.inv[i] && isClothing(g.state.player.inv[i]!.id)) stash(g, i);
    this.render();
  }

  command(c: Command): boolean {
    if (c === 'back' || c === 'pause' || c === 'cancel') {
      this.ui.pop(this);
      return true;
    }
    if (c === 'tabNext' || c === 'tabPrev') {
      const k = CLOTH_SLOTS.indexOf(this.tab);
      this.tab = CLOTH_SLOTS[(k + (c === 'tabNext' ? 1 : CLOTH_SLOTS.length - 1)) % CLOTH_SLOTS.length]!;
      this.render();
      return true;
    }
    return false;
  }

  private render(): void {
    const g = this.g;
    const w = g.state.wardrobe;
    this.portrait.src = playerPortraitURL(g.state.player.look, wornVisuals(g.state));
    const wearing = CLOTH_SLOTS.map((s) => w.worn[s]).filter(Boolean).length;
    this.say.textContent = wearing ? `Looking good, ${g.state.player.name}!` : 'Tap a piece of clothing to put it on.';
    clear(this.tabs);
    for (const s of CLOTH_SLOTS) {
      const n = w.owned.filter((id) => slotOf(id) === s).length;
      this.tabs.append(
        btn(h('span', { class: 'wd-tab' }, h('span', { class: 'wd-ico' }, SLOT_ICON[s]), h('span', null, `${SLOT_LABEL[s]} ${n}`)), () => {
          this.tab = s;
          this.render();
        }, `small ${this.tab === s ? 'primary' : ''}`),
      );
    }
    clear(this.grid);
    const mine = [...new Set(w.owned.filter((id) => slotOf(id) === this.tab))];
    if (!mine.length) this.grid.append(h('div', { class: 'muted', style: 'padding:12px' }, `No ${SLOT_LABEL[this.tab].toLowerCase()} yet. Craft them at your workbench, buy them at the shop, or make a friend!`));
    for (const id of mine) {
      const on = w.worn[this.tab] === id;
      const cell = h('div', { class: `wd-cell ${on ? 'on' : ''}` });
      const wearBtn = h('button', { class: 'wd-wear', 'data-nav': '', title: item(id).name }, iconImg(id, 'icon'), on ? h('span', { class: 'cat-badge' }, '✓') : null);
      wearBtn.addEventListener('click', () => {
        if (on) takeOff(g, this.tab);
        else wear(g, id);
        this.render();
      });
      cell.append(wearBtn, h('div', { class: 'tiny wd-name' }, item(id).name), btn('Take out', () => {
        if (!takeOut(g, id)) g.toast('Your pockets are full!', 'warn');
        this.render();
      }, 'small ghost'));
      this.grid.append(cell);
    }
    clear(this.under);
    if (w.worn[this.tab]) this.under.append(btn(`Take off ${SLOT_LABEL[this.tab].toLowerCase()}`, () => {
      takeOff(g, this.tab);
      this.render();
    }, 'small'));
    clear(this.outfits);
    for (let k = 0; k < OUTFIT_SLOTS; k++) {
      const o = w.outfits[k];
      const pics = o ? CLOTH_SLOTS.map((s) => o[s]).filter((x): x is string => !!x) : [];
      this.outfits.append(
        h(
          'div',
          { class: 'wd-outfit' },
          h('b', null, `Outfit ${k + 1}`),
          h('div', { class: 'row' }, ...pics.slice(0, 5).map((id) => iconImg(id, 'icon sm'))),
          h(
            'div',
            { class: 'row' },
            btn('Wear', () => {
              const missing = wearOutfit(g, k);
              if (missing > 0) g.toast(`${missing} piece${missing > 1 ? 's are' : ' is'} missing from your closet.`, 'warn');
              this.render();
            }, 'small', { disabled: !o }),
            btn('Save', () => {
              saveOutfit(g, k);
              g.toast(`Saved as Outfit ${k + 1}!`, 'good');
              this.render();
            }, 'small'),
          ),
        ),
      );
    }
    this.ui.focusFirst(this);
  }
}

export class DyePanel implements Panel {
  name = 'dye';
  el: HTMLElement;
  modal = true;
  private sel: string | null = null;
  private grid = h('div', { class: 'wd-grid scroll' });
  private colors = h('div', { class: 'dye-colors' });
  private say = h('div', { class: 'editor-say' });

  constructor(private ui: UIManager, private g: Game) {
    this.el = frame('Dye station', () => ui.pop(this), this.say, this.grid, h('h3', null, 'Pick a color'), this.colors, h('div', { class: 'tiny muted' }, 'Each dye uses one flower of that color from your pockets.'));
    for (let i = 0; i < g.state.player.inv.length; i++) if (g.state.player.inv[i] && isClothing(g.state.player.inv[i]!.id)) stash(g, i);
    this.render();
  }

  command(c: Command): boolean {
    if (c === 'back' || c === 'pause' || c === 'cancel') {
      this.ui.pop(this);
      return true;
    }
    return false;
  }

  private render(): void {
    const g = this.g;
    const owned = [...new Set(g.state.wardrobe.owned)];
    this.say.textContent = this.sel ? `Dye your ${item(this.sel).name}:` : owned.length ? 'Pick something to dye.' : 'Your closet is empty. Make or buy some clothes first!';
    clear(this.grid);
    for (const id of owned) {
      const b = h('button', { class: `wd-wear ${this.sel === id ? 'on' : ''}`, 'data-nav': '', title: item(id).name }, iconImg(id, 'icon'));
      b.addEventListener('click', () => {
        this.sel = id;
        this.render();
      });
      this.grid.append(b);
    }
    clear(this.colors);
    const have = new Set(dyesInPockets(g));
    DYE_COLORS.forEach((c, k) => {
      const ok = !!this.sel && have.has(k);
      const sw = btn(h('span', { class: 'dye-swatch', style: `background:#${c.toString(16).padStart(6, '0')}` }), () => {
        if (!this.sel) return;
        const next = dye(g, this.sel, k);
        if (next) {
          g.toast(`Now it's a ${item(next).name}!`, 'good', next);
          this.sel = next;
        }
        this.render();
      }, 'dye-btn', { disabled: !ok, title: `${DYE_NAMES[k]} (needs a ${DYE_FLOWER_COLORS[k]} flower)`, 'aria-label': DYE_NAMES[k] });
      this.colors.append(h('div', { class: 'dye-col' }, sw, h('div', { class: 'tiny' }, DYE_NAMES[k]!)));
    });
    this.ui.focusFirst(this);
  }
}

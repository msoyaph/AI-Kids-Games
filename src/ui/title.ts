/** Title screen, save-slot picker and the new-farm form. */
import { drawCharacter, type HairStyle } from '../render/art/characters';
import { P } from '../render/palette';
import type { PixelCanvas } from '../render/pixelcanvas';
import { SLOTS, deleteSlot, slotMeta, type SaveMeta } from '../sim/save';
import { SEASON_NAMES, dayOfSeason, seasonOf, yearOf, type PlayerLook } from '../sim/state';
import type { NewGameOptions } from '../sim/newgame';
import { storageMode } from '../core/storage';
import { fmt, h } from './dom';
import { icon } from './icons';
import type { Modals } from './widgets';

export interface TitleHandlers {
  onLoad(slot: number): void;
  onNew(slot: number, opts: NewGameOptions): void;
  onSettings(): void;
  onBench(): void;
}

const SKINS = [P.sk0, P.sk1, P.sk2, P.sk3, P.sk4, P.sk5];
const HAIRS = [0x2b1d16, 0x6a4630, 0xb7844f, 0xf0d070, 0xd2602a, 0x1a1520, 0x9a98a8, 0x8a4fc0];
const SHIRTS = [0x4f7fe0, 0xd2434a, 0x5c9e48, 0xf5b942, 0x9873be, 0xee8ab6, 0x35b0a2, 0xf3efe6];
const PANTS = [0x46301f, 0x2f4fa8, 0x3d3c4e, 0x6a4630, 0x2c5a37];
const STYLES: HairStyle[] = ['short', 'long', 'bun', 'pony', 'spiky', 'curly', 'bob', 'braids', 'afro', 'bald'];

export function slotLabel(m: SaveMeta): string {
  return `${SEASON_NAMES[seasonOf(m.day)]} ${dayOfSeason(m.day)}, Year ${yearOf(m.day)}`;
}

export class TitleScreen {
  readonly el: HTMLElement;
  private modals: Modals;
  private hs: TitleHandlers;

  constructor(parent: HTMLElement, modals: Modals, hs: TitleHandlers) {
    this.modals = modals;
    this.hs = hs;
    this.el = h('div', { class: 'layer title-wrap' });
    parent.appendChild(this.el);
    this.render();
  }

  render(): void {
    this.el.innerHTML = '';
    const metas = Array.from({ length: SLOTS }, (_, i) => slotMeta(i + 1));
    const latest = metas.map((m, i) => ({ m, i })).filter((x) => x.m).sort((a, b) => (b.m!.savedAt ?? 0) - (a.m!.savedAt ?? 0))[0];
    const menu = h('div', { class: 'title-menu' });
    if (latest) {
      menu.appendChild(
        h('button', { class: 'btn green', onclick: () => this.hs.onLoad(latest.i + 1) }, `Continue — ${latest.m!.name}`),
      );
    }
    menu.appendChild(h('button', { class: 'btn', onclick: () => this.slotPicker() }, latest ? 'Choose a Farm' : 'Start Playing'));
    menu.appendChild(h('button', { class: 'btn gray', onclick: () => this.hs.onSettings() }, 'Settings'));
    menu.appendChild(h('button', { class: 'btn gray small', onclick: () => this.hs.onBench() }, 'Test performance'));
    const note =
      storageMode() === 'memory'
        ? h('div', { class: 'panel', style: 'padding:6px 12px;max-width:420px;text-align:center;font-size:.9em' }, 'Saving is turned off in this window, so your farm will reset when you close it. You can still play!')
        : null;
    this.el.appendChild(h('div', { class: 'logo' }, 'Cliff Valley', h('small', null, 'grow · befriend · explore')));
    this.el.appendChild(menu);
    if (note) this.el.appendChild(note);
  }

  show(v: boolean): void {
    this.el.style.display = v ? '' : 'none';
    if (v) this.render();
  }

  slotPicker(): void {
    let close = () => {};
    const list = h('div', { class: 'slots' });
    for (let i = 1; i <= SLOTS; i++) {
      const m = slotMeta(i);
      const card = h('div', { class: 'slotcard panel' });
      if (m) {
        card.appendChild(icon(m.done ? 'ui.star2' : 'ui.season' + seasonOf(m.day), 32));
        card.appendChild(
          h('div', { class: 'meta' }, h('b', null, `${m.name} · ${m.farm} Farm`), h('div', { class: 'sub' }, `${slotLabel(m)} · ${fmt(m.coins)} coins${m.suspended ? ' · mid-day' : ''}`)),
        );
        card.appendChild(h('button', { class: 'btn green small', onclick: () => { close(); this.hs.onLoad(i); } }, 'Play'));
        card.appendChild(
          h('button', {
            class: 'btn red small',
            'aria-label': `Delete farm in slot ${i}`,
            onclick: () =>
              this.modals.ask('Delete this farm?', `${m.name}'s farm will be gone forever. Are you sure?`, [
                { label: 'Keep it', cls: 'gray' },
                { label: 'Delete', cls: 'red', onClick: () => { deleteSlot(i); close(); this.render(); this.slotPicker(); } },
              ]),
          }, '✕'),
        );
      } else {
        card.appendChild(icon('ui.season0', 32));
        card.appendChild(h('div', { class: 'meta' }, h('b', null, `Empty slot ${i}`), h('div', { class: 'sub' }, 'Start a brand new farm')));
        card.appendChild(h('button', { class: 'btn small', onclick: () => { close(); this.newGameForm(i); } }, 'New'));
      }
      list.appendChild(card);
    }
    close = this.modals.show(h('div', null, h('h2', null, 'Your Farms'), list, h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => close() }, 'Back'))), { cancel: () => {} });
  }

  newGameForm(slot: number): void {
    const look: PlayerLook = { skin: SKINS[1], hair: HAIRS[1], hairStyle: 'short', shirt: SHIRTS[0], pants: PANTS[0] };
    let pet: 'dog' | 'cat' = 'dog';
    const name = h('input', { class: 'inp', maxlength: '12', value: '', placeholder: 'e.g. Sunny', 'aria-label': 'Farmer nickname' }) as HTMLInputElement;
    const farm = h('input', { class: 'inp', maxlength: '14', value: '', placeholder: 'e.g. Daisy', 'aria-label': 'Farm name' }) as HTMLInputElement;
    const petName = h('input', { class: 'inp', maxlength: '12', value: '', placeholder: 'e.g. Biscuit', 'aria-label': 'Pet name' }) as HTMLInputElement;
    const canvas = h('canvas', { class: 'preview-canvas', width: '16', height: '32' }) as HTMLCanvasElement;
    let dir = 0;
    const draw = () => paint(canvas, drawCharacter({ ...look, hairStyle: look.hairStyle as HairStyle }, dir, 0));
    draw();
    const spin = setInterval(() => {
      dir = (dir + 1) % 4;
      draw();
    }, 1200);
    const swatches = (label: string, colors: number[], key: keyof PlayerLook) => {
      const row = h('div', { class: 'choice-row', role: 'radiogroup', 'aria-label': label });
      colors.forEach((c) => {
        const b = h('button', { class: 'swatch' + (look[key] === c ? ' on' : ''), style: `background:#${c.toString(16).padStart(6, '0')}`, 'aria-label': `${label} color`, role: 'radio' });
        b.addEventListener('click', () => {
          (look as unknown as Record<string, number>)[key] = c;
          row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          draw();
        });
        row.appendChild(b);
      });
      return h('div', { class: 'form-row' }, h('label', null, label), row);
    };
    const styleRow = h('div', { class: 'choice-row' });
    STYLES.forEach((s) => {
      const b = h('button', { class: 'choice' + (look.hairStyle === s ? ' on' : '') }, s);
      b.addEventListener('click', () => {
        look.hairStyle = s;
        styleRow.querySelectorAll('.choice').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        draw();
      });
      styleRow.appendChild(b);
    });
    const petRow = h('div', { class: 'choice-row' });
    for (const k of ['dog', 'cat'] as const) {
      const b = h('button', { class: 'choice' + (pet === k ? ' on' : '') }, k === 'dog' ? 'Puppy' : 'Kitten');
      b.addEventListener('click', () => {
        pet = k;
        petRow.querySelectorAll('.choice').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      });
      petRow.appendChild(b);
    }
    let close = () => {};
    const start = () => {
      const opts: NewGameOptions = {
        name: clean(name.value) || 'Farmer',
        farm: clean(farm.value) || 'Cliffside',
        pet,
        petName: clean(petName.value) || (pet === 'dog' ? 'Biscuit' : 'Mochi'),
        look: { ...look },
      };
      clearInterval(spin);
      close();
      this.hs.onNew(slot, opts);
    };
    const form = h(
      'div',
      null,
      h('h2', null, 'A New Farm!'),
      h('div', { style: 'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap' },
        h('div', { class: 'panel', style: 'padding:8px;background:#cfe8b8' }, canvas),
        h('div', { style: 'flex:1;min-width:220px' },
          h('div', { class: 'form-row' }, h('label', null, 'Farmer nickname'), name, h('span', { class: 'hint' }, 'Pick a fun nickname — not your real name!')),
          h('div', { class: 'form-row' }, h('label', null, 'Farm name'), farm),
        ),
      ),
      h('div', { class: 'form-row' }, h('label', null, 'Hair style'), styleRow),
      swatches('Hair', HAIRS, 'hair'),
      swatches('Skin', SKINS, 'skin'),
      swatches('Shirt', SHIRTS, 'shirt'),
      swatches('Pants', PANTS, 'pants'),
      h('div', { class: 'form-row' }, h('label', null, 'Your pet'), petRow),
      h('div', { class: 'form-row' }, h('label', null, 'Pet name'), petName),
      h('div', { class: 'actions' },
        h('button', { class: 'btn gray', onclick: () => { clearInterval(spin); close(); } }, 'Back'),
        h('button', { class: 'btn green primary', onclick: start }, 'Start farming!'),
      ),
    );
    close = this.modals.show(form, { cancel: () => clearInterval(spin) });
  }
}

/** Strip anything that isn't a friendly name character. */
export function clean(s: string): string {
  return s.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 14);
}

export function paint(canvas: HTMLCanvasElement, pc: PixelCanvas): void {
  canvas.width = pc.w;
  canvas.height = pc.h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(pc.w, pc.h);
  for (let i = 0; i < pc.px.length; i++) {
    const c = pc.px[i];
    if (c < 0) continue;
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

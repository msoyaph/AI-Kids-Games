import { blankWorkshop, decodeWorkshop, encodeWorkshop, workshopToMapDef, type WorkshopMap } from '../../data/workshop';
import { t, type MessageKey } from '../../i18n';
import { checkWorkshop } from '../../sim/workshopCheck';
import { h, img } from '../../ui/dom';
import { showModal, type ModalHandle } from '../../ui/modals';
import { mapThumbUrl } from '../../ui/thumbs';
import { WORKSHOP_SLOTS, type WorkshopSave } from '../save';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

/** "Amber Causeway": names come from two translated word lists (codes only carry the indices). */
export function workshopName(m: Pick<WorkshopMap, 'adj' | 'noun'>): string {
  const adj = t('workshop.words.adj').split(',');
  const noun = t('workshop.words.noun').split(',');
  return `${adj[m.adj % adj.length] ?? ''} ${noun[m.noun % noun.length] ?? ''}`.trim();
}

export function workshopMapDef(m: WorkshopMap): ReturnType<typeof workshopToMapDef> {
  return workshopToMapDef(m, workshopName(m), t('workshop.story'));
}

/** Share-code box: select-all text plus a Copy button (clipboard may be blocked in iframes). */
export function shareCodeBox(app: App, code: string): HTMLElement[] {
  const box = h('textarea.share-code', { readonly: true, rows: 4, 'aria-label': t('workshop.shareTitle') }) as HTMLTextAreaElement;
  box.value = code;
  box.addEventListener('focus', () => box.select());
  const status = h('p.note', null, '');
  const copy = h(
    'button.btn.gold',
    {
      onClick: async () => {
        box.select();
        try {
          await navigator.clipboard.writeText(code);
          status.textContent = t('workshop.copied');
        } catch {
          status.textContent = t('workshop.copyFail');
        }
        app.audio.ui('click');
      },
    },
    t('workshop.copy'),
  );
  return [h('p', null, t('workshop.shareHelp')), box, h('div.row', null, copy), status];
}

export class WorkshopScreen implements Screen {
  readonly el: HTMLElement;
  private list = h('div.cards-grid.wide');
  private modal: ModalHandle | null = null;

  constructor(
    private readonly app: App,
    private readonly nav: Nav,
  ) {
    this.el = h(
      'div.screen.menu',
      null,
      h(
        'div.topbar',
        null,
        h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'),
        h('h2', null, t('workshop.title')),
        h('div.stat', null, t('workshop.slots', { n: app.save.data.workshop.length, max: WORKSHOP_SLOTS })),
      ),
      h('p.note', null, t('workshop.intro')),
      h('div.row.left', null, h('button.btn.green', { onClick: () => this.create() }, t('workshop.new')), h('button.btn', { onClick: () => this.importDialog() }, t('workshop.import'))),
      this.list,
    );
    this.render();
  }

  private get saves(): WorkshopSave[] {
    return this.app.save.data.workshop;
  }

  private render(): void {
    this.list.replaceChildren();
    if (!this.saves.length) this.list.append(h('p.note', null, t('workshop.empty')));
    this.saves.forEach((s, i) => {
      const dec = decodeWorkshop(s.code);
      if (!('map' in dec)) return;
      const m = dec.map;
      const def = workshopMapDef(m);
      const playable = checkWorkshop(def).length === 0;
      this.list.append(
        h(
          'article.info-card.panel.ws-card',
          null,
          img(mapThumbUrl(def), def.name, 'thumb'),
          h(
            'div.ws-main',
            null,
            h('h4', null, def.name),
            h('div.chips', null, h('span.chip', { class: s.validated ? 'spec' : 'dim' }, s.validated ? t('workshop.validated') : t('workshop.unvalidated')), h('span.chip.dim', null, t('workshop.tierHelp', { n: m.tier }))),
            h(
              'div.row.left',
              null,
              h('button.btn', { onClick: () => this.nav.workshopEdit(i) }, t('workshop.edit')),
              h('button.btn.green', { disabled: !playable, onClick: () => this.nav.playWorkshop(def) }, t('workshop.play')),
              h('button.btn.gold', { onClick: () => this.share(s) }, t('workshop.share')),
              h('button.btn.ghost', { onClick: () => this.remove(i, def.name) }, t('workshop.delete')),
            ),
          ),
        ),
      );
    });
  }

  private create(): void {
    if (this.saves.length >= WORKSHOP_SLOTS) {
      this.nav.toast(t('workshop.full'));
      return;
    }
    this.saves.push({ code: encodeWorkshop(blankWorkshop()), updated: Date.now(), validated: false });
    this.app.save.flush();
    this.nav.workshopEdit(this.saves.length - 1);
  }

  private remove(i: number, name: string): void {
    const m = showModal(this.app.ui, [
      h('h2', null, t('workshop.delete')),
      h('p', null, t('workshop.deleteConfirm', { name })),
      h(
        'div.row',
        null,
        h('button.btn', { onClick: () => m.close() }, t('common.cancel')),
        h(
          'button.btn.red',
          {
            onClick: () => {
              this.saves.splice(i, 1);
              this.app.save.flush();
              m.close();
              this.render();
            },
          },
          t('workshop.delete'),
        ),
      ),
    ]);
  }

  private share(s: WorkshopSave): void {
    if (!s.validated) {
      this.nav.toast(t('workshop.needTest'));
      return;
    }
    const m = showModal(this.app.ui, [h('h2', null, t('workshop.shareTitle')), ...shareCodeBox(this.app, s.code), h('div.row', null, h('button.btn', { onClick: () => m.close() }, t('common.close')))], {
      onBackdrop: () => m.close(),
      cls: 'wide',
    });
  }

  private importDialog(): void {
    const input = h('textarea.share-code', { rows: 4, 'aria-label': t('workshop.importTitle'), placeholder: 'VX1.' }) as HTMLTextAreaElement;
    const result = h('div.import-result');
    const check = (): void => {
      result.replaceChildren();
      const dec = decodeWorkshop(input.value);
      if (!('map' in dec)) {
        result.append(h('p.bad', null, t(`workshop.error.${dec.error}` as MessageKey)));
        return;
      }
      const def = workshopMapDef(dec.map);
      if (checkWorkshop(def).length) {
        result.append(h('p.bad', null, t('workshop.error.rules')));
        return;
      }
      result.append(
        img(mapThumbUrl(def), def.name, 'thumb'),
        h('p', null, t('workshop.importOk', { name: def.name })),
        h(
          'button.btn.green',
          {
            onClick: () => {
              if (this.saves.length >= WORKSHOP_SLOTS) {
                this.nav.toast(t('workshop.full'));
                return;
              }
              // imported maps must pass the bot test on this device before they can be shared again
              this.saves.push({ code: encodeWorkshop(dec.map), updated: Date.now(), validated: false });
              this.app.save.flush();
              this.modal?.close();
              this.render();
            },
          },
          t('workshop.importSave'),
        ),
      );
    };
    this.modal = showModal(
      this.app.ui,
      [
        h('h2', null, t('workshop.importTitle')),
        h('p', null, t('workshop.importHelp')),
        input,
        h('div.row', null, h('button.btn', { onClick: () => this.modal?.close() }, t('common.cancel')), h('button.btn.gold', { onClick: check }, t('workshop.importBtn'))),
        result,
      ],
      { onBackdrop: () => this.modal?.close(), cls: 'wide' },
    );
  }

  back(): boolean {
    if (this.modal) {
      this.modal.close();
      this.modal = null;
      return true;
    }
    this.nav.title();
    return true;
  }
}

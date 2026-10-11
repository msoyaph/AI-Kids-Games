import { ELEMENT_ORDER, ELEMENTS, STRONG_MULT, WEAK_MULT, type ElementId } from '../../data/elements';
import { ENEMIES, ENEMY_IDS } from '../../data/enemies';
import { TRAIT_ORDER, traitsOf } from '../../data/traits';
import { TOWER_IDS, TOWERS, type TowerId } from '../../data/towers';
import { t, type MessageKey } from '../../i18n';
import { atlasIconUrl, elementIconUrl, enemyTexName, towerIconUrl } from '../../render/atlas/bake';
import { h, img } from '../../ui/dom';
import { enemyStatGrid, specSummary, towerLevelTable } from '../../ui/statTables';
import { traitChip, traitIconUrl } from '../../ui/traitIcons';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

type Tab = 'towers' | 'constructs' | 'elements';
const TABS: Tab[] = ['towers', 'constructs', 'elements'];

export class EncyclopediaScreen implements Screen {
  readonly el: HTMLElement;
  private body = h('div');
  private tabs = h('div.tabs', { role: 'tablist' });

  constructor(
    private readonly app: App,
    private readonly nav: Nav,
  ) {
    this.el = h(
      'div.screen.menu.codex',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': t('common.back') }, '←'), h('h2', null, t('codex.title'))),
      this.tabs,
      this.body,
    );
    this.show('towers');
  }

  private show(tab: Tab): void {
    this.tabs.replaceChildren(
      ...TABS.map((x) =>
        h('button.btn', { class: x === tab ? 'on' : '', role: 'tab', 'aria-selected': String(x === tab), onClick: () => this.show(x) }, t(`codex.tab.${x}`)),
      ),
    );
    this.body.replaceChildren(tab === 'towers' ? this.towers() : tab === 'constructs' ? this.constructs() : this.elements());
  }

  private elIcons(els: readonly ElementId[]): HTMLElement[] {
    return els.map((e) => img(elementIconUrl(this.app.atlas, e, 40), ELEMENTS[e].name, 'inline-icon'));
  }

  private towers(): HTMLElement {
    const groups: [MessageKey, TowerId[]][] = [
      ['codex.group.basic', TOWER_IDS.filter((id) => TOWERS[id].kind === 'basic')],
      ['codex.group.element', TOWER_IDS.filter((id) => TOWERS[id].kind === 'element')],
      ['codex.group.combo', TOWER_IDS.filter((id) => TOWERS[id].kind === 'combo')],
    ];
    const wrap = h('div');
    for (const [title, ids] of groups) {
      const grid = h('div.cards-grid.wide');
      for (const id of ids) {
        const d = TOWERS[id];
        grid.append(
          h(
            'article.info-card.panel.codex-card',
            null,
            h(
              'header',
              null,
              img(towerIconUrl(id, 3, 144), d.name, 'portrait'),
              h(
                'div',
                null,
                h('h4', null, d.name, ' ', ...this.elIcons(d.elements)),
                h('div.chips', null, h('span.chip', null, d.ability), h('span.chip.dim', null, d.targets === 'ground' ? t('hud.groundOnly') : t('hud.groundAir'))),
                h('p', null, d.blurb),
              ),
            ),
            towerLevelTable(d),
            d.specs ? specSummary(d) : null,
          ),
        );
      }
      wrap.append(h('h3.section', null, t(title)), grid);
    }
    return wrap;
  }

  private constructs(): HTMLElement {
    const a = this.app.atlas;
    const grid = h('div.cards-grid.wide');
    for (const id of ENEMY_IDS) {
      const d = ENEMIES[id];
      grid.append(
        h(
          'article.info-card.panel.codex-card',
          null,
          h(
            'header',
            null,
            img(atlasIconUrl(a, enemyTexName(id, null), 144), d.name, 'portrait'),
            h(
              'div',
              null,
              h('h4', null, d.name),
              h('div.chips', null, ...traitsOf(d).map((tr) => traitChip(tr))),
              h('p', null, d.blurb),
            ),
          ),
          enemyStatGrid(d),
          h('p.tip', null, d.tip),
        ),
      );
    }
    const abilities = h(
      'div.cards-grid.wide',
      null,
      ...TRAIT_ORDER.map((tr) =>
        h('article.info-card.panel.trait-card', null, img(traitIconUrl(tr, 64), '', 'trait-icon'), h('div', null, h('h4', null, t(`trait.${tr}`)), h('p', null, t(`trait.${tr}.desc`)))),
      ),
    );
    return h('div', null, h('p.note', null, t('codex.hpNote')), grid, h('h3.section', null, t('codex.abilities')), abilities);
  }

  private elements(): HTMLElement {
    const a = this.app.atlas;
    const cycle = (els: ElementId[]): HTMLElement => {
      const row = h('div.el-cycle');
      els.forEach((e, i) => {
        row.append(h('div.el-node', null, img(elementIconUrl(a, e, 96), ELEMENTS[e].name, 'big-el'), h('span', null, ELEMENTS[e].name)));
        if (i < els.length - 1) row.append(h('span.el-arrow', { 'aria-hidden': 'true' }, '→'));
      });
      return row;
    };
    const cards = h('div.cards-grid');
    for (const e of ELEMENT_ORDER) {
      const E = ELEMENTS[e];
      const towers = TOWER_IDS.filter((id) => TOWERS[id].elements.includes(e)).map((id) => TOWERS[id].name);
      cards.append(
        h(
          'article.info-card.panel',
          null,
          img(elementIconUrl(a, e, 96), E.name, 'portrait'),
          h(
            'div',
            null,
            h('h4', null, t('codex.beats', { a: E.name, b: ELEMENTS[E.beats].name })),
            h('p', null, E.why + '.'),
            h('p', null, E.blurb),
            h('p.dim', null, t('codex.usedBy', { names: towers.join(', ') })),
          ),
        ),
      );
    }
    return h(
      'div',
      null,
      h(
        'div.panel.wheel',
        null,
        h('h3', null, t('codex.wheel')),
        h('p', null, t('codex.wheelHelp', { strong: STRONG_MULT, weak: WEAK_MULT })),
        cycle(['water', 'fire', 'nature', 'water']),
        cycle(['light', 'shadow', 'earth', 'light']),
        h('p.dim', null, t('codex.neutral')),
      ),
      cards,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}

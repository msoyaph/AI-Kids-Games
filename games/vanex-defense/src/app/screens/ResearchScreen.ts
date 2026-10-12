import { canResearch, RESEARCH_BRANCHES, RESEARCH_IDS, researchNode } from '../../data/research';
import { formatNumber, t, type MessageKey } from '../../i18n';
import { h } from '../../ui/dom';
import { showModal } from '../../ui/modals';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

/**
 * Dax Okoro's lab: spend stars (earned on every difficulty) on permanent
 * upgrades. A reset refunds everything for free, so experimenting is safe.
 */
export class ResearchScreen implements Screen {
  readonly el: HTMLElement;
  private body = h('div.research');
  private head = h('div.stat');

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
        h('h2', null, t('research.title')),
        this.head,
      ),
      h('p.note.research-intro', null, t('research.intro')),
      this.body,
      h('div.row', null, h('button.btn.ghost', { onClick: () => this.confirmReset() }, t('research.reset'))),
    );
    this.render();
  }

  private name(id: string): string {
    return t(`research.${id}` as MessageKey);
  }

  private render(): void {
    const save = this.app.save;
    const r = save.data.research;
    const free = save.starsFree();
    this.head.textContent = t('research.stars', { free, total: save.totalStars() });
    this.body.replaceChildren(
      ...RESEARCH_BRANCHES.map((branch) => {
        const nodes = RESEARCH_IDS.filter((id) => researchNode(id)!.branch === branch);
        return h(
          'section.research-branch.panel',
          null,
          h('h3.section', null, t(`research.branch.${branch}` as MessageKey)),
          ...nodes.map((id) => {
            const node = researchNode(id)!;
            const rank = r[id] ?? 0;
            const max = node.cost.length;
            const check = canResearch(r, id, free);
            const missing = node.requires?.find((req) => (r[req] ?? 0) <= 0);
            const btn =
              check === 'max'
                ? h('span.chip.spec', null, t('research.maxed'))
                : h(
                    'button.btn.gold',
                    { disabled: check !== 'ok', onClick: () => this.buy(id), 'aria-label': `${this.name(id)}: ${t('research.buy', { cost: node.cost[rank]! })}` },
                    t('research.buy', { cost: formatNumber(node.cost[rank]!) }),
                  );
            return h(
              'div.research-node',
              { class: rank >= max ? 'done' : rank > 0 ? 'part' : '' },
              h(
                'div.rn-main',
                null,
                h('b', null, this.name(id)),
                h('p', null, t(`research.${id}.desc` as MessageKey)),
                h(
                  'div.rn-meta',
                  null,
                  h('span.pips', null, ...Array.from({ length: max }, (_, i) => h('span.pip-dot', { class: i < rank ? 'on' : '' }))),
                  max > 1 ? h('span', null, t('research.rank', { n: rank, max })) : null,
                  missing ? h('span.req', null, t('research.requires', { name: this.name(missing) })) : null,
                ),
              ),
              btn,
            );
          }),
        );
      }),
    );
  }

  private buy(id: string): void {
    const save = this.app.save;
    const r = save.data.research;
    const check = canResearch(r, id, save.starsFree());
    if (check !== 'ok') {
      this.nav.toast(t('research.notEnough'));
      this.app.audio.ui('deny');
      return;
    }
    r[id] = (r[id] ?? 0) + 1;
    save.flush();
    this.app.audio.ui('pick');
    this.app.achievements.checkEnd(null, false, null);
    this.render();
  }

  private confirmReset(): void {
    const m = showModal(this.app.ui, [
      h('h2', null, t('research.reset')),
      h(
        'div.row',
        null,
        h('button.btn', { onClick: () => m.close() }, t('common.cancel')),
        h(
          'button.btn.gold',
          {
            onClick: () => {
              this.app.save.data.research = {};
              this.app.save.flush();
              m.close();
              this.nav.toast(t('research.resetDone'));
              this.render();
            },
          },
          t('common.ok'),
        ),
      ),
    ]);
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}

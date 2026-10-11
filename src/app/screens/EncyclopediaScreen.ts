import { ELEMENT_ORDER, ELEMENTS } from '../../data/elements';
import { ENEMIES, ENEMY_IDS } from '../../data/enemies';
import { TOWER_IDS, TOWERS, type TowerId } from '../../data/towers';
import { atlasIconUrl, elementIconUrl, enemyTexName, towerIconUrl } from '../../render/atlas/bake';
import { h, img } from '../../ui/dom';
import type { App, Screen } from '../App';
import type { Nav } from '../flow';

type Tab = 'towers' | 'creatures' | 'elements';

function meter(label: string, frac: number): HTMLElement {
  const pct = Math.round(Math.max(0.06, Math.min(1, frac)) * 100);
  return h('div.meter', null, h('span', { style: 'width:62px' }, label), h('span.bar', null, h('i', { style: `width:${pct}%` })));
}

function towerDps(id: TowerId): number {
  const st = TOWERS[id].levels[0]!;
  const b = TOWERS[id].behavior;
  if (b === 'beam') return st.damage * 1.8;
  const hits = (st.shots ?? 1) * (1 + (st.chain ?? 0) * 0.7) * (st.splash ? 1.8 : 1) * (b === 'pulse' ? 2 : 1);
  return st.damage * st.rate * hits + (st.burnDps ?? 0) + (st.poisonDps ?? 0) * 1.5 + (st.zoneDps ?? 0);
}

export class EncyclopediaScreen implements Screen {
  readonly el: HTMLElement;
  private body = h('div');
  private tabs = h('div.tabs', { role: 'tablist' });

  constructor(
    private readonly app: App,
    private readonly nav: Nav,
  ) {
    this.el = h(
      'div.screen.menu',
      null,
      h('div.topbar', null, h('button.btn.round', { onClick: () => nav.title(), 'aria-label': 'Back' }, '←'), h('h2', null, '📖 Creature & Tower Book')),
      this.tabs,
      this.body,
    );
    this.show('towers');
  }

  private show(tab: Tab): void {
    this.tabs.replaceChildren(
      ...(['towers', 'creatures', 'elements'] as Tab[]).map((t) =>
        h('button.btn', { class: t === tab ? 'on' : '', role: 'tab', 'aria-selected': String(t === tab), onClick: () => this.show(t) }, t === 'towers' ? '🏰 Towers' : t === 'creatures' ? '🐾 Creatures' : '✨ Elements'),
      ),
    );
    this.body.replaceChildren(tab === 'towers' ? this.towers() : tab === 'creatures' ? this.creatures() : this.elements());
  }

  private towers(): HTMLElement {
    const a = this.app.atlas;
    const maxDps = Math.max(...TOWER_IDS.map(towerDps));
    const maxRange = Math.max(...TOWER_IDS.map((id) => TOWERS[id].levels[0]!.range));
    const grid = h('div.cards-grid');
    const groups: [string, TowerId[]][] = [
      ['Basic towers', TOWER_IDS.filter((id) => TOWERS[id].kind === 'basic')],
      ['Element towers', TOWER_IDS.filter((id) => TOWERS[id].kind === 'element')],
      ['Combo towers (2 elements)', TOWER_IDS.filter((id) => TOWERS[id].kind === 'combo')],
    ];
    const wrap = h('div');
    for (const [title, ids] of groups) {
      const g = grid.cloneNode() as HTMLElement;
      for (const id of ids) {
        const d = TOWERS[id];
        const st = d.levels[0]!;
        g.append(
          h(
            'div.info-card.panel',
            null,
            img(towerIconUrl(id, 3, 144), d.name, 'portrait'),
            h(
              'div',
              { style: 'flex:1' },
              h('h4', null, d.name, ' ', ...d.elements.map((e) => img(elementIconUrl(a, e, 40), ELEMENTS[e].name, 'inline-icon'))),
              h('p', null, d.blurb),
              h('p', null, h('b', null, `★ ${d.ability}`), d.targets === 'ground' ? ' · ground only' : ' · hits flyers'),
              meter('Power', towerDps(id) / maxDps),
              meter('Range', st.range / maxRange),
              h('p', { style: 'font-weight:800;display:flex;align-items:center;gap:4px' }, img(atlasIconUrl(a, 'coin', 32), 'coins', 'inline-icon'), `${st.cost}`),
            ),
          ),
        );
      }
      wrap.append(h('h3', { style: 'margin:14px 4px 8px' }, title), g);
    }
    return wrap;
  }

  private creatures(): HTMLElement {
    const a = this.app.atlas;
    const grid = h('div.cards-grid');
    const maxHp = Math.max(...ENEMY_IDS.map((id) => ENEMIES[id].hp));
    const maxSpeed = Math.max(...ENEMY_IDS.map((id) => ENEMIES[id].speed));
    for (const id of ENEMY_IDS) {
      const d = ENEMIES[id];
      const tags: string[] = [];
      if (d.boss) tags.push('👑 Boss');
      if (d.flying) tags.push('☁ Flies');
      if (d.heal) tags.push('💚 Heals');
      if (d.split) tags.push('✂ Splits');
      if (d.shielded) tags.push('🔵 Bubble');
      if (d.armor >= 0.3) tags.push('🛡 Armor');
      if (d.elemental) tags.push('✨ Elements');
      grid.append(
        h(
          'div.info-card.panel',
          null,
          img(atlasIconUrl(a, enemyTexName(id, null), 144), d.name, 'portrait'),
          h(
            'div',
            { style: 'flex:1' },
            h('h4', null, d.name),
            h('p', null, d.blurb),
            tags.length ? h('p', { style: 'font-weight:800' }, tags.join('  ')) : null,
            meter('Health', Math.sqrt(d.hp / maxHp)),
            meter('Speed', d.speed / maxSpeed),
            meter('Armor', d.armor / 0.6),
            h('p', { style: 'opacity:.85' }, `💡 ${d.tip}`),
          ),
        ),
      );
    }
    return grid;
  }

  private elements(): HTMLElement {
    const a = this.app.atlas;
    const tri = (els: typeof ELEMENT_ORDER[number][]): HTMLElement => {
      const row = h('div', { style: 'display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0' });
      els.forEach((e, i) => {
        row.append(
          h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:2px;font-weight:900' }, img(elementIconUrl(a, e, 96), ELEMENTS[e].name, 'big-el'), ELEMENTS[e].name),
        );
        if (i < els.length - 1) row.append(h('span', { style: 'font-size:28px;font-weight:900' }, '➜'));
      });
      return row;
    };
    const lines = h('div.cards-grid');
    for (const e of ELEMENT_ORDER) {
      const E = ELEMENTS[e];
      lines.append(
        h(
          'div.info-card.panel',
          null,
          img(elementIconUrl(a, e, 96), E.name, 'portrait'),
          h('div', null, h('h4', null, `${E.name} beats ${ELEMENTS[E.beats].name}`), h('p', null, `${E.why}!`), h('p', null, E.blurb)),
        ),
      );
    }
    return h(
      'div',
      null,
      h('div.panel', { style: 'padding:14px;text-align:center;margin-bottom:12px' },
        h('h3', { style: 'margin:0 0 6px' }, 'The Element Wheel'),
        h('p', { style: 'margin:0' }, 'An arrow means "is strong against". Strong hits do extra damage. Weak hits do less.'),
        tri(['water', 'fire', 'nature', 'water']),
        tri(['light', 'shadow', 'earth', 'light']),
        h('p', { style: 'margin:0;opacity:.9' }, 'Arrow Posts and Pop Cannons have no element: they hit everyone the same.'),
      ),
      lines,
    );
  }

  back(): boolean {
    this.nav.title();
    return true;
  }
}

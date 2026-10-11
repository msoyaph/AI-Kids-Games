// Glowpad apps: Catalog (seen/owned), Journal (achievements + stats), Challenges, and the Lumen Exchange.
import type { App } from '../app';
import { fmt } from '../core/math';
import { ACHIEVEMENTS, CHALLENGES, CONTESTS, LUMEN_OFFERS, TIER_NAMES } from '../data/challenges';
import { BUGS, FISH, FOSSILS, FURNITURE, RECIPES, item } from '../data/registry';
import { buyOffer, contestOpen, metric, offerAvailable, startContest, type ContestKind } from '../sim/challenges';
import type { Game } from '../sim/game';
import { isDonated } from '../sim/museum';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';
import { registerPhoneApp } from './phone';
import { formatPlaytime } from './screens/slots';
import type { TalkOption } from './conversation';
import { VILLAGERS } from '../data/villagers';
import { hearts as heartsOf } from '../sim/villagers';
import { portraitURL } from './portraits';

type Tab = 'fish' | 'bugs' | 'fossils' | 'furniture' | 'recipes';
let catalogTab: Tab = 'fish';

function hoursText(h: [number, number]): string {
  if (h[0] === 0 && h[1] === 24) return 'All day';
  const f = (x: number) => `${x % 12 === 0 ? 12 : x % 12}${x < 12 || x === 24 ? 'am' : 'pm'}`;
  return `${f(h[0])}–${f(h[1])}`;
}

function catalogBody(g: Game, body: HTMLElement, rerender: () => void): void {
  const tabs = h('div', { class: 'tabs' });
  for (const [t, l] of [
    ['fish', 'Fish'],
    ['bugs', 'Bugs'],
    ['fossils', 'Fossils'],
    ['furniture', 'Furniture'],
    ['recipes', 'Recipes'],
  ] as [Tab, string][])
    tabs.append(btn(l, () => {
      catalogTab = t;
      rerender();
    }, `small ${catalogTab === t ? 'primary' : ''}`));
  const detail = h('div', { class: 'cat-detail' }, h('span', { class: 'muted tiny' }, 'Select an entry for details.'));
  const grid = h('div', { class: 'cat-grid' });
  const c = g.state.catalog;
  let entries: { id: string; seen: boolean; owned: boolean; extra: string }[] = [];
  if (catalogTab === 'fish')
    entries = FISH.map((f) => ({ id: f.id, seen: !!c.seen[f.id], owned: !!c.owned[f.id], extra: `${f.where.join(' / ')} · ${hoursText(f.hours)}${f.weather !== 'any' ? ` · ${f.weather}` : ''} · size ${f.size}` }));
  else if (catalogTab === 'bugs') entries = BUGS.map((b) => ({ id: b.id, seen: !!c.seen[b.id], owned: !!c.owned[b.id], extra: `${b.habitat} · ${hoursText(b.hours)}${b.weather !== 'any' ? ` · ${b.weather}` : ''}` }));
  else if (catalogTab === 'fossils') entries = FOSSILS.map((f) => ({ id: f.id, seen: !!c.seen[f.id], owned: !!c.owned[f.id], extra: 'Dig up cracks, then have Vesper assess them' }));
  else if (catalogTab === 'furniture') entries = FURNITURE.map((f) => ({ id: f.id, seen: !!c.seen[f.id] || !!c.owned[f.id], owned: !!c.owned[f.id], extra: f.furn.outdoor ? 'Indoors or outdoors' : 'Indoors' }));
  else entries = RECIPES.map((r) => ({ id: r.result, seen: g.state.recipes.includes(r.id), owned: g.state.recipes.includes(r.id), extra: `Recipe · ${r.ingredients.map((i) => `${i.qty} ${item(i.id).name}`).join(', ')}` }));
  const owned = entries.filter((e) => e.owned).length;
  for (const e of entries) {
    const def = item(e.id);
    const cell = h('button', { class: `cat-cell ${e.owned ? 'owned' : e.seen ? 'seen' : 'unknown'}`, 'data-nav': '', title: e.seen ? def.name : '???' });
    if (e.seen) cell.append(iconImg(e.id));
    else cell.append(h('span', null, '?'));
    if ((catalogTab === 'fish' || catalogTab === 'bugs' || catalogTab === 'fossils') && isDonated(g, e.id)) cell.append(h('span', { class: 'cat-badge' }, '✓'));
    const show = () => {
      clear(detail);
      if (!e.seen) {
        detail.append(h('b', null, '???'), h('div', { class: 'muted tiny' }, "You haven't found this yet."));
        return;
      }
      detail.append(
        h('div', { class: 'row' }, iconImg(e.id, 'icon big'), h('div', null, h('b', null, def.name), h('div', { class: 'tiny muted' }, e.extra), h('div', { class: 'tiny' }, e.owned ? `Owned · sells for ✦ ${fmt(def.price)}` : 'Seen but not caught yet'))),
        h('div', { class: 'tiny muted' }, def.desc),
      );
    };
    cell.addEventListener('focus', show);
    cell.addEventListener('click', show);
    cell.addEventListener('mouseenter', show);
    grid.append(cell);
  }
  body.append(tabs, h('div', { class: 'tiny muted' }, `${owned} / ${entries.length} collected`), grid, detail);
}

function journalBody(g: Game, body: HTMLElement): void {
  const s = g.state;
  const got = ACHIEVEMENTS.filter((a) => (s.achievements[a.id] ?? 0) > 0).length;
  body.append(
    h('div', { class: 'cmp-grid', style: 'grid-template-columns:repeat(3,1fr)' },
      ...[
        ['Playtime', formatPlaytime(s.playSeconds)],
        ['Day', String(s.clock.day)],
        ['Badges', `${got}/${ACHIEVEMENTS.length}`],
      ].map(([l, v]) => h('div', { class: 'cmp-stat' }, h('div', { class: 'v' }, v!), h('div', { class: 'l' }, l!))),
    ),
  );
  for (const a of ACHIEVEMENTS) {
    const tier = s.achievements[a.id] ?? 0;
    const v = metric(g, a.stat);
    const next = a.tiers[tier];
    const prev = tier > 0 ? a.tiers[tier - 1]! : 0;
    const pct = next === undefined ? 1 : Math.max(0, Math.min(1, (v - prev) / (next - prev)));
    body.append(
      h(
        'div',
        { class: 'ach-row' },
        h('div', { class: `badge t${tier}` }, tier > 0 ? '★'.repeat(tier) : '·'),
        h(
          'div',
          { style: 'flex:1' },
          h('div', null, h('b', null, a.name), h('span', { class: 'tiny muted' }, ` — ${a.desc}`)),
          h('div', { class: 'bar' }, h('div', { style: `width:${pct * 100}%` })),
          h('div', { class: 'tiny muted' }, next === undefined ? `Complete! (${TIER_NAMES[tier - 1]})` : `${fmt(v)} / ${fmt(next)} for ${TIER_NAMES[tier]}`),
        ),
      ),
    );
  }
}

function challengesBody(app: App, g: Game, body: HTMLElement): void {
  const c = g.state.challenges;
  body.append(h('div', { class: 'pill', style: 'align-self:flex-start' }, h('span', { class: 'lumen' }, '❖'), fmt(g.state.player.lumens), ' Lumens'));
  body.append(h('div', { class: 'muted tiny' }, 'Three new challenges every day. Complete them for Lumens to spend at the Lumen Exchange in Lantern Hall.'));
  for (const cp of c.list) {
    const def = CHALLENGES.find((d) => d.id === cp.id);
    if (!def) continue;
    body.append(
      h(
        'div',
        { class: `ach-row ${cp.done ? 'done' : ''}` },
        h('div', { class: `badge ${cp.done ? 't3' : 't0'}` }, cp.done ? '✓' : '❖'),
        h('div', { style: 'flex:1' }, h('b', null, def.label), h('div', { class: 'bar' }, h('div', { style: `width:${(cp.progress / def.count) * 100}%` })), h('div', { class: 'tiny muted' }, `${fmt(cp.progress)} / ${fmt(def.count)} · reward ${def.reward} Lumens`)),
      ),
    );
  }
  body.append(h('div', { class: 'tiny muted' }, `Challenges completed so far: ${c.completedTotal}`));
  const best = g.state.events.best;
  if (best.tournament || best.bugoff)
    body.append(h('div', { class: 'tiny' }, `Best tournament score: ${best.tournament ?? 0} · Best bug-off score: ${best.bugoff ?? 0}`));
  void app;
}

registerPhoneApp({ id: 'catalog', name: 'Catalog', icon: '❀', color: '#7fb2ff', render: (_a, g, body, rr) => catalogBody(g, body, rr) });
registerPhoneApp({ id: 'journal', name: 'Journal', icon: '✎', color: '#f2a07b', render: (_a, g, body) => journalBody(g, body) });
registerPhoneApp({ id: 'challenges', name: 'Challenges', icon: '❖', color: '#b48cf0', render: (a, g, body) => challengesBody(a, g, body) });

// ---------------------------------------------------------------- Lumen Exchange

export class LumenPanel implements Panel {
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'col scroll', style: 'gap:8px;max-height:64vh' });
  constructor(private ui: UIManager, private g: Game) {
    this.el = h('div', { class: 'screen' }, h('div', { class: 'dim' }), h('div', { class: 'panel center', style: 'padding:18px;width:min(560px,94vw)' }, h('h2', null, 'Lumen Exchange', h('span', { class: 'spacer' }), btn('✕', () => ui.pop(this), 'small ghost')), this.body));
    this.render();
  }
  render(): void {
    clear(this.body);
    const g = this.g;
    this.body.append(h('div', { class: 'pill', style: 'align-self:flex-start' }, h('span', { class: 'lumen' }, '❖'), fmt(g.state.player.lumens), ' Lumens'));
    for (const o of LUMEN_OFFERS) {
      if (!offerAvailable(g, o)) continue;
      const b = btn(`${o.cost.toLocaleString()} ❖`, () => {
        if (buyOffer(g, o.id)) {
          g.toast(`Got: ${o.label}!`, 'good');
          this.render();
        }
      }, 'small primary');
      if (g.state.player.lumens < o.cost) b.disabled = true;
      const icon = o.kind === 'item' ? iconImg(o.value as string, 'icon sm') : o.kind === 'recipe' ? iconImg((o.value as string).replace(/^r_/, ''), 'icon sm') : h('span', { style: 'font-size:22px;color:#b48cf0' }, '▣');
      this.body.append(h('div', { class: 'ach-row' }, icon, h('div', { style: 'flex:1;font-weight:700' }, o.label), b));
    }
    this.ui.focusFirst(this);
  }
}

// ---------------------------------------------------------------- contests

export function contestOptions(app: App, id: string): TalkOption[] {
  const g = app.game!;
  const kind: ContestKind | null = id === 'juno' ? 'tournament' : id === 'kip' ? 'bugoff' : null;
  if (!kind || !contestOpen(g, kind)) return [];
  const c = CONTESTS[kind];
  return [
    {
      label: `Start the ${c.name}!`,
      run: async (box) => {
        await box.say([{ text: `Ready? You have ${c.seconds / 60} minutes! Medals at ${c.medals.join(' / ')} points. GO!`, expr: 'happy' }]);
        startContest(g, kind);
        return 'end';
      },
    },
  ];
}

export class ContestHud {
  readonly el = h('div', { class: 'contest-hud' });
  constructor(root: HTMLElement) {
    root.appendChild(this.el);
    this.el.style.display = 'none';
  }
  update(g: Game | null): void {
    const a = g?.state.events.active;
    if (!a) {
      this.el.style.display = 'none';
      return;
    }
    this.el.style.display = '';
    const c = CONTESTS[a.kind];
    const t = Math.max(0, Math.ceil(a.timeLeft));
    const medal = c.medals.filter((m) => a.score >= m).length;
    this.el.textContent = `${c.name} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · ${a.score} pts${medal ? ` · ${['', 'Bronze', 'Silver', 'Gold'][medal]}!` : ''}`;
  }
}

// ---------------------------------------------------------------- friends


const PERSONALITY_LABEL: Record<string, string> = {
  sunny: 'Sunny',
  gruff: 'Gruff',
  bookish: 'Bookish',
  sporty: 'Sporty',
  dapper: 'Dapper',
  spunky: 'Spunky',
  dreamy: 'Dreamy',
  mellow: 'Mellow',
};

registerPhoneApp({
  id: 'friends',
  name: 'Neighbors',
  icon: '♥',
  color: '#ff8fa8',
  render: (_a, g, body) => {
    const list = VILLAGERS.filter((v) => g.state.villagers[v.id]?.movedIn);
    if (!list.length) body.append(h('div', { class: 'muted' }, 'No neighbors yet. Pemberly is expecting a few travelers soon!'));
    for (const v of list) {
      const st = g.state.villagers[v.id]!;
      const n = heartsOf(st.friendship);
      const likes = n >= 2 ? `Likes: ${v.likes.join(', ')}` : 'Become better friends to learn what they like.';
      const req = st.request && !st.request.done ? (st.request.accepted ? `Waiting for: ${item(st.request.target).name}` : 'Might need some help today…') : '';
      body.append(
        h(
          'div',
          { class: 'ach-row' },
          h('img', { src: portraitURL(v.id, v.look, n >= 3 ? 'happy' : 'neutral'), style: 'width:56px;height:56px;border-radius:50%;background:#fff6e8' }),
          h(
            'div',
            { style: 'flex:1' },
            h('div', null, h('b', null, v.name), h('span', { class: 'tiny muted' }, ` · ${PERSONALITY_LABEL[v.personality]}`)),
            h('div', { class: 'hearts' }, '♥'.repeat(n) + '♡'.repeat(5 - n)),
            h('div', { class: 'tiny muted' }, likes),
            req ? h('div', { class: 'tiny', style: 'color:#c98a1a;font-weight:700' }, req) : null,
          ),
        ),
      );
    }
  },
});

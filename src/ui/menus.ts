import { ACHIEVEMENTS, type AchievementDef } from '../config/achievements';
import { CHARACTERS } from '../config/characters';
import { ENEMIES } from '../config/enemies';
import { MAPS, mapDef } from '../config/maps';
import { DIFFICULTIES, difficultyDef, difficultyLabel, TIERS, type DifficultyId } from '../config/difficulty';
import { dailySpec, utcDate } from '../meta/daily';
import { SHOP } from '../config/meta';
import { EVOLUTIONS, PASSIVES, passiveDef } from '../config/passives';
import { BESTIARY } from '../config/bestiary';
import { WEAPONS } from '../config/weapons';
import type { CharacterDef } from '../config/types';
import { weaponDef } from '../config/weapons';
import { formatTime } from '../core/math';
import { achievementContext, buy, COLLECTABLE, collectedCount, nextCost, refundAll, shopRank, totalSpent, type RunOutcome, type RunSummary } from '../meta/progression';
import { defaultBindings, ACTION_LABELS, bind, conflicts, GAME_ACTIONS, keyLabel, padLabel, type GameAction, type PadFamily } from '../input/actions';
import type { Captured } from '../input/InputManager';
import type { SaveManager, Settings } from '../meta/save';
import type { World } from '../sim/world';
import { h, img, setText } from './dom';
import { enemyIconUrl, iconUrl, portraitUrl } from './icons';
import type { UI } from './UI';

export interface GameApi {
  ui: UI;
  save: SaveManager;
  startRun(characterId: string, mapId?: string, opts?: { difficulty?: 'relaxed' | 'normal' | 'hard'; tier?: number }): void;
  /** Today's daily run. */
  startDaily(): void;
  applySettings(): void;
  /** Show a hero in the menu backdrop (and switch the backdrop to a map). */
  showcase(characterId: string, mapId?: string): void;
  /** Show an enemy in the menu backdrop instead of the hero (null = back to the hero). */
  showcaseEnemy(id: string | null): void;
  /** Remapping: the next key / gamepad button (null = cancelled with Escape). */
  captureInput(cb: (c: Captured) => void): void;
  /** Button names for the connected controller. */
  padFamily(): PadFamily;
  quitToTitle(): void;
  /** Drop the finished run so menus get the idle backdrop again. */
  clearRun(): void;
  resume(): void;
  /** Playtest mode: number of stored runs (null when not in playtest mode). */
  playtestCount(): number | null;
  exportPlaytests(): void;
  clearPlaytests(): void;
  sound(name: 'click' | 'buy' | 'error' | 'back' | 'open' | 'achievement'): void;
}

/** Icon used for each shop upgrade (reuses passive glyphs). */
const SHOP_ICON: Record<string, [string, 'passive' | 'misc']> = {
  might: ['whetstone', 'passive'],
  maxHp: ['heartyStew', 'passive'],
  armor: ['kettleLid', 'passive'],
  regen: ['mossyCharm', 'passive'],
  moveSpeed: ['swiftBoots', 'passive'],
  cooldown: ['quickspring', 'passive'],
  area: ['bigHat', 'passive'],
  duration: ['hourglassSand', 'passive'],
  magnet: ['lodestone', 'passive'],
  growth: ['scholarsBookmark', 'passive'],
  greed: ['gold', 'misc'],
  luck: ['cloverButton', 'passive'],
  reroll: ['reroll', 'misc'],
  skip: ['skip', 'misc'],
  banish: ['banish', 'misc'],
  revival: ['heal', 'misc'],
  amount: ['echoShell', 'passive'],
};

function goldChip(amount: number): HTMLElement {
  return h('div', { class: 'gold-chip' }, img(iconUrl('gold', 'misc'), 'mini-icon'), String(amount));
}

function statLine(def: CharacterDef): string {
  const s = def.stats;
  const parts: string[] = [];
  const pct = (v: number): string => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  if (s.maxHp) parts.push(`${s.maxHp > 0 ? '+' : ''}${s.maxHp} max HP`);
  if (s.might) parts.push(`${pct(s.might)} damage`);
  if (s.moveSpeed) parts.push(`${pct(s.moveSpeed)} speed`);
  if (s.cooldown) parts.push(`${pct(-s.cooldown)} cooldowns`);
  if (s.armor) parts.push(`+${s.armor} armor`);
  if (s.regen) parts.push(`+${s.regen} HP/s`);
  if (s.area) parts.push(`${pct(s.area)} area`);
  if (def.move.slideBoost > 1) parts.push('super slides');
  return parts.join(' · ');
}

export class Menus {
  private selected = 'thea';
  private selectedMap = 'meadow';
  private selectedDifficulty: DifficultyId = 'normal';
  private selectedTier = 0;

  constructor(private g: GameApi) {}

  // ───────────────────────────── title ─────────────────────────────

  title(): void {
    const { save } = this.g;
    const d = save.data;
    this.g.showcase(d.lastCharacter);
    const go = (fn: () => void) => () => {
      this.g.sound('click');
      fn();
    };
    const el = h(
      'div',
      { class: 'title-screen' },
      h('div', { class: 'logo' }, h('span', { class: 'logo-thea' }, 'Thea'), h('span', { class: 'logo-bonk' }, 'Bonk')),
      h('div', { class: 'tagline' }, 'Bonk the Gloom. Survive until dawn.'),
      h(
        'div',
        { class: 'menu-col' },
        h('button', { class: 'btn primary big', onclick: go(() => this.characterSelect()), 'data-autofocus': true }, 'Play'),
        this.dailyButton(),
        h('button', { class: 'btn', onclick: go(() => this.shop()) }, 'Workshop'),
        h('button', { class: 'btn', onclick: go(() => this.collection()) }, 'Collection'),
        h('button', { class: 'btn', onclick: go(() => this.records()) }, 'Records'),
        h('button', { class: 'btn', onclick: go(() => this.howToPlay()) }, 'How to play'),
        h('button', { class: 'btn', onclick: go(() => this.settings(() => this.title())) }, 'Settings'),
      ),
      h('div', { class: 'corner-tr' }, goldChip(d.gold)),
      d.stats.runsPlayed > 0 ? h('div', { class: 'corner-bl' }, `Best ${formatTime(d.stats.bestTime)} · ${d.stats.totalKills.toLocaleString()} bonks · ${d.stats.runsPlayed} runs`) : null,
      !save.persistent ? h('div', { class: 'corner-br warn' }, 'Storage unavailable — progress lasts this session only') : null,
      this.playtestRow(() => this.title()),
    );
    this.g.ui.show('title', el);
  }

  /** Title-screen button for today's daily run (hero + map + your best today). */
  private dailyButton(): HTMLElement {
    const d = this.g.save.data;
    const spec = dailySpec(utcDate());
    const hero = CHARACTERS.find((c) => c.id === spec.hero)!;
    const rec = d.daily.find((r) => r.date === spec.date);
    return h(
      'button',
      {
        class: 'btn daily-btn',
        onclick: () => {
          this.g.sound('open');
          this.g.startDaily();
        },
      },
      img(iconUrl('daily', 'misc'), 'mini-icon'),
      h('span', null, h('div', null, 'Daily run'), h('div', { class: 'daily-sub' }, `${hero.name} · ${mapDef(spec.map).name}${rec ? ` · best ${formatTime(rec.time)}${rec.won ? ' ★' : ''}` : ''}`)),
    );
  }

  // ───────────────────────────── characters ─────────────────────────────

  characterSelect(): void {
    const d = this.g.save.data;
    this.selected = d.unlockedCharacters.includes(d.lastCharacter) ? d.lastCharacter : 'thea';
    this.selectedMap = d.unlockedMaps.includes(d.lastMap) ? d.lastMap : 'meadow';
    this.g.showcase(this.selected, this.selectedMap);
    const mapNote = h('div', { class: 'map-note' });
    const mapTabs = MAPS.map((m) => {
      const open = d.unlockedMaps.includes(m.id);
      const best = d.stats.bestTimeByMap[m.id];
      const tab = h(
        'button',
        { class: `map-tab${open ? '' : ' locked'}${m.id === this.selectedMap ? ' sel' : ''}` },
        h('div', { class: 'map-name' }, open ? m.name : `${m.name} (locked)`),
        h('div', { class: 'map-sub' }, open ? (best ? `Best ${formatTime(best)}` : 'Not yet survived') : (m.unlock?.text ?? '')),
      );
      tab.addEventListener('click', () => {
        if (!open) {
          this.g.sound('error');
          setText(mapNote, `${m.name} unlocks when you ${m.unlock?.text.toLowerCase() ?? 'play more'}.`);
          return;
        }
        this.g.sound('click');
        this.selectedMap = m.id;
        mapTabs.forEach((t) => t.classList.toggle('sel', t === tab));
        setText(mapNote, m.tagline);
        this.g.showcase(this.selected, m.id);
      });
      return tab;
    });
    setText(mapNote, mapDef(this.selectedMap).tagline);

    // difficulty (+ Hard tiers once Hard has been won)
    this.selectedDifficulty = d.lastDifficulty;
    this.selectedTier = Math.min(d.lastTier, d.unlockedTier);
    const diffNote = h('div', { class: 'map-note' });
    const tierRow = h('div', { class: 'tier-row' });
    const diffTabs: HTMLElement[] = [];
    const renderDiff = (): void => {
      diffTabs.forEach((t, k) => t.classList.toggle('sel', DIFFICULTIES[k].id === this.selectedDifficulty));
      const dd = difficultyDef(this.selectedDifficulty);
      setText(diffNote, dd.id === 'hard' && this.selectedTier > 0 ? `${dd.description} ${TIERS.slice(0, this.selectedTier).map((t) => t.description).join(' ')}` : dd.description);
      tierRow.innerHTML = '';
      tierRow.classList.toggle('hidden', this.selectedDifficulty !== 'hard');
      if (this.selectedDifficulty !== 'hard') return;
      if (d.unlockedTier === 0) {
        tierRow.append(h('span', { class: 'tier-lock' }, 'Win on Hard to unlock tiers 1–5'));
        return;
      }
      for (let t = 0; t <= d.unlockedTier; t++) {
        const b = h('button', { class: `tier-tab${t === this.selectedTier ? ' sel' : ''}` }, t === 0 ? 'Hard' : `Tier ${t}`);
        b.addEventListener('click', () => {
          this.g.sound('click');
          this.selectedTier = t;
          renderDiff();
        });
        tierRow.append(b);
      }
    };
    for (const dd of DIFFICULTIES) {
      const b = h('button', { class: `diff-tab diff-${dd.id}` }, dd.name);
      b.addEventListener('click', () => {
        this.g.sound('click');
        this.selectedDifficulty = dd.id;
        renderDiff();
      });
      diffTabs.push(b);
    }
    renderDiff();
    const details = h('div', { class: 'char-details panel' });
    const startBtn = h('button', { class: 'btn primary big', onclick: () => this.begin() }, 'Start run');
    const render = (): void => {
      const def = CHARACTERS.find((c) => c.id === this.selected)!;
      const unlocked = d.unlockedCharacters.includes(def.id);
      const w = weaponDef(def.startWeapon);
      const best = d.stats.bestTimeByChar[def.id];
      details.innerHTML = '';
      const parts = [
        h('div', { class: 'char-name' }, def.name, h('span', { class: 'char-title' }, ` ${def.title}`)),
        h('div', { class: 'char-desc' }, unlocked ? def.description : `Locked — ${ACHIEVEMENTS.find((a) => a.id === def.unlock)?.description ?? ''}`),
        unlocked ? h('div', { class: 'char-weapon' }, img(iconUrl(w.id, 'weapon'), 'mini-icon big'), h('div', null, h('div', { class: 'card-tag' }, 'Starting weapon'), h('div', { class: 'card-name' }, w.name), h('div', { class: 'small-desc' }, w.description))) : null,
        unlocked ? h('div', { class: 'char-passive' }, h('b', null, def.passive.name), ` — ${def.passive.description}`) : null,
        unlocked ? h('div', { class: 'char-stats' }, statLine(def) || 'Balanced') : null,
        best ? h('div', { class: 'char-best' }, `Best: ${formatTime(best)}`) : null,
      ];
      for (const p of parts) if (p) details.append(p);
      startBtn.disabled = !unlocked;
    };
    const cards = CHARACTERS.map((c) => {
      const unlocked = d.unlockedCharacters.includes(c.id);
      const b = h(
        'button',
        { class: `char-card${unlocked ? '' : ' locked'}`, 'data-autofocus': c.id === this.selected ? true : undefined },
        img(portraitUrl(c.id, c.colors, !unlocked), 'portrait'),
        h('div', { class: 'char-card-name' }, unlocked ? c.name : '???'),
      );
      const select = (): void => {
        this.selected = c.id;
        this.g.showcase(c.id, this.selectedMap);
        document.querySelectorAll('.char-card').forEach((n) => n.classList.remove('sel'));
        b.classList.add('sel');
        render();
      };
      // a click on an unselected card only selects it; a second click (or Enter) starts
      let wasSelected = false;
      b.addEventListener('pointerdown', () => (wasSelected = this.selected === c.id));
      b.addEventListener('focus', select);
      b.addEventListener('click', (e) => {
        const confirmed = e.detail === 0 ? this.selected === c.id : wasSelected;
        if (confirmed && unlocked) this.begin();
        else select();
        wasSelected = false;
      });
      if (c.id === this.selected) b.classList.add('sel');
      return b;
    });
    render();
    const back = (): void => {
      this.g.sound('back');
      this.title();
    };
    const el = h(
      'div',
      { class: 'select-screen' },
      h('div', { class: 'title small' }, 'Choose your hero'),
      h('div', { class: 'map-row' }, ...mapTabs),
      mapNote,
      h('div', { class: 'diff-row' }, ...diffTabs, tierRow),
      diffNote,
      h('div', { class: 'char-row' }, ...cards),
      details,
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: back }, 'Back'), startBtn),
      h('div', { class: 'corner-tr' }, goldChip(d.gold)),
    );
    this.g.ui.show('select', el, back);
  }

  /** Export / clear controls, only in ?playtest=1 mode. */
  private playtestRow(refresh: () => void): HTMLElement | null {
    const n = this.g.playtestCount();
    if (n === null) return null;
    return h(
      'div',
      { class: 'playtest-row' },
      h('span', null, `Playtest runs on this device: ${n}`),
      h('button', { class: 'btn small', onclick: () => this.g.exportPlaytests(), disabled: n === 0 }, 'Export'),
      h('button', { class: 'btn small ghost', onclick: () => this.confirm('Delete all recorded playtest runs on this device?', () => {
        this.g.clearPlaytests();
        refresh();
      }, refresh), disabled: n === 0 }, 'Clear'),
    );
  }

  private begin(): void {
    const d = this.g.save.data;
    if (!d.unlockedCharacters.includes(this.selected)) {
      this.g.sound('error');
      return;
    }
    d.lastCharacter = this.selected;
    if (d.unlockedMaps.includes(this.selectedMap)) d.lastMap = this.selectedMap;
    d.lastDifficulty = this.selectedDifficulty;
    d.lastTier = this.selectedDifficulty === 'hard' ? Math.min(this.selectedTier, d.unlockedTier) : 0;
    this.g.save.save();
    this.g.sound('open');
    this.g.startRun(this.selected, d.lastMap, { difficulty: d.lastDifficulty, tier: d.lastTier });
  }

  // ───────────────────────────── shop ─────────────────────────────

  shop(focusId?: string): void {
    const save = this.g.save;
    const d = save.data;
    const tiles = SHOP.map((def) => {
      const rank = shopRank(d, def.id);
      const cost = nextCost(d, def.id);
      const [icon, kind] = SHOP_ICON[def.id] ?? ['gold', 'misc'];
      const pips = h('div', { class: 'shop-pips' }, ...Array.from({ length: def.maxRank }, (_, i) => h('i', { class: i < rank ? 'on' : '' })));
      const afford = cost !== null && d.gold >= cost;
      const b = h(
        'button',
        { class: `shop-tile${cost === null ? ' maxed' : afford ? '' : ' poor'}`, 'data-autofocus': def.id === focusId ? true : undefined },
        img(iconUrl(icon, kind), 'shop-icon'),
        h('div', { class: 'shop-name' }, def.name),
        pips,
        h('div', { class: 'small-desc' }, def.description),
        h('div', { class: 'shop-cost' }, cost === null ? 'Maxed' : h('span', null, img(iconUrl('gold', 'misc'), 'tiny-icon'), String(cost))),
      );
      b.addEventListener('click', () => {
        if (buy(d, def.id)) {
          save.save();
          this.g.sound('buy');
          this.shop(def.id);
        } else this.g.sound('error');
      });
      return b;
    });
    const back = (): void => {
      this.g.sound('back');
      this.title();
    };
    const spent = totalSpent(d);
    const el = h(
      'div',
      { class: 'shop-screen' },
      h('div', { class: 'title small' }, 'The Workshop'),
      h('div', { class: 'subtitle' }, 'Permanent upgrades for every hero. Gold is earned in runs.'),
      h('div', { class: 'shop-grid' }, ...tiles),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn ghost', onclick: back }, 'Back'),
        h(
          'button',
          {
            class: 'btn ghost',
            disabled: spent === 0,
            onclick: () =>
              this.confirm(`Refund all upgrades for ${spent} gold?`, () => {
                refundAll(d);
                save.save();
                this.g.sound('buy');
                this.shop();
              }, () => this.shop()),
          },
          `Refund (${spent})`,
        ),
      ),
      h('div', { class: 'corner-tr' }, goldChip(d.gold)),
    );
    this.g.ui.show('shop', el, back);
  }

  // ───────────────────────────── records ─────────────────────────────

  records(): void {
    const d = this.g.save.data;
    const s = d.stats;
    const ctx = achievementContext(d);
    const statRows: Array<[string, string]> = [
      ['Runs played', String(s.runsPlayed)],
      ['Victories', String(s.wins)],
      ['Best time', formatTime(s.bestTime)],
      ['Gloom bonked', s.totalKills.toLocaleString()],
      ['Highest level', String(s.highestLevel)],
      ['Bosses defeated', String(Object.values(s.bossKills).reduce((a, b) => a + b, 0))],
      ['Weapons evolved', String(s.evolutions)],
      ['Shrines broken', String(s.shrinesBroken)],
      ['Top speed', s.topSpeed.toFixed(1)],
      ['Gold earned', s.totalGold.toLocaleString()],
      ['Distance slid', `${(s.slideDistance / 1000).toFixed(2)} km`],
      ...MAPS.map((m): [string, string] => [`Best in ${m.name}`, s.bestTimeByMap[m.id] ? formatTime(s.bestTimeByMap[m.id]) : '—']),
      ['Wins on Hard', String(s.winsByDifficulty.hard ?? 0)],
      ['Highest Hard tier won', s.bestHardTier > 0 ? `Tier ${s.bestHardTier}` : s.bestHardTier === 0 ? 'Hard' : '—'],
    ];
    const dailyRows = d.daily.slice(0, 7).map((r) => h('div', { class: 'stat-row' }, h('span', null, `${r.date} · ${CHARACTERS.find((c) => c.id === r.hero)?.name ?? r.hero}`), h('b', null, `${formatTime(r.time)}${r.won ? ' ★' : ''}`)));
    const ach = ACHIEVEMENTS.map((a) => {
      const done = d.achievements.includes(a.id);
      const p = done ? 1 : a.progress(ctx);
      return h(
        'div',
        { class: `ach${done ? ' done' : ''}`, 'data-nav': true, tabindex: 0 },
        h('div', { class: 'ach-name' }, done ? '★ ' : '', a.name),
        h('div', { class: 'small-desc' }, a.description),
        h('div', { class: 'ach-reward' }, rewardText(a)),
        h('div', { class: 'bar thin' }, h('div', { class: 'bar-fill xp', style: `width:${(p * 100).toFixed(0)}%` })),
      );
    });
    const back = (): void => {
      this.g.sound('back');
      this.title();
    };
    const el = h(
      'div',
      { class: 'records-screen' },
      h('div', { class: 'title small' }, 'Records'),
      h(
        'div',
        { class: 'records-cols' },
        h(
          'div',
          { class: 'panel stats-panel' },
          h('div', { class: 'panel-title' }, 'Lifetime'),
          ...statRows.map(([k, v]) => h('div', { class: 'stat-row' }, h('span', null, k), h('b', null, v))),
          dailyRows.length ? h('div', { class: 'panel-title' }, 'Daily runs') : null,
          ...dailyRows,
        ),
        h('div', { class: 'panel ach-panel' }, h('div', { class: 'panel-title' }, `Achievements ${d.achievements.length}/${ACHIEVEMENTS.length}`), h('div', { class: 'ach-list' }, ...ach)),
      ),
      h('button', { class: 'btn ghost', onclick: back, 'data-autofocus': true }, 'Back'),
    );
    this.g.ui.show('records', el, back);
  }

  // ───────────────────────────── collection ─────────────────────────────

  collection(tab: 'bestiary' | 'weapons' | 'items' | 'evolutions' = 'bestiary'): void {
    const d = this.g.save.data;
    const col = d.collection;
    const details = h('div', { class: 'panel col-details' });
    const grid = h('div', { class: 'col-grid' });
    const tabs = h('div', { class: 'col-tabs' });
    const total = COLLECTABLE.enemies.length + COLLECTABLE.weapons.length + COLLECTABLE.passives.length;
    const leave = (): void => {
      this.g.sound('back');
      this.g.showcaseEnemy(null);
      this.title();
    };
    const evolvedIds = new Set(EVOLUTIONS.map((e) => e.into));
    const show = (t: typeof tab): void => {
      tab = t;
      grid.innerHTML = '';
      details.innerHTML = '';
      this.g.showcaseEnemy(null);
      tabs.querySelectorAll('.col-tab').forEach((b) => b.classList.toggle('sel', (b as HTMLElement).dataset.tab === t));
      const tile = (icon: string, name: string, found: boolean, onSelect: () => void): HTMLElement => {
        const b = h('button', { class: `col-tile${found ? '' : ' locked'}` }, img(icon, 'col-icon'), h('div', { class: 'col-name' }, found ? name : '???'));
        b.addEventListener('focus', onSelect);
        b.addEventListener('click', onSelect);
        return b;
      };
      const detail = (...parts: Array<HTMLElement | string | null>): void => {
        details.innerHTML = '';
        for (const p of parts) if (p) details.append(typeof p === 'string' ? h('div', { class: 'small-desc' }, p) : p);
      };
      if (t === 'bestiary') {
        for (const e of ENEMIES) {
          const kills = col.kills[e.id] ?? 0;
          const found = kills > 0;
          grid.append(
            tile(enemyIconUrl(e.id, e.color, e.behavior === 'boss', found), e.name, found, () => {
              this.g.showcaseEnemy(found ? e.id : null);
              detail(h('div', { class: 'char-name' }, found ? e.name : '???'), found ? BESTIARY[e.id] ?? '' : 'Defeat one to learn more.', found ? h('div', { class: 'char-best' }, `Defeated ${kills.toLocaleString()} ×`) : null);
            }),
          );
        }
      } else if (t === 'weapons' || t === 'evolutions') {
        for (const wdef of WEAPONS.filter((x) => (t === 'evolutions') === evolvedIds.has(x.id))) {
          const found = col.weapons.includes(wdef.id);
          const evo = EVOLUTIONS.find((e) => e.into === wdef.id);
          grid.append(
            tile(found ? iconUrl(wdef.id, 'weapon') : iconUrl('?', 'locked'), wdef.name, found, () =>
              detail(
                h('div', { class: 'char-name' }, found ? wdef.name : '???'),
                found ? wdef.description : t === 'evolutions' ? 'Evolve a weapon to discover it.' : 'Pick it up in a run to discover it.',
                evo && found ? h('div', { class: 'char-best' }, `${weaponDef(evo.weapon).name} (max) + ${passiveDef(evo.passive).name}`) : null,
              ),
            ),
          );
        }
      } else {
        for (const pdef of PASSIVES) {
          const found = col.passives.includes(pdef.id);
          grid.append(tile(found ? iconUrl(pdef.id, 'passive') : iconUrl('?', 'locked'), pdef.name, found, () => detail(h('div', { class: 'char-name' }, found ? pdef.name : '???'), found ? pdef.description : 'Pick it up in a run to discover it.')));
        }
      }
      (grid.firstElementChild as HTMLElement | null)?.setAttribute('data-autofocus', 'true');
    };
    const count = (ids: string[], has: (id: string) => boolean): string => `${ids.filter(has).length}/${ids.length}`;
    const evoIds = WEAPONS.filter((x) => evolvedIds.has(x.id)).map((x) => x.id);
    const baseIds = WEAPONS.filter((x) => !evolvedIds.has(x.id)).map((x) => x.id);
    const tabDefs: Array<[typeof tab, string]> = [
      ['bestiary', `Bestiary ${count(COLLECTABLE.enemies, (id) => (col.kills[id] ?? 0) > 0)}`],
      ['weapons', `Weapons ${count(baseIds, (id) => col.weapons.includes(id))}`],
      ['items', `Items ${count(COLLECTABLE.passives, (id) => col.passives.includes(id))}`],
      ['evolutions', `Evolutions ${count(evoIds, (id) => col.weapons.includes(id))}`],
    ];
    for (const [id, label] of tabDefs) {
      const b = h('button', { class: 'col-tab', 'data-tab': id }, label);
      b.addEventListener('click', () => {
        this.g.sound('click');
        show(id);
      });
      tabs.append(b);
    }
    const el = h(
      'div',
      { class: 'collection-screen' },
      h('div', { class: 'title small' }, 'Collection', h('span', { class: 'col-count' }, ` ${collectedCount(d)}/${total}`)),
      tabs,
      h('div', { class: 'col-body' }, grid, details),
      h('button', { class: 'btn ghost', onclick: leave }, 'Back'),
    );
    this.g.ui.show('collection', el, leave);
    show(tab);
  }

  // ───────────────────────────── how to play ─────────────────────────────

  howToPlay(): void {
    const back = (): void => {
      this.g.sound('back');
      this.title();
    };
    const rows: Array<[string, string]> = [
      ['Move', 'WASD / arrow keys · left stick'],
      ['Look', 'Mouse (click to lock, or hold a button to drag) · right stick · Q / E'],
      ['Jump', 'Space · A / Cross'],
      ['Slide', 'Shift or C (hold) · B / RT'],
      ['Pause', 'Esc or P · Start'],
      ['Pick upgrade', '1–4 · click · d-pad + A'],
      ['Debug overlay', 'F3'],
    ];
    const tips = [
      'Weapons fire on their own — your job is to move, dodge and choose upgrades.',
      'Slide to burst ahead. Slides speed up downhill; jumping out of a slide keeps your momentum.',
      'Hit a wooden kicker ramp at speed to launch into the air.',
      'Jump over red shockwave rings and step out of glowing circles.',
      'Max a weapon and own its matching item to evolve it (look for gold cards and chests).',
      'Bonk shrines (walk into them or land on them) for powerful temporary blessings.',
      'Elites glow gold and drop treasure chests. Bosses arrive at 5, 10 and 15 minutes.',
      'Survive until dawn (20:00) or defeat the Gloam Regent to win.',
    ];
    const el = h(
      'div',
      { class: 'modal panel howto' },
      h('div', { class: 'title small' }, 'How to play'),
      h('div', { class: 'howto-cols' }, h('div', null, ...rows.map(([k, v]) => h('div', { class: 'stat-row' }, h('span', null, k), h('b', null, v)))), h('ul', { class: 'tips' }, ...tips.map((t) => h('li', null, t)))),
      h('button', { class: 'btn', onclick: back, 'data-autofocus': true }, 'Got it'),
    );
    this.g.ui.show('howto', el, back);
  }

  // ───────────────────────────── settings ─────────────────────────────

  settings(onBack: () => void): void {
    const save = this.g.save;
    const st = save.data.settings;
    const commit = (): void => {
      save.save();
      this.g.applySettings();
    };
    const slider = (label: string, key: keyof Settings, min: number, max: number, step: number, fmt: (v: number) => string): HTMLElement => {
      const val = h('b', null, fmt(st[key] as number));
      const input = h('input', { type: 'range', min, max, step, value: String(st[key]) }) as HTMLInputElement;
      input.addEventListener('input', () => {
        (st[key] as number) = Number(input.value);
        val.textContent = fmt(Number(input.value));
        commit();
      });
      return h('label', { class: 'setting' }, h('span', null, label), input, val);
    };
    const toggle = (label: string, key: keyof Settings): HTMLElement => {
      const b = h('button', { class: 'btn small toggle' }, st[key] ? 'On' : 'Off');
      b.addEventListener('click', () => {
        (st[key] as boolean) = !st[key];
        b.textContent = st[key] ? 'On' : 'Off';
        b.classList.toggle('off', !st[key]);
        this.g.sound('click');
        commit();
      });
      b.classList.toggle('off', !st[key]);
      return h('div', { class: 'setting' }, h('span', null, label), b);
    };
    const cycle = <T extends string>(label: string, key: keyof Settings, options: T[], names: Record<T, string>): HTMLElement => {
      const b = h('button', { class: 'btn small toggle' }, names[st[key] as T]);
      b.addEventListener('click', () => {
        const i = options.indexOf(st[key] as T);
        (st[key] as T) = options[(i + 1) % options.length];
        b.textContent = names[st[key] as T];
        this.g.sound('click');
        commit();
      });
      return h('div', { class: 'setting' }, h('span', null, label), b);
    };
    /** Toggle for a nested setting (controls / access). */
    const sub = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
      const b = h('button', { class: 'btn small toggle' }, get() ? 'On' : 'Off');
      b.classList.toggle('off', !get());
      b.addEventListener('click', () => {
        set(!get());
        b.textContent = get() ? 'On' : 'Off';
        b.classList.toggle('off', !get());
        this.g.sound('click');
        commit();
      });
      return h('div', { class: 'setting' }, h('span', null, label), b);
    };
    const cycleSub = <T extends string>(label: string, get: () => T, set: (v: T) => void, options: readonly T[], names: Record<T, string>): HTMLElement => {
      const b = h('button', { class: 'btn small toggle' }, names[get()]);
      b.addEventListener('click', () => {
        set(options[(options.indexOf(get()) + 1) % options.length]);
        b.textContent = names[get()];
        this.g.sound('click');
        commit();
      });
      return h('div', { class: 'setting' }, h('span', null, label), b);
    };
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const back = (): void => {
      this.g.sound('back');
      onBack();
    };
    const el = h(
      'div',
      { class: 'modal panel settings' },
      h('div', { class: 'title small' }, 'Settings'),
      h(
        'div',
        { class: 'settings-grid' },
        slider('Master volume', 'masterVolume', 0, 1, 0.05, pct),
        slider('Music', 'musicVolume', 0, 1, 0.05, pct),
        slider('Sound effects', 'sfxVolume', 0, 1, 0.05, pct),
        slider('Look sensitivity', 'sensitivity', 0.2, 3, 0.1, (v) => `${v.toFixed(1)}×`),
        toggle('Invert look Y', 'invertY'),
        cycle('Camera control', 'mouseMode', ['auto', 'lock', 'drag'], { auto: 'Auto', lock: 'Mouse lock', drag: 'Hold to drag' }),
        cycle('Graphics quality', 'quality', ['low', 'medium', 'high'], { low: 'Low', medium: 'Medium', high: 'High' }),
        toggle('Show FPS', 'showFps'),
        toggle('Screen shake', 'screenShake'),
        toggle('Damage numbers', 'damageNumbers'),
        h('div', { class: 'settings-head' }, 'Controls'),
        sub('Slide: tap to toggle', () => st.controls.slideToggle, (v) => (st.controls.slideToggle = v)),
        sub('Hold jump to keep hopping', () => st.controls.autoHop, (v) => (st.controls.autoHop = v)),
        h('div', { class: 'setting' }, h('span', null, 'Keys & buttons'), h('button', { class: 'btn small', onclick: () => this.controls(() => this.settings(onBack)) }, 'Remap…')),
        h('div', { class: 'settings-head' }, 'Accessibility'),
        cycleSub('Reduced motion', () => st.access.reducedMotion, (v) => (st.access.reducedMotion = v), ['auto', 'on', 'off'] as const, { auto: 'Auto (system)', on: 'On', off: 'Off' }),
        sub('Colour-blind friendly colours', () => st.access.colorblind, (v) => (st.access.colorblind = v)),
        sub('Larger text', () => st.access.largeText, (v) => (st.access.largeText = v)),
        sub('High-contrast HUD', () => st.access.highContrast, (v) => (st.access.highContrast = v)),
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', onclick: back, 'data-autofocus': true }, 'Done'),
        h('button', { class: 'btn ghost small', onclick: () => this.confirm('Erase all progress (gold, upgrades, unlocks, records)?', () => {
          save.reset();
          this.g.clearRun();
          this.g.applySettings();
          this.title();
        }, () => this.settings(onBack)) }, 'Reset progress'),
      ),
    );
    this.g.ui.show('settings', el, back);
  }

  /** Remap every gameplay action: up to 4 keys and 4 gamepad buttons each. */
  controls(onBack: () => void): void {
    const save = this.g.save;
    const b = save.data.settings.controls.bindings;
    const fam = this.g.padFamily();
    const note = h('div', { class: 'map-note' });
    const table = h('div', { class: 'remap' });
    const commit = (): void => {
      save.save();
      this.g.applySettings();
    };
    const render = (): void => {
      table.innerHTML = '';
      const clash = conflicts(b);
      const clashInputs = new Set(clash.map((c) => c.input));
      for (const a of GAME_ACTIONS) {
        const chips: HTMLElement[] = [];
        const chip = (text: string, input: string, onclick: () => void, remove: () => void): HTMLElement => {
          const el = h('button', { class: `chip${clashInputs.has(input) ? ' clash' : ''}`, title: 'Click to change · right-click to remove' }, text);
          el.addEventListener('click', onclick);
          el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            remove();
          });
          return el;
        };
        b[a].keys.forEach((k, i) => chips.push(chip(keyLabel(k), `key:${k}`, () => listen(a, 'key', i), () => { b[a].keys.splice(i, 1); commit(); render(); })));
        b[a].pad.forEach((p, i) => chips.push(chip(`Pad ${padLabel(p, fam)}`, `pad:${p}`, () => listen(a, 'pad', i), () => { b[a].pad.splice(i, 1); commit(); render(); })));
        const add = h('button', { class: 'chip add', title: 'Add a key or button' }, '+');
        add.addEventListener('click', () => listen(a, 'any', -1));
        table.append(h('div', { class: 'remap-row' }, h('span', { class: 'remap-label' }, ACTION_LABELS[a]), h('span', { class: 'remap-chips' }, ...chips, add)));
      }
      setText(note, clash.length ? `Heads up: ${clash.map((c) => `${c.input.startsWith('key:') ? keyLabel(c.input.slice(4)) : padLabel(Number(c.input.slice(4)), fam)} does ${c.actions.map((x) => ACTION_LABELS[x].toLowerCase()).join(' and ')}`).join('; ')}.` : 'Click a key to change it, + to add one, right-click to remove. Escape and F3 are fixed.');
    };
    const listen = (a: GameAction, kind: 'key' | 'pad' | 'any', slot: number): void => {
      setText(note, `${ACTION_LABELS[a]}: press a ${kind === 'pad' ? 'gamepad button' : kind === 'key' ? 'key' : 'key or gamepad button'}… (Escape cancels)`);
      this.g.captureInput((c) => {
        if (c && 'key' in c && kind !== 'pad') bind(b, a, { key: c.key }, kind === 'key' ? slot : -1);
        else if (c && 'pad' in c && kind !== 'key') bind(b, a, { pad: c.pad }, kind === 'pad' ? slot : -1);
        this.g.sound(c ? 'click' : 'back');
        commit();
        render();
      });
    };
    const back = (): void => {
      this.g.sound('back');
      onBack();
    };
    render();
    const el = h(
      'div',
      { class: 'modal panel settings controls' },
      h('div', { class: 'title small' }, 'Controls'),
      table,
      note,
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', onclick: back, 'data-autofocus': true }, 'Done'),
        h('button', { class: 'btn ghost small', onclick: () => {
          save.data.settings.controls.bindings = defaultBindings();
          commit();
          this.g.sound('click');
          this.controls(onBack);
        } }, 'Reset to defaults'),
      ),
    );
    this.g.ui.show('controls', el, back);
  }

  confirm(text: string, yes: () => void, no: () => void): void {
    const el = h(
      'div',
      { class: 'modal panel' },
      h('div', { class: 'subtitle big' }, text),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: no, 'data-autofocus': true }, 'Cancel'), h('button', { class: 'btn primary', onclick: yes }, 'Yes')),
    );
    this.g.ui.show('confirm', el, no);
  }

  // ───────────────────────────── in-run ─────────────────────────────

  pause(w: World): void {
    const resume = (): void => {
      this.g.sound('back');
      this.g.resume();
    };
    const build = h(
      'div',
      { class: 'build' },
      ...w.weapons.map((x) => h('div', { class: 'build-item' }, img(iconUrl(x.def.id, 'weapon'), 'mini-icon big'), h('div', null, h('div', { class: 'card-name small' }, x.def.name), h('div', { class: 'small-desc' }, x.def.evolved ? 'Evolved' : `Lv ${x.level}`, ` · ${Math.round(x.damageDealt).toLocaleString()} dmg`)))),
      ...w.passives.map((x) => h('div', { class: 'build-item' }, img(iconUrl(x.def.id, 'passive'), 'mini-icon big'), h('div', null, h('div', { class: 'card-name small' }, x.def.name), h('div', { class: 'small-desc' }, `Lv ${x.level}`)))),
    );
    const el = h(
      'div',
      { class: 'modal panel pause' },
      h('div', { class: 'title' }, 'Paused'),
      h('div', { class: 'subtitle' }, `${formatTime(w.time)} · Level ${w.player.level} · ${w.stats.kills} bonks`),
      build,
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', onclick: resume, 'data-autofocus': true }, 'Resume'),
        h('button', { class: 'btn', onclick: () => this.settings(() => this.pause(w)) }, 'Settings'),
        h('button', { class: 'btn ghost', onclick: () => this.confirm('Abandon this run? You keep the gold you earned.', () => this.g.quitToTitle(), () => this.pause(w)) }, 'Quit run'),
      ),
    );
    this.g.ui.show('pause', el, resume);
  }

  gameOver(r: RunSummary, out: RunOutcome, retry: () => void, note?: string): void {
    const won = r.won;
    const rows = r.weapons
      .slice()
      .sort((a, b) => b.damage - a.damage)
      .map((x) => {
        const def = weaponDef(x.id);
        return h('div', { class: 'wrow' }, img(iconUrl(x.id, 'weapon'), 'mini-icon'), h('span', { class: 'wname' }, def.name, def.evolved ? '' : ` Lv${x.level}`), h('b', null, x.damage.toLocaleString()), h('span', { class: 'wk' }, `${x.kills} kills`));
      });
    const bosses = Object.entries(r.bossKills)
      .map(([id, n]) => `${ENEMIES.find((e) => e.id === id)?.name ?? id}${n > 1 ? ` ×${n}` : ''}`)
      .join(', ');
    const g = out.gold;
    const leave = (next: () => void): void => {
      this.g.sound('click');
      this.g.clearRun();
      next();
    };
    const el = h(
      'div',
      { class: 'modal panel gameover' },
      h('div', { class: `title${won ? ' win' : ''}` }, won ? 'Dawn breaks!' : 'Bonked!'),
      h('div', { class: 'subtitle' }, won ? mapDef(r.mapId).winText : `You held out for ${formatTime(r.time)} in ${mapDef(r.mapId).name}.${out.newBest ? ' A new personal best!' : ''}`),
      h('div', { class: 'go-mode' }, r.daily ? `Daily run · ${r.daily}` : difficultyLabel(r.difficulty, r.tier)),
      note ? h('div', { class: 'subtitle warn' }, note) : null,
      ...out.newMaps.map((id) => h('div', { class: 'subtitle unlock' }, `New map unlocked: ${mapDef(id).name}! Pick it on the hero screen.`)),
      h(
        'div',
        { class: 'go-cols' },
        h(
          'div',
          { class: 'go-stats' },
          ...[
            ['Time', formatTime(r.time)],
            ['Level', String(r.level)],
            ['Gloom bonked', r.kills.toLocaleString()],
            ['Bosses', bosses || '—'],
            ['Evolutions', String(r.evolutions)],
            ['Top speed', r.topSpeed.toFixed(1)],
          ].map(([k, v]) => h('div', { class: 'stat-row' }, h('span', null, k), h('b', null, v))),
          h('div', { class: 'gold-earned' }, h('div', { class: 'panel-title' }, 'Gold earned'), h('div', { class: 'stat-row' }, h('span', null, 'Coins collected'), h('b', null, String(g.coins))), h('div', { class: 'stat-row' }, h('span', null, 'Bonk bonus'), h('b', null, String(g.kills))), h('div', { class: 'stat-row' }, h('span', null, 'Survival bonus'), h('b', null, String(g.time))), g.bosses ? h('div', { class: 'stat-row' }, h('span', null, 'Boss bounty'), h('b', null, String(g.bosses))) : null, g.victory ? h('div', { class: 'stat-row' }, h('span', null, 'Victory'), h('b', null, String(g.victory))) : null, h('div', { class: 'stat-row total' }, h('span', null, 'Total'), goldChip(g.total))),
        ),
        h('div', { class: 'go-weapons' }, h('div', { class: 'panel-title' }, 'Damage by weapon'), ...rows, r.passives.length ? h('div', { class: 'go-passives' }, ...r.passives.map((p) => img(iconUrl(p.id, 'passive'), 'mini-icon', passiveDef(p.id).name))) : null),
      ),
      out.achievements.length ? h('div', { class: 'go-ach' }, h('div', { class: 'panel-title' }, 'Unlocked!'), ...out.achievements.map((a) => h('div', { class: 'ach done small' }, h('div', { class: 'ach-name' }, `★ ${a.name}`), h('div', { class: 'ach-reward' }, rewardText(a))))) : null,
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', onclick: retry, 'data-autofocus': true }, 'Play again'),
        h('button', { class: 'btn', onclick: () => leave(() => this.characterSelect()) }, 'Change hero'),
        h('button', { class: 'btn', onclick: () => leave(() => this.shop()) }, 'Workshop'),
        h('button', { class: 'btn ghost', onclick: () => leave(() => this.title()) }, 'Title'),
      ),
      this.playtestRow(() => undefined),
    );
    this.g.ui.show('gameover', el, () => leave(() => this.title()), {}, true);
  }
}

export function rewardText(a: AchievementDef): string {
  const r = a.reward;
  if (r.character) return `Unlocks ${CHARACTERS.find((c) => c.id === r.character)?.name ?? r.character}`;
  if (r.weapon) return `Unlocks ${weaponDef(r.weapon).name}`;
  if (r.gold) return `+${r.gold} gold`;
  return '';
}

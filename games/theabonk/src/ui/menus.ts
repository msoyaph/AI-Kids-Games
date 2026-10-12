import { ACHIEVEMENTS, type AchievementDef } from '../config/achievements';
import { CHARACTERS } from '../config/characters';
import { ENEMIES } from '../config/enemies';
import { SHOP } from '../config/meta';
import { passiveDef } from '../config/passives';
import type { CharacterDef } from '../config/types';
import { weaponDef } from '../config/weapons';
import { formatTime } from '../core/math';
import { achievementContext, buy, nextCost, refundAll, shopRank, totalSpent, type RunOutcome, type RunSummary } from '../meta/progression';
import type { SaveManager, Settings } from '../meta/save';
import type { World } from '../sim/world';
import { h, img } from './dom';
import { iconUrl, portraitUrl } from './icons';
import type { UI } from './UI';

export interface GameApi {
  ui: UI;
  save: SaveManager;
  startRun(characterId: string): void;
  applySettings(): void;
  showcase(characterId: string): void;
  quitToTitle(): void;
  /** Drop the finished run so menus get the idle backdrop again. */
  clearRun(): void;
  resume(): void;
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
  reroll: ['velocityFeather', 'passive'],
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
        h('button', { class: 'btn', onclick: go(() => this.shop()) }, 'Workshop'),
        h('button', { class: 'btn', onclick: go(() => this.records()) }, 'Records'),
        h('button', { class: 'btn', onclick: go(() => this.howToPlay()) }, 'How to play'),
        h('button', { class: 'btn', onclick: go(() => this.settings(() => this.title())) }, 'Settings'),
      ),
      h('div', { class: 'corner-tr' }, goldChip(d.gold)),
      d.stats.runsPlayed > 0 ? h('div', { class: 'corner-bl' }, `Best ${formatTime(d.stats.bestTime)} · ${d.stats.totalKills.toLocaleString()} bonks · ${d.stats.runsPlayed} runs`) : null,
      !save.persistent ? h('div', { class: 'corner-br warn' }, 'Storage unavailable — progress lasts this session only') : null,
    );
    this.g.ui.show('title', el);
  }

  // ───────────────────────────── characters ─────────────────────────────

  characterSelect(): void {
    const d = this.g.save.data;
    this.selected = d.unlockedCharacters.includes(d.lastCharacter) ? d.lastCharacter : 'thea';
    this.g.showcase(this.selected);
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
        this.g.showcase(c.id);
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
      h('div', { class: 'char-row' }, ...cards),
      details,
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: back }, 'Back'), startBtn),
      h('div', { class: 'corner-tr' }, goldChip(d.gold)),
    );
    this.g.ui.show('select', el, back);
  }

  private begin(): void {
    const d = this.g.save.data;
    if (!d.unlockedCharacters.includes(this.selected)) {
      this.g.sound('error');
      return;
    }
    d.lastCharacter = this.selected;
    this.g.save.save();
    this.g.sound('open');
    this.g.startRun(this.selected);
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
    ];
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
        h('div', { class: 'panel stats-panel' }, h('div', { class: 'panel-title' }, 'Lifetime'), ...statRows.map(([k, v]) => h('div', { class: 'stat-row' }, h('span', null, k), h('b', null, v)))),
        h('div', { class: 'panel ach-panel' }, h('div', { class: 'panel-title' }, `Achievements ${d.achievements.length}/${ACHIEVEMENTS.length}`), h('div', { class: 'ach-list' }, ...ach)),
      ),
      h('button', { class: 'btn ghost', onclick: back, 'data-autofocus': true }, 'Back'),
    );
    this.g.ui.show('records', el, back);
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

  gameOver(r: RunSummary, out: RunOutcome, retry: () => void): void {
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
      h('div', { class: 'subtitle' }, won ? 'The Gloom retreats. Thea’s meadow is safe… for now.' : `You held out for ${formatTime(r.time)}.${out.newBest ? ' A new personal best!' : ''}`),
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

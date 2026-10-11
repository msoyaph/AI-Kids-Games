// Event UI: festival talk with the host, birthday greetings, Wanda's stall, and the Calendar app.
import type { App } from '../app';
import { BIRTHDAYS, CONTEST_DAYS, FESTIVALS, MERCHANT } from '../data/festivals';
import { item } from '../data/registry';
import { VILLAGER_BY_ID } from '../data/villagers';
import { fmt } from '../core/math';
import type { Game } from '../sim/game';
import { buyFromMerchant, festivalHandIn, festivalHost, festivalNow, festivalState, festivalToday, isBirthday, merchantHere, merchantStock } from '../sim/happenings';
import { SEASONS, SEASON_DAYS, SEASON_ICON, SEASON_NAME } from '../sim/seasons';
import { parseLine } from '../sim/talk';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';
import { registerPhoneApp } from './phone';
import type { TalkOption } from './conversation';

const P = (g: Game, s: string) => parseLine(s, { player: g.state.player.name, catch: '' });

/** Festival talk with the host. */
function festivalOptions(app: App, id: string): TalkOption[] {
  const g = app.game!;
  const f = festivalNow(g);
  if (!f || festivalHost(g, f) !== id) {
    // say when it starts if you talk to the host early
    const today = festivalToday(g);
    if (today && festivalHost(g, today) === id && !festivalNow(g))
      return [{ label: `🎉 About the ${today.name}`, run: async (b) => b.say([P(g, `[happy]The ${today.name} starts at ${today.hours[0] > 12 ? `${today.hours[0] - 12} PM` : `${today.hours[0]} AM`}. See you in the plaza!`)]) }];
    return [];
  }
  const st = festivalState(g)!;
  return [
    {
      label: st.done ? `🎉 ${f.name}` : `🎉 ${f.name}!`,
      run: async (b) => {
        if (st.done) {
          await b.say([P(g, '[happy]Thank you for joining the festival! See you at the next one!')]);
          return;
        }
        const firstTime = !g.state.flags[`fest_intro_${f.id}_${g.state.clock.day}`];
        if (firstTime) {
          g.state.flags[`fest_intro_${f.id}_${g.state.clock.day}`] = 1;
          await b.say(f.intro.map((l) => P(g, l)));
        }
        const given = festivalHandIn(g);
        if (st.done) {
          await b.say(f.thanks.map((l) => P(g, l)));
          g.toast(`You got ${f.reward.items.map((r) => item(r).name).join(' and ')} and ${f.reward.lumens} Lumens!`, 'good', f.reward.items[0]);
          return;
        }
        const left = f.need - st.progress;
        const msg = given > 0 ? `[happy]Thank you! Just ${left} more to go.` : `[neutral]${f.goal} You have done ${st.progress} of ${f.need}.`;
        await b.say([P(g, msg)]);
      },
    },
  ];
}

export function installEventsUI(app: App): void {
  const base = app.talkHooks;
  app.talkHooks = {
    intro: async (id, box) => {
      const g = app.game!;
      // a birthday hello, once a day
      const key = `bday_talk_${id}`;
      if (isBirthday(g, id) && g.state.flags[key] !== g.state.clock.day) {
        g.state.flags[key] = g.state.clock.day;
        await box.say([P(g, `[love]It's my birthday today! Thank you for visiting me, ${g.state.player.name}!`), P(g, '[happy]Gifts make me extra happy today. Just saying!')]);
      }
      return base.intro(id, box);
    },
    options: (id) => [...festivalOptions(app, id), ...base.options(id)],
  };
  app.panels.merchant = () => app.game && app.ui.push(new MerchantPanel(app.ui, app.game));
  registerPhoneApp({ id: 'calendar', name: 'Calendar', icon: '▦', color: '#9fd0ec', render: (_a, g, body) => calendarBody(g, body) });
}

// ---------------------------------------------------------------- Wanda's stall


export class MerchantPanel implements Panel {
  name = 'merchant';
  el: HTMLElement;
  modal = true;
  private body = h('div', { class: 'col' });
  constructor(private ui: UIManager, private g: Game) {
    this.el = h(
      'div',
      { class: 'screen', style: 'z-index:9' },
      h('div', { class: 'dim', onclick: () => ui.pop(this) }),
      h(
        'div',
        { class: 'panel center', style: 'padding:20px;width:min(640px,96vw)' },
        h('h2', null, `${MERCHANT.name}'s Stall`, h('span', { class: 'spacer' }), btn('✕', () => ui.pop(this), 'small ghost')),
        h('div', { class: 'speech' }, h('b', null, `${MERCHANT.name}: `), "Treasures from far-away islands! I'll only be here today."),
        this.body,
      ),
    );
    this.render();
  }
  command(c: string): boolean {
    if (c === 'back' || c === 'cancel') {
      this.ui.pop(this);
      return true;
    }
    return false;
  }
  render(): void {
    const g = this.g;
    clear(this.body);
    this.body.append(h('div', { class: 'pill' }, h('span', { class: 'glint' }, '✦'), fmt(g.state.player.glints)));
    const grid = h('div', { class: 'shop-grid' });
    const ev = g.state.events.merchant;
    for (const e of merchantStock(g)) {
      const sold = e.limited && ev?.day === g.state.clock.day && ev.sold.includes(e.id);
      const card = h('button', { class: `shop-card ${sold ? 'sold' : ''}`, 'data-nav': '' }, iconImg(e.id, 'icon big'), h('div', { class: 'nm' }, item(e.id).name), h('div', { class: 'price' }, sold ? 'Sold out' : `✦ ${fmt(e.price)}`));
      if (sold) card.setAttribute('disabled', '');
      card.addEventListener('click', () => {
        if (buyFromMerchant(g, e)) g.toast(`Bought ${item(e.id).name}!`, 'good', e.id);
        this.render();
      });
      grid.append(card);
    }
    this.body.append(grid);
    this.ui.focusFirst(this);
  }
}

// ---------------------------------------------------------------- Calendar app

/** What's on, day by day, this season (and a peek at the next). */
export function calendarEntries(g: Game, seasonIndex: number, day: number): string[] {
  const out: string[] = [];
  const season = SEASONS[seasonIndex]!;
  const after = g.state.quests.chapter >= 3 || g.state.quests.finished;
  if (after) {
    const fest = FESTIVALS.find((f) => f.season === season && f.day === day);
    if (fest) out.push(`🎉 ${fest.name}`);
    if (g.state.quests.done.includes('m4_tourney') && day === CONTEST_DAYS.tournament) out.push('🎣 Fishing Tournament');
    if (g.state.quests.done.includes('m4_bugoff') && day === CONTEST_DAYS.bugoff) out.push('🦋 Bug-Off');
  }
  for (const [id, [si, d]] of Object.entries(BIRTHDAYS)) if (si === seasonIndex && d === day && g.state.villagers[id]?.movedIn) out.push(`🎂 ${VILLAGER_BY_ID[id]?.name}'s birthday`);
  return out;
}

function calendarBody(g: Game, body: HTMLElement): void {
  const s = g.state.season;
  const season = SEASONS[s.index]!;
  body.append(h('div', { class: 'cal-head' }, `${SEASON_ICON[season]} ${SEASON_NAME[season]}`, s.paused ? h('span', { class: 'tag' }, 'paused') : null));
  const grid = h('div', { class: 'cal-grid' });
  for (let d = 1; d <= SEASON_DAYS; d++) {
    const offset = d - s.day;
    const clockDay = g.state.clock.day + offset;
    const items = calendarEntries(g, s.index, d);
    if (merchantDay(g, clockDay)) items.push(`🪶 ${MERCHANT.name} visits`);
    grid.append(h('div', { class: `cal-day ${d === s.day ? 'today' : ''} ${d < s.day ? 'past' : ''}` }, h('b', null, d === s.day ? `Day ${d} · Today` : `Day ${d}`), ...items.map((t) => h('div', { class: 'tiny' }, t)), items.length ? null : h('div', { class: 'tiny muted' }, '—')));
  }
  body.append(grid);
  if (!s.paused) {
    const next = (s.index + 1) % 4;
    const nextName = SEASONS[next]!;
    body.append(h('div', { class: 'tiny muted' }, `${SEASON_ICON[nextName]} ${SEASON_NAME[nextName]} starts in ${SEASON_DAYS - s.day + 1} day${SEASON_DAYS - s.day + 1 === 1 ? '' : 's'}.`));
  }
}

function merchantDay(g: Game, day: number): boolean {
  if (!(g.state.quests.chapter >= 3 || g.state.quests.finished)) return false;
  return day >= MERCHANT.every + MERCHANT.offset && (day - MERCHANT.offset) % MERCHANT.every === 0;
}

export { merchantHere };

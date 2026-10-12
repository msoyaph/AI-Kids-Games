/** Client glue for villagers: talking, gifting, mail, friends & calendar tabs. */
import { TILE, DIR_DX, DIR_DY, type Dir } from '../core/math';
import { FESTIVALS } from '../data/festivals';
import { tryItem } from '../data/items';
import { SHOPS } from '../data/shops';
import { VILLAGER, VILLAGERS } from '../data/villagers';
import { NpcView } from '../render/npc-view';
import { canGift, giveGift, hearts, isBirthday, npcState, talk, taste } from '../sim/friendship';
import { LETTER, claimAttachment, unreadCount } from '../sim/mail';
import { keeperAtCounter, npcNear, npcs, type NpcRt } from '../sim/npcs';
import { SEASON_NAMES, WEEKDAY_SHORT, dayOfSeason, seasonOf } from '../sim/state';
import { DLG_CSS, portrait, showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { infoLine, invGrid } from '../ui/inventory';
import { iconName, itemName } from '../ui/itemview';
import { registerTab } from '../ui/menu';
import { HOOKS, type Game } from './game';
import { activeRequest, canDeliver, deliver, requesterName } from '../sim/quests';

let npcView: NpcView | null = null;

export function installVillagers(g: Game): void {
  const style = document.createElement('style');
  style.textContent = DLG_CSS + VILLAGER_CSS;
  document.head.appendChild(style);
  npcView = new NpcView(g.atlas, g.view);
  HOOKS.onRender.push((game) => npcView!.update(game.sim, game.time));
  HOOKS.onAttach.push(() => npcView?.clear());
  HOOKS.interactNearby.push((game) => {
    const p = game.sim.p;
    const fx = p.x + DIR_DX[p.dir] * 12, fy = p.y - 4 + DIR_DY[p.dir] * 12;
    const rt = npcNear(game.sim, fx, fy, 16) ?? npcNear(game.sim, p.x, p.y - 4, 14);
    if (!rt) return false;
    talkTo(game, rt);
    return true;
  });
  HOOKS.shopKeeper = (game, shop) => keeperAtCounter(game.sim, SHOPS[shop].room, SHOPS[shop].keeper);
  HOOKS.trigger.mail = (game) => openMail(game);
  HOOKS.trigger.calendar = (game) => game.openMenu('calendar');
  HOOKS.trigger.questboard = (game) => openQuestBoard(game);
  registerTab({ id: 'quests', label: 'Journal', icon: 'ui.book', render: (host) => journalTab(host as unknown as Game) }, 3);
  registerTab({ id: 'friends', label: 'Friends', icon: 'ui.heart', render: (host) => friendsTab(host as unknown as Game) }, 1);
  registerTab({ id: 'calendar', label: 'Calendar', icon: 'ui.season0', render: (host) => calendarTab(host as unknown as Game) }, 2);
}

/** Villager under the mouse pointer (for click-to-talk). */
export function npcAtPointer(g: Game): NpcRt | null {
  const ptr = g.input.pointer;
  if (!ptr.active) return null;
  const w = g.screenToWorld(ptr.x, ptr.y);
  for (const rt of npcs(g.sim).list) {
    if (rt.loc !== g.sim.p.loc || rt.hidden) continue;
    if (Math.abs(w.x - rt.x) < 8 && w.y < rt.y + 2 && w.y > rt.y - 28) return rt;
  }
  return null;
}

export function talkTo(g: Game, rt: NpcRt): void {
  const sim = g.sim, p = sim.p;
  const v = VILLAGER[rt.id];
  // face each other
  const dx = p.x - rt.x, dy = p.y - rt.y;
  rt.dir = (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0) as Dir;
  p.dir = (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 1) : dy < 0 ? 0 : 3) as Dir;
  rt.hold = true;
  const { text, first } = talk(sim, rt.id);
  if (first) rt.emote = { kind: isBirthday(sim, v) ? 'music' : 'happy', until: g.time + 1.6 };
  g.sfx('talk');
  const st = npcState(sim, rt.id);
  showDialogue(g.modals, {
    name: v.name,
    face: v.id,
    text,
    hearts: hearts(sim, rt.id),
    speak: g.settings.readAloud,
    pitch: v.pitch,
    instant: g.settings.reducedMotion,
    buttons: [
      ...(canDeliver(sim, rt.id)
        ? [{ label: `Deliver ${activeRequest(sim)!.n} ${itemName(activeRequest(sim)!.item)}`, cls: '', onClick: () => { setTimeout(() => deliverTo(g, rt), 0); } }]
        : []),
      { label: st.gifted ? 'Gift given ✓' : 'Give a gift', cls: 'blue', onClick: () => { if (!st.gifted) setTimeout(() => giftPicker(g, rt), 0); } },
      { label: 'Bye!', cls: 'green' },
    ],
    onClose: () => {
      if (!g.modals.open) rt.hold = false;
    },
  });
}

function giftPicker(g: Game, rt: NpcRt): void {
  const sim = g.sim, v = VILLAGER[rt.id];
  const info = infoLine();
  let close = () => {};
  const wrap = h(
    'div',
    { class: 'wide-modal' },
    h('h2', null, `A gift for ${v.name}`),
    h('p', null, 'Pick something from your bag. Everyone has favorite things — try different gifts to learn what they love!'),
    invGrid(sim.p.inv, {
      sim,
      info,
      enabled: (s) => canGift(sim, rt.id, s.id).ok,
      onClick: (i) => {
        const s = sim.p.inv[i];
        if (!s) return;
        const r = giveGift(sim, rt.id, i);
        close();
        if (!r.ok) {
          if (r.msg) g.toasts.show(r.msg);
          rt.hold = false;
          return;
        }
        rt.emote = { kind: r.taste === 'love' ? 'heart' : r.taste === 'like' ? 'happy' : r.taste === 'dislike' ? 'sweat' : 'dots', until: g.time + 2 };
        g.sfx(r.taste === 'love' ? 'love' : r.taste === 'dislike' ? 'meh' : 'gift');
        showDialogue(g.modals, {
          name: v.name,
          face: v.id,
          text: r.text ?? '',
          hearts: hearts(sim, rt.id),
          speak: g.settings.readAloud,
          pitch: v.pitch,
          instant: g.settings.reducedMotion,
          buttons: [{ label: 'You\'re welcome!', cls: 'green' }],
          onClose: () => (rt.hold = false),
        });
      },
    }),
    info,
    h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => { close(); rt.hold = false; } }, 'Never mind')),
  );
  close = g.modals.show(wrap, { cancel: () => (rt.hold = false) });
}

function deliverTo(g: Game, rt: NpcRt): void {
  const v = VILLAGER[rt.id];
  const r = deliver(g.sim);
  if (!r.ok) {
    rt.hold = false;
    return;
  }
  g.sfx('coin');
  rt.emote = { kind: 'heart', until: g.time + 2 };
  showDialogue(g.modals, {
    name: v.name,
    face: v.id,
    text: `You did it! Thank you so much, ${g.sim.p.name}! Here's ${r.reward} coins for your help.`,
    hearts: hearts(g.sim, rt.id),
    speak: g.settings.readAloud,
    pitch: v.pitch,
    buttons: [{ label: 'Happy to help!', cls: 'green' }],
    onClose: () => (rt.hold = false),
  });
}

function openQuestBoard(g: Game): void {
  const sim = g.sim;
  const b = activeRequest(sim);
  let close = () => {};
  const wrap = h('div', { class: 'wide-modal' }, h('h2', null, 'Help Wanted'));
  if (!b) {
    wrap.appendChild(h('p', null, 'No requests pinned up right now. New notes appear every couple of days!'));
  } else {
    const accepted = !!sim.state.flags.questAccepted;
    wrap.appendChild(
      h('div', { class: 'letter' },
        h('img', { src: portrait(b.npc), class: 'letter-face', alt: '' }),
        h('p', null, b.text),
        h('p', null, h('b', null, `— ${requesterName(b.npc)}`)),
        h('p', null, `Reward: ${b.reward} coins + friendship. Due by the end of ${SEASON_NAMES[seasonOf(b.until)]} ${dayOfSeason(b.until)}.`),
      ),
    );
    const btn = h('button', { class: 'btn green', disabled: accepted }, accepted ? 'Accepted ✓ — bring it to them!' : 'Accept');
    btn.addEventListener('click', () => {
      sim.state.flags.questAccepted = 1;
      g.sfx('pop');
      btn.textContent = 'Accepted ✓ — bring it to them!';
      btn.setAttribute('disabled', '');
    });
    wrap.appendChild(h('div', { class: 'actions', style: 'justify-content:flex-start' }, btn));
  }
  wrap.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => close() }, 'Close')));
  close = g.modals.show(wrap, { cancel: () => {} });
}

/** Sections other systems add to the journal (story goals, year goals…). */
export const JOURNAL: ((g: Game) => HTMLElement | null)[] = [];

function journalTab(g: Game): HTMLElement {
  const sim = g.sim;
  const el = h('div', { style: 'max-height:56vh;overflow:auto' });
  const b = activeRequest(sim);
  el.appendChild(h('h3', { style: 'margin:0 0 6px' }, 'Help Wanted'));
  if (b && sim.state.flags.questAccepted) {
    const have = Math.min(b.n, sim.p.inv.reduce((t, s) => t + (s && s.id === b.item ? s.n : 0), 0));
    el.appendChild(h('div', { class: 'row' }, icon(iconName(b.item), 32), h('div', { class: 'nm' }, h('b', null, `Bring ${b.n} ${itemName(b.item)} to ${requesterName(b.npc)}`), h('small', null, `You have ${have}/${b.n}. Reward: ${b.reward} coins.`))));
  } else el.appendChild(h('p', null, b ? 'There is a note on the Help Wanted board in town!' : 'No request right now. Check the board by the Valley Hall.'));
  for (const f of JOURNAL) {
    const sec = f(g);
    if (sec) el.appendChild(sec);
  }
  return el;
}

// ── Mail ────────────────────────────────────────────────────
export function openMail(g: Game): void {
  const sim = g.sim;
  let close = () => {};
  const wrap = h('div', { class: 'wide-modal' });
  const list = () => {
    wrap.innerHTML = '';
    wrap.appendChild(h('h2', null, 'Mailbox'));
    const letters = sim.state.mail.slice().reverse();
    if (!letters.length) wrap.appendChild(h('p', null, 'No letters yet. Check back tomorrow morning!'));
    const ul = h('div', { class: 'rows' });
    for (const m of letters) {
      const l = LETTER[m.id];
      if (!l) continue;
      const from = VILLAGER[l.from]?.name ?? (l.from === 'aunt' ? 'Great-Aunt Rosemary' : l.from === 'hall' ? 'Valley Hall' : 'Cliff Valley');
      const row = h('div', { class: 'row', style: 'cursor:pointer' }, icon(m.read ? 'ui.book' : 'ui.chat', 24), h('div', { class: 'nm' }, h('b', null, l.subject), h('small', null, `From ${from}${l.attach && !m.claimed ? ' · 🎁 something inside!' : ''}`)), m.read ? null : h('span', { class: 'new-dot' }, 'NEW'));
      row.addEventListener('click', () => read(m.id));
      ul.appendChild(row);
    }
    wrap.appendChild(ul);
    wrap.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn green', onclick: () => close() }, 'Done')));
  };
  const read = (id: string) => {
    const m = sim.state.mail.find((x) => x.id === id)!;
    const l = LETTER[id];
    m.read = true;
    wrap.innerHTML = '';
    const from = VILLAGER[l.from];
    const body = l.body.replace(/\{name\}/g, sim.p.name).replace(/\{farm\}/g, sim.p.farm).replace(/\{pet\}/g, sim.state.pet.name);
    const paper = h('div', { class: 'letter' }, from ? h('img', { src: portrait(from.id), class: 'letter-face', alt: '' }) : null, h('h3', null, l.subject), ...body.split('\n').map((t) => h('p', null, t)));
    wrap.appendChild(paper);
    if (l.attach) {
      const a = l.attach;
      const label = a.item ? `${a.n ?? 1}× ${tryItem(a.item)?.name ?? a.item}` : a.recipe ? 'A recipe card!' : `${a.coins} coins`;
      const btn = h('button', { class: 'btn green', disabled: !!m.claimed }, m.claimed ? 'Already taken ✓' : `Take: ${label}`);
      btn.addEventListener('click', () => {
        if (claimAttachment(sim, id) !== null) {
          g.sfx('pop');
          btn.textContent = 'Taken ✓';
          btn.setAttribute('disabled', '');
          if (a.item) g.toasts.pickup(iconName(a.item), `+${a.n ?? 1} ${itemName(a.item)}`);
        }
      });
      wrap.appendChild(h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, a.item ? icon(iconName(a.item), 32) : icon('ui.book', 32), btn));
    }
    if (g.settings.readAloud) import('../ui/dialogue').then((d) => d.speak(body, from?.pitch ?? 1));
    wrap.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => list() }, 'Back'), h('button', { class: 'btn green', onclick: () => close() }, 'Done')));
  };
  list();
  close = g.modals.show(wrap, { cancel: () => {} });
  g.sfx('open');
}

export function hasMail(g: Game): boolean {
  return unreadCount(g.sim) > 0;
}

// ── Friends tab ────────────────────────────────────────────
function friendsTab(g: Game): HTMLElement {
  const sim = g.sim;
  const el = h('div', { class: 'friends' });
  el.appendChild(h('p', { style: 'margin:0 0 8px' }, 'Talk to villagers every day and give gifts to grow your friendships. At 10 hearts you become best friends!'));
  const grid = h('div', { class: 'friend-grid' });
  for (const v of VILLAGERS) {
    const st = npcState(sim, v.id);
    const hr = hearts(sim, v.id);
    const hs = h('div', { class: 'hearts' });
    for (let i = 0; i < 10; i++) hs.appendChild(icon(i < hr ? 'ui.heart' : 'ui.heartEmpty', 12));
    const known = [...v.loves, ...v.likes].filter((id) => !id.startsWith('cat:') && sim.state.flags[`taste.${v.id}.${id}`]);
    grid.appendChild(
      h('div', { class: 'friend panel' + (st.met ? '' : ' unmet') },
        h('img', { src: portrait(v.id), alt: '' }),
        h('div', { class: 'fi' },
          h('b', null, st.met ? v.name : '???'),
          h('small', null, st.met ? v.role : 'Not met yet'),
          hs,
          h('small', null, `Birthday: ${SEASON_NAMES[v.birthday[0]]} ${v.birthday[1]}`),
          known.length ? h('small', null, `Likes: ${known.slice(0, 3).map((id) => tryItem(id)?.name ?? id).join(', ')}`) : null,
          h('small', { class: 'today' }, `${st.talked ? '💬 talked' : '· not talked'} ${st.gifted ? '· 🎁 gifted' : ''}${hr >= 10 ? ' · ⭐ Best friends!' : ''}`),
        ),
      ),
    );
  }
  el.appendChild(grid);
  void taste;
  return el;
}

// ── Calendar tab ───────────────────────────────────────────
function calendarTab(g: Game): HTMLElement {
  const sim = g.sim;
  const season = seasonOf(sim.state.day);
  const today = dayOfSeason(sim.state.day);
  const el = h('div');
  el.appendChild(h('h3', { style: 'margin:0 0 8px;display:flex;align-items:center;gap:6px' }, icon(`ui.season${season}`, 24), `${SEASON_NAMES[season]}, Year ${Math.floor(sim.state.day / 40) + 1}`));
  const grid = h('div', { class: 'cal' });
  for (const w of WEEKDAY_SHORT) grid.appendChild(h('div', { class: 'cal-h' }, w));
  for (let d = 1; d <= 10; d++) {
    const cell = h('div', { class: 'cal-d' + (d === today ? ' today' : '') + (d < today ? ' past' : '') }, h('b', null, String(d)));
    const fest = FESTIVALS.find((f) => f.season === season && f.day === d);
    if (fest) cell.appendChild(h('div', { class: 'cal-ev fest' }, '🎉 ' + fest.name));
    for (const v of VILLAGERS) if (v.birthday[0] === season && v.birthday[1] === d) cell.appendChild(h('div', { class: 'cal-ev', title: `${v.name}'s birthday` }, h('img', { src: portrait(v.id), alt: '' }), ' 🎂'));
    if (season === 3 && d === 10) cell.appendChild(h('div', { class: 'cal-ev fest' }, '✨ Year end'));
    grid.appendChild(cell);
  }
  el.appendChild(grid);
  const fest = FESTIVALS.find((f) => f.season === season);
  if (fest) el.appendChild(h('p', null, h('b', null, `${fest.name} (day ${fest.day}): `), fest.desc));
  const bdays = VILLAGERS.filter((v) => v.birthday[0] === season).map((v) => `${v.name} (day ${v.birthday[1]})`);
  if (bdays.length) el.appendChild(h('p', null, h('b', null, 'Birthdays: '), bdays.join(', '), '. Gifts on birthdays count triple!'));
  return el;
}

const VILLAGER_CSS = `
.friend-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; max-height: 52vh; overflow: auto; }
.friend { display: flex; gap: 8px; padding: 6px; align-items: flex-start; box-shadow: none; }
.friend img { width: 48px; height: 48px; image-rendering: pixelated; background: #cfe8b8; border-radius: 6px; flex: none; }
.friend.unmet img { filter: brightness(0) opacity(.35); }
.friend .fi { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.friend small { color: var(--ink2); font-size: .8em; }
.friend .hearts { display: flex; gap: 0; flex-wrap: wrap; }
.cal { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.cal-h { text-align: center; font-weight: 800; font-size: .85em; color: var(--ink2); }
.cal-d { min-height: 64px; background: var(--paper2); border-radius: 6px; padding: 4px; font-size: .8em; }
.cal-d.today { outline: 3px solid var(--rose); background: #fff6dc; }
.cal-d.past { opacity: .6; }
.cal-ev { display: flex; align-items: center; gap: 2px; margin-top: 2px; }
.cal-ev img { width: 20px; height: 20px; image-rendering: pixelated; }
.cal-ev.fest { font-weight: 700; color: var(--plum); }
.letter { background: #fffdf4; border: 2px dashed var(--paper3); border-radius: 8px; padding: 10px 14px; max-height: 50vh; overflow: auto; position: relative; }
.letter-face { float: right; width: 48px; height: 48px; image-rendering: pixelated; background: #cfe8b8; border-radius: 6px; margin-left: 8px; }
.letter h3 { margin: 0 0 6px; }
.new-dot { background: var(--rose); color: #fff; font-weight: 800; font-size: .75em; padding: 2px 6px; border-radius: 6px; }
`;

void TILE;

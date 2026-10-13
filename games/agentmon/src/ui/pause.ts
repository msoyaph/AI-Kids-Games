/**
 * The menu (M, Tab, Start or the Menu button): Team, Bag, Field Guide, Map, Quests, Agent Base,
 * Settings, Save. Big buttons, one page at a time, B or Back goes up a page. Everything here works
 * with touch, mouse, keyboard and gamepad (the focus manager moves between buttons).
 */
import { drawCreature } from '../art/creatures';
import { itemIcon } from '../art/icons';
import { canSwap, maxEnergy, xpForLevel } from '../core/creature';
import { addItem, useItem } from '../core/state';
import type { Creature, Difficulty } from '../core/types';
import { DEX } from '../data/index';
import { AREAS } from '../data/areas';
import { FACT_BY_ID } from '../data/facts';
import { ITEMS } from '../data/items';
import { MAPS } from '../data/maps/index';
import { NICKNAMES } from '../data/names';
import { QUEST_BY_ID, QUESTS } from '../data/quests';
import { SPECIES, SPECIES_LIST } from '../data/species';
import type { Game } from '../game/game';
import { applySettingsToDom } from '../game/settings';
import { canvasUrl } from '../render/atlas';
import { elementImg } from './battle-ui';
import { h } from './dom';
import { energyBar } from './parts';

const TRAIT_TEXT: Record<string, string> = {
  cozy: 'Cozy: Rest gives back a little more energy.',
  thrifty: 'Thrifty: moves cost a little less energy.',
  sturdy: 'Sturdy: super-strong bumps hurt a little less.',
  speedy: 'Speedy: a little faster.',
  cheerful: 'Cheerful: shakes off a status a turn sooner.',
  brave: 'Brave: a bit stronger when tired.',
  calm: 'Calm: never gets Dizzy.',
  warm: 'Warm: never gets Chilly.',
  waterproof: 'Waterproof: never gets Soaked.',
  fireproof: 'Fireproof: never gets Toasty.',
  wakeful: 'Wakeful: never gets Sleepy.',
  friendly: 'Friendly: easy to befriend, and shares a bit more experience.',
  guardian: 'Guardian: steady and kind, a little bit of everything.',
};

const imgCache = new Map<string, string>();
/** A creature picture for the menus (cached; a dark shape for ones you have only seen). */
export function creatureImg(species: string, opts: { shimmer?: boolean; size?: number; cls?: string; shadow?: boolean } = {}): HTMLElement {
  const key = `${species}:${opts.shimmer ? 1 : 0}`;
  let url = imgCache.get(key);
  if (!url) { url = canvasUrl(drawCreature(species, 32, undefined, opts.shimmer), 2); imgCache.set(key, url); }
  const size = opts.size ?? 64;
  return h(`img.px.mon${opts.cls ? `.${opts.cls}` : ''}${opts.shadow ? '.shadow' : ''}`, { src: url, alt: opts.shadow ? 'Unknown Agentmon' : SPECIES[species]?.name ?? species, width: size, height: size });
}

const itemImg = (id: string) => h('img.px.icon', { src: canvasUrl(itemIcon(id), 4), alt: '' });

/** Every outdoor place on the map of Sunreach (column, row on a 9 × 11 grid). */
const PLACES: Record<string, [number, number]> = {
  'sky-island': [3, 0], 'updraft-ridge': [4, 1], 'frostfall-slopes': [2, 0], frostfall: [2, 1], 'frost-pass': [2, 2],
  dunehollow: [2, 3], 'dune-flats': [2, 4], 'canyon-trail': [3, 3], cragtop: [4, 3], 'starlit-meadow': [5, 3], 'cragtop-slopes': [4, 4],
  'glimmer-cave': [4, 5], 'whisper-woods': [4, 6], mossgrove: [4, 7], 'mossgrove-woods': [5, 7], 'cliff-road': [4, 8],
  saltwhistle: [5, 8], 'sandy-shore': [6, 8], 'deep-blue-cove': [7, 8], 'meadow-path': [5, 9], brightmoor: [5, 10], 'academy-garden': [6, 10],
};

/** The outdoor place a map belongs to (rooms belong to the place their door opens onto). */
export function placeOf(mapId: string): string {
  for (let i = 0, id = mapId; i < 4; i++) {
    if (PLACES[id]) return id;
    const out = MAPS[id]?.warps.find(w => !w.to.startsWith('trial:') && w.to !== id);
    if (!out) break;
    id = out.to;
  }
  return mapId;
}

export function openPauseMenu(game: Game, start?: string): Promise<void> {
  const session = game.session!;
  const s = session.state;
  return new Promise(resolve => {
    const panel = h('div.panel.menu.pause');
    const el = h('div.menu-screen', { role: 'dialog', 'aria-label': 'Menu' }, panel);
    type Page = () => (HTMLElement | string)[];
    const stack: Page[] = [];
    const show = (page: Page, push = true) => {
      if (push) stack.push(page);
      if (stack.length > 1 || !push) game.sfx('page');
      panel.replaceChildren(...page());
      panel.scrollTop = 0;
      requestAnimationFrame(() => game.focus.focusFirst(panel));
    };
    const back = () => {
      stack.pop();
      const prev = stack[stack.length - 1];
      if (prev) show(prev, false); else close();
    };
    const close = () => { game.focus.pop(layer); el.remove(); resolve(); };
    game.sfx('open');
    const layer = { el, back };
    const header = (title: string, extra?: HTMLElement) => h('div.page-head', {}, h('button.back', { type: 'button', onclick: back, 'aria-label': 'Back' }, '◀ Back'), h('h2', {}, title), extra ?? '');
    const btn = (label: string | Node, onclick: () => void, o: { cls?: string; disabled?: boolean; autofocus?: boolean; hint?: string } = {}) =>
      h(`button${o.cls ? `.${o.cls}` : ''}` as 'button', { type: 'button', onclick, disabled: !!o.disabled, title: o.hint, ...(o.autofocus ? { 'data-autofocus': true } : {}) }, label);

    // ---- home
    const home = (): (HTMLElement | string)[] => {
      const guideCount = s.guide.friends.size;
      return [
        h('div.page-head', {}, h('h2', {}, 'Menu'), h('span.coins', {}, `🪙 ${s.coins}`)),
        h('div.menu-grid', {},
          btn(h('span', {}, '🐾', h('b', {}, 'Team')), () => show(teamPage), { autofocus: true }),
          btn(h('span', {}, '🎒', h('b', {}, 'Bag')), () => show(bagPage)),
          btn(h('span', {}, '📖', h('b', {}, 'Field Guide'), h('small', {}, `${guideCount}/52`)), () => show(guidePage)),
          btn(h('span', {}, '🗺️', h('b', {}, 'Map')), () => show(mapPage)),
          btn(h('span', {}, '⭐', h('b', {}, 'Quests')), () => show(questPage)),
          btn(h('span', {}, '🏡', h('b', {}, 'Agent Base'), h('small', {}, `${s.base.length}`)), () => show(basePage)),
          btn(h('span', {}, '⚙️', h('b', {}, 'Settings')), () => show(settingsPage)),
          btn(h('span', {}, '💾', h('b', {}, 'Save')), () => show(savePage)),
        ),
        btn('Back to playing', close, { cls: 'primary' }),
      ];
    };

    // ---- team
    const friendCard = (c: Creature, onclick: () => void, autofocus = false) => {
      const sp = SPECIES[c.species]!;
      return btn(h('span.friend', {}, creatureImg(c.species, { shimmer: c.shimmer, size: 48 }),
        h('span.fname', {}, elementImg(sp.element), h('b', {}, session.friendName(c)), h('span.lv', {}, ` Lv ${c.level}`)),
        energyBar(c.energy, maxEnergy(DEX, c), { small: true }), c.energy > 0 ? null : h('small', {}, 'A Rest Stop wakes it up.')), onclick, { cls: 'friend-btn', autofocus });
    };
    const teamPage = (): (HTMLElement | string)[] => [
      header('Team', h('span.note', {}, `${s.team.length}/6`)),
      h('div.friend-list', {}, ...s.team.map((c, i) => friendCard(c, () => show(() => friendPage(c, 'team')), i === 0))),
      h('p.note', {}, 'The first friend in your team leads every spar.'),
    ];
    const friendPage = (c: Creature, where: 'team' | 'base'): (HTMLElement | string)[] => {
      const sp = SPECIES[c.species]!;
      const next = c.level < 50 ? xpForLevel(c.level + 1) - c.xp : 0;
      const idx = s.team.indexOf(c);
      const actions: HTMLElement[] = [];
      if (where === 'team') {
        if (idx > 0) actions.push(btn('⬆ Lead the team', () => { s.team.splice(idx, 1); s.team.unshift(c); show(() => friendPage(c, 'team'), false); game.toast(`${session.friendName(c)} leads the team!`, 1200); }));
        if (s.team.length > 1) actions.push(btn('🏡 Rest at the Base', () => { s.team.splice(s.team.indexOf(c), 1); s.base.push(c); game.toast(`${session.friendName(c)} went to the Agent Base.`, 1400); back(); }));
      } else if (s.team.length < 6) actions.push(btn('🐾 Join the team', () => { s.base.splice(s.base.indexOf(c), 1); s.team.push(c); game.toast(`${session.friendName(c)} joined your team!`, 1400); back(); }));
      else actions.push(btn('🔄 Swap with a team friend', () => show(() => swapPage(c))));
      actions.push(btn('🍓 Give a berry', () => show(() => berryPage(c)), { disabled: !Object.keys(s.bag).some(id => ITEMS[id]?.kind === 'berry') }));
      actions.push(btn(c.gear ? `🎀 Gear: ${ITEMS[c.gear]?.name}` : '🎀 Give gear', () => show(() => gearPage(c))));
      actions.push(btn('🏷️ Nickname', () => show(() => nicknamePage(c))));
      if (where === 'base') {
        actions.unshift(btn('🤚 Pet', () => { c.friendship = Math.min(255, c.friendship + 4); game.toast(`${session.friendName(c)} wiggles happily! 💛`, 1200); }));
        actions.unshift(btn('🍪 Share a snack', () => show(() => snackPage(c)), { disabled: !Object.keys(s.bag).some(id => ITEMS[id]?.kind === 'snack') }));
      }
      return [
        header(session.friendName(c)),
        h('div.friend-detail', {},
          creatureImg(c.species, { shimmer: c.shimmer, size: 96 }),
          h('div', {},
            h('p', {}, elementImg(sp.element), h('b', {}, ` ${sp.name}`), ` · Lv ${c.level}${c.shimmer ? ' · ✨ shimmer' : ''}`),
            energyBar(c.energy, maxEnergy(DEX, c)),
            h('p.note', {}, c.level < 50 ? `${next} experience to the next level.` : 'Top level!'),
            h('p.note', {}, TRAIT_TEXT[sp.trait] ?? ''),
            h('p.note', {}, `Personality: ${c.personality}. Favorite snack: ${ITEMS[sp.favoriteSnack]?.name}.`),
            h('p.note', {}, `Friendship: ${'💛'.repeat(1 + Math.floor(c.friendship / 64))}`),
          )),
        h('div.move-list', {}, ...c.moves.map(id => {
          const m = DEX.moves[id]!;
          return h('div.move-row', {}, m.element !== 'plain' ? elementImg(m.element) : '', h('b', {}, ` ${m.name}`), h('span.mcost', {}, m.cost === 0 ? ' Free' : ` Energy ${Math.round(m.cost * 100)}%`), h('div.mdesc', {}, m.desc));
        })),
        h('div.menu-buttons', {}, ...actions),
      ];
    };
    const swapPage = (c: Creature): (HTMLElement | string)[] => [
      header(`Swap ${session.friendName(c)} with…`),
      h('div.friend-list', {}, ...s.team.map((t, i) => friendCard(t, () => {
        s.team[i] = c;
        s.base.splice(s.base.indexOf(c), 1, t);
        game.toast(`${session.friendName(c)} joined the team. ${session.friendName(t)} rests at the Base.`, 1800);
        back(); back();
      }, i === 0))),
    ];
    const berryPage = (c: Creature): (HTMLElement | string)[] => {
      const berries = Object.keys(s.bag).filter(id => ITEMS[id]?.kind === 'berry' && (s.bag[id] ?? 0) > 0);
      return [header(`A berry for ${session.friendName(c)}`), h('div.item-list', {}, ...berries.map((id, i) => {
        const it = ITEMS[id]!;
        const useless = c.energy <= 0 ? !it.revive : c.energy >= maxEnergy(DEX, c) && !it.cleanse;
        return btn(h('span.item', {}, itemImg(id), h('b', {}, ` ${it.name} ×${s.bag[id]}`), h('small', {}, it.desc)), () => {
          if (!useItem(s, id)) return;
          const max = maxEnergy(DEX, c);
          if (c.energy <= 0 && it.revive) c.energy = Math.max(1, Math.round(max * (it.restore ?? 0.5)));
          else if (c.energy > 0) c.energy = Math.min(max, c.energy + Math.round(max * (it.restore ?? 0)));
          game.toast(`${session.friendName(c)} feels better!`, 1200);
          back();
        }, { disabled: useless, autofocus: i === 0 });
      }))];
    };
    const gearPage = (c: Creature): (HTMLElement | string)[] => {
      const gear = Object.keys(s.bag).filter(id => ITEMS[id]?.kind === 'gear' && (s.bag[id] ?? 0) > 0);
      return [header(`Gear for ${session.friendName(c)}`), h('p.note', {}, 'Each friend can hold one piece of gear.'), h('div.item-list', {},
        ...(c.gear ? [btn(`Take off the ${ITEMS[c.gear]!.name}`, () => { addItem(s, c.gear!, 1); c.gear = undefined; back(); }, { autofocus: true })] : []),
        ...gear.map(id => btn(h('span.item', {}, itemImg(id), h('b', {}, ` ${ITEMS[id]!.name} ×${s.bag[id]}`), h('small', {}, ITEMS[id]!.desc)), () => {
          if (!useItem(s, id)) return;
          if (c.gear) addItem(s, c.gear, 1);
          c.gear = id;
          game.toast(`${session.friendName(c)} is wearing the ${ITEMS[id]!.name}!`, 1400);
          back();
        })),
        ...(gear.length || c.gear ? [] : [h('p', {}, 'No gear in your bag yet. Shops in bigger towns sell some.')]))];
    };
    const nicknamePage = (c: Creature): (HTMLElement | string)[] => {
      let offset = (c.uid * 13) % NICKNAMES.length;
      const draw = (): (HTMLElement | string)[] => [
        header(`A nickname for ${SPECIES[c.species]!.name}`),
        h('div.name-grid', {}, ...Array.from({ length: 8 }, (_, i) => (offset + i * 29) % NICKNAMES.length).map((n, i) =>
          btn(NICKNAMES[n]!, () => { c.nick = n; game.toast(`Hello, ${NICKNAMES[n]}!`, 1200); back(); }, { autofocus: i === 0 }))),
        h('div.menu-buttons', {},
          btn('More names', () => { offset = (offset + 11) % NICKNAMES.length; show(draw, false); }),
          btn(`Use "${SPECIES[c.species]!.name}"`, () => { c.nick = -1; back(); })),
      ];
      return draw();
    };
    const snackPage = (c: Creature): (HTMLElement | string)[] => {
      const fav = SPECIES[c.species]!.favoriteSnack;
      const snacks = Object.keys(s.bag).filter(id => ITEMS[id]?.kind === 'snack' && (s.bag[id] ?? 0) > 0);
      return [header(`A snack for ${session.friendName(c)}`), h('div.item-list', {}, ...snacks.map((id, i) =>
        btn(h('span.item', {}, itemImg(id), h('b', {}, ` ${ITEMS[id]!.name} ×${s.bag[id]}`), id === fav ? h('span.tag.good', {}, 'Favorite!') : ''), () => {
          if (!useItem(s, id)) return;
          c.friendship = Math.min(255, c.friendship + (id === fav ? 16 : 8));
          game.toast(id === fav ? `${session.friendName(c)} LOVES it! 💛💛` : `${session.friendName(c)} munches happily. 💛`, 1400);
          back();
        }, { autofocus: i === 0 })))];
    };

    // ---- bag
    const bagPage = (): (HTMLElement | string)[] => {
      const kinds: [string, string][] = [['snack', 'Snacks'], ['berry', 'Berries'], ['gear', 'Gear'], ['key', 'Special things']];
      return [header('Bag'), ...kinds.map(([k, title]) => {
        const ids = Object.keys(s.bag).filter(id => ITEMS[id]?.kind === k && (s.bag[id] ?? 0) > 0);
        return h('section.bag-section', {}, h('h3', {}, title), ids.length
          ? h('div.item-list', {}, ...ids.map(id => h('div.item-row', {}, itemImg(id), h('b', {}, ` ${ITEMS[id]!.name}${k === 'key' ? '' : ` ×${s.bag[id]}`}`), h('small', {}, ITEMS[id]!.desc))))
          : h('p.note', {}, k === 'gear' ? 'None yet.' : 'Empty.'));
      }), h('p.note', {}, 'Give berries and gear from the Team page. Snacks help you befriend.')];
    };

    // ---- Field Guide
    const guidePage = (): (HTMLElement | string)[] => {
      const seen = s.guide.seen, friends = s.guide.friends;
      return [
        header('Field Guide', h('span.note', {}, `Seen ${seen.size} · Friends ${friends.size} of 52`)),
        h('div.guide-grid', {}, ...SPECIES_LIST.map((sp, i) => {
          const known = seen.has(sp.num) || friends.has(sp.num);
          return btn(h('span.gcell', {}, known ? creatureImg(sp.id, { size: 48, shadow: !friends.has(sp.num) }) : h('span.qmark', {}, '?'), h('small', {}, `${sp.num}. ${known ? sp.name : '???'}`)),
            () => show(() => guideEntry(sp.id)), { cls: 'guide-btn', disabled: !known, autofocus: i === 0 });
        })),
      ];
    };
    const guideEntry = (id: string): (HTMLElement | string)[] => {
      const sp = SPECIES[id]!;
      const friend = s.guide.friends.has(sp.num);
      const stars = s.guide.stars[sp.num] ?? 0;
      const fact = FACT_BY_ID[id];
      const family = SPECIES_LIST.filter(x => x.family === sp.family).sort((a, b) => a.stage - b.stage);
      const where = AREAS.filter(a => a.wild.some(w => w.species === id)).map(a => a.name);
      return [
        header(`${sp.num}. ${sp.name}`),
        h('div.friend-detail', {},
          creatureImg(id, { size: 96, shadow: !friend, shimmer: friend && s.guide.shimmer.has(sp.num) }),
          h('div', {},
            h('p', {}, elementImg(sp.element), ` ${sp.element[0]!.toUpperCase()}${sp.element.slice(1)}${sp.guardian ? ' · Guardian' : ` · Stage ${sp.stage}`}`),
            h('p.stars', { 'aria-label': `${stars} of 3 research stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
            h('p', {}, friend ? sp.blurb : 'Befriend one to learn more!'))),
        friend && fact ? h('div.fact', {}, h('b', {}, `Real fact: ${fact.topic}`), h('p', {}, fact.text)) : '',
        family.length > 1 ? h('p.note', {}, `Grows: ${family.map(f => (s.guide.seen.has(f.num) || s.guide.friends.has(f.num) ? f.name : '???') + (f.grows ? ` (Lv ${f.grows.level})` : '')).join(' → ')}`) : '',
        h('p.note', {}, where.length ? `Lives in: ${where.join(', ')}.` : sp.guardian ? 'A guardian. Old stories tell where it waits.' : 'Grows from a friend. It does not live in the wild here.'),
        stars < 3 && friend ? h('p.note', {}, 'Research tip: befriend more of them, or help one grow, to earn stars. Three stars invites a rare shimmer!') : '',
      ];
    };

    // ---- map
    const mapPage = (): (HTMLElement | string)[] => {
      const here = placeOf(s.map);
      const stage = s.quests.main ?? 0;
      const goal = QUEST_BY_ID.main!.goals?.[stage];
      const goalPlace = goal ? placeOf(goal.map) : '';
      const cells = Object.entries(PLACES).map(([id, [x, y]]) => {
        const been = s.flags.has(`been:${id}`) || id === here;
        const name = MAPS[id]?.name ?? id;
        return h(`div.mcell${id === here ? '.here' : ''}${been ? '.been' : ''}${id === goalPlace ? '.goal' : ''}`, { style: `grid-column:${x + 1};grid-row:${y + 1}`, title: name },
          h('span', {}, been ? name : '???'), id === here ? h('b.you', {}, 'You') : id === goalPlace ? h('b.star', {}, '★') : '');
      });
      return [
        header('Map of Sunreach'),
        h('div.region-map', { role: 'img', 'aria-label': `You are in ${MAPS[here]?.name ?? here}.` }, ...cells),
        h('p.note', {}, `You are in ${MAPS[s.map]?.name ?? s.map}.${goal ? ` The ★ shows where to go next.` : ''}`),
      ];
    };

    // ---- quests
    const questPage = (): (HTMLElement | string)[] => {
      const main = QUEST_BY_ID.main!;
      const stage = s.quests.main ?? 0;
      const sides = QUESTS.filter(q => q.side && s.quests[q.id] !== undefined);
      return [
        header('Quests'),
        h('section.quest', {}, h('h3', {}, `⭐ ${main.title}`), h('p', {}, h('b', {}, 'Now: '), main.stages[stage] ?? 'All done!'),
          stage > 0 ? h('details', {}, h('summary', {}, 'Done so far'), h('ol', {}, ...main.stages.slice(0, stage).map(t => h('li', {}, t)))) : ''),
        h('section.quest', {}, h('h3', {}, 'Helping people'), sides.length
          ? h('ul', {}, ...sides.map(q => h('li', { class: s.quests[q.id]! < 0 ? 'done' : '' }, h('b', {}, q.title), s.quests[q.id]! < 0 ? ' ✓ Done!' : `: ${q.stages[s.quests[q.id]!] ?? ''}`)))
          : h('p.note', {}, 'Talk to people in towns. Some of them need a hand!')),
      ];
    };

    // ---- Agent Base
    const basePage = (): (HTMLElement | string)[] => [
      header('Agent Base', h('span.note', {}, `${s.base.length}/240`)),
      h('p.note', {}, 'Friends who are not on your team relax here. Pet them, share snacks, or swap them onto your team!'),
      s.base.length
        ? h('div.friend-list.base', {}, ...s.base.map((c, i) => friendCard(c, () => show(() => friendPage(c, 'base')), i === 0)))
        : h('p', {}, 'Nobody here yet. When your team is full, new friends come here.'),
    ];

    // ---- settings
    const settingsPage = (): (HTMLElement | string)[] => {
      const st = game.settings;
      const row = (label: string, value: () => string, next: () => void, hint?: string) => {
        const b = btn(value(), () => { next(); game.saveSettings(); b.textContent = value(); }, { cls: 'set-value', hint });
        return h('div.set-row', {}, h('span', {}, label), b);
      };
      const slider = (label: string, key: keyof typeof st.volume) => h('label.set-row', {}, h('span', {}, label),
        h('input', { type: 'range', min: 0, max: 100, step: 10, value: Math.round(st.volume[key] * 100), 'aria-label': label, oninput: (e: Event) => { st.volume[key] = Number((e.target as HTMLInputElement).value) / 100; game.saveSettings(); } }));
      const onOff = (v: boolean) => (v ? 'On' : 'Off');
      const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
      return [
        header('Settings'),
        h('h3', {}, 'Reading'),
        row('Text size', () => ['Normal', 'Big', 'Bigger'][st.textSize]!, () => { st.textSize = ((st.textSize + 1) % 3) as 0 | 1 | 2; }),
        row('Text speed', () => ({ slow: 'Slow', normal: 'Normal', fast: 'Fast' })[st.textSpeed], () => { st.textSpeed = st.textSpeed === 'slow' ? 'normal' : st.textSpeed === 'normal' ? 'fast' : 'slow'; }),
        row('Read aloud', () => onOff(st.readAloud), () => { st.readAloud = !st.readAloud; }, 'Reads each line out loud with a voice on this device.'),
        h('h3', {}, 'Playing'),
        row('Difficulty', () => ({ easy: 'Easy', normal: 'Normal', hard: 'Hard' })[s.difficulty], () => { s.difficulty = diffs[(diffs.indexOf(s.difficulty) + 1) % 3]!; }, 'Change any time. Easy has gentler spars.'),
        row('Battle speed', () => `${st.battleSpeed}×`, () => { st.battleSpeed = st.battleSpeed === 1 ? 2 : 1; }),
        row('Short animations', () => onOff(st.skipAnimations), () => { st.skipAnimations = !st.skipAnimations; }),
        row('Hints', () => onOff(st.hints), () => { st.hints = !st.hints; }, 'Shows ★ on a good move and "Super!" badges.'),
        row('Befriend game', () => (st.befriendMode === 'spark' ? 'Spark Ring' : 'Mood Match'), () => { st.befriendMode = st.befriendMode === 'spark' ? 'mood' : 'spark'; }, 'Mood Match needs no quick taps.'),
        row('Shared experience', () => onOff(st.sharedXp), () => { st.sharedXp = !st.sharedXp; }, 'Friends who did not spar still learn a little.'),
        h('h3', {}, 'Seeing'),
        row('Less motion', () => onOff(st.reducedMotion), () => { st.reducedMotion = !st.reducedMotion; }),
        row('Color helper', () => onOff(st.colorblind), () => { st.colorblind = !st.colorblind; }, 'Adds letters and shapes next to colors.'),
        row('Touch buttons', () => ({ s: 'Small', m: 'Medium', l: 'Large' })[st.touchSize], () => { st.touchSize = st.touchSize === 's' ? 'm' : st.touchSize === 'm' ? 'l' : 's'; applySettingsToDom(st); }),
        h('h3', {}, 'Sound'),
        slider('All sound', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'), slider('Voice', 'voice'),
      ];
    };

    // ---- save
    const savePage = (): (HTMLElement | string)[] => {
      const note = h('p', {}, 'Your adventure saves by itself when you change places, after spars, and every minute.');
      return [
        header('Save'),
        note,
        btn('💾 Save now', () => {
          const r = session.save();
          note.textContent = r === 'ok' || r === null ? 'Saved! ✓' : r === 'blocked' ? 'This browser can\'t keep saves. Your adventure lasts until you close the game.' : 'Storage is full, so this save didn\'t fit. Your last save is still safe.';
        }, { cls: 'primary', autofocus: true }),
        h('p.note', {}, `Slot ${s.slot} · Played ${Math.floor(s.playMs / 3600000)} h ${Math.floor((s.playMs / 60000) % 60)} min`),
      ];
    };

    void canSwap;
    game.app.ui.appendChild(el);
    game.focus.push(layer, false);
    show(home);
    // open straight onto a page (capture routes and tests): guide, guide:<species>, team, map, quests
    const pages: Record<string, Page> = { guide: guidePage, team: teamPage, map: mapPage, quests: questPage, bag: bagPage, base: basePage, settings: settingsPage };
    const [page, arg] = (start ?? '').split(':');
    if (page && pages[page]) show(pages[page]!);
    if (page === 'guide' && arg && SPECIES[arg]) show(() => guideEntry(arg));
  });
}

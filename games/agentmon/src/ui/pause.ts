/**
 * The menu (M, Tab, Start or the Menu button): Team, Bag, Field Guide, Map, Quests, Agent Base,
 * Settings, Save. Big buttons, one page at a time, B or Back goes up a page. Everything here works
 * with touch, mouse, keyboard and gamepad (the focus manager moves between buttons).
 */
import { dress } from '../art/accessories';
import { creatureFace, drawCreature } from '../art/creatures';
import { POSES, spritePad } from '../art/painter';
import { ACCESSORIES, ACCESSORY_BY_N, heartsOf } from '../data/accessories';
import { playBubbleCatch } from './bubbles';
import { itemIcon } from '../art/icons';
import { canSwap, maxEnergy, xpForLevel } from '../core/creature';
import { care, earnedAccessories, guideBadges, reaction, wear, wearing } from '../core/care';
import { addItem, useItem } from '../core/state';
import { ELEMENTS, type Creature, type Difficulty, type Element } from '../core/types';
import { DEX } from '../data/index';
import { ELEMENT_INFO } from '../data/elements';
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
export function creatureImg(species: string, opts: { shimmer?: boolean; size?: number; cls?: string; shadow?: boolean; wearing?: number } = {}): HTMLElement {
  const key = `${species}:${opts.shimmer ? 1 : 0}:${opts.wearing ?? 0}`;
  let url = imgCache.get(key);
  if (!url) { url = canvasUrl(dressed(species, 32, opts.shimmer, opts.wearing), 2); imgCache.set(key, url); }
  const size = opts.size ?? 64;
  return h(`img.px.mon${opts.cls ? `.${opts.cls}` : ''}${opts.shadow ? '.shadow' : ''}`, { src: url, alt: opts.shadow ? 'Unknown Agentmon' : SPECIES[species]?.name ?? species, width: size, height: size });
}

/** A creature canvas, wearing an accessory (1.1) when given one. */
function dressed(species: string, size: 32 | 64, shimmer?: boolean, wearing?: number, pose: keyof typeof POSES = 'idle') {
  const pc = drawCreature(species, size, POSES[pose], shimmer);
  const acc = wearing ? ACCESSORY_BY_N[wearing] : undefined;
  return acc ? dress(pc, acc, size, spritePad(size), creatureFace(species, size)) : pc;
}

/** The big picture on a Field Guide or friend page: the 64 px battle art at 2×. */
export function bigCreatureUrl(species: string, opts: { shimmer?: boolean; wearing?: number; pose?: keyof typeof POSES } = {}): string {
  const key = `big:${species}:${opts.shimmer ? 1 : 0}:${opts.wearing ?? 0}:${opts.pose ?? 'idle'}`;
  let url = imgCache.get(key);
  if (!url) { url = canvasUrl(dressed(species, 64, opts.shimmer, opts.wearing, opts.pose), 2); imgCache.set(key, url); }
  return url;
}
function bigCreatureImg(species: string, opts: { shimmer?: boolean; shadow?: boolean; wearing?: number; pose?: keyof typeof POSES } = {}): HTMLImageElement {
  return h(`img.px.mon.big${opts.shadow ? '.shadow' : ''}`, { src: bigCreatureUrl(species, opts), alt: opts.shadow ? 'Unknown Agentmon' : SPECIES[species]?.name ?? species, width: 168, height: 168 });
}


const itemImg = (id: string) => h('img.px.icon', { src: canvasUrl(itemIcon(id), 4), alt: '' });

/** Every outdoor place on the map of Sunreach (column, row on a 9 × 11 grid). */
const PLACES: Record<string, [number, number]> = {
  'sky-island': [3, 0], 'updraft-ridge': [4, 1], 'frostfall-slopes': [2, 0], frostfall: [2, 1], 'frost-pass': [2, 2],
  dunehollow: [2, 3], 'dune-flats': [2, 4], 'canyon-trail': [3, 3], cragtop: [4, 3], 'starlit-meadow': [5, 3], 'cragtop-slopes': [4, 4], 'banyan-hollow': [5, 2],
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
          btn(h('span', {}, '📖', h('b', {}, 'Field Guide'), h('small', {}, `${guideCount}/${SPECIES_LIST.length}`)), () => show(guidePage)),
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
    const friendCard = (c: Creature, onclick: () => void, autofocus = false, lead = false) => {
      const sp = SPECIES[c.species]!;
      const hearts = heartsOf(c.friendship);
      return btn(h('span.friend', {}, creatureImg(c.species, { shimmer: c.shimmer, size: 56, wearing: wearing(s, c) }),
        h('span.fname', {}, elementImg(sp.element), h('b', {}, session.friendName(c)), h('span.chip.soft.lv', {}, `Lv ${c.level}`),
          hearts ? h('span.chip.soft.hearts', { title: `${hearts} of 5 hearts` }, `💛${hearts}`) : '', hearts >= 5 ? h('span.chip.buddy', {}, '🎗 Best buddy') : '', lead ? h('span.chip.lead', {}, '★ Leads') : ''),
        energyBar(c.energy, maxEnergy(DEX, c), { small: true }), c.energy > 0 ? null : h('small', {}, 'A Rest Stop wakes it up.')), onclick, { cls: `friend-btn.el-${sp.element}`, autofocus });
    };
    const teamPage = (): (HTMLElement | string)[] => [
      header('Team', h('span.chip.soft', {}, `${s.team.length} of 6`)),
      h('div.friend-list', {}, ...s.team.map((c, i) => friendCard(c, () => show(() => friendPage(c, 'team')), i === 0, i === 0))),
      h('p.note', {}, 'The friend marked ★ leads every spar.'),
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
      actions.unshift(btn('💛 Care', () => show(() => carePage(c)), { cls: 'primary' }));
      actions.push(btn('🍓 Give a berry', () => show(() => berryPage(c)), { disabled: !Object.keys(s.bag).some(id => ITEMS[id]?.kind === 'berry') }));
      actions.push(btn(c.gear ? `🎀 Gear: ${ITEMS[c.gear]?.name}` : '🎀 Give gear', () => show(() => gearPage(c))));
      actions.push(btn('🏷️ Nickname', () => show(() => nicknamePage(c))));
      const from = xpForLevel(c.level), to = c.level < 50 ? xpForLevel(c.level + 1) : from + 1;
      const share = c.level < 50 ? Math.max(0, Math.min(1, (c.xp - from) / (to - from))) : 1;
      return [
        header(session.friendName(c)),
        h(`div.gentry.el-${sp.element}`, {},
          h('div.gart', {}, bigCreatureImg(c.species, { shimmer: c.shimmer, wearing: wearing(s, c) })),
          h('div.ginfo', {},
            h('div.gchips', {}, h(`span.chip.${sp.element}`, {}, elementImg(sp.element), ELEMENT_INFO[sp.element].name), h('span.chip.soft', {}, sp.name), h('span.chip.soft', {}, `Lv ${c.level}`), c.shimmer ? h('span.chip.soft', {}, '✨ Shimmer') : ''),
            energyBar(c.energy, maxEnergy(DEX, c)),
            h('div.xbar', { role: 'meter', 'aria-label': 'Experience', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(share * 100) },
              h('span.track', {}, h('span.fill', { style: `width:${(share * 100).toFixed(1)}%` })),
              h('small', {}, c.level < 50 ? `${next} exp to Lv ${c.level + 1}` : 'Top level!')),
            heartRow(c),
          )),
        h('div.traits', {},
          h('div.card.trait', {}, h('span.label', {}, 'Trait'), h('span', {}, TRAIT_TEXT[sp.trait] ?? '')),
          h('div.card.trait', {}, h('span.label', {}, 'Personality'), h('span', {}, `${c.personality[0]!.toUpperCase()}${c.personality.slice(1)}. Loves ${ITEMS[sp.favoriteSnack]?.name ?? 'snacks'}.`))),
        h('div.move-cards', {}, ...c.moves.map(id => {
          const m = DEX.moves[id]!;
          return h(`div.card.move-card${m.element === 'plain' ? '' : `.el-${m.element}`}`, {},
            h('div.mtop', {}, m.element !== 'plain' ? elementImg(m.element) : '', h('b', {}, m.name), h('span.chip.soft', {}, m.cost === 0 ? 'Free' : `${Math.round(m.cost * 100)}% energy`)),
            h('div.mdesc', {}, m.desc));
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
          const r = care(c, id === fav ? 'favorite' : 'snack');
          careSay = reaction(session.friendName(c), SPECIES[c.species]!.element, c.personality, id === fav ? 'favorite' : 'snack');
          careHappy = true;
          game.cry(c.species);
          heartToast(c, r);
          back();
        }, { autofocus: i === 0 })))];
    };

    // ---- care (1.1): pet, a snack, Bubble Catch, and dressing up. Hearts only ever go up.
    let careSay = '';
    let careHappy = false;
    const heartRow = (c: Creature) => {
      const n = heartsOf(c.friendship);
      return h('p.hearts', { 'aria-label': `${n} of 5 hearts` }, '💛'.repeat(n), h('span.empty', {}, '🤍'.repeat(5 - n)), n >= 5 ? h('span.chip.buddy', {}, '🎗 Best buddy') : '');
    };
    const heartToast = (c: Creature, r: { before: number; after: number }) => {
      if (r.after > r.before) game.toast(r.after >= 5 ? `${session.friendName(c)} is your Best buddy! 🎗` : `${session.friendName(c)}: ${r.after} hearts! 💛`, 1800);
    };
    const carePage = (c: Creature): (HTMLElement | string)[] => {
      const sp = SPECIES[c.species]!;
      const name = session.friendName(c);
      const pic = bigCreatureImg(c.species, { shimmer: c.shimmer, wearing: wearing(s, c), pose: careHappy ? 'happy' : 'idle' });
      const say = h('p.care-say', { 'aria-live': 'polite' }, careSay || `${name} is happy to see you!`);
      if (careHappy) { careHappy = false; setTimeout(() => { pic.src = bigCreatureUrl(c.species, { shimmer: c.shimmer, wearing: wearing(s, c) }); }, 900); }
      const hasSnack = Object.keys(s.bag).some(id => ITEMS[id]?.kind === 'snack' && (s.bag[id] ?? 0) > 0);
      const stage = h(`div.care-stage.el-${sp.element}`, {}, pic);
      const pet = () => {
        const r = care(c, 'pet');
        careSay = reaction(name, sp.element, c.personality, 'pet', c.friendship);
        say.textContent = careSay;
        pic.src = bigCreatureUrl(c.species, { shimmer: c.shimmer, wearing: wearing(s, c), pose: 'happy' });
        setTimeout(() => { pic.src = bigCreatureUrl(c.species, { shimmer: c.shimmer, wearing: wearing(s, c) }); }, 900);
        game.cry(c.species);
        if (!game.settings.reducedMotion) {
          const heart = h('span.heart-pop', { 'aria-hidden': 'true' }, '💛');
          heart.style.left = `${35 + Math.random() * 30}%`;
          stage.append(heart);
          setTimeout(() => heart.remove(), 1000);
        }
        heartToast(c, r);
        rows.replaceWith(rows = heartRow(c));
      };
      let rows = heartRow(c);
      return [
        header(`Care: ${name}`),
        stage,
        rows,
        say,
        h('div.menu-buttons.care-buttons', {},
          btn('🤚 Pet', pet, { autofocus: true }),
          btn('🍪 Snack', () => show(() => snackPage(c)), { disabled: !hasSnack, hint: hasSnack ? undefined : 'Shops sell snacks.' }),
          btn('🫧 Play', async () => {
            const n = await playBubbleCatch(game, bigCreatureUrl(c.species, { shimmer: c.shimmer, wearing: wearing(s, c), pose: 'happy' }), name);
            const r = care(c, 'play');
            careSay = reaction(name, sp.element, c.personality, 'play', 0, n);
            careHappy = true;
            heartToast(c, r);
            show(() => carePage(c), false);
          }),
          btn('🎀 Dress up', () => show(() => dressPage(c)))),
        h('p.note', {}, 'Care is just for fun: hearts only go up, and nobody ever gets sad or hungry.'),
      ];
    };
    const dressPage = (c: Creature): (HTMLElement | string)[] => {
      const now = wearing(s, c);
      const got = new Set(earnedAccessories(s, SPECIES, SPECIES_LIST.length).map(a => a.n));
      return [
        header(`Dress up ${session.friendName(c)}`),
        h('div.care-stage', {}, bigCreatureImg(c.species, { shimmer: c.shimmer, wearing: now })),
        h('div.acc-grid', {},
          btn(h('span.acc', {}, h('b', {}, 'Nothing'), h('small', {}, 'Just as it is.')), () => { wear(s, c, 0); show(() => dressPage(c), false); }, { cls: `acc-btn${now ? '' : '.on'}`, autofocus: !now }),
          ...ACCESSORIES.map(a => got.has(a.n)
            ? btn(h('span.acc', {}, creatureImg(c.species, { size: 48, shimmer: c.shimmer, wearing: a.n }), h('b', {}, a.name)), () => {
              wear(s, c, a.n);
              game.toast(`${session.friendName(c)} looks great in the ${a.name}!`, 1400);
              show(() => dressPage(c), false);
            }, { cls: `acc-btn${now === a.n ? '.on' : ''}`, autofocus: now === a.n })
            : btn(h('span.acc', {}, h('span.lock', { 'aria-hidden': 'true' }, '🔒'), h('b', {}, a.name), h('small', {}, a.how)), () => {}, { cls: 'acc-btn.locked', disabled: true }))),
        h('p.note', {}, `${got.size} of ${ACCESSORIES.length} found. Every one is earned on your adventure.`),
      ];
    };

    // ---- bag
    // the Bag (1.1): a tab for each kind of thing, and a card for each item with how many you have
    let bagTab = 'snack';
    const bagPage = (): (HTMLElement | string)[] => {
      const kinds: [string, string, string][] = [['snack', '🍪', 'Snacks'], ['berry', '🍓', 'Berries'], ['gear', '🎀', 'Gear'], ['key', '🗝️', 'Special']];
      const count = (k: string) => Object.keys(s.bag).filter(id => ITEMS[id]?.kind === k && (s.bag[id] ?? 0) > 0).length;
      const ids = Object.keys(s.bag).filter(id => ITEMS[id]?.kind === bagTab && (s.bag[id] ?? 0) > 0);
      const tip: Record<string, string> = { snack: 'Snacks help you befriend: offer one in a spar. Its favorite snack helps most!', berry: 'Give berries from the Team page, or in a spar.', gear: 'Give gear from the Team page. Each friend holds one.', key: 'Special things for your adventure.' };
      return [header('Bag', h('span.coins', {}, `🪙 ${s.coins}`)),
        h('div.bag-tabs', { role: 'tablist' }, ...kinds.map(([k, icon, title]) => btn(h('span', {}, `${icon} ${title} `, h('small', {}, `${count(k)}`)), () => { bagTab = k; show(bagPage, false); }, { cls: `bag-tab${bagTab === k ? '.on' : ''}` }))),
        ids.length
          ? h('div.item-cards', {}, ...ids.map(id => h('div.card.item-card', {}, itemImg(id), h('b', {}, ITEMS[id]!.name), bagTab === 'key' ? '' : h('span.chip.soft.count', {}, `×${s.bag[id]}`), h('small', {}, ITEMS[id]!.desc))))
          : h('p.note', {}, bagTab === 'gear' ? 'No gear yet. Shops in bigger towns sell some.' : 'Nothing here yet.'),
        h('p.note', {}, tip[bagTab] ?? '')];
    };

    // ---- Field Guide
    // the Field Guide (1.1): element-framed cards, element filters, badges and a big entry page
    let guideFilter: Element | 'all' = 'all';
    const guidePage = (): (HTMLElement | string)[] => {
      const seen = s.guide.seen, friends = s.guide.friends;
      const list = SPECIES_LIST.filter(sp => guideFilter === 'all' || sp.element === guideFilter);
      const badges = guideBadges(friends, SPECIES_LIST.length);
      const chip = (e: Element | 'all') => btn(e === 'all' ? h('span', {}, 'All') : h('span', {}, elementImg(e), ` ${ELEMENT_INFO[e].name}`),
        () => { guideFilter = e; show(guidePage, false); }, { cls: `gfilter${guideFilter === e ? '.on' : ''}${e === 'all' ? '' : `.el-${e}`}` });
      return [
        header('Field Guide', h('span.chip.soft', {}, `Friends ${friends.size} of ${SPECIES_LIST.length} · Seen ${new Set([...seen, ...friends]).size}`)),
        h('div.badges', {},
          h('span', { class: `badge silver${badges.first ? ' got' : ''}`, title: 'Befriend all of the first 52 Agentmon' }, badges.first ? '🥈 Silver Guide' : `🥈 First 52: ${badges.firstCount}/52`),
          h('span', { class: `badge gold${badges.all ? ' got' : ''}`, title: `Befriend all ${SPECIES_LIST.length}` }, badges.all ? '🏅 Golden Guide' : `🏅 All ${SPECIES_LIST.length}: ${friends.size}/${SPECIES_LIST.length}`)),
        h('div.gfilters', { role: 'group', 'aria-label': 'Show one element' }, chip('all'), ...ELEMENTS.map(chip)),
        h('div.guide-grid', {}, ...list.map((sp, i) => {
          const known = seen.has(sp.num) || friends.has(sp.num), friend = friends.has(sp.num);
          return btn(h('span.gcell', {},
            h('small.gnum', {}, `${sp.num}`),
            known ? creatureImg(sp.id, { size: 56, shadow: !friend }) : h('span.qmark', {}, '?'),
            h('small.gname', {}, known ? sp.name : '???')),
          () => show(() => guideEntry(sp.id)), { cls: `guide-btn${known ? `.el-${sp.element}` : ''}${friend ? '.friend' : ''}`, disabled: !known, autofocus: i === 0 });
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
      const known = (n: number) => s.guide.seen.has(n) || s.guide.friends.has(n);
      // browse to the next or previous page you know, in the current filter
      const order = SPECIES_LIST.filter(x => known(x.num) && (guideFilter === 'all' || x.element === guideFilter));
      const at = order.findIndex(x => x.id === id);
      const go = (d: number) => { const n = order[(at + d + order.length) % order.length]; if (n) show(() => guideEntry(n.id), false); };
      return [
        header(`${sp.num}. ${sp.name}`, order.length > 1 ? h('span.gnav', {}, btn('◀', () => go(-1), { hint: 'Previous page' }), btn('▶', () => go(1), { hint: 'Next page' })) : undefined),
        h(`div.gentry.el-${sp.element}`, {},
          h('div.gart', {}, bigCreatureImg(id, { shadow: !friend, shimmer: friend && s.guide.shimmer.has(sp.num) })),
          h('div.ginfo', {},
            h('div.gchips', {}, h(`span.chip.${sp.element}`, {}, elementImg(sp.element), ELEMENT_INFO[sp.element].name), h('span.chip.soft', {}, sp.guardian ? 'Guardian' : `Stage ${sp.stage}`)),
            h('p.stars', { 'aria-label': `${stars} of 3 research stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
            h('p.gblurb', {}, friend ? sp.blurb : 'Befriend one to learn more!'))),
        friend && fact ? h('div.fact', {}, h('span.label', {}, 'Real fact'), h('b', {}, fact.topic), h('p', {}, fact.text)) : '',
        family.length > 1 ? h('div.gfamily', { 'aria-label': 'How it grows' }, ...family.flatMap((f, i) => [
          i ? h('span.garrow', { 'aria-hidden': 'true' }, family[i - 1]?.grows ? `Lv ${family[i - 1]!.grows!.level} ▶` : '▶') : '',
          h('span.gstage', {}, known(f.num) ? creatureImg(f.id, { size: 40, shadow: !s.guide.friends.has(f.num) }) : h('span.qmark.small', {}, '?'), h('small', {}, known(f.num) ? f.name : '???')),
        ])) : '',
        h('div.ghome', {}, h('span.label', {}, 'Lives in'), ...(where.length ? where.map(w => h('span.chip.soft', {}, w)) : [h('span.note', {}, sp.guardian ? 'A guardian. Old stories tell where it waits.' : 'Grows from a friend. It does not live in the wild.')])),
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
        row('Time of day', () => (st.dayCycle ? 'Changes' : 'Always day'), () => { st.dayCycle = !st.dayCycle; }),
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

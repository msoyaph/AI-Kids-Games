/** Client glue for animals, pet, ranch shop, silo hopper and building sites. */
import { Sprite } from 'pixi.js';
import { DIR_DX, DIR_DY, TILE } from '../core/math';
import { ANIMAL, ANIMALS, SILO_CAP } from '../data/animals';
import { addStock } from '../data/shops';
import { AnimalView } from '../render/animal-view';
import { addAnimal, animalHearts, canBuy, petPet, petRt, touchAnimal } from '../sim/animals';
import { count, remove } from '../sim/inventory';
import { SERVICES } from '../sim/shops';
import type { AnimalState } from '../sim/state';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { itemName } from '../ui/itemview';
import { HOOKS, type Game } from './game';

let view: AnimalView | null = null;
const siteSprites: Sprite[] = [];
let bowlSprite: Sprite | null = null;

addStock('ranch', (st) => {
  const out = [{ id: 'hay', price: 50 }] as { id: string; price: number; service?: string; label?: string; desc?: string; locked?: string }[];
  for (const a of ANIMALS) {
    const lvl = st.buildings.built[a.home];
    const locked = lvl === undefined ? `Needs a ${a.home === 'coop' ? 'Coop' : 'Barn'} (ask Hollis!)` : lvl < a.level ? `Needs a ${['', 'Big', 'Deluxe'][a.level]} ${a.home === 'coop' ? 'Coop' : 'Barn'}` : undefined;
    out.push({ id: `animal.${a.id}`, price: a.price, service: `animal:${a.id}`, label: a.name, desc: a.desc, locked });
  }
  return out;
});
for (const a of ANIMALS) {
  SERVICES[`animal:${a.id}`] = (sim) => {
    const c = canBuy(sim, a.id);
    if (!c.ok) return c;
    const pick = sim.rng(0xa9, sim.state.nextAnimalId).pick(a.names);
    const an = addAnimal(sim, a.id, pick);
    sim.ev.emit('newAnimal' as never, { id: an.id } as never);
    return { ok: true, msg: `Your new ${a.name.toLowerCase()} is waiting in your ${a.home}!` };
  };
}

function nearAnimal(g: Game, px: number, py: number, r: number): AnimalState | 'pet' | null {
  const sim = g.sim;
  let best: AnimalState | 'pet' | null = null, bd = r;
  for (const a of sim.state.animals) {
    if (a.loc !== sim.p.loc) continue;
    const d = Math.hypot(a.x - px, a.y - 6 - py);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  const p = petRt(sim);
  if (p.loc === sim.p.loc) {
    const d = Math.hypot(p.x - px, p.y - 6 - py);
    if (d < bd) best = 'pet';
  }
  return best;
}

function interactAnimal(g: Game, t: AnimalState | 'pet'): void {
  const sim = g.sim;
  if (t === 'pet') {
    const pet = sim.state.pet;
    if (petPet(sim)) {
      view?.emote('pet', 'heart', g.time);
      g.sfx(pet.kind === 'dog' ? 'woof' : 'meow');
      g.toasts.show(`You pet ${pet.name}. ${pet.kind === 'dog' ? 'Wag wag!' : 'Purrrr...'}`, 'ui.heart');
    } else {
      view?.emote('pet', 'happy', g.time);
      g.toasts.show(`${pet.name} looks very happy to see you.${pet.bowl ? '' : ' Fill the water bowl with your watering can!'}`);
    }
    return;
  }
  const d = ANIMAL[t.kind];
  const r = touchAnimal(sim, t);
  g.sfx(d.sound);
  if (r.kind === 'collect') {
    view?.emote(t.id, 'heart', g.time);
  } else if (r.kind === 'pet') {
    view?.emote(t.id, 'heart', g.time);
    g.toasts.show(`You pet ${t.name}. ${t.name} loves you!`, 'ui.heart');
  } else {
    view?.emote(t.id, 'happy', g.time);
    const hearts = animalHearts(t);
    g.toasts.show(`${t.name} the ${d.name.toLowerCase()} · ${'♥'.repeat(hearts)}${'♡'.repeat(5 - hearts)}${t.fed ? '' : ' · hungry'}`);
  }
}

export function installAnimals(g: Game): void {
  view = new AnimalView(g.atlas, g.view);
  HOOKS.onRender.push((game) => {
    view!.update(game.sim, game.time);
    drawSites(game);
  });
  HOOKS.onAttach.push((game) => {
    view?.clear();
    game.sim.ev.on('newAnimal' as never, ((e: { id: number }) => setTimeout(() => nameAnimal(game, e.id), 50)) as never);
  });
  HOOKS.onEnter.push(() => {
    for (const s of siteSprites) s.removeFromParent();
    siteSprites.length = 0;
    bowlSprite?.removeFromParent();
    bowlSprite = null;
  });
  HOOKS.interactNearby.push((game) => {
    const p = game.sim.p;
    const t = nearAnimal(game, p.x + DIR_DX[p.dir] * 12, p.y - 4 + DIR_DY[p.dir] * 12, 16) ?? nearAnimal(game, p.x, p.y - 4, 14);
    if (!t) return false;
    interactAnimal(game, t);
    return true;
  });
  HOOKS.pointerInteract.push((game) => {
    const ptr = game.input.pointer;
    const w = game.screenToWorld(ptr.x, ptr.y);
    const t = nearAnimal(game, w.x, w.y, 12);
    if (!t) return false;
    const pos = t === 'pet' ? petRt(game.sim) : t;
    if (Math.hypot(pos.x - game.sim.p.x, pos.y - game.sim.p.y) > 40) return false;
    interactAnimal(game, t);
    return true;
  });
  HOOKS.trigger.hopper = (game) => openHopper(game);
}

function nameAnimal(g: Game, id: number): void {
  const a = g.sim.state.animals.find((x) => x.id === id);
  if (!a) return;
  const d = ANIMAL[a.kind];
  const inp = h('input', { class: 'inp', maxlength: '12', value: a.name, 'aria-label': 'Animal name' }) as HTMLInputElement;
  g.modals.ask(`Name your ${d.name.toLowerCase()}!`, h('div', null, h('div', { style: 'display:flex;gap:10px;align-items:center' }, icon(`item.animal.${a.kind}`, 48), inp)), [
    { label: 'Done', cls: 'green', primary: true, onClick: () => { const n = inp.value.replace(/[^\p{L}\p{N} '\-]/gu, '').trim(); if (n) a.name = n.slice(0, 12); } },
  ], false);
}

function openHopper(g: Game): void {
  const sim = g.sim;
  const b = sim.state.buildings;
  if (b.built.silo === undefined) {
    g.toasts.show('Build a silo (from Hollis the carpenter) to store hay for rainy days and winter.');
    return;
  }
  const inBag = count(sim.p.inv, 'hay');
  g.modals.ask('Hay Hopper', h('div', null,
    h('p', null, `Your silo has ${b.hay} / ${SILO_CAP} hay.`),
    h('p', null, 'On rainy days and in winter, animals eat hay from the silo automatically. Cut tall grass with your scythe to collect more!'),
    inBag ? h('p', null, `You have ${inBag} hay in your bag.`) : null,
  ), [
    ...(inBag ? [{ label: `Put ${inBag} hay in the silo`, cls: 'green', onClick: () => { const room = SILO_CAP - b.hay; const n = Math.min(room, inBag); remove(sim.p.inv, 'hay', n); b.hay += n; g.sfx('pop'); } }] : []),
    { label: 'OK', primary: true },
  ]);
}

/** Construction scaffolding on plots + the pet water bowl. */
function drawSites(g: Game): void {
  const sim = g.sim;
  if (sim.p.loc !== 'farm') return;
  const c = sim.state.buildings.constructing;
  if (c && !siteSprites.length) {
    const farm = sim.here;
    const pl = farm.def.plots?.[c.plot];
    if (pl) {
      const s = new Sprite(g.atlas.tex(`bld.scaffold.${c.plot}`));
      s.anchor.set(0.5, 1);
      s.x = pl.x * TILE + (pl.w * TILE) / 2;
      s.y = (pl.y + pl.h) * TILE;
      s.zIndex = s.y - 1;
      s.label = 'nocull';
      g.view.sorted.addChild(s);
      siteSprites.push(s);
    }
  } else if (!c && siteSprites.length) {
    for (const s of siteSprites) s.removeFromParent();
    siteSprites.length = 0;
  }
  const bowl = sim.here.def.points.petBowl;
  if (bowl) {
    if (!bowlSprite) {
      bowlSprite = new Sprite();
      bowlSprite.anchor.set(0.5, 1);
      bowlSprite.label = 'nocull';
      bowlSprite.x = bowl.x * TILE + 8;
      bowlSprite.y = (bowl.y + 1) * TILE;
      bowlSprite.zIndex = bowlSprite.y - 8;
      g.view.sorted.addChild(bowlSprite);
    }
    bowlSprite.texture = g.atlas.tex(`prop.bowl.${sim.state.pet.bowl ? 1 : 0}`);
  }
  void itemName;
}

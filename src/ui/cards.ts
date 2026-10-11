import { EVOLUTIONS, passiveDef } from '../config/passives';
import { weaponDef } from '../config/weapons';
import type { UpgradeChoice } from '../sim/world';
import { h, img } from './dom';
import { iconUrl } from './icons';

export interface CardInfo {
  icon: string;
  name: string;
  tag: string;
  desc: string;
  evolve: boolean;
}

export function describeChoice(c: UpgradeChoice): CardInfo {
  switch (c.kind) {
    case 'newWeapon': {
      const d = weaponDef(c.id);
      return { icon: iconUrl(d.id, 'weapon'), name: d.name, tag: 'New weapon', desc: d.description, evolve: false };
    }
    case 'weaponLevel': {
      const d = weaponDef(c.id);
      return { icon: iconUrl(d.id, 'weapon'), name: d.name, tag: `Level ${c.level}`, desc: d.levels[c.level - 2]?.text ?? '', evolve: false };
    }
    case 'newPassive': {
      const d = passiveDef(c.id);
      return { icon: iconUrl(d.id, 'passive'), name: d.name, tag: 'New item', desc: d.description, evolve: false };
    }
    case 'passiveLevel': {
      const d = passiveDef(c.id);
      return { icon: iconUrl(d.id, 'passive'), name: d.name, tag: `Level ${c.level}`, desc: d.description, evolve: false };
    }
    case 'evolve': {
      // id is either the base weapon (offer) or the evolved weapon (chest result)
      const evo = EVOLUTIONS.find((e) => e.weapon === c.id || e.into === c.id)!;
      const into = weaponDef(evo.into);
      const base = weaponDef(evo.weapon);
      const cat = passiveDef(evo.passive);
      return { icon: iconUrl(into.id, 'weapon'), name: into.name, tag: 'Evolution!', desc: `${base.name} + ${cat.name}: ${into.description}`, evolve: true };
    }
    case 'heal':
      return { icon: iconUrl('heal', 'misc'), name: 'Warm Supper', tag: 'Snack', desc: 'Restore 30% of your HP.', evolve: false };
    case 'gold':
      return { icon: iconUrl('gold', 'misc'), name: 'Coin Pouch', tag: 'Treasure', desc: '+25 gold.', evolve: false };
  }
}

export function choiceCard(c: UpgradeChoice, index: number, onPick: () => void): HTMLButtonElement {
  const info = describeChoice(c);
  return h(
    'button',
    { class: `card${info.evolve ? ' evolve' : ''}`, onclick: onPick, 'data-autofocus': index === 0 ? true : undefined },
    h('div', { class: 'card-key' }, String(index + 1)),
    img(info.icon, 'card-icon'),
    h('div', { class: 'card-tag' }, info.tag),
    h('div', { class: 'card-name' }, info.name),
    h('div', { class: 'card-desc' }, info.desc),
  );
}

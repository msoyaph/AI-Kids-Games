/** Skills and the perks you choose at levels 5 and 10 (explained simply). */
import type { SkillId } from '../sim/state';

export interface PerkDef {
  id: string;
  name: string;
  desc: string;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  desc: string;
  icon: string;
  /** [level 5 choices, level 10 choices] */
  perks: [[PerkDef, PerkDef], [PerkDef, PerkDef]];
}

export const SKILL_DEFS: SkillDef[] = [
  {
    id: 'farming',
    name: 'Farming',
    desc: 'Grow crops and care for animals.',
    icon: 'item.radish',
    perks: [
      [
        { id: 'tiller', name: 'Tiller', desc: 'Crops and flowers sell for 10% more.' },
        { id: 'rancher', name: 'Rancher', desc: 'Animal products sell for 20% more, and petting makes animals extra happy.' },
      ],
      [
        { id: 'greenThumb', name: 'Green Thumb', desc: 'Watered crops sometimes grow an extra day overnight.' },
        { id: 'bigHarvest', name: 'Big Harvest', desc: 'Sometimes harvest an extra crop, and get more sparkle stars.' },
      ],
    ],
  },
  {
    id: 'foraging',
    name: 'Foraging',
    desc: 'Chop trees and find wild goodies.',
    icon: 'item.morel',
    perks: [
      [
        { id: 'gatherer', name: 'Gatherer', desc: 'Sometimes pick two forage items at once. Forage sells for 20% more.' },
        { id: 'lumberjack', name: 'Lumberjack', desc: 'Trees and stumps drop more wood (and sometimes hardwood).' },
      ],
      [
        { id: 'tireless', name: 'Tireless', desc: 'All tools use less energy.' },
        { id: 'botanist', name: 'Botanist', desc: 'Forage is always at least silver star quality.' },
      ],
    ],
  },
  {
    id: 'fishing',
    name: 'Fishing',
    desc: 'Catch fish and set crab pots.',
    icon: 'item.sunfish',
    perks: [
      [
        { id: 'angler', name: 'Angler', desc: 'Fish and crab pot catches sell for 25% more.' },
        { id: 'trapper', name: 'Trapper', desc: 'Crab pots fill up even without bait.' },
      ],
      [
        { id: 'steadyHands', name: 'Steady Hands', desc: 'The green zone in the reel is bigger.' },
        { id: 'luckyLure', name: 'Lucky Lure', desc: 'Rare fish bite more often and fish never steal your bait.' },
      ],
    ],
  },
  {
    id: 'mining',
    name: 'Mining',
    desc: 'Break rocks and explore the mine.',
    icon: 'item.copperOre',
    perks: [
      [
        { id: 'prospector', name: 'Prospector', desc: 'Get an extra ore from every ore rock.' },
        { id: 'gemologist', name: 'Gemologist', desc: 'Gems and minerals sell for 30% more.' },
      ],
      [
        { id: 'tunneler', name: 'Tunneler', desc: 'Ladders show up more often.' },
        { id: 'toughSkin', name: 'Tough Skin', desc: 'Cave critters only take half as much health.' },
      ],
    ],
  },
  {
    id: 'cooking',
    name: 'Cooking',
    desc: 'Cook tasty food and make artisan goods.',
    icon: 'item.pancakes',
    perks: [
      [
        { id: 'chef', name: 'Chef', desc: 'Cooked food sells for 20% more.' },
        { id: 'hearty', name: 'Hearty Meals', desc: 'Food restores 25% more energy.' },
      ],
      [
        { id: 'artisan', name: 'Artisan', desc: 'Jams, juices, cheese and cloth sell for 25% more.' },
        { id: 'buffet', name: 'Buffet', desc: 'Food boosts last twice as long.' },
      ],
    ],
  },
];

export const SKILL_DEF: Record<string, SkillDef> = {};
for (const s of SKILL_DEFS) SKILL_DEF[s.id] = s;

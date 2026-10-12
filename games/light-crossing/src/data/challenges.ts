// Daily challenges (3 per day, rewarding Lumens) and tiered achievements.
import type { GameEvents } from '../sim/events';

export interface ChallengeDef {
  id: string;
  label: string;
  event: keyof GameEvents;
  count: number;
  filter?: Record<string, string | number | boolean>;
  sum?: string;
  reward: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'c_fish5', label: 'Catch 5 fish', event: 'fishCaught', count: 5, reward: 300 },
  { id: 'c_bugs3', label: 'Catch 3 bugs', event: 'bugCaught', count: 3, reward: 300 },
  { id: 'c_fruit', label: 'Sell 1,500 Glints of fruit', event: 'itemSold', count: 1500, sum: 'total', filter: { category: 'fruit' }, reward: 400 },
  { id: 'c_earn', label: 'Earn 5,000 Glints from selling', event: 'itemSold', count: 5000, sum: 'total', reward: 400 },
  { id: 'c_craft3', label: 'Craft 3 things', event: 'crafted', count: 3, reward: 300 },
  { id: 'c_water5', label: 'Water 5 flowers', event: 'watered', count: 5, reward: 250 },
  { id: 'c_talk3', label: 'Chat with neighbors 3 times', event: 'talked', count: 3, reward: 250 },
  { id: 'c_gift2', label: 'Give 2 gifts', event: 'gifted', count: 2, reward: 300 },
  { id: 'c_fossil', label: 'Dig up a fossil', event: 'fossilFound', count: 1, reward: 300 },
  { id: 'c_chop10', label: 'Chop 10 timber', event: 'woodChopped', count: 10, sum: 'qty', reward: 300 },
  { id: 'c_weeds10', label: 'Pull 10 weeds', event: 'weedPulled', count: 10, reward: 250 },
  { id: 'c_shells5', label: 'Collect 5 shells', event: 'pickedUp', count: 5, filter: { 'prefix:id': 'shell_' }, reward: 250 },
  { id: 'c_plant3', label: 'Plant 3 things', event: 'planted', count: 3, reward: 250 },
  { id: 'c_bigfish', label: 'Catch a fish of size 4 or bigger', event: 'fishCaught', count: 1, filter: { 'min:size': 4 }, reward: 400 },
  { id: 'c_rarebug', label: 'Catch an uncommon (or rarer) bug', event: 'bugCaught', count: 1, filter: { 'min:rarity': 2 }, reward: 400 },
  { id: 'c_donate2', label: 'Donate 2 things to the museum', event: 'donated', count: 2, reward: 300 },
  { id: 'c_request', label: "Help with a neighbor's request", event: 'requestDone', count: 1, reward: 400 },
  { id: 'c_rocks8', label: 'Hit rocks 8 times', event: 'rockHit', count: 8, reward: 250 },
  { id: 'c_fruit6', label: 'Pick up 6 fruit', event: 'fruitPicked', count: 6, reward: 250 },
  { id: 'c_buy', label: 'Buy something at the shop', event: 'itemBought', count: 1, reward: 200 },
];

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** stat key in state.stats, or a special metric prefixed with '$' */
  stat: string;
  tiers: number[];
}

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold'];
export const TIER_LUMENS = [150, 400, 1000];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_angler', name: 'Angler', desc: 'Catch fish', stat: 'fishCaught', tiers: [10, 50, 150] },
  { id: 'a_bugs', name: 'Bug Buddy', desc: 'Catch bugs', stat: 'bugsCaught', tiers: [10, 50, 150] },
  { id: 'a_bigfish', name: 'Big Catch', desc: 'Catch fish of size 5 or more', stat: 'bigFish', tiers: [1, 10, 30] },
  { id: 'a_craft', name: 'Tinkerer', desc: 'Craft things at a workbench', stat: 'crafted', tiers: [10, 40, 100] },
  { id: 'a_glints', name: 'Glint Getter', desc: 'Earn Glints', stat: 'glintsEarned', tiers: [10000, 100000, 500000] },
  { id: 'a_sell', name: 'Merchant', desc: 'Sell items', stat: 'itemsSold', tiers: [25, 150, 500] },
  { id: 'a_buy', name: 'Window Shopper', desc: 'Buy items', stat: 'itemsBought', tiers: [5, 25, 75] },
  { id: 'a_wood', name: 'Lumberjack', desc: 'Chop timber', stat: 'woodChopped', tiers: [30, 150, 500] },
  { id: 'a_rocks', name: 'Rock Knocker', desc: 'Hit rocks', stat: 'rocksHit', tiers: [20, 100, 300] },
  { id: 'a_weeds', name: 'Weed Warrior', desc: 'Pull weeds', stat: 'weedsPulled', tiers: [20, 100, 300] },
  { id: 'a_shells', name: 'Beachcomber', desc: 'Collect shells', stat: 'shells', tiers: [10, 50, 150] },
  { id: 'a_branches', name: 'Twig Gatherer', desc: 'Collect branches', stat: 'branches', tiers: [20, 100, 300] },
  { id: 'a_dig', name: 'Digger', desc: 'Dig up buried spots', stat: 'digSpots', tiers: [5, 30, 100] },
  { id: 'a_fossils', name: 'Fossil Finder', desc: 'Dig up fossils', stat: 'fossilsDug', tiers: [3, 15, 40] },
  { id: 'a_donate', name: "Curator's Friend", desc: 'Donate to the museum', stat: 'donations', tiers: [10, 40, 86] },
  { id: 'a_museum', name: 'Museum Patron', desc: 'Complete the museum (%)', stat: '$museumPct', tiers: [25, 50, 100] },
  { id: 'a_talk', name: 'Chatterbox', desc: 'Have conversations', stat: 'talks', tiers: [20, 100, 300] },
  { id: 'a_gifts', name: 'Gift Giver', desc: 'Give gifts to neighbors', stat: 'gifts', tiers: [5, 25, 75] },
  { id: 'a_requests', name: 'Helping Paw', desc: "Complete neighbors' requests", stat: 'requestsDone', tiers: [3, 10, 30] },
  { id: 'a_plant', name: 'Green Thumb', desc: 'Plant flowers and trees', stat: 'planted', tiers: [5, 25, 75] },
  { id: 'a_water', name: 'Rain Maker', desc: 'Water plants', stat: 'watered', tiers: [20, 100, 300] },
  { id: 'a_hybrid', name: 'Hybrid Hero', desc: 'Cross-breed new flower colors', stat: 'flowersBred', tiers: [1, 10, 30] },
  { id: 'a_trees', name: 'Arborist', desc: 'Grow trees from saplings', stat: 'treesGrown', tiers: [1, 5, 15] },
  { id: 'a_decorate', name: 'Decorator', desc: 'Place furniture at home', stat: 'furniturePlaced', tiers: [5, 20, 50] },
  { id: 'a_planner', name: 'Town Planner', desc: 'Place outdoor decorations', stat: 'decorPlaced', tiers: [3, 15, 40] },
  { id: 'a_sleep', name: 'Sleepyhead', desc: 'Sleep through the night', stat: 'nightsSlept', tiers: [5, 15, 30] },
  { id: 'a_climb', name: 'Cliff Climber', desc: 'Climb cliffs with a ladder', stat: 'climbs', tiers: [1, 20, 75] },
  { id: 'a_bottles', name: 'Message Reader', desc: 'Read message bottles', stat: 'bottlesRead', tiers: [1, 10, 25] },
  { id: 'a_casts', name: 'Patient Caster', desc: 'Cast your fishing line', stat: 'casts', tiers: [20, 100, 300] },
  { id: 'a_tools', name: 'Well Used', desc: 'Wear out tools', stat: 'toolsBroken', tiers: [1, 10, 30] },
  { id: 'a_loan', name: 'Debt Free', desc: 'Repay home loans (Glints)', stat: 'loanPaid', tiers: [15000, 48000, 63000] },
  { id: 'a_challenges', name: 'Challenger', desc: 'Complete daily challenges', stat: 'challengesDone', tiers: [3, 15, 45] },
  { id: 'a_residents', name: 'Neighborly', desc: 'Welcome neighbors to the island', stat: '$residents', tiers: [2, 5, 8] },
  { id: 'a_bff', name: 'Best Friends', desc: 'Reach 5 hearts with neighbors', stat: '$bestFriends', tiers: [1, 4, 8] },
  { id: 'a_home', name: 'Homeowner', desc: 'Upgrade your home', stat: '$homeLevel', tiers: [1, 2] },
  { id: 'a_glow', name: 'Island Glow', desc: 'Raise the island rating (lanterns)', stat: '$rating', tiers: [3, 4, 5] },
  { id: 'a_fishdex', name: 'Fish Collector', desc: 'Catch different kinds of fish', stat: '$ownedFish', tiers: [10, 20, 34] },
  { id: 'a_bugdex', name: 'Bug Collector', desc: 'Catch different kinds of bugs', stat: '$ownedBugs', tiers: [10, 20, 34] },
  { id: 'a_recipes', name: 'Recipe Hoarder', desc: 'Learn recipes', stat: '$recipes', tiers: [15, 35, 60] },
  { id: 'a_tourney', name: 'Tournament Star', desc: 'Best fishing tournament medal', stat: '$medal_tournament', tiers: [1, 2, 3] },
  { id: 'a_bugoff', name: 'Bug-Off Star', desc: 'Best bug-off medal', stat: '$medal_bugoff', tiers: [1, 2, 3] },
  { id: 'a_paths', name: 'Bridge Builder', desc: 'Build bridges and ramps', stat: '$paths', tiers: [1, 3, 6] },
  { id: 'a_days', name: 'Islander', desc: 'Days spent on the island', stat: '$day', tiers: [5, 15, 30] },
  { id: 'a_explore', name: 'Explorer', desc: 'Visit every region of the island', stat: '$regions', tiers: [3, 4, 5] },
];

/** Contest scoring + prize tiers. */
export const CONTESTS = {
  tournament: { name: 'Fishing Tournament', seconds: 180, medals: [120, 260, 420] },
  bugoff: { name: 'Bug-Off', seconds: 180, medals: [100, 220, 360] },
} as const;
export const MEDAL_PRIZES = [
  { trophy: 'furn_trophy_bronze', lumens: 200 },
  { trophy: 'furn_trophy_silver', lumens: 500 },
  { trophy: 'furn_trophy_gold', lumens: 1000 },
];

/** Lumen Exchange stock. */
export interface LumenOffer {
  id: string;
  label: string;
  cost: number;
  kind: 'pockets' | 'recipe' | 'item';
  value: string | number;
  qty?: number;
}

export const LUMEN_OFFERS: LumenOffer[] = [
  { id: 'lx_pockets30', label: 'Pocket Organizer (30 slots)', cost: 1500, kind: 'pockets', value: 30 },
  { id: 'lx_pockets40', label: 'Deluxe Pocket Organizer (40 slots)', cost: 3500, kind: 'pockets', value: 40 },
  { id: 'lx_glow', label: 'Glow Pebble', cost: 500, kind: 'item', value: 'glowstone' },
  { id: 'lx_iron', label: '3 Iron Ore', cost: 300, kind: 'item', value: 'iron', qty: 3 },
  { id: 'lx_timber', label: '10 Timber', cost: 200, kind: 'item', value: 'timber', qty: 10 },
  { id: 'lx_fossil', label: 'Mystery Fossil', cost: 400, kind: 'item', value: 'fossil_unknown' },
  { id: 'lx_seeds', label: 'Mixed flower seeds (3)', cost: 150, kind: 'item', value: 'seed_star_white', qty: 3 },
  { id: 'lx_beacon', label: 'Recipe: Beacon Keeper Statue', cost: 2500, kind: 'recipe', value: 'r_furn_beacon_statue' },
  { id: 'lx_prism', label: 'Recipe: Prism Lamppost', cost: 1500, kind: 'recipe', value: 'r_furn_prism_lamppost' },
  { id: 'lx_rug', label: 'Recipe: Starglimmer Rug', cost: 800, kind: 'recipe', value: 'r_furn_starglimmer_rug' },
];

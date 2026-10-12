/** Achievements: checked each morning and after key moments. Conditions read GameState only. */
import { levelForXp } from '../sim/skills';
import type { GameState } from '../sim/state';
import { FISH } from './fish';
import { DISHES } from './recipes';
import { VILLAGERS } from './villagers';
import { MINERALS, ARTIFACTS } from './minerals';
import { CROPS } from './crops';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (s: GameState) => boolean;
}

const hearts = (s: GameState, id: string) => Math.floor((s.npcs[id]?.pts ?? 0) / 100);
const friends = (s: GameState, n: number) => VILLAGERS.filter((v) => hearts(s, v.id) >= n).length;
const fishKinds = (s: GameState) => Object.keys(s.col.fish).length;
const lvl = (s: GameState, k: keyof GameState['player']['xp']) => levelForXp(s.player.xp[k]);
const MUSEUM_ITEMS = MINERALS.length + ARTIFACTS.length - 1; // heartstone isn't donated

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstHarvest', name: 'Green Sprout', desc: 'Harvest your first crop.', icon: 'item.radish', check: (s) => s.stats.harvested >= 1 },
  { id: 'harvest100', name: 'Busy Farmer', desc: 'Harvest 100 crops.', icon: 'item.carrot', check: (s) => s.stats.harvested >= 100 },
  { id: 'harvest500', name: 'Harvest Hero', desc: 'Harvest 500 crops.', icon: 'item.pumpkin', check: (s) => s.stats.harvested >= 500 },
  { id: 'allCrops', name: 'Rainbow Garden', desc: 'Ship every kind of crop.', icon: 'item.melon', check: (s) => CROPS.every((c) => s.col.shipped[c.id]) },
  { id: 'giant', name: 'Whoa, Giant!', desc: 'Grow a giant crop.', icon: 'item.cauliflower', check: (s) => !!s.flags.giantCrop },
  { id: 'coins1k', name: 'Piggy Bank', desc: 'Earn 1,000 coins.', icon: 'ui.coin', check: (s) => s.player.earned >= 1000 },
  { id: 'coins25k', name: 'Treasure Chest', desc: 'Earn 25,000 coins.', icon: 'ui.coin', check: (s) => s.player.earned >= 25000 },
  { id: 'coins100k', name: 'Valley Tycoon', desc: 'Earn 100,000 coins.', icon: 'ui.coin', check: (s) => s.player.earned >= 100000 },
  { id: 'ship25', name: 'Shipping Star', desc: 'Ship 25 different things.', icon: 'item.chest', check: (s) => Object.keys(s.col.shipped).length >= 25 },
  { id: 'firstFish', name: 'Got One!', desc: 'Catch your first fish.', icon: 'item.chub', check: (s) => s.stats.fishCaught >= 1 },
  { id: 'fish10', name: 'Fish Friend', desc: 'Catch 10 kinds of fish.', icon: 'item.sunfish', check: (s) => fishKinds(s) >= 10 },
  { id: 'fish25', name: 'Master Angler', desc: 'Catch 25 kinds of fish.', icon: 'item.salmon', check: (s) => fishKinds(s) >= 25 },
  { id: 'allFish', name: 'Every Fish in the Sea', desc: 'Catch every kind of fish.', icon: 'item.tuna', check: (s) => FISH.every((f) => s.col.fish[f.id]) },
  { id: 'legend', name: 'Legendary!', desc: 'Catch the Crystal Carp.', icon: 'item.crystalCarp', check: (s) => !!s.col.fish.crystalCarp },
  { id: 'crabber', name: 'Pinchy Pal', desc: 'Get a catch from a crab pot.', icon: 'item.crab', check: (s) => ['crab', 'lobster', 'shrimp', 'clam', 'mussel', 'crayfish', 'snail', 'periwinkle'].some((id) => s.col.found[id]) },
  { id: 'forage50', name: 'Wild Wanderer', desc: 'Find 50 forage items.', icon: 'item.morel', check: (s) => s.stats.forage >= 50 },
  { id: 'firstFriend', name: 'New Friend', desc: 'Reach 3 hearts with a villager.', icon: 'ui.heart', check: (s) => friends(s, 3) >= 1 },
  { id: 'fiveFriends', name: 'Friendly Face', desc: 'Reach 5 hearts with 5 villagers.', icon: 'ui.heart', check: (s) => friends(s, 5) >= 5 },
  { id: 'bestFriends', name: 'Best Friends!', desc: 'Reach 10 hearts with a villager.', icon: 'ui.heart', check: (s) => friends(s, 10) >= 1 },
  { id: 'everyone', name: 'Everybody\'s Pal', desc: 'Meet every villager.', icon: 'ui.chat', check: (s) => VILLAGERS.every((v) => s.npcs[v.id]?.met) },
  { id: 'gifts50', name: 'Thoughtful', desc: 'Give 50 gifts.', icon: 'emote.gift', check: (s) => s.stats.gifts >= 50 },
  { id: 'birthday', name: 'Happy Birthday!', desc: 'Give a villager a birthday gift.', icon: 'emote.music', check: (s) => Object.values(s.npcs).some((n) => n.bdayGift) || !!s.flags.bdayGiven },
  { id: 'firstCook', name: 'Little Chef', desc: 'Cook your first dish.', icon: 'item.friedEgg', check: (s) => s.stats.cooked >= 1 },
  { id: 'cook15', name: 'Head Chef', desc: 'Cook 15 different dishes.', icon: 'item.pancakes', check: (s) => Object.keys(s.col.cooked).length >= 15 },
  { id: 'allRecipes', name: 'Recipe Collector', desc: 'Learn every recipe.', icon: 'ui.book', check: (s) => DISHES.every((d) => s.player.recipes.includes(d.id)) },
  { id: 'firstCraft', name: 'Handy', desc: 'Craft your first item.', icon: 'item.chest', check: (s) => s.stats.crafted >= 1 },
  { id: 'craft25', name: 'Master Maker', desc: 'Craft 25 items.', icon: 'item.preservesJar', check: (s) => s.stats.crafted >= 25 },
  { id: 'artisan', name: 'Jam Session', desc: 'Make an artisan good in a machine.', icon: 'item.jam.strawberry', check: (s) => Object.keys(s.col.found).some((k) => k.startsWith('jam.') || k.startsWith('juice.') || k.startsWith('pickles.') || k === 'cheese' || k === 'cloth') },
  { id: 'mine10', name: 'Spelunker', desc: 'Reach floor 10 of the mine.', icon: 'item.copperOre', check: (s) => s.mine.deepest >= 10 },
  { id: 'mine20', name: 'Frosty Explorer', desc: 'Reach floor 20 of the mine.', icon: 'item.ironOre', check: (s) => s.mine.deepest >= 20 },
  { id: 'mine30', name: 'Glow Seeker', desc: 'Reach floor 30 of the mine.', icon: 'item.goldOre', check: (s) => s.mine.deepest >= 30 },
  { id: 'heartstone', name: 'Heart of the Valley', desc: 'Find the Heartstone on floor 40.', icon: 'item.heartstone', check: (s) => s.story.heartstone >= 1 },
  { id: 'critters', name: 'Bounce House', desc: 'Bonk 50 cave critters into sparkles.', icon: 'item.tool.bonk.0', check: (s) => s.stats.critters >= 50 },
  { id: 'geodes', name: 'Rock Opener', desc: 'Crack 10 geodes.', icon: 'item.geode', check: (s) => s.stats.geodes >= 10 },
  { id: 'museum10', name: 'Curator\'s Helper', desc: 'Donate 10 items to the museum.', icon: 'item.amethyst', check: (s) => s.col.museum.length >= 10 },
  { id: 'museumAll', name: 'Complete Collection', desc: 'Fill the whole museum.', icon: 'item.diamond', check: (s) => s.col.museum.length >= MUSEUM_ITEMS },
  { id: 'board1', name: 'Fixer-Upper', desc: 'Complete your first restoration board.', icon: 'ui.star2', check: (s) => s.story.done.length >= 1 },
  { id: 'boardAll', name: 'Valley Restorer', desc: 'Complete all six restoration boards.', icon: 'ui.star3', check: (s) => s.story.done.length >= 6 },
  { id: 'finale', name: 'Grand Reopening', desc: 'Reopen the Valley Hall.', icon: 'ui.star3', check: (s) => s.story.finale > 0 },
  { id: 'coop', name: 'Chicken Keeper', desc: 'Build a coop.', icon: 'item.egg', check: (s) => s.buildings.built.coop !== undefined },
  { id: 'barn', name: 'Barnyard Buddy', desc: 'Build a barn.', icon: 'item.milk', check: (s) => s.buildings.built.barn !== undefined },
  { id: 'animals8', name: 'Happy Herd', desc: 'Raise 8 animals.', icon: 'item.wool', check: (s) => s.animals.length >= 8 },
  { id: 'kitchen', name: 'Home Sweet Home', desc: 'Upgrade your house.', icon: 'ui.bag', check: (s) => s.buildings.houseLevel >= 1 },
  { id: 'goldTool', name: 'Golden Touch', desc: 'Upgrade a tool to gold.', icon: 'item.tool.pick.3', check: (s) => Object.values(s.player.tools).some((t) => t >= 3) },
  { id: 'skill10', name: 'Expert', desc: 'Reach level 10 in any skill.', icon: 'ui.star2', check: (s) => (['farming', 'foraging', 'fishing', 'mining', 'cooking'] as const).some((k) => lvl(s, k) >= 10) },
  { id: 'festWin', name: 'Blue Ribbon', desc: 'Win first place at a festival.', icon: 'ui.star2', check: (s) => ['sprout', 'berry', 'harvest', 'starlight'].some((f) => s.flags[`fest.${f}.place`] === 1) },
  { id: 'allFests', name: 'Party Every Season', desc: 'Play all four festival games.', icon: 'ui.season0', check: (s) => ['sprout', 'berry', 'harvest', 'starlight'].every((f) => s.story.festivalsDone.some((k) => k.startsWith(f + '.'))) },
  { id: 'petLove', name: 'Best Buddy', desc: 'Make your pet super happy.', icon: 'ui.heart', check: (s) => s.pet.love >= 600 },
];

export const ACHIEVEMENT: Record<string, AchievementDef> = {};
for (const a of ACHIEVEMENTS) ACHIEVEMENT[a.id] = a;
export { MUSEUM_ITEMS };

// Every event the simulation can emit. The quest, challenge and achievement engines
// count these; the renderer/audio/UI react to them.
export interface GameEvents {
  objectsChanged: { tiles?: number[] };
  structuresChanged: Record<string, never>;
  dayStarted: { day: number };
  toast: { text: string; kind?: 'info' | 'good' | 'warn' | 'item'; item?: string };
  itemGained: { id: string; qty: number; source: string };
  itemRemoved: { id: string; qty: number; reason: string };
  inventoryChanged: Record<string, never>;
  money: { glints: number; lumens: number; dg: number; dl: number; reason?: string };
  toolUsed: { tool: string; ok: boolean };
  toolBroke: { id: string };
  fishCaught: { id: string; size: number; where: string; rarity: number };
  fishLost: { size: number };
  bugCaught: { id: string; rarity: number };
  bugScared: { id: string };
  dug: { tile: number; found: string | null };
  fossilFound: Record<string, never>;
  treeShaken: { tile: number; dropped: string | null };
  woodChopped: { id: string; qty: number };
  rockHit: { id: string };
  weedPulled: Record<string, never>;
  fruitPicked: { id: string };
  pickedUp: { id: string; qty: number };
  itemSold: { id: string; qty: number; total: number; category: string };
  itemBought: { id: string; qty: number; total: number };
  crafted: { recipe: string; item: string; category: string };
  donated: { id: string; kind: string };
  fossilAssessed: { id: string };
  planted: { id: string; tile: number };
  watered: { tile: number };
  flowerBred: { color: string; species: number };
  talked: { npc: string };
  /** knocked on a villager's door while they were home */
  knocked: { npc: string };
  gifted: { npc: string; item: string; reaction: 'love' | 'like' | 'neutral' | 'dislike' };
  requestDone: { npc: string; kind: string };
  friendshipUp: { npc: string; level: number };
  villagerMovedIn: { id: string };
  plotPlaced: { owner: string };
  homeUpgraded: { level: number };
  loanPaid: { amount: number; remaining: number };
  loanTaken: { amount: number; level: number };
  furniturePlaced: { id: string; where: 'home' | 'outdoor' };
  structureBuilt: { type: string; id: number };
  missionStarted: { id: string };
  missionCompleted: { id: string };
  /** tracked mission made no progress for a while of active play (obj -1 = turn-in) */
  missionStalled: { id: string; obj: number };
  /** a guide hint was sent (asked = player pressed the help button) */
  hintShown: { id: string; asked: boolean };
  chapterStarted: { chapter: number };
  challengeCompleted: { id: string; reward: number };
  achievement: { id: string; tier: number };
  eventStarted: { kind: string };
  eventFinished: { kind: string; score: number; medal: number };
  slept: { day: number };
  climbed: { up: boolean };
  location: { loc: string };
  sfx: { name: string; x?: number; z?: number; vol?: number; pitch?: number };
  fx: { kind: string; x: number; y: number; z: number; color?: number; text?: string; item?: string };
  ratingChanged: { stars: number };
  tip: { id: string };
  finale: Record<string, never>;
  seasonChanged: { season: string };
  outfitChanged: { hash: string };
  itemDyed: { id: string };
  catalogNew: { id: string };
  recipeLearned: { id: string; source: string };
  regionVisited: { region: number };
}

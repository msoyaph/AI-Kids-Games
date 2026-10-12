// Clothing: the closet, what you're wearing, 3 saved outfits, dyeing with flowers, and clothes
// villagers give you. Clothing is ordinary items in your pockets until you put it in the closet.
import { CLOTH_BY_ID, CLOTH_SLOTS, DYE_FLOWER_COLORS, VILLAGER_STYLE, type ClothPattern, type ClothShape, type ClothSlot } from '../data/clothing';
import { baseId, item } from '../data/registry';
import type { Game } from './game';
import { addToPockets, countItem, give, removeAt, removeItem, roomFor } from './inventory';
import type { GameState } from './state';

export type Outfit = Partial<Record<ClothSlot, string>>;

export interface WardrobeState {
  /** clothes kept in the closet (dyed copies have "#<dye>" ids) */
  owned: string[];
  worn: Outfit;
  /** three saved outfits */
  outfits: (Outfit | null)[];
}

export const OUTFIT_SLOTS = 3;

export function emptyWardrobe(): WardrobeState {
  return { owned: [], worn: {}, outfits: Array.from({ length: OUTFIT_SLOTS }, () => null) };
}

export function isClothing(id: string): boolean {
  return !!CLOTH_BY_ID[baseId(id)];
}

export function slotOf(id: string): ClothSlot | null {
  return CLOTH_BY_ID[baseId(id)]?.slot ?? null;
}

/** What the renderer and portraits need to draw one piece. */
export interface ClothVisual {
  shape: ClothShape;
  color: number;
  color2: number;
  pattern: ClothPattern;
}

export function visualOf(id: string): ClothVisual | null {
  const c = CLOTH_BY_ID[baseId(id)];
  if (!c) return null;
  return { shape: c.shape, color: item(id).icon.c, color2: c.color2, pattern: c.pattern };
}

export function wornVisuals(s: Pick<GameState, 'wardrobe'>): Partial<Record<ClothSlot, ClothVisual>> {
  const out: Partial<Record<ClothSlot, ClothVisual>> = {};
  for (const slot of CLOTH_SLOTS) {
    const id = s.wardrobe?.worn[slot];
    const v = id ? visualOf(id) : null;
    if (v) out[slot] = v;
  }
  return out;
}

/** A short key for "what you're wearing" (villagers notice when it changes). */
export function outfitHash(g: Game): string {
  return CLOTH_SLOTS.map((s) => g.state.wardrobe.worn[s] ?? '').join('|').replace(/^\|+$/, '');
}

function changed(g: Game): void {
  g.emit('outfitChanged', { hash: outfitHash(g) });
}

/** Move a clothing item from a pocket slot into the closet. */
export function stash(g: Game, pocket: number): string | null {
  const s = g.state.player.inv[pocket];
  if (!s || !isClothing(s.id)) return null;
  const id = s.id;
  removeAt(g, pocket, 1, 'closet');
  g.state.wardrobe.owned.push(id);
  return id;
}

/** Put on something from the closet (or straight from your pockets). */
export function wear(g: Game, id: string): boolean {
  const w = g.state.wardrobe;
  if (!w.owned.includes(id)) {
    const pocket = g.state.player.inv.findIndex((s) => s?.id === id);
    if (pocket < 0 || !stash(g, pocket)) return false;
  }
  const slot = slotOf(id);
  if (!slot) return false;
  w.worn[slot] = id;
  // a dress replaces a top and bottom, and the other way round
  if (slot === 'dress') {
    delete w.worn.top;
    delete w.worn.bottom;
  } else if (slot === 'top' || slot === 'bottom') delete w.worn.dress;
  g.emit('sfx', { name: 'pickup' });
  changed(g);
  return true;
}

export function takeOff(g: Game, slot: ClothSlot): boolean {
  if (!g.state.wardrobe.worn[slot]) return false;
  delete g.state.wardrobe.worn[slot];
  changed(g);
  return true;
}

/** Take a piece out of the closet into your pockets (to gift or sell it). */
export function takeOut(g: Game, id: string): boolean {
  const w = g.state.wardrobe;
  const k = w.owned.indexOf(id);
  if (k < 0 || roomFor(g, id, 1) < 1) return false;
  w.owned.splice(k, 1);
  // still wearing it? only if another copy is left in the closet
  if (!w.owned.includes(id)) for (const slot of CLOTH_SLOTS) if (w.worn[slot] === id) delete w.worn[slot];
  addToPockets(g, id, 1);
  changed(g);
  return true;
}

export function saveOutfit(g: Game, k: number): void {
  if (k < 0 || k >= OUTFIT_SLOTS) return;
  g.state.wardrobe.outfits[k] = { ...g.state.wardrobe.worn };
}

/** Wear a saved outfit (pieces you no longer own are skipped). Returns how many pieces were missing. */
export function wearOutfit(g: Game, k: number): number {
  const o = g.state.wardrobe.outfits[k];
  if (!o) return -1;
  const w = g.state.wardrobe;
  let missing = 0;
  w.worn = {};
  for (const slot of CLOTH_SLOTS) {
    const id = o[slot];
    if (!id) continue;
    if (w.owned.includes(id)) w.worn[slot] = id;
    else missing++;
  }
  changed(g);
  return missing;
}

/** Which flower colors you have in your pockets (any kind of flower works as dye). */
export function dyesInPockets(g: Game): number[] {
  const out: number[] = [];
  DYE_FLOWER_COLORS.forEach((color, k) => {
    if (g.state.player.inv.some((s) => s && s.id.startsWith('flower_') && s.id.endsWith(`_${color}`))) out.push(k);
  });
  return out;
}

/** Dye a closet piece with a flower of the chosen color. Returns the new (dyed) id. */
export function dye(g: Game, id: string, dyeIndex: number): string | null {
  const w = g.state.wardrobe;
  const k = w.owned.indexOf(id);
  const color = DYE_FLOWER_COLORS[dyeIndex];
  if (k < 0 || !color) return null;
  const flower = g.state.player.inv.find((s) => s && s.id.startsWith('flower_') && s.id.endsWith(`_${color}`));
  if (!flower) return null;
  removeItem(g, flower.id, 1, 'dye');
  const next = `${baseId(id)}#${dyeIndex}`;
  w.owned[k] = next;
  for (const slot of CLOTH_SLOTS) if (w.worn[slot] === id) w.worn[slot] = next;
  for (const o of w.outfits) if (o) for (const slot of CLOTH_SLOTS) if (o[slot] === id) o[slot] = next;
  g.state.catalog.owned[next] = g.state.clock.day;
  g.emit('sfx', { name: 'sparkle' });
  g.emit('itemDyed', { id: next });
  changed(g);
  return next;
}

/** Everything you own, closet + pockets. */
export function ownsClothing(g: Game, base: string): boolean {
  return g.state.wardrobe.owned.some((id) => baseId(id) === base) || countItem(g, base) > 0;
}

/**
 * A villager who loves your gift sometimes gives you something from their own style
 * (at most every 3 days). Returns the item given, if any.
 */
export function clothingThanks(g: Game, villager: string): string | null {
  const v = g.state.villagers[villager];
  if (!v) return null;
  if ((v.clothDay ?? -99) > g.state.clock.day - 3) return null;
  const pick = (VILLAGER_STYLE[villager] ?? []).find((id) => !ownsClothing(g, id));
  if (!pick) return null;
  v.clothDay = g.state.clock.day;
  give(g, pick, 1, 'gift');
  return pick;
}

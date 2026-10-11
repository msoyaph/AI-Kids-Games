// Using items from the pockets (inventory "Use" button).
import { RECIPES, item } from '../data/registry';
import type { Game } from './game';
import { money, removeAt, stat } from './inventory';
import { canPlantAt, plantFromSlot, plantObjFor } from './gardening';
import { frontTile } from './player';
import { equipSlot } from './tools';
import { learnRecipe } from './crafting';
import { dayRng } from '../core/rng';
import { placeOutdoor } from './decor';
import { applySurface } from './housing';
import { wear } from './wardrobe';

export type UseVerb = 'Equip' | 'Plant' | 'Open' | 'Read' | 'Place' | 'Apply' | 'Wear' | null;

export function useVerb(g: Game, slot: number): UseVerb {
  const s = g.state.player.inv[slot];
  if (!s) return null;
  const def = item(s.id);
  if (def.tool) return 'Equip';
  if (plantObjFor(s.id)) return 'Plant';
  if (s.id === 'pouch') return 'Open';
  if (s.id === 'bottle') return 'Read';
  if (def.cat === 'furniture') return 'Place';
  if (def.cat === 'clothing') return 'Wear';
  if ((def.cat === 'wallpaper' || def.cat === 'flooring') && g.state.player.location === 'home') return 'Apply';
  return null;
}

export function canUseNow(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const v = useVerb(g, slot);
  if (v === 'Plant') return g.state.player.location === 'island' && canPlantAt(g, frontTile(g.world, g.state.player), s.id);
  if (v === 'Place') return g.state.player.location === 'island' || g.state.player.location === 'home';
  return v !== null;
}

export function useSlot(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const v = useVerb(g, slot);
  switch (v) {
    case 'Equip':
      return equipSlot(g, slot);
    case 'Plant':
      if (g.state.player.location !== 'island') return false;
      return plantFromSlot(g, slot);
    case 'Open':
      removeAt(g, slot, 1, 'use');
      money(g, 1000, 0, 'found');
      g.toast('+1,000 Glints!', 'good');
      g.emit('sfx', { name: 'coins' });
      return true;
    case 'Read': {
      const unknown = RECIPES.filter((r) => r.unlock === 'card' && !g.state.recipes.includes(r.id));
      removeAt(g, slot, 1, 'use');
      stat(g, 'bottlesRead');
      if (!unknown.length) {
        money(g, 500, 0, 'found');
        g.toast('The note inside is a thank-you card... with 500 Glints tucked in!', 'good');
        return true;
      }
      const r = dayRng(g.state.seed, g.state.clock.day * 31 + (g.state.stats.bottlesRead ?? 0), 'bottle').pick(unknown);
      learnRecipe(g, r.id, 'bottle');
      return true;
    }
    case 'Place':
      if (g.state.player.location === 'island') return placeOutdoor(g, slot);
      if (g.state.player.location === 'home') {
        g.ui.open('editor');
        return true;
      }
      return false;
    case 'Apply':
      return applySurface(g, slot);
    case 'Wear': {
      const ok = wear(g, s.id);
      if (ok) g.toast(`You put on the ${item(s.id).name}! It's in your closet now.`, 'good', s.id);
      return ok;
    }
    default:
      return false;
  }
}

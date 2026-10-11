// Building interactions on the island + construction sites that finish overnight.
import type { Game, InteractCtx, Interaction } from './game';
import type { Structure, StructType } from './state';
import { enterInterior } from './interior';

export function structureLabel(s: Structure): string {
  switch (s.type) {
    case 'hall':
      return 'Lantern Hall';
    case 'shop':
      return 'The Curled Leaf';
    case 'shopCart':
      return "Fennimore's Cart";
    case 'museum':
      return 'Museum';
    case 'museumTent':
      return "Vesper's Tent";
    case 'home':
      return 'Home';
    default:
      return '';
  }
}

/** Start building something that appears the next morning. */
export function startConstruction(g: Game, s: Structure, becomes: StructType, days = 1): void {
  s.becomes = becomes;
  s.type = 'construction';
  s.readyDay = g.state.clock.day + days;
  g.world.rebuildStructures();
  g.emit('structuresChanged', {});
}

export function addStructure(g: Game, s: Omit<Structure, 'id'>): Structure {
  const st: Structure = { id: g.state.world.nextStructId++, ...s };
  g.state.world.structures.push(st);
  // clear objects under the footprint
  for (let z = s.z; z < s.z + s.d; z++) for (let x = s.x; x < s.x + s.w; x++) if (g.world.inb(x, z)) g.world.setObj(g.world.idx(x, z), undefined);
  g.world.rebuildStructures();
  g.emit('structuresChanged', {});
  g.emit('objectsChanged', {});
  return st;
}

export function findStructure(g: Game, type: StructType): Structure | undefined {
  return g.state.world.structures.find((s) => s.type === type);
}

export function dailyConstruction(g: Game): void {
  let changed = false;
  for (const s of g.state.world.structures) {
    if (s.type === 'construction' && s.becomes && (s.readyDay ?? 0) <= g.state.clock.day) {
      s.type = s.becomes;
      s.becomes = undefined;
      changed = true;
      g.emit('structureBuilt', { type: s.type, id: s.id });
    }
  }
  if (changed) {
    g.world.rebuildStructures();
    g.emit('structuresChanged', {});
  }
}

export function structureResolver(g: Game, ctx: InteractCtx): Interaction | null {
  const s = ctx.frontStruct;
  if (!s) return null;
  switch (s.type) {
    case 'home':
      return { label: 'Enter home', priority: 85, run: () => enterInterior(g, 'home') };
    case 'workbench':
      return { label: 'Craft at workbench', priority: 85, run: () => g.ui.open('craft') };
    case 'shop':
    case 'shopCart':
      return { label: s.type === 'shop' ? 'Shop at The Curled Leaf' : "Browse Fennimore's cart", priority: 85, run: () => g.ui.open('shop') };
    case 'hall':
      return { label: 'Enter Lantern Hall', priority: 85, run: () => g.ui.open('hall') };
    case 'museum':
      return { label: 'Enter the museum', priority: 85, run: () => enterInterior(g, 'museum') };
    case 'museumTent':
      return { label: "Visit Vesper's tent", priority: 85, run: () => g.ui.open('museumDesk') };
    case 'noticeBoard':
      return { label: 'Read the notice board', priority: 85, run: () => g.ui.open('board') };
    case 'construction':
      return { label: 'Under construction', priority: 85, run: () => g.toast('Construction is underway — it will be ready tomorrow morning!') };
    default:
      return null;
  }
}

// Building interactions on the island + construction sites that finish overnight.
import type { Game, InteractCtx, Interaction } from './game';
import type { Structure, StructType } from './state';
import { enterInterior } from './interior';
import { give } from './inventory';

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
    case 'shopCart': {
      const h = g.state.clock.minute / 60;
      const open = h >= 8 && h < 22;
      return {
        label: s.type === 'shop' ? 'Shop at The Curled Leaf' : "Browse Fennimore's cart",
        priority: 85,
        run: () => (open ? g.ui.open('shop') : g.toast('Closed for the night. Open 8 AM – 10 PM!')),
      };
    }
    case 'hall':
      return { label: 'Enter Lantern Hall', priority: 85, run: () => g.ui.open('talk', 'pemberly') };
    case 'museum':
      return { label: 'Enter the museum', priority: 85, run: () => enterInterior(g, 'museum') };
    case 'museumTent':
      return { label: "Visit Vesper's tent", priority: 85, run: () => g.ui.open('talk', 'vesper') };
    case 'lighthouse':
      return { label: 'Inspect the lighthouse', priority: 85, run: () => inspectLighthouse(g) };
    case 'plazaLantern':
      return { label: 'Admire the Great Lantern', priority: 60, run: () => g.ui.say('', [g.state.flags.lighthouseLit ? '[happy]The Great Lantern glows warmly. Its light reaches all the way to the lighthouse.' : '[neutral]The Great Lantern of the plaza. It has not been lit in years.']) };
    case 'noticeBoard':
      return { label: 'Read the notice board', priority: 85, run: () => g.ui.open('board') };
    case 'construction':
      return { label: 'Under construction', priority: 85, run: () => g.toast('Construction is underway — it will be ready tomorrow morning!') };
    default:
      return null;
  }
}

export function inspectLighthouse(g: Game): void {
  if (g.state.flags.lighthouseLit) {
    g.ui.say('', ['[happy]The Driftlight lighthouse sweeps its warm beam across the sea. Every lantern finds its way home.']);
    return;
  }
  const first = !g.state.flags.lighthouseSeen;
  g.state.flags.lighthouseSeen = 1;
  if (first) {
    g.state.flags.lensGiven = 1;
    give(g, 'lens', 1, 'lighthouse');
    g.ui.say('', [
      '[neutral]The old lighthouse creaks in the wind. Its great lamp is dark and dusty.',
      '[surprised]Wedged in the lamp frame is a heavy, cloudy lens. You carefully pry it loose.',
      '[neutral]Got the Old Lighthouse Lens! Pemberly will want to hear about this.',
    ]);
  } else g.ui.say('', ['[neutral]The lamp room is empty, waiting for its lens and a reason to shine.']);
}

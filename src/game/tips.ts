/**
 * First-time tips for each mechanic (shown once, non-blocking) and gentle hints when a
 * player seems stuck. Respects the "Gentle hints" setting.
 */
import { tryItem } from '../data/items';
import { FARM_LOCS } from '../sim/farming';
import { SOIL_TILLED } from '../sim/types';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { HOOKS, type Game } from './game';

interface Tip {
  id: string;
  icon: string;
  text: (g: Game) => string;
  when: (g: Game) => boolean;
}

const touch = (g: Game) => g.input.lastDevice === 'touch';
const sel = (g: Game) => g.sim.p.inv[g.sim.p.sel]?.id ?? '';

const TIPS: Tip[] = [
  { id: 'move', icon: 'ui.hand', when: (g) => g.sim.p.loc === 'farm', text: (g) => (touch(g) ? 'Tap the ground to walk there. Tap things to use them!' : 'Walk with WASD or the arrow keys. Use the mouse to aim at tiles.') },
  { id: 'tools', icon: 'item.tool.hoe.0', when: (g) => g.sim.p.loc === 'farm' && g.sim.state.tips.includes('move'), text: (g) => (touch(g) ? 'Tap a slot in your toolbar to pick a tool. Then tap a tile next to you and press the big yellow button!' : 'Pick a tool with 1–0 (or click a slot). Press Space or click to use it on the glowing tile.') },
  { id: 'till', icon: 'item.tool.hoe.0', when: (g) => sel(g) === 'tool.hoe', text: () => 'The hoe digs soil for planting. Clear weeds with the scythe and rocks with the pickaxe first!' },
  { id: 'plant', icon: 'item.seed.radish', when: (g) => sel(g).startsWith('seed.'), text: () => 'Plant seeds on dug soil. Then water them every day!' },
  { id: 'water', icon: 'item.tool.can.0', when: (g) => sel(g) === 'tool.can', text: () => 'Water your seeds every day. Rain waters them for you! Refill the can at the pond.' },
  { id: 'harvest', icon: 'item.radish', when: (g) => g.sim.state.stats.harvested > 0, text: () => 'Yay! Put crops in the shipping bin next to your house. You get paid overnight.' },
  { id: 'energy', icon: 'ui.energy', when: (g) => g.sim.p.energy < g.sim.p.maxEnergy * 0.5, text: () => 'Tools use energy (the green bar). Eat food or sleep to fill it back up.' },
  { id: 'night', icon: 'ui.moon', when: (g) => g.sim.state.min >= 22 * 60, text: () => 'It\'s late! Sleep in your bed to start a new day and save your game.' },
  { id: 'town', icon: 'ui.chat', when: (g) => g.sim.p.loc === 'town', text: (g) => (touch(g) ? 'Tap a villager to say hi! Chatting every day makes friends.' : 'Press E (or right-click) next to a villager to talk. Chat every day to make friends!') },
  { id: 'hall', icon: 'ui.star2', when: (g) => g.sim.p.loc === 'hall', text: () => 'These boards repair the valley! Tap a board to see what it needs.' },
  { id: 'mine', icon: 'item.tool.bonk.0', when: (g) => g.sim.p.loc === 'minelobby', text: () => 'Grab Lumi\'s Bonk Stick from the workbench. Break rocks to find the ladder down!' },
  { id: 'mineFloor', icon: 'ui.heart', when: (g) => g.sim.p.loc === 'mine', text: () => 'The red bar is your health. Bonk critters to make them bounce away, and eat snacks to heal.' },
  { id: 'rod', icon: 'item.tool.rod.0', when: (g) => sel(g) === 'tool.rod', text: () => 'Face the water. Hold to cast, wait for the "!", tap, then hold and let go to keep the marker in the green.' },
  { id: 'animal', icon: 'item.egg', when: (g) => g.sim.state.animals.length > 0, text: () => 'Pet your animals every day and they\'ll give you better goods. They graze outside on nice days.' },
  { id: 'machine', icon: 'item.preservesJar', when: (g) => tryItem(sel(g))?.cat === 'machine', text: () => 'Place machines on your farm, then tap them to put goods in. A ✓ bubble means it\'s ready!' },
  { id: 'kitchen', icon: 'item.friedEgg', when: (g) => g.sim.state.buildings.houseLevel >= 1 && g.sim.p.loc === 'farmhouse', text: () => 'Your kitchen is ready! Use the stove to cook tasty food.' },
  { id: 'craft', icon: 'item.chest', when: (g) => g.sim.state.stats.trees > 0 || g.sim.state.day >= 2, text: (g) => `Open your bag (${touch(g) ? 'top-left button' : 'I or Esc'}) and look at the Craft tab to make useful things.` },
];

let box: HTMLElement | null = null;
let showing: string | null = null;
let hintT = 0;
let idleT = 0;

function show(g: Game, id: string, ico: string, text: string, isTip = true): void {
  if (!box) {
    box = h('div', { class: 'tip panel', role: 'status', 'aria-live': 'polite' });
    g.uiRoot.appendChild(box);
  }
  showing = id;
  box.innerHTML = '';
  const ok = h('button', { class: 'btn small green' }, 'Got it');
  ok.addEventListener('click', () => {
    box!.classList.remove('show');
    showing = null;
  });
  box.append(icon(ico, 32), h('span', null, text), ok);
  box.classList.add('show');
  if (isTip) g.sim.state.tips.push(id);
  if (g.settings.readAloud) import('../ui/dialogue').then((d) => d.speak(text, 1.1));
  window.setTimeout(() => {
    if (showing === id) {
      box?.classList.remove('show');
      showing = null;
    }
  }, 11000);
}

function hint(g: Game): { id: string; text: string; icon: string } | null {
  const st = g.sim.state;
  const farm = g.sim.world.get('farm');
  let tilled = 0, crops = 0;
  if (farm) {
    for (let i = 0; i < farm.soil.length; i++) if (farm.soil[i] & SOIL_TILLED) tilled++;
    for (const o of farm.objs.values()) if (o.k === 'crop') crops++;
  }
  if (st.day === 0 && st.min > 9 * 60 && crops === 0) return { id: 'h.plant', icon: 'item.seed.radish', text: tilled ? 'Try planting your radish seeds on the dug soil!' : 'Try this: hoe → dig the ground, seeds → plant, watering can → water!' };
  if (st.day >= 3 && !st.flags.shippedOnce && st.stats.harvested > 0) return { id: 'h.ship', icon: 'item.chest', text: 'Your crops can earn coins! Put them in the shipping bin by your house.' };
  if (st.day >= 6 && st.story.bundles.length === 0) return { id: 'h.hall', icon: 'ui.star2', text: 'Visit the Valley Hall in town (north of the fountain) to see the restoration boards.' };
  if (st.day >= 12 && st.mine.deepest === 0) return { id: 'h.mine', icon: 'item.copperOre', text: 'The mine is north of your farm, up the mountain path. Ores and gems are waiting!' };
  if (st.day >= 9 && st.buildings.built.coop === undefined && st.player.coins > 3000) return { id: 'h.coop', icon: 'item.egg', text: 'You have enough coins for a coop! Hollis the carpenter can build one.' };
  if (st.day >= 20 && (st.player.tools.rod ?? -1) < 0) return { id: 'h.rod', icon: 'item.tool.rod.0', text: 'Cap\'n Wren at the beach has a free fishing rod for you!' };
  void FARM_LOCS;
  return null;
}

export function installTips(_g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.tip { position: absolute; left: 50%; top: calc(max(8px, env(safe-area-inset-top)) + 150px * var(--ui)); transform: translateX(-50%) translateY(-8px); display: flex; gap: 10px; align-items: center; padding: 8px 12px; width: min(92vw, 520px); opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; z-index: 30; }
.tip.show { opacity: 1; transform: translateX(-50%); pointer-events: auto; }
.tip span { flex: 1; font-weight: 700; }
`;
  document.head.appendChild(style);
  HOOKS.onUpdate.push((game, dt) => {
    if (game.mode !== 'play' || game.modals.open || game.inputBlocked) return;
    const st = game.sim.state;
    if (!showing) {
      for (const t of TIPS) {
        if (st.tips.includes(t.id)) continue;
        if (t.when(game)) {
          show(game, t.id, t.icon, t.text(game));
          break;
        }
      }
    }
    // gentle hints when stuck
    if (!game.settings.hints) return;
    const busy = game.input.moveX || game.input.moveY || game.input.holdUse;
    idleT = busy ? 0 : idleT + dt;
    hintT += dt;
    if (!showing && hintT > 20 && idleT > 25) {
      hintT = 0;
      const hnt = hint(game);
      if (hnt && (st.flags[hnt.id] ?? 0) < 2) {
        st.flags[hnt.id] = (st.flags[hnt.id] ?? 0) + 1;
        show(game, hnt.id, hnt.icon, hnt.text, false);
      }
    }
  });
}

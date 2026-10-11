/** Story client: board screens, lamp, intro & repair scenes, friendship scenes, finale, credits. */
import { BOARDS, BOARD } from '../data/boards';
import { CUTSCENES } from '../data/cutscenes';
import { tryItem } from '../data/items';
import { FINALE, HEARTSTONE, INTRO, REPAIRS } from '../data/story-scenes';
import { VILLAGERS } from '../data/villagers';
import { addPoints, hearts, npcState } from '../sim/friendship';
import { boardDone, boardsDone, bundleDone, bundleSlots, donatable, donate, finaleReady, finaleToday, placeHeartstone, repairHooks } from '../sim/story';
import { SEASON_NAMES } from '../sim/state';
import { portrait } from '../ui/dialogue';
import { fmt, h } from '../ui/dom';
import { icon } from '../ui/icons';
import { iconName, itemName } from '../ui/itemview';
import { cutsceneActive, playCutscene } from './cutscene';
import { HOOKS, type Game } from './game';
import { JOURNAL } from './villagers';

function optIcon(o: { items?: string[]; cat?: string; prefix?: string[] }): string {
  if (o.items?.length) return iconName(o.items[0]);
  if (o.prefix?.[0] === 'jam.') return 'item.jam.strawberry';
  if (o.prefix?.[0] === 'pickles.') return 'item.pickles.carrot';
  if (o.prefix?.[0] === 'juice.') return 'item.juice.apple';
  if (o.cat === 'food') return 'item.pancakes';
  if (o.cat === 'fruit') return 'item.strawberry';
  return 'item.radish';
}

function optLabel(o: { items?: string[]; label: string; n: number; q?: number }): string {
  const base = o.label || (o.items && o.items.length === 1 ? itemName(o.items[0]) : 'Any');
  return `${o.n > 1 ? o.n + ' ' : ''}${base}${o.q ? ` (${['', 'silver', 'gold', 'sparkle'][o.q]}★)` : ''}`;
}

export function openBoard(g: Game, boardId: string): void {
  const sim = g.sim;
  const bd = BOARD[boardId];
  if (!bd) return;
  let close = () => {};
  const wrap = h('div', { class: 'board-ui' });
  const render = () => {
    wrap.innerHTML = '';
    const done = boardDone(sim, boardId);
    const repaired = sim.state.story.done.includes(boardId);
    wrap.appendChild(h('h2', { style: `margin:0;color:#${bd.color.toString(16).padStart(6, '0')};text-shadow:0 1px 0 #3b2a1f` }, bd.name));
    wrap.appendChild(h('p', { style: 'margin:2px 0 8px' }, repaired ? `✅ Done! ${bd.repairText}` : done ? 'Complete! The repairs will be finished by tomorrow morning.' : `Finish every bundle to repair the ${bd.repair}.`));
    const grid = h('div', { class: 'bundles' });
    for (const b of bd.bundles) {
      const slots = bundleSlots(sim, boardId, b.id);
      const isDone = bundleDone(sim, boardId, b.id);
      const can = donatable(sim, boardId, b.id);
      const opts = h('div', { class: 'opts' });
      b.options.forEach((o, oi) => {
        const filled = !!slots[oi];
        const avail = can.find(([i]) => i === oi);
        const el = h('button', { class: 'opt' + (filled ? ' filled' : '') + (avail && !isDone ? ' can' : ''), disabled: !avail || isDone || filled, title: optLabel(o) }, icon(filled ? iconName(slots[oi]!) : optIcon(o), 32), h('span', null, optLabel(o)));
        if (avail && !isDone) {
          el.addEventListener('click', () => {
            const r = donate(sim, boardId, b.id, oi, avail[1]);
            if (!r.ok) {
              if (r.msg) g.toasts.show(r.msg);
              return;
            }
            g.sfx(r.bundleDone ? 'fanfare' : 'pop');
            if (r.bundleDone) g.toasts.show(`Bundle complete: ${b.name}! You got ${r.reward}.`, 'ui.star2', 5000);
            if (r.boardDone) {
              g.modals.ask(`${bd.name} complete!`, `Hooray! The ${bd.repair} will be repaired by tomorrow morning. Thank you, ${sim.p.name}!`, [{ label: 'Yay!', primary: true }]);
            }
            render();
          });
        }
        opts.appendChild(el);
      });
      const have = slots.filter(Boolean).length;
      grid.appendChild(
        h('div', { class: 'bundle panel' + (isDone ? ' done' : '') },
          h('div', { class: 'bh' }, h('b', null, b.name), h('span', null, isDone ? '✅' : `${Math.min(have, b.need)}/${b.need}`)),
          h('small', null, `Bring any ${b.need} of these:`),
          opts,
          h('small', { class: 'rw' }, `Reward: ${rewardText(b.reward)}`),
        ),
      );
    }
    wrap.appendChild(grid);
    wrap.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn green primary', onclick: () => close() }, 'Close')));
  };
  render();
  close = g.modals.show(wrap, { cancel: () => {} });
  g.sfx('open');
}

function rewardText(r: { item?: string; n?: number; coins?: number; craft?: string; recipe?: string }): string {
  const p: string[] = [];
  if (r.item) p.push(`${r.n ?? 1}× ${tryItem(r.item)?.name ?? r.item}`);
  if (r.coins) p.push(`${fmt(r.coins)} coins`);
  if (r.craft) p.push(`${tryItem(r.craft)?.name ?? r.craft} recipe`);
  if (r.recipe) p.push(`${tryItem(r.recipe)?.name ?? r.recipe} recipe`);
  return p.join(', ');
}

function lamp(g: Game): void {
  const sim = g.sim;
  const st = sim.state.story;
  if (st.heartstone === 2) {
    g.toasts.show('The crystal lamp glows warm and pink. It makes everyone smile.', 'ui.heart');
    return;
  }
  if (st.heartstone === 1 && placeHeartstone(sim)) {
    g.sfx('fanfare');
    void playCutscene(g, HEARTSTONE);
    return;
  }
  g.modals.ask('The Crystal Lamp', 'A beautiful lamp made by Great-Aunt Rosemary. Its crystal holder is empty... Nana says the light came from a "heartstone" hidden at the very bottom of the mine.', [{ label: 'OK', primary: true }]);
}

/** Friendship scenes: play when you walk into their place with enough hearts (one a day). */
function checkFriendScenes(g: Game): boolean {
  const sim = g.sim;
  const st = sim.state;
  if (cutsceneActive || st.flags.sceneDay === st.day + 1) return false;
  const here = sim.p.loc;
  for (const c of CUTSCENES) {
    if (c.at !== here) continue;
    const ns = npcState(sim, c.npc);
    if (ns.ev.includes(c.hearts)) continue;
    if (hearts(sim, c.npc) < c.hearts) continue;
    const [a, b] = c.time ?? [9 * 60, 18 * 60];
    if (st.min < a || st.min > b) continue;
    // earlier heart scenes first
    if (CUTSCENES.some((o) => o.npc === c.npc && o.hearts < c.hearts && !ns.ev.includes(o.hearts))) continue;
    ns.ev.push(c.hearts);
    st.flags.sceneDay = st.day + 1;
    void playCutscene(g, c).then(() => {
      const r = c.reward;
      if (!r) return;
      if (r.item) sim.give(r.item, r.n ?? 1);
      if (r.recipe && !sim.p.recipes.includes(r.recipe)) {
        sim.p.recipes.push(r.recipe);
        g.toasts.show(`You learned the ${tryItem(r.recipe)?.name ?? r.recipe} recipe!`, 'ui.book');
      }
      if (r.pts) addPoints(sim, c.npc, r.pts);
    });
    return true;
  }
  return false;
}

function checkStoryScenes(g: Game): boolean {
  const sim = g.sim;
  const f = sim.state.flags;
  if (cutsceneActive) return false;
  if (!f.introSeen && sim.p.loc === 'farm') {
    f.introSeen = 1;
    void playCutscene(g, INTRO);
    return true;
  }
  for (const b of sim.state.story.done) {
    const sc = REPAIRS[b];
    if (!sc || f[`repairSeen.${b}`] || sim.p.loc !== sc.at) continue;
    f[`repairSeen.${b}`] = 1;
    void playCutscene(g, sc);
    return true;
  }
  return false;
}

let finaleRunning = false;
async function runFinale(g: Game): Promise<void> {
  if (finaleRunning) return;
  finaleRunning = true;
  const sim = g.sim;
  await g.fader.out('Everyone is gathering at the Valley Hall...', 900);
  await new Promise((r) => setTimeout(r, 600));
  await g.fader.in(10);
  await playCutscene(g, FINALE);
  sim.state.story.finale = 1;
  sim.state.flags.finaleToday = 0;
  sim.state.flags.finaleDay = sim.state.day + 1;
  g.save(false);
  await showCredits(g);
  finaleRunning = false;
}

export function showCredits(g: Game): Promise<void> {
  return new Promise((resolve) => {
    const sim = g.sim;
    const st = sim.state;
    const friends = VILLAGERS.filter((v) => hearts(sim, v.id) >= 5).length;
    const roll = h('div', { class: 'credits-roll' },
      h('div', { class: 'logo' }, 'Cliff Valley', h('small', null, 'the valley is whole again')),
      h('p', null, `Thank you, ${sim.p.name}, for bringing ${sim.p.farm} Farm and Cliff Valley back to life.`),
      h('h3', null, 'Starring'),
      h('div', { class: 'cast' }, ...VILLAGERS.map((v) => h('div', { class: 'castm' }, h('img', { src: portrait(v.id), alt: '' }), h('span', null, v.name)))),
      h('p', null, `and ${st.pet.name} the ${st.pet.kind}`),
      h('h3', null, 'Your Year'),
      h('p', null, `${fmt(st.stats.harvested)} crops harvested · ${fmt(st.stats.fishCaught)} fish caught · ${fmt(st.stats.forage)} wild things found · ${friends} close friends · ${fmt(st.player.earned)} coins earned`),
      h('h3', null, 'Made with care for Ai Kids Games'),
      h('p', null, 'Pixel art, music and sounds made entirely in code.'),
      h('p', null, 'Dedicated to everyone who plants one kind thing at a time — just like Great-Aunt Rosemary.'),
      h('h3', null, 'Your adventure continues...'),
      h('p', null, `It's a brand new year! Keep farming, fill the museum, catch every fish, become best friends with everyone, and earn a perfect farm rating. Your Year 2 goals are in your Journal.`),
    );
    const wrap = h('div', { class: 'credits', role: 'dialog', 'aria-label': 'Credits' }, roll, h('button', { class: 'btn green credits-btn', onclick: () => { close(); resolve(); } }, 'Keep playing!'));
    const close = g.modals.show(wrap, { bare: true });
    g.sfx('credits');
  });
}

export function installStory(_g: Game): void {
  const style = document.createElement('style');
  style.textContent = `
.board-ui { width: min(92vw, 760px); max-height: 86vh; overflow: auto; }
.bundles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 8px; }
.bundle { padding: 8px; box-shadow: none; display: flex; flex-direction: column; gap: 4px; }
.bundle.done { background: #e8f6dc; }
.bundle .bh { display: flex; justify-content: space-between; }
.bundle small { color: var(--ink2); font-size: .82em; }
.bundle .rw { color: #7a4a10; }
.opts { display: flex; flex-wrap: wrap; gap: 4px; }
.opt { font: inherit; font-size: .72em; display: flex; flex-direction: column; align-items: center; gap: 1px; width: 74px; min-height: 64px; padding: 4px 2px; border: 2px dashed var(--paper3); border-radius: 8px; background: var(--paper2); cursor: default; opacity: .7; }
.opt.can { border: 2px solid var(--leaf); background: #f0fbe8; opacity: 1; cursor: pointer; animation: glow 1.4s ease-in-out infinite; }
.opt.filled { border: 2px solid var(--sun); background: #fff6dc; opacity: 1; }
@keyframes glow { 50% { box-shadow: 0 0 0 3px rgba(92, 174, 76, .35); } }
.credits { position: absolute; inset: 0; background: linear-gradient(#1a1530, #2b2448 60%, #3e2a55); color: var(--paper); overflow: hidden; pointer-events: auto; }
.credits-roll { position: absolute; left: 50%; transform: translateX(-50%); width: min(92vw, 620px); text-align: center; animation: roll 70s linear forwards; top: 100%; }
.reduced-motion .credits-roll { animation: none; top: 4%; max-height: 84vh; overflow: auto; }
.credits h3 { color: #ffe7a0; margin-top: 28px; }
.cast { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.castm { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.castm img { width: 64px; height: 64px; image-rendering: pixelated; background: #cfe8b8; border-radius: 8px; }
.credits-btn { position: absolute; right: 16px; bottom: 16px; }
@keyframes roll { from { top: 100%; } to { top: -260%; } }
`;
  document.head.appendChild(style);
  HOOKS.trigger.board = (game, arg) => openBoard(game, arg ?? 'crops');
  HOOKS.trigger.lamp = (game) => lamp(game);
  HOOKS.onEnter.push((game) => {
    setTimeout(() => {
      if (game.mode !== 'play' || game.modals.open || cutsceneActive) return;
      if (!checkStoryScenes(game)) checkFriendScenes(game);
    }, 400);
  });
  HOOKS.onUpdate.push((game) => {
    if (finaleToday(game.sim) && game.sim.state.min >= 18 * 60 && !game.modals.open && !cutsceneActive) void runFinale(game);
  });
  HOOKS.beforeSleep = (game) => {
    if (finaleToday(game.sim)) {
      void runFinale(game);
      return true;
    }
    return false;
  };
  repairHooks.push(() => {});
  JOURNAL.push((game) => {
    const sim = game.sim;
    const sec = h('div', null, h('h3', { style: 'margin:12px 0 6px' }, 'Restore the Valley'));
    for (const b of BOARDS) {
      const done = sim.state.story.done.includes(b.id);
      const n = b.bundles.filter((x) => bundleDone(sim, b.id, x.id)).length;
      sec.appendChild(h('div', { class: 'row' }, h('span', { style: `width:14px;height:14px;border-radius:50%;background:#${b.color.toString(16).padStart(6, '0')};flex:none` }), h('div', { class: 'nm' }, h('b', null, `${b.name} → ${b.repair}`), h('small', null, done ? '✅ Repaired!' : `${n}/${b.bundles.length} bundles`))));
    }
    const hs = sim.state.story.heartstone;
    sec.appendChild(h('div', { class: 'row' }, icon('item.heartstone', 24), h('div', { class: 'nm' }, h('b', null, 'Light the crystal lamp'), h('small', null, hs === 2 ? '✅ The lamp is glowing!' : hs === 1 ? 'Bring the Heartstone to the Valley Hall lamp.' : `Find the Heartstone at the bottom of the mine (deepest floor: ${sim.state.mine.deepest}).`))));
    const ready = finaleReady(sim);
    sec.appendChild(h('p', { style: 'font-size:.9em' }, sim.state.story.finale ? '🎉 The Valley Hall has reopened! Thank you!' : ready ? 'Everything is ready! The grand reopening is on Winter 10.' : `${boardsDone(sim)}/6 boards done. Goal: reopen the Valley Hall by ${SEASON_NAMES[3]} 10!`));
    return sec;
  });
}

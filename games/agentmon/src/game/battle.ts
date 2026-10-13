/**
 * A spar, start to finish: sets up the stage and the controls, runs the battle rules turn by turn,
 * plays every event as a short animation with a plain message, and handles what comes after
 * (experience, new moves, growing, a new friend's nickname, coins). Losing is never a punishment:
 * the caller sends the team to the last Rest Stop, rested, with nothing taken.
 */
import { chooseAction } from '../core/battle/ai';
import { active, activeFighter, afterBattle, resolveTurn, startBattle, type Action, type Battle, type BattleEvent, type Mood, type Outcome } from '../core/battle/engine';
import { moodRounds, sparkSetup } from '../core/befriend';
import { bestMoveset, grow, growthTarget, learnMove } from '../core/creature';
import { hash32, Rng } from '../core/rng';
import { useItem } from '../core/state';
import type { Creature, Difficulty, StatusId } from '../core/types';
import { DEX } from '../data/index';
import { ITEMS } from '../data/items';
import { SPECIES } from '../data/species';
import type { MapDef } from '../core/world/map';
import { BattleView } from '../render/battle-view';
import { playEvolution } from '../render/evolution';
import { SparkRing } from '../render/spark-ring';
import { BattleUI } from '../ui/battle-ui';
import { wait } from '../ui/dom';
import { playMoodMatch } from '../ui/mood-match';
import { TUNING } from '../tuning';
import type { Game } from './game';

export interface BattleSetup {
  kind: 'wild' | 'trainer';
  foe: Creature[];
  /** Trainer name and title for the messages ("Keeper Marisol"). */
  trainer?: { name: string; title: string; gentle?: boolean };
  mood?: Mood;
  guardian?: boolean;
  bg: MapDef['battleBg'];
  seed: number;
}

const STATUS_WORD: Record<StatusId, string> = { sleepy: 'Sleepy', dizzy: 'Dizzy', soaked: 'Soaked', toasty: 'Toasty', chilly: 'Chilly' };

export async function playBattle(game: Game, setup: BattleSetup): Promise<{ outcome: Outcome; befriended?: Creature }> {
  const session = game.session!;
  const s = session.state;
  const settings = game.settings;
  const app = game.app;
  const view = new BattleView(app.sprites, setup.bg);
  view.speed = settings.skipAnimations ? 4 : settings.battleSpeed;
  const foeName = (c: Creature) => (setup.kind === 'wild' ? `the wild ${SPECIES[c.species]!.name}` : `${setup.trainer?.name}'s ${SPECIES[c.species]!.name}`);
  const ui = new BattleUI(game, DEX, { friend: c => session.friendName(c), foe: c => SPECIES[c.species]!.name });
  app.stage.addChild(view.root);
  let alive = true;
  let last = performance.now();
  const loop = (now: number) => { if (!alive) return; view.update(Math.min(0.1, (now - last) / 1000)); last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const relayout = () => {
    view.resize(ui.stageRect());
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
  };
  addEventListener('resize', relayout);
  game.touch.setWorldActive(false);

  const difficulty: Difficulty = s.difficulty;
  const foeAi: Difficulty = setup.kind === 'wild' ? (difficulty === 'hard' ? 'normal' : 'easy') : setup.trainer?.gentle ? 'easy' : TUNING.difficulty[difficulty].ai;
  const lead = s.team.findIndex(c => c.energy > 0);
  const b: Battle = startBattle(DEX, { kind: setup.kind, player: s.team, foe: setup.foe, difficulty, seed: setup.seed, sharedXp: settings.sharedXp, mood: setup.mood, guardian: setup.guardian, lead });
  const rng = new Rng(hash32(setup.seed, 99));
  s.stats.battles++;
  for (const c of setup.foe) session.seen(c.species);
  const statusOf = (side: 0 | 1) => activeFighter(b, side).status?.id;
  const refresh = () => {
    ui.updateCard(0, active(b, 0), statusOf(0));
    ui.updateCard(1, active(b, 1), statusOf(1), SPECIES[active(b, 1).species]!.name);
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
  };

  try {
    relayout();
    view.hide(0);
    view.hide(1);
    ui.updateCard(0, null);
    ui.updateCard(1, null);
    await view.enter(1, active(b, 1));
    refresh();
    ui.updateCard(0, null);
    const first = active(b, 1);
    if (setup.guardian) await ui.say(`${SPECIES[first.species]!.name}, a guardian of Sunreach, wants to see your friendship!`, 1800);
    else if (setup.kind === 'wild') await ui.say(`A wild ${SPECIES[first.species]!.name} wants to play!${first.shimmer ? ' It shimmers! ✨' : ''}${b.mood === 'grumpy' ? ' It looks grumpy from the static fog.' : b.mood === 'happy' ? ' It looks happy!' : ''}`, 1500);
    else await ui.say(`${setup.trainer!.title} ${setup.trainer!.name} wants a friendly spar!`, 1400);
    await view.enter(0, active(b, 0));
    refresh();
    await ui.say(`Go, ${session.friendName(active(b, 0))}!`, 700);
    await game.tutorial('battle');

    while (!b.outcome) {
      if (b.needsSwitch === 0) {
        const to = await ui.chooseSwitch(b, true);
        resolveTurn(DEX, b, { type: 'switch', to: to! }, { type: 'rest' });
        await view.enter(0, active(b, 0));
        refresh();
        await ui.say(`Go, ${session.friendName(active(b, 0))}!`, 700);
        continue;
      }
      refresh();
      const choice = await ui.chooseAction(b);
      let action: Action;
      if (choice.type === 'befriend') {
        const fill = await befriendGame(game, ui, view, b, setup, rng);
        if (fill === null) continue;
        action = { type: 'befriend', fill };
      } else if (choice.type === 'item') {
        useItem(s, choice.item);
        action = choice;
      } else action = choice;
      const foeAction = chooseAction(DEX, b, 1, foeAi, rng);
      const before: [Creature, Creature] = [active(b, 0), active(b, 1)];
      const events = resolveTurn(DEX, b, action, foeAction);
      await playEvents(events, before);
    }

    // ---- after the spar
    afterBattle(DEX, b);
    refresh();
    const outcome = b.outcome!;
    if (outcome === 'won') {
      s.stats.wins++;
      s.coins += b.coins;
      await ui.say(setup.kind === 'wild' ? 'Great spar! The wild one waves and runs back to play.' : `You won the spar! ${setup.trainer!.name} gives you ${b.coins} coins.`, 1500);
    } else if (outcome === 'lost') {
      await ui.say('Your friends are all tuckered out. Time for a nap!', 1500);
    } else if (outcome === 'wandered') {
      await ui.say(`${SPECIES[active(b, 1).species]!.name} wandered off. Maybe next time!`, 1400);
    } else if (outcome === 'left') {
      await ui.say('You waved goodbye and walked away.', 900);
    }
    let befriended: Creature | undefined;
    if (outcome === 'befriended' && b.befriended) {
      befriended = b.befriended;
      befriended.met = 0;
      const nick = await ui.chooseNickname(befriended, hash32(s.stats.battles, s.stats.steps));
      befriended.nick = nick;
      befriended.moves = bestMoveset(DEX, SPECIES[befriended.species]!, befriended.level);
      const where = session.befriend(befriended);
      await ui.say(where === 'team' ? `${session.friendName(befriended)} joined your team!` : where === 'base' ? `${session.friendName(befriended)} went to the Agent Base. You can visit any time!` : 'The Agent Base is full!', 1600);
    }
    if (outcome !== 'lost') await afterLevels();
    return { outcome, befriended };
  } finally {
    alive = false;
    removeEventListener('resize', relayout);
    ui.destroy();
    view.destroy();
    game.input.clearPresses();
  }

  async function playEvents(events: BattleEvent[], before: [Creature, Creature]): Promise<void> {
    const name = (side: 0 | 1) => (side === 0 ? session.friendName(active(b, 0)) : foeName(active(b, 1)));
    let lastMove: { side: 0 | 1; move: string } | null = null;
    for (const e of events) {
      switch (e.t) {
        case 'act':
          if (e.kind === 'move' && e.move) {
            lastMove = { side: e.side, move: e.move };
            const m = DEX.moves[e.move]!;
            const mover = e.side === 0 ? session.friendName(before[0]) : foeName(before[1]);
            await ui.say(`${cap(mover)} used ${m.name}!`, 650);
            if (m.power > 0) await view.lunge(e.side);
          } else if (e.kind === 'rest') {
            await ui.say(`${cap(name(e.side))} takes a rest.`, 600);
          } else if (e.kind === 'item' && e.item) {
            await ui.say(`You gave ${session.friendName(active(b, 0))} a ${ITEMS[e.item]!.name}.`, 700);
          }
          break;
        case 'bump': {
          const target = active(b, e.side);
          const mv = lastMove ? DEX.moves[lastMove.move]! : null;
          await view.bump(e.side, e.matchup, mv?.element ?? 'plain', target);
          refresh();
          if (e.matchup === 'strong') { void view.float(e.side, 'Super strong!', 0xffd84a); await ui.say('It\'s super strong!', 700); }
          else if (e.matchup === 'weak') await ui.say('It\'s not very strong.', 650);
          break;
        }
        case 'blocked': await ui.say('The shield blocked half!', 600); break;
        case 'spend': refresh(); break;
        case 'restore': refresh(); await view.glow(e.side, 0x9ff7a8); void view.float(e.side, `+${e.amount}`, 0x9ff7a8); break;
        case 'status':
          refresh();
          if (e.on) { await view.status(e.side, app.sprites.status(e.status)); await ui.say(`${cap(name(e.side))} is ${STATUS_WORD[e.status]}!`, 750); }
          else await ui.say(`${cap(name(e.side))} is not ${STATUS_WORD[e.status]} anymore.`, 650);
          break;
        case 'boost': {
          const stat = e.stat === 'power' ? 'Power' : e.stat === 'guard' ? 'Guard' : 'Speed';
          await view.boost(e.side, e.stages > 0);
          await ui.say(`${cap(name(e.side))}'s ${stat} went ${e.stages > 0 ? 'up' : 'down'}${Math.abs(e.stages) > 1 ? ' a lot' : ''}!`, 700);
          break;
        }
        case 'shield': await view.shield(e.side, true); await ui.say(`${cap(name(e.side))} is ready to block!`, 600); break;
        case 'wobble': await ui.say(`${cap(name(e.side))} is dizzy and wobbles!`, 700); break;
        case 'asleep': await ui.say(`${cap(name(e.side))} is snoozing… Zzz`, 650); break;
        case 'wake': await ui.say(`${cap(name(e.side))} woke up!`, 600); refresh(); break;
        case 'toasty': refresh(); await ui.say(`${cap(name(e.side))} feels toasty and a bit tired.`, 650); break;
        case 'fail':
          await ui.say(e.reason === 'status-proof' ? 'It just shrugs it off!' : e.reason === 'status-held' ? 'It already has a status.' : e.reason === 'too-tired' ? 'Too tired for that move!' : 'Nothing happened.', 600);
          break;
        case 'tuckered': {
          const c = b.sides[e.side].team[e.index]!;
          await view.nap(e.side, c);
          refresh();
          await ui.say(`${cap(e.side === 0 ? session.friendName(c) : foeName(c))} is tuckered out and takes a little nap.`, 1000);
          break;
        }
        case 'switch':
          if (e.side === 1) { await view.enter(1, active(b, 1)); refresh(); await ui.say(`${setup.trainer?.name ?? 'They'} sent out ${SPECIES[active(b, 1).species]!.name}!`, 900); }
          else { await view.enter(0, active(b, 0)); refresh(); await ui.say(`Go, ${session.friendName(active(b, 0))}!`, 600); }
          for (const side of [0, 1] as const) void view.shield(side, false);
          break;
        case 'xp': break;
        case 'level': {
          const c = b.sides[0].team[e.index]!;
          await ui.say(`${session.friendName(c)} grew to level ${e.report.to}!`, 800);
          break;
        }
        case 'befriend':
          if (e.success) { await view.glow(1, 0xff8fc0); await ui.say(`${SPECIES[active(b, 1).species]!.name} wants to be your friend! 💛`, 1500); }
          else await ui.say(`${SPECIES[active(b, 1).species]!.name} isn't sure yet. ${e.interest > 0 ? 'Maybe try again!' : ''}`, 1100);
          break;
        case 'coins': break;
        case 'end': break;
      }
    }
    for (const side of [0, 1] as const) void view.shield(side, false);
    refresh();
  }

  /** New moves and growing, for every friend that levelled up. */
  async function afterLevels(): Promise<void> {
    for (const c of s.team) {
      const sp = SPECIES[c.species]!;
      const pending = sp.learnset.filter(([at, id]) => at <= c.level && at > c.level - 10 && !c.moves.includes(id) && !s.flags.has(`skipmove:${c.uid}:${id}`)).map(([, id]) => id);
      for (const move of pending.slice(-2)) {
        if (c.moves.length < 4) { c.moves.push(move); continue; }
        const best = bestMoveset(DEX, sp, c.level);
        const suggest = c.moves.findIndex(m => !best.includes(m));
        const slot = await ui.learnMove(c, move, suggest >= 0 ? suggest : 0);
        if (slot === null) s.flags.add(`skipmove:${c.uid}:${move}`);
        else learnMove(DEX, c, move, slot);
      }
      const to = growthTarget(DEX, c);
      if (to) {
        const yes = await ui.yesNo(`${session.friendName(c)} is ready to grow! Let it grow?`, 'Grow!', 'Not yet');
        if (!yes) { c.holdGrowth = true; continue; }
        await growAnimation(game, c, to);
        const oldName = session.friendName(c);
        grow(DEX, c);
        session.research(SPECIES[to]!.num);
        session.state.guide.seen.add(SPECIES[to]!.num);
        await ui.say(`${oldName} grew into ${SPECIES[to]!.name}!`, 1500);
      }
    }
  }
}

/** The friendship mini-game for a tired wild one: pick a snack, then Spark Ring or Mood Match. */
async function befriendGame(game: Game, ui: BattleUI, view: BattleView, b: Battle, setup: BattleSetup, rng: Rng): Promise<number | null> {
  const s = game.session!.state;
  const foe = active(b, 1);
  const sp = SPECIES[foe.species]!;
  const snackPick = s.bag['snack-pouch'] || s.flags.has('mission-1') ? await ui.chooseSnack(sp.favoriteSnack) : null;
  if (snackPick === 'back') return null;
  const snack = snackPick ?? undefined;
  if (snack) useItem(s, snack);
  await game.tutorial('befriend');
  if (game.settings.befriendMode === 'mood') {
    const rounds = moodRounds(foe, rng.int(2 ** 31));
    return playMoodMatch(game, rounds, TUNING.befriend.need, !!snack, sp.name);
  }
  const setupSpark = sparkSetup(DEX, { foe, mood: b.mood, snack: snack as never, difficulty: s.difficulty, seed: rng.int(2 ** 31), guardian: setup.guardian });
  return playSparkRing(game, view.root, setupSpark, foe);
}

/** Show the Spark Ring over `parent` and play it (tap, click, A, Space or Enter). Returns the heart fill. */
export async function playSparkRing(game: Game, parent: import('pixi.js').Container, setupSpark: ReturnType<typeof sparkSetup>, foe: Creature): Promise<number> {
  const host = game.app.host;
  const r = Math.min(host.width, host.height) * 0.26;
  const ring = new SparkRing(setupSpark, game.app.sprites.creature(foe.species, 32, 'happy', foe.shimmer), { cx: host.width / 2, cy: host.height * 0.52, r, scale: Math.max(2, Math.round(r / 22)), W: host.width, H: host.height });
  parent.addChild(ring.root);
  let flag = false;
  const on = (e: Event) => { if (e.type === 'keydown' && !['Space', 'Enter', 'KeyZ'].includes((e as KeyboardEvent).code)) return; flag = true; };
  addEventListener('pointerdown', on);
  addEventListener('keydown', on);
  const tapped = () => { const v = flag || game.input.consume('a'); flag = false; return v; };
  const layer = { el: document.createElement('div') };
  game.focus.push(layer);
  try {
    const result = await ring.play(tapped, game.settings.skipAnimations);
    return result.fill;
  } finally {
    removeEventListener('pointerdown', on);
    removeEventListener('keydown', on);
    game.focus.pop(layer);
    ring.destroy();
  }
}

export async function growAnimation(game: Game, c: Creature, to: string): Promise<void> {
  const host = game.app.host;
  const scale = Math.max(3, Math.round(Math.min(host.width, host.height) / 90));
  let skip = false;
  const onTap = () => { skip = true; };
  addEventListener('pointerdown', onTap);
  try {
    await playEvolution(game.app.stage, game.app.sprites.creature(c.species, 32, 'idle', c.shimmer), game.app.sprites.creature(to, 32, 'happy', c.shimmer), { W: host.width, H: host.height, scale }, () => skip || game.input.consume('a'), game.settings.reducedMotion || game.settings.skipAnimations);
  } finally {
    removeEventListener('pointerdown', onTap);
  }
  await wait(50);
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

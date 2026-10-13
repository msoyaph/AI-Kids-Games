/**
 * Capture routes (?scene=battle|befriend|evolution&seed=N): one good-looking moment each, for the
 * website's previews and the visual review. They use a made-up adventure that never saves.
 * The snapshot says `ready: true` once the moment is on screen.
 *   battle     a Volt friend's super-strong bump on a Tide Agentmon
 *   befriend   the Spark Ring mid-play (&mode=mood shows Mood Match instead)
 *   evolution  a friend that has just grown
 */
import { Container } from 'pixi.js';
import { sparkSetup, moodRounds } from '../core/befriend';
import { resolveTurn, startBattle } from '../core/battle/engine';
import { isFree, makeCreature, maxEnergy } from '../core/creature';
import { hash32, Rng } from '../core/rng';
import { addFriend, newGameState } from '../core/state';
import type { Creature } from '../core/types';
import type { MapDef } from '../core/world/map';
import { DEX } from '../data/index';
import { SPECIES } from '../data/species';
import { TUNING } from '../tuning';
import { BattleView } from '../render/battle-view';
import { evolutionStill } from '../render/evolution';
import { SparkRing } from '../render/spark-ring';
import { BattleUI } from '../ui/battle-ui';
import { wait } from '../ui/dom';
import { playMoodMatch } from '../ui/mood-match';
import type { App, Scene } from './app';
import type { Game } from './game';
import { Session } from './session';

export type CaptureKind = 'battle' | 'befriend' | 'evolution';
export const CAPTURE_KINDS: readonly CaptureKind[] = ['battle', 'befriend', 'evolution'];

export class CaptureScene implements Scene {
  readonly name = 'capture';
  readonly root = new Container();
  private ready = false;
  private view: BattleView | null = null;
  private rng: Rng;

  constructor(private game: Game, private kind: CaptureKind, private seed: number, private mode = '') {
    this.rng = new Rng(hash32(seed, 4242));
  }

  enter(app: App): void {
    void this.run(app).then(() => { this.ready = true; }, error => { console.error(error); });
  }

  update(dt: number): void { this.view?.update(dt); }

  snapshot() { return { capture: this.kind, ready: this.ready }; }

  /** A made-up adventure that never saves, with the given friends. */
  private session(team: [string, number][]): Session {
    const state = newGameState({ slot: 3, name: this.seed % 40, look: { skin: 1, hair: 0, hairColor: 0, outfit: 0 }, difficulty: 'normal', seed: this.seed, start: { map: 'brightmoor', x: 4, y: 7 }, now: 0 });
    for (const [species, level] of team) {
      const c = makeCreature(DEX, { species, level }, this.rng);
      addFriend(state, c);
      state.guide.seen.add(SPECIES[species]!.num);
    }
    const session = new Session(state, this.game.settings, true);
    this.game.session = session;
    return session;
  }

  private stage(bg: MapDef['battleBg'], ui: BattleUI): BattleView {
    const view = new BattleView(this.game.app.sprites, bg);
    this.view = view;
    this.root.addChild(view.root);
    view.resize(ui.stageRect());
    return view;
  }

  private async run(app: App): Promise<void> {
    void app;
    if (this.kind === 'battle') return this.battle();
    if (this.kind === 'befriend') return this.befriend();
    return this.evolution();
  }

  private async battle(): Promise<void> {
    const session = this.session([['zipbill', 16], ['druzette', 15]]);
    const me = session.state.team[0]!;
    const foe = makeCreature(DEX, { species: 'lullatee', level: 15 }, this.rng);
    const ui = new BattleUI(this.game, DEX, { friend: c => session.friendName(c), foe: c => SPECIES[c.species]!.name });
    const view = this.stage('beach', ui);
    const b = startBattle(DEX, { kind: 'wild', player: session.state.team, foe: [foe], difficulty: 'normal', seed: this.seed, mood: 'happy' });
    const volt = strongestOf(me, 'volt');
    const foeMove = foe.moves.find(m => isFree(DEX, m)) ?? foe.moves[0]!;
    view.setCreature(0, me);
    view.setCreature(1, foe);
    ui.updateCard(0, me);
    ui.updateCard(1, foe);
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
    resolveTurn(DEX, b, { type: 'move', move: volt }, { type: 'move', move: foeMove });
    await ui.say(`${session.friendName(me)} used ${DEX.moves[volt]!.name}!`, 500);
    await view.lunge(0);
    await view.bump(1, 'strong', 'volt', foe);
    void view.float(1, 'Super strong!', 0xffd84a);
    ui.updateCard(0, me);
    ui.updateCard(1, foe);
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
    await ui.say("It's super strong!", 1);
    await wait(500);
  }

  private async befriend(): Promise<void> {
    const session = this.session([['spinnet', 9]]);
    const foe = makeCreature(DEX, { species: 'hummet', level: 8 }, this.rng);
    foe.energy = Math.round(maxEnergy(DEX, foe) * 0.3);
    session.seen(foe.species);
    const ui = new BattleUI(this.game, DEX, { friend: c => session.friendName(c), foe: c => SPECIES[c.species]!.name });
    const view = this.stage('meadow', ui);
    view.setCreature(0, session.state.team[0]!);
    view.setCreature(1, foe, 'happy');
    ui.updateCard(0, session.state.team[0]!);
    ui.updateCard(1, foe);
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
    if (this.mode === 'mood') {
      void playMoodMatch(this.game, moodRounds(foe, this.seed), TUNING.befriend.need, true, SPECIES[foe.species]!.name);
      await wait(300);
      return;
    }
    await ui.say(`${SPECIES[foe.species]!.name} looks happy!`, 1);
    const setup = sparkSetup(DEX, { foe, mood: 'happy', snack: SPECIES[foe.species]!.favoriteSnack as never, difficulty: 'normal', seed: this.seed });
    const host = this.game.app.host;
    const r = Math.min(host.width, host.height) * 0.26;
    const ring = new SparkRing(setup, this.game.app.sprites.creature(foe.species, 32, 'happy', foe.shimmer), { cx: host.width / 2, cy: host.height * 0.52, r, scale: Math.max(2, Math.round(r / 22)), W: host.width, H: host.height });
    this.root.addChild(ring.root);
    ring.still(1, (setup.arcAt[1] ?? 0) - setup.arc * 0.15, 1, `Spark 2 of ${setup.sparks}`);
    await wait(300);
  }

  private async evolution(): Promise<void> {
    const session = this.session([['zipbill', 32]]);
    const c = session.state.team[0]!;
    const host = this.game.app.host;
    const scale = Math.max(3, Math.round(Math.min(host.width, host.height) / 90));
    evolutionStill(this.root, this.game.app.sprites.creature('voltabill', 32, 'happy', c.shimmer), { W: host.width, H: host.height, scale });
    void this.game.dialogue.say(`${session.friendName(c)} grew into ${SPECIES.voltabill!.name}!`);
    await wait(1500);
  }
}

/** The friend's strongest known move of an element (for the super-strong moment). */
function strongestOf(c: Creature, element: string): string {
  const own = c.moves.filter(m => DEX.moves[m]!.element === element && DEX.moves[m]!.power > 0);
  const pool = own.length ? own : Object.values(DEX.moves).filter(m => m.element === element && m.power > 0).map(m => m.id);
  return pool.sort((a, b) => DEX.moves[b]!.power - DEX.moves[a]!.power)[0]!;
}

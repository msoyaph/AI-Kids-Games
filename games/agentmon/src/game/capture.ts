/**
 * Capture routes (?scene=battle|befriend|evolution&seed=N): one good-looking moment each, for the
 * website's previews and the visual review. They use a made-up adventure that never saves.
 * The snapshot says `ready: true` once the moment is on screen.
 *   battle     a Volt friend's super-strong bump on a Tide Agentmon (&bg=kind&tod=time of day)
 *   befriend   the Spark Ring mid-play (&mode=mood shows Mood Match instead)
 *   evolution  a friend that has just grown
 *   town       Saltwhistle by the sea, with the team out walking   (&map=id,x,y for another place, &tod=)
 *   dungeon    a Redrock Trial room with light beams, half solved   (&trial=id&room=N&steps=N)
 *   guide      the Field Guide with lots of friends made
 * For the website's preview loops, `&play=1` keeps the moment moving (a few turns of the spar, the
 * Spark Ring sweeping and tapped, the whole growing animation, a Trial room solving itself), and
 * `&delay=ms` waits before it starts.
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
import { SPECIES, SPECIES_LIST } from '../data/species';
import { TUNING } from '../tuning';
import { BattleView } from '../render/battle-view';
import { evolutionStill, playEvolution } from '../render/evolution';
import { SparkRing } from '../render/spark-ring';
import { BattleUI } from '../ui/battle-ui';
import { wait } from '../ui/dom';
import { playMoodMatch } from '../ui/mood-match';
import type { App, Scene } from './app';
import type { Game } from './game';
import { Session } from './session';
import { OverworldScene } from './scenes/overworld';
import { TrialScene } from './scenes/trial';
import { openPauseMenu } from '../ui/pause';
import { DAY_TIMES, playMsFor, type DayTime } from '../core/world/daytime';

export type CaptureKind = 'battle' | 'befriend' | 'evolution' | 'town' | 'dungeon' | 'guide';
export const CAPTURE_KINDS: readonly CaptureKind[] = ['battle', 'befriend', 'evolution', 'town', 'dungeon', 'guide'];

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
    // full daylight unless the route asks for another time of day (&tod=)
    state.playMs = playMsFor(this.tod);
    const session = new Session(state, this.game.settings, true);
    this.game.session = session;
    return session;
  }

  private stage(bg: MapDef['battleBg'], ui: BattleUI): BattleView {
    const view = new BattleView(this.game.app.sprites, this.params().get('bg') as MapDef['battleBg'] | null ?? bg, this.tod);
    this.view = view;
    view.blinks = this.playing;
    this.root.addChild(view.root);
    view.resize(ui.stageRect());
    return view;
  }

  private get playing() { return this.params().get('play') === '1'; }
  /** `&tod=morning|day|evening|night` picks the battle backdrop's time of day (default day). */
  private get tod(): DayTime { const t = this.params().get('tod'); return (DAY_TIMES as readonly string[]).includes(t ?? '') ? (t as DayTime) : 'day'; }

  private async run(app: App): Promise<void> {
    void app;
    const delay = Number(this.params().get('delay') ?? 0);
    if (delay > 0) await wait(delay);
    if (this.kind === 'battle') return this.battle();
    if (this.kind === 'befriend') return this.befriend();
    if (this.kind === 'town') return this.town();
    if (this.kind === 'dungeon') return this.dungeon();
    if (this.kind === 'guide') return this.guide();
    return this.evolution();
  }

  private params() { return new URLSearchParams(location.search); }

  private async town(): Promise<void> {
    const session = this.session([['spinnet', 14], ['lullakin', 12], ['snipsy', 11]]);
    for (const f of ['woke-up', 'got-partner', 'mission-1', 'salt-arrive', 'met-finch']) session.state.flags.add(f);
    const [map = 'saltwhistle', x = '17', y = '13'] = (this.params().get('map') ?? '').split(',').filter(Boolean);
    session.enterMap(map, Number(x), Number(y), 0);
    await wait(0);
    this.game.app.go(new OverworldScene(this.game));
  }

  private async dungeon(): Promise<void> {
    const p = this.params();
    const session = this.session([['zestle', 26], ['poplet', 26]]);
    const trial = p.get('trial') ?? 'canyon';
    session.state.vars[`trial-room:${trial}`] = Number(p.get('room') ?? 1);
    for (const t of ['puzzle', 'move', 'talk']) session.state.tutorials.add(t);
    await wait(0);
    const scene = new TrialScene(this.game, trial);
    this.game.app.go(scene);
    if (this.playing) void scene.autoplay();
    else scene.demo(Number(p.get('steps') ?? 6));
  }

  private async guide(): Promise<void> {
    const friends: [string, number][] = SPECIES_LIST.filter((sp, i) => !sp.guardian && i % 5 !== 3).slice(0, 34).map(sp => [sp.id, 20]);
    const session = this.session(friends.slice(0, 6));
    for (const [id] of friends) { const sp = SPECIES[id]!; session.state.guide.friends.add(sp.num); session.state.guide.seen.add(sp.num); session.state.guide.stars[sp.num] = 1 + (sp.num % 3); }
    for (const sp of SPECIES_LIST.slice(0, 48)) session.state.guide.seen.add(sp.num);
    session.enterMap('brightmoor', 16, 12, 0);
    await wait(0);
    this.game.app.go(new OverworldScene(this.game));
    await wait(100);
    void openPauseMenu(this.game, this.params().get('page') ?? 'guide');
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
    await view.attack(0, 'volt');
    await view.bump(1, 'strong', 'volt', foe);
    void view.float(1, 'Super strong!', 0xffd84a);
    ui.updateCard(0, me);
    ui.updateCard(1, foe);
    ui.placeCards([view.headPoint(0), view.headPoint(1)]);
    await ui.say("It's super strong!", 1);
    await wait(500);
    if (!this.playing) return;
    // a few more turns back and forth, gently, for the preview loop
    const druz = session.state.team[1]!;
    for (let turn = 0; turn < 3 && foe.energy > 0; turn++) {
      this.ready = true;
      await ui.say(`${SPECIES[foe.species]!.name} used ${DEX.moves[foeMove]!.name}!`, 500);
      await view.attack(1, DEX.moves[foeMove]!.element);
      await view.bump(0, 'neutral', DEX.moves[foeMove]!.element, me);
      me.energy = Math.max(1, me.energy - 9);
      ui.updateCard(0, me);
      await wait(400);
      await ui.say(`${session.friendName(me)} used ${DEX.moves[volt]!.name}!`, 500);
      await view.attack(0, 'volt');
      await view.bump(1, 'strong', 'volt', foe);
      void view.float(1, 'Super strong!', 0xffd84a);
      foe.energy = Math.max(0, foe.energy - 22);
      ui.updateCard(1, foe);
      await wait(500);
    }
    void druz;
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
      await ui.say(`${SPECIES[foe.species]!.name} is ready to be friends!`, 1);
      void playMoodMatch(this.game, moodRounds(foe, this.seed), TUNING.befriend.need, true, SPECIES[foe.species]!.name);
      await wait(300);
      return;
    }
    await ui.say(`${SPECIES[foe.species]!.name} looks happy!`, 1);
    const setup = sparkSetup(DEX, { foe, mood: 'happy', snack: SPECIES[foe.species]!.favoriteSnack as never, difficulty: 'normal', seed: this.seed });
    const host = this.game.app.host;
    const r = Math.min(host.width, host.height) * 0.26;
    const ring = new SparkRing(setup, sz => this.game.app.sprites.creature(foe.species, sz, 'happy', foe.shimmer), { cx: host.width / 2, cy: host.height * 0.52, r, scale: Math.max(2, Math.round(r / 22)), W: host.width, H: host.height });
    this.root.addChild(ring.root);
    if (!this.playing) {
      ring.still(1, (setup.arcAt[1] ?? 0) - setup.arc * 0.15, 1, `Spark 2 of ${setup.sparks}`);
      await wait(300);
      return;
    }
    // the ring plays for real: the spark sweeps round and a tap lands in the glow
    ring.destroy();
    for (let round = 0; round < 3; round++) {
      const live = new SparkRing({ ...setup, arcAt: setup.arcAt.map(a => (a + round * 70) % 360) }, sz => this.game.app.sprites.creature(foe.species, sz, 'happy', foe.shimmer), { cx: host.width / 2, cy: host.height * 0.52, r, scale: Math.max(2, Math.round(r / 22)), W: host.width, H: host.height });
      this.root.addChild(live.root);
      let spark: { angle: number; arcAt: number; arc: number } | null = null;
      this.ready = true;
      await live.play(() => !!spark && Math.abs((((spark.angle - spark.arcAt) % 360) + 540) % 360 - 180) < spark.arc * 0.12, false, info => { spark = info; });
      await wait(600);
      live.destroy();
    }
  }

  private async evolution(): Promise<void> {
    const session = this.session([['zipbill', 32]]);
    const c = session.state.team[0]!;
    const host = this.game.app.host;
    const scale = 2 * Math.max(2, Math.round(Math.min(host.width, host.height) / 180)); // even, as in battle.ts
    if (this.playing) {
      void this.game.dialogue.say(`${session.friendName(c)} is growing!`);
      this.ready = true;
      await playEvolution(this.root, this.game.app.sprites.creature('zipbill', 64, 'idle', c.shimmer), this.game.app.sprites.creature('voltabill', 64, 'happy', c.shimmer), { W: host.width, H: host.height, scale }, () => false, false);
    }
    evolutionStill(this.root, this.game.app.sprites.creature('voltabill', 64, 'happy', c.shimmer), { W: host.width, H: host.height, scale });
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

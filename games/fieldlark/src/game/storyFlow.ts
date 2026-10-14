/**
 * The story on screen: a chapter's intro dialogue, the goal on the HUD (and "Show me"), the outro and
 * the reward when the goals are done, the seasonal fairs, the Grand Harvest Fair, the credits, the
 * endless goals after them, one-time tips the first time things come up, and gentle hints when
 * nothing has moved forward for a while (Settings → Hints).
 *
 * Story moments stop the farm clock (they are panels without `keepsTime`); tips and hints don't.
 */
import { CHAPTERS, type Goal } from '../data/chapters';
import { TIPS } from '../data/tips';
import { sfx } from '../audio/engine';
import { isHome } from '../sim/animals';
import { fairName, fairOpen, enterFair, type Entry } from '../sim/fair';
import { fieldState } from '../sim/fields';
import { count } from '../sim/inventory';
import { isMachine } from '../sim/production';
import { areaAt } from '../sim/map';
import type { Farm } from '../sim/state';
import { chapterComplete, chapterOf, endlessProgress, finishChapter, holdGrandFair, nextGoal, readyForGrandFair, beginChapter, storyDone, goalProgress } from '../sim/story';
import { raining } from '../sim/weather';
import { dayIndex } from '../sim/clock';
import { helperSlots } from '../sim/helpers';
import { levelOf } from '../sim/world';
import { h } from '../ui/h';
import type { Panels } from '../ui/panels';
import { speak } from '../ui/speech';
import { credits, dialogue, fairPanel, fairResults, goalsPanel } from '../ui/storyUi';

export interface StoryHost {
  farm(): Farm;
  panels: Panels;
  readAloud(): boolean;
  hints(): boolean;
  say(text: string): void;
  changed(): void;
  /** Glide the camera to some tiles if they are off screen; false if there was nothing to show. */
  showMe(tiles: { x: number; z: number }[]): boolean;
  /** Tiles the current tool or hint is about (fallback for "Show me"). */
  hintTiles(): { x: number; z: number }[];
  /** Is the farm on screen and playing (no title screen)? */
  playing(): boolean;
  /** A one-time tip: a small card that doesn't block the farm. */
  showTip(title: string, text: string): void;
}

/** How long (seconds of farm time) with nothing moving forward before a gentle hint, and between hints. */
const STALL_FIRST = 150, STALL_AGAIN = 240;

export class StoryFlow {
  private busy = false;
  private tipAt = -Infinity;
  private stallSig = '';
  private stallSince = 0;
  private lastHintAt = -Infinity;

  constructor(private host: StoryHost) {}

  private get farm() { return this.host.farm(); }

  /** Show dialogue lines one at a time in a card; `done` runs after the last. */
  private talk(lines: Parameters<typeof dialogue>[0], done: () => void) {
    this.busy = true;
    const p = this.host.panels;
    const card = p.show(null, dialogue(lines, this.host.readAloud(), () => { p.close(card); this.busy = false; done(); }), { kind: 'card', noClose: true, className: 'story-card' });
  }

  /** The farm is on screen: a chapter that hasn't begun starts with its intro. */
  start() {
    const farm = this.farm;
    if (storyDone(farm) || farm.story.introSeen || this.busy) return;
    const ch = chapterOf(farm);
    if (!ch) return;
    this.talk(ch.intro, () => {
      beginChapter(farm);
      this.host.changed();
      this.host.say(`Chapter ${farm.story.chapter + 1}: ${ch.title}`);
    });
  }

  /** Called a few times a second while the farm is on screen. */
  tick() {
    const farm = this.farm;
    const panels = this.host.panels;
    if (!this.host.playing() || this.busy || panels.open) return;
    if (!storyDone(farm) && !farm.story.introSeen) { this.start(); return; }
    if (!storyDone(farm) && chapterComplete(farm)) { this.finish(); return; }
    this.tips();
    this.stall();
  }

  private finish() {
    const farm = this.farm;
    const ch = chapterOf(farm)!;
    this.talk(ch.outro, () => {
      const done = finishChapter(farm);
      if (!done) return;
      sfx.levelUp();
      this.host.changed();
      const last = storyDone(farm);
      this.busy = true;
      const p = this.host.panels;
      const card = p.show(`Chapter ${CHAPTERS.indexOf(done) + 1} done!`, h('div.chapter-done', null,
        h('p', null, h('b', null, done.title)),
        h('p', null, `Reward: ${done.reward.coins} coins and ${Math.round(done.reward.coins / 2)} experience.`),
        done.reward.set ? h('p', null, 'A new decoration set is in Build → Decorate.') : null,
        h('button.big.primary', { onclick: () => { p.close(card); this.busy = false; if (last) this.showCredits(); else this.start(); } }, last ? 'The end… or is it?' : 'On to the next chapter')),
      { kind: 'card', noClose: true, className: 'story-card' });
    });
  }

  /** The credits (after the Grand Harvest Fair; also the ending capture scene). */
  showCredits() {
    const farm = this.farm;
    if (farm.story.creditsSeen) return;
    farm.story.creditsSeen = true;
    this.busy = true;
    const p = this.host.panels;
    const card = p.show('Thank you for playing', h('div', null, credits(),
      h('button.big.primary', { onclick: () => { p.close(card); this.busy = false; this.host.say('New goals have arrived. Happy farming!'); } }, 'Keep farming')),
    { kind: 'card', noClose: true, className: 'story-card' });
  }

  /** What the HUD's goal pill says, and its progress (null: no bar). */
  goal(): { text: string; progress: number | null } {
    const farm = this.farm;
    if (fairOpen(farm)) return { text: `${fairName(farm)} today!`, progress: null };
    if (storyDone(farm)) {
      const g = farm.story.endless.find(x => !endlessProgress(farm, x).done) ?? farm.story.endless[0];
      if (!g) return { text: 'Happy farming!', progress: null };
      const p = endlessProgress(farm, g);
      return { text: g.text, progress: p.need > 1 ? p.have / p.need : null };
    }
    if (readyForGrandFair(farm)) return { text: 'Start the Grand Harvest Fair!', progress: null };
    const n = nextGoal(farm);
    if (!n) return { text: 'Chapter done!', progress: 1 };
    return { text: n.goal.text, progress: n.progress.need > 1 ? n.progress.have / n.progress.need : null };
  }

  /** The tiles the current goal is about, for "Show me". */
  goalTiles(): { x: number; z: number }[] {
    const farm = this.farm;
    const n = storyDone(farm) ? null : nextGoal(farm);
    if (!n) return this.host.hintTiles();
    const tiles = tilesFor(farm, n.goal);
    return tiles.length ? tiles : this.host.hintTiles();
  }

  /** The goal pill was tapped: show what the goal is about, or open the goals list. */
  tapGoal() {
    const farm = this.farm;
    if (fairOpen(farm)) { this.openFair(false); return; }
    if (readyForGrandFair(farm)) { this.openGoals(); return; }
    if (!this.host.showMe(this.goalTiles())) this.openGoals();
  }

  openGoals() {
    const farm = this.farm;
    const p = this.host.panels;
    const el = p.show(storyDone(farm) ? 'Goals' : `Goals · ${chapterOf(farm)?.title ?? ''}`, h('div', null,
      goalsPanel(farm, () => { p.close(el); this.openFair(true); }),
      fairOpen(farm) ? h('button.big.primary', { onclick: () => { p.close(el); this.openFair(false); } }, `Enter the ${fairName(farm)}`) : null),
    { keepsTime: true });
  }

  /** The seasonal fair, or the Grand Harvest Fair at the end of the story. */
  openFair(grand: boolean) {
    const farm = this.farm;
    const p = this.host.panels;
    const name = fairName(farm, grand);
    const el = p.show(name, fairPanel(farm, name, (entries: Entry[]) => {
      const r = enterFair(farm, entries, grand);
      p.close(el);
      if (!r) { this.host.say('The fair has closed for this season.'); return; }
      if (grand) holdGrandFair(farm);
      if (r.place <= 3) sfx.levelUp(); else sfx.coins();
      this.host.changed();
      p.show(r.place === 1 ? 'A gold rosette!' : 'Fair results', fairResults(r), { kind: 'card' });
    }));
  }

  // --- tips: once each, the first time something comes up ---
  private tips() {
    const farm = this.farm;
    if (farm.t - this.tipAt < 20) return;
    const st = (k: string) => farm.stats[k] ?? 0;
    const fields = farm.objects.filter(o => o.kind === 'field');
    const want: [string, boolean][] = [
      ['move', true],
      ['plant', fields.some(f => !f.crop)],
      ['water', st('planted') >= 1],
      ['pick', fields.some(f => fieldState(farm, f) === 'ready')],
      ['barn', st('harvest') >= 1],
      ['orders', st('sold') >= 1 && farm.orders.length > 0],
      ['farmhouse', st('harvest') >= 8],
      ['weather', dayIndex(farm.t) >= 2],
      ['soil', st('harvest') >= 14 || farm.story.chapter >= 1],
      ['heirloom', farm.story.chapter >= 3],
      ['helpers', helperSlots(farm) > farm.helpers.length],
      ['channels', farm.story.chapter >= 4],
      ['greenhouse', farm.story.chapter >= 5],
      ['lab', farm.story.chapter >= 5 && farm.ideas > 0],
      ['rain', raining(farm.seed, farm.t)],
      ['stars', st('stars3') >= 1],
      ['compost', count(farm, 'fertilizer') >= 1],
      ['shop', farm.story.chapter >= 1],
      ['animals', farm.objects.some(isHome)],
      ['workshop', farm.objects.some(isMachine)],
      ['build', farm.story.chapter >= 2],
      ['neighbours', levelOf(farm) >= 5],
      ['fair', fairOpen(farm)],
    ];
    const next = want.find(([id, now]) => now && !farm.flags[`tip:${id}`] && TIPS[id]);
    if (!next) return;
    const tip = TIPS[next[0]]!;
    farm.flags[`tip:${tip.id}`] = 1;
    this.tipAt = farm.t;
    this.host.showTip(tip.title, tip.text);
    if (this.host.readAloud()) speak(`${tip.title}. ${tip.text}`);
  }

  // --- gentle hints when nothing has moved forward for a while ---
  private stall() {
    const farm = this.farm;
    if (!this.host.hints() || storyDone(farm)) return;
    const n = nextGoal(farm);
    const sig = `${farm.story.chapter}|${n?.goal.id}|${n ? goalProgress(farm, n.goal).have : ''}|${farm.stats.harvest ?? 0}|${farm.stats.planted ?? 0}|${farm.stats.made ?? 0}|${farm.stats.orders ?? 0}`;
    if (sig !== this.stallSig) { this.stallSig = sig; this.stallSince = farm.t; return; }
    const quiet = farm.t - this.stallSince;
    if (!n || quiet < STALL_FIRST || farm.t - this.lastHintAt < STALL_AGAIN) return;
    this.lastHintAt = farm.t;
    this.host.say(`A little hint: ${n.goal.hint}`);
  }
}

/** Where a goal's work is on the farm (for "Show me"). */
export function tilesFor(farm: Farm, g: Goal): { x: number; z: number }[] {
  const fields = farm.objects.filter(o => o.kind === 'field');
  if (g.kind === 'have') return farm.objects.filter(o => o.def === g.def);
  if (g.kind === 'animals') return farm.objects.filter(isHome);
  if (g.kind !== 'stat') return [];
  const k = g.key;
  if (k === 'cleared') return farm.objects.filter(o => { const a = o.kind === 'debris' && o.def !== 'mushrooms' ? areaAt(o.x, o.z) : null; return !!a && farm.unlocked.includes(a); });
  if (k === 'planted' || k.startsWith('planted')) return fields.filter(f => !f.crop);
  if (k === 'watered' || k === 'composted') return fields.filter(f => fieldState(farm, f) === 'growing' && !(k === 'watered' ? f.watered : f.fertilized));
  if (k === 'harvest' || k === 'stars3' || k === 'rotation') return fields.filter(f => fieldState(farm, f) === 'ready');
  if (k === 'orders' || k.startsWith('story:')) return farm.objects.filter(o => o.def === 'board');
  // the stand is down the river on Larkford's square; contract baskets leave from the dock
  if (k === 'stand-sold') return [{ x: 45, z: 65 }];
  if (k === 'greenhouse-picked') return farm.objects.filter(o => o.kind === 'building' && o.def.startsWith('greenhouse'));
  if (k === 'channel-wet' || k === 'auto-watered') return fields.filter(f => !f.crop || fieldState(farm, f) === 'growing');
  if (k.startsWith('contract') || k === 'helper:deliveries') return farm.objects.filter(o => o.def === 'dock');
  if (k.startsWith('collect')) return farm.objects.filter(isHome);
  if (k.startsWith('made')) return farm.objects.filter(isMachine);
  return [];
}

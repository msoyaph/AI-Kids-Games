/**
 * The story on screen: a chapter's dialogue as cards (a portrait, a name, a line, and Next; they stop
 * the clock), the goal pill and the goal list, a cheer for every goal done, the chapter's thank-you
 * and reward, the next chapter's land opening, and the festival's ending and credits. A friendly hint
 * appears if nothing has moved forward for a while (after 150 s of play, then every 240 s).
 */
import { sfx } from '../audio/engine';
import { PERSON } from '../data/cast';
import { CHAPTERS, type Goal, type Line } from '../data/chapters';
import { AREA } from '../sim/map';
import type { Sim } from '../sim/tick';
import { currentGoals, finishChapter, progress, storyStep, type StoryEvent } from '../sim/story';
import type { Town } from '../sim/state';
import { fill, h } from '../ui/h';
import { icon } from '../ui/icons';
import type { Panels } from '../ui/panels';
import { portrait } from '../ui/portrait';
import { speak } from '../ui/speech';

export interface StoryDeps {
  town(): Town;
  sim(): Sim;
  panels: Panels;
  say(text: string): void;
  readAloud(): boolean;
  /** Settings → Hints (off in captures). */
  hints(): boolean;
  /** Chapter 1 is done: Creative mode opens for every slot. */
  openCreative(): void;
  changed(): void;
  /** The festival's night (the ending scene), then the credits. */
  festival(): void;
}

export class StoryFlow {
  private lastProgress = '';
  private stallSince = 0;
  private nextHintAt = 150;
  private busy = false;

  constructor(private d: StoryDeps) {}

  private get town() { return this.d.town(); }

  /** Entering a town: the chapter's opening lines if they haven't been seen. */
  start() {
    const t = this.town;
    this.stallSince = t.t;
    this.nextHintAt = 150;
    if (t.mode === 'creative') return;
    const ch = CHAPTERS[t.story.chapter];
    if (ch && !t.flags[`intro-${t.story.chapter}`]) this.dialogue(ch.intro, `Chapter ${t.story.chapter + 1}: ${ch.title}`, () => { t.flags[`intro-${t.story.chapter}`] = 1; this.d.changed(); });
  }

  /** The goal pill: the first goal not done yet, and how far it has got. */
  goal(): { text: string; progress: number | null } {
    const t = this.town;
    if (t.mode === 'creative') return { text: 'Creative mode: build anything!', progress: null };
    const goals = currentGoals(t);
    const s = this.d.sim();
    for (const g of goals) {
      const p = progress(t, s.census, s.trips, g);
      if (!p.done) return { text: g.text, progress: p.value / p.target };
    }
    return { text: CHAPTERS[t.story.chapter] ? 'Chapter done! Tap here.' : 'All done! Keep building.', progress: 1 };
  }

  /** The goal list (the goal pill opens it). */
  openGoals() {
    const t = this.town;
    if (t.story.chapter >= 0 && t.flags.chapterWaiting) { this.chapterDone(t.story.chapter); return; }
    const s = this.d.sim();
    const ch = CHAPTERS[t.story.chapter];
    const goals = currentGoals(t);
    const list = h('ul.goals', null, ...goals.map(g => {
      const p = progress(t, s.census, s.trips, g);
      return h('li', { class: p.done ? 'done' : '' },
        h('span.goal-mark', null, p.done ? icon('check', 22) : icon('star', 22)),
        h('span.goal-body', null,
          h('b', null, g.text),
          g.who && PERSON[g.who] ? h('small', null, `${PERSON[g.who]!.name} asked for this.`) : null,
          !p.done && p.target > 1 ? h('span.bar', null, h('i.bar-fill', { style: `width:${Math.round((p.value / p.target) * 100)}%` })) : null,
          !p.done && p.target > 1 ? h('small', null, `${Math.round(p.value)} of ${p.target}`) : null,
          !p.done && g.hint ? h('small.hint', null, g.hint) : null));
    }));
    this.d.panels.show(ch ? `Chapter ${t.story.chapter + 1}: ${ch.title}` : 'New goals', h('div', null, list, ch ? null : h('p.note', null, 'You’ve finished the story! New goals keep coming, and each set done gives the town a bonus.')), { keepsTime: true });
  }

  /** Every second or so: note goals done, and offer a hint if the town seems stuck. */
  tick() {
    const t = this.town;
    if (t.mode === 'creative' || this.busy) return;
    const s = this.d.sim();
    for (const e of storyStep(t, s.census, s.trips)) this.onEvent(e);
    // the stall hint
    const key = currentGoals(t).map(g => { const p = progress(t, s.census, s.trips, g); return `${g.id}:${Math.round(p.value)}`; }).join(',');
    if (key !== this.lastProgress) { this.lastProgress = key; this.stallSince = t.t; this.nextHintAt = 150; }
    else if (t.t - this.stallSince > this.nextHintAt && this.d.hints()) {
      this.nextHintAt += 240;
      const g = currentGoals(t).find(x => !progress(t, s.census, s.trips, x).done);
      if (g) this.d.say(`A little hint: ${g.hint ?? goalHint(g)}`);
    }
  }

  private onEvent(e: StoryEvent) {
    if (e.type === 'goal-done') { sfx.cheer(); this.d.say(`Goal done: ${e.goal.text}!`); this.d.changed(); }
    else if (e.type === 'chapter-done') this.chapterDone(e.chapter);
    else if (e.type === 'endless-done') { sfx.cheer(); this.d.say(`Goals done! The town gets a bonus of ${e.coins} coins.`); this.d.changed(); }
  }

  private chapterDone(chapter: number) {
    const ch = CHAPTERS[chapter];
    if (!ch) return;
    this.busy = true;
    this.dialogue(ch.outro, `Chapter ${chapter + 1} done!`, () => {
      const t = this.town;
      finishChapter(t, this.d.sim().census);
      if (chapter === 0) this.d.openCreative();
      sfx.levelUp();
      const next = CHAPTERS[t.story.chapter];
      const opens = next?.opens ? AREA[next.opens] : null;
      this.d.panels.show(`Chapter ${chapter + 1}: ${ch.title}`, h('div.chapter-done', null,
        h('p', null, h('b', null, `+${ch.reward} coins`), ' for the town’s budget.'),
        opens ? h('p', null, `New land: `, h('b', null, opens.name), `. ${opens.blurb}`) : null,
        next ? h('p', null, 'Next: ', h('b', null, next.title), '.') : h('p', null, 'The story is done. Time for the Bay Festival!'),
        h('button.big.primary', { onclick: () => {
          this.d.panels.close();
          this.busy = false;
          this.d.changed();
          if (next) this.start();
          else this.d.festival();
        } }, next ? 'On we go!' : 'Start the festival!')), { kind: 'card', noClose: true });
    });
  }

  /** Lines of dialogue, one card at a time. */
  dialogue(lines: readonly Line[], title: string, done: () => void) {
    let i = 0;
    const box = h('div.dialogue');
    const show = () => {
      const line = lines[i]!;
      const who = PERSON[line.who];
      fill(box,
        h('div.speaker', null, portrait(line.who, 72), h('div', null, h('b', null, who?.name ?? ''), h('small', null, who?.role ?? ''))),
        h('p.line', null, line.text),
        h('div.row', null,
          h('button.icon-button', { 'aria-label': 'Read it to me', onclick: () => speak(line.text) }, icon('speak', 24)),
          h('button.big.primary', { onclick: () => { i++; if (i < lines.length) show(); else { this.d.panels.close(el); done(); } } }, i < lines.length - 1 ? 'Next' : 'OK!')));
      if (this.d.readAloud()) speak(line.text);
      requestAnimationFrame(() => box.querySelector<HTMLElement>('.primary')?.focus({ preventScroll: true }));
    };
    const el = this.d.panels.show(title, box, { kind: 'card', noClose: true, className: 'story-card' });
    show();
  }
}

/** A hint for a goal that has none of its own. */
function goalHint(g: Goal): string {
  switch (g.kind) {
    case 'pop': return 'Zone more homes beside your roads. Happy towns grow faster!';
    case 'happy': return 'Tap a home to see what it wishes for: trees, shops and services all help.';
    case 'count': return 'Find it on the tool bar and place it beside a road.';
    case 'cover': return 'Open Maps to see where a service’s circle reaches, then build another where it doesn’t.';
    default: return 'Tap the goal at the top to see what to do.';
  }
}

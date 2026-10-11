// Story presentation: quest talk hooks, mission messages, chapter banners, HUD tracker + compass.
import type { App } from '../app';
import type { Game } from '../sim/game';
import { startPlotPlacement } from '../sim/placement';
import { active, objectiveLive, objectiveValue, questOptions, questRT, talkScene } from '../sim/quests';
import { parseLine } from '../sim/talk';
import { makeBox, type TalkOption } from './conversation';
import { contestOptions } from './journal';
import { btn, clear, h, type Panel } from './dom';
import { sendHint, trackedMission } from '../sim/hints';
import { markerPos } from '../sim/markers';
export { markerPos };
import { fmt } from '../core/math';

const ctxOf = (g: Game) => ({ player: g.state.player.name });

export function installStory(app: App): void {
  app.talkHooks = {
    intro: async (id, box) => {
      const g = app.game!;
      const scene = talkScene(g, id);
      if (!scene) return false;
      if (scene.lines.length) await box.say(scene.lines.map((l) => parseLine(l, ctxOf(g))));
      scene.apply();
      await drainFor(app, box, id);
      return true;
    },
    options: (id) => {
      const g = app.game!;
      const contest = contestOptions(app, id);
      return contest.concat(questOptions(g, id).map(
        (o): TalkOption => ({
          label: o.label,
          run: async (box) => {
            if (o.plot) {
              box.close();
              startPlotPlacement(g, o.plot);
              app.hud.toast('Walk to a clear spot and face where the home should go. E to place, Esc to cancel.');
              return 'end';
            }
            const lines = o.run();
            if (lines) await box.say(lines.map((l) => parseLine(l, ctxOf(g))));
            await drainFor(app, box, id);
          },
        }),
      ));
    },
  };
}

/** Show queued quest messages from this speaker inside an open conversation. */
async function drainFor(app: App, box: ReturnType<typeof makeBox>, id: string): Promise<void> {
  const g = app.game!;
  const rt = questRT(g);
  for (;;) {
    const k = rt.inbox.findIndex((m) => m.speaker === id && !m.title);
    if (k < 0) break;
    const [m] = rt.inbox.splice(k, 1);
    await box.say(m!.lines.map((l) => parseLine(l, ctxOf(g))));
  }
}

let showing = false;
/** Called each frame: show the next queued message/banner when the player is free. */
export function pumpInbox(app: App): void {
  const g = app.game;
  if (!g || showing || app.ui.top || g.mode !== 'play' || g.action) return;
  const rt = questRT(g);
  const m = rt.inbox.shift();
  if (!m) return;
  showing = true;
  if (m.title) {
    chapterBanner(app, m.title).then(() => (showing = false));
    return;
  }
  const box = makeBox(app, m.speaker || 'narrator');
  if (!m.speaker) box.setSpeaker({ id: 'narrator', name: g.state.player.name, voice: 1 });
  void box.say(m.lines.map((l) => parseLine(l, ctxOf(g)))).then(() => {
    box.close();
    showing = false;
  });
}

function chapterBanner(app: App, title: string): Promise<void> {
  return new Promise((res) => {
    const el = h('div', { class: 'chapter-banner' }, h('div', { class: 'cb-small' }, 'A new chapter begins'), h('div', { class: 'cb-title' }, title));
    document.getElementById('ui')!.appendChild(el);
    app.audio.play('quest');
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => {
      el.remove();
      res();
    }, 3300);
  });
}

// ---------------------------------------------------------------- HUD tracker + compass

export class QuestTracker {
  readonly el = h('div', { class: 'tracker' });
  readonly arrow = h('div', { class: 'compass' }, h('div', { class: 'compass-dot' }, '!'));
  private key = '';
  constructor(root: HTMLElement) {
    root.appendChild(this.el);
    root.appendChild(this.arrow);
    this.hide();
  }

  /** Title screens: no mission tracker or marker. */
  hide(): void {
    this.el.style.display = 'none';
    this.arrow.style.display = 'none';
  }

  update(app: App): void {
    const g = app.game;
    if (!g || !app.hud.visible || app.ui.modalOpen) {
      this.el.style.display = 'none';
      this.arrow.style.display = 'none';
      return;
    }
    const m = trackedMission(g);
    if (!m) {
      this.el.style.display = 'none';
      this.arrow.style.display = 'none';
      return;
    }
    this.el.style.display = '';
    const objs = m.objectives.map((_, i) => objectiveValue(g, m, i));
    const key = `${m.id}|${objs.map((o) => o.value).join(',')}`;
    if (key !== this.key) {
      this.key = key;
      clear(this.el);
      const say = h('button', { class: 'tr-say', 'aria-label': 'Read the mission', title: 'Read the mission' }, '🔊');
      say.addEventListener('click', () => {
        const todo = m.objectives.filter((_, i) => objectiveLive(g, m, i) && !objectiveValue(g, m, i).done).map((o) => o.label);
        app.speech.speak(`${m.title}. ${todo.join('. ')}.`, 1, true);
      });
      this.el.append(h('div', { class: 'tr-title' }, m.title, say));
      m.objectives.forEach((o, i) => {
        const v = objs[i]!;
        if (!objectiveLive(g, m, i) && !v.done) return;
        const count = v.target > 1 ? ` ${fmt(v.value)}/${fmt(v.target)}` : '';
        this.el.append(h('div', { class: `tr-obj ${v.done ? 'done' : ''}` }, v.done ? '✓ ' : '○ ', o.label, count));
      });
    }
    // compass arrow toward the marker (indoors: toward the person, or the door)
    const t = markerPos(g, m);
    if (!t) {
      this.arrow.style.display = 'none';
      return;
    }
    const pr = app.view.project(t.x, t.y, t.z);
    const W = window.innerWidth, H = window.innerHeight;
    // on screen only where it doesn't sit on the HUD or the touch buttons
    const inside = pr.visible && pr.x > 40 && pr.x < W - 40 && pr.y > 60 && pr.y < H - 60 && app.hudLayout.free(pr.x, pr.y - 45, 4);
    this.arrow.style.display = '';
    if (inside) {
      this.arrow.classList.add('onscreen');
      this.arrow.style.left = `${pr.x}px`;
      this.arrow.style.top = `${pr.y - 30}px`;
      this.arrow.style.transform = 'translate(-50%,-100%)';
    } else {
      this.arrow.classList.remove('onscreen');
      const cx = W / 2, cy = H / 2;
      let dx = pr.x - cx, dy = pr.y - cy;
      if (!pr.visible) {
        dx = -dx;
        dy = -dy;
      }
      const a = Math.atan2(dy, dx);
      // toward the edge, but pulled in until it's clear of the HUD
      let r = Math.min(W, H) * 0.42;
      while (r > 50 && !app.hudLayout.free(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 20)) r -= 8;
      this.arrow.style.left = `${cx + Math.cos(a) * r}px`;
      this.arrow.style.top = `${cy + Math.sin(a) * r * 0.9}px`;
      this.arrow.style.transform = `translate(-50%,-50%) rotate(${a + Math.PI / 2}rad)`;
    }
  }
}

// ---------------------------------------------------------------- quest log

export function questLogBody(g: Game, onTrack: () => void, onHelp?: () => void): HTMLElement {
  const body = h('div', { class: 'col', style: 'gap:10px' });
  const list = active(g);
  if (!list.length) body.append(h('div', { class: 'muted' }, g.state.quests.finished ? 'The story is complete! Enjoy island life.' : 'No active missions right now. Explore, chat with neighbors, or sleep until tomorrow!'));
  for (const m of list) {
    const tracked = g.state.quests.tracked === m.id;
    const card = h(
      'button',
      { class: `quest-card ${tracked ? 'tracked' : ''}`, 'data-nav': '' },
      h('div', { class: 'row' }, h('span', { class: 'tag' }, `Chapter ${m.chapter}`), h('b', null, m.title), tracked ? h('span', { class: 'tag', style: 'background:#e3f6f3' }, 'Tracking') : null),
      h('div', { class: 'muted tiny' }, m.summary),
      ...m.objectives.map((o, i) => {
        const v = objectiveValue(g, m, i);
        const live = objectiveLive(g, m, i);
        return h('div', { class: `tr-obj ${v.done ? 'done' : ''} ${live ? '' : 'later'}` }, v.done ? '✓ ' : '○ ', o.label, v.target > 1 ? ` (${fmt(v.value)}/${fmt(v.target)})` : '');
      }),
      m.hint ? h('div', { class: 'tiny muted' }, `Tip: ${m.hint}`) : null,
    );
    card.addEventListener('click', () => {
      g.state.quests.tracked = m.id;
      onTrack();
    });
    body.append(card);
  }
  const tm = trackedMission(g);
  if (tm && onHelp)
    body.append(
      h(
        'div',
        { class: 'help-row' },
        h('span', null, 'Stuck? '),
        btn('🙋 Ask Pemberly', () => {
          sendHint(g, tm, undefined, true);
          onHelp();
        }, 'small primary'),
      ),
    );
  const done = g.state.quests.done.length;
  body.append(h('div', { class: 'tiny muted' }, `${done} missions completed.`));
  return body;
}

export type { Panel };

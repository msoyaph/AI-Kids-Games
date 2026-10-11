import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { dialogue } from '../data/dialogue';
import { CHAPTER_NAMES, MISSIONS, MISSION_BY_ID } from '../data/missions';
import type { MissionDef } from '../data/missionTypes';
import { PART_BY_ID } from '../data/parts';
import { STICKER_BY_ID } from '../data/stickers';
import { drawToCanvas } from '../gfx/canvas';
import { drawGlyph } from '../gfx/art/glyphs';
import { showDialogue } from '../ui/dialogue';
import { clear, h } from '../ui/dom';
import { button, iconEl } from '../ui/widgets';
import { boardHooks } from './boardHooks';
import { portraitEl } from '../ui/portraits';
import { AcademyScene } from './AcademyScene';

type Tab = 'missions' | 'daily' | 'races';
type Status = 'done' | 'active' | 'new' | 'locked';

/** The mission board: every mission by chapter, plus daily challenges and races. */
export class BoardScene extends AcademyScene {
  private tab: Tab = 'missions';
  private list: HTMLElement;
  private detail: HTMLElement;
  private selected: string | null = null;
  private tabBtns = new Map<Tab, HTMLButtonElement>();

  constructor(params: Record<string, unknown> = {}) {
    super('board');
    this.music = 'hub';
    const tabs = h('div', { class: 'tabs board-tabs' });
    for (const [t, label, ic] of [['missions', 'Missions', 'flag'], ['daily', 'Daily', 'calendar'], ['races', 'Races', 'trophy']] as Array<[Tab, string, string]>) {
      const b = button(label, ic, () => this.setTab(t), { size: 'small', color: 'white', id: `tab-${t}`, sound: 'tab' });
      b.classList.add('tab', 'wide');
      this.tabBtns.set(t, b);
      tabs.append(b);
    }
    const header = h('div', { class: 'scr-header' }, button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }), h('div', { class: 'title' }, 'Mission Board'), h('div', { class: 'spacer' }), tabs);
    this.list = h('div', { class: 'panel board-list scroll', 'data-testid': 'mission-list' });
    this.detail = h('div', { class: 'panel board-detail' });
    this.ui.append(header, h('div', { class: 'board-main' }, this.list, this.detail));
    this.ui.classList.add('menu-screen');
    if (params.tab === 'daily' || params.tab === 'races') this.tab = params.tab;
  }

  override enter(): void {
    this.showRoom(this.stage.academy.poses.board);
    S.state.emit({ type: 'visit', place: 'board' });
    this.selected = S.state.data.activeMission ?? S.missions.available()[0]?.id ?? null;
    this.setTab(this.tab);
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  private setTab(t: Tab): void {
    this.tab = t;
    for (const [k, b] of this.tabBtns) b.classList.toggle('on', k === t);
    clear(this.list);
    clear(this.detail);
    if (t === 'daily') boardHooks.daily(this.list, this.detail);
    else if (t === 'races') boardHooks.races(this.list, this.detail);
    else this.renderMissions();
  }

  private status(m: MissionDef): Status {
    const p = S.missions.progress(m.id);
    if (p?.status === 'done') return 'done';
    if (p?.status === 'active') return 'active';
    if (S.missions.requirementsMet(m)) return 'new';
    return 'locked';
  }

  private renderMissions(): void {
    clear(this.list);
    const chapter = S.state.data.chapter;
    for (let ch = 1; ch <= chapter; ch++) {
      const ms = MISSIONS.filter((m) => m.chapter === ch);
      if (!ms.length) continue;
      this.list.append(h('div', { class: 'chapter-head' }, `Chapter ${ch}: ${CHAPTER_NAMES[ch]}`));
      for (const m of ms) {
        const st = this.status(m);
        const icon = drawToCanvas(52, 52, (c, w) => drawGlyph(c, m.glyph, w / 2, w / 2, w * 0.42, st === 'locked' ? '#6b5aa8' : undefined));
        const chip =
          st === 'done' ? h('span', { class: 'chip done' }, iconEl('check'), 'Done') :
          st === 'active' ? h('span', { class: 'chip active' }, iconEl('play'), m.id === S.state.data.activeMission ? 'Playing' : 'Started') :
          st === 'new' ? h('span', { class: 'chip new' }, iconEl('sparkle'), 'New!') :
          h('span', { class: 'chip locked' }, iconEl('lock'), 'Later');
        const row = h('button', { class: `mission-row ${this.selected === m.id ? 'sel' : ''} ${m.kind}`, type: 'button', 'data-testid': `mission-${m.id}` }, icon, h('div', { class: 'grow' }, h('div', { class: 'mr-title' }, m.title), h('div', { class: 'mr-kind' }, m.kind === 'main' ? 'Story mission' : 'Side mission')), chip);
        row.addEventListener('click', () => {
          sfx('select');
          this.selected = m.id;
          this.renderMissions();
        });
        this.list.append(row);
      }
    }
    this.renderDetail();
    this.list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }

  private renderDetail(): void {
    clear(this.detail);
    const m = this.selected ? MISSION_BY_ID[this.selected] : null;
    if (!m) {
      this.detail.append(h('div', { class: 'detail-text' }, 'Pick a mission from the list.'));
      return;
    }
    const st = this.status(m);
    const prog = S.missions.progress(m.id);
    const giver = CHAR_BY_ID[m.giver];
    const face = portraitEl(giver.id, 96);
    const objs = h('div', { class: 'obj-list' });
    m.objectives.forEach((o, i) => {
      const done = st === 'done' || (prog && i < prog.step);
      const now = st === 'active' && prog?.step === i;
      const need = o.count ?? 1;
      const count = now && need > 1 ? ` (${Math.floor(prog!.count)}/${need})` : '';
      objs.append(h('div', { class: `obj ${done ? 'done' : ''} ${now ? 'now' : ''}` }, iconEl(done ? 'check' : now ? 'play' : 'starEmpty'), `${o.text}${count}`));
    });
    const rewards = h('div', { class: 'rewards small' });
    if (m.rewards.coins) rewards.append(h('div', { class: 'reward' }, iconEl('coin'), `${m.rewards.coins}`));
    for (const p of m.rewards.parts ?? []) rewards.append(h('div', { class: 'reward' }, iconEl('wrench'), PART_BY_ID[p]?.name ?? p));
    for (const s of m.rewards.stickers ?? []) rewards.append(h('div', { class: 'reward' }, iconEl('sticker'), STICKER_BY_ID[s]?.name ?? s));
    const btns = h('div', { class: 'row' });
    btns.append(button('Hear it', 'speaker', () => void showDialogue(dialogue(m.briefing)), { color: 'white', size: 'small', id: 'btn-briefing' }));
    if (st === 'new') {
      btns.append(button('Start!', 'play', () => {
        S.missions.start(m.id, true);
        sfx('objective');
        this.renderMissions();
      }, { color: 'green', id: 'btn-start-mission', sound: null }));
    } else if (st === 'active') {
      const tracked = S.state.data.activeMission === m.id;
      btns.append(button(tracked ? 'Playing now' : 'Play this one', 'flag', () => {
        S.missions.track(m.id);
        this.renderMissions();
      }, { color: tracked ? 'white' : 'green', disabled: tracked, id: 'btn-track' }));
      if (tracked) btns.append(button('Go!', 'rocket', () => void S.game.go('hub'), { color: 'green', id: 'btn-board-go' }));
    } else if (st === 'locked') {
      const need = m.requires.find((r) => !S.missions.isDone(r));
      btns.append(h('div', { class: 'detail-text' }, need ? `First finish "${MISSION_BY_ID[need]?.title}".` : 'Coming soon!'));
    }
    this.detail.append(
      h('div', { class: 'row' }, face, h('div', { class: 'grow' }, h('div', { class: 'h2 det-title' }, m.title), h('div', { class: 'detail-text' }, m.summary))),
      objs,
      h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Rewards:'), rewards),
      btns,
    );
  }
}

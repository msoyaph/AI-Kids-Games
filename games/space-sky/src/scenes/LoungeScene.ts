import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { dialogue } from '../data/dialogue';
import { showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';
import { crewTalk } from './crew';
import { portraitEl } from '../ui/portraits';
import { AcademyScene } from './AcademyScene';

/** The crew lounge: chat with the crew for hints, stories and space facts. Your decorations live here. */
export class LoungeScene extends AcademyScene {
  private cast: string[];

  constructor() {
    super('lounge');
    this.music = 'hub';
    this.cast = ['stella', 'pip', 'rio', 'boltzy'];
    if (S.state.flag('zibboJoined')) this.cast.push('zibbo');
    const people = h('div', { class: 'crew-row' });
    for (const id of this.cast) {
      const ch = CHAR_BY_ID[id];
      const face = portraitEl(ch.id, 110);
      const b = h('button', { class: 'crew-btn', type: 'button', 'data-testid': `crew-${id}` }, face, h('span', null, ch.name));
      b.addEventListener('click', () => this.talk(id));
      people.append(b);
    }
    const header = h('div', { class: 'scr-header' }, button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }), h('div', { class: 'title' }, 'Crew Lounge'), h('div', { class: 'spacer' }), button('Shop', 'bag', () => void S.game.go('shop'), { color: 'white', id: 'btn-lounge-shop' }));
    this.ui.append(header, h('div', { class: 'lounge-tip' }, 'Tap a friend to talk!'), people);
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    this.stage.academy.setDecor(this.stage.decorStyles());
    this.showRoom(this.stage.academy.poses.lounge);
    S.state.emit({ type: 'visit', place: 'lounge' });
    if (!S.state.flag('loungeHello')) {
      S.state.setFlag('loungeHello');
      void showDialogue(dialogue('lounge_hello'));
    }
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  private talk(id: string): void {
    sfx('click');
    // Whoever is in the room waves back.
    const c = this.stage.cast.get(id);
    if (c && this.stage.academy.spots.crew[id]?.room === 'lounge') {
      c.setAnim('wave');
      setTimeout(() => c.setAnim('idle'), 1600);
    }
    // A mission might want you to talk to this person here.
    const needed = S.missions.active().some((m) => {
      const o = S.missions.objective(m.id);
      return o?.kind === 'talk' && o.npc === id && o.area === 'lounge';
    });
    S.state.addUnique(S.state.data.stats.talkedTo, id);
    if (needed) {
      S.state.emit({ type: 'talk', npc: id, area: 'lounge' });
      return;
    }
    void showDialogue(crewTalk(id));
  }
}

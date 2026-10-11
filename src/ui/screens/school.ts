import type { App } from '../../game/app';
import { LESSONS, findLesson, type LessonData, type LessonId, type LessonMedal } from '../../data/school';
import { formatTime } from '../../core/math';
import { button, h, type Screen } from '../ui';

const MEDAL_ICON: Record<LessonMedal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export function scoreText(l: LessonData, score: number): string {
  return l.scoring === 'time' ? formatTime(score) : `${Math.round(score)} pts`;
}

function goalText(l: LessonData): string {
  const m = l.medals;
  return l.scoring === 'time' ? `🥇 ${formatTime(m.gold)} · 🥈 ${formatTime(m.silver)} · 🥉 ${formatTime(m.bronze)}` : `🥇 ${m.gold} · 🥈 ${m.silver} · 🥉 ${m.bronze} points`;
}

/** The six lessons with their best medals. */
export function schoolScreen(app: App, start: (id: LessonId) => void): Screen {
  app.menu.setView('title');
  const s = app.save;
  const golds = LESSONS.filter((l) => s.school[l.id]?.medal === 'gold').length;
  const list = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(min(260px,44vw),1fr))' });
  for (const l of LESSONS) {
    const rec = s.school[l.id];
    list.appendChild(
      button(
        h(
          'div',
          { class: 'lesson-card' },
          h('div', { class: 'icon', 'aria-hidden': 'true' }, l.icon),
          h('div', null, h('div', { style: 'font-size:clamp(15px,2.6vh,20px)' }, l.name), h('div', { class: 'hint' }, rec ? `Best ${scoreText(l, rec.best)}` : 'Not tried yet')),
          h('div', { class: 'medal', 'aria-label': rec?.medal ? `${rec.medal} medal` : 'no medal' }, rec?.medal ? MEDAL_ICON[rec.medal] : '—'),
        ),
        () => start(l.id),
      ),
    );
  }
  const el = h(
    'div',
    { class: 'dim', style: 'gap:10px' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, '🎓 Driving School', h('span', { class: 'sub' }, `${golds}/${LESSONS.length} gold`)), h('div', { class: 'spacer' }), button('Back', () => app.screens.mainMenu(), 'small yellow')),
    h('div', { class: 'hint' }, 'Short lessons on the practice courses. Earn gold in all six to unlock the Learner kart!'),
    h('div', { class: 'scroll', style: 'flex:1;min-height:0' }, list),
  );
  return { el, onBack: () => app.screens.mainMenu() };
}

/** Skippable instructions before a lesson (Back = choose another lesson). */
export function lessonIntroScreen(_app: App, id: LessonId, go: () => void, back: () => void): Screen {
  const l = findLesson(id);
  const el = h(
    'div',
    { class: 'dim', style: 'gap:12px;justify-content:center;align-items:center' },
    h(
      'div',
      { class: 'panel menu-col', style: 'width:min(620px,92vw)' },
      h('div', { class: 'title-h' }, `${l.icon} ${l.name}`),
      h('ol', { class: 'lesson-steps' }, ...l.steps.map((t) => h('li', null, t))),
      h('div', { class: 'hint' }, goalText(l)),
      h('div', { class: 'menu-row', style: 'justify-content:center' }, button("Let's go! ▶", go, 'yellow'), button('Skip tips ⏭', go, 'small'), button('Back', back, 'small ghost')),
    ),
  );
  return { el, onBack: back, focus: el.querySelector('.yellow') as HTMLElement };
}

/** After a lesson: medal, score, and where to go next. */
export function lessonResultsScreen(_app: App, id: LessonId, score: number, medal: LessonMedal | null, newBest: boolean, retry: () => void, next: (() => void) | null, lessons: () => void): Screen {
  const l = findLesson(id);
  const text = medal ? `${MEDAL_ICON[medal]} ${medal.toUpperCase()} MEDAL!` : 'Keep practising!';
  const el = h(
    'div',
    { class: 'dim', style: 'gap:12px;justify-content:center;align-items:center' },
    h(
      'div',
      { class: 'panel menu-col', style: 'width:min(560px,92vw);text-align:center' },
      h('div', { class: 'title-h', style: 'justify-content:center' }, `${l.icon} ${l.name}`),
      h('div', { class: 'burst', style: `font-size:clamp(26px,5vh,42px);color:${medal === 'gold' ? '#ffd23f' : medal === 'silver' ? '#d9dee8' : medal === 'bronze' ? '#d98a5f' : '#fff'}` }, text),
      h('div', { style: 'font-size:clamp(18px,3vh,26px)' }, `${l.scoring === 'time' ? 'Time' : 'Score'}: ${scoreText(l, score)}${newBest ? ' — new best!' : ''}`),
      h('div', { class: 'hint' }, goalText(l)),
      h('div', { class: 'menu-row', style: 'justify-content:center' }, button('Retry ↻', retry, 'yellow'), next ? button('Next lesson ▶', next) : null, button('Lessons', lessons, 'ghost')),
    ),
  );
  return { el, onBack: lessons, focus: el.querySelector('.yellow') as HTMLElement };
}

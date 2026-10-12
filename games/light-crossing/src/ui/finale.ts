// Festival → credits → completion screen.
import type { App } from '../app';
import { fmt } from '../core/math';
import { VILLAGERS } from '../data/villagers';
import { hearts } from '../sim/villagers';
import { museumPercent } from '../sim/museum';
import { btn, h, type Panel } from './dom';
import { formatPlaytime } from './screens/slots';

export function runFinale(app: App): void {
  const g = app.game!;
  app.ui.closeAll();
  g.mode = 'cutscene';
  g.state.clock.minute = 20.5 * 60;
  app.hud.setVisible(false);
  app.view.startFestival();
  const caption = h('div', { class: 'cine-caption' }, 'The Lantern Crossing');
  document.getElementById('ui')!.appendChild(caption);
  setTimeout(() => (caption.textContent = 'Light by light, the lanterns drift out over the sea...'), 7000);
  setTimeout(() => (caption.textContent = '...and the old lighthouse shines once more, guiding them home.'), 15000);
  app.view.onFestivalEnd = () => {
    caption.remove();
    showCredits(app);
  };
}

export function showCredits(app: App): void {
  const g = app.game!;
  const lines = [
    ['Light Crossing', 'big'],
    ['A cozy island life', ''],
    ['', ''],
    ['Starring', 'head'],
    [g.state.player.name, ''],
    ['', ''],
    ['Lantern Hall', 'head'],
    ['Pemberly', ''],
    ['The Curled Leaf', 'head'],
    ['Fennimore', ''],
    ['The Museum', 'head'],
    ['Professor Vesper', ''],
    ['', ''],
    ['Neighbors', 'head'],
    ...VILLAGERS.map((v) => [v.name, '']),
    ['', ''],
    ['Every tree, wave, lantern and note', 'head'],
    ['was grown from code — no image or sound files were harmed.', ''],
    ['', ''],
    ['Built with three.js, the Web Audio API and TypeScript', ''],
    ['', ''],
    ['Thank you for playing!', 'big'],
  ];
  const roll = h('div', { class: 'credits-roll' }, ...lines.map(([t, c]) => h('div', { class: `cr ${c}` }, t || ' ')));
  const p: Panel = {
    modal: true,
    sticky: true,
    covers: true,
    el: h('div', { class: 'screen credits' }, roll),
    command(c) {
      if (c === 'confirm' || c === 'back' || c === 'pause') {
        app.ui.pop(p);
        showCompletion(app);
        return true;
      }
      return true;
    },
  };
  app.ui.push(p);
  setTimeout(() => {
    if (app.ui.has(p)) {
      app.ui.pop(p);
      showCompletion(app);
    }
  }, 30000);
}

export function showCompletion(app: App): void {
  const g = app.game!;
  g.state.quests.creditsSeen = true;
  app.view.stopFestival();
  const s = g.state;
  const friends = VILLAGERS.map((v) => {
    const st = s.villagers[v.id];
    const n = st ? hearts(st.friendship) : 0;
    return h('div', { class: 'cmp-friend' }, h('b', null, v.name), h('span', { class: 'hearts' }, '♥'.repeat(n) + '♡'.repeat(5 - n)));
  });
  const ach = Object.values(s.achievements).filter((t) => t > 0).length;
  const stat = (label: string, value: string) => h('div', { class: 'cmp-stat' }, h('div', { class: 'v' }, value), h('div', { class: 'l' }, label));
  const p: Panel = {
    modal: true,
    covers: true,
    el: h(
      'div',
      { class: 'screen completion' },
      h(
        'div',
        { class: 'panel', style: 'position:relative;padding:26px;width:min(720px,94vw);max-height:92vh;overflow:auto' },
        h('div', { class: 'logo', style: 'font-size:44px' }, 'Festival complete!'),
        h('p', { style: 'text-align:center;font-weight:700' }, `Driftlight Isle shines bright thanks to you, ${s.player.name}.`),
        h(
          'div',
          { class: 'cmp-grid' },
          stat('Playtime', formatPlaytime(s.playSeconds)),
          stat('Days on the island', String(s.clock.day)),
          stat('Museum', `${museumPercent(g)}%`),
          stat('Challenges done', fmt(s.challenges.completedTotal)),
          stat('Achievements', String(ach)),
          stat('Glints earned', fmt(s.stats.glintsEarned ?? 0)),
        ),
        h('h3', null, 'Friendships'),
        h('div', { class: 'cmp-friends' }, ...friends),
        h('p', { class: 'muted', style: 'text-align:center' }, 'The island is yours to enjoy. Keep fishing, decorating and befriending — there is always more to discover!'),
        h(
          'div',
          { class: 'row', style: 'justify-content:center' },
          btn('Keep playing', () => {
            app.ui.pop(p);
            g.mode = 'play';
            app.hud.setVisible(true);
            app.saveNow();
          }, 'primary'),
        ),
      ),
    ),
  };
  app.ui.push(p);
}

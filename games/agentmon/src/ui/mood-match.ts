/**
 * Mood Match: the no-timing way to befriend (Settings → Befriend game). The Agentmon shows a mood;
 * pick the kind thing that fits it. Three rounds; the rules are in core/befriend.ts.
 */
import { KIND_ACTIONS, MOOD_EMOJI, moodFill, type KindAction, type MoodFace } from '../core/befriend';
import type { Game } from '../game/game';
import { h, wait } from './dom';

const ACTION_LABEL: Record<KindAction, string> = { play: '🎈 Play', pet: '🤚 Pet gently', snack: '🍪 Share a snack', hum: '🎵 Hum softly' };
const MOOD_WORD: Record<MoodFace, string> = { playful: 'It looks playful!', sleepy: 'It looks sleepy.', hungry: 'It looks hungry.', shy: 'It looks a little shy.' };

export function playMoodMatch(game: Game, rounds: MoodFace[], need: number, snackOffered: boolean, name: string): Promise<number> {
  return new Promise(resolve => {
    let fill = 0;
    const face = h('div.mood-face', { 'aria-hidden': 'true' });
    const say = h('p.mood-say', { 'aria-live': 'polite' });
    const heart = h('div.mood-heart', { role: 'meter', 'aria-label': 'Friendship heart', 'aria-valuemin': 0, 'aria-valuemax': need });
    const buttons = h('div.mood-buttons');
    const el = h('div.menu-screen.mood', { role: 'dialog', 'aria-label': `Make friends with ${name}` }, h('div.panel.menu', {}, h('h2', {}, `Make friends with ${name}`), face, say, heart, buttons));
    const layer = { el: buttons, back: () => {} };
    game.app.ui.appendChild(el);
    game.focus.push(layer, false);
    const draw = () => { heart.style.setProperty('--fill', String(Math.min(1, fill / need))); heart.setAttribute('aria-valuenow', String(fill)); };
    draw();
    const round = async (i: number): Promise<void> => {
      if (i >= rounds.length || fill >= need) {
        game.focus.pop(layer);
        el.remove();
        resolve(fill);
        return;
      }
      const mood = rounds[i]!;
      face.textContent = MOOD_EMOJI[mood];
      say.textContent = `${MOOD_WORD[mood]} What would make it happy?`;
      buttons.replaceChildren(...KIND_ACTIONS.map((a, k) => h('button', { type: 'button', ...(k === 0 ? { 'data-autofocus': true } : {}), onclick: async () => {
        buttons.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true));
        const f = moodFill(mood, a, snackOffered);
        fill += f;
        draw();
        say.textContent = f >= 1 ? `${name} loves that! 💛` : f > 0 ? `${name} likes that a little.` : `${name} isn't sure about that.`;
        await wait(900);
        void round(i + 1);
      } }, ACTION_LABEL[a])));
      game.focus.focusFirst(buttons);
    };
    void round(0);
  });
}

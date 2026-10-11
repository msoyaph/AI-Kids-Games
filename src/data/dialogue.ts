import type { Line } from './dialogueTypes';

/**
 * All conversations. Short sentences for early readers. `{name}` is the player's name.
 * Mission briefings and story scenes live here too so they can be read aloud.
 */
export const DIALOGUE: Record<string, Line[]> = {
  moon_intro: [
    { who: 'sol', text: 'Welcome to Moon Base, {name}!' },
    { who: 'sol', text: 'Look up! That blue ball is Earth, your home.', mood: 'wow' },
  ],
  moon_sol: [
    { who: 'sol', text: 'Hello there! I keep Moon Base tidy.' },
    { who: 'sol', text: 'Moon rocks glow blue when you are close. Grab them!' },
  ],
};

export function dialogue(id: string): Line[] {
  return DIALOGUE[id] ?? [];
}

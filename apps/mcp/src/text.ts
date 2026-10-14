// Everything the app says to assistants and grown-ups. AI Kids Games is for children, but ChatGPT and
// Claude are for teens and adults (13+ / 18+), so the app speaks to parents and caregivers and never
// invites a child to use the assistant. Never another company's game title (tests/text.test.ts).
import { BRAND,REPO,siteUrl,type Site } from './config';

export const instructions = (site: Site) =>
  `${BRAND} (${site.host}) makes free, open-source browser games for kids, with no ads, purchases, accounts, chat or tracking. ` +
  'These tools help parents and caregivers find a game for their child by age, genre, device, time and mood, show it as a card, try it together here, ' +
  'and read the safety and privacy promises. Speak to the grown-up. Include the game\'s page link so the family can play and keep progress on the website.';

export const description = `Free, kid-safe browser games for families: find one by age, genre, device, time or mood, try it together, and read the safety promises. No ads, purchases, accounts, chat or tracking.`;

/** The last line of every text result, so assistants can cite and link the source. */
export const sourceLine = (site: Site) => `From ${BRAND}: free, ad-free games for kids. ${site.host}`;

export const tools = {
  find_games: {
    title: 'Find kid-safe games',
    description:
      `Find free, kid-safe browser games from ${BRAND} for a parent or caregiver to choose for their child. ` +
      'Filter by the child\'s age, genre, device, how many minutes they have, and mood; every filter is optional. ' +
      'Use it for requests like "my kid wants a racing game", "a quick puzzle for an 8-year-old", "kid-safe games with no ads" ' +
      'or "something calm for a 6-year-old on a tablet". Every game is free, with no ads, purchases, accounts, chat or tracking. ' +
      'Returns the matching games with ages, content notes and website links, shown as cards.',
    invoking: 'Finding kid-safe games…',
    invoked: 'Found games'
  },
  show_game: {
    title: 'Show a game',
    description:
      `Show one ${BRAND} game as a card for a parent: its cover, what it is, suggested ages, content notes and a safety and privacy summary, ` +
      'with buttons to play it on the website or try it together here. Use it after find_games, or when someone names one of these games.',
    invoking: 'Getting the game…',
    invoked: 'Here it is'
  },
  play_game: {
    title: 'Try a game together',
    description:
      `Open the player for one ${BRAND} game so a parent and child can try it together right here. It plays the exact game from the website. ` +
      'Bigger games open fullscreen. A few games play only on the website, and then the card links there instead. ' +
      'Progress made here may not be saved; playing on the website keeps it.',
    invoking: 'Opening the game…',
    invoked: 'Ready to play'
  },
  parent_info: {
    title: 'Safety and privacy for parents',
    description:
      `${BRAND}'s safety and privacy promises, plain and short: free, no ads or purchases, no accounts, chat or tracking, saves stay on the device, ` +
      'and every line of code is open source. Use it when a parent asks whether these games are safe, what data they collect, or who makes them.'
  }
} as const;

export const argText = {
  age: 'The child\'s age in years. Only games suggested for this age or younger are returned.',
  genre: 'The kind of game, e.g. Racing for "a racing game", Puzzle for "a puzzle", Farming, Cozy, Adventure, Learning.',
  device: 'What they will play on.',
  minutes: 'How many minutes they have, e.g. 10 for "a quick game". Returns games that work in one sitting of that length.',
  mood: 'How it should feel: calm or cozy to wind down, cheerful, exciting, brainy (thinking games), creative, or curious (exploring and learning).',
  game: 'The game\'s id from find_games, e.g. "tuck-pop".'
};

export interface ParentPromise { title: string; text: string }
export function parentInfo(site: Site) {
  const promises: ParentPromise[] = [
    { title: 'Free, with no ads or purchases',text: 'Every game is free. No advertising, in-game purchases, loot boxes or upsells.' },
    { title: 'No accounts, chat or tracking',text: 'No sign-ups, messages or online players, and no analytics or tracking of any kind.' },
    { title: 'Progress stays on your device',text: 'Saves live in the browser you play in. We never receive them.' },
    { title: 'Honest ages and content notes',text: 'Each game lists a suggested age and what to expect. Try a game together and decide what feels right.' },
    { title: 'Free and open source',text: 'Free and open source: see the code on GitHub.' },
    { title: 'In this assistant',text: 'The app receives only the choices you make here (age, genre, device, time, mood or a game), never your conversation.' }
  ];
  return { promises,links: { forParents: siteUrl(site,'/parents'),privacy: siteUrl(site,'/privacy'),github: REPO } };
}

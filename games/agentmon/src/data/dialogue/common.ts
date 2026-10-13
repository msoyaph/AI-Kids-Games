/** Script builders shared by every chapter: trainers, Rest Stops, shops, signs. */
import type { Cmd, Script } from '../../core/script';

/** A trainer you spar with by choice: a hello, a "want to spar?", and lines for after. */
export function trainerScript(id: string, who: string, hello: string, win: string, after: string): Script {
  return [
    { if: `beat:${id}`, then: [{ say: after, who }], else: [
      { ask: hello, who, yesText: 'Spar!', noText: 'Not now', yes: [
        { spar: id, win: [{ set: `beat:${id}` }, { say: win, who }], lose: [{ say: 'Good try! Your friends can nap at a Rest Stop, then try again.', who }] },
      ], no: [{ say: 'Okay! I will be right here.', who }] },
    ] },
  ];
}

export const restStop: Script = [
  { ask: 'Welcome to the Rest Stop! Would your friends like a nap in the cozy nest?', who: 'Rest Stop Helper', yesText: 'Yes, please', noText: 'No, thanks', yes: [
    { fade: 'out' }, { rest: true }, { sfx: 'rest' }, { wait: 0.6 }, { fade: 'in' },
    { say: 'All rested! Rest Stops are always free. Come back any time.', who: 'Rest Stop Helper' },
  ], no: [{ say: 'Come back any time!', who: 'Rest Stop Helper' }] },
];

export const shopScript = (shop: string, who = 'Shopkeeper'): Script => [
  { say: 'Hello! Snacks help you make friends. Berries help tired friends.', who },
  { shop },
  { say: 'Thanks for stopping by!', who },
];

export const say = (text: string, who?: string): Cmd => (who ? { say: text, who } : { say: text });

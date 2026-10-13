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

/**
 * A Trial Keeper at the top: hello lines once, then a spar for the Beacon. Winning relights it;
 * losing just means a rest by the warm Beacon and another try (nothing is ever lost).
 */
export function keeperScript(o: { trainer: string; who: string; beacon: string; hello: string[]; win: string[]; gift?: { item: string; n?: number; line: string }; quest?: number; after: string; then?: Cmd[]; rematch?: string }): Script {
  const rematch: Cmd[] = o.rematch ? [{ if: 'credits', then: [
    { ask: 'My team has grown stronger too. Want a rematch?', who: o.who, yesText: 'Rematch!', noText: 'Not now', yes: [
      { spar: o.rematch, win: [{ set: `beat:${o.rematch}` }, say('Wonderful! Come back any time for another.', o.who)], lose: [say('Good try! Let\'s rest by the Beacon.', o.who), { heal: true }] },
    ] },
  ] }] : [];
  return [
    { if: `beat:${o.trainer}`, then: [say(o.after, o.who), ...rematch], else: [
      { if: `hello:${o.trainer}`, then: [], else: [...o.hello.map(t => say(t, o.who)), { set: `hello:${o.trainer}` }] },
      { ask: 'Shall we spar for the Beacon?', who: o.who, yesText: 'Spar!', noText: 'Not yet', yes: [
        { spar: o.trainer, win: [
          { set: `beat:${o.trainer}` },
          say('What a spar! Feel that? The Beacon is waking up!', o.who),
          { set: o.beacon },
          { beacon: o.beacon },
          ...o.win.map(t => say(t, o.who)),
          ...(o.gift ? [say(o.gift.line, o.who), { give: o.gift.item, n: o.gift.n ?? 1 } as Cmd] : []),
          ...(o.quest !== undefined ? [{ quest: 'main', stage: o.quest } as Cmd] : []),
          ...(o.then ?? []),
        ], lose: [say('So close! Let\'s rest by the warm Beacon. Try again whenever you like.', o.who), { heal: true }] },
      ], no: [say('Take your time. I will be right here.', o.who)] },
    ] },
  ];
}

/** A story spar with Juno or the Spotlight Club: it happens once; win or lose, the story goes on. */
export function storySpar(o: { trainer: string; who: string; flag: string; before: string[]; win: string[]; lose: string[]; after?: Cmd[] }): Script {
  return [
    { if: o.flag, then: [], else: [
      ...o.before.map(t => say(t, o.who)),
      { spar: o.trainer,
        win: [{ set: `beat:${o.trainer}` }, ...o.win.map(t => say(t, o.who))],
        lose: [...o.lose.map(t => say(t, o.who)), say('Here, your friends can share my berries.', o.who), { heal: true }] },
      { set: o.flag },
      ...(o.after ?? []),
    ] },
  ];
}

/**
 * A small side quest: someone asks for help (the quest starts), gives a hint until `need` is true
 * (a flag expression; see storyFlags for item:, family:, guide: and beacons:), then thanks you,
 * takes what they asked for and gives a fixed reward. Afterwards they say `done`.
 */
export function sideQuest(o: { id: string; who: string; ask: string[]; need: string; hint: string; thanks: string[]; take?: [string, number]; reward: Cmd[]; done: string }): Script {
  return [
    { if: `${o.id}-done`, then: [say(o.done, o.who)], else: [
      { if: o.id, then: [
        { if: o.need, then: [
          ...(o.take ? [{ take: o.take[0], n: o.take[1] } as Cmd] : []),
          ...o.thanks.map(t => say(t, o.who)),
          ...o.reward,
          { set: `${o.id}-done` },
          { quest: o.id, stage: -1 },
        ], else: [say(o.hint, o.who)] },
      ], else: [...o.ask.map(t => say(t, o.who)), { set: o.id }, { quest: o.id, stage: 0 }] },
    ] },
  ];
}

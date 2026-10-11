// Conversation scripts: villagers (chat, gifts, requests, heart rewards) and island NPCs.
import { item } from '../data/registry';
import { NPC_BY_ID, VILLAGER_BY_ID } from '../data/villagers';
import type { DialogueTopic } from '../data/dialogue';
import type { App } from '../app';
import { endTalk, emote } from '../sim/agents';
import type { Game } from '../sim/game';
import { parseLine, topicLine, villagerCtx, type Line } from '../sim/talk';
import { acceptRequest, canFulfill, declineRequest, dueHeartRewards, fulfillRequest, giveGift, noteTalk, placeDescription, vstate } from '../sim/villagers';
import { DialogueBox, type Speaker } from './dialogue';
import { clothingThanks, outfitHash } from '../sim/wardrobe';
import { InventoryPanel } from './inventory';
import { TEXT_CPS } from '../settings';
import { phaseOf } from '../sim/clock';
import { fmt } from '../core/math';

export interface TalkOption {
  label: string;
  run: (box: DialogueBox) => Promise<void | 'end'>;
}

/** Story hooks: may run an intro scene (return true to end the talk) and add menu options. */
export interface TalkHooks {
  intro: (id: string, box: DialogueBox) => Promise<boolean>;
  options: (id: string) => TalkOption[];
}

export function speakerFor(id: string, playerName = ''): Speaker {
  const v = VILLAGER_BY_ID[id];
  if (v) return { id, name: v.name, look: v.look, voice: v.voice };
  const n = NPC_BY_ID[id];
  if (n) return { id, name: n.name, look: n.look, voice: n.voice, title: n.title };
  return { id, name: playerName || id, voice: 1 };
}

export function makeBox(app: App, id: string): DialogueBox {
  return new DialogueBox(app.ui, speakerFor(id, app.game?.state.player.name), () => TEXT_CPS[app.settings.textSpeed], (v) => app.audio.blip(v));
}

function pickItem(app: App, g: Game, title: string, filter: (id: string) => boolean): Promise<number | null> {
  return new Promise((res) => {
    let picked: number | null = null;
    const p = new InventoryPanel(app.ui, g, {
      title,
      filter: (s) => filter(s.id),
      onPick: (slot) => {
        picked = slot;
        return true;
      },
    });
    const close = p.onClose?.bind(p);
    p.onClose = () => {
      close?.();
      res(picked);
    };
    app.ui.push(p);
  });
}

export async function talkToVillager(app: App, g: Game, id: string): Promise<void> {
  const def = VILLAGER_BY_ID[id]!;
  const box = makeBox(app, id);
  const L = (topic: DialogueTopic, extra = {}) => topicLine(g, id, topic, extra);
  const v = vstate(g, id);
  const firstToday = noteTalk(g, id);
  try {
    const metToday = v.metDay === g.state.clock.day && firstToday;
    if (metToday && (g.state.stats[`talk_${id}`] ?? 0) <= 1) await box.say([L('movedIn')]);
    else {
      const ph = phaseOf(g.state.clock.minute);
      const greet: DialogueTopic = ph === 'morning' ? 'greetMorning' : ph === 'day' ? 'greetDay' : ph === 'evening' ? 'greetEvening' : 'greetNight';
      const lines: Line[] = [L(greet)];
      if (firstToday) {
        const w = g.state.weather.today;
        if (w === 'rain') lines.push(L('rain'));
        else if (w === 'rainbow') lines.push(L('rainbow'));
        else if (v.friendship >= 80) lines.push(L('friendHigh'));
        else if (v.friendship >= 40) lines.push(L('friendMid'));
        else lines.push(L(w === 'sunny' && g.state.clock.day % 2 === 0 ? 'sunny' : 'friendLow'));
      }
      await box.say(lines);
    }
    // they notice new clothes
    const look = outfitHash(g);
    if (look && look !== v.outfitSeen) {
      v.outfitSeen = look;
      emote(g, id, 'heart');
      await box.say([L('outfit')]);
    }
    // heart milestone rewards
    for (const r of dueHeartRewards(g, id)) {
      emote(g, id, 'heart');
      if (r.kind === 'recipe' && r.id) {
        await box.say([L('heartGift'), parseLine(`[happy]Here — I wrote down how to make a ${item(r.id.replace(/^r_/, '')).name}. It's yours!`)]);
        g.toast(`New recipe: ${item(r.id.replace(/^r_/, '')).name}!`, 'good', r.id.replace(/^r_/, ''));
      } else if (r.kind === 'item' && r.id) {
        await box.say([L('heartGift'), parseLine(`[love]Please take this ${item(r.id).name}. You're a wonderful friend, ${g.state.player.name}.`)]);
        g.toast(`Received ${item(r.id).name}!`, 'good', r.id);
      } else {
        await box.say([L('heartGift')]);
        g.toast(`Received ${r.amount} Lumens!`, 'good');
      }
    }
    if (await app.talkHooks.intro(id, box)) return;
    for (;;) {
      const opts: TalkOption[] = [
        {
          label: 'Chat',
          run: async (b) => {
            const pool: Line[] = [L('chat')];
            const r = (g.state.stats[`talk_${id}`] ?? 0) % 4;
            if (r === 1 && def.unique.length) pool[0] = parseLine(def.unique[g.state.clock.day % def.unique.length]!, villagerCtx(g, id));
            else if (r === 2 && g.state.museum.donated.length > 0) pool[0] = L('museum');
            else if (r === 3 && g.state.quests.chapter >= 5) pool[0] = L('festival');
            await b.say(pool);
          },
        },
        {
          label: 'Give a gift',
          run: async (b) => {
            box.close();
            const slot = await pickItem(app, g, `A gift for ${def.name}`, (iid) => !item(iid).key);
            box.open();
            if (slot === null) return;
            const iid = g.state.player.inv[slot]!.id;
            const r = giveGift(g, id, slot);
            if (!r) return;
            const topic: DialogueTopic = r === 'love' ? 'giftLove' : r === 'like' ? 'giftLike' : r === 'dislike' ? 'giftDislike' : 'giftNeutral';
            if (r === 'love' || r === 'like') emote(g, id, 'heart');
            await b.say([L(topic, { item: item(iid).name })]);
            // a loved gift is sometimes returned with clothes in their own style
            const cloth = r === 'love' ? clothingThanks(g, id) : null;
            if (cloth) {
              await b.say([parseLine(`[happy]You are so kind! This is for you: a ${item(cloth).name}. I think it will look great on you!`)]);
              g.toast(`Received ${item(cloth).name}! Use it from your pockets to wear it.`, 'good', cloth);
            }
          },
        },
      ];
      const req = v.request;
      if (req && !req.done) {
        const name = item(req.target).name;
        if (!req.accepted)
          opts.push({
            label: 'Need any help?',
            run: async (b) => {
              const topic: DialogueTopic = req.kind === 'deliver' ? 'requestDeliver' : req.kind === 'lost' ? 'requestLost' : 'requestCatch';
              const place = req.lostTile !== undefined ? placeDescription(g, req.lostTile) : 'somewhere';
              const i = await b.ask(L(topic, { item: name, qty: req.qty, place }), [`Sure! (reward ✦ ${fmt(req.reward)})`, 'Not right now']);
              if (i === 0) {
                acceptRequest(g, id);
                await b.say([parseLine('[happy]Thank you so much! ' + (req.kind === 'deliver' ? `${req.qty} × ${name}, whenever you can.` : req.kind === 'lost' ? `Look ${place}!` : `Any ${name} will do!`))]);
              } else {
                declineRequest(g, id);
                await b.say([L('requestDecline')]);
              }
            },
          });
        else if (canFulfill(g, id))
          opts.unshift({
            label: `Here's your ${name}!`,
            run: async (b) => {
              const rew = fulfillRequest(g, id);
              if (!rew) return;
              emote(g, id, 'heart');
              await b.say([L('requestThanks', { item: name })]);
              g.toast(`+${fmt(rew.glints)} Glints${rew.item ? ` and a ${item(rew.item).name}` : ''}!`, 'good', rew.item);
            },
          });
        else opts.push({ label: 'About your request…', run: async (b) => b.say([L('requestRemind', { item: name })]) });
      }
      opts.push(...app.talkHooks.options(id));
      opts.push({ label: 'Bye!', run: async (b) => (await b.say([L('bye')]), 'end') });
      const i = await box.ask(parseLine('[neutral]' + ['What\'s up?', 'Need something?', 'Hmm?'][g.state.clock.day % 3]!), opts.map((o) => o.label));
      const res = await opts[i]!.run(box);
      if (res === 'end') return;
    }
  } finally {
    box.close();
    endTalk(g, id);
  }
}

/** NPCs: Pemberly (story + hall services), Fennimore (shop), Vesper (museum). */
export async function talkToNpc(app: App, g: Game, id: string): Promise<void> {
  const box = makeBox(app, id);
  const P = (s: string) => parseLine(s, { player: g.state.player.name });
  try {
    if (await app.talkHooks.intro(id, box)) return;
    const greet: Record<string, string> = {
      pemberly: "[happy]Oh, hello {player}! Lovely day for a wander, isn't it?",
      fennimore: '[happy]Customer! My favorite kind of visitor. What can I do for you?',
      vesper: '[surprised]Ah! A fellow enthusiast of the old and the wiggly!',
      wanda: "[happy]Hello, hello! I'm Wanda. I fly from island to island with treasures!",
    };
    let prompt = P(greet[id] ?? '[neutral]Hello!');
    for (;;) {
      const base: TalkOption[] = [];
      if (id === 'pemberly') base.push({ label: 'Lantern Hall services', run: async () => (app.panels.hall?.(), 'end') });
      if (id === 'fennimore') base.push({ label: "Let's trade!", run: async () => (app.panels.shop?.(), 'end') });
      if (id === 'vesper') base.push({ label: 'Museum business', run: async () => (app.panels.museumDesk?.(), 'end') });
      if (id === 'wanda') base.push({ label: "Let's see your treasures!", run: async () => (app.panels.merchant?.(), 'end') });
      const opts = [...app.talkHooks.options(id), ...base, { label: 'Just saying hi!', run: async (b: DialogueBox) => (await b.say([P('[happy]Always nice to see you. Take care out there!')]), 'end' as const) }];
      const i = await box.ask(prompt, opts.map((o) => o.label));
      const res = await opts[i]!.run(box);
      if (res === 'end') return;
      // a delivery may have finished a mission and started a new one with a story scene
      if (await app.talkHooks.intro(id, box)) return;
      prompt = P('[happy]Anything else?');
    }
  } finally {
    box.close();
    endTalk(g, id);
  }
}

// Mellow villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const MELLOW: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[sleepy]Morning, {player}... I didn't go to bed yet. The stars were too pretty, {catch}.",
      "[sleepy]Is it morning already? The sun is always in such a hurry.",
      "[neutral]Hey. You get up so early! I like to sleep late. Then sleep some more.",
    ],
    greetDay: [
      "[neutral]Hey, {player}. No rush. I'm just enjoying the breeze, {catch}.",
      "[sleepy]Hi there... It's perfect nap weather. But every day is nap weather to me.",
      "[happy]Oh, hey. Come sit on the grass with me. There's lots of room.",
    ],
    greetEvening: [
      "[happy]Good evening, {player}. The first stars are waking up, {catch}.",
      "[neutral]Hey there. Evening is my favorite time. The day stops hurrying.",
      "[happy]The sun is going down nice and slow. Good job, sun.",
    ],
    greetNight: [
      "[happy]Oh, {player}. It's a perfect night to watch the stars. Want to join me, {catch}?",
      "[neutral]Hey, you're up late too! The sky is extra sparkly tonight.",
      "[sleepy]Nighttime... my favorite time. Look up. Just... look up.",
    ],
    chat: [
      "[sleepy]Here's a saying. Nap a little, smile a lot. I made it up, {catch}.",
      "[neutral]I saw {villager} rushing around today. Why hurry? It will all still be there later.",
      "[happy]A bright star sits right over the old lighthouse. I call it the Nightlight.",
      "[neutral]The river never rushes. But it still gets to the sea. Think about it, {catch}.",
      "[sleepy]There's a very comfy bench by Lantern Hall. I have tested it. Many, many times.",
      "[happy]I like slow, soft music. The kind that feels like a hammock.",
      "[neutral]Fennimore asked if I wanted to buy a clock. I said no. I wake up when I wake up.",
      "[sleepy]Sometimes I lie on the beach. I count the waves until I fall asleep, {catch}.",
      "[happy]{villager} brought me cocoa last night. Good neighbor. Good cocoa.",
      "[neutral]Stars are very old lights. They say hi from far away. Kind of sweet, right?",
    ],
    rain: [
      "[sleepy]Rain on the roof... It's the best sleepy song, {catch}.",
      "[neutral]No stars tonight, I guess. That's okay. They will wait for me.",
      "[happy]Rain day means nap day. That's the rule. Who made the rule? Me.",
    ],
    sunny: [
      "[sleepy]Sunshine and a hammock. That's my whole plan today, {catch}.",
      "[neutral]It's so bright today. I'll find a shady spot and think about nothing.",
      "[happy]A clear sky today means lots of stars tonight. Good deal.",
    ],
    rainbow: [
      "[surprised]Oh. A rainbow. Nice. Really nice, {catch}.",
      "[happy]Rainbows don't stay very long. That's what makes them special.",
      "[neutral]I'm just going to lie here and watch it fade. No rush.",
    ],
    friendLow: [
      "[neutral]Oh, hey. Are you new here? Cool. Very cool, {catch}.",
      "[sleepy]Hi. Sorry, I was half asleep. What's up?",
      "[neutral]Take it slow, new friend. The island will still be here tomorrow.",
    ],
    friendMid: [
      "[happy]{player}, I like hanging out with you. You're so easy to be around, {catch}.",
      "[happy]I saved you a spot on my star blanket. Bring snacks.",
      "[neutral]You're like a comfy pillow. From me, that's the best thing ever.",
    ],
    friendHigh: [
      "[love]You're my favorite star, {player}. Brighter than all the rest, {catch}.",
      "[love]Being with you is better than a nap. And I really, really like naps.",
      "[happy]I named a group of stars after you. It looks like a friend waving hi.",
    ],
    giftLove: [
      "[love]{item}... wow. This is perfect, {player}. Thank you, {catch}.",
      "[surprised]{item}? For me? Now I'm wide awake. Really awake!",
      "[love]{item}... I'll keep this forever. Maybe I'll nap right next to it.",
    ],
    giftLike: [
      "[happy]{item}. Cool. Thanks, {player}, {catch}.",
      "[happy]Oh, nice. {item}. That was kind of you.",
      "[happy]{item}, huh? I like it. It feels cozy.",
    ],
    giftNeutral: [
      "[neutral]{item}. Okay. Thanks, {catch}.",
      "[neutral]{item}... I'll find a spot for it. Someday. No rush.",
      "[sleepy]{item}. Neat. ...Oops, I yawned. It's not you, I promise.",
    ],
    giftDislike: [
      "[sad]{item}? That's a lot of... bounce. It's too fast for me, {catch}.",
      "[sad]Oh. {item}. Hmm. I'll think about it later. Much, much later.",
      "[surprised]{item}... Wow, that's too busy for me. But thanks for thinking of me.",
    ],
    requestDeliver: [
      "[neutral]Hey, {player}... could you bring me {qty} {item}? No rush, {catch}.",
      "[sleepy]I need {qty} {item}. But getting up is so hard. Can you help a friend?",
      "[neutral]When you have time... could you get {qty} {item}? Any time is fine. Really.",
    ],
    requestLost: [
      "[sleepy]I fell asleep {place}. When I woke up, my {item} was gone. Help me look, {catch}?",
      "[neutral]I lost my {item}. It's {place}, I think. Maybe you can help me find it.",
      "[sad]My {item} is missing. I last saw it {place}. Can you look for it?",
    ],
    requestCatch: [
      "[neutral]I keep thinking about the {item}. Could you catch one for me to see, {catch}?",
      "[sleepy]I would catch the {item} myself. But... naps. Could you do it?",
      "[happy]I heard the {item} is out today. Can you catch one and show me? I'll be right here. Not moving.",
    ],
    requestThanks: [
      "[love]Thanks, {player}. You're a real star. Here, this is for you, {catch}.",
      "[happy]Nice job. I knew you could do it. Slow and steady.",
      "[happy]Thank you, friend. This means a lot to me. Really.",
    ],
    requestDecline: [
      "[neutral]That's okay. No worries, {catch}.",
      "[sleepy]All right. I'll figure it out... tomorrow. Maybe.",
    ],
    requestRemind: [
      "[neutral]Hey... about that {item}. No rush. I'm just thinking out loud, {catch}.",
      "[sleepy]I'm still waiting for the {item}. I'm good at waiting. Very good.",
    ],
    movedIn: [
      "[sleepy]Hey... I just moved in. I took a nap before unpacking. Good nap, {catch}.",
      "[happy]Driftlight Isle has great skies. You can see every star out here.",
      "[neutral]Nice to meet you, {player}. I'm the slow one. You'll get used to me.",
    ],
    museum: [
      "[happy]The museum is nice and quiet. Professor Vesper lets me nap on the bench, {catch}.",
      "[neutral]Old fossils... they have waited a long, long time. I'm good at waiting too.",
      "[sleepy]Professor Vesper knows a lot about the night sky. We stay up too late talking about it.",
    ],
    festival: [
      "[happy]Lantern Crossing is coming soon. Lanterns on the sea, stars in the sky... so nice, {catch}.",
      "[love]The old lighthouse will glow again. I bet the stars will try to shine brighter.",
      "[sleepy]I'll watch from the beach as the lanterns float away. Every single one.",
    ],
    outfit: [
      "[sleepy]Mmm, new clothes? They look cozy, {catch}.",
      "[happy]That outfit looks nice. Like a calm night sky.",
      "[sleepy]You look comfy. Comfy enough for a nap, {player}?",
    ],
    heartGift: [
      "[love]Here, {player}. I made you something. It took a while. It was worth it, {catch}.",
      "[happy]This is for you. Because you're the best. That's it. That's the reason.",
    ],
    bye: [
      "[sleepy]See you, {player}. Have a slow, happy day, {catch}.",
      "[neutral]Bye for now. Don't rush.",
      "[happy]Bye. Look up tonight. The stars will be there.",
    ],
  };

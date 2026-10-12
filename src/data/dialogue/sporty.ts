// Sporty villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const SPORTY: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[happy]Morning, {player}! I already ran the whole beach! Twice! Your turn, {catch}!",
      "[happy]Rise and shine! Arms up high! Higher! Now wiggle! See? You're awake now!",
      "[smug]Up early, huh? Nice! Want to race me to the dock?",
    ],
    greetDay: [
      "[happy]Hey hey, {player}! It's a great day for jumping jacks, {catch}!",
      "[happy]Hi! I'm on lap twelve around the plaza. Or nine. Counting is not my sport!",
      "[happy]There's my favorite running buddy! Keep moving, keep smiling!",
    ],
    greetEvening: [
      "[happy]Evening, {player}! Time to cool down. Deep breath in... and out... Feels great, {catch}!",
      "[neutral]Phew! What a long day of running. Stretching is the secret. Never skip it!",
      "[happy]A sunset jog with a friend? That's the best kind of jog!",
    ],
    greetNight: [
      "[sleepy]Whoa, it's late! Your muscles grow while you sleep, {player}! Rest up, {catch}!",
      "[surprised]Running at night? Wow, that's brave! Just don't get too tired, okay?",
      "[sleepy]Bedtime stretches... touch your toes... yawn... touch your toes... yawn... Do yawns count as exercise?",
    ],
    chat: [
      "[happy]I asked {villager} to race me. They walked the whole way. I still call it a win, {catch}!",
      "[happy]Swinging a bug net makes your arms strong! Catching bugs is like going to the gym.",
      "[smug]I did fifty push-ups this morning. Okay, fifteen. But fifty is the dream!",
      "[happy]Pemberly says I should try resting. Is that a sport? How do I win it?",
      "[happy]If you lose, just try again! Next time could be your win, {catch}!",
      "[neutral]Water check! Did you drink any water today? Go on, I'll wait.",
      "[surprised]Have you climbed the path to the old lighthouse? It's so good for your legs!",
      "[happy]{villager} and I are training to swim around the dock. Well, I swim. They cheer!",
      "[love]The best part of a race isn't winning. It's high fives with everyone at the end, {catch}!",
      "[smug]I asked Fennimore if new sneakers make you faster. He said they only work if you run in them. Good point!",
    ],
    rain: [
      "[happy]A run in the rain! It's like a free shower while you run, {catch}!",
      "[neutral]It's slippery out there. A good day to stretch inside. And eat snacks. Mostly snacks!",
      "[happy]Puddle jumps! They're good for your heart AND super fun!",
    ],
    sunny: [
      "[happy]Sunshine! The beach is calling me. I'm on my way, {catch}!",
      "[happy]A great day to break a record! Which one? All of them!",
      "[neutral]Sunscreen, water, stretch. That's my sunny day plan. Say it with me!",
    ],
    rainbow: [
      "[surprised]A rainbow! I'm going to run to the end of it, {catch}!",
      "[happy]A rainbow is like a finish line in the sky. Everybody wins today!",
      "[surprised]Whoa! Look at all those colors! It's like the sky is cheering!",
    ],
    friendLow: [
      "[happy]Hey! A new face! Want to race? No? Maybe later, {catch}!",
      "[neutral]You look like you need a good stretch. Don't worry! Everybody does!",
      "[happy]Nice to meet you! I run on the beach every morning. Come run with me sometime!",
    ],
    friendMid: [
      "[happy]{player}! My running buddy! You're getting faster, I can tell, {catch}!",
      "[happy]I saved you a spot in tomorrow's morning jog. We'll go slow, I promise. Well, kind of slow.",
      "[smug]You and me? We make a great team. No one can stop us!",
    ],
    friendHigh: [
      "[love]You're my number one teammate, {player}. Always and forever. Go team, {catch}!",
      "[love]When I'm tired, I think of you cheering for me. Then I can run one more lap!",
      "[happy]Best friends finish every race together. Even if one of us has to walk!",
    ],
    giftLove: [
      "[love]{item}?! No way, {player}! This gift wins a gold medal, {catch}!",
      "[surprised]{item}! You really know me! I'm going to run a happy lap right now!",
      "[love]I love {item} SO much! You're the best, really!",
    ],
    giftLike: [
      "[happy]{item}! Thanks a bunch, {player}! You're a champ, {catch}!",
      "[happy]Nice! {item}! That's a great pick!",
      "[happy]Ooh, {item}! I'll keep it right next to my jump rope.",
    ],
    giftNeutral: [
      "[neutral]{item}? Cool, cool. Thanks, {player}!",
      "[neutral]Huh, {item}. Maybe I can use it to practice my balance? Thanks, {catch}!",
      "[neutral]Thanks for the {item}! It's not really my thing. But every gift is a win!",
    ],
    giftDislike: [
      "[sad]Oh. {item}. It's... not really me. But thanks for trying, {catch}.",
      "[surprised]{item}?! Yikes, that's way too fancy for me. I live in running shorts!",
      "[sad]I don't really like {item}, to be honest. But thanks for thinking of me!",
    ],
    requestDeliver: [
      "[happy]{player}! Quick mission! I need {qty} {item}! Ready, set... {catch}!",
      "[neutral]I need {qty} {item} for my training. Can you help me? Then we can race!",
      "[happy]Team challenge! Bring me {qty} {item}, and we both win!",
    ],
    requestLost: [
      "[sad]Oh no! I lost my {item} while jogging {place}! Can you help me find it, {catch}?",
      "[surprised]My {item} bounced right out of my pocket {place}! Want to make the search a race?",
      "[sad]I can't find my {item} anywhere. I think I left it {place} while I stretched.",
    ],
    requestCatch: [
      "[happy]I bet you can catch the {item}! Show me when you do. I'll cheer for you, {catch}!",
      "[smug]It takes real skill to catch the {item}. Do you think you can do it? Show me!",
      "[happy]I've never seen the {item}! Catch one and bring it here. I'll time you!",
    ],
    requestThanks: [
      "[love]You did it! You win a gold medal! Here's your prize, {catch}!",
      "[happy]High five! Thanks, {player}! You're a real teammate!",
      "[happy]That was so fast! Okay, I wasn't timing you. But it FELT fast! Thank you!",
    ],
    requestDecline: [
      "[neutral]No problem! A rest day, I get it. Rest is important too, {catch}.",
      "[happy]All good! I'll do it myself. Extra exercise for me!",
    ],
    requestRemind: [
      "[neutral]Hey, {player}! I still need that {item}! You can do it, {catch}!",
      "[neutral]How's the hunt for the {item} going? Keep going! I believe in you!",
    ],
    movedIn: [
      "[happy]Hey hey! I just moved in! Driftlight Isle is great. I already found the best running path, {catch}!",
      "[happy]New island, new records to break! Nice to meet you, {player}!",
      "[surprised]Sand to run on! A river to swim in! Cliffs to climb! This island is one big gym!",
    ],
    museum: [
      "[happy]I zoomed through the whole museum in four minutes! Professor Vesper did NOT like that, {catch}.",
      "[surprised]Have you seen the big fish in the museum? They must be super strong swimmers!",
      "[happy]Giving to the museum scores a point for our team! Let's fill it up!",
    ],
    festival: [
      "[happy]Lantern Crossing is coming! I'll carry the biggest lantern to the beach, {catch}!",
      "[love]Lanterns floating out to sea... It's like a slow race where everybody wins.",
      "[surprised]They're lighting the lighthouse again! I'll stand on the cliff and cheer SO loud!",
    ],
    outfit: [
      "[happy]New clothes! You look ready to run a race, {catch}!",
      "[surprised]Whoa, cool outfit! Let's jog to the beach and show it off!",
      "[happy]Looking good, {player}! Comfy clothes make fast feet!",
    ],
    heartGift: [
      "[love]Here, {player}! A trophy for my best teammate! Well, it's a present. Same thing, {catch}!",
      "[happy]You always cheer me on. This one's for you!",
    ],
    bye: [
      "[happy]See you later, {player}! Keep moving, {catch}!",
      "[happy]Bye! Remember to stretch!",
      "[smug]See you! Race you tomorrow. I'm already warming up!",
    ],
  };

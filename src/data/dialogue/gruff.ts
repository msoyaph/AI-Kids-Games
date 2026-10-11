// Gruff villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const GRUFF: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[neutral]Morning. The leaves are still wet. It's the best time to water, {catch}.",
      "[smug]You're up early. Good. The sun doesn't wait for anybody.",
      "[neutral]Mm. Morning, {player}. Don't step on my baby plants.",
    ],
    greetDay: [
      "[neutral]{player}. It's a hot day. Drink some water, {catch}.",
      "[neutral]Afternoon. Want to help me pull weeds? There are lots.",
      "[smug]Oh, it's you. Okay. You can stay. I don't mind.",
    ],
    greetEvening: [
      "[neutral]Evening. The dirt is cooling off. Roots like that, {catch}.",
      "[neutral]Long day? Mm. Me too. You can sit with me. If you want.",
      "[smug]Evening, {player}. I hope you didn't step on any flowers today.",
    ],
    greetNight: [
      "[sleepy]It's late, {player}. Go home and get some rest, {catch}.",
      "[surprised]You're out late! ...Okay. Be careful in the dark.",
      "[neutral]At night, the worms do the work. They work the hardest. Let them dig.",
    ],
    chat: [
      "[neutral]Plant a seed, then wait. Water it, then wait some more. Gardens are mostly waiting, {catch}.",
      "[sad]Somebody stepped on my tulips. Was it {villager}? I'm not mad. Just a little sad.",
      "[neutral]Pemberly brought me tea yesterday. I didn't ask for it. I drank it anyway. ...It was really good.",
      "[smug]Fennimore tried to sell me a gold watering can. Why? A watering can just holds water!",
      "[neutral]Flowers don't care who you are. Be kind to them, and they will bloom.",
      "[sad]The wind broke my baby tree last week. So I planted three more, {catch}.",
      "[happy]I saw {villager} talking to a butterfly. I said hi to it too. Don't tell.",
      "[smug]A little dirt on you means you worked hard today. Be proud of that.",
      "[neutral]Here's a tip. Don't give plants too much water. Roots need air too, {catch}.",
      "[love]...Don't tell anyone. I hum songs to my baby plants. Only when nobody is around.",
    ],
    rain: [
      "[happy]Rain. Good. Now I don't have to carry water all day, {catch}.",
      "[neutral]Don't stand under the trees. The drips get you two times! I know. I tried it.",
      "[smug]Everybody hides from the rain. Not me. My garden is thirsty, so I stay out.",
    ],
    sunny: [
      "[neutral]No clouds today. Good for the flowers. Bad for my nose. It gets sunburned, {catch}.",
      "[neutral]The sun is out. Wear a hat. ...I'm not worried about you. Not much.",
      "[happy]On bright days, the sprouts stretch up tall. I can almost hear them.",
    ],
    rainbow: [
      "[surprised]Hm. A rainbow. ...Okay. It's pretty. Very pretty, {catch}.",
      "[neutral]A rainbow means the rain is done. The sun is back. My garden got both today.",
      "[love]My grandma said rainbows are flowers the sky planted. ...Silly. But I like it.",
    ],
    friendLow: [
      "[neutral]What do you need? ...Oh. You came to say hi. Hm. Hi, {catch}.",
      "[neutral]You're new here. Please stay off my flower beds. Then we'll get along fine.",
      "[neutral]I'm not a big talker. Learn a bit about plants. Then we can talk more.",
    ],
    friendMid: [
      "[neutral]You again. ...That's not a bad thing, {catch}.",
      "[smug]I saw you water flowers the other day. Not bad. Keep practicing.",
      "[neutral]I saved you a spot by the garden fence. It's just a spot. Okay?",
    ],
    friendHigh: [
      "[love]You're okay, {player}. More than okay. ...I'm only saying that once, {catch}.",
      "[happy]I named a row of flowers after you. They grow strong. They never give up. Like you.",
      "[neutral]If you ever need help, come find me. I mean it. Day or night.",
    ],
    giftLove: [
      "[surprised]...{item}? For me? Hm. This is... really good, {player}. Thank you, {catch}.",
      "[love]{item}. You really listen to me. ...I'll keep this by my window.",
      "[happy]Now THIS is a great gift. {item}. Simple. Useful. Perfect.",
    ],
    giftLike: [
      "[neutral]{item}. Hm. Useful. Thanks, {catch}.",
      "[happy]Not bad, {player}. Not bad at all. I'll take good care of this {item}.",
      "[neutral]You didn't have to. ...But I'm glad you did. Thanks for the {item}.",
    ],
    giftNeutral: [
      "[neutral]{item}. Okay. ...Thank you, {catch}.",
      "[neutral]Huh. {item}. I'll find a place to put it. Maybe the shed.",
      "[neutral]I didn't expect {item}. I don't really need it. But thanks.",
    ],
    giftDislike: [
      "[surprised]{item}? It's too shiny for me. What do I do with this, {catch}?",
      "[sad]...{item}. Hm. I can use it to hold my shed door open.",
      "[neutral]This isn't really my kind of thing. ...Okay. Thanks for the {item} anyway.",
    ],
    requestDeliver: [
      "[neutral]{player}. I need {qty} {item} for a garden job. Can you help, {catch}?",
      "[neutral]I need {qty} {item}. I don't ask for help much. Can you bring them?",
      "[smug]I have a job for you. Bring me {qty} {item}. You'll get a good reward.",
    ],
    requestLost: [
      "[sad]I lost my {item}. It's {place}, I think. ...Can you look? My eyes aren't so sharp now.",
      "[sad]I dropped my {item} {place}. I've had it for years. ...Not that I care. Okay, I care, {catch}.",
      "[neutral]My {item} is lost. I last had it {place}. Can you look for it?",
    ],
    requestCatch: [
      "[neutral]I've never seen the {item} up close. Catch one and show me, {catch}.",
      "[smug]I bet you can't catch the {item}. ...Go on. Show me you can. Bring it here.",
      "[neutral]I want to see the {item}. No reason. I'm just curious. Catch one for me?",
    ],
    requestThanks: [
      "[happy]Good work. Really good. Here, take this. Thanks, {player}, {catch}.",
      "[neutral]You did it. I won't forget that.",
      "[love]That's... that's a big help. You're a good friend, {player}. Don't brag about it, now.",
    ],
    requestDecline: [
      "[neutral]Okay. You're busy. I get it. I'll be fine, {catch}.",
      "[neutral]No? Okay. I'm not upset. I have lots of other work to do.",
    ],
    requestRemind: [
      "[neutral]Still waiting for that {item}. I'm not in a hurry. ...Well, maybe a little, {catch}.",
      "[neutral]You didn't forget about the {item}, did you? Just checking.",
    ],
    movedIn: [
      "[neutral]So. You came to say welcome. ...My name is on the mailbox. The dirt here is good, {catch}.",
      "[smug]I moved in yesterday. I found three good garden spots already. You're standing on one.",
      "[neutral]Driftlight Isle, huh. Salty air. Sandy dirt. Plants have it hard here. Good. I like a challenge.",
    ],
    museum: [
      "[neutral]I went to the museum. Professor Vesper talked about one rock for an hour. ...It was a good rock, {catch}.",
      "[smug]Fossils are like roots. They're deep and very old. Keep digging. You'll find some.",
      "[neutral]The bug room makes me shiver. ...Don't laugh. The fish tanks are nice, though.",
    ],
    festival: [
      "[neutral]The Lantern Crossing is coming soon. ...I'm growing flowers for the path to the beach, {catch}.",
      "[sad]The lighthouse on the cliff is dark. It's been dark for years. ...It would be nice to see it shine.",
      "[happy]Lanterns on the water. A light on the cliff. ...Okay. I'm a little excited. Keep it a secret.",
    ],
    outfit: [
      "[neutral]Hrmph. New clothes? ...They look good. Don't tell anyone I said that.",
      "[smug]That outfit looks tough. Good for gardening, {catch}.",
      "[neutral]You changed your clothes. I noticed. I notice things.",
    ],
    heartGift: [
      "[neutral]Here. I made this for you. It's no big deal, {catch}.",
      "[love]You've been a good friend, {player}. Take this. ...You earned it.",
    ],
    bye: [
      "[neutral]See you. Watch where you step, {catch}.",
      "[neutral]Okay. Off you go. Bye.",
      "[happy]Bye, {player}. ...Come visit tomorrow. If you want.",
    ],
  };

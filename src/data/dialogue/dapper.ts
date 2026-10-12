// Dapper villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const DAPPER: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[smug]Good morning, {player}. I had two cups of tea. I shined my shoes too, {catch}.",
      "[happy]Ah, morning! The light is so pretty now. It looks best on me, of course.",
      "[neutral]Good morning. A fine day starts with fine clothes. Yours are... very bright!",
    ],
    greetDay: [
      "[happy]Good afternoon, {player}! Shall we have some tea? Please say yes, {catch}.",
      "[smug]Ah, there you are. I was looking at myself in The Curled Leaf's window. I do look nice.",
      "[happy]Splendid! You came just in time. I wanted a fun friend to talk to.",
    ],
    greetEvening: [
      "[happy]Good evening, {player}. The sunset matches my scarf. How lovely, {catch}.",
      "[neutral]Ah, evening. It is time for warm tea and quiet thoughts.",
      "[smug]Evening! You look very fine in this light. Almost as fine as me!",
    ],
    greetNight: [
      "[sleepy]Goodness, {player}, it is very late. Even fancy folks need sleep, {catch}.",
      "[surprised]Out so late? How brave! How... yawn... Oh, excuse me.",
      "[neutral]Ah, a walk under the moon. The stars look like shiny jewels.",
    ],
    chat: [
      "[smug]Fennimore got a new hat at the shop. I bought it right away, {catch}.",
      "[happy]Good tea takes time to make. It tastes best with friends. And in matching cups!",
      "[neutral]I told {villager} I liked their outfit. They looked so surprised! I only say it when I mean it.",
      "[smug]Always keep a hanky in your pocket. It is good for sniffles. And for fancy waving!",
      "[happy]I am learning to play the piano. My left hand is great. My right hand is still learning, {catch}.",
      "[surprised]Did you see {villager} wear stripes with spots? How bold! How brave!",
      "[happy]Pemberly has the best teacups. I have said so three times this week!",
      "[smug]I dress up every single day, {player}. You never know who you will meet, {catch}!",
      "[happy]Music is a fine friend. But you are a fine friend too, of course!",
      "[sad]I spilled tea on my best vest. Now I must wear my second-best vest. Oh, dear.",
    ],
    rain: [
      "[angry]Rain! And my best umbrella is still wet from yesterday. How rude, {catch}!",
      "[happy]Ah, rain. A good day for a pot of tea. I like to watch the rain from my window.",
      "[neutral]A little rain is nice. A big storm is not so nice.",
    ],
    sunny: [
      "[happy]What lovely sunshine! Time for my big sun hat, {catch}.",
      "[smug]On sunny days, I have my tea outside. The birds sing just for me.",
      "[happy]The sun is so bright today! The sun and I both like to shine.",
    ],
    rainbow: [
      "[surprised]A rainbow! Seven colors that all go together. So well dressed, {catch}!",
      "[love]Ah, the sky looks so lovely! Bravo! Do it again!",
      "[smug]I always say purple is the best color. The rainbow must agree with me!",
    ],
    friendLow: [
      "[neutral]Ah. I don't think we have met. So nice to meet you, {catch}.",
      "[smug]You may visit me any time. Please knock first. And maybe bring cookies.",
      "[neutral]Good day to you. I know a lot about fine things. All fine things, really.",
    ],
    friendMid: [
      "[happy]{player}! I like you more and more each day, {catch}.",
      "[happy]I saved a teacup just for you. It has a tiny gold edge!",
      "[smug]Our chats are the best part of my day. Don't tell my piano!",
    ],
    friendHigh: [
      "[love]{player}, my dear friend. You make this island shine more than a pearl, {catch}.",
      "[love]Our friendship is like my best hat. I will keep it forever.",
      "[happy]I would lend you my best scarf. I do not lend it to just anyone!",
    ],
    giftLove: [
      "[love]{item}! How lovely! You picked the perfect gift, {player}, {catch}!",
      "[surprised]Oh! {item}! I am so happy I might faint! Quick, find me a chair!",
      "[love]{item}... It is perfect. I might cry happy tears. Pass me my hanky, please.",
    ],
    giftLike: [
      "[happy]{item}! How fancy. Thank you, {player}, {catch}.",
      "[happy]Ah, {item}. A fine choice. I will put it where all can see it.",
      "[smug]{item}? You know me so well. I like it!",
    ],
    giftNeutral: [
      "[neutral]{item}. Thank you kindly. I will find a spot for it.",
      "[neutral]Ah, {item}. It is not quite my style. But it was kind of you, {catch}.",
      "[neutral]{item}. Hmm. Maybe it will look nicer in a different light.",
    ],
    giftDislike: [
      "[angry]{item}?! It is so plain! It does not go with my fancy things, {catch}.",
      "[sad]Oh dear. {item}. I will take it, of course. Good manners matter.",
      "[surprised]{item}! Oh my. That is not what I would pick. But thank you.",
    ],
    requestDeliver: [
      "[neutral]{player}, may I ask a favor? I need {qty} {item}. It is for a fancy party, {catch}.",
      "[smug]I am making a new outfit. I need {qty} {item}. Will you help me, please?",
      "[happy]Could you bring me {qty} {item}? I will give you a nice reward, of course.",
    ],
    requestLost: [
      "[sad]Oh no! I lost my {item} {place}. Would you please look for it, {catch}?",
      "[surprised]My {item} is gone! I last saw it {place}. Oh, dear me!",
      "[sad]I was doing a fancy pose {place}. My {item} slipped away! Will you help me find it?",
    ],
    requestCatch: [
      "[smug]I am having a little party. I want to show off the {item}. Will you catch one, {catch}?",
      "[happy]I hear the {item} is very pretty. Will you catch one for me to see?",
      "[neutral]The {item}. I have only seen it in paintings. Can you catch one and show me?",
    ],
    requestThanks: [
      "[love]Splendid! You did it, {player}. Here is a little thank-you gift, {catch}.",
      "[happy]Bravo! You did so well! I am clapping for you!",
      "[happy]Thank you so much. You are a true friend. And a stylish one, too!",
    ],
    requestDecline: [
      "[neutral]Ah, that is too bad. But I understand. You are busy, {catch}.",
      "[sad]That's all right. I will do it all by myself. Sigh...",
    ],
    requestRemind: [
      "[neutral]Oh, {player}? Don't forget the {item}. I can hardly wait, {catch}.",
      "[smug]Any news about the {item}? I already made a special spot for it.",
    ],
    movedIn: [
      "[smug]Hello! I am here at last. Now this island is fancy, {catch}.",
      "[happy]Driftlight Isle! What a fine little place. My teacups are all set out.",
      "[neutral]So nice to meet you, {player}. Where can I find good tea around here?",
    ],
    museum: [
      "[happy]Professor Vesper runs the museum so well. Even the lights look nice, {catch}.",
      "[surprised]Have you seen the fossils in the museum? So old and so grand! I love them.",
      "[smug]Every piece in the museum has a story. Just like me!",
    ],
    festival: [
      "[happy]The Lantern Crossing! I picked my outfit weeks ago. Weeks, {catch}!",
      "[love]Lanterns on the sea. The lighthouse all lit up. It will be the fanciest night of the year!",
      "[smug]I will bow as I let my lantern go. I have practiced in my mirror.",
    ],
    outfit: [
      "[smug]Ah, a fine new outfit! Very stylish, {catch}.",
      "[happy]You dress with real style. Bravo!",
      "[surprised]Oh my! Those clothes look perfect on you, {player}.",
    ],
    heartGift: [
      "[love]For you, my dear friend. A gift as fine as our friendship, {catch}.",
      "[happy]Please take this. I picked it out myself, with great care.",
    ],
    bye: [
      "[happy]Farewell, {player}! Keep looking fine, {catch}.",
      "[smug]Until we meet again! And now... I take a bow.",
      "[neutral]Good day. Stand up nice and tall!",
    ],
  };

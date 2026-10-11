// Bookish villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const BOOKISH: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[happy]Good morning, {player}! Mornings are the best time to read. I checked, {catch}.",
      "[neutral]Good morning! I tried to count the dew on the grass. There is a lot of it.",
      "[surprised]Oh! Is it morning already? I read all night long again!",
    ],
    greetDay: [
      "[happy]Hello, {player}! I'm reading about tides. That's how the sea moves in and out. I love it, {catch}.",
      "[neutral]Hello there! Sorry about the ink on my face. I've been drawing cloud shapes.",
      "[happy]Oh, {player}! Just the friend I hoped to see. I have a fact for you. No, wait. Lots of facts!",
    ],
    greetEvening: [
      "[happy]Good evening! The light is so soft now. It's just right for reading, {catch}.",
      "[neutral]Ah, evening. See the first bright 'star' in the sky? It's often a planet! How sneaky.",
      "[happy]Good evening, {player}. I hope you found something new today.",
    ],
    greetNight: [
      "[sleepy]Oh, hello... is it night now? I forget the time when my book is good, {catch}.",
      "[surprised]{player}! Out so late? I thought only owls and book lovers were up now!",
      "[sleepy]Mm, hello. I'm trying to read by moonlight. So far, I just squint a lot.",
    ],
    chat: [
      "[surprised]Did you know an octopus has three hearts? That's two more than me, {catch}!",
      "[happy]I keep three notebooks. One for facts, one for questions... and one I lost!",
      "[neutral]I asked {villager} for their favorite book. They said it was the one with the boat. I have more questions.",
      "[happy]Professor Vesper lent me a book about deep-sea animals. I read it two times. No, three, {catch}!",
      "[smug]Each lighthouse blinks in its own way. That's how sailors tell them apart. It's like a name made of light!",
      "[neutral]Pemberly keeps notes about the island at Lantern Hall. I want to read the oldest ones someday.",
      "[surprised]Honeybees dance to tell each other where flowers are! I tried it. {villager} asked if I needed to sit down.",
      "[happy]Books are like doors. Each one opens to a new place, {catch}.",
      "[neutral]I'm writing a book about Driftlight Isle. Chapter one is all about sand. There is a lot of it!",
      "[sad]I dropped my best pen in the river. I guess it's off on a big trip now.",
    ],
    rain: [
      "[happy]Did you know rain comes from the sea? It's the sea coming to visit, {catch}!",
      "[neutral]I brought an umbrella and a notebook that stays dry. Science does not stop for rain!",
      "[happy]That nice smell after rain has a name. It's called petrichor! Isn't that a fun word?",
    ],
    sunny: [
      "[happy]Sunlight takes about eight minutes to get here. So this sunbeam is nice and fresh, {catch}!",
      "[neutral]What a nice day. I may go outside for a bit. With a hat, of course.",
      "[happy]A great day for a walk. I want to spot four kinds of clouds!",
    ],
    rainbow: [
      "[surprised]A rainbow! Raindrops split the sunlight into every color. Science is so pretty, {catch}!",
      "[happy]You can never reach the end of a rainbow. It moves when you move! Isn't that lovely?",
      "[surprised]Oh my! A whole rainbow, end to end! I must draw it before it fades!",
    ],
    friendLow: [
      "[neutral]Oh, hello. I don't know much about you yet. That's an empty page in my notes!",
      "[neutral]Good day. Do you need a good book? I know a few hundred, {catch}.",
      "[happy]So nice to meet you, {player}. I hope we have lots of fun talks.",
    ],
    friendMid: [
      "[happy]{player}! I started a page in my notebook just about you. Only good things, I promise!",
      "[happy]Talking with you is fun. It's like finding a new fact, {catch}!",
      "[smug]I marked some books I think you'd like. No rush! There are only... a lot of bookmarks.",
    ],
    friendHigh: [
      "[love]You're my very best friend, {player}, {catch}. If you were a library book, I'd keep you forever!",
      "[love]I've found so many things on this island. But you are my very best find.",
      "[happy]I wrote a whole chapter about us being friends. It's my favorite one of all!",
    ],
    giftLove: [
      "[surprised]{item}! Oh my! This is a real treasure, {player}! A true treasure, {catch}!",
      "[love]{item}! I've read all about these, but I've never had one! Thank you so much!",
      "[love]You remembered I love {item}. That is the kindest thing anyone has done for me.",
    ],
    giftLike: [
      "[happy]{item}! How lovely. I'll write down how kind you are, {catch}.",
      "[happy]Thank you, {player}! This {item} will look great by my bookshelf.",
      "[happy]A gift! How kind. I find {item} very interesting!",
    ],
    giftNeutral: [
      "[neutral]Oh, {item}. Thank you, {player}. I'm sure I'll find a use for it. Someday.",
      "[neutral]{item}. Hmm. I'll have to look up what this is for, {catch}.",
      "[neutral]How nice. I don't know much about {item}. I guess now I'll learn!",
    ],
    giftDislike: [
      "[sad]Oh. {item}. It's very... sporty. I'm not sure it's for me. But thank you.",
      "[surprised]{item}? Oh dear. That's not something I study, {catch}.",
      "[sad]Oh... {item}. I'll put it somewhere safe. Somewhere far away and very safe.",
    ],
    requestDeliver: [
      "[neutral]Excuse me, {player}. I need {qty} {item} for a science project. It's very important, {catch}!",
      "[happy]I'm making a list of things found on the island. Could you bring me {qty} {item}, please?",
      "[neutral]Could you bring me {qty} {item}? It's for science. Well, mostly. I'm also just curious!",
    ],
    requestLost: [
      "[sad]Oh dear. I lost my {item}. I think it was {place}. Will you help me look?",
      "[surprised]My {item} is gone! I was reading {place}. I must have left it there, {catch}.",
      "[sad]I lost my {item} again. My notes say {place}. But my notes are not always right.",
    ],
    requestCatch: [
      "[happy]My notes on the {item} aren't done yet, {catch}. Could you catch one for me to look at?",
      "[surprised]I'd love to see the {item} up close. If you catch one, please show me!",
      "[neutral]My nature book has an empty page for the {item}. Will you help me fill it?",
    ],
    requestThanks: [
      "[love]Oh, thank you, {player}! You helped so much, {catch}. Please take this.",
      "[happy]Wonderful! I'll write your kind deed in my notebook. And underline it twice!",
      "[happy]Great work! You made this book lover very happy today.",
    ],
    requestDecline: [
      "[neutral]That's okay. Everyone is busy. I'll be fine, {catch}.",
      "[neutral]No problem! I'll put it on my list of mysteries for now.",
    ],
    requestRemind: [
      "[neutral]Excuse me, {player}. Just a small reminder about the {item}. I can wait, {catch}.",
      "[neutral]How is the hunt for the {item} going? I saved a page for it in my notes.",
    ],
    movedIn: [
      "[happy]Hello! I just moved in. I brought eleven boxes of books. And one box of everything else, {catch}!",
      "[surprised]Driftlight Isle has a museum? And a real museum keeper? Oh, I will like it here!",
      "[happy]Nice to meet you! I want to study every shell, leaf, and fossil here. I can't wait!",
    ],
    museum: [
      "[love]Professor Vesper's museum is my favorite place on the island. I could live there, {catch}!",
      "[happy]Each gift to the museum adds to the island's story. You're a historian, {player}! That means a keeper of the past.",
      "[surprised]The museum has a fossil skull with a big grin. I say good morning to it every day!",
    ],
    festival: [
      "[happy]The Lantern Crossing! I read that lanterns once led sailors home. Now they'll carry our wishes, {catch}.",
      "[surprised]The lighthouse will shine again after all these years! I must take notes. Lots of notes!",
      "[happy]I'll write my wish on my lantern very neatly. That way, the sea can read it!",
    ],
    outfit: [
      "[happy]A new outfit! Very smart, {catch}. I will write that down.",
      "[surprised]My, you look very neat today. Like a brand new book!",
      "[happy]I read that clothes can help you feel brave. You look brave today!",
    ],
    heartGift: [
      "[love]This is for you, {player}. I studied for days to pick the right one, {catch}!",
      "[happy]Here! A small thank-you gift. A friend like you deserves a whole book of thanks.",
    ],
    bye: [
      "[happy]Bye for now, {player}! I can't wait for our next chat, {catch}.",
      "[neutral]See you next time. I'll have new facts ready.",
      "[happy]Goodbye! Watch out for puddles. And keep your eyes open for wonders!",
    ],
  };

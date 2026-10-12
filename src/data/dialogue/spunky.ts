// Spunky villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const SPUNKY: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[happy]Morning, {player}! I climbed three trees and found a beetle, {catch}!",
      "[happy]Wake up, wake up! It's time for an adventure!",
      "[surprised]Whoa, you're up! I was going to leave a pinecone at your door. Oops. It was a surprise!",
    ],
    greetDay: [
      "[happy]Hey, {player}! Want to look under rocks? It's the best, {catch}!",
      "[smug]Psst! I know a secret spot. I'll show you. Maybe. If you can keep up!",
      "[happy]Hey! Today is a great day to explore. Every day is!",
    ],
    greetEvening: [
      "[happy]Evening! The bugs get extra sneaky now. I have to be sneakier, {catch}!",
      "[happy]Hey, {player}. Want to watch the sunset from a treetop? It's the best seat on the island!",
      "[happy]Look at the sunset! The whole island shines like gold treasure!",
    ],
    greetNight: [
      "[surprised]Shh! Fireflies! Don't scare them, {player}, {catch}!",
      "[happy]Night adventure time! Do you have a lantern? We need a lantern!",
      "[sleepy]I'm not tired. Nope. I could climb all night. ...Yawn. Okay, a little tired.",
    ],
    chat: [
      "[happy]I climbed the tallest tree on the island! I got a little stuck at the top. It was still fun, {catch}!",
      "[smug]I put a frog in {villager}'s mailbox. Don't worry. The frog said it was okay!",
      "[surprised]I saw a beetle with a huge horn! It was as long as my arm! Okay, my finger. Still cool!",
      "[happy]Every rock has a tiny world under it! Lift it gently. Then put it back, {catch}!",
      "[happy]If I could be any bug, I'd be a firefly. A glowing tail? So cool!",
      "[neutral]Pemberly said not to climb on Lantern Hall. So I won't. But I really, really want to!",
      "[surprised]I found an echo by the cliffs! I yelled my name. It yelled my name back! So cool, {catch}.",
      "[happy]{villager} and I are making a secret fort. You can join! The password is... uh... I forgot it.",
      "[smug]I bet I can catch more bugs than you today! Want to race? The winner gets a snack!",
      "[happy]Maps are cool. But getting a little lost is even cooler! That's where the fun stuff is!",
    ],
    rain: [
      "[happy]Rain means snails come out! Snails are slow, but they're SO cool, {catch}!",
      "[surprised]Mud! Now I can hide like a bug. Watch me! ...Can you still see me? Aw.",
      "[neutral]Trees are too slippery in the rain. But puddle jumping? Yes, please!",
    ],
    sunny: [
      "[happy]Sunny skies, bugs everywhere! Grab your net, {catch}!",
      "[happy]It's a great day to explore the whole island. Twice!",
      "[smug]The butterflies are out today. I'm going to be super sneaky!",
    ],
    rainbow: [
      "[surprised]A rainbow! I'll climb the tallest tree. Maybe I can touch it, {catch}!",
      "[happy]Rainbows mean treasure! Maybe! Let's go look!",
      "[surprised]Whoa! Did you see that?! I'm going to name that rainbow Sir Sparkles!",
    ],
    friendLow: [
      "[neutral]Hey. Are you good at climbing? We'll find out, {catch}.",
      "[smug]New neighbor, huh? I bet you don't know where the rare bugs hide. I do!",
      "[happy]Hi! I'm looking for an adventure buddy. You might be the one!",
    ],
    friendMid: [
      "[happy]{player}! You're turning into a real explorer. I'm proud of you, {catch}!",
      "[smug]You get to see my second-best secret spot. The best one is still a secret!",
      "[happy]Adventures are way more fun with you. More snacks, too!",
    ],
    friendHigh: [
      "[love]You're my best adventure buddy ever, {player}! Ever ever, {catch}!",
      "[love]I'll show you my secret spot. The REAL one! I never show anyone!",
      "[happy]Where you go, I go too! Even if it's just to the shop.",
    ],
    giftLove: [
      "[love]{item}?! No WAY! This is the coolest thing ever, {player}, {catch}!",
      "[surprised]{item}! I've wanted one of these forever! You're the best!",
      "[love]You got me {item}?! I'm going to do a flip! ...Okay, a little hop. That counts!",
    ],
    giftLike: [
      "[happy]Sweet! {item}! Thanks, {player}, {catch}!",
      "[happy]{item}! So cool! It's going right into my treasure pile.",
      "[happy]Oh cool, {item}! You picked a good one!",
    ],
    giftNeutral: [
      "[neutral]{item}? Huh. Okay! I'll find a use for it. Maybe a bug house?",
      "[neutral]Thanks for the {item}, {catch}. It's... a thing! I like things.",
      "[neutral]{item}. It's not for adventures. But thanks anyway!",
    ],
    giftDislike: [
      "[angry]{item}? Way too fancy! I can't climb with this, {catch}!",
      "[sad]Aw, {item}. It's a little... boring? Sorry. Thanks, though.",
      "[surprised]{item}?! What do I even DO with this? Wear it to a tea party?",
    ],
    requestDeliver: [
      "[happy]{player}! Secret mission: bring me {qty} {item}. Don't ask why. Okay, it's for my fort, {catch}!",
      "[smug]I need {qty} {item} for a top-secret plan. Can you help? You'll get a prize!",
      "[happy]Quick! I need {qty} {item}! The adventure needs it! Sort of!",
    ],
    requestLost: [
      "[sad]I lost my {item}! I was climbing {place}. It fell out of my pocket, {catch}!",
      "[surprised]My {item} is gone! Maybe a sneaky bug took it? I last saw it {place}!",
      "[sad]Help! I hid my {item} {place} to keep it safe. Now I can't find it! I'm too good at hiding.",
    ],
    requestCatch: [
      "[happy]I want to see the {item} up close! Catch one and bring it to me, {catch}!",
      "[smug]Catching the {item} is hard. Even I couldn't do it. Want to try?",
      "[surprised]Somebody saw the {item} today! Can you catch one and show me? Pleeease?",
    ],
    requestThanks: [
      "[love]You're the best, {player}! Mission done! Here's your prize, {catch}!",
      "[happy]You did it! I knew you could! Adventure buddies forever!",
      "[happy]Woohoo! Thanks so much! I'm going to go climb a tree for joy!",
    ],
    requestDecline: [
      "[neutral]Aw, okay. I'll go on an adventure by myself then, {catch}!",
      "[happy]That's okay! Maybe next time, adventure buddy!",
    ],
    requestRemind: [
      "[neutral]Hey! Did you forget the {item}? Just checking, {catch}!",
      "[happy]I'm still waiting for that {item}! The mission is still on!",
    ],
    movedIn: [
      "[happy]Hey! I just moved in! I climbed four trees. I fell out of one, {catch}!",
      "[surprised]An island with cliffs AND a forest AND a lighthouse? I'm never leaving!",
      "[happy]I'm the newest explorer on Driftlight Isle! Want to show me around? Or I can show YOU!",
    ],
    museum: [
      "[happy]The museum has a bug room. It's the coolest place ever, {catch}!",
      "[surprised]Professor Vesper reads hanging upside down! I tried it. I got so dizzy!",
      "[smug]The museum needs more bugs. I bet I can find a new one! Just watch!",
    ],
    festival: [
      "[happy]Lantern Crossing! I'll climb the tallest tree. Then I'll watch the lanterns float away, {catch}!",
      "[surprised]The lighthouse will light up again? I always wanted to see the top!",
      "[happy]I'm painting fireflies on my lantern. Glowing bugs on a glowing lantern. So smart!",
    ],
    outfit: [
      "[surprised]Whoa! New clothes! You look like an explorer, {catch}!",
      "[happy]That outfit is awesome! Want to climb a tree in it?",
      "[happy]Cool look, {player}! Very zippy!",
    ],
    heartGift: [
      "[love]Here! This is for you, my best adventure buddy! Don't lose it, {catch}!",
      "[happy]I found this on an adventure. I thought of you right away! It's yours now!",
    ],
    bye: [
      "[happy]See you, {player}! Stay brave and curious, {catch}!",
      "[happy]Bye! I'm off to find a bug!",
      "[smug]Bye! I'll be in a tree if you need me. Good luck finding which one!",
    ],
  };

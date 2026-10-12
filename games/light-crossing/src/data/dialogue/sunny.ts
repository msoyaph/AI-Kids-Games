// Sunny villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const SUNNY: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[happy]Good morning, {player}! The sun is up, and you are here. What a great start, {catch}!",
      "[happy]Morning! I got up early to make bread. Sniff my sleeves. Cinnamon!",
      "[love]Ooh, {player}! Seeing you is better than a warm muffin. Well, almost. It's very close!",
    ],
    greetDay: [
      "[happy]Hiya, {player}! Today feels like the happiest day ever, {catch}!",
      "[happy]There you are! I hoped I would see you. Want to have lunch? I know the best sandwiches!",
      "[surprised]Oh! {player}! I was just thinking about you. And pie. But mostly you!",
    ],
    greetEvening: [
      "[happy]Good evening, {player}! The sky is all orange and pink. It looks like a big peach pie, {catch}!",
      "[neutral]Hi hi! I'm getting ready to rest. Well, I try. I'm not very good at sitting still!",
      "[love]A pretty sunset and a friend to share it with. That's the best treat, {player}!",
    ],
    greetNight: [
      "[sleepy]Oh, {player}! It's so late! Do you like the night? I like my bed, {catch}.",
      "[surprised]Hello! Are you out looking at the stars? We should both be tucked in bed!",
      "[sleepy]Mmm, hi! I'm still up because cookies are in the oven. They're fine! Mostly!",
    ],
    chat: [
      "[happy]I'm trying a new recipe. It's honey toast with a little salt. It might be yummy. It might be yucky, {catch}!",
      "[happy]Did you say hi to {villager} today? A happy hello makes any day better!",
      "[love]Making a friend is like baking bread. It takes time and a warm heart!",
      "[surprised]Guess what? Fennimore hums while counting Glints at The Curled Leaf. It's so cute, {catch}!",
      "[happy]One day I want a picnic with the whole island. We can sit on blankets. We can eat lots of jam!",
      "[sad]I baked a surprise cake for {villager}. But I told them about it. Two times! I'm bad at secrets.",
      "[happy]Pemberly says Lantern Hall smells like old books and tea. I think it needs cookies, {catch}!",
      "[neutral]My grandma said to never bake when you're grumpy. The muffins can tell! I believe her.",
      "[happy]If you ever feel sad, come find me. I keep extra smiles in my apron pocket!",
      "[smug]I can hug you without getting crumbs on you! It took lots of practice, {catch}. And lots of sweeping!",
    ],
    rain: [
      "[happy]Rain, rain! It's a good day for soup and cozy socks, {catch}!",
      "[sad]The rain makes my fur all puffy. Don't look! ...Okay, you can look a little.",
      "[happy]Look in a puddle. You can see the sky in it! I like to wave at it.",
    ],
    sunny: [
      "[happy]Look at that sunshine! It's like the whole sky is smiling at us, {catch}!",
      "[happy]On sunny days, I bake with the windows open. Then the whole island can smell it!",
      "[love]Warm sun, warm bread, warm friends. That's the recipe for a perfect day!",
    ],
    rainbow: [
      "[surprised]A rainbow! Quick, make a wish! I wish for more sprinkles, {catch}!",
      "[love]Look! Seven colors are holding hands in the sky. Just like good friends do!",
      "[happy]I'm baking a rainbow cake tonight. It will have seven layers! Maybe eight! Yum!",
    ],
    friendLow: [
      "[happy]Hi there! I don't know you well yet. But I want to! What's your favorite snack?",
      "[neutral]Oh, hello! You're {player}, right? I'm good at names. And faces. And snacks most of all!",
      "[happy]Every friend starts with a hello. So, hello, {catch}!",
    ],
    friendMid: [
      "[happy]{player}! I put out an extra teacup for you now. Just in case you visit! Is that silly? It's not silly.",
      "[love]I'm so glad we are friends, {catch}! You make me smile every day.",
      "[happy]I named a cookie after you! It's sweet and a little crunchy. And everyone loves it!",
    ],
    friendHigh: [
      "[love]{player}, you're my best friend. I'd give you my last cinnamon bun. Even the big one!",
      "[love]When I feel sad, I think of you. Then my heart does a happy hop, {catch}!",
      "[happy]You make this island feel like home. A warm home that smells like fresh bread!",
    ],
    giftLove: [
      "[love]{item}?! For me?! Oh, {player}, I'm so happy I could dance, {catch}!",
      "[love]This {item} is perfect! I will keep it forever and ever and ever!",
      "[surprised]Oh my gosh, {item}! How did you know? You're the sweetest friend on the island!",
    ],
    giftLike: [
      "[happy]Ooh, {item}! Thank you so much, {player}! You're so sweet, {catch}.",
      "[happy]{item}! That's so kind! I'll find it the coziest spot in my house.",
      "[happy]Aw, you brought me {item}? Now my whole day is better!",
    ],
    giftNeutral: [
      "[neutral]Oh! {item}. Thanks, {player}! I'll, um, find a way to use it!",
      "[neutral]{item}, huh? That's nice of you! Maybe it can hold my cookies?",
      "[happy]A gift from you is always nice. Thanks for the {item}, {catch}!",
    ],
    giftDislike: [
      "[sad]Oh... {item}. That's... well, it was kind of you to think of me. Thank you!",
      "[surprised]Eek! {item}? It's, um... very different! I'll keep it far away from my kitchen.",
      "[sad]I don't really like {item}. But I love that you thought of me, {catch}.",
    ],
    requestDeliver: [
      "[happy]{player}, can you help me? I need {qty} {item} for a new recipe. I'll pay you in Glints and hugs!",
      "[neutral]I need {qty} {item} for my baking. Can you bring them to me? Pretty please, with frosting on top?",
      "[happy]Big favor time! I'd love {qty} {item}. Bring them over. I'll have a treat for you, {catch}!",
    ],
    requestLost: [
      "[sad]Oh no, oh no! I lost my {item} {place}! Can you help me look?",
      "[sad]I went on a picnic. Now my {item} is gone! I think I dropped it {place}, {catch}...",
      "[surprised]Have you seen my {item}? I put it down {place}. Then I chased a butterfly and forgot!",
    ],
    requestCatch: [
      "[happy]I've never seen the {item} up close! Can you catch one and show me, {catch}?",
      "[happy]{player}, I really want to see the {item}! Can you catch one for me? I'll bake you a thank-you treat!",
      "[surprised]I heard the {item} is out today! Can you catch one and show me?",
    ],
    requestThanks: [
      "[love]You did it! Thank you, {player}! Here is a little gift for you, {catch}!",
      "[happy]You're the best! I'd hug you, but I'm covered in flour. So here is a pretend hug!",
      "[happy]Thank you, thank you, thank you! The {item} is perfect. You're a true friend!",
    ],
    requestDecline: [
      "[neutral]Oh, that's okay! I'll find another way. Maybe a muffin will help, {catch}.",
      "[happy]That's fine! You have a busy day too. Go have fun!",
    ],
    requestRemind: [
      "[neutral]Hey {player}! Don't forget the {item}. No rush! Okay, maybe a tiny rush.",
      "[happy]Did you find the {item} yet? I have a thank-you treat in the oven, {catch}!",
    ],
    movedIn: [
      "[happy]Hi hi! I'm new here! I already love Driftlight Isle. The air smells like the sea, {catch}!",
      "[love]I'm so happy you came to say hi! Want to be friends? I'm very good at being a friend!",
      "[happy]I still have boxes everywhere. But I unpacked my oven mitts first. They matter most!",
    ],
    museum: [
      "[happy]Professor Vesper's museum is so fancy! I tiptoed past the fossils, {catch}. Shh!",
      "[surprised]Some museum fish look like they wear tiny hats! Now I want a fish hat!",
      "[happy]When you give the museum something, Professor Vesper flaps with joy. So cute!",
    ],
    festival: [
      "[love]The Lantern Crossing is coming soon! I'm baking cookies shaped like lanterns. One for each friend, {catch}!",
      "[happy]Just think, {player}! Lots of lanterns will float out to sea. They will glow like tiny suns!",
      "[surprised]I heard the old lighthouse will shine again! I'll pack snacks. We can watch it all night!",
    ],
    outfit: [
      "[happy]Ooh, new clothes! You look as sweet as a cupcake, {catch}!",
      "[love]I love your outfit, {player}! It makes me want to bake something pink!",
      "[surprised]Wow! Did you dress up for me? I feel so special!",
    ],
    heartGift: [
      "[love]{player}, I made you something special. That's because you are special! Don't say no, {catch}!",
      "[love]Here! A present for my best friend. That's you! Open it, open it!",
    ],
    bye: [
      "[happy]Bye, {player}! Come back soon. The cookies miss you already, {catch}!",
      "[happy]See you later! Don't forget to eat a snack!",
      "[love]Take care! I'm sending you a big warm hug through the air. Got it? Good!",
    ],
  };

// Dreamy villagers' lines. Early-reader friendly: short sentences, simple words.
// See src/data/dialogue.ts for the expression tags and {tokens}.
import type { DialogueTopic } from '../dialogue';

export const DREAMY: Record<DialogueTopic, string[]> = {
    greetMorning: [
      "[sleepy]Good morning, {player}... The sky is peach pink today, {catch}.",
      "[happy]Good morning! I dreamed I was a cloud. I still feel light and floaty.",
      "[sleepy]Oh... is it morning? The dew looks like tiny stars. They forgot to go home!",
    ],
    greetDay: [
      "[happy]Hello, {player}! The light is so soft today. It all looks painted, {catch}.",
      "[neutral]Hi... I was counting the colors in a puddle. I found eleven!",
      "[happy]Oh, it's you! Your hello is such a pretty color.",
    ],
    greetEvening: [
      "[love]Good evening... The sun is melting into the sea. So pretty, {catch}.",
      "[happy]Hi, {player}! The sky has on all its best colors tonight.",
      "[sleepy]The evening feels like a sleepy song. Can you hear it too?",
    ],
    greetNight: [
      "[sleepy]Hello, night friend... The moon is so bright. I could paint by it, {catch}.",
      "[happy]Oh! {player}! Did you come out to see the stars too?",
      "[sleepy]I'm a little sleepy. But the night is too pretty to close my eyes.",
    ],
    chat: [
      "[happy]I painted the sea yesterday. It kept changing color! So I painted it again and again, {catch}.",
      "[sleepy]Do clouds have dreams? I think they dream about being rain.",
      "[happy]{villager} let me paint a picture of them. I added a tiny star on their nose. They liked it!",
      "[love]Some colors don't have names yet. I'm collecting them, {catch}.",
      "[neutral]I tried to paint the wind. It came out all swirly. Very, very swirly.",
      "[happy]The lanterns at Lantern Hall glow like warm honey. I want to paint every one.",
      "[sleepy]Sometimes I lie by the river. I let my thoughts float away with the water, {catch}.",
      "[surprised]Did you know? {villager}'s laugh is the color of lemon drops.",
      "[happy]Every shell on the beach is a little poem. The sea wrote them all.",
      "[sad]I lost my best paintbrush. Maybe it went to paint a sunset without me.",
    ],
    rain: [
      "[happy]Rain on the pond makes circles inside circles. The sky is drawing, {catch}.",
      "[sleepy]Rain makes the whole island hum a soft song. It's perfect for naps.",
      "[love]I love the rain. Everything shines like it was just painted.",
    ],
    sunny: [
      "[happy]The sun is so golden today. Like honey on toast, {catch}.",
      "[sleepy]Warm sun... soft grass... I could fall asleep right here.",
      "[happy]Sunny days make the sea sparkle. It looks like spilled glitter!",
    ],
    rainbow: [
      "[love]A rainbow... The sky is painting just for us, {catch}.",
      "[surprised]Oh! All my favorite colors in one place! Where is my sketchbook?",
      "[happy]I want to dip my brush in that rainbow. Then I could keep it forever.",
    ],
    friendLow: [
      "[neutral]Oh, hello. Your color is... hmm. Light blue, maybe? Nice to meet you, {catch}.",
      "[sleepy]Hi... sorry, I was daydreaming. Have we met? Maybe we met in a dream.",
      "[happy]Nice to meet you. I'm still learning your colors.",
    ],
    friendMid: [
      "[happy]{player}! Your colors get brighter every time I see you, {catch}.",
      "[happy]I painted a little picture of you. You're standing in a field of Moonlilies.",
      "[love]Talking with you is like watching clouds. It feels calm and nice. And a little magic.",
    ],
    friendHigh: [
      "[love]You're the brightest color in my whole world, {player}, {catch}.",
      "[love]To paint our friendship, I would need every color. And a few new ones too!",
      "[happy]Sometimes I dream about our adventures. In my dreams, we can fly.",
    ],
    giftLove: [
      "[love]{item}! It's beautiful! It makes my heart feel soft and colorful, {catch}.",
      "[surprised]Oh, {item}! It's like you took it right out of my dreams!",
      "[love]{item}... I'm going to paint it. Then hug it. Then paint it again.",
    ],
    giftLike: [
      "[happy]{item}! What a lovely color. Thank you, {player}, {catch}.",
      "[happy]Ooh, {item}. I can feel a new painting coming!",
      "[happy]{item} for me? That's so sweet. Like cotton candy.",
    ],
    giftNeutral: [
      "[neutral]{item}... Hmm. Maybe it wants to be in a painting, {catch}.",
      "[neutral]Oh, {item}. Thank you. I can't see its colors yet.",
      "[neutral]{item}. I will put it where the light can find it.",
    ],
    giftDislike: [
      "[sad]{item}? It's so... gray. Now my heart feels a little gray too, {catch}.",
      "[sad]Oh... {item}. It doesn't make me want to paint. But thank you.",
      "[surprised]{item}? It's very... loud. My dreams like quiet things.",
    ],
    requestDeliver: [
      "[happy]{player}... I need {qty} {item} for a new painting. Could you bring them, {catch}?",
      "[sleepy]I dreamed about {qty} {item} last night. Can you help my dream come true?",
      "[happy]Could you find {qty} {item} for me? I want to paint their colors.",
    ],
    requestLost: [
      "[sad]I was daydreaming {place}. When I looked up, my {item} was gone! Can you find it, {catch}?",
      "[surprised]My {item}! It's gone! I last saw it {place}.",
      "[sad]I think I left my {item} {place}. Or did I dream that? Could you check?",
    ],
    requestCatch: [
      "[happy]I want to paint the {item}. Could you catch one and show me, {catch}?",
      "[sleepy]I saw the {item} in a dream. Is it real? Could you catch one for me?",
      "[happy]The {item} must have such pretty colors. Could you catch one? I want to see it up close.",
    ],
    requestThanks: [
      "[love]Thank you, {player}! You made my day so much brighter, {catch}.",
      "[happy]You're wonderful! Here, a little something for you.",
      "[love]This is perfect. You're like a wishing star. You make wishes come true!",
    ],
    requestDecline: [
      "[neutral]That's okay. Some wishes just float away, {catch}.",
      "[sleepy]That's all right... I'll just dream about it instead.",
    ],
    requestRemind: [
      "[neutral]Um, {player}... Did you find the {item} yet? No hurry, {catch}.",
      "[sleepy]I keep dreaming about the {item}. I hope you find it soon.",
    ],
    movedIn: [
      "[happy]Hello... I just moved here. The sea has so many colors! I may paint forever, {catch}.",
      "[sleepy]I followed a cloud all the way to Driftlight Isle. I think it wanted me here.",
      "[happy]Nice to meet you, {player}. I hope we can be friends. Your color is so warm.",
    ],
    museum: [
      "[happy]The museum fish tanks are like paintings that swim, {catch}.",
      "[love]Professor Vesper says each fossil is a memory. The earth kept it safe for us. Isn't that nice?",
      "[sleepy]I like the museum when it's quiet. The old bones tell dreamy stories.",
    ],
    festival: [
      "[love]The Lantern Crossing... so many little lights floating into the dark. Like stars going home, {catch}.",
      "[happy]I'm painting my lantern with sunset colors. It will glow warm all the way out to sea.",
      "[surprised]When the lighthouse shines again, the sea will sparkle back!",
    ],
    outfit: [
      "[love]Your outfit is like a painting, {catch}. So many pretty colors!",
      "[happy]Ooh, I want to paint you in those clothes!",
      "[sleepy]You look like a soft cloud today. I like it, {player}.",
    ],
    heartGift: [
      "[love]For you, {player}. I made it while thinking of you. It's full of happy colors, {catch}.",
      "[happy]Here... a little gift. You make my world brighter.",
    ],
    bye: [
      "[happy]Bye, {player}... Sweet dreams, even in the daytime, {catch}.",
      "[sleepy]See you... I'm going to go watch some clouds.",
      "[happy]Bye-bye! I hope your day is full of soft colors.",
    ],
  };

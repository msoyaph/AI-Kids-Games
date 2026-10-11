// Villager dialogue for Driftlight Isle, keyed by personality and topic. All lines are original.
//
// Each string is one speech bubble. An optional expression tag may lead the line:
//   [neutral] [happy] [sad] [surprised] [angry] [love] [sleepy] [smug]
// Template tokens substituted at runtime:
//   {player}   the player's name
//   {catch}    the speaking villager's catchphrase
//   {villager} another neighbor's name (chat only)
//   {item}     an item name (gift* and request* topics only)
//   {qty}      a quantity (requestDeliver only)
//   {place}    a place description like "near the beach" (requestLost only)
import type { Personality } from './villagers';

export type DialogueTopic =
  | 'greetMorning' | 'greetDay' | 'greetEvening' | 'greetNight'
  | 'chat' | 'rain' | 'sunny' | 'rainbow'
  | 'friendLow' | 'friendMid' | 'friendHigh'
  | 'giftLove' | 'giftLike' | 'giftNeutral' | 'giftDislike'
  | 'requestDeliver' | 'requestLost' | 'requestCatch' | 'requestThanks' | 'requestDecline' | 'requestRemind'
  | 'movedIn' | 'museum' | 'festival' | 'heartGift' | 'bye'
  | 'outfit';

export const DIALOGUE: Record<Personality, Record<DialogueTopic, string[]>> = {
  // ---------------------------------------------------------------------------
  // SUNNY: bubbly, food-loving, friendship first
  // ---------------------------------------------------------------------------
  sunny: {
    greetMorning: [
      "[happy]Good morning, {player}! The sun's up, the kettle's on, and you're here. Perfect start, {catch}!",
      "[happy]Morning! I've been up since dawn kneading dough. Smell my sleeves. Cinnamon!",
      "[love]Ooh, {player}! Seeing you first thing is better than a warm muffin. Almost. It's very close!",
    ],
    greetDay: [
      "[happy]Hiya, {player}! Isn't today just the brightest, friendliest day ever, {catch}?",
      "[happy]There you are! I was hoping I'd bump into you. Lunch plans? I have strong opinions about sandwiches.",
      "[surprised]Oh! {player}! I was just thinking about you. And also pie. But mostly you!",
    ],
    greetEvening: [
      "[happy]Evening, {player}! The sky's gone all peachy. Like a giant apricot tart, {catch}!",
      "[neutral]Hi hi! I'm winding down for the day. Well, as much as I ever wind down, which is not much.",
      "[love]A sunset and a friendly face. That's my favorite kind of dessert, {player}.",
    ],
    greetNight: [
      "[sleepy]Oh, {player}! It's so late! Are you a night owl? I'm more of a morning muffin, {catch}.",
      "[surprised]Hello, stargazer! Shouldn't we both be snuggled under a blanket by now?",
      "[sleepy]Mmm, hi! I'm only awake because I left cookies in the oven. They're fine! Mostly!",
    ],
    chat: [
      "[happy]I'm testing a new recipe: honey toast with a pinch of sea salt. It's either genius or a crime, {catch}!",
      "[happy]Have you said hi to {villager} today? A good hello can fix almost anything!",
      "[love]Friends are like bread dough. Give them warmth and a little time, and they rise right up!",
      "[surprised]Did you know Fennimore hums while counting Glints at The Curled Leaf? It's so cute, {catch}!",
      "[happy]Someday I want to throw a picnic for the whole island. Blankets everywhere! Jam on everything!",
      "[sad]I tried to bake {villager} a surprise cake, but I told them about it. Twice. I'm terrible at secrets.",
      "[happy]Pemberly says Lantern Hall smells like old paper and tea. I say it needs more cookies, {catch}.",
      "[neutral]My grandma always said never bake when you're grumpy. The muffins can tell. I believe her!",
      "[happy]If you ever feel gloomy, come find me. I keep spare smiles in my apron pocket!",
      "[smug]I've perfected the crumb-free hug. It took years of practice and a lot of sweeping, {catch}.",
    ],
    rain: [
      "[happy]Rain, rain! Perfect weather for soup and staying cozy, {catch}!",
      "[sad]The rain makes my fur go all poofy. Don't look! ...Okay, you can look a little.",
      "[happy]Every puddle is a tiny mirror for the sky. I like to wave at mine!",
    ],
    sunny: [
      "[happy]Look at that sunshine! It's like the whole sky is smiling at us, {catch}!",
      "[happy]On days like this I bake with the windows open so the whole island can smell it.",
      "[love]Warm sun, warm bread, warm friends. That's the recipe for a perfect day!",
    ],
    rainbow: [
      "[surprised]A rainbow! Quick, make a wish! Mine is for more sprinkles, {catch}!",
      "[love]Seven colors all holding hands across the sky. That's what friendship looks like!",
      "[happy]I'm baking a rainbow layer cake tonight. Seven layers! Maybe eight! Who's counting?",
    ],
    friendLow: [
      "[happy]Hi there! I don't know you super well yet, but I'd like to! What's your favorite snack?",
      "[neutral]Oh, hello! You're {player}, right? I'm good with names. Faces too. Snacks especially.",
      "[happy]Every friend starts as a stranger who said hello. So: hello, {catch}!",
    ],
    friendMid: [
      "[happy]{player}! I've started setting out an extra teacup in case you drop by. Is that weird? It's not weird.",
      "[love]You're becoming one of my very favorite faces on the island, {catch}!",
      "[happy]I named a cookie after you. It's sweet, a little crunchy, and always welcome!",
    ],
    friendHigh: [
      "[love]{player}, you're my best friend. I'd share my very last cinnamon bun with you. The big one!",
      "[love]Whenever I'm sad, I just think of you and my heart does a happy little hop, {catch}.",
      "[happy]You make this island feel like home. The warm-bread-fresh-from-the-oven kind of home.",
    ],
    giftLove: [
      "[love]{item}?! For me?! Oh, {player}, I could burst like an overstuffed dumpling, {catch}!",
      "[love]This {item} is perfect! I'm going to treasure it forever and ever and ever!",
      "[surprised]Oh my gosh, {item}! How did you know? You're the sweetest thing on this island!",
    ],
    giftLike: [
      "[happy]Ooh, {item}! Thank you so much, {player}! You're a sweetheart, {catch}.",
      "[happy]{item}! That's so thoughtful! I'll find it the coziest spot in my house.",
      "[happy]Aw, you brought me {item}? This just made my whole afternoon!",
    ],
    giftNeutral: [
      "[neutral]Oh! {item}. Thanks, {player}! I'll, um, think of something to do with it!",
      "[neutral]{item}, huh? That's nice of you! Maybe it can be a cookie stand?",
      "[happy]A gift from you is always nice. Thanks for the {item}, {catch}!",
    ],
    giftDislike: [
      "[sad]Oh... {item}. That's... well, it's the thought that counts, right? Right!",
      "[surprised]Eek! {item}? It's, um, very... interesting. I'll keep it far from the kitchen.",
      "[sad]I'm not really a fan of {item}, but I love that you thought of me, {catch}.",
    ],
    requestDeliver: [
      "[happy]{player}, could you help me? I need {qty} {item} for a new recipe. I'll pay you in Glints and gratitude!",
      "[neutral]I'm short {qty} {item} for my baking. Could you bring some by? Pretty please, with frosting on top?",
      "[happy]Big favor time! I'd love {qty} {item}. Bring them over and I'll make it worth your while, {catch}!",
    ],
    requestLost: [
      "[sad]Oh no, oh no! I lost my {item} somewhere {place}! Could you help me look?",
      "[sad]I was out picnicking and now my {item} is gone. I think I dropped it {place}, {catch}...",
      "[surprised]Have you seen my {item}? I set it down somewhere {place} and then got distracted by a butterfly.",
    ],
    requestCatch: [
      "[happy]I've never seen the {item} up close! Could you catch one and show me, {catch}?",
      "[happy]{player}, I really want to see the {item}! Catch one for me? I'll bake you a thank-you treat!",
      "[surprised]Someone said the {item} is out today! Could you catch one and bring it to show me?",
    ],
    requestThanks: [
      "[love]You did it! Thank you, {player}! Here, a little something to say thanks, {catch}!",
      "[happy]You're the best! I'd hug you, but I'm covered in flour. Consider yourself hugged!",
      "[happy]Thank you thank you thank you! The {item} is perfect. You're a true friend!",
    ],
    requestDecline: [
      "[neutral]Oh, that's okay! I'll figure something out. Maybe a muffin will help, {catch}.",
      "[happy]No worries at all! You've got your own busy day. Go have fun!",
    ],
    requestRemind: [
      "[neutral]Hey {player}! Just a teeny reminder about the {item}. No rush! Okay, maybe a tiny rush.",
      "[happy]Any luck with that {item}? I've got a thank-you treat keeping warm in the oven, {catch}!",
    ],
    movedIn: [
      "[happy]Hi hi! I'm new here! I already love Driftlight Isle. The air smells like salt and possibility, {catch}!",
      "[love]I'm so happy you came to say hi! Want to be friends? I'm very good at friends!",
      "[happy]I still have boxes everywhere, but I unpacked my oven mitts first. Priorities!",
    ],
    museum: [
      "[happy]Professor Vesper's museum is so fancy! I held my breath near the fossils so I wouldn't fog them, {catch}.",
      "[surprised]Some of the fish in the museum look like they're wearing tiny hats. Now I want a fish hat.",
      "[happy]Every time you donate something, Professor Vesper does a happy little wing-flap. It's adorable!",
    ],
    festival: [
      "[love]The Lantern Crossing is coming! I'm baking lantern-shaped cookies for everyone, {catch}!",
      "[happy]Imagine it, {player}: hundreds of lanterns floating out to sea, glowing like tiny warm suns!",
      "[surprised]They say the old lighthouse will shine again! I'll pack snacks so we can watch all night!",
    ],
    outfit: [
      "[happy]Ooh, new clothes! You look as sweet as a cupcake, {catch}!",
      "[love]I love your outfit, {player}! It makes me want to bake something pink!",
      "[surprised]Wow! Did you dress up for me? I feel so special!",
    ],
    heartGift: [
      "[love]{player}, I made you something special, because you're special. No arguing, {catch}!",
      "[love]Here! A present for my best friend. That's you! Open it, open it!",
    ],
    bye: [
      "[happy]Bye, {player}! Come back soon. The cookies miss you already, {catch}!",
      "[happy]See you later! Don't forget to eat a snack!",
      "[love]Take care! I'm sending you a big warm hug through the air. Got it? Good!",
    ],
  },

  // ---------------------------------------------------------------------------
  // GRUFF: curt, secretly caring, gardening
  // ---------------------------------------------------------------------------
  gruff: {
    greetMorning: [
      "[neutral]Morning. Dew's still on the leaves. Best time to water, {catch}.",
      "[smug]You're up early. Good. Sun doesn't wait for anybody.",
      "[neutral]Mm. Morning, {player}. Mind the seedlings on your way through.",
    ],
    greetDay: [
      "[neutral]{player}. Hot one today. Drink some water, {catch}.",
      "[neutral]Afternoon. Don't just stand there. Weeds won't pull themselves.",
      "[smug]Oh, it's you. Fine. You can stay.",
    ],
    greetEvening: [
      "[neutral]Evening. Soil's cooling off. Roots like that, {catch}.",
      "[neutral]Long day? Mm. Me too. Sit if you want. Or don't.",
      "[smug]Evening, {player}. Didn't trample anything today, I hope.",
    ],
    greetNight: [
      "[sleepy]It's late, {player}. Go home and get some rest, {catch}.",
      "[angry]What are you doing out this late? ...Fine. Watch your step in the dark.",
      "[neutral]Night shift belongs to the earthworms. Hardest workers on the island. Don't bother them.",
    ],
    chat: [
      "[neutral]Plant a seed, wait. Water it, wait. Most of gardening is waiting, {catch}.",
      "[angry]Somebody stepped on my tulips. If it was {villager}, I'm not mad. Just... disappointed.",
      "[neutral]Pemberly brought me tea yesterday. Didn't ask for it. Drank it anyway. It was fine. Good, even.",
      "[smug]Fennimore tried to sell me a watering can with a gold handle. What's a can need a gold handle for?",
      "[neutral]Flowers don't care who you are. Treat 'em right and they bloom. More than you can say for most folks.",
      "[sad]Lost a sapling to the wind last week. Planted three more. That's how it goes, {catch}.",
      "[neutral]Saw {villager} talking to a butterfly earlier. Didn't laugh. Much.",
      "[smug]Dirt under your claws means you did something today. Remember that.",
      "[neutral]Want advice? Don't overwater. Plants, friendships, whatever. Give 'em room to breathe, {catch}.",
      "[love]...Don't tell anyone, but I hum to the seedlings. Only when nobody's around.",
    ],
    rain: [
      "[happy]Rain. Good. Saves me hauling water all day, {catch}.",
      "[neutral]Don't stand under the trees. You get dripped on twice. Learned that the hard way.",
      "[smug]Everybody hides from the rain. Not me. Garden's thirsty, so I'm out in it.",
    ],
    sunny: [
      "[neutral]Clear skies. Good for the flowers. Bad for my nose. Burns, {catch}.",
      "[neutral]Sun's out. Wear a hat. ...I'm not worried. Just saying.",
      "[happy]Bright day like this, you can practically hear the sprouts stretching.",
    ],
    rainbow: [
      "[surprised]Hm. A rainbow. ...Fine. It's nice. Don't make a big deal of it, {catch}.",
      "[neutral]Rainbow means the rain's done and the sun's back. Garden got the best of both.",
      "[love]My gran used to say rainbows were flowers the sky planted. ...Silly. I like it, though.",
    ],
    friendLow: [
      "[neutral]What do you want? ...Oh. Just saying hi. Hm. Hi, {catch}.",
      "[angry]You're the new one. Stay off my flower beds and we'll get along.",
      "[neutral]I'm not much for chitchat. Come back when you know a thing or two about soil.",
    ],
    friendMid: [
      "[neutral]You again. ...That's not a complaint, {catch}.",
      "[smug]Saw you watering flowers the other day. Not bad. Not great, either. Keep at it.",
      "[neutral]Saved you a spot by the garden fence. Don't read into it.",
    ],
    friendHigh: [
      "[love]You're alright, {player}. More than alright. ...Don't make me say it twice, {catch}.",
      "[happy]Planted a row of flowers and named it after you. Grows strong. Stubborn, too. Like you.",
      "[neutral]If you ever need a hand, you come find me. I mean it. Day or night.",
    ],
    giftLove: [
      "[surprised]...{item}? For me? Hm. This is... really good, {player}. Thank you, {catch}.",
      "[love]{item}. You actually listen when I talk. ...I'm keeping this right by the window.",
      "[happy]Now THIS is a proper gift. {item}. Simple. Honest. Perfect.",
    ],
    giftLike: [
      "[neutral]{item}. Hm. Useful. Thanks, {catch}.",
      "[happy]Not bad, {player}. Not bad at all. I'll take good care of this {item}.",
      "[neutral]You didn't have to. ...But I'm glad you did. Thanks for the {item}.",
    ],
    giftNeutral: [
      "[neutral]{item}. Okay. ...Thanks, I guess, {catch}.",
      "[neutral]Huh. {item}. I'll find somewhere to put it. Probably the shed.",
      "[neutral]Didn't expect {item}. Can't say I need it. Still. Thanks.",
    ],
    giftDislike: [
      "[angry]{item}? Too shiny. Too fussy. What am I supposed to do with this, {catch}?",
      "[sad]...{item}. Hm. I'll use it to prop open the shed door.",
      "[angry]You know I'm not into this kind of thing. ...Fine. Thanks for the {item}. Sort of.",
    ],
    requestDeliver: [
      "[neutral]{player}. Need {qty} {item}. Got a project going. Can you help, {catch}?",
      "[neutral]I'm short {qty} {item}. Wouldn't ask if I didn't need it. Bring 'em by?",
      "[smug]Got a job for you. Fetch me {qty} {item}. I'll make it worth your time.",
    ],
    requestLost: [
      "[angry]Lost my {item}. Somewhere {place}, I think. ...Could you look? My eyes aren't what they used to be.",
      "[sad]Dropped my {item} {place}. Had it for years. ...Not that I'm sentimental, {catch}.",
      "[neutral]My {item}'s gone missing. Last had it {place}. Keep an eye out, would you?",
    ],
    requestCatch: [
      "[neutral]Never seen the {item} with my own eyes. Catch one and show me, {catch}.",
      "[smug]Bet you can't catch the {item}. ...Go on. Prove me wrong. Bring it here.",
      "[neutral]Want to see the {item}. No reason. Just curious. Catch one for me?",
    ],
    requestThanks: [
      "[happy]Good work. Real good. Here, take this. Thanks, {player}, {catch}.",
      "[neutral]You came through. I won't forget it.",
      "[love]That's... that's a big help. You're a good one, {player}. Don't let it go to your head.",
    ],
    requestDecline: [
      "[neutral]Fine. You're busy. I get it. I'll manage, {catch}.",
      "[neutral]No? Alright. No hard feelings. Plenty else to do around here.",
    ],
    requestRemind: [
      "[neutral]Still waiting on that {item}. No pressure. ...Some pressure, {catch}.",
      "[neutral]You didn't forget about the {item}, did you? Just checking.",
    ],
    movedIn: [
      "[neutral]So. You're the welcome committee. ...Name's on the mailbox. Soil here's decent, {catch}.",
      "[smug]Moved in yesterday. Already found three good spots for a garden. You're standing on one.",
      "[neutral]Driftlight Isle, huh. Salt air, sandy soil. Tough on plants. Good. I like a challenge.",
    ],
    museum: [
      "[neutral]Went to that museum. Professor Vesper talked for an hour about one rock. ...It was a good rock, {catch}.",
      "[smug]Fossils are the roots of history. Keep digging. You'll turn something up.",
      "[neutral]Bug room gives me the shivers. ...Don't laugh. The fish tanks are alright, though.",
    ],
    festival: [
      "[neutral]Lantern Crossing's coming up. ...I'm growing flowers to line the path to the beach, {catch}.",
      "[sad]That old lighthouse up on the cliff hasn't been lit in years, they say. ...Be nice to see it shine.",
      "[happy]Lanterns on the water. A light on the cliff. ...Fine. I'm a little excited. Don't spread it around.",
    ],
    outfit: [
      "[neutral]Hrmph. New clothes? ...They look good. Don't tell anyone I said that.",
      "[smug]That outfit looks sturdy. Good for gardening, {catch}.",
      "[neutral]You changed your clothes. I noticed. I notice things.",
    ],
    heartGift: [
      "[neutral]Here. Made this for you. Don't make it weird, {catch}.",
      "[love]You've been a good friend, {player}. Take this. ...You earned it.",
    ],
    bye: [
      "[neutral]See you. Watch where you step, {catch}.",
      "[neutral]Right. Off you go.",
      "[happy]Later, {player}. ...Come by tomorrow. If you want.",
    ],
  },

  // ---------------------------------------------------------------------------
  // BOOKISH: curious, polite, full of facts
  // ---------------------------------------------------------------------------
  bookish: {
    greetMorning: [
      "[happy]Good morning, {player}! Mornings are ideal for reading. My own research confirms it, {catch}.",
      "[neutral]Ah, good morning! I was just cataloguing the dewdrops on the grass. Well, attempting to.",
      "[surprised]Oh! Is it morning already? I seem to have read straight through the night again.",
    ],
    greetDay: [
      "[happy]Good afternoon, {player}! I'm halfway through a book on tides. Riveting stuff, {catch}.",
      "[neutral]Hello there! Pardon the ink smudges. I've been taking notes on cloud shapes.",
      "[happy]Ah, {player}! Just the person I hoped to see. I have a fact for you. Several, actually.",
    ],
    greetEvening: [
      "[happy]Good evening! The light at this hour is ideal for reading on the porch, {catch}.",
      "[neutral]Ah, evening. Did you know the first 'star' you see is often a planet? Delightfully sneaky.",
      "[happy]Good evening, {player}. I do hope your day was full of small discoveries.",
    ],
    greetNight: [
      "[sleepy]Oh, good evening... or is it night? I lose track when the chapter's good, {catch}.",
      "[surprised]{player}! Out so late? Only owls and scholars keep these hours, I thought.",
      "[sleepy]Mm, hello. I'm testing whether one can read by moonlight. Early results: squinting.",
    ],
    chat: [
      "[surprised]Did you know an octopus has three hearts? I can barely keep up with the one, {catch}.",
      "[happy]I keep three notebooks: one for facts, one for questions, and one I seem to have misplaced.",
      "[neutral]I asked {villager} for their favorite book. They said 'the one with the boat.' I have follow-up questions.",
      "[happy]Professor Vesper lent me a journal on deep-sea creatures. I've read it twice. Thrice, {catch}.",
      "[smug]Every lighthouse blinks its own pattern, so sailors can tell them apart. Like a signature in light!",
      "[neutral]Pemberly keeps the island records at Lantern Hall. I'd love to read the oldest ones someday.",
      "[surprised]Honeybees share directions by dancing! I tried it. {villager} asked if I needed to sit down.",
      "[happy]A library is just a quiet room full of very loud ideas, {catch}.",
      "[neutral]I'm writing a field guide to Driftlight Isle. Chapter one: 'Sand. There Is Quite a Lot of It.'",
      "[sad]I dropped my favorite pen in the river. I suppose it's off on a grand voyage now.",
    ],
    rain: [
      "[happy]Rain is simply the ocean visiting by air. How considerate of it, {catch}.",
      "[neutral]I've brought an umbrella and a waterproof notebook. Science waits for no weather.",
      "[happy]That earthy smell after rain has a name: petrichor. Isn't that a lovely word?",
    ],
    sunny: [
      "[happy]Sunlight takes about eight minutes to reach us. This sunbeam is practically fresh, {catch}.",
      "[neutral]Lovely day. I may venture out of the reading room. Briefly. With a hat.",
      "[happy]Perfect weather for a walk. I intend to observe at least four kinds of cloud.",
    ],
    rainbow: [
      "[surprised]A rainbow! Sunlight split by raindrops into every color. Physics is beautiful, {catch}.",
      "[happy]You can never reach the end of a rainbow. It moves when you do. Rather poetic, isn't it?",
      "[surprised]Oh my! A full arc! I must sketch it before it fades!",
    ],
    friendLow: [
      "[neutral]Oh, hello. I'm afraid I don't know much about you yet. A gap in my research.",
      "[neutral]Good day. If you ever need a book recommendation, I have, oh, a few hundred, {catch}.",
      "[happy]Pleased to make your acquaintance, {player}. I hope we'll have many interesting talks.",
    ],
    friendMid: [
      "[happy]{player}! I've started a notebook section just about you. All good things, I assure you.",
      "[happy]Talking with you is like finding a fascinating footnote, {catch}.",
      "[smug]I've marked a few books I think you'd enjoy. No pressure. There are only... several bookmarks.",
    ],
    friendHigh: [
      "[love]You're my dearest friend, {player}. If you were a library book, I'd never return you, {catch}.",
      "[love]Of all the discoveries I've made on this island, meeting you is the very best one.",
      "[happy]I wrote a whole chapter about our friendship. It's my favorite chapter. By a wide margin.",
    ],
    giftLove: [
      "[surprised]{item}! Oh my word! This is a treasure, {player}! A genuine treasure, {catch}!",
      "[love]{item}! I've read all about these, but I've never had one of my own! Thank you so very much!",
      "[love]You remembered I'd adore {item}. That's the most thoughtful thing anyone's done for me.",
    ],
    giftLike: [
      "[happy]{item}! How lovely. I shall make a note of your kindness, {catch}.",
      "[happy]Thank you, {player}! This {item} will look splendid beside my bookshelf.",
      "[happy]A gift! How kind. {item} is a fascinating choice.",
    ],
    giftNeutral: [
      "[neutral]Ah, {item}. Thank you, {player}. I'm sure I'll find a use for it. Eventually.",
      "[neutral]{item}. Hmm. I'll have to research what one does with this, {catch}.",
      "[neutral]How thoughtful. I don't know much about {item}, but I suppose now I'll learn.",
    ],
    giftDislike: [
      "[sad]Oh. {item}. It's very... energetic. I'm not sure it suits me, but thank you.",
      "[surprised]{item}? I'm afraid this falls rather outside my field of study, {catch}.",
      "[sad]Ah... {item}. I'll put it somewhere safe. Somewhere far away and very safe.",
    ],
    requestDeliver: [
      "[neutral]Pardon me, {player}. I require {qty} {item} for an experiment. It's for science, {catch}.",
      "[happy]I'm documenting local materials and need {qty} {item}. Would you be so kind?",
      "[neutral]Might I trouble you for {qty} {item}? It's for science. Mostly science. Partly curiosity.",
    ],
    requestLost: [
      "[sad]Oh dear. I've misplaced my {item}. I believe it was somewhere {place}. Would you help me look?",
      "[surprised]My {item} is missing! I was reading {place} and must have set it down, {catch}.",
      "[sad]I've lost my {item} again. My notes say {place}. My notes are not always reliable.",
    ],
    requestCatch: [
      "[happy]My chapter on the {item} is sadly incomplete, {catch}. Could you catch one for me to observe?",
      "[surprised]I'd dearly love to study the {item} up close. If you catch one, please show me!",
      "[neutral]My field guide has a blank page for the {item}. Would you help me fill it in?",
    ],
    requestThanks: [
      "[love]Oh, thank you, {player}! Your help is invaluable, {catch}. Please accept this.",
      "[happy]Splendid! I'll record this in my notebook as a great kindness. Underlined twice.",
      "[happy]Wonderful work! You've made a scholar very happy today.",
    ],
    requestDecline: [
      "[neutral]Quite understandable. Everyone's schedule is full. I'll manage, {catch}.",
      "[neutral]Not to worry! I'll simply file it under 'unsolved mysteries' for now.",
    ],
    requestRemind: [
      "[neutral]Pardon me, {player}, a gentle reminder about the {item}. Patience is a scholarly virtue, {catch}.",
      "[neutral]How goes the search for the {item}? I've left a page open for it in my notes.",
    ],
    movedIn: [
      "[happy]Hello! I've just moved in. I brought eleven boxes of books and one box of everything else, {catch}.",
      "[surprised]Driftlight Isle has a museum? With a real curator? Oh, I think I'm going to like it here.",
      "[happy]Pleased to meet you! I'm eager to study every shell, leaf, and fossil on this island.",
    ],
    museum: [
      "[love]Professor Vesper's museum is my favorite place on the island. I could happily live there, {catch}.",
      "[happy]Each donation fills in another page of the island's story. You're a historian, {player}!",
      "[surprised]There's a fossil skull in the museum with the grandest grin. I say good morning to it daily.",
    ],
    festival: [
      "[happy]The Lantern Crossing! I've read that lanterns once guided sailors home. Now they'll carry our wishes, {catch}.",
      "[surprised]Relighting the lighthouse after all these years! I must take notes. Very thorough notes.",
      "[happy]I'll write my wish on my lantern in my neatest handwriting, so the sea can read it properly.",
    ],
    outfit: [
      "[happy]A new outfit! Quite smart, {catch}. I will write that down.",
      "[surprised]Goodness, you look very neat today. Like a brand new book!",
      "[happy]I read that clothes can help you feel brave. You look brave today!",
    ],
    heartGift: [
      "[love]For you, {player}. I chose it after extensive research into what you'd like, {catch}.",
      "[happy]Here! A small token of my appreciation. A friendship like ours deserves more than a footnote.",
    ],
    bye: [
      "[happy]Farewell for now, {player}! I'm already looking forward to our next chat, {catch}.",
      "[neutral]Until next time. I'll have fresh facts ready.",
      "[happy]Goodbye! Mind the puddles, and keep your eyes open for wonders.",
    ],
  },

  // ---------------------------------------------------------------------------
  // SPORTY: energetic, workouts, competitive but kind
  // ---------------------------------------------------------------------------
  sporty: {
    greetMorning: [
      "[happy]Morning, {player}! I already ran the whole beach! Twice! Your turn, {catch}!",
      "[happy]Rise and shine! Arms up high! Higher! Now wiggle! See? You're awake now!",
      "[smug]Early start, huh? Respect. Race you to the dock?",
    ],
    greetDay: [
      "[happy]Hey hey, {player}! Perfect day for jumping jacks, {catch}!",
      "[happy]Yo! I'm on lap twelve around the plaza. Or nine. Counting is a separate skill.",
      "[happy]There's my favorite training buddy! Keep moving, keep smiling!",
    ],
    greetEvening: [
      "[happy]Evening, {player}! Cool-down time. Deep breath in... and out... Feels great, {catch}!",
      "[neutral]Phew! Long day of training. Stretching is the secret. Never skip it!",
      "[happy]A sunset jog with a friend? That's the best kind of jog!",
    ],
    greetNight: [
      "[sleepy]Whoa, it's late! Muscles grow while you sleep, {player}! Rest up, {catch}!",
      "[surprised]Night training? Bold. I like it. Just don't push too hard, okay?",
      "[sleepy]Bedtime stretches... toe touch... yawn... toe touch... yawn... Do yawns count as reps?",
    ],
    chat: [
      "[happy]I challenged {villager} to a race. They walked the whole way. I still counted it as a win, {catch}!",
      "[happy]Swinging a bug net is great for your shoulders! Bug catching is basically a gym.",
      "[smug]Did fifty push-ups this morning. Okay, fifteen. Fifty is the dream!",
      "[happy]Pemberly says I should try 'resting.' How many sets of that do you do?",
      "[happy]Losing is just winning that hasn't happened yet, {catch}!",
      "[neutral]Hydration check! Have you had any water today? Go on, I'll wait.",
      "[surprised]Hiking the cliff path up to the old lighthouse is the best leg day on the whole island!",
      "[happy]{villager} and I are training for a swim around the dock. Well, I'm training. They're cheering.",
      "[love]The best part of a race isn't winning. It's high-fiving everybody at the finish line, {catch}!",
      "[smug]I asked Fennimore if the new sneakers make you faster. He said 'only if you run in them.' Fair!",
    ],
    rain: [
      "[happy]Rain run! It's like a free cool-down shower while you train, {catch}!",
      "[neutral]Slippery out there. Good day for indoor stretches. And snacks. Mostly snacks.",
      "[happy]Puddle jumps! That's cardio AND fun at the same time!",
    ],
    sunny: [
      "[happy]Sunshine! The beach is calling and I have to answer, {catch}!",
      "[happy]Great day to beat a personal record. Which one? All of them!",
      "[neutral]Sunscreen, water, stretch. That's the sunny day routine. Say it with me!",
    ],
    rainbow: [
      "[surprised]A rainbow! I'm gonna sprint to the end of it, {catch}!",
      "[happy]Rainbows are the sky's finish-line ribbon. Everybody wins today!",
      "[surprised]Whoa! Look at all those colors! That's what a victory lap looks like!",
    ],
    friendLow: [
      "[happy]Hey! New face! Wanna race? No? Maybe later, {catch}!",
      "[neutral]You look like you could use a good stretch. No offense! Everybody could!",
      "[happy]Nice to meet ya! I'm at the beach every dawn if you ever want to train.",
    ],
    friendMid: [
      "[happy]{player}! My training buddy! You're getting faster, I can tell, {catch}!",
      "[happy]I saved you a spot in tomorrow's morning jog. Slow pace, I promise. Medium-slow.",
      "[smug]You and me? We make a great team. Unstoppable, honestly.",
    ],
    friendHigh: [
      "[love]You're my number one teammate, {player}. Always. Forever. Go team, {catch}!",
      "[love]When I'm worn out, I think of you cheering me on, and I find one more lap in my legs!",
      "[happy]Best friends finish every race together. Even if one of us has to walk!",
    ],
    giftLove: [
      "[love]{item}?! No way! That's a gold-medal gift, {player}, {catch}!",
      "[surprised]{item}! You totally get me! I'm doing a victory lap right now!",
      "[love]I love {item} SO much! You're the best, seriously!",
    ],
    giftLike: [
      "[happy]{item}! Thanks a bunch, {player}! You're a champ, {catch}!",
      "[happy]Nice! {item}! That's a solid pick!",
      "[happy]Ooh, {item}! I'm keeping this right next to my jump rope.",
    ],
    giftNeutral: [
      "[neutral]{item}? Cool, cool. Thanks, {player}!",
      "[neutral]Huh, {item}. Maybe I can use it for... balance training? Thanks, {catch}!",
      "[neutral]Thanks for the {item}! Not really my thing, but every gift is a win!",
    ],
    giftDislike: [
      "[sad]Oh. {item}. It's... not very me. But thanks for trying, {catch}.",
      "[surprised]{item}?! Yikes, that's way too fancy for someone who lives in gym shorts.",
      "[sad]I'm not a fan of {item}, honestly. But hey, you've got team spirit!",
    ],
    requestDeliver: [
      "[happy]{player}! Quick mission: I need {qty} {item}! Ready, set... {catch}!",
      "[neutral]I need {qty} {item} for my training plan. Can you help me out? I'll owe you a race!",
      "[happy]Team challenge! Bring me {qty} {item} and we both win!",
    ],
    requestLost: [
      "[sad]Aw, man! I lost my {item} while jogging somewhere {place}! Help me find it, {catch}?",
      "[surprised]My {item} bounced right out of my pocket {place}! Wanna make the search a race?",
      "[sad]Can't find my {item} anywhere. I think I left it {place} during my cool-down.",
    ],
    requestCatch: [
      "[happy]Bet you can catch the {item}! Show me when you do. I'll be cheering, {catch}!",
      "[smug]Catching the {item} takes real skill. Think you've got what it takes? Prove it!",
      "[happy]I've never seen the {item}! Catch one and bring it here. I'll time you!",
    ],
    requestThanks: [
      "[love]You did it! Gold-medal effort! Here's your prize, {catch}!",
      "[happy]High five! Thanks, {player}! You're a real teammate!",
      "[happy]Record time! Okay, I wasn't timing, but it FELT fast. Thank you!",
    ],
    requestDecline: [
      "[neutral]No sweat! Rest day, I get it. Recovery's important, {catch}.",
      "[happy]All good! I'll tackle it myself. Bonus workout!",
    ],
    requestRemind: [
      "[neutral]Hey, {player}! Still counting on you for that {item}! You got this, {catch}!",
      "[neutral]How's the {item} hunt going? Keep pushing! I believe in you!",
    ],
    movedIn: [
      "[happy]Hey hey! Just moved in! I already found the best jogging loop on Driftlight Isle, {catch}!",
      "[happy]New island, new personal records! Nice to meet ya, {player}!",
      "[surprised]Sand to run on, a river to swim in, cliffs to climb? This island is one big gym!",
    ],
    museum: [
      "[happy]I speed-walked the whole museum in four minutes! Professor Vesper did NOT approve, {catch}.",
      "[surprised]Have you seen how big some of the museum fish are? That's some serious swimming muscle!",
      "[happy]Every donation is a point on the scoreboard! Let's fill that museum up!",
    ],
    festival: [
      "[happy]Lantern Crossing's coming! I'm gonna carry the biggest lantern down to the beach, {catch}!",
      "[love]Lanterns drifting out to sea... it's like a slow-motion race where everybody wins.",
      "[surprised]They're relighting the lighthouse! I'm gonna stand on that cliff and cheer SO loud!",
    ],
    outfit: [
      "[happy]New gear! You look ready to run a race, {catch}!",
      "[surprised]Whoa, cool outfit! Let's jog to the beach and show it off!",
      "[happy]Looking good, {player}! Comfy clothes make fast feet!",
    ],
    heartGift: [
      "[love]Here, {player}! A trophy for my best teammate! Well, a present. Same thing, {catch}!",
      "[happy]You've been with me every step of the way. This one's for you!",
    ],
    bye: [
      "[happy]Catch ya later, {player}! Keep moving, {catch}!",
      "[happy]Bye! Remember to stretch!",
      "[smug]See ya! Race you tomorrow. I'm already winning.",
    ],
  },

  // ---------------------------------------------------------------------------
  // DAPPER: refined, theatrical, fashion and tea
  // ---------------------------------------------------------------------------
  dapper: {
    greetMorning: [
      "[smug]Good morning, {player}. I've already had two cups of tea and polished my shoes, {catch}.",
      "[happy]Ah, morning! The light is so flattering at this hour. On me, at least.",
      "[neutral]Good morning. A fine day begins with a fine outfit. Yours is... charmingly spirited.",
    ],
    greetDay: [
      "[happy]Good afternoon, {player}! Shall we take tea? I insist, {catch}.",
      "[smug]Ah, there you are. I was just admiring my reflection in The Curled Leaf's window. For research.",
      "[happy]Splendid timing! I was in dire need of witty company.",
    ],
    greetEvening: [
      "[happy]Good evening, {player}. The sunset matches my scarf. Coincidence? I think not, {catch}.",
      "[neutral]Ah, evening. The hour for chamomile and quiet reflection.",
      "[smug]Evening! You look rather dashing in this light. Not quite as dashing as me, but close.",
    ],
    greetNight: [
      "[sleepy]Goodness, {player}, it's dreadfully late. Even elegance must sleep, {catch}.",
      "[surprised]Out at this hour? How daring! How mysterious! How... yawn... do pardon me.",
      "[neutral]Ah, a moonlit stroll. The stars make such a lovely accessory.",
    ],
    chat: [
      "[smug]Fennimore got a new hat in at the shop. I bought it before anyone else could blink, {catch}.",
      "[happy]Tea should be steeped with patience and sipped with friends. Ideally from matching cups.",
      "[neutral]I complimented {villager}'s outfit today. They seemed startled. I compliment sincerely, and rarely.",
      "[smug]One should always carry a handkerchief. For emergencies. And for dramatic waving.",
      "[happy]I've been practicing piano. My left hand is brilliant. My right is still finding itself, {catch}.",
      "[surprised]Did you see {villager} wearing stripes with spots? Bold. Brave. Baffling.",
      "[neutral]Pemberly's taste in teacups is impeccable. I've said so three times this week.",
      "[smug]Life is a stage, {player}, and I intend to be extremely well dressed on it, {catch}.",
      "[happy]Music is the finest company. Present company excepted, of course.",
      "[sad]I spilled tea on my best waistcoat. I held a small memorial. It was very moving.",
    ],
    rain: [
      "[angry]Rain! And my good umbrella is drying from yesterday. This is an outrage, {catch}.",
      "[happy]Ah, rain. The perfect excuse for a pot of tea and a dramatic gaze out the window.",
      "[neutral]A gentle drizzle can be quite romantic. A downpour, considerably less so.",
    ],
    sunny: [
      "[happy]Glorious sunshine! Perfect weather for my wide-brimmed hat, {catch}.",
      "[smug]On sunny days I take my tea outdoors. The songbirds are my audience.",
      "[happy]Such radiance! The sun and I have a great deal in common.",
    ],
    rainbow: [
      "[surprised]A rainbow! Seven colors in perfect coordination. Very well dressed, {catch}.",
      "[love]Ah, the sky has outdone itself. Bravo! Encore!",
      "[smug]I've always said violet is the most refined color. Clearly the rainbow agrees.",
    ],
    friendLow: [
      "[neutral]Ah. We haven't been properly introduced. Charmed, I'm sure, {catch}.",
      "[smug]You may call on me any time. Do knock first. And perhaps bring biscuits.",
      "[neutral]Good day to you. I'm something of a connoisseur. Of everything, really.",
    ],
    friendMid: [
      "[happy]{player}! You've grown on me. Like a fine vintage, {catch}.",
      "[happy]I've reserved a teacup just for you. It has a tiny gold rim. You're welcome.",
      "[smug]Our chats are becoming the highlight of my afternoons. Don't tell my piano.",
    ],
    friendHigh: [
      "[love]{player}, my dear friend. You make this island sparkle more than any pearl, {catch}.",
      "[love]If friendship were fashion, ours would be timeless. Truly.",
      "[happy]I would lend you my finest scarf. That is the highest honor I can bestow.",
    ],
    giftLove: [
      "[love]{item}! Exquisite! Simply exquisite! You have impeccable taste, {player}, {catch}!",
      "[surprised]Oh! {item}! I may swoon! Someone fetch me a fainting couch!",
      "[love]{item}... It's perfect. I'm genuinely moved. Pass me my handkerchief, would you?",
    ],
    giftLike: [
      "[happy]{item}! How refined. Thank you, {player}, {catch}.",
      "[happy]Ah, {item}. A tasteful choice. I shall display it prominently.",
      "[smug]{item}? You know me rather well. I approve.",
    ],
    giftNeutral: [
      "[neutral]{item}. How... thoughtful. I shall find it a spot. Somewhere.",
      "[neutral]Ah, {item}. Not quite my style, but the gesture is lovely, {catch}.",
      "[neutral]{item}. Hmm. Perhaps it will look better in the right lighting.",
    ],
    giftDislike: [
      "[angry]{item}?! Dreadfully plain. My decor may never recover, {catch}.",
      "[sad]Oh dear. {item}. I'll accept it, of course. Manners are manners.",
      "[surprised]{item}! That's... certainly a choice. A bold one. Not mine, but bold.",
    ],
    requestDeliver: [
      "[neutral]{player}, a favor, if you please. I require {qty} {item}. It's for a soiree, {catch}.",
      "[smug]I'm designing a new ensemble and need {qty} {item}. Would you be a dear?",
      "[happy]Might you bring me {qty} {item}? You'll be rewarded handsomely, naturally.",
    ],
    requestLost: [
      "[sad]Catastrophe! I've lost my {item} somewhere {place}. Would you be so kind as to search, {catch}?",
      "[surprised]My {item} has vanished! I last saw it {place}. Oh, the drama of it all!",
      "[sad]I was striking a pose {place} and my {item} simply slipped away. Would you help me find it?",
    ],
    requestCatch: [
      "[smug]I'm hosting a little gathering and simply must show off the {item}. Catch one for me, {catch}?",
      "[happy]I hear the {item} is quite the beauty. Would you catch one so I might admire it?",
      "[neutral]The {item}. I've only ever seen it in paintings. Catch one and show me, would you?",
    ],
    requestThanks: [
      "[love]Splendid! You've saved the day, {player}. Please accept this token of my thanks, {catch}.",
      "[happy]Bravo! A performance worthy of a standing ovation!",
      "[happy]My deepest gratitude. You are a true friend, and a stylish one at that.",
    ],
    requestDecline: [
      "[neutral]Ah, a pity. But I understand. One mustn't overcommit, {catch}.",
      "[sad]No matter. I shall persevere, dramatically and alone.",
    ],
    requestRemind: [
      "[neutral]A gentle reminder, {player}: the {item}. I await it with bated breath, {catch}.",
      "[smug]Any news of the {item}? I've already cleared a place of honor for it.",
    ],
    movedIn: [
      "[smug]Greetings! I have arrived. You may now consider this island fashionable, {catch}.",
      "[happy]Driftlight Isle! What a charming little place. I've already unpacked my teacups.",
      "[neutral]Delighted to meet you, {player}. Do tell me where one acquires quality tea leaves around here.",
    ],
    museum: [
      "[happy]Professor Vesper curates with such flair. The lighting alone deserves an award, {catch}.",
      "[surprised]Have you seen the fossils in the museum? Ancient AND dramatic. My favorite combination.",
      "[smug]Collecting is an art. Every piece in that museum has a story to tell. Rather like me.",
    ],
    festival: [
      "[happy]The Lantern Crossing! I've had my outfit planned for weeks. Weeks, {catch}.",
      "[love]Lanterns on the sea, the lighthouse ablaze... It shall be the most elegant night of the year.",
      "[smug]I intend to release my lantern with a graceful bow. I've been rehearsing in the mirror.",
    ],
    outfit: [
      "[smug]Ah, a fine new outfit. Very stylish, {catch}.",
      "[happy]You dress with real style. Bravo!",
      "[surprised]My word! Those clothes suit you perfectly, {player}.",
    ],
    heartGift: [
      "[love]For you, my dear friend. A gift as fine as our friendship, {catch}.",
      "[happy]Please, accept this. I chose it myself, with considerable flair.",
    ],
    bye: [
      "[happy]Farewell, {player}! Do stay fabulous, {catch}.",
      "[smug]Until we meet again. And... exit, stage left!",
      "[neutral]Good day. Mind your posture!",
    ],
  },

  // ---------------------------------------------------------------------------
  // SPUNKY: adventurous, climbing, bugs, harmless mischief
  // ---------------------------------------------------------------------------
  spunky: {
    greetMorning: [
      "[happy]Morning, {player}! I already climbed three trees and found a beetle, {catch}!",
      "[happy]Up and at 'em! Adventure doesn't wait for anybody!",
      "[surprised]Whoa, you're up! I was gonna leave a pinecone on your doorstep. Uh. Forget I said that.",
    ],
    greetDay: [
      "[happy]Hey, {player}! Wanna go look under rocks? It's the best, {catch}!",
      "[smug]Psst! I know a secret spot. I'll show you. Maybe. If you can keep up!",
      "[happy]Yo! Today's the perfect day for exploring. Every day is, actually!",
    ],
    greetEvening: [
      "[happy]Evening! The bugs get extra sneaky about now. Gotta be sneakier, {catch}!",
      "[neutral]Hey, {player}. Wanna watch the sunset from the top of a tree? Best seats on the island!",
      "[happy]Golden hour! Everything looks like treasure right now!",
    ],
    greetNight: [
      "[surprised]Shh! Fireflies! Don't scare 'em, {player}, {catch}!",
      "[happy]Night adventure buddy! Got a lantern? We're gonna need a lantern.",
      "[sleepy]I'm not tired. Nope. I could climb all night. ...Yawwwn. Okay, a little tired.",
    ],
    chat: [
      "[happy]I climbed the tallest tree on the island! Got a little stuck at the top. Totally worth it, {catch}!",
      "[smug]I left a frog in {villager}'s mailbox. Don't worry, the frog was in on it!",
      "[surprised]There's a beetle out there with a horn as long as my arm! Okay, my finger. Still!",
      "[happy]Every rock is a door to a whole tiny world. Flip 'em gently and put 'em back, though, {catch}!",
      "[happy]If I could be any bug, I'd be a firefly. A glowing tail? Iconic.",
      "[neutral]Pemberly told me not to climb the roof of Lantern Hall. So I'm only thinking about it. Real hard.",
      "[surprised]I found a spot by the cliffs with an echo! I yelled my name and it yelled back. Rude, but cool, {catch}.",
      "[happy]{villager} and I are building a secret fort. You can join! The password is... uh... I forgot it.",
      "[smug]Bet I can find more bugs than you today. Loser buys snacks at The Curled Leaf!",
      "[happy]Maps are cool, but getting a little lost is cooler. That's where all the good stuff is!",
    ],
    rain: [
      "[happy]Rain means snails come out! Snails are slow, but they're SO cool, {catch}!",
      "[surprised]Mud! Perfect camouflage. Watch me vanish. ...Can you still see me? Darn.",
      "[neutral]Trees are too slippery to climb in the rain. Puddle jumping, though? Fully allowed.",
    ],
    sunny: [
      "[happy]Sunny skies, bugs everywhere! Grab your net, {catch}!",
      "[happy]Great day to explore every corner of the island. Twice!",
      "[smug]The butterflies are out today. I've got moves they won't see coming.",
    ],
    rainbow: [
      "[surprised]A rainbow! If I climb the tallest tree, maybe I can touch it, {catch}!",
      "[happy]Rainbows mean treasure! Probably! Let's go look!",
      "[surprised]Whoa! Did you see that?! I'm officially naming that rainbow Sir Sparkles.",
    ],
    friendLow: [
      "[neutral]Hey. You any good at climbing? Guess we'll find out, {catch}.",
      "[smug]New neighbor, huh? Bet you don't know where the rare bugs hide. I do.",
      "[happy]Hi! I'm sizing you up for adventure-buddy potential. Looking good so far!",
    ],
    friendMid: [
      "[happy]{player}! You're turning into a real explorer. I'm proud of ya, {catch}!",
      "[smug]You've earned my second-best secret spot. The first-best is still classified.",
      "[happy]Adventures are way better with you around. More snacks, too!",
    ],
    friendHigh: [
      "[love]You're my best adventure buddy ever, {player}! Ever ever, {catch}!",
      "[love]I'd show you my secret spot. The REAL one. That's a huge deal.",
      "[happy]Wherever you're going, I'm coming too. Even if it's just to the shop.",
    ],
    giftLove: [
      "[love]{item}?! No WAY! This is the coolest thing ever, {player}, {catch}!",
      "[surprised]{item}! I've wanted one of these forever! You're amazing!",
      "[love]You got me {item}?! I'm gonna do a backflip! ...Okay, a little hop. Still counts!",
    ],
    giftLike: [
      "[happy]Sweet! {item}! Thanks, {player}, {catch}!",
      "[happy]{item}! This is rad. Going straight into my treasure pile.",
      "[happy]Oh cool, {item}! You've got good instincts!",
    ],
    giftNeutral: [
      "[neutral]{item}? Huh. Okay! I'll find a use for it. Maybe a bug house?",
      "[neutral]Thanks for the {item}, {catch}. It's... a thing! I like things.",
      "[neutral]{item}. Not super adventurous, but hey, thanks!",
    ],
    giftDislike: [
      "[angry]{item}? Way too fancy! I can't climb with this, {catch}!",
      "[sad]Aw, {item}. It's kinda... boring? Sorry. Thanks, though.",
      "[surprised]{item}?! What do I even DO with this? Wear it to a tea party?",
    ],
    requestDeliver: [
      "[happy]{player}! Secret mission: bring me {qty} {item}. Don't ask why. Okay, it's for my fort, {catch}!",
      "[smug]I need {qty} {item} for a top-secret project. Can you help? There's a reward!",
      "[happy]Quick! I need {qty} {item}! Adventure depends on it! Kinda!",
    ],
    requestLost: [
      "[sad]I lost my {item}! I was climbing somewhere {place} and it fell outta my pocket, {catch}!",
      "[surprised]My {item} is gone! Maybe a sneaky bug took it? Last seen {place}!",
      "[sad]Help! I hid my {item} {place} for safekeeping and now I can't find it. I'm too good at hiding.",
    ],
    requestCatch: [
      "[happy]I wanna see the {item} up close! Catch one and bring it to me, {catch}!",
      "[smug]Catching the {item} is tough. Even I couldn't do it. Wanna try?",
      "[surprised]Somebody spotted the {item} today! Can you catch one and show me? Pleeease?",
    ],
    requestThanks: [
      "[love]You're the best, {player}! Mission complete! Here's your reward, {catch}!",
      "[happy]You did it! I knew you could! Adventure buddies forever!",
      "[happy]Woohoo! Thanks a ton! I'm gonna go do a victory climb!",
    ],
    requestDecline: [
      "[neutral]Aw, okay. I'll go on a solo adventure then, {catch}!",
      "[happy]No biggie! Maybe next time, adventure buddy!",
    ],
    requestRemind: [
      "[neutral]Hey! Didja forget about the {item}? Just checkin', {catch}!",
      "[happy]Still waiting on that {item}! The mission's still on!",
    ],
    movedIn: [
      "[happy]Hey! Just moved in! I already climbed four trees and fell out of one, {catch}!",
      "[surprised]An island with cliffs AND a forest AND a lighthouse? I'm never leaving!",
      "[happy]I'm Driftlight Isle's newest explorer! Wanna show me around? Or I'll show YOU around!",
    ],
    museum: [
      "[happy]The bug room at the museum is the coolest place ever, {catch}!",
      "[surprised]Professor Vesper reads hanging upside down! I tried it. Got super dizzy.",
      "[smug]I bet I can find a bug the museum doesn't have yet. Game on!",
    ],
    festival: [
      "[happy]Lantern Crossing! I'm gonna climb the tallest tree and watch the lanterns float away, {catch}!",
      "[surprised]The lighthouse is gonna light up again? I've always wanted to see the top!",
      "[happy]I'm painting fireflies on my lantern. Glowing stuff on glowing stuff. Genius!",
    ],
    outfit: [
      "[surprised]Whoa! New clothes! You look like an explorer, {catch}!",
      "[happy]That outfit is awesome! Want to climb a tree in it?",
      "[happy]Cool look, {player}! Very zippy!",
    ],
    heartGift: [
      "[love]Here! This is for you, my best adventure buddy! Don't lose it, {catch}!",
      "[happy]I found this on an adventure and thought of you right away. It's yours now!",
    ],
    bye: [
      "[happy]See ya, {player}! Stay adventurous, {catch}!",
      "[happy]Later! I'm off to find a bug!",
      "[smug]Bye! I'll be in a tree if you need me. Good luck figuring out which one!",
    ],
  },

  // ---------------------------------------------------------------------------
  // DREAMY: poetic, colors, art, sleepy wonder
  // ---------------------------------------------------------------------------
  dreamy: {
    greetMorning: [
      "[sleepy]Mornin', {player}... The sky is the color of peach jam right now, {catch}.",
      "[happy]Good morning! I dreamed I was a cloud. I still feel a little floaty.",
      "[sleepy]Oh... is it morning? The dew looks like tiny stars that forgot to go home.",
    ],
    greetDay: [
      "[happy]Hello, {player}! The light is so soft today. Everything looks painted, {catch}.",
      "[neutral]Hi... I was counting the colors in a puddle. I got up to eleven.",
      "[happy]Oh, it's you! You have a very lovely shade of hello.",
    ],
    greetEvening: [
      "[love]Good evening... The sunset is melting into the sea. Isn't it dreamy, {catch}?",
      "[happy]Evening, {player}! The sky is wearing all its best colors tonight.",
      "[sleepy]The evening feels like a lullaby. Can you hear it too?",
    ],
    greetNight: [
      "[sleepy]Hello, night friend... The moon is so bright, I could paint by it, {catch}.",
      "[happy]Oh! {player}! Did you come out to see the stars too?",
      "[sleepy]I'm a little sleepy... but the night is too pretty to close my eyes.",
    ],
    chat: [
      "[happy]I painted the sea yesterday. It kept changing color, so I painted it again. And again, {catch}.",
      "[sleepy]Do you think clouds have dreams? I think they dream about being rain.",
      "[happy]{villager} let me paint their portrait. I added a tiny star on their nose. They liked it!",
      "[love]Some colors don't have names yet. I'm collecting them, {catch}.",
      "[neutral]I tried to paint the wind. It's mostly swirls. Very swirly swirls.",
      "[happy]The lanterns at Lantern Hall glow like warm honey. I want to paint every single one.",
      "[sleepy]Sometimes I lie by the river and let my thoughts float downstream, {catch}.",
      "[surprised]Have you noticed? {villager}'s laugh is the exact color of lemon drops.",
      "[happy]Every shell on the beach is a little poem the sea wrote.",
      "[sad]I lost my favorite paintbrush. Maybe it's off painting a sunset somewhere without me.",
    ],
    rain: [
      "[happy]Raindrops on the pond make circles inside circles. The sky is doodling, {catch}.",
      "[sleepy]Rain makes the whole island hum a soft song. Perfect for napping.",
      "[love]I love the rain. Everything shimmers like it's been freshly painted.",
    ],
    sunny: [
      "[happy]The sunlight is so golden today. Like honey on toast, {catch}.",
      "[sleepy]Warm sun... soft grass... I could drift away right here.",
      "[happy]Sunny days make the sea sparkle like someone spilled glitter.",
    ],
    rainbow: [
      "[love]A rainbow... The sky is painting just for us, {catch}.",
      "[surprised]Oh! All my favorite colors in one place! Where's my sketchbook?",
      "[happy]I want to dip my brush right into that rainbow and keep it forever.",
    ],
    friendLow: [
      "[neutral]Oh, hello. Your color is... hmm. A pale blue, maybe? Nice to meet you, {catch}.",
      "[sleepy]Hi... sorry, I was daydreaming. Have we met? I feel like we've met in a dream.",
      "[happy]Nice to meet you. I'm still learning your colors.",
    ],
    friendMid: [
      "[happy]{player}! Your colors get brighter every time I see you, {catch}.",
      "[happy]I painted a little picture of you. You're standing in a field of moonflowers.",
      "[love]Talking with you feels like watching clouds. Calm, and nice, and a little magic.",
    ],
    friendHigh: [
      "[love]You're the brightest color in my whole world, {player}, {catch}.",
      "[love]If I painted our friendship, I'd need every color there is. And a few brand-new ones.",
      "[happy]I dream about our adventures sometimes. In my dreams, we can fly.",
    ],
    giftLove: [
      "[love]{item}! It's beautiful! It makes my heart go all watercolor, {catch}.",
      "[surprised]Oh, {item}! It's like you pulled it right out of my dreams!",
      "[love]{item}... I'm going to paint it. Then hug it. Then paint it again.",
    ],
    giftLike: [
      "[happy]{item}! What a lovely color. Thank you, {player}, {catch}.",
      "[happy]Ooh, {item}. This is going to inspire a painting, I can feel it.",
      "[happy]{item} for me? That's so sweet. Like cotton candy.",
    ],
    giftNeutral: [
      "[neutral]{item}... Hmm. I'll see if it wants to be in a painting, {catch}.",
      "[neutral]Oh, {item}. Thank you. It's very... solid.",
      "[neutral]{item}. I'll put it somewhere the light can find it.",
    ],
    giftDislike: [
      "[sad]{item}? It's so... gray. My heart went a little gray too, {catch}.",
      "[sad]Oh... {item}. It doesn't really sing to me. But thank you.",
      "[surprised]{item}? It's very... loud. My dreams prefer quiet things.",
    ],
    requestDeliver: [
      "[happy]{player}... I need {qty} {item} for a new painting. Could you bring them, {catch}?",
      "[sleepy]I dreamed about {qty} {item} last night. Could you help make the dream come true?",
      "[happy]Would you find {qty} {item} for me? I want to capture their colors.",
    ],
    requestLost: [
      "[sad]I was daydreaming {place} and my {item} drifted away. Could you look for it, {catch}?",
      "[surprised]My {item}! It's gone! The last time I saw it was somewhere {place}.",
      "[sad]I think I left my {item} somewhere {place}. Or did I dream that? Could you check?",
    ],
    requestCatch: [
      "[happy]I want to paint the {item}. Could you catch one and show me, {catch}?",
      "[sleepy]I saw the {item} in a dream. Is it real? Could you catch one for me?",
      "[happy]The {item} must have such pretty colors. Would you catch one so I can see it up close?",
    ],
    requestThanks: [
      "[love]Thank you, {player}! You made my day so much brighter, {catch}.",
      "[happy]You're wonderful! Here, a little something for you.",
      "[love]This is perfect. You're like a shooting star that grants wishes.",
    ],
    requestDecline: [
      "[neutral]That's okay. Some wishes just float away, {catch}.",
      "[sleepy]No worries... I'll daydream about it instead.",
    ],
    requestRemind: [
      "[neutral]Um, {player}... Did you find the {item} yet? No hurry, {catch}.",
      "[sleepy]I keep dreaming about the {item}. I hope you find it soon.",
    ],
    movedIn: [
      "[happy]Hello... I just moved here. The sea has so many colors, I may never stop painting, {catch}.",
      "[sleepy]I followed a cloud all the way to Driftlight Isle. It seemed like a sign.",
      "[happy]Nice to meet you, {player}. I hope we become friends. You have a very warm color.",
    ],
    museum: [
      "[happy]The fish tanks at the museum glow like living paintings, {catch}.",
      "[love]Professor Vesper says every fossil is a memory the earth decided to keep. Isn't that lovely?",
      "[sleepy]I like sitting in the museum when it's quiet. The old bones tell dreamy stories.",
    ],
    festival: [
      "[love]The Lantern Crossing... hundreds of little lights drifting into the dark. Like stars going home, {catch}.",
      "[happy]I'm painting my lantern with every color of the sunset, so it glows warm all the way out to sea.",
      "[surprised]When the lighthouse shines again, I think the whole sea will sparkle back at it.",
    ],
    outfit: [
      "[love]Your outfit is like a painting, {catch}. So many pretty colors!",
      "[happy]Ooh, I want to paint you in those clothes!",
      "[sleepy]You look like a soft cloud today. I like it, {player}.",
    ],
    heartGift: [
      "[love]For you, {player}. I made it while thinking of you. It's full of happy colors, {catch}.",
      "[happy]Here... a little gift. Because you make my world brighter.",
    ],
    bye: [
      "[happy]Bye, {player}... Sweet dreams, even if it's daytime, {catch}.",
      "[sleepy]See you... I'm going to go watch some clouds.",
      "[happy]Farewell! May your day be full of soft colors.",
    ],
  },

  // ---------------------------------------------------------------------------
  // MELLOW: laid-back, naps, stars, slow sayings
  // ---------------------------------------------------------------------------
  mellow: {
    greetMorning: [
      "[sleepy]Mornin', {player}... Oh, I haven't been to bed yet. Stars were too good, {catch}.",
      "[sleepy]Is it morning already? The sun's always in such a hurry.",
      "[neutral]Hey. Early bird, huh? I'm more of a late worm. Different schedule.",
    ],
    greetDay: [
      "[neutral]Hey, {player}. No rush. Just enjoying the breeze, {catch}.",
      "[sleepy]Afternoon... Perfect nap weather. Then again, it always is.",
      "[happy]Oh, hey. Pull up a patch of grass. It's free.",
    ],
    greetEvening: [
      "[happy]Evening, {player}. The first stars are waking up, {catch}.",
      "[neutral]Hey there. Evening's my favorite. The day's done hurrying.",
      "[happy]Sun's setting nice and slow. I respect that.",
    ],
    greetNight: [
      "[happy]Ah, {player}. Perfect night for stargazing. Want to join me, {catch}?",
      "[neutral]Hey, night owl. The sky's really showing off tonight.",
      "[sleepy]Nighttime... my time. Look up. Just... look up.",
    ],
    chat: [
      "[sleepy]A nap in the afternoon is worth two in the morning. That's a saying. I made it up, {catch}.",
      "[neutral]Saw {villager} rushing around earlier. Everything's still gonna be there later, y'know?",
      "[happy]There's a bright star that sits right over the old lighthouse. I call it the Nightlight.",
      "[neutral]The river never rushes, but it still gets to the sea. Think about it, {catch}.",
      "[sleepy]There's a real comfy bench outside Lantern Hall. I've tested it. Extensively.",
      "[happy]I like music that sounds the way a hammock feels.",
      "[neutral]Fennimore asked if I wanted to buy a clock. I said no. Time finds me anyway.",
      "[sleepy]Sometimes I lie on the beach and let the waves do the counting, {catch}.",
      "[happy]{villager} brought me cocoa last night. Good neighbor. Good cocoa.",
      "[neutral]Stars are just really old lights saying hi from far away. Kinda sweet when you think about it.",
    ],
    rain: [
      "[sleepy]Rain on the roof... best lullaby there is, {catch}.",
      "[neutral]Probably no stars tonight. That's okay. They'll wait.",
      "[happy]Rain day means nap day. Those are the rules. I didn't make 'em. Okay, I did.",
    ],
    sunny: [
      "[sleepy]Sunshine and a hammock. That's the whole plan, {catch}.",
      "[neutral]Bright one today. I'll find a shady spot and think about nothing.",
      "[happy]Clear skies today mean clear stars tonight. Good trade.",
    ],
    rainbow: [
      "[surprised]Oh. A rainbow. Nice. Real nice, {catch}.",
      "[happy]Rainbows don't stick around long. That's what makes 'em special.",
      "[neutral]I'm just gonna lie here and watch it fade. No rush.",
    ],
    friendLow: [
      "[neutral]Oh, hey. New around here? Cool. Cool cool, {catch}.",
      "[sleepy]Hi. Sorry, I was halfway into a nap. What's up?",
      "[neutral]Take it slow, new friend. The island's not going anywhere.",
    ],
    friendMid: [
      "[happy]{player}, you're good company. Real easy to be around. I like that, {catch}.",
      "[happy]I saved you a spot on my stargazing blanket. Bring snacks.",
      "[neutral]You remind me of a comfy pillow. That's a compliment. A big one.",
    ],
    friendHigh: [
      "[love]You're my favorite star, {player}. Brighter than all the rest, {catch}.",
      "[love]Hanging out with you is better than a nap. And I really, really like naps.",
      "[happy]I named a constellation after you. It's the one that looks like a friend waving.",
    ],
    giftLove: [
      "[love]{item}... whoa. This is perfect, {player}. Thank you, {catch}.",
      "[surprised]{item}? For real? I'm wide awake now. Totally awake.",
      "[love]{item}... I'm gonna treasure this. Maybe nap right next to it.",
    ],
    giftLike: [
      "[happy]{item}. Cool. Thanks, {player}, {catch}.",
      "[happy]Oh, nice. {item}. That's real thoughtful.",
      "[happy]{item}, huh? I like it. Comfy vibes.",
    ],
    giftNeutral: [
      "[neutral]{item}. Okay. Thanks, {catch}.",
      "[neutral]{item}... I'll find it a spot. Eventually. No rush.",
      "[sleepy]{item}. Neat. ...Sorry, I yawned. It's not you, promise.",
    ],
    giftDislike: [
      "[sad]{item}? That's a lot of... energy. Not really my speed, {catch}.",
      "[sad]Oh. {item}. Hm. I'll, uh, think about it later. Much later.",
      "[surprised]{item}... Whoa, that's too busy for me. Thanks for thinking of me, though.",
    ],
    requestDeliver: [
      "[neutral]Hey, {player}... could you grab me {qty} {item}? No rush, {catch}.",
      "[sleepy]I need {qty} {item}, but getting up is... a lot. Help a pal out?",
      "[neutral]If you've got a sec... {qty} {item}? Whenever. Seriously, whenever.",
    ],
    requestLost: [
      "[sleepy]I dozed off {place}, and when I woke up my {item} was gone. Help me look, {catch}?",
      "[neutral]Lost my {item}. Somewhere {place}, I think. It'll turn up. ...Probably with your help.",
      "[sad]My {item}'s gone missing. Last saw it {place}. Mind keeping an eye out?",
    ],
    requestCatch: [
      "[neutral]I've been wondering about the {item}. Could you catch one so I can see it, {catch}?",
      "[sleepy]I'd go catch the {item} myself, but... naps. Would you?",
      "[happy]Heard the {item} is around today. Catch one and show me? I'll be right here. Not moving.",
    ],
    requestThanks: [
      "[love]Thanks, {player}. You're a real star. Here, this is for you, {catch}.",
      "[happy]Nice work. Knew I could count on you. Slow and steady.",
      "[happy]Appreciate it, friend. Means a lot. Really.",
    ],
    requestDecline: [
      "[neutral]That's cool. No worries, {catch}.",
      "[sleepy]Alright. I'll just... figure it out. Tomorrow. Maybe.",
    ],
    requestRemind: [
      "[neutral]Hey... about that {item}. No rush. Just, y'know, remembering out loud, {catch}.",
      "[sleepy]Still waiting on the {item}. Patiently. Very patiently.",
    ],
    movedIn: [
      "[sleepy]Hey... just moved in. Took a nap before unpacking. Good nap, {catch}.",
      "[happy]Driftlight Isle's got great skies. You can see every star out here.",
      "[neutral]Nice to meet you, {player}. I'm the slow one. You'll get used to it.",
    ],
    museum: [
      "[happy]The museum's nice and quiet. Professor Vesper doesn't mind if I nap on the bench, {catch}.",
      "[neutral]Old fossils... they've been waiting a long, long time. Patient folks. I relate.",
      "[sleepy]Professor Vesper knows a lot about the night sky. We stay up way too late talking about it.",
    ],
    festival: [
      "[happy]Lantern Crossing's coming. Lanterns on the sea, stars in the sky... gonna be good, {catch}.",
      "[love]When that old lighthouse lights up again, I bet the stars get a little jealous.",
      "[sleepy]I'm gonna lie on the beach and watch every lantern drift away. Every single one.",
    ],
    outfit: [
      "[sleepy]Mmm, new clothes? They look cozy, {catch}.",
      "[happy]That outfit looks nice. Like a calm night sky.",
      "[sleepy]You look comfy. Maybe comfy enough for a nap, {player}?",
    ],
    heartGift: [
      "[love]Here, {player}. Made you something. Took a while. Worth it, {catch}.",
      "[happy]This is for you. 'Cause you're the best. That's it. That's the reason.",
    ],
    bye: [
      "[sleepy]See ya, {player}. Take it easy, {catch}.",
      "[neutral]Later. Don't rush.",
      "[happy]Bye. Look up tonight. The stars'll be there.",
    ],
  },
};

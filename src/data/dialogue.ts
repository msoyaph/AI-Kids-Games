/**
 * Villager dialogue. Placeholders: {name} = player nickname, {farm} = farm name, {pet} = pet name.
 * Seasons are [spring, summer, autumn, winter]. Hearts lines unlock at 3, 6 and 9 hearts.
 */
import type { DialogueSet } from './story-types';

export const DIALOGUE: Record<string, DialogueSet> = {
  // ─────────────────────────────── Mayor Bram ───────────────────────────────
  bram: {
    intro: "Well, butter my beans! You must be {name}! Rosemary's family is our family. I'm Mayor Bram. Welcome to Cliff Valley!",
    daily: [
      "Good morning, {name}! I hope your day is un-be-leaf-ably good.",
      "Lettuce celebrate! It's another fine day in Cliff Valley.",
      "I made a to-do list this morning. Now where did I put it? Oh! It's in my hat.",
      "Have you checked the boards in the Valley Hall lately? Every little bit helps!",
      "Why did the tomato blush? It saw the salad dressing! Ha! That one never gets old.",
      "A mayor's job is mostly listening. And snacks. But mostly listening.",
      "I keep meaning to fix the Hall door hinge myself. Any day now! Probably.",
      "How's {farm} coming along? I bet your rows are looking turnip-tastic!",
      "Juno says I tell too many veggie jokes. I say there's always room for one pea more.",
    ],
    season: [
      ["Spring is here! Let's make like radishes and root for each other!", "The Sprout Fair is on Spring 8. Don't forget! I almost forget every year."],
      ["Phew, it's hot! Even the cucumbers are trying to keep cool.", "Summer is when the valley really ripens. Like a big, happy tomato!"],
      ["Autumn leaves, pumpkin pies... this is my gourd-geous season!", "The Harvest Show is coming. I've judged it for years and I still can't pick a favorite squash."],
      ["Brr! My beard is basically a scarf now.", "Winter is a fine time for planning. And for cocoa. Mostly cocoa."],
    ],
    rain: [
      "Rain, rain, good for grain! And for my rain boots. They love puddles.",
      "A rainy day means the crops get a drink. Nature's own watering can!",
      "I got so wet walking here, I'm practically a soggy celery stick.",
    ],
    hearts: {
      3: [
        "You know, {name}, you've been a real help. I'm not used to that. I usually try to do everything myself.",
        "I wrote 'ask for help' on my to-do list. Then I lost the list. Ha... that's a bit of a problem, isn't it?",
      ],
      6: [
        "Being mayor means everyone counts on you. Sometimes I forget I can count on them, too.",
        "Juno helped me fix the Hall's squeaky bench today. I just... asked her. And it worked! What a discovery!",
      ],
      9: [
        "Rosemary once told me, 'A valley is built by many hands.' I finally understand it. Thanks to you.",
        "I asked three people for help this week, {name}. Three! I'm practically a pro. You taught me that.",
      ],
    },
    birthday: "It's my birthday? Oh my sweet potatoes, I forgot again! Thank you for remembering, {name}!",
    gift: {
      love: "Oh my gourd! This is my favorite! You really know me, {name}!",
      like: "How kind! This is a-maize-ing. Thank you!",
      neutral: "Why, thank you! Every gift is a good gift.",
      dislike: "Oh! Hmm. This isn't quite my thing, but it was very thoughtful of you.",
      birthday: "A birthday present? For me? I'm as happy as a pea in a pod!",
    },
    places: {
      hall: "This old Hall has heard every valley story. Soon it'll hear lots of new ones, I hope!",
      cafe: "Sunny's soup is the best. I'm not just saying that because I'm hungry. Okay, I'm also hungry.",
      town: "Look at our plaza! A little cracked here and there, but full of heart.",
      houseOakes: "Welcome to our home! Mind the piano. Juno says I play it like a potato. A cheerful potato!",
    },
    festival: {
      sprout: "Welcome to the Sprout Fair! On your marks, get set, GROW! Er, plant! Plant first!",
      berry: "The Berry Bash is my berry favorite day. Get it? Berry? I'll be here all summer!",
      harvest: "Welcome to the Harvest Show! Every veggie here is a winner. But only one gets the blue ribbon!",
      starlight: "Look at all the lanterns, {name}. On Starlight Night, the whole valley shines together.",
    },
    postgame: "The Valley Hall is open again! I didn't fix it alone, and I'm so glad. We did it together, {name}!",
  },

  // ─────────────────────────────── Pippa ───────────────────────────────
  pippa: {
    intro: "Hi-hello-welcome! I'm Pippa! I run Thistle's General Store. Seeds, tools, snacks, all sorted by color AND size!",
    daily: [
      "Fun fact! Young sunflowers turn to follow the sun across the sky. Like a little plant fan club!",
      "Quick-quick, before I forget: I restocked the seed shelf. Alphabetical order. You're welcome!",
      "Did you know some seeds can sleep for years before they sprout? Talk about a long nap!",
      "I made a list of all my lists today. Very productive. Very exciting.",
      "Strawberries wear their seeds on the outside! About two hundred per berry. I counted. Once.",
      "Busy-busy-busy! But never too busy to say hi to you, {name}!",
      "Water in the morning, and your crops get a long drink before the sun gets hot. Tip of the day!",
      "Carrots used to be purple, you know! Then someone grew orange ones and everybody went wild.",
    ],
    season: [
      ["Spring seeds are in! Radishes, lettuce, carrots, potatoes, strawberries! Okay, breathe, Pippa.", "Plant early in spring and you'll get more harvests before summer. Math is delicious!"],
      ["Summer seeds! Tomatoes, corn, blueberries, sunflowers! My favorite season to restock!", "Corn grows so tall in summer. Taller than me! Which, okay, isn't saying much."],
      ["Pumpkins! Cranberries! Kale! Autumn seeds are here and they're very cozy.", "Fun fact: ripe cranberries bounce! Boing! Nature is the best."],
      ["Winter's quiet at the store. I'm reorganizing. Again. It's relaxing!", "Nothing grows outside in winter, but that's when farmers plan. Plans are seeds for ideas!"],
    ],
    rain: [
      "Rain day! Free watering for everyone. The clouds are my favorite coworkers.",
      "I love the sound of rain on the store roof. It's like a thousand tiny drummers!",
    ],
    hearts: {
      3: [
        "Can I tell you a secret dream? A seed library! Neighbors borrow seeds, grow them, and bring new seeds back.",
        "Every seed packet in my store has a story. I'd love for the whole valley to share those stories.",
      ],
      6: [
        "I'm writing down which seeds grow best in our valley soil. Pages and pages! For the seed library, someday.",
        "You helped me believe my seed library isn't a silly idea. That means a lot, {name}. Like, a LOT a lot.",
      ],
      9: [
        "You're the friend I'd lend my rarest seeds to. And that's the biggest compliment I know!",
        "Your name is first in the seed library borrowing book. It's already written. In my best pen!",
      ],
    },
    birthday: "It's my birthday! I have a schedule for it: cake at noon, happy dance at one. You're invited to both!",
    gift: {
      love: "Oh-oh-oh! I LOVE this! How did you know? Did you make a list? You made a list, didn't you!",
      like: "Ooh, nice! This is going right on my favorite shelf. Thank you!",
      neutral: "Thanks, {name}! I'll find the perfect spot for it.",
      dislike: "Oh! That's so kind of you. It's not really my thing, but I love that you thought of me.",
      birthday: "A birthday gift? For me? I'm so happy I could sprout! Thank you thank you thank you!",
    },
    places: {
      store: "Welcome to Thistle's! If you can't find it, ask me. If I can't find it, it doesn't exist!",
      cafe: "Sunny's juice is the perfect after-work treat. Shh, I'm relaxing. For five whole minutes!",
      town: "The town garden is my happy place. Look at those tulips! Perfectly spaced. Ahh.",
    },
    festival: {
      sprout: "The seed-planting race! Tip: dig, drop, pat, next! Dig, drop, pat, next! GO GO GO!",
      berry: "Berry Bash! Pick fast but gently. Squished berries don't count. I checked the rules!",
      harvest: "Harvest Show! I sold half the seeds for these crops, you know. I'm like a proud seed-grandma.",
      starlight: "Starlight Night is so pretty. I wrapped my secret gift in three layers. Organized layers!",
    },
    postgame: "The Hall is open! I'm putting a seed library shelf right by the door. Borrow a seed, bring back a seed!",
  },

  // ─────────────────────────────── Grit ───────────────────────────────
  grit: {
    intro: "Grit. Blacksmith. I fix tools and crack geodes. You need something, ask.",
    daily: [
      "Hm. Morning.",
      "Bring me a geode. I'll crack it. Best sound in the world.",
      "Hot fire today. Good for work.",
      "Your tools look fine. Keep them that way.",
      "Lumi wants another gadget. Third one this week. ...I don't mind.",
      "Rocks have stories. You just have to listen. Hard.",
      "Ate at the café. Sunny sang. Loudly. Good soup, though.",
      "Upgrading tools takes metal bars and patience. Mostly patience.",
    ],
    season: [
      ["Spring. Mud everywhere. Wipe your boots.", "Flowers blooming. Fine. They're... fine."],
      ["Hot outside. Hotter in here. I like it.", "Summer. Long days. More time at the anvil."],
      ["Autumn. Leaves crunch like gravel. Good sound.", "My birthday's in autumn. Don't make a fuss. ...Small fuss is okay."],
      ["Cold out. The forge is warm. Stay a minute.", "Snow is quiet. I like quiet. Helps me... think."],
    ],
    rain: [
      "Rain. Good day to polish tools.",
      "Rain on the roof. Sounds like tiny hammers.",
    ],
    hearts: {
      3: [
        "You saw my notebook. It's... notes. About metal. ...Fine. Some of them rhyme.",
        "Don't tell anyone. I write things. Small things. About rocks and fire.",
      ],
      6: [
        "Wrote a new poem. About a geode. Plain outside, sparkly inside. Like some people.",
        "Words are like metal. Heat them up, bend them, try again. Takes practice.",
      ],
      9: [
        "You're my friend, {name}. Easy to say. Took me a long time to say it.",
        "Been thinking. Maybe I'll read a poem out loud someday. If you're there.",
      ],
    },
    birthday: "Birthday. Yeah. ...Thanks for remembering. Means something.",
    gift: {
      love: "...Whoa. This is great. Really great. Thanks.",
      like: "Good stuff. Thanks.",
      neutral: "Hm. Thanks.",
      dislike: "Not my thing. But you thought of me. That counts.",
      birthday: "For my birthday? ...You didn't have to. Glad you did.",
    },
    places: {
      smithy: "Watch the anvil. It's older than both of us.",
      town: "Fresh air. Too much of it. Back to the forge soon.",
      cafe: "Café's warm. Sunny's loud. It works.",
    },
    festival: {
      sprout: "Planting race. Not my thing. I'm here for the snacks.",
      berry: "Picked three berries. Ate three berries. Strategy.",
      harvest: "Lots of big vegetables. Good shapes. Nice and round. Like geodes.",
      starlight: "Lanterns. Nice light. Warm. ...I wrote something about it. Never mind.",
    },
    postgame: "Hall's open. Lamp's glowing. Wrote a poem about it. Maybe I'll read it to you. Maybe.",
  },

  // ─────────────────────────────── Hollis ───────────────────────────────
  hollis: {
    intro: "Well, now. You have Rosemary's smile. I'm Hollis, the carpenter. Welcome home, {name}.",
    daily: [
      "Measure twice, cut once. Works for wood. Works for words, too.",
      "Good morning. The wood is talking today. It says, 'take your time.'",
      "A strong barn starts with a strong floor. A strong day starts with breakfast.",
      "Every knot in a board is a story the tree is telling.",
      "No need to hurry, {name}. The best things are built slow and steady.",
      "I'm sanding a birdhouse today. Birds are very picky customers.",
      "If you need a coop, a barn or a bigger house, you know where my bench is.",
      "Your great-aunt could drive a nail in with one tap. I still can't.",
    ],
    season: [
      ["Spring sap is rising. The trees are waking up, same as us.", "A spring morning smells like fresh sawdust and rain. My favorite."],
      ["Wood swells in the summer heat. Leave it a little room. People need room, too.", "Long summer days mean long work days. And long naps. Both matter."],
      ["Autumn is a fine time for building. Cool air, steady hands.", "Look at those maple leaves. Rosemary used to press them in her books."],
      ["Winter is for small projects by the fire. Spoons, toys, birdhouses.", "Snow on a good roof just sits there, quiet. That's how you know it's built right."],
    ],
    rain: [
      "Rain finds every crack in a roof. That's how I know where to fix.",
      "Rainy days are good for sanding and thinking. Mostly thinking.",
    ],
    hearts: {
      3: [
        "Rosemary gave me a toolbox when I was young. Carved it herself. I lost it in the storm.",
        "I keep a spot on my shelf empty, for the toolbox. Silly, maybe. But hope is a good habit.",
      ],
      6: [
        "That toolbox had a little bird carved on the lid. If you ever see one, you'll know it.",
        "Your great-aunt taught me that broken things can be mended. Even old ones. Especially old ones.",
      ],
      9: [
        "You remind me of Rosemary, {name}. Always building something. Fields, friendships, hope.",
        "I've built barns, bridges and birdhouses. This friendship might be my finest work.",
      ],
    },
    birthday: "My birthday? At my age, every birthday is a fine surprise. Thank you, {name}.",
    gift: {
      love: "Well, now. This is just right. You have a good eye, {name}.",
      like: "That's kind of you. Thank you.",
      neutral: "Thank you. I'll find a use for it. I always do.",
      dislike: "Ah. Not quite for me, I'm afraid. But the thought is warm, and that's what counts.",
      birthday: "A birthday gift. You've made an old carpenter very happy.",
    },
    places: {
      carpentry: "Mind the sawdust. It gets everywhere. Even in my beard.",
      town: "I like to sit and watch the valley go by. You notice more when you're still.",
      cafe: "Sunny's tea is just right. Not too hot. Patience in a cup.",
    },
    festival: {
      sprout: "I built the planting boxes for the race. Sturdy ones. Plant away, {name}.",
      berry: "I don't pick fast anymore. I pick slow and eat as I go. Best plan there is.",
      harvest: "Rosemary entered a giant pumpkin here once. Took four of us to carry it.",
      starlight: "Each lantern is a little wish. Rosemary would have loved seeing you here tonight.",
    },
    postgame: "The Hall stands strong again. Rosemary helped build it with love, and you rebuilt it the same way.",
  },

  // ─────────────────────────────── Goldie ───────────────────────────────
  goldie: {
    intro: "Howdy, {name}! I'm Goldie. I run the Brook Family Ranch. If it moos, clucks or baas, I can help!",
    daily: [
      "Animal fact! Cows have best friends, and they get a little sad when they're apart. Just like us!",
      "Busy, busy! The chickens wanted breakfast at five o'clock sharp. They're very bossy.",
      "Pet your animals every day. A happy animal gives the best eggs and milk!",
      "Did you know sheep can remember faces for years? So always say hi nicely!",
      "Kai found a frog in the water trough again. The frog seemed happy, at least.",
      "Mother hens talk to their chicks before they even hatch. And the chicks peep back from inside the egg!",
      "I've got hay in my hair, don't I? Always. It's basically my style now.",
      "How's {pet} doing? Give 'em a scratch from me!",
    ],
    season: [
      ["Spring babies everywhere! Chicks, lambs, calves... my heart can't take the cuteness.", "Animal fact: young goats love to jump! In spring they hop around like popcorn."],
      ["Keep fresh water out for your animals in summer. Hot days make them thirsty!", "Buttercup loves to nap in the shade. Smart cow. Smarter than me some days!"],
      ["Harvest Show season! I'm brushing Buttercup every single day.", "Autumn hay smells so sweet. The animals think so too."],
      ["Winter means extra hay and cozy barns. Keep your animals snug!", "Animal fact: chickens can see more colors than we can. Fancy birds!"],
    ],
    rain: [
      "Animals stay inside on rainy days. More time for cuddles!",
      "Rain means muddy boots and a muddy ranch. Kai's favorite kind of day.",
    ],
    hearts: {
      3: [
        "Can I tell you something? I really want Buttercup to win the Harvest Show. She's the sweetest cow ever.",
        "Buttercup's come in second three years running. Always behind a giant pumpkin! Tough competition.",
      ],
      6: [
        "Running the ranch and raising Kai keeps me busy. Thanks for always stopping to say hi, {name}.",
        "Win or lose, Buttercup gets an extra apple after the Harvest Show. That's tradition.",
      ],
      9: [
        "You're family to us now, {name}. Kai thinks so. Buttercup thinks so. And so do I.",
        "I've learned something from you. The best prizes aren't ribbons. They're good friends.",
      ],
    },
    birthday: "My birthday! Kai made me a card with seven cows on it. Best birthday ever already!",
    gift: {
      love: "Oh my stars! This is perfect! Come here, you're getting a hay-scented hug!",
      like: "Aw, thank you! That's real sweet of you.",
      neutral: "Thanks, hon! I'll put it to good use.",
      dislike: "Oh, bless you. It's not really my cup of milk, but I appreciate you thinking of me!",
      birthday: "A birthday present? You're a gem, {name}! Thank you!",
    },
    places: {
      ranch: "Welcome to the ranch! Need animals, hay or advice? I've got all three!",
      town: "Fresh air, green grass, happy cows. You can't beat a morning in the pasture.",
    },
    festival: {
      sprout: "Sprout Fair! Kai's racing this year. He's been practicing in the mud. Lots of mud.",
      berry: "Berry Bash! Watch out for Kai. He picks like a little hurricane.",
      harvest: "It's Harvest Show day! Buttercup's brushed, bowed and ready. Wish us luck!",
      starlight: "Starlight Night is my favorite. I hang a lantern by the barn so the animals can see it too.",
    },
    postgame: "The Hall's open, and the whole valley feels brand new. Buttercup mooed all morning. She's proud of you!",
  },

  // ─────────────────────────────── Kai ───────────────────────────────
  kai: {
    intro: "Whoa! Are you the new farmer? I'm Kai! I know every bug in the valley. Well, almost every bug!",
    daily: [
      "I found a beetle with a shiny green back! I named him Sir Crunch. I let him go, though.",
      "Do you have any treasures? I have a shiny rock, a feather and a button. Very rare!",
      "Frogs can breathe through their skin! Isn't that SO weird? I love it!",
      "Mom says I can't keep a frog in my room. Even a small one. Even a nice one.",
      "If you find a cool bug, tell me! I'm writing a bug book!",
      "Ladybugs aren't all ladies. Some are boys! They should be called ladyandgentlemanbugs.",
      "I'm not scared of anything! Except the dark. And only a little bit.",
      "I dug a hole by the river and found a worm. Best day ever!",
    ],
    season: [
      ["Spring has the BEST bugs! Butterflies, bees, beetles... and tadpoles!", "Tadpoles turn into frogs! It's like magic, but real!"],
      ["Fireflies come out in summer! They're like tiny flying lanterns!", "My birthday is in summer! I want a bug net. A big one!"],
      ["The leaves are crunchy! I jumped in a leaf pile and found three beetles!", "Crickets sing louder in autumn. They're having a concert!"],
      ["Where do bugs go in winter? Ottilie says they nap. Lucky bugs!", "I made a snow frog! It's like a snowman, but better."],
    ],
    rain: [
      "Rain means puddles! And puddles mean FROGS!",
      "Worms come up when it rains! I'm going to say hi to all of them.",
    ],
    hearts: {
      3: [
        "Can you keep a secret? I'm hunting the Rainbow Beetle! It's super rare and it shines every color!",
        "Nana says your great-aunt saw a Rainbow Beetle once. So it's REAL! I just have to find it.",
      ],
      6: [
        "Rainbow Beetles come out near dusk. But dusk is kind of dark... I'm not scared! Just, um, careful.",
        "You're my best bug-hunting partner, {name}! Even better than my magnifying glass!",
      ],
      9: [
        "Even if I never catch the Rainbow Beetle, hunting with you is the best part. That's the real treasure!",
        "You're my best friend, {name}. I put your name in my bug book. Under 'Most Awesome.'",
      ],
    },
    birthday: "It's my BIRTHDAY! Mom made a bug-shaped cake. It has gummy legs!",
    gift: {
      love: "WHOA! This is the best treasure EVER! You're the coolest, {name}!",
      like: "Cool! I'm putting this in my treasure box!",
      neutral: "Oh! Um, thanks! I'll find a place for it.",
      dislike: "Hmm, I don't really like this one. But thanks for thinking of me! Maybe Mom will like it!",
      birthday: "A birthday present?! For ME?! This is the best birthday ever!",
    },
    places: {
      town: "Shh! I'm watching an ant parade. They're carrying a whole crumb!",
      ranch: "This is my corner! See my rock collection? Don't touch the purple one. It's lucky.",
      museum: "Ottilie lets me read bug books when it rains. There's a beetle in here as big as a hand!",
      cafe: "Sunny gave me a cookie shaped like a frog! I almost didn't eat it. Almost!",
    },
    festival: {
      sprout: "I'm gonna win the planting race! I've been practicing digging. I'm REALLY good at digging!",
      berry: "Berry Bash! I'm gonna pick a hundred berries! Okay, maybe twenty. And eat five.",
      harvest: "Go, Buttercup! She's the best cow in the whole world! Mom's been brushing her all week!",
      starlight: "Look at all the lanterns! It's not even dark anymore! ...Not that I'm scared.",
    },
    postgame: "The Hall's open! I'm gonna put my bug book on display there. Ottilie said maybe!",
  },

  // ─────────────────────────────── Juno ───────────────────────────────
  juno: {
    intro: "Oh! Hi. I'm Juno. I, um, paint. Sorry, I was sketching the fountain. You can look, if you want.",
    daily: [
      "The light this morning is kind of peachy. I wish I could paint it fast enough.",
      "There's soil on your boots. Did you know brown has, like, a hundred different shades?",
      "Dad told the same corn joke three times at breakfast. I still laughed. A little.",
      "I'm sketching the town today. The shadows are best before noon.",
      "Blue and orange look brighter when they're side by side. It's called contrast. I love it.",
      "I like drawing people when they don't notice. You were smiling at a chicken yesterday. Nice sketch.",
      "Hi, {name}. ...That's it. Just hi. Hi.",
      "My paint set is almost out of yellow. I use a lot of yellow. It's a happy color.",
    ],
    season: [
      ["Spring is all pale greens and pinks. Like the whole valley is blushing.", "I'm trying to paint blossoms. The petals keep looking like popcorn."],
      ["Summer colors are so loud. Bright blue sky, bright green fields. It's a lot. I like it.", "Sunflowers are my favorite thing to paint. They always look like they're smiling."],
      ["Autumn has the best colors. Red, gold, orange, brown. I could paint it forever.", "My birthday's in autumn. Dad always tries to bake a cake. Always."],
      ["Snow isn't just white, you know. It's blue and lilac and pink in the shadows.", "Winter is good for painting inside. Cocoa, quiet and a blank canvas."],
    ],
    rain: [
      "Rain makes all the colors darker and richer. I like rainy days.",
      "The museum's quiet when it rains. Good for sketching books... and the people reading them.",
    ],
    hearts: {
      3: [
        "I don't show my sketches to many people. But... you can see this one. It's your farm.",
        "I have an idea for a big painting. A mural, on the Valley Hall wall. When it's fixed. If it's fixed.",
      ],
      6: [
        "I've been planning the mural. Everyone in the valley, doing what they love. It's a lot of faces.",
        "You make me feel braver about my art, {name}. Thanks for that. Really.",
      ],
      9: [
        "I drew you in my sketchbook again. You were laughing. It's my favorite one.",
        "I used to think art was something you do alone. Now I think it's better when you share it. With friends.",
      ],
    },
    birthday: "It's my birthday. Dad made a cake shaped like a paintbrush. It's... lumpy. I love it.",
    gift: {
      love: "Oh! I love this. It's... it's perfect. Thank you, {name}.",
      like: "That's really nice. Thanks.",
      neutral: "Oh, thank you. That's kind.",
      dislike: "Oh. Um, it's not really my thing. But thank you for thinking of me. Really.",
      birthday: "You remembered my birthday? That's... really sweet. Thank you.",
    },
    places: {
      town: "The plaza has the best light in the morning. Everything glows a little.",
      museum: "I like to sketch the old paintings here. They teach me a lot.",
      cafe: "Sunny lets me hang drawings on the café wall. Mostly cups of cocoa. I draw what I see.",
      houseOakes: "This is my corner. Please don't look at the half-finished stuff. Okay, you can look a little.",
    },
    festival: {
      sprout: "I'm sketching the planting race. Everyone looks so serious about seeds. It's cute.",
      berry: "Berry juice makes a really nice purple paint. I'm collecting some. For art science.",
      harvest: "So many colors at the Harvest Show. Orange pumpkins, red apples, golden corn. It's already a painting.",
      starlight: "The lanterns look like stars that came down to visit. I'm going to paint this tonight.",
    },
    postgame: "The Hall is open. And there's a big empty wall in there. My mural is going on it. I'm actually doing it.",
  },

  // ─────────────────────────────── Sunny ───────────────────────────────
  sunny: {
    intro: "Hello, hello, come on in! I'm Sunny, and this is The Sunny Cup Café. Rule number one: nobody leaves hungry!",
    daily: [
      "La la la, the soup's on the stove, and the bread's in the oven, ooh!",
      "You look like you could use a snack. Everyone looks like that to me. It's my job!",
      "Today's special is tomato soup. It's souper good, if I do say so myself!",
      "Cooking is like singing. A little of this, a little of that, and you hope it sounds tasty!",
      "I tried a new cocoa recipe. It's un-bean-lievably good. Cocoa beans! Get it?",
      "Tip from the chef: a pinch of salt makes sweet things taste even sweeter!",
      "Hum while you stir. The soup likes it. Science! ...Maybe.",
      "Grit sat in the corner and ate three bowls of stew. Biggest compliment I've ever had!",
    ],
    season: [
      ["Spring veggies are so fresh! Crunchy lettuce, sweet carrots. Lettuce celebrate!", "I'm making strawberry everything this spring. Strawberry juice, strawberry toast, strawberry... no, not soup."],
      ["Summer tomatoes are the best tomatoes. I could sing about them. Actually, I do.", "Cold juice and fruit salad. That's the summer menu! Stay cool, {name}!"],
      ["Pumpkin season! Pumpkin soup, pumpkin pie, pumpkin pancakes... pumpkin everything!", "Autumn is when the whole kitchen smells like cinnamon. Mmm."],
      ["Hot cocoa time! I make it extra chocolatey in winter. It's practically the law.", "It's cold outside, so come inside! The soup's always warm here."],
    ],
    rain: [
      "Rainy days are soup days! Come in and warm up.",
      "Pitter-patter, stir the batter! That's my rainy day song.",
    ],
    hearts: {
      3: [
        "Can I tell you my big dream? A Valley Cooking Day! Everyone cooks together and shares one huge feast.",
        "Food tastes better when you share it. That's my secret ingredient. Don't tell anyone!",
      ],
      6: [
        "I've been writing down everyone's favorite foods. For the cooking day. Grit likes stew. Shh!",
        "You're always helping people, {name}. Let me help you back. With food. That's how I say thank you!",
      ],
      9: [
        "You're my best friend, {name}! I'd share my secret sauce recipe with you. That's serious stuff!",
        "When I cook now, I think: would {name} like this? Usually the answer is yes. You like everything!",
      ],
    },
    birthday: "My birthday! I baked my own cake. Chef's privilege! Want a slice? Want two?",
    gift: {
      love: "Mmm! Oh, this is wonderful! I could sing! Actually, I will! La la LAAA!",
      like: "Ooh, tasty! Thanks, {name}!",
      neutral: "Thank you kindly! Every ingredient has its place.",
      dislike: "Hmm, I can't really cook with this one. But thank you! Your thought was the sweetest part.",
      birthday: "A birthday gift? You're the cherry on top of my cake, {name}!",
    },
    places: {
      cafe: "Welcome to The Sunny Cup! Grab a seat. I'll bring you something warm.",
      town: "It's nice to get out of the kitchen sometimes! But I miss my stove already.",
    },
    festival: {
      sprout: "I brought sprout sandwiches for the racers! Fuel for planting!",
      berry: "Berry Bash! I'm making jam with whatever you pick. So pick lots!",
      harvest: "Harvest Show! I'm looking for the plumpest tomato. For research. Delicious research.",
      starlight: "Hot cocoa for everyone! Starlight Night needs something warm to hold.",
    },
    postgame: "The Hall's open! And guess what? We're holding the first Valley Cooking Day there! Bring your apron!",
  },

  // ─────────────────────────────── Professor Ottilie ───────────────────────────────
  ottilie: {
    intro: "Ah, a new face! Splendid! I'm Professor Ottilie, curator of the Valley Museum. Curator means I care for the collection.",
    daily: [
      "Today I'm feeling quite inquisitive. That means curious! Even more than usual.",
      "Have you found any artifacts? Old things are little time travelers. They tell us who came before!",
      "This teacup is ancient! Well, it was my grandmother's. That's ancient to someone.",
      "The valley's rocks are stratified. That means stacked in layers, like a very slow cake.",
      "Bring me anything old, shiny or mysterious. I'm an expert in all three!",
      "A good question is worth more than a quick answer. Keep asking, {name}.",
      "Fossils are like nature's photographs. Very old, very stony photographs.",
      "The library has a book on every topic. Except folding maps. Nobody can do that.",
    ],
    season: [
      ["Spring is a time of germination! That means seeds sprouting. Even the word sounds bouncy.", "My birthday is in spring. I'm turning... let's call it 'historically significant.'"],
      ["Summer days are long. More hours for research! And for lemonade.", "The sun makes the quarry stones sparkle. Simply luminous! That means glowing."],
      ["Autumn leaves turn colors because the green fades. The other colors were hiding there all along!", "Autumn is perfect for reading. Crisp air, crisp pages."],
      ["Winter is a time of dormancy. That means resting. Even trees take naps!", "I'm cataloging the collection this winter. Cataloging means making a very tidy list."],
    ],
    rain: [
      "Ah, precipitation! That means water falling from the sky. A fancy word for a simple thing.",
      "A rainy day in a library is the coziest thing I know.",
    ],
    hearts: {
      3: [
        "The storm scattered our collection all over the valley. Every find you bring helps put it back together.",
        "I've been curator here for forty years. An empty shelf makes my heart ache a little.",
      ],
      6: [
        "Your great-aunt donated our very first artifact. A founder's lantern. I still hope to find it.",
        "A museum isn't really about objects, {name}. It's about remembering. Together.",
      ],
      9: [
        "You've reminded me why I love this work. You're a marvelous friend, {name}. Marvelous means wonderful!",
        "The museum is nearly whole again. And so is my heart. Thank you, my dear friend.",
      ],
    },
    birthday: "My birthday! Another year of discovery. I'm practically an artifact myself!",
    gift: {
      love: "Extraordinary! That means beyond ordinary. This is a treasure, {name}!",
      like: "How fascinating! Thank you, {name}.",
      neutral: "Thank you, dear. Every object has a story.",
      dislike: "Hmm. This isn't quite right for my collection. But your kindness is worth displaying.",
      birthday: "A birthday gift! How thoughtful. I shall treasure it like a rare fossil.",
    },
    places: {
      museum: "Welcome to the Valley Museum and Library! Please don't lick the fossils. Kai asked once.",
      town: "A bit of fresh air helps the mind. Even curators need sunshine.",
    },
    festival: {
      sprout: "The Sprout Fair dates back to the valley's founding. Your great-aunt planted the very first seed!",
      berry: "Berries have been gathered here for ages. This festival is wonderfully historic!",
      harvest: "The Harvest Show! I'm studying the pumpkins. Purely academic. They're very round.",
      starlight: "Starlight Night began when the founders lit lanterns to find each other in the snow. Lovely, isn't it?",
    },
    postgame: "The Hall is restored and the museum is full again. Our history is safe, and so is our future!",
  },

  // ─────────────────────────────── Toby ───────────────────────────────
  toby: {
    intro: "All aboard! Ha, old habits. I'm Toby. I drove the Valley Train for forty years. Pleased to meet you, {name}.",
    daily: [
      "All aboard the morning! Next stop: a nice cup of tea.",
      "The train used to whistle at six sharp every morning. I still wake up for it.",
      "Did I tell you about the goat who rode the train? He had a ticket and everything. Well, he ate it.",
      "Tea tip: let it steep three minutes. Not two, not four. Three. Like a good train schedule.",
      "Back in my day, the whole valley came to the station to wave hello. Grand times.",
      "The rails are rusty, but they still remember the way. So do I.",
      "I've got a pocket watch that's never once been late. Unlike me.",
      "Every passenger has a story. Every story deserves a good listener.",
    ],
    season: [
      ["In spring, the train brought visitors for the Sprout Fair. Such happy crowds.", "Spring rain on the rails makes them sing. Tink, tink, tink."],
      ["Summer trips to the seaside! The train was packed with picnic baskets.", "A warm day calls for cold tea. Yes, I drink it cold in summer. Don't tell anyone."],
      ["The ride through the autumn hills was the prettiest ride in the world.", "My birthday's in autumn. I used to celebrate with the passengers. Cake for everyone!"],
      ["Winter evenings by the fire with tea and stories. That's my kind of station.", "The snow train! Lanterns in every window, glowing in the dark. Pure magic."],
    ],
    rain: [
      "Rainy day. Good for tea and listening to the drops. Like a gentle train on the roof.",
      "In the rain, I'd blow the whistle twice to say 'hello, puddles!' Silly old me.",
    ],
    hearts: {
      3: [
        "I miss the train, {name}. Not just the train. The waving, the smiles. The connections.",
        "Rosemary rode my very first trip. She brought me a cookie for luck. I've never forgotten.",
      ],
      6: [
        "If the train ever runs again, I'd love to ride it one more time. Just once more.",
        "You listen so kindly to an old man's stories. That's a rare gift, {name}.",
      ],
      9: [
        "You've given an old conductor something to look forward to. All aboard for friendship, eh?",
        "Best friends are like good tracks. They take you to good places, and they last.",
      ],
    },
    birthday: "My birthday! Another trip around the sun. All aboard, everybody!",
    gift: {
      love: "Well, toot toot! This is just wonderful! Thank you, {name}!",
      like: "How thoughtful. Thank you kindly.",
      neutral: "Thank you. I'll put it on my shelf with the others.",
      dislike: "Ah, not quite my cup of tea, so to speak. But it's lovely of you to think of me.",
      birthday: "A present! On my birthday! You've made this old conductor's day.",
    },
    places: {
      town: "This old station holds a lot of memories. Good ones, every one.",
      cafe: "Sunny's tea is the second best in the valley. Mine is first. Don't tell him!",
      houseToby: "Welcome to my cabin! Sit by the fire. The kettle's always warm.",
    },
    festival: {
      sprout: "Ah, the Sprout Fair! The train used to bring families from all over for this.",
      berry: "Berry Bash! I used to pick berries at the train stops. Very quick picking.",
      harvest: "In the old days, the train carried the Harvest Show winners home. With the ribbon on the engine!",
      starlight: "Starlight Night. I'm wishing for the train whistle to blow again. Maybe this year.",
    },
    postgame: "The train whistle is back in the valley, and the Hall is open. My heart's as full as a passenger car!",
  },

  // ─────────────────────────────── Lumi ───────────────────────────────
  lumi: {
    intro: "Oh! Hi! Hello! I'm Lumi! I invent things! Some of them even work! Welcome to Cliff Valley!",
    daily: [
      "I built a self-buttering toaster! It buttered the ceiling! Progress!",
      "Gears, springs, bolts! My three favorite words! Plus 'snacks'! Four!",
      "Did you know a lever can lift something way heavier than you? Physics is a superpower!",
      "My hair turned blue after one experiment, and I kept it! It's a great look!",
      "Grit made me a tiny gear today! It's perfect! I might frame it!",
      "If something breaks, that just means it's time to make it better!",
      "I'm building a robot that waters plants! So far it only waters me!",
      "Stars, sparks and science! What a day!",
    ],
    season: [
      ["Spring cleaning! I found three lost screwdrivers and a sandwich! Let's not talk about the sandwich!", "Spring is windy! My pinwheel generator spun so fast it whistled!"],
      ["Summer sun! I'm building a sun-powered fan! It works best when it's sunny, which is... now!", "Long summer nights mean lots of stargazing! My telescope is ready!"],
      ["I'm inventing a leaf-sorting machine! It sorts by color! Juno is very excited!", "Cool autumn air is great for thinking! My brain runs faster when it's chilly!"],
      ["Winter stars are the brightest! Come look through my telescope sometime!", "My birthday is in winter! I'm building my own cake! With gears! Edible gears!"],
    ],
    rain: [
      "Rainy day! Perfect for indoor tinkering! And for testing my umbrella hat! It leaks!",
      "The rain makes such a great rhythm! I'm recording it for my music machine!",
    ],
    hearts: {
      3: [
        "Want to know my biggest project? The mine lift! The storm broke it, and I'm going to fix it!",
        "If the lift worked, miners could zoom down to the deep floors! Zoom! Safely! But zoom!",
      ],
      6: [
        "I've drawn forty-two blueprints of the mine lift! Forty-three! I just drew another one!",
        "Sometimes my inventions flop. But you always cheer me on anyway! That's the best fuel!",
      ],
      9: [
        "You're my best invention partner, {name}! Well, you're not an invention! You're a friend! The best one!",
        "Every time I look at the stars, I think about how lucky I am to have a friend like you!",
      ],
    },
    birthday: "It's my birthday! I invented a party hat that spins! Only a little! Okay, a lot!",
    gift: {
      love: "WOW! This is AMAZING! I can use this for SO many things! Thank you, thank you!",
      like: "Ooh, neat! I can totally use this! Thanks!",
      neutral: "Oh, thanks! I'll find a use for it! Probably! Maybe as a doorstop!",
      dislike: "Oh! This isn't really my thing! But thank you so much for thinking of me!",
      birthday: "A birthday present?! You're the best! I'm putting it on display! With a spotlight!",
    },
    places: {
      houseLumi: "Welcome to my workshop! Watch out for the sparky corner! It's sparky!",
      town: "I'm doing field research! Today's field: everything!",
      smithy: "Grit lets me use the forge when it rains! As long as I don't touch the special hammer!",
    },
    festival: {
      sprout: "I built a seed-planting machine! It's not allowed in the race! Fair is fair!",
      berry: "I tried to invent a berry-picker, but it made jam instead! Happy accident!",
      harvest: "I measured every pumpkin with my laser ruler! The big one is HUGE! Science says so!",
      starlight: "Starlight Night! I made my lantern extra bright! Maybe too bright! Sorry, everyone's eyes!",
    },
    postgame: "The mine lift is running, the lamp is glowing and the Hall is open! Best! Year! Ever!",
  },

  // ─────────────────────────────── Basil ───────────────────────────────
  basil: {
    intro: "...Oh. Hello. I'm Basil. I look after Whisperwood. Welcome to the valley.",
    daily: [
      "Listen. That's a wren singing. Small bird, big song.",
      "The forest is waking up. So am I. Slowly.",
      "Mushrooms grow in circles sometimes. People call them fairy rings. I just call them nice.",
      "Walk softly in the woods. The forest notices.",
      "A robin built a nest by my front door. I'm using the back door for a while.",
      "Trees share water through their roots, you know. Quietly. Like good neighbors.",
      "If you sit still long enough, the birds forget you're there. That's when they sing best.",
      "Good morning, {name}. The air smells green today.",
    ],
    season: [
      ["Spring. The birds are back. Everything is singing.", "Look for morels in spring. They hide well. Patience helps."],
      ["The summer forest is thick and green. Lots of shade. Lots of bugs. Kai is happy.", "Berries in the bushes. Leave some for the birds."],
      ["Autumn is mushroom season. The forest floor is full of little surprises.", "The leaves fall and feed the soil. Nothing is wasted in a forest."],
      ["The winter forest is quiet. You can hear snow landing on the branches.", "I put out seeds for the birds in winter. They remember who's kind."],
    ],
    rain: [
      "Rain is good for the forest. The trees are drinking.",
      "Mushrooms love rain. So do I, a little.",
    ],
    hearts: {
      3: [
        "The storm knocked down a lot of trees in Whisperwood. I'm planting new ones. One by one.",
        "Every sapling is a promise. In fifty years, it'll be tall. Someone will sit in its shade.",
      ],
      6: [
        "I planted one of the new saplings for your great-aunt. A little oak. It's growing strong. Like she was.",
        "You're easy to be quiet with, {name}. That's rare. I like it.",
      ],
      9: [
        "You're a good friend, {name}. Like an old oak. Steady. Always there.",
        "Whisperwood is growing back. So am I, I think. You helped with both.",
      ],
    },
    birthday: "My birthday. ...Thank you for remembering. That's kind.",
    gift: {
      love: "Oh. This is wonderful. Thank you, {name}. Really.",
      like: "That's nice. Thank you.",
      neutral: "Thank you. I'll keep it.",
      dislike: "Hm. Not really for me. But it was kind of you to bring something.",
      birthday: "A birthday gift. For me. ...Thank you, {name}. I'm smiling. Inside, mostly.",
    },
    places: {
      town: "The garden's quiet in the morning. The bees are already working.",
      cafe: "Sunny makes a good mushroom soup. I bring him the mushrooms. Good trade.",
      houseBasil: "Welcome. Mind the plants. They're everywhere. On purpose.",
    },
    festival: {
      sprout: "I like the Sprout Fair. Lots of new seeds going into the ground. Hopeful.",
      berry: "Berry Bash. Pick what you need. Leave some for the birds.",
      harvest: "Lots of hard work here. Every vegetable was a tiny seed once.",
      starlight: "The lanterns are pretty. But look up, too. The real stars are out.",
    },
    postgame: "The Hall is open. Whisperwood is green again. The valley feels whole. Thank you, {name}.",
  },

  // ─────────────────────────────── Nana Clementine ───────────────────────────────
  nana: {
    intro: "Oh, my dear! Look at you! I'm Nana Clementine. Rosemary was my very best friend. Come here and let me see you!",
    daily: [
      "Have you eaten, dear? You look like you need a muffin. Everybody needs a muffin.",
      "The secret to good bread is patience and a little bit of humming.",
      "When we first came to this valley, it was just grass and a big blue sky. And us!",
      "Rosemary always said a warm oven makes a warm heart. She was right, as usual.",
      "I baked too many cookies again. That's the only way I know how to bake!",
      "Don't forget to rest, dear. Even dough has to rest before it rises.",
      "My knees creak like an old porch. But my rolling pin still works just fine!",
      "How's that sweet {pet} of yours? Rosemary loved animals. She'd have adored them.",
    ],
    season: [
      ["Spring! Time for strawberry tarts and opening all the windows.", "Rosemary and I planted the first flowers in the plaza one spring. They still come back every year."],
      ["Summer pies cool best on the windowsill. If Kai doesn't find them first!", "On hot days, Rosemary and I dipped our toes in the river and shared a peach."],
      ["Apple season! The whole cottage smells like cinnamon. Come by anytime.", "Autumn makes me think of old times. Pull up a chair, dear."],
      ["Winter is baking season. Breads, pies, cocoa, cookies. Come warm up!", "My birthday's in winter. At my age, I count the cookies, not the candles!"],
    ],
    rain: [
      "Rainy days are for baking and storytelling. Lucky for you, I do both!",
      "Listen to that rain. Rosemary used to say it was the sky watering everyone at once.",
    ],
    hearts: {
      3: [
        "I have Rosemary's old recipe box, you know. Her handwriting is on every card. Little doodles, too.",
        "Your great-aunt couldn't bake a pie to save her life at first. We practiced together for years!",
      ],
      6: [
        "Rosemary and I baked bread for the very first valley party. We burned it! Everyone ate it anyway.",
        "I see her in you, dear. The way you work hard and smile at everyone.",
      ],
      9: [
        "You're family, {name}. Rosemary would be so proud of you. I'm so proud of you.",
        "Recipes are meant to be shared, dear. That's why I share Rosemary's with you.",
      ],
    },
    birthday: "My birthday! Oh, don't make a fuss. ...Okay, a small fuss. With cake.",
    gift: {
      love: "Oh, sweetheart! This is just lovely! You've made an old baker very happy!",
      like: "How sweet of you, dear. Thank you.",
      neutral: "Thank you, dear. That's very thoughtful.",
      dislike: "Oh, my. This isn't really for me, dear. But I love that you came by to visit.",
      birthday: "A present for me? Oh, you're a dear. Come here, let me give you a hug!",
    },
    places: {
      houseNana: "Come in, come in! Wipe your boots and sit down. There's a pie cooling.",
      cafe: "I bake for Sunny's café every morning. He sings, I knead. It's a good team!",
      town: "I like to sit here and watch the young ones. This valley was built for them.",
    },
    festival: {
      sprout: "Rosemary planted the first seed at the very first Sprout Fair. I was right beside her!",
      berry: "I'm saving my berries for pie. Unless I eat them first. Which I might.",
      harvest: "I entered a pie in the Harvest Show! Don't tell the judges it's Rosemary's recipe!",
      starlight: "On Starlight Night, Rosemary and I always swapped little gifts. Now I swap them with all of you.",
    },
    postgame: "The Hall is open again, just like when we first built it. Rosemary would be so proud of you, dear.",
  },

  // ─────────────────────────────── Cap'n Wren ───────────────────────────────
  wren: {
    intro: "Ahoy there! Cap'n Wren's the name, and this here's Pickles. Say hello, Pickles! ...He's shy. He's not shy.",
    daily: [
      "Ahoy, {name}! Pickles says the fish are biting today. Pickles is usually right.",
      "I once caught a fish so big, I had to row it home! Or it rowed me. Can't remember.",
      "Pickles stole a sardine off my plate again. Cheeky bird. Best first mate there is.",
      "Fishing tip: be patient, be quiet, and don't let your seagull eat the bait.",
      "Seen any good fish lately? I've seen 'em all! Well, almost all.",
      "Squawk! That's Pickles saying good morning. He's very polite. For a seagull.",
      "The sea's like a big blue storybook. Every wave has a tale.",
      "Once I met a crab who could dance. Sideways, of course. Lovely mover.",
    ],
    season: [
      ["Spring brings new fish up the river. Fresh as a sea breeze!", "Pickles is building a nest in my hat again. Every spring, same hat."],
      ["Summer's the best fishing weather! Warm water, happy fish, sunburnt nose.", "My birthday's in summer! Pickles always brings me a seashell. Sometimes a sandwich."],
      ["Autumn fish are big and lazy. Easiest catching of the year! Don't tell 'em.", "The autumn wind smells like salt and adventure. Ahh."],
      ["Winter fishing takes grit. And mittens. Mostly mittens.", "Even in winter, the fish are out there. Swimming slow, keeping warm."],
    ],
    rain: [
      "Rain's a fine time to fish! The fish think it's dinnertime.",
      "Pickles hates rain. He sits under my hat and grumbles. Squawk.",
    ],
    hearts: {
      3: [
        "Ever heard of the Crystal Carp? Glows like a lantern underwater! I saw it once, long ago.",
        "The Crystal Carp was bigger than a rowboat! Well. A small rowboat. A bathtub. A big bathtub!",
      ],
      6: [
        "Rosemary was with me when I saw the Crystal Carp. She saw it too! So it's no fish tale.",
        "Pickles likes you, {name}. He never steals your snacks. That's seagull for 'friend.'",
      ],
      9: [
        "You're a true sailor's friend, {name}. Steady as the tide. Pickles agrees. Squawk!",
        "I'd share my secret fishing spot with you. That's the highest honor a captain can give!",
      ],
    },
    birthday: "My birthday! Another year on the waves! Pickles is wearing a tiny party hat. He hates it.",
    gift: {
      love: "Shiver me buttons! That's a fine gift! Pickles, look at this!",
      like: "Ahoy, that's a good one! Thank you, matey.",
      neutral: "Well, thank ye kindly. I'll stow it in the shop.",
      dislike: "Hmm, not quite my kind of catch. But it's mighty kind of you, {name}.",
      birthday: "A birthday gift! For an old sea dog like me? Pickles, we're celebrating!",
    },
    places: {
      town: "The river's not the sea, but it's got good fish. And good company. You!",
      cafe: "Sunny's fish stew is almost as good as mine. Almost. Don't tell him.",
    },
    festival: {
      sprout: "Plants don't swim, so I'm a bit out of my depth here. Ha! Still, a fine party!",
      berry: "Pickles entered the Berry Bash. Just kidding. He'd eat them all.",
      harvest: "I brought my biggest fish to the Harvest Show! They said it's not a vegetable. Their loss.",
      starlight: "The lanterns on the water look like the Crystal Carp's glow. Takes me back, it does.",
    },
    postgame: "The pier's fixed, the Hall's open and Pickles is happy. Fair winds, {name}. You did it!",
  },
};

export type Category = 'Action' | 'Adventure' | 'Cozy' | 'Strategy' | 'Racing' | 'Learning';
export type Device = 'Computer' | 'Tablet' | 'Phone';
export type Control = 'Keyboard' | 'Mouse' | 'Gamepad' | 'Touch';
export interface Game {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  categories: Category[];
  tags: string[];
  ageGuidance: string;
  minAge: number;
  contentNotes: string;
  estimatedPlayTime: string;
  controls: { types: Control[]; howToPlay: string[] };
  supportedDevices: Device[];
  thumbnail: string;
  banner: string;
  releaseDate: string;
  featured: boolean;
  accentColor: string;
  status: 'Ready to play' | 'Coming soon';
}
export const games: Game[] = [
  {
    "slug": "light-crossing",
    "title": "Light Crossing",
    "tagline": "Make a little island shine.",
    "description": "Arrive on Driftlight Isle, pitch a tent and build a cozy island life. Befriend eight neighbors, fish, catch bugs, craft tools, decorate your home and fill the museum. Follow five story chapters to bring the lighthouse back to life for the Lantern Crossing festival, then keep exploring after the credits.",
    "categories": [
      "Cozy",
      "Adventure"
    ],
    "tags": [
      "Explore",
      "Island",
      "Relax",
      "Crafting",
      "Fishing",
      "Neighbors"
    ],
    "minAge": 6,
    "ageGuidance": "Ages 6+",
    "contentNotes": "Peaceful island life with no combat. Reading helps with conversations and missions. Three save slots and automatic saves stay in this browser.",
    "estimatedPlayTime": "About 6 hours, plus free play",
    "controls": {
      "types": [
        "Keyboard",
        "Mouse",
        "Gamepad",
        "Touch"
      ],
      "howToPlay": [
        "Move with WASD or the arrow keys; hold Shift to run. E, Space or a click interacts or uses your tool.",
        "Use [ and ] to cycle tools, R for the tool ring, I for pockets, Tab or P for your Glowpad, M for the map and Escape to pause.",
        "On a gamepad, use the left stick to move, B or RT to run, A to interact, LB/RB to cycle tools, X for pockets and Start for the Glowpad.",
        "On touch screens, drag on the left half to move. Use A to interact, B to run, Tool to switch tools, Bag for pockets and Pad for the Glowpad."
      ]
    },
    "supportedDevices": [
      "Computer",
      "Tablet",
      "Phone"
    ],
    "accentColor": "#c7f1dd",
    "thumbnail": "/art/light-crossing-thumbnail.svg",
    "banner": "/art/light-crossing-banner.svg",
    "releaseDate": "2026-10-11",
    "featured": true,
    "status": "Ready to play"
  },
  {
    "slug": "theabonk",
    "title": "TheaBonk",
    "tagline": "Small hero. Mighty big bonks.",
    "description": "Help Thea push back the Gloom with her glowing Bonk Ring. Explore a colorful 3D world, dodge waves of cartoon monsters and choose upgrades as you survive until dawn. Unlock new characters and grow your collection across runs.",
    "categories": [
      "Action",
      "Adventure"
    ],
    "tags": [
      "Monsters",
      "Power-ups",
      "3D",
      "Survival"
    ],
    "minAge": 8,
    "ageGuidance": "Ages 8+",
    "contentNotes": "Fantasy combat against cartoon monsters, fast movement and colorful effects. No realistic blood or gore. Action may feel intense. Unlocks and settings save in this browser. A keyboard and mouse or gamepad is required.",
    "estimatedPlayTime": "10–20 minutes per run",
    "controls": {
      "types": [
        "Keyboard",
        "Mouse",
        "Gamepad"
      ],
      "howToPlay": [
        "Move with WASD or the arrow keys. Your Bonk Ring attacks automatically. Press Space to jump and Shift or C to slide.",
        "Drag the mouse or use Q/E to look. Choose pointer lock in Settings → Camera control, then click the game to lock the mouse. Escape or P pauses.",
        "Choose upgrades with 1–4, a click or the arrow keys and Enter.",
        "With a gamepad, use the left stick to move and the right stick to look. A jumps, B or a trigger slides, and Start or Select pauses."
      ]
    },
    "supportedDevices": [
      "Computer"
    ],
    "accentColor": "#e1dafa",
    "thumbnail": "/art/theabonk-thumbnail.svg",
    "banner": "/art/theabonk-banner.svg",
    "releaseDate": "2026-10-11",
    "featured": true,
    "status": "Ready to play"
  },
  {
    "slug": "vanex-defense",
    "title": "Vanex Defense",
    "tagline": "Little towers. Clever plans.",
    "description": "Build elemental towers, mix them into combo towers and make a twisty maze to keep the cheeky Grumblewumps away from the crystal castle. Try new strategies across a colorful campaign and endless challenges.",
    "categories": [
      "Strategy",
      "Action"
    ],
    "tags": [
      "Towers",
      "Elements",
      "Maze",
      "Grumblewumps"
    ],
    "minAge": 7,
    "ageGuidance": "Ages 7+",
    "contentNotes": "Cartoon creatures poof into sparkles. No realistic violence. Campaign progress and settings save in this browser.",
    "estimatedPlayTime": "15–20 minutes per map; 2–4 hour campaign",
    "controls": {
      "types": [
        "Touch",
        "Mouse",
        "Keyboard"
      ],
      "howToPlay": [
        "Tap or click a tower card, then an open square and the checkmark to build. Keyboard shortcuts 1–0 select towers.",
        "Select a tower to upgrade, sell or change targeting. Keyboard shortcuts are U, S and T.",
        "Drag and pinch to explore the map on touch screens, or drag and use the mouse wheel.",
        "Start the next wave with N or Enter, change speed with F and pause with Space, P or Escape."
      ]
    },
    "supportedDevices": [
      "Computer",
      "Tablet",
      "Phone"
    ],
    "accentColor": "#dbe7c8",
    "thumbnail": "/art/vanex-defense-thumbnail.svg",
    "banner": "/art/vanex-defense-banner.svg",
    "releaseDate": "2026-10-11",
    "featured": true,
    "status": "Ready to play"
  },
  {
    "slug": "space-sky",
    "title": "Space Sky",
    "tagline": "Your rocket. A universe of wonder.",
    "description": "Build your own rocket, explore the solar system and beyond, meet friendly aliens and learn real space facts. Take off on a colorful journey with discoveries, missions and a growing collection of space badges.",
    "categories": [
      "Adventure",
      "Learning"
    ],
    "tags": [
      "Explore",
      "Space",
      "Rockets",
      "Science",
      "Aliens"
    ],
    "minAge": 6,
    "ageGuidance": "Ages 6–10",
    "contentNotes": "Friendly aliens, real space facts and no scary content. Three save slots and settings stay in this browser.",
    "estimatedPlayTime": "5–6 hours",
    "controls": {
      "types": [
        "Touch",
        "Keyboard",
        "Gamepad"
      ],
      "howToPlay": [
        "Steer with WASD or the arrow keys, a gamepad’s left stick or D-pad, or the left touch control.",
        "Press Space, gamepad A or the orange touch button to boost, jump or thrust.",
        "Press E or Enter, gamepad X/Y or the blue touch button for actions.",
        "Pause with Escape or P, gamepad Start or the pause button. Menus support touch, keyboard, mouse and gamepad."
      ]
    },
    "supportedDevices": [
      "Computer",
      "Tablet",
      "Phone"
    ],
    "accentColor": "#d9d4f6",
    "thumbnail": "/art/space-sky-thumbnail.svg",
    "banner": "/art/space-sky-banner.svg",
    "releaseDate": "2026-10-11",
    "featured": true,
    "status": "Ready to play"
  },
  {
    "slug": "calex-cart",
    "title": "Calex Cart",
    "tagline": "Drift, boost and chase the finish.",
    "description": "Drift, boost and glide through 16 bright tracks in an original 3D kart racer. Win Grand Prix trophies, chase Time Trial ghosts, pop balloons in Battle or race a friend in split-screen.",
    "categories": [
      "Racing",
      "Action"
    ],
    "tags": [
      "Karts",
      "Drift",
      "Split-screen",
      "Trophies",
      "Time Trial"
    ],
    "minAge": 10,
    "ageGuidance": "Ages 10–14",
    "contentNotes": "Cartoon kart battles and silly spin-outs. Three save slots, settings and Time Trial ghosts stay in this browser. Split-screen needs a keyboard or gamepads; touch controls are for solo play.",
    "estimatedPlayTime": "5–6 hours, plus replay",
    "controls": {
      "types": [
        "Keyboard",
        "Gamepad",
        "Touch"
      ],
      "howToPlay": [
        "Steer with A/D or the arrow keys. W/Up accelerates, S/Down brakes, Shift or Space drifts, E uses an item and R looks behind. Escape or P pauses.",
        "With a gamepad, steer with the left stick or D-pad. A/RT accelerates, B/LT brakes, RB/X drifts and LB/Y uses an item.",
        "On touch screens, use the left steering pad or tilt, GO, Brake, Drift and ITEM. Swipe down on ITEM to throw behind.",
        "Split-screen requires a keyboard or gamepads. With two gamepads, use one each; with one gamepad, player 1 uses the keyboard and player 2 the gamepad. With a shared keyboard, player 1 uses WASD, left Shift/Space and E; player 2 uses arrows, right Shift and Enter. Touch is solo only."
      ]
    },
    "supportedDevices": [
      "Computer",
      "Tablet",
      "Phone"
    ],
    "accentColor": "#f7e3ac",
    "thumbnail": "/art/calex-cart-thumbnail.svg",
    "banner": "/art/calex-cart-banner.svg",
    "releaseDate": "2026-10-11",
    "featured": true,
    "status": "Ready to play"
  },
  // ADD_GAME_ENTRIES
];
export const categories = [...new Set(games.flatMap(game => game.categories))].sort() as Category[];
export const findGame = (slug: string | undefined) => games.find(game => game.slug === slug);

export type Category = 'Action' | 'Adventure' | 'Cozy';
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
  contentNotes: string;
  estimatedPlayTime: string;
  controls: { types: Control[]; howToPlay: string[] };
  supportedDevices: Device[];
  thumbnail: string;
  banner: string;
  releaseDate: string;
  featured: boolean;
  accentColor: string;
  status: 'Ready to play' | 'Island preview' | 'Coming soon';
}
export const games: Game[] = [
  {
    slug: 'light-crossing',
    title: 'Light Crossing',
    tagline: 'A little island. A lovely escape.',
    description: 'Step onto a sunny island and take a little wander. Explore sandy shores, leafy paths, and a colorful world at your own pace. This early preview lets you explore the island. Fishing, crafting, villagers, and the story are still on the way.',
    categories: ['Cozy', 'Adventure'],
    tags: ['Explore', 'Island', 'Relax', 'Preview'],
    ageGuidance: 'Ages 6+',
    contentNotes: 'Peaceful island exploration. No combat. Early preview: planned life-sim activities are not available yet. Nothing is saved when you leave.',
    estimatedPlayTime: '5–15 minutes',
    controls: { types: ['Keyboard', 'Mouse', 'Gamepad', 'Touch'], howToPlay: ['Move with WASD or the arrow keys.', 'Hold Shift to run. Use a gamepad’s left stick to move.', 'On a phone or tablet, hold the on-screen arrows to explore.'] },
    supportedDevices: ['Computer', 'Tablet', 'Phone'],
    thumbnail: '/art/light-crossing.svg',
    banner: '/art/light-crossing.svg',
    releaseDate: '2026-10-11',
    featured: true,
    accentColor: '#c7f1dd',
    status: 'Island preview'
  },
  {
    slug: 'theabonk',
    title: 'TheaBonk',
    tagline: 'Small hero. Mighty big bonks.',
    description: 'The Gloom is here, and you have a very important job: bonk it back! Explore a colorful 3D world, dodge waves of cartoon monsters, and pick power-ups that make every run a little different. See how long you can survive until dawn.',
    categories: ['Action', 'Adventure'],
    tags: ['Monsters', 'Power-ups', '3D', 'Survival'],
    ageGuidance: 'Ages 8+',
    contentNotes: 'Fantasy combat against cartoon monsters, fast movement, and colorful effects. No realistic blood or gore. Some players may find the action intense. Progress lasts for this visit only.',
    estimatedPlayTime: '10–20 minutes',
    controls: { types: ['Keyboard', 'Mouse', 'Gamepad'], howToPlay: ['Move with WASD or the arrow keys. Attacks happen automatically.', 'Press Space to jump and Shift to slide.', 'Use the mouse or Q/E to look around. Press Escape or P to pause.', 'With a gamepad, move with the left stick and look with the right stick.'] },
    supportedDevices: ['Computer'],
    thumbnail: '/art/theabonk.svg',
    banner: '/art/theabonk.svg',
    releaseDate: '2026-10-11',
    featured: true,
    accentColor: '#e1dafa',
    status: 'Ready to play'
  },
  // ADD_GAME_ENTRIES
];
export const categories = [...new Set(games.flatMap(game => game.categories))].sort() as Category[];
export const findGame = (slug: string | undefined) => games.find(game => game.slug === slug);

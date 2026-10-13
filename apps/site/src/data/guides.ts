// Guides for parents (/guides/<slug>): their titles and descriptions. The words themselves are in
// guide-bodies.ts, loaded only by the guide pages and the build, so every other page stays light.
// Keep them honest and specific; no keyword stuffing.

export interface Guide { slug: string; title: string; description: string; published: string; updated: string }

export const guides: Guide[] = [
  {
    slug: 'choose-ad-free-games-for-kids',
    title: 'How to choose ad-free games for kids',
    description: '“Free” games are often paid for with ads and purchases. What to check in the store listing, in the game and on the device before your child plays.',
    published: '2026-10-13',updated: '2026-10-13'
  },
  {
    slug: 'what-makes-a-game-kid-safe',
    title: 'What to look for in a kid-safe game',
    description: 'Age ratings cover content, not chat, data or pressure to keep playing. Six things to check before a game gets a place on your child’s screen.',
    published: '2026-10-13',updated: '2026-10-13'
  },
  {
    slug: 'build-a-game-with-your-kid-using-ai',
    title: 'Build a simple game with your kid using AI',
    description: 'A first game in an afternoon: design it on paper together, describe it to an AI assistant, then play-test one change at a time. With an example to copy.',
    published: '2026-10-13',updated: '2026-10-13'
  }
];

export const findGuide = (slug: string | undefined) => guides.find(guide => guide.slug === slug);

// llms.txt (a short index for AI assistants, https://llmstxt.org) and llms-full.txt (everything a
// parent might ask, in one file), both generated from the game manifests, the FAQ and the guides.
// The site build writes both for its own address; `npm run manifests` writes the repo's llms.txt.
import type { Game } from '../data/games';
import { faq } from '../data/faq';
import { guides } from '../data/guides';
import { guideBodies } from '../data/guide-bodies';
import { BRAND,SITE_DESCRIPTION } from '../data/site';
import { REPO } from '../lib/links';
import { blocksToText,markdown } from '../lib/rich-text';

const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
const intro = (origin: string) => `# ${BRAND}

> ${SITE_DESCRIPTION}

${BRAND} (${origin}) is a website of original games made for kids, plus the open-source monorepo they are built in (${REPO}). The site and the games collect no data: there are no accounts, ads, purchases, analytics, chat or requests to other websites, and game progress stays in the player's browser. Each game is a single self-contained HTML file.`;

const communitySection = (origin: string,community: Game[]) => community.length ? `\n## Community games\n\nMade by kids and families from the starter, checked by the same tests and approved by a person. Each runs from its own separate address.\n\n${community.map(game => `- [${game.title}](${origin}/game/${game.slug}): ${game.description} ${game.ageGuidance}. Made by ${game.community!.handle}. [Source](${REPO}/tree/main/community/${game.slug})`).join('\n')}\n` : '';

export function llmsText(origin: string,games: Game[],community: Game[] = []) {
  return `${intro(origin)}

## Games

${games.map(game => `- [${game.title}](${origin}/game/${game.slug}): ${game.description} ${game.ageGuidance}. ${game.categories.join(', ')}. Plays on ${game.supportedDevices.join(', ').toLowerCase()} with ${game.controls.types.join(', ').toLowerCase()}. Play time: ${game.estimatedPlayTime}. [Play](${origin}/play/${game.slug}) · [Source](${REPO}/tree/main/games/${game.slug})`).join('\n')}
${communitySection(origin,community)}
## For parents

- [Parent FAQ](${origin}/faq): free, no ads or purchases, what data is collected (none), ages, devices and offline play.
- [For parents](${origin}/parents): age guidance, content notes and controls for every game.
- [Privacy](${origin}/privacy): no accounts, ads, analytics or tracking; saves stay on the device.
- [Terms of use](${origin}/terms): free to play; open-source code under the MIT License; the name and logo are ours.

## Guides

${guides.map(guide => `- [${guide.title}](${origin}/guides/${guide.slug}): ${guide.description}`).join('\n')}

## Build your own

- [Create a game](${REPO}/blob/main/docs/CREATE-A-GAME.md): the game contract and the starter template.
- [Example briefs](${REPO}/tree/main/docs/prompts): the prompts the games were built from with Claude Code.
- [Submit a game](${origin}/list-your-game): build a kid-safe game from the starter, check it with npm run check-submission and submit it in a pull request ([SUBMITTING.md](${REPO}/blob/main/SUBMITTING.md)).

## Optional

- [Everything in one file](${origin}/llms-full.txt): every game's details and safety facts, the parent FAQ and the guides.
`;
}

export function llmsFullText(origin: string,games: Game[],community: Game[] = []) {
  const line = (text: string) => markdown(text,origin);
  const game = (g: Game) => `### ${g.title}

${g.description}

- Page: ${origin}/game/${g.slug} · Play: ${origin}/play/${g.slug} · Source: ${REPO}/tree/main/games/${g.slug}
- Ages: ${g.ageGuidance} (a suggestion, not an official rating)
- Genres: ${g.categories.join(', ')}
- Play time: ${g.estimatedPlayTime}
- Plays on: ${list(g.supportedDevices.map(device => device.toLowerCase()))}, with ${list(g.controls.types.map(type => type.toLowerCase()))}${g.requirements.length ? `; needs ${list(g.requirements)}` : ''}
- What to expect: ${g.contentNotes}
- Safety: no ads, no purchases, no chat or messages, no accounts, and no network requests.
- Saved on the device: browser storage keys starting with \`${g.storage.prefix}\` (${g.storage.keys.join(', ')}).

How to play:
${g.controls.howToPlay.map(step => `- ${step}`).join('\n')}`;
  return `${intro(origin)}

## Games

${games.map(game).join('\n\n')}
${communitySection(origin,community)}
## Parent FAQ

${faq(games).map(item => `### ${item.question}\n\n${blocksToText(item.answer,line)}`).join('\n\n')}

## Guides

${guides.map(guide => `### ${guide.title}\n\n${origin}/guides/${guide.slug}\n\n${blocksToText(guideBodies[guide.slug]!,line)}`).join('\n\n')}
`;
}

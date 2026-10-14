// The brand, where the site is live, and its public profiles: one place for all of them. The page
// titles, structured data, llms.txt, the web app manifest and the README all follow from here.
import { REPO } from '../lib/links';

export const BRAND = 'AI Kids Games';
/**
 * The live address. Switch it (and SITE_ORIGIN in Vercel's Production environment) to
 * https://aikids.games once that domain is registered and connected: docs/seo/LAUNCH-CHECKLIST.md.
 */
export const PUBLIC_ORIGIN = 'https://ai-kids-games-fawn.vercel.app';
export const TAGLINE = 'The games kids love. None of the stuff parents don’t.';
export const SITE_DESCRIPTION = 'Free browser games for kids: kart racing, farming, tower defense, space adventures, puzzles and more. No ads, purchases, sign-ups or tracking.';
/**
 * The AI Kids Games app for AI assistants (apps/mcp, Vercel project ai-kids-games-mcp). Switch it to
 * https://aikids.games/mcp once the domain is live and /mcp is served there.
 */
export const MCP_ENDPOINT = 'https://ai-kids-games-mcp.vercel.app/mcp';
/** The project's own profiles (structured data `sameAs`; the About page links them): GitHub, YouTube, Facebook. */
export const PROFILES = [REPO,'https://www.youtube.com/@aikidsgamesph','https://www.facebook.com/ai.kids.games'] as const;
/** The person behind the project (structured data `founder`). */
export const FOUNDER = { name: 'Cliff Jefferson Sumalpong',profile: 'https://www.linkedin.com/in/cliff-jefferson-sumalpong/' };
/** IndexNow key (not a secret: search engines fetch it from public/<key>.txt to check pings come from us). */
export const INDEXNOW_KEY = '46675c952e9dbe72fff3230319f75cea';

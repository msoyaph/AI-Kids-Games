// Where the website is, and how the app names it. Everything the app links to or loads is on the
// website's origin, except the source code link (the public GitHub repo).

/** The live website until aikids.games is registered (apps/site/src/data/site.ts PUBLIC_ORIGIN). */
export const DEFAULT_SITE_ORIGIN = 'https://ai-kids-games-fawn.vercel.app';
export const BRAND = 'AI Kids Games';
export const REPO = 'https://github.com/msoyaph/AI-Kids-Games';
/** The brand domain: labels say "aikids.games" only once the site is actually served from it. */
export const BRAND_HOST = 'aikids.games';

export interface Site {
  /** e.g. https://aikids.games, no trailing slash. */
  origin: string;
  /** The host as people would type it: "aikids.games". */
  host: string;
  /** For buttons: "aikids.games" on the brand domain, otherwise the brand name ("Play on AI Kids Games"). */
  label: string;
}

/** SITE_ORIGIN (Vercel env) or the live default. Only https origins, or http on localhost for tests. */
export function siteFrom(origin = process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN): Site {
  const url = new URL(origin);
  const local = ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error(`SITE_ORIGIN must be an https origin, not ${origin}.`);
  const host = url.host.replace(/^www\./,'');
  return { origin: url.origin,host,label: host === BRAND_HOST ? BRAND_HOST : BRAND };
}

/** A link on the website, never with a query string or tracking parameters. */
export const siteUrl = (site: Site,path = '/') => new URL(path.split(/[?#]/)[0],`${site.origin}/`).href;

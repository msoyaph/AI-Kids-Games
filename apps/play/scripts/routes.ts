// The play origin's routing and headers (Vercel Build Output API v3, .vercel/output/config.json).
// Routes run before the filesystem, so they decide everything:
// - production: each approved game only on its own host, aikg-<slug>.vercel.app, where every path
//   serves that one game's file. Hosts are separate sites (vercel.app is on the Public Suffix
//   List), so games can't read each other's saves. Any other host or path gets the notice page or 404.
// - preview: games by path (/<slug>/) on the preview's own address, behind Vercel sign-in.
// Every response carries the strict security policy: nothing can be loaded or sent.
import { GAME_CSP } from '../../../scripts/submission/csp';

export const PLAY_HOST = (slug: string) => `aikg-${slug}.vercel.app`;
export interface PlayRoutesOptions { slugs: string[]; production: boolean; siteOrigins: string[] }

export function gameHeaders(siteOrigins: string[]): Record<string,string> {
  return {
    'Content-Security-Policy': `${GAME_CSP}; frame-ancestors ${siteOrigins.join(' ')}`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), display-capture=(), clipboard-read=()',
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'public, max-age=0, must-revalidate'
  };
}

export function playRoutes({ slugs,production,siteOrigins }: PlayRoutesOptions) {
  const headers = gameHeaders(siteOrigins);
  const routes: Record<string,unknown>[] = [{ src: '^/.*$',headers,continue: true }];
  if (production) {
    for (const slug of slugs) routes.push({ src: '^/.*$',has: [{ type: 'host',value: PLAY_HOST(slug) }],dest: `/${slug}/index.html` });
    routes.push({ src: '^/$',dest: '/index.html' },{ src: '^/.*$',dest: '/404.html',status: 404 });
  } else {
    routes.push({ handle: 'filesystem' },{ src: '^/.*$',dest: '/404.html',status: 404 });
  }
  return { version: 3,routes };
}

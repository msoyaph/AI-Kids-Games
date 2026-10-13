import { expect,test } from '@playwright/test';
import { INDEXNOW_KEY } from '../../src/data/site';

// Launch metadata served with the build: per-page titles, canonical URLs, Open Graph images,
// robots.txt, sitemap, llms.txt, favicons, the IndexNow key and the manifest, and real 404s.
test('static metadata, robots, sitemap and icons',async ({ request },info) => {
  test.skip(info.project.name !== 'desktop','Server responses are the same for every device.');
  // Vercel preview builds are deliberately noindex with a Disallow-all robots.txt.
  const robots = await (await request.get('/robots.txt')).text();
  const preview = /Disallow: \/\n/.test(robots);
  for (const [path,title,image] of [['/',"AI Kids Games: The games kids love. None of the stuff parents don’t.",'/og/site.jpg'],['/game/theabonk','TheaBonk: a free action game for kids | AI Kids Games','/og/theabonk.jpg'],['/play/space-sky','Play Space Sky | AI Kids Games','/og/space-sky.jpg'],['/privacy','Privacy | AI Kids Games','/og/site.jpg']]) {
    const html = await (await request.get(path)).text();
    expect(html,path).toContain(`<title>${title}</title>`);
    expect(html,path).toMatch(new RegExp(`<link rel="canonical" href="https?://[^"]+${path === '/' ? '/' : path}"`));
    expect(html,path).toMatch(new RegExp(`<meta property="og:image" content="https?://[^"]+${image}"`));
    expect(html,path).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(html.indexOf('<meta charset="UTF-8" />'),path).toBeLessThan(200);
    expect(html,path).toContain("connect-src 'self'");
    if (preview) expect(html,path).toContain('noindex'); else expect(html,path).not.toContain('noindex');
  }
  if (!preview) {
    expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
    for (const bot of ['GPTBot','ClaudeBot','PerplexityBot']) expect(robots).toContain(`User-agent: ${bot}\nAllow: /`);
  }
  // Structured data: WebSite and Organization everywhere, the game list on the home page, a free VideoGame on each game page.
  const ld = (html: string) => JSON.parse(/<script type="application\/ld\+json">(.+?)<\/script>/.exec(html)![1]!)['@graph'] as Record<string,any>[];
  const home = ld(await (await request.get('/')).text());
  expect(home.map(item => item['@type'])).toEqual(['WebSite','Organization','ItemList']);
  expect(home.find(item => item['@type'] === 'Organization')!.sameAs).toEqual(expect.arrayContaining(['https://github.com/msoyaph/AI-Kids-Games','https://www.youtube.com/@aikidsgamesph','https://www.facebook.com/ai.kids.games']));
  const game = ld(await (await request.get('/game/cliff-valley')).text()).find(item => item['@type'] === 'VideoGame')!;
  expect(game.gamePlatform).toContain('Web browser');
  expect(game).toMatchObject({ name: 'Cliff Valley',isAccessibleForFree: true,genre: ['Farming','Cozy','Adventure'],audience: { '@type': 'PeopleAudience',suggestedMinAge: 8,suggestedMaxAge: 14 },offers: { '@type': 'Offer',price: '0' } });
  expect(game.url).toMatch(/\/game\/cliff-valley$/); expect(game.image).toMatch(/\/og\/cliff-valley\.jpg$/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/games','/faq','/guides','/guides/choose-ad-free-games-for-kids','/parents','/privacy','/about','/list-your-game','/game/light-crossing','/game/cliff-valley','/game/tuck-pop','/category/racing','/category/farming']) expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap).not.toContain('/play/');
  for (const icon of ['/favicon.ico','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/icon-maskable-512.png','/brand/mark-96.png','/og/site.jpg','/llms.txt','/llms-full.txt']) expect((await request.get(icon)).status(),icon).toBe(200);
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toContain('/icon-512.png');
  expect(manifest.name).toBe('AI Kids Games');
  // IndexNow: the key file serves the key itself (search engines check it before trusting a ping).
  expect((await (await request.get(`/${INDEXNOW_KEY}.txt`)).text()).trim()).toBe(INDEXNOW_KEY);
  // Unknown addresses are real 404s, not the home page with status 200.
  const missing = await request.get('/not-a-real-page');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('This page wandered off.');
});

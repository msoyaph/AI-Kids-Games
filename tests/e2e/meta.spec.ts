import { expect,test } from '@playwright/test';

// Launch metadata served with the build: per-page titles, canonical URLs, Open Graph images,
// robots.txt, sitemap, favicons and manifest.
test('static metadata, robots, sitemap and icons',async ({ request },info) => {
  test.skip(info.project.name !== 'desktop','Server responses are the same for every device.');
  for (const [path,title,image] of [['/','Ai Kids Games — Little games. Big adventures.','/og/site.jpg'],['/game/theabonk','TheaBonk | Ai Kids Games','/og/theabonk.jpg'],['/play/space-sky','Play Space Sky | Ai Kids Games','/og/space-sky.jpg'],['/privacy','Privacy | Ai Kids Games','/og/site.jpg']]) {
    const html = await (await request.get(path)).text();
    expect(html,path).toContain(`<title>${title}</title>`);
    expect(html,path).toMatch(new RegExp(`<link rel="canonical" href="https?://[^"]+${path === '/' ? '/' : path}"`));
    expect(html,path).toMatch(new RegExp(`<meta property="og:image" content="https?://[^"]+${image}"`));
    expect(html,path).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(html.indexOf('<meta charset="UTF-8" />'),path).toBeLessThan(200);
    expect(html,path).toContain("connect-src 'self'");
    expect(html,path).not.toContain('noindex');
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/games','/parents','/privacy','/about','/game/light-crossing','/category/racing']) expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap).not.toContain('/play/');
  for (const icon of ['/favicon.ico','/favicon.svg','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/icon-maskable-512.png','/og/site.jpg']) expect((await request.get(icon)).status(),icon).toBe(200);
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toContain('/icon-512.png');
});

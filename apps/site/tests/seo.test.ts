import { existsSync,readdirSync,readFileSync,statSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';
import { listedManifests,readManifests } from '../../../scripts/lib/manifest';
import { categories,games } from '../src/data/games';
import { faq } from '../src/data/faq';
import { guides } from '../src/data/guides';
import { guideBodies } from '../src/data/guide-bodies';
import { FOUNDER,INDEXNOW_KEY,PROFILES } from '../src/data/site';
import { INLINE,type Block } from '../src/lib/rich-text';
import { pageFor } from '../src/routes';
import { llmsFullText,llmsText } from '../src/seo/llms';
import { pageMeta,sitePaths,unlistedPaths } from '../src/seo/meta';
import { structuredData } from '../src/seo/schema';

const ORIGIN = 'https://example.test';
const pub = (path: string) => join(import.meta.dirname,'../public',path);
type Node = Record<string,any>;
const graph = (path: string) => structuredData(path,ORIGIN)['@graph'] as unknown as Node[];
const of = (path: string,type: string) => graph(path).filter(node => node['@type'] === type);
const local = (url: string) => { expect(url.startsWith(`${ORIGIN}/`),url).toBe(true); return url.slice(ORIGIN.length); };

describe('page metadata',() => {
  const paths = [...sitePaths(),...unlistedPaths()];
  it('gives every page a unique title and a description search results show in full',() => {
    const titles = paths.map(path => pageMeta(path).fullTitle);
    expect(new Set(titles).size).toBe(titles.length);
    for (const path of paths) { const { description } = pageMeta(path); expect(description.length,`${path}: ${description}`).toBeGreaterThanOrEqual(50); expect(description.length,`${path}: ${description}`).toBeLessThanOrEqual(160); }
  });
  it('keeps Favorites and unknown addresses out of search',() => {
    expect(pageMeta('/favorites').index).toBe(false);
    for (const path of ['/nope','/game/nope','/category/nope','/guides/nope','/play/nope']) expect(pageMeta(path),path).toMatchObject({ missing: true,index: false });
  });
  it('lists every released game, guide and category in the sitemap, and no play pages',() => {
    const listed = sitePaths();
    for (const game of games) expect(listed).toContain(`/game/${game.slug}`);
    for (const guide of guides) expect(listed).toContain(`/guides/${guide.slug}`);
    for (const category of categories) expect(listed).toContain(`/category/${category.toLowerCase()}`);
    expect(listed.some(path => path.startsWith('/play/'))).toBe(false);
    expect(listed).toEqual(expect.arrayContaining(['/','/games','/faq','/guides','/parents','/privacy','/about']));
  });
  it('lists exactly the released games: none still in development',() => {
    expect(games.map(game => game.slug).sort()).toEqual(listedManifests().map(m => m.slug).sort());
    const hidden = readManifests().filter(m => m.site.status === 'In development').map(m => m.slug);
    const text = [JSON.stringify(sitePaths()),llmsText(ORIGIN,games),llmsFullText(ORIGIN,games),JSON.stringify(structuredData('/',ORIGIN))].join('\n');
    for (const slug of hidden) expect(text,slug).not.toContain(slug);
  });
});

describe('structured data (schema.org, with what search engines require)',() => {
  it('names the organization, its logo, profiles and founder on every page',() => {
    for (const path of [...sitePaths(),'/404']) {
      expect(of(path,'WebSite'),path).toHaveLength(1);
      const [org] = of(path,'Organization');
      expect(org,path).toMatchObject({ name: 'AI Kids Games',url: `${ORIGIN}/`,founder: { '@type': 'Person',name: FOUNDER.name,sameAs: FOUNDER.profile } });
      expect(org!.sameAs).toEqual([...PROFILES]);
      expect(existsSync(pub(local(org!.logo.url)))).toBe(true);
    }
  });
  it('describes each game as a free VideoGame with ages, screenshots and a breadcrumb trail',() => {
    for (const game of games) {
      const path = `/game/${game.slug}`;
      const [videoGame] = of(path,'VideoGame');
      expect(videoGame,path).toMatchObject({ name: game.title,description: game.description,url: ORIGIN+path,isAccessibleForFree: true,isFamilyFriendly: true,
        audience: { suggestedMinAge: game.minAge },offers: { price: '0',priceCurrency: 'USD' },applicationCategory: 'GameApplication' });
      expect(existsSync(pub(local(videoGame!.image))),path).toBe(true);
      for (const shot of videoGame!.screenshot) expect(existsSync(pub(local(shot.url))),shot.url).toBe(true);
      const [crumbs] = of(path,'BreadcrumbList');
      expect(crumbs!.itemListElement.map((item: Node) => item.position)).toEqual([1,2,3]);
      expect(crumbs!.itemListElement.at(-1).item).toBe(ORIGIN+path);
    }
  });
  it('lists the games on the home page and on each category page',() => {
    expect(of('/','ItemList')[0]!.itemListElement.map((item: Node) => item.name)).toEqual(games.map(game => game.title));
    for (const category of categories) {
      const [page] = of(`/category/${category.toLowerCase()}`,'CollectionPage');
      expect(page!.mainEntity.itemListElement.map((item: Node) => item.name)).toEqual(games.filter(game => game.categories.includes(category)).map(game => game.title));
    }
  });
  it('turns the FAQ into FAQPage questions with plain-text answers',() => {
    const [page] = of('/faq','FAQPage');
    expect(page!.mainEntity).toHaveLength(faq(games).length);
    for (const question of page!.mainEntity) {
      expect(question).toMatchObject({ '@type': 'Question',acceptedAnswer: { '@type': 'Answer' } });
      expect(question.acceptedAnswer.text.length).toBeGreaterThan(40);
      expect(question.acceptedAnswer.text).not.toMatch(/\]\(|\*\*/);
    }
  });
  it('marks up each guide as an Article',() => {
    for (const guide of guides) {
      const [article] = of(`/guides/${guide.slug}`,'Article');
      expect(article).toMatchObject({ headline: guide.title,datePublished: guide.published,dateModified: guide.updated,author: { '@id': `${ORIGIN}/#organization` } });
      expect(article!.headline.length).toBeLessThanOrEqual(110);
      expect(article!.articleBody.length).toBeGreaterThan(1500);
      expect(existsSync(pub(local(article!.image)))).toBe(true);
    }
  });
  it('describes the trailer on the About page as a VideoObject with its own files',() => {
    const [video] = of('/about','VideoObject');
    expect(video).toMatchObject({ name: 'AI Kids Games trailer',uploadDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),duration: expect.stringMatching(/^PT\d+S$/) });
    expect(video!.description.length).toBeGreaterThan(100);
    for (const url of [...video!.thumbnailUrl,video!.contentUrl,video!.caption.contentUrl]) expect(existsSync(pub(local(url))),url).toBe(true);
  });
  it('links only to this site, its profiles, schema.org and the games’ license',() => {
    const allowed = [ORIGIN,...PROFILES,FOUNDER.profile,'https://schema.org','https://opensource.org/licenses/MIT'];
    for (const path of [...sitePaths(),...unlistedPaths()]) {
      const urls = JSON.stringify(structuredData(path,ORIGIN)).match(/https?:\/\/[^"]+/g) ?? [];
      for (const url of urls) expect(allowed.some(prefix => url.startsWith(prefix)),`${path}: ${url}`).toBe(true);
    }
  });
});

describe('llms.txt and llms-full.txt',() => {
  it('cover every released game, the FAQ and the guides, at the address they are served from',() => {
    const short = llmsText(ORIGIN,games), full = llmsFullText(ORIGIN,games);
    for (const game of games) { expect(short).toContain(`${ORIGIN}/game/${game.slug}`); expect(full).toContain(`\`${game.storage.prefix}\``); expect(full).toContain(game.contentNotes); }
    for (const item of faq(games)) expect(full).toContain(`### ${item.question}`);
    for (const guide of guides) { expect(short).toContain(`${ORIGIN}/guides/${guide.slug}`); expect(full).toContain(`### ${guide.title}`); }
    expect(`${short}\n${full}`).not.toMatch(/aikids\.games|\]\(\//);
  });
});

describe('the FAQ and guides',() => {
  const links = (blocks: Block[]) => blocks.flatMap(block => 'p' in block ? [block.p] : 'h' in block ? [block.h] : 'ul' in block ? block.ul : block.ol).flatMap(text => [...text.matchAll(INLINE)].map(match => match[2]).filter((href): href is string => !!href));
  it('only link to pages that exist, or to full https addresses elsewhere',() => {
    for (const href of [...faq(games).flatMap(item => links(item.answer)),...Object.values(guideBodies).flatMap(links)]) {
      if (href.startsWith('/')) expect(pageMeta(href.split('#')[0]!).missing,href).toBeUndefined();
      else expect(href,href).toMatch(/^https:\/\//);
    }
  });
  it('have a body for every guide',() => { for (const guide of guides) expect(guideBodies[guide.slug]?.length,guide.slug).toBeGreaterThan(5); });
});

describe('routes',() => {
  it('show the right page for each address',() => {
    const expected: [string,string][] = [['/','Home'],['/games','Browse'],['/category/action','Browse'],['/game/tuck-pop','Details'],['/play/tuck-pop','Play'],['/favorites','Favorites'],['/parents','Parents'],['/faq','Faq'],['/guides','Guides'],['/guides/what-makes-a-game-kid-safe','Guide'],['/about','About'],['/privacy','Privacy'],['/list-your-game','ListYourGame'],['/nope','NotFound'],['/game/a/b','NotFound']];
    for (const [path,page] of expected) expect(pageFor(path),path).toBe(page);
  });
});

describe('brand and IndexNow',() => {
  it('spells the brand one way across the site source',() => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir,name); return statSync(path).isDirectory() ? files(path) : [path]; });
    const source = [...files(join(import.meta.dirname,'../src')),join(import.meta.dirname,'../index.html'),pub('manifest.webmanifest')];
    for (const file of source) expect(readFileSync(file,'utf8'),file).not.toContain('Ai Kids Games');
  });
  it('serves the IndexNow key from public/<key>.txt',() => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(readFileSync(pub(`${INDEXNOW_KEY}.txt`),'utf8')).toBe(INDEXNOW_KEY);
  });
});

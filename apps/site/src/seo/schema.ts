// Structured data (JSON-LD) for every page, typed with schema-dts so the type checker rejects any
// type or property schema.org doesn't define. tests/structured-data.test.ts also checks the
// properties search engines require. The build writes it into each page's static HTML.
import type { Article,BreadcrumbList,CollectionPage,FAQPage,Graph,ItemList,Organization,Thing,VideoGame,VideoObject,WebSite } from 'schema-dts';
import { categories,games,type Game } from '../data/games';
import { communityGames,findAnyGame } from '../data/community';
import { faq } from '../data/faq';
import { findGuide,guides } from '../data/guides';
import { guideBodies } from '../data/guide-bodies';
import { BRAND,FOUNDER,PROFILES,SITE_DESCRIPTION } from '../data/site';
import trailer from '../data/trailer.json';
import { gameTrailer } from '../data/trailers';
import { blocksToText } from '../lib/rich-text';
import { mediaFor } from '../lib/media';
import { pageMeta } from './meta';

const LICENSES: Record<string,string> = { MIT: 'https://opensource.org/licenses/MIT' };
/** The day the trailer was published with release 2.3.0. */
const TRAILER_PUBLISHED = '2026-10-12';

export function structuredData(pathname: string,origin: string): Graph {
  const url = (path: string) => `${origin}${path}`;
  const organizationId = url('/#organization');
  const organization: Organization = {
    '@type': 'Organization','@id': organizationId,name: BRAND,url: url('/'),description: SITE_DESCRIPTION,
    logo: { '@type': 'ImageObject',url: url('/icon-512.png'),width: '512',height: '512' },
    sameAs: PROFILES,
    founder: { '@type': 'Person',name: FOUNDER.name,sameAs: FOUNDER.profile }
  };
  const website: WebSite = { '@type': 'WebSite','@id': url('/#website'),name: BRAND,url: url('/'),description: SITE_DESCRIPTION,inLanguage: 'en',publisher: { '@id': organizationId } };
  const publisher = { '@id': organizationId };
  const crumbs = (items: [string,string][]): BreadcrumbList => ({ '@type': 'BreadcrumbList',itemListElement: items.map(([name,path],index) => ({ '@type': 'ListItem',position: index+1,name,item: url(path) })) });
  const gameList = (list: Game[],name: string): ItemList => ({ '@type': 'ItemList',name,numberOfItems: list.length,itemListElement: list.map((game,index) => ({ '@type': 'ListItem',position: index+1,url: url(`/game/${game.slug}`),name: game.title })) });

  /** A game's own trailer (marketing/sizzle npm run trailers), as the VideoGame's trailer. */
  function trailerOf(game: Game): VideoObject | undefined {
    const t = game.community ? undefined : gameTrailer(game.slug);
    if (!t) return undefined;
    return {
      '@type': 'VideoObject',name: `${game.title} trailer`,
      description: `A ${Math.round(t.seconds)}-second look at ${game.title}, a free game for kids on ${BRAND}. ${t.description.slice(0,3).join(' ')}`,
      thumbnailUrl: [url(t.poster),url(t.posterWebp)],uploadDate: t.published ?? TRAILER_PUBLISHED,duration: `PT${Math.round(t.seconds)}S`,
      contentUrl: url(t.sources.find(source => source.type === 'video/mp4')!.src),encodingFormat: 'video/mp4',width: '1280',height: '720',inLanguage: 'en',
      caption: { '@type': 'MediaObject',contentUrl: url(t.captions),encodingFormat: 'text/vtt',inLanguage: 'en' },
      isFamilyFriendly: true,publisher,url: url(`/game/${game.slug}#trailer`)
    };
  }
  function videoGame(game: Game): VideoGame {
    const ages = /(\d+)(?:–(\d+))?/.exec(game.ageGuidance);
    const media = mediaFor(game);
    return {
      '@type': 'VideoGame','@id': url(`/game/${game.slug}#game`),name: game.title,description: game.description,url: url(`/game/${game.slug}`),
      image: url(media.og),screenshot: media.shots.map(shot => ({ '@type': 'ImageObject',url: url(shot.full.jpg),caption: shot.alt })),
      genre: game.categories,keywords: game.keywords.join(', '),gamePlatform: ['Web browser',...game.supportedDevices],
      applicationCategory: 'GameApplication',operatingSystem: 'Any device with a modern web browser',inLanguage: 'en',version: game.version,datePublished: game.releaseDate,
      audience: { '@type': 'PeopleAudience',suggestedMinAge: game.minAge,...(ages?.[2] ? { suggestedMaxAge: Number(ages[2]) } : {}) },
      typicalAgeRange: ages?.[2] ? `${ages[1]}-${ages[2]}` : `${game.minAge}-`,
      isFamilyFriendly: true,isAccessibleForFree: true,
      ...(LICENSES[game.license] ? { license: LICENSES[game.license] } : {}),
      offers: { '@type': 'Offer',price: '0',priceCurrency: 'USD',availability: 'https://schema.org/InStock',url: url(`/play/${game.slug}`) },
      ...(trailerOf(game) ? { trailer: trailerOf(game) } : {}),
      author: game.community ? { '@type': 'Person',name: game.community.handle } : publisher,publisher
    };
  }

  const graph: Thing[] = [website,organization];
  const path = pathname.replace(/\/+$/,'') || '/';
  const [,section,slug] = path.split('/');
  if (path === '/') graph.push(gameList(games,`${BRAND} games`));
  else if (section === 'category') {
    const category = categories.find(name => name.toLowerCase() === slug);
    if (category) {
      const page: CollectionPage = { '@type': 'CollectionPage',name: pageMeta(path).title,url: url(path),isPartOf: { '@id': url('/#website') },mainEntity: gameList(games.filter(game => game.categories.includes(category)),pageMeta(path).title) };
      graph.push(page,crumbs([['Home','/'],['Games','/games'],[`${category} games`,path]]));
    }
  } else if (section === 'game') {
    const game = findAnyGame(slug);
    if (game) graph.push(videoGame(game),crumbs(game.community ? [['Home','/'],['Community','/community'],[game.title,path]] : [['Home','/'],['Games','/games'],[game.title,path]]));
  } else if (path === '/community') {
    const page: CollectionPage = { '@type': 'CollectionPage',name: 'Community games',url: url(path),isPartOf: { '@id': url('/#website') },mainEntity: gameList(communityGames,'Community games') };
    graph.push(page);
  } else if (path === '/faq') {
    const page: FAQPage = { '@type': 'FAQPage',url: url(path),name: 'Parent FAQ',mainEntity: faq(games).map(item => ({ '@type': 'Question',name: item.question,acceptedAnswer: { '@type': 'Answer',text: blocksToText(item.answer) } })) };
    graph.push(page);
  } else if (path === '/guides') {
    const page: CollectionPage = { '@type': 'CollectionPage',name: 'Guides for parents',url: url(path),isPartOf: { '@id': url('/#website') },hasPart: guides.map(guide => ({ '@type': 'Article',headline: guide.title,url: url(`/guides/${guide.slug}`) })) };
    graph.push(page);
  } else if (section === 'guides') {
    const guide = findGuide(slug);
    if (guide) {
      const article: Article = {
        '@type': 'Article',headline: guide.title,description: guide.description,url: url(path),mainEntityOfPage: url(path),
        image: url('/og/site.jpg'),datePublished: guide.published,dateModified: guide.updated,inLanguage: 'en',
        author: publisher,publisher,isAccessibleForFree: true,articleBody: blocksToText(guideBodies[guide.slug]!)
      };
      graph.push(article,crumbs([['Home','/'],['Guides','/guides'],[guide.title,path]]));
    }
  } else if (path === '/about') {
    const video: VideoObject = {
      '@type': 'VideoObject',name: `${BRAND} trailer`,
      description: `A ${trailer.seconds}-second look at the games on ${BRAND}, made for kids with no ads, purchases or sign-ups. ${trailer.description.slice(2,8).join(' ')}`,
      thumbnailUrl: [url(trailer.poster),url(trailer.posterWebp)],uploadDate: TRAILER_PUBLISHED,duration: `PT${trailer.seconds}S`,
      contentUrl: url('/trailer/trailer-1080.mp4'),encodingFormat: 'video/mp4',width: '1920',height: '1080',inLanguage: 'en',
      caption: { '@type': 'MediaObject',contentUrl: url(trailer.captions),encodingFormat: 'text/vtt',inLanguage: 'en' },
      isFamilyFriendly: true,publisher,url: url('/about')
    };
    graph.push(video);
  }
  return { '@context': 'https://schema.org','@graph': graph };
}

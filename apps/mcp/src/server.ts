// The AI Kids Games MCP server: four read-only tools, one widget and the games' verified builds.
// A fresh instance serves each request (stateless). Tools take only fixed choices (enums and
// numbers), never free text, so nothing from a conversation can reach us through them.
import { McpServer,ResourceTemplate,type CallToolResult } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { BRAND,REPO,type Site } from './config';
import { catalog as defaultCatalog,DEVICES,findGame,findGames,GENRES,MOODS,plays,summary,type Filters } from './catalog';
import type { CatalogGame } from './data/types';
import { gameOutput,listOutput,parentOutput,type GameView } from './schemas';
import { BUILD_TEMPLATE,BUILD_URI,WIDGET_MIME,WIDGET_URI } from './shared';
import { argText,description,instructions,parentInfo,sourceLine,tools } from './text';
import pkg from '../package.json' with { type: 'json' };

export interface ServerOptions {
  site: Site;
  /** This server's own origin (icons are served next to it). */
  serverOrigin: string;
  /** The built widget (dist/widget.html). */
  widgetHtml: string;
  /** A game's verified build as text (server-side fetch from the site, checked against its SHA-256). */
  readBuild: (game: CatalogGame) => Promise<string>;
  games?: CatalogGame[];
}

const READ_ONLY = { readOnlyHint: true,destructiveHint: false,idempotentHint: true,openWorldHint: false } as const;
const CACHE = { ttlMs: 10*60_000,cacheScope: 'public' } as const;

/** Where the widget may load from and link to: only the website (and the repo, for links). */
export function widgetMeta(site: Site) {
  return {
    ui: { csp: { connectDomains: [site.origin],resourceDomains: [site.origin] },prefersBorder: true },
    'openai/widgetCSP': { connect_domains: [site.origin],resource_domains: [site.origin],redirect_domains: [site.origin,'https://github.com'] },
    'openai/widgetDomain': site.origin,
    'openai/widgetPrefersBorder': true,
    'openai/widgetDescription': `${BRAND} game cards and a player for one game. The card already shows the game's details, so there is no need to repeat them.`
  };
}
const toolMeta = (name: keyof typeof tools) => {
  const t = tools[name];
  return {
    ui: { resourceUri: WIDGET_URI },'ui/resourceUri': WIDGET_URI,'openai/outputTemplate': WIDGET_URI,
    ...('invoking' in t ? { 'openai/toolInvocation/invoking': t.invoking,'openai/toolInvocation/invoked': t.invoked } : {})
  };
};

const ages = (game: GameView) => `ages ${game.ages}`;
const sitting = (game: GameView) => game.sessionMinutes ? `, ${game.sessionMinutes[0]}–${game.sessionMinutes[1]} min a sitting` : '';
const line = (game: GameView) => `- ${game.title} (${ages(game)}, ${game.genres.join(' · ')}${sitting(game)}): ${game.tagline} ${game.url}`;
const text = (site: Site,...parts: string[]): CallToolResult['content'] => [{ type: 'text',text: [...parts,sourceLine(site)].join('\n') }];
const describeFilters = (f: Filters) => [f.age !== undefined && `age ${f.age}`,f.genre,f.device,f.minutes !== undefined && `${f.minutes} minutes`,f.mood].filter(Boolean).join(', ');

export function createServer(options: ServerOptions) {
  const { site,serverOrigin,widgetHtml,readBuild } = options, games = options.games ?? defaultCatalog.games;
  const slugs = games.map(game => game.slug) as [string,...string[]];
  const server = new McpServer({
    name: 'ai-kids-games',title: BRAND,version: pkg.version,description,websiteUrl: site.origin,
    icons: [192,512].map(size => ({ src: `${serverOrigin}/icon-${size}.png`,mimeType: 'image/png',sizes: [`${size}x${size}`] }))
  },{ instructions: instructions(site),capabilities: { tools: {},resources: {} },cacheHints: { 'tools/list': CACHE,'resources/list': CACHE,'resources/templates/list': CACHE,'server/discover': CACHE } });

  server.registerTool('find_games',{
    title: tools.find_games.title,description: tools.find_games.description,annotations: { title: tools.find_games.title,...READ_ONLY },
    inputSchema: z.object({
      age: z.number().int().min(2).max(17).optional().describe(argText.age),
      genre: z.enum(GENRES).optional().describe(argText.genre),
      device: z.enum(DEVICES).optional().describe(argText.device),
      minutes: z.number().int().min(1).max(240).optional().describe(argText.minutes),
      mood: z.enum(MOODS).optional().describe(argText.mood)
    }),
    outputSchema: listOutput,_meta: toolMeta('find_games')
  },async filters => {
    const { games: found,relaxed } = findGames(games,filters), views = found.map(game => summary(game,site)), asked = describeFilters(filters);
    const intro = !views.length
      ? `No ${BRAND} game matches ${asked}. Try fewer filters, or see every game at ${site.origin}.`
      : `${views.length} ${BRAND} game${views.length > 1 ? 's' : ''}${asked ? ` for ${asked}` : ''}${relaxed.length ? ` (nothing matched every filter, so these leave out ${relaxed.join(' and ')})` : ''}:`;
    const structured = { view: 'list' as const,site,filters: Object.fromEntries(Object.entries(filters).filter(([,value]) => value !== undefined)) as Record<string,string | number>,relaxed,games: views,source: sourceLine(site) };
    return { content: text(site,intro,...views.map(line)),structuredContent: structured };
  });

  const gameTool = (name: 'show_game' | 'play_game') => server.registerTool(name,{
    title: tools[name].title,description: tools[name].description,annotations: { title: tools[name].title,...READ_ONLY },
    inputSchema: z.object({ game: z.enum(slugs).describe(argText.game) }),
    outputSchema: gameOutput,_meta: toolMeta(name)
  },async ({ game: slug }) => {
    const game = findGame(games,slug)!, view = summary(game,site);
    const playable = plays(game), player = name === 'play_game' && playable;
    const note = name === 'play_game' && !playable ? `${game.title} plays on the website, not here. Open it at ${view.url}.` : undefined;
    const facts = [`${game.title}: ${game.pitch}`,`Suggested ${ages(view)}${sitting(view)}. ${game.contentNotes}`,
      'No ads, purchases, accounts, chat or tracking.',
      player ? `The player is open${game.embed === 'fullscreen' ? ' (it plays fullscreen)' : ''}. Progress here may not be saved; playing on the website keeps it.` : note ?? '',
      `Play on the website: ${view.url}`].filter(Boolean);
    return { content: text(site,...facts),structuredContent: { view: player ? 'player' as const : 'card' as const,site,game: view,...(note ? { note } : {}),source: sourceLine(site) } };
  });
  gameTool('show_game'); gameTool('play_game');

  server.registerTool('parent_info',{
    title: tools.parent_info.title,description: tools.parent_info.description,annotations: { title: tools.parent_info.title,...READ_ONLY },
    inputSchema: z.object({}),outputSchema: parentOutput
  },async () => {
    const info = parentInfo(site);
    return {
      content: text(site,...info.promises.map(p => `- ${p.title}: ${p.text}`),`Source code: ${REPO}`,`For parents: ${info.links.forParents}`,`Privacy: ${info.links.privacy}`),
      structuredContent: { ...info,source: sourceLine(site) }
    };
  });

  server.registerResource('widget',WIDGET_URI,{
    title: `${BRAND} cards and player`,description: 'The game card, game list and player shown by the tools.',mimeType: WIDGET_MIME,_meta: widgetMeta(site),cacheHint: CACHE
  },async uri => ({ contents: [{ uri: uri.href,mimeType: WIDGET_MIME,text: widgetHtml,_meta: widgetMeta(site) }] }));

  // The verified builds, for widgets whose host lets them read server resources (instead of fetching from the site).
  server.registerResource('game-build',new ResourceTemplate(BUILD_TEMPLATE,{ list: undefined }),{
    title: 'A game\'s verified build',description: 'The exact single-file game the website serves, for the player widget.',mimeType: 'text/html',cacheHint: CACHE
  },async (uri,{ slug }) => {
    const game = typeof slug === 'string' ? findGame(games,slug) : undefined;
    if (!game || !plays(game) || uri.href !== BUILD_URI(game.slug)) throw new Error(`No playable game at ${uri.href}.`);
    return { contents: [{ uri: uri.href,mimeType: 'text/html',text: await readBuild(game) }] };
  });
  return server;
}

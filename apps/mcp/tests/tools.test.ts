import { afterAll,describe,expect,it } from 'vitest';
import { catalog } from '../src/catalog';
import { BUILD_URI,WIDGET_MIME,WIDGET_URI } from '../src/shared';
import { builds,connect,site,WIDGET } from './helpers';

type Text = { type: string; text: string };
const textOf = (result: { content?: unknown }) => (result.content as Text[]).map(block => block.text).join('\n');
const SOURCE = `From AI Kids Games: free, ad-free games for kids. ${site.host}`;

describe.each(['legacy','modern'] as const)('the MCP server (%s protocol)',era => {
  const client = connect(era);
  afterAll(async () => (await client).close());

  it('lists four read-only tools with titles, and the widget on the three that show games',async () => {
    const { tools } = await (await client).listTools();
    expect(tools.map(tool => tool.name)).toEqual(['find_games','show_game','play_game','parent_info']);
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toMatchObject({ title: tool.title,readOnlyHint: true,destructiveHint: false,idempotentHint: true,openWorldHint: false });
      expect(tool.outputSchema).toBeTruthy();
      expect(tool.name.length).toBeLessThanOrEqual(64);
    }
    for (const tool of tools.filter(tool => tool.name !== 'parent_info')) expect(tool._meta).toMatchObject({ ui: { resourceUri: WIDGET_URI },'openai/outputTemplate': WIDGET_URI });
    expect(tools.find(tool => tool.name === 'parent_info')!._meta?.ui).toBeUndefined();
  });

  it('takes only fixed choices: no free-text arguments anywhere',async () => {
    const { tools } = await (await client).listTools();
    for (const tool of tools) for (const [name,schema] of Object.entries((tool.inputSchema.properties ?? {}) as Record<string,{ type?: string; enum?: unknown[] }>))
      expect(schema.type === 'string' ? !!schema.enum : true,`${tool.name}.${name}`).toBe(true);
  });

  it('find_games: a quick puzzle for an 8-year-old',async () => {
    const result = await (await client).callTool({ name: 'find_games',arguments: { age: 8,genre: 'Puzzle',minutes: 10 } });
    const data = result.structuredContent as { view: string; games: { slug: string; url: string }[]; relaxed: string[] };
    expect(data.view).toBe('list');
    expect(data.games.map(game => game.slug)).toEqual(['tuck-pop']);
    expect(data.games[0].url).toBe(`${site.origin}/game/tuck-pop`);
    expect(textOf(result)).toContain(`${site.origin}/game/tuck-pop`);
    expect(textOf(result).endsWith(SOURCE)).toBe(true);
  });

  it('find_games never shows a game to a child younger than its suggested age, and never relaxes age',async () => {
    const result = await (await client).callTool({ name: 'find_games',arguments: { age: 6,genre: 'Racing' } });
    const data = result.structuredContent as { games: unknown[]; relaxed: string[] };
    expect(data.games).toEqual([]); // Calex Cart is 10+
    expect(data.relaxed).toEqual([]);
    expect(textOf(result)).toContain('No AI Kids Games game matches');
    const young = (await (await client).callTool({ name: 'find_games',arguments: { age: 6 } })).structuredContent as { games: { minAge: number }[] };
    expect(young.games.length).toBeGreaterThan(0);
    expect(young.games.every(game => game.minAge <= 6)).toBe(true);
  });

  it('find_games relaxes mood, then time, when nothing matches all of them',async () => {
    const data = (await (await client).callTool({ name: 'find_games',arguments: { genre: 'Racing',mood: 'calm' } })).structuredContent as { games: { slug: string }[]; relaxed: string[] };
    expect(data.relaxed).toEqual(['mood']);
    expect(data.games.map(game => game.slug)).toEqual(['calex-cart']);
  });

  it('find_games with no filters lists every released game, each with its page',async () => {
    const data = (await (await client).callTool({ name: 'find_games',arguments: {} })).structuredContent as { games: { slug: string; url: string }[] };
    expect(data.games.map(game => game.slug)).toEqual(catalog.games.map(game => game.slug));
    for (const game of data.games) expect(game.url).toBe(`${site.origin}/game/${game.slug}`);
  });

  it('show_game returns a card with ages, content notes, safety and the page link',async () => {
    const result = await (await client).callTool({ name: 'show_game',arguments: { game: 'space-sky' } });
    const data = result.structuredContent as { view: string; game: { ages: string; contentNotes: string; url: string; embed: string; build?: { sha256: string } } };
    expect(data.view).toBe('card');
    expect(data.game).toMatchObject({ ages: '6–10',embed: 'fullscreen',url: `${site.origin}/game/space-sky` });
    expect(data.game.build?.sha256).toBe(catalog.games.find(game => game.slug === 'space-sky')!.build!.sha256);
    expect(textOf(result)).toContain('No ads, purchases, accounts, chat or tracking.');
    expect(textOf(result).endsWith(SOURCE)).toBe(true);
  });

  it('play_game opens the player for games that play here, and a card that links to the website for the rest',async () => {
    const play = (await (await client).callTool({ name: 'play_game',arguments: { game: 'tuck-pop' } })).structuredContent as { view: string; game: { build: { url: string; uri: string } } };
    expect(play.view).toBe('player');
    expect(play.game.build).toMatchObject({ url: `${site.origin}/games/tuck-pop/index.html`,uri: BUILD_URI('tuck-pop') });
    const site_only = await (await client).callTool({ name: 'play_game',arguments: { game: 'cliff-valley' } });
    const data = site_only.structuredContent as { view: string; note: string; game: { embed: string; build?: unknown } };
    expect(data).toMatchObject({ view: 'card',game: { embed: 'site' } });
    expect(data.game.build).toBeUndefined();
    expect(data.note).toContain('plays on the website');
  });

  it('refuses a game that isn\'t in the catalog',async () => {
    const result = await (await client).callTool({ name: 'show_game',arguments: { game: 'not-a-game' } }).catch((error: Error) => ({ isError: true,content: [{ type: 'text',text: error.message }] }));
    expect(result.isError).toBe(true);
  });

  it('parent_info: the promises, the GitHub repo and the For Parents page',async () => {
    const result = await (await client).callTool({ name: 'parent_info',arguments: {} });
    const text = textOf(result);
    expect(text).toContain('Free and open source: see the code on GitHub.');
    expect(text).toContain('https://github.com/msoyaph/AI-Kids-Games');
    expect(text).toContain(`${site.origin}/parents`);
    expect(text.endsWith(SOURCE)).toBe(true);
    expect(result.structuredContent).toMatchObject({ links: { forParents: `${site.origin}/parents`,privacy: `${site.origin}/privacy`,github: 'https://github.com/msoyaph/AI-Kids-Games' } });
  });

  it('serves the widget with a CSP that allows only the website',async () => {
    const { resources } = await (await client).listResources();
    expect(resources.map(resource => resource.uri)).toEqual([WIDGET_URI]);
    const read = await (await client).readResource({ uri: WIDGET_URI });
    const content = read.contents[0] as { mimeType: string; text: string; _meta: Record<string,any> };
    expect(content).toMatchObject({ mimeType: WIDGET_MIME,text: WIDGET });
    expect(content._meta.ui).toEqual({ csp: { connectDomains: [site.origin],resourceDomains: [site.origin] },prefersBorder: true });
    expect(content._meta.ui.csp.frameDomains).toBeUndefined();
    expect(content._meta['openai/widgetCSP'].redirect_domains).toEqual([site.origin,'https://github.com']);
  });

  it('serves a game\'s verified build to widgets that read it through the host',async () => {
    builds.set('tuck-pop','<!doctype html>tuck pop');
    const read = await (await client).readResource({ uri: BUILD_URI('tuck-pop') });
    expect((read.contents[0] as { text: string }).text).toBe('<!doctype html>tuck pop');
    await expect((await client).readResource({ uri: BUILD_URI('cliff-valley') })).rejects.toThrow();
  });
});

describe('server identity',() => {
  it('names the app, its website and icons, with short instructions for assistants',async () => {
    const client = await connect('legacy');
    const info = client.getServerVersion()!;
    expect(info).toMatchObject({ name: 'ai-kids-games',title: 'AI Kids Games',websiteUrl: site.origin });
    expect(info.icons?.map(icon => icon.src)).toEqual(['http://mcp.test/icon-192.png','http://mcp.test/icon-512.png']);
    const instructions = client.getInstructions()!;
    expect(instructions.length).toBeLessThanOrEqual(512);
    expect(instructions).toContain('parents and caregivers');
    await client.close();
  });
});

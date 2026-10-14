// npm run inspect --workspace apps/mcp                      (local server, after npm run build)
// npm run inspect --workspace apps/mcp -- --url <endpoint>  (a deployed endpoint, e.g. the preview)
// Automated checks with the official MCP Inspector CLI (pinned): the tool list (with its schema
// portability check), every tool, the widget resource and its MCP App metadata, and a verified build,
// in both protocol eras. Locally it serves apps/site/public as the website on 127.0.0.1:4335.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync,mkdtempSync,readFileSync,statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname,join,normalize,resolve } from 'node:path';
import { catalog } from '../src/catalog';
import { siteFrom } from '../src/config';
import { BUILD_URI,WIDGET_MIME,WIDGET_URI } from '../src/shared';
import { startServer } from './serve';

const INSPECTOR = '@modelcontextprotocol/inspector@2.8.0';
const flag = (name: string) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at+1] : undefined; };
let url = flag('--url'), site = flag('--site');
const servers: { close: () => void }[] = [];
if (!url) {
  const publicDir = resolve(import.meta.dirname,'../../site/public');
  const types: Record<string,string> = { '.html': 'text/html; charset=utf-8','.svg': 'image/svg+xml','.png': 'image/png','.webp': 'image/webp' };
  servers.push(createServer((req,res) => {
    const file = normalize(join(publicDir,new URL(req.url ?? '/','http://x').pathname));
    if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200,{ 'content-type': types[extname(file)] ?? 'application/octet-stream','access-control-allow-origin': '*' }).end(readFileSync(file));
  }).listen(4335,'127.0.0.1'));
  site = 'http://127.0.0.1:4335';
  servers.push(await startServer(4334,siteFrom(site)));
  url = 'http://127.0.0.1:4334/mcp';
}
const expectedSite = siteFrom(site);
// The Inspector keeps a catalog and client config in the home folder by default; give it a scratch folder.
const scratch = mkdtempSync(join(tmpdir(),'aikg-inspector-'));
const env = { ...process.env,MCP_CATALOG_PATH: join(scratch,'mcp.json'),MCP_CLIENT_CONFIG_PATH: join(scratch,'client.json') };

let failures = 0;
const check = (name: string,ok: boolean,detail = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `: ${detail}`}`); if (!ok) failures++; };
/** One Inspector CLI run. Asynchronous: the local servers above run in this same process. */
function inspector(era: string,...args: string[]) {
  return new Promise<{ status: number | null; lines: any[]; json: any; stderr: string }>(done => {
    const child = spawn('npx',['-y',INSPECTOR,'--cli',url!,'--transport','http','--protocol-era',era,'--format','json',...args],{ env });
    let stdout = '',stderr = '';
    child.stdout.on('data',chunk => { stdout += chunk; }); child.stderr.on('data',chunk => { stderr += chunk; });
    child.on('close',status => {
      const lines = stdout.trim().split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line));
      done({ status,lines,json: lines.length === 1 ? lines[0].result ?? lines[0] : undefined,stderr });
    });
  });
}

for (const era of ['legacy','modern']) {
  console.log(`\nMCP Inspector (${INSPECTOR}), ${era} protocol, ${url}`);
  const list = await inspector(era,'--method','tools/list','--strict');
  const tools = (list.json?.tools ?? []) as { name: string; title?: string; annotations?: Record<string,unknown> }[];
  check('tools/list: four tools, schemas portable (--strict)',list.status === 0 && tools.map(tool => tool.name).join() === 'find_games,show_game,play_game,parent_info',list.stderr);
  check('every tool is read-only with a title',tools.length === 4 && tools.every(tool => tool.title && tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false && tool.annotations?.openWorldHint === false));
  const apps = (await inspector(era,'--method','tools/list','--app-info')).lines as { tool?: string; name?: string; resourceUri?: string; csp?: { connectDomains?: string[]; frameDomains?: string[] } }[];
  const withApp = apps.filter(line => line.resourceUri === WIDGET_URI);
  check('--app-info: the widget on find_games, show_game and play_game',withApp.length === 3,JSON.stringify(apps));
  check('--app-info: the widget may reach only the website, and frames nothing',withApp.length === 3 && withApp.every(line => line.csp?.connectDomains?.join() === expectedSite.origin && !line.csp?.frameDomains?.length),JSON.stringify(withApp[0]?.csp));

  const call = async (tool: string,args: object) => (await inspector(era,'--method','tools/call','--tool-name',tool,'--tool-args-json',JSON.stringify(args))).json as { structuredContent?: any; content?: { text: string }[]; isError?: boolean } | undefined;
  const found = await call('find_games',{ age: 8,genre: 'Puzzle',minutes: 10 });
  check('find_games: a quick puzzle for an 8-year-old → Tuck Pop',found?.structuredContent?.games?.map((game: { slug: string }) => game.slug).join() === 'tuck-pop',JSON.stringify(found));
  check('find_games: the text ends with the source line',!!found?.content?.at(-1)?.text.endsWith(`From AI Kids Games: free, ad-free games for kids. ${expectedSite.host}`));
  const card = await call('show_game',{ game: 'space-sky' });
  check('show_game: a card with the page link',card?.structuredContent?.view === 'card' && card.structuredContent.game.url === `${expectedSite.origin}/game/space-sky`);
  const player = await call('play_game',{ game: 'tuck-pop' });
  check('play_game: the player, with the verified build',player?.structuredContent?.view === 'player' && player.structuredContent.game.build.sha256 === catalog.games.find(game => game.slug === 'tuck-pop')!.build!.sha256);
  const parents = await call('parent_info',{});
  check('parent_info: GitHub and For Parents links',parents?.structuredContent?.links?.github === 'https://github.com/msoyaph/AI-Kids-Games' && parents.structuredContent.links.forParents === `${expectedSite.origin}/parents`);
  const wrong = await inspector(era,'--method','tools/call','--tool-name','show_game','--tool-args-json','{"game":"not-a-game"}');
  check('show_game refuses a game that is not in the catalog',(wrong.status !== 0 && /not-a-game|invalid|enum/i.test(wrong.stderr + JSON.stringify(wrong.lines))) || wrong.json?.isError === true,JSON.stringify(wrong.lines));

  const resources = (await inspector(era,'--method','resources/list')).json as { resources?: { uri: string }[] } | undefined;
  check('resources/list: the widget',resources?.resources?.map(resource => resource.uri).join() === WIDGET_URI);
  const widget = (await inspector(era,'--method','resources/read','--uri',WIDGET_URI)).json as { contents?: { mimeType: string; text: string }[] } | undefined;
  check('resources/read: the widget is an MCP App page',widget?.contents?.[0]?.mimeType === WIDGET_MIME && /^<!doctype html>/i.test(widget.contents[0].text));
  const tuck = catalog.games.find(game => game.slug === 'tuck-pop')!;
  const build = (await inspector(era,'--method','resources/read','--uri',BUILD_URI('tuck-pop'))).json as { contents?: { text: string }[] } | undefined;
  const text = build?.contents?.[0]?.text ?? '';
  check('resources/read: Tuck Pop\'s build is byte-identical to the verified import',createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex') === tuck.build!.sha256);
}
for (const server of servers) server.close();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll MCP Inspector checks passed.');
process.exit(failures ? 1 : 0);

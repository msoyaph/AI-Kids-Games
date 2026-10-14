// npm run serve --workspace apps/mcp [-- --port 4333]
// The MCP endpoint locally, as on Vercel: /mcp plus the static files from the last build.
// SITE_ORIGIN says where the games and pictures load from (the harness serves apps/site/public on 127.0.0.1:4332).
import { createServer } from 'node:http';
import { existsSync,readFileSync } from 'node:fs';
import { extname,join,normalize,resolve } from 'node:path';
import { buildReader } from '../src/builds';
import { siteFrom } from '../src/config';
import { createHttpHandler,MCP_PATH } from '../src/http';
import { nodeHandler } from '../src/node';

export function startServer(port = 4333,site = siteFrom()) {
  const dist = resolve(import.meta.dirname,'../dist');
  const widgetHtml = readFileSync(join(dist,'widget.html'),'utf8');
  const mcp = nodeHandler(createHttpHandler({ site,widgetHtml,readBuild: buildReader(site) }),{ behindProxy: false });
  const types: Record<string,string> = { '.html': 'text/html; charset=utf-8','.png': 'image/png','.txt': 'text/plain' };
  const server = createServer((req,res) => {
    const path = new URL(req.url ?? '/','http://localhost').pathname;
    if (path === MCP_PATH || path === `${MCP_PATH}/`) return void mcp(req,res);
    const file = normalize(join(dist,'static',path === '/' ? 'index.html' : path));
    if (!file.startsWith(join(dist,'static')) || !existsSync(file)) { res.writeHead(404,{ 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(join(dist,'static/404.html'))); return; }
    res.writeHead(200,{ 'content-type': types[extname(file)] ?? 'application/octet-stream','cache-control': 'no-store' }).end(readFileSync(file));
  });
  return new Promise<typeof server>(done => server.listen(port,'127.0.0.1',() => done(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flag = process.argv.indexOf('--port'), port = flag > 0 ? Number(process.argv[flag+1]) : 4333;
  await startServer(port);
  console.log(`MCP app on http://127.0.0.1:${port}${MCP_PATH} (games and pictures from ${siteFrom().origin})`);
}

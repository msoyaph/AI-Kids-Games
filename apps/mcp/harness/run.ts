// npm run harness --workspace apps/mcp (after npm run build)
// Four local origins, like a real host:
//   127.0.0.1:4330  the test host page (harness/host.ts, bundled here)
//   127.0.0.1:4331  the sandbox proxy (harness/sandbox.html), another origin
//   127.0.0.1:4332  the website's files (apps/site/public: games, covers), served as Vercel does (ACAO *)
//   127.0.0.1:4333  the MCP server (scripts/serve.ts) with SITE_ORIGIN=http://127.0.0.1:4332
// POST http://127.0.0.1:4332/__tamper?on=1 makes the website serve altered game builds (the hash test).
import { createServer,type IncomingMessage,type ServerResponse } from 'node:http';
import { existsSync,readFileSync,statSync } from 'node:fs';
import { extname,join,normalize,resolve } from 'node:path';
import { build } from 'esbuild';
import { siteFrom } from '../src/config';
import { startServer } from '../scripts/serve';

const here = import.meta.dirname, publicDir = resolve(here,'../../site/public');
const TYPES: Record<string,string> = { '.html': 'text/html; charset=utf-8','.js': 'text/javascript','.svg': 'image/svg+xml','.png': 'image/png','.webp': 'image/webp','.avif': 'image/avif','.jpg': 'image/jpeg','.json': 'application/json','.webm': 'video/webm','.mp4': 'video/mp4','.woff2': 'font/woff2' };
const listen = (port: number,handler: (req: IncomingMessage,res: ServerResponse) => void) => new Promise<void>(done => createServer(handler).listen(port,'127.0.0.1',() => done()));

export async function startHarness() {
  const hostJs = (await build({ entryPoints: [join(here,'host.ts')],bundle: true,format: 'esm',platform: 'browser',target: 'es2022',write: false,logLevel: 'warning',define: { 'process.env.NODE_ENV': '"production"' } })).outputFiles[0].text;
  let tamper = false;
  await listen(4332,(req,res) => {
    const url = new URL(req.url ?? '/','http://127.0.0.1:4332');
    if (url.pathname === '/__tamper' && req.method === 'POST') { tamper = url.searchParams.get('on') === '1'; res.writeHead(204).end(); return; }
    const file = normalize(join(publicDir,url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname));
    if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404,{ 'access-control-allow-origin': '*' }).end('Not found'); return; }
    let body = readFileSync(file);
    if (tamper && url.pathname.startsWith('/games/')) body = Buffer.concat([body,Buffer.from('<!-- changed -->')]);
    res.writeHead(200,{ 'content-type': TYPES[extname(file)] ?? 'application/octet-stream','access-control-allow-origin': '*','cache-control': 'no-store','x-content-type-options': 'nosniff' }).end(body);
  });
  await startServer(4333,siteFrom('http://127.0.0.1:4332'));
  await listen(4330,(req,res) => {
    const path = new URL(req.url ?? '/','http://127.0.0.1:4330').pathname;
    if (path === '/host.js') { res.writeHead(200,{ 'content-type': 'text/javascript','cache-control': 'no-store' }).end(hostJs); return; }
    if (path === '/health') { res.writeHead(200).end('ok'); return; }
    res.writeHead(200,{ 'content-type': 'text/html; charset=utf-8','cache-control': 'no-store' }).end(readFileSync(join(here,'host.html')));
  });
  await listen(4331,(_req,res) => { res.writeHead(200,{ 'content-type': 'text/html; charset=utf-8','cache-control': 'no-store' }).end(readFileSync(join(here,'sandbox.html'))); });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startHarness();
  console.log('Harness: host http://127.0.0.1:4330/?profile=claude&tool=show_game&args={"game":"tuck-pop"}');
}

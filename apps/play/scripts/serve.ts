// npm run serve --workspace apps/play [-- port=4320]
// Serves the built play origin locally the way a preview deployment does (games by path, with the
// strict headers from config.json), for the website's browser tests and for trying games.
import { createServer } from 'node:http';
import { existsSync,readFileSync,statSync } from 'node:fs';
import { join,normalize,resolve } from 'node:path';

const port = Number(process.argv[2] ?? 4320), root = resolve(import.meta.dirname,'../.vercel/output');
const config = JSON.parse(readFileSync(join(root,'config.json'),'utf8')) as { routes: { headers?: Record<string,string>; continue?: boolean }[] };
const headers = config.routes.find(route => route.continue)?.headers ?? {};
createServer((req,res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/','http://x').pathname)).replace(/^(\.\.[/\\])+/,'');
  const candidates = [join(root,'static',path),join(root,'static',path,'index.html')];
  const file = candidates.find(candidate => candidate.startsWith(join(root,'static')) && existsSync(candidate) && statSync(candidate).isFile());
  res.writeHead(file ? 200 : 404,{ ...headers,'Content-Type': 'text/html; charset=utf-8' }).end(readFileSync(file ?? join(root,'static/404.html')));
}).listen(port,'127.0.0.1',() => console.log(`play origin (preview mode) at http://127.0.0.1:${port}`));

// Serve dist/ the way Vercel does (vercel.json headers, ETag/304, brotli, byte ranges, a page's
// index.html, and 404.html with status 404 for anything else) so local Lighthouse, page-weight and
// crawler checks match production closely.
// Usage: npx tsx scripts/serve-dist.ts [port=4300]
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,statSync } from 'node:fs';
import { extname,join,normalize } from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const port = Number(process.argv[2] ?? 4300), root = join(import.meta.dirname,'../dist');
const types: Record<string,string> = { '.html': 'text/html; charset=utf-8','.js': 'text/javascript; charset=utf-8','.css': 'text/css; charset=utf-8','.svg': 'image/svg+xml','.json': 'application/json','.xml': 'application/xml','.txt': 'text/plain; charset=utf-8','.webmanifest': 'application/manifest+json','.woff2': 'font/woff2','.png': 'image/png','.jpg': 'image/jpeg','.webp': 'image/webp','.avif': 'image/avif','.ico': 'image/x-icon','.mp4': 'video/mp4','.webm': 'video/webm' };
const compressible = new Set(['.html','.js','.css','.svg','.json','.xml','.txt','.webmanifest']);
const cache = new Map<string,{ raw: Buffer; br?: Buffer; etag: string }>();

function resolve(pathname: string): [string,number] {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/,'');
  for (const candidate of [clean,join(clean,'index.html')]) { const file = join(root,candidate); if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) return [file,200]; }
  return [join(root,'404.html'),404]; // every page has its own static HTML; anything else is not found
}
createServer((req,res) => {
  const url = new URL(req.url || '/','http://x'); const [file,status] = resolve(url.pathname); const ext = extname(file);
  let entry = cache.get(file);
  if (!entry) { const raw = readFileSync(file); entry = { raw,etag: `"${createHash('sha1').update(raw).digest('hex').slice(0,16)}"` }; cache.set(file,entry); }
  res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
  res.setHeader('Content-Type',types[ext] ?? 'application/octet-stream'); res.setHeader('ETag',entry.etag); res.setHeader('Accept-Ranges','bytes');
  if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304).end(); return; }
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range && status === 200 && !compressible.has(ext)) {
    const size = entry.raw.length, start = range[1] ? Number(range[1]) : size-Number(range[2]), end = range[1] && range[2] ? Number(range[2]) : size-1;
    res.writeHead(206,{ 'Content-Range': `bytes ${start}-${end}/${size}`,'Content-Length': end-start+1 }).end(entry.raw.subarray(start,end+1)); return;
  }
  if (compressible.has(ext) && /\bbr\b/.test(String(req.headers['accept-encoding']))) {
    entry.br ??= brotliCompressSync(entry.raw);
    res.writeHead(status,{ 'Content-Encoding': 'br','Content-Length': entry.br.length,Vary: 'Accept-Encoding' }).end(entry.br); return;
  }
  res.writeHead(status,{ 'Content-Length': entry.raw.length }).end(entry.raw);
}).listen(port,'127.0.0.1',() => console.log(`dist served like Vercel at http://127.0.0.1:${port}`));

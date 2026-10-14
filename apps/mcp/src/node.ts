// Node's http (IncomingMessage/ServerResponse) to the web-standard handler: the Vercel Function and the
// local server both use it. The body is read up to MAX_BODY and refused beyond it.
import type { IncomingMessage,ServerResponse } from 'node:http';
import { MAX_BODY } from './http';

const HOP = new Set(['host','connection','content-length','transfer-encoding','keep-alive','expect','upgrade','proxy-connection']);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim() || undefined;

/** behindProxy: on Vercel, the scheme, host and client address come from its forwarding headers. */
export function nodeHandler(handle: (request: Request,address?: string) => Promise<Response>,{ behindProxy }: { behindProxy: boolean }) {
  return async (req: IncomingMessage,res: ServerResponse) => {
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size > MAX_BODY) { res.writeHead(413,{ 'content-type': 'text/plain','cache-control': 'no-store',connection: 'close' }).end('Request too large.'); req.destroy(); return; }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [name,value] of Object.entries(req.headers)) if (value !== undefined && !HOP.has(name)) headers.set(name,Array.isArray(value) ? value.join(', ') : value);
      const scheme = behindProxy ? first(req.headers['x-forwarded-proto']) ?? 'https' : 'http';
      const host = (behindProxy ? first(req.headers['x-forwarded-host']) : undefined) ?? req.headers.host ?? 'localhost';
      const method = req.method ?? 'GET', body = method === 'GET' || method === 'HEAD' || !chunks.length ? undefined : Buffer.concat(chunks);
      const address = behindProxy ? first(req.headers['x-real-ip']) ?? first(req.headers['x-forwarded-for']) : req.socket.remoteAddress;
      const response = await handle(new Request(`${scheme}://${host}${req.url ?? '/'}`,{ method,headers,body }),address);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      if (response.body) { const reader = response.body.getReader(); for (let part = await reader.read(); !part.done; part = await reader.read()) res.write(part.value); }
      res.end();
    } catch {
      if (!res.headersSent) res.writeHead(500,{ 'content-type': 'text/plain','cache-control': 'no-store' });
      res.end();
    }
  };
}

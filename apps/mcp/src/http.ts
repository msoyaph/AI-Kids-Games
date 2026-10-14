// The /mcp endpoint: Streamable HTTP, stateless, no sign-in, no cookies and no logging.
// The SDK's createMcpHandler serves both protocol eras (2026-07-28 per-request envelopes, and 2025-era
// clients through its stateless fallback). Around it: one path, an Origin check, rate limiting and
// headers that keep responses out of caches and search engines.
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer,type ServerOptions } from './server';
import { createLimiter } from './rate-limit';

/** No tool input comes close: every argument is an enum or a number. */
export const MAX_BODY = 64*1024;
export const MCP_PATH = '/mcp';

export interface HttpOptions extends Omit<ServerOptions,'serverOrigin'> { limiter?: ReturnType<typeof createLimiter> }

/**
 * Browsers send Origin; assistants' servers usually don't. The spec asks servers to reject invalid
 * origins (DNS rebinding): we accept https pages and local development tools, and refuse the rest.
 */
export function allowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  } catch { return false; }
}

const SECURITY = { 'cache-control': 'no-store','x-content-type-options': 'nosniff','referrer-policy': 'no-referrer','x-robots-tag': 'noindex' };
const CORS = { 'access-control-allow-methods': 'POST, OPTIONS','access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-method, mcp-name, last-event-id','access-control-max-age': '600' };

function finish(response: Response,origin: string | null) {
  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  for (const [name,value] of Object.entries(SECURITY)) headers.set(name,value);
  if (origin && allowedOrigin(origin)) { headers.set('access-control-allow-origin',origin); headers.append('vary','origin'); }
  return new Response(response.body,{ status: response.status,statusText: response.statusText,headers });
}
const plain = (status: number,text: string,extra: Record<string,string> = {}) => new Response(text,{ status,headers: { 'content-type': 'text/plain; charset=utf-8',...extra } });
const rpcError = (status: number,code: number,message: string,extra: Record<string,string> = {}) =>
  new Response(JSON.stringify({ jsonrpc: '2.0',id: null,error: { code,message } }),{ status,headers: { 'content-type': 'application/json',...extra } });

export function createHttpHandler(options: HttpOptions) {
  const limiter = options.limiter ?? createLimiter();
  const mcp = createMcpHandler(ctx => createServer({ ...options,serverOrigin: new URL(ctx.requestInfo?.url ?? options.site.origin).origin }),{
    legacy: 'stateless',maxSubscriptions: 0,keepAliveMs: 0,maxRequestBodySize: MAX_BODY,
    // Errors are answered to the caller; nothing is logged.
    onerror: () => {}
  });
  return async (request: Request,address?: string): Promise<Response> => {
    const origin = request.headers.get('origin'), { pathname } = new URL(request.url);
    if (pathname !== MCP_PATH && pathname !== `${MCP_PATH}/`) return finish(plain(404,'Not found. The AI Kids Games MCP endpoint is /mcp.'),null);
    if (origin !== null && !allowedOrigin(origin)) return finish(rpcError(403,-32600,'Origin not allowed.'),null);
    if (request.method === 'OPTIONS') return finish(new Response(null,{ status: 204,headers: CORS }),origin);
    const limit = limiter(address);
    if (!limit.ok) return finish(rpcError(429,-32000,'Too many requests. Try again in a minute.',{ 'retry-after': String(limit.retryAfter) }),origin);
    try { return finish(await mcp.fetch(request),origin); }
    catch { return finish(rpcError(500,-32603,'Internal error.'),origin); }
  };
}

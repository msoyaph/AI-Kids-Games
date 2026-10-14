import { afterEach,describe,expect,it,vi } from 'vitest';
import { createLimiter,isAssistantAddress,LIMITS } from '../src/rate-limit';
import { allowedOrigin,MAX_BODY } from '../src/http';
import { connect,handler } from './helpers';

const post = (body: unknown,headers: Record<string,string> = {}) => new Request('http://mcp.test/mcp',{
  method: 'POST',headers: { 'content-type': 'application/json',accept: 'application/json, text/event-stream',...headers },body: typeof body === 'string' ? body : JSON.stringify(body)
});
const initialize = { jsonrpc: '2.0',id: 1,method: 'initialize',params: { protocolVersion: '2025-11-25',capabilities: {},clientInfo: { name: 't',version: '1' } } };

describe('the /mcp endpoint',() => {
  afterEach(() => vi.restoreAllMocks());

  it('answers only at /mcp, and only POST (GET and DELETE: 405)',async () => {
    const handle = handler();
    expect((await handle(new Request('http://mcp.test/other',{ method: 'POST' }))).status).toBe(404);
    expect((await handle(new Request('http://mcp.test/mcp'))).status).toBe(405);
    expect((await handle(new Request('http://mcp.test/mcp',{ method: 'DELETE' }))).status).toBe(405);
    expect((await handle(post(initialize))).status).toBe(200);
  });

  it('never sets cookies, and keeps answers out of caches and search engines',async () => {
    const response = await handler()(post(initialize));
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('refuses requests from invalid origins (DNS rebinding) and allows https pages and local tools',async () => {
    expect(allowedOrigin('https://claude.ai')).toBe(true);
    expect(allowedOrigin('http://localhost:6274')).toBe(true);
    expect(allowedOrigin('null')).toBe(false);
    expect(allowedOrigin('http://evil.example')).toBe(false);
    const handle = handler();
    expect((await handle(post(initialize,{ origin: 'null' }))).status).toBe(403);
    expect((await handle(post(initialize,{ origin: 'http://evil.example' }))).status).toBe(403);
    const ok = await handle(post(initialize,{ origin: 'https://inspector.example' }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://inspector.example');
  });

  it('refuses bodies over 64 KB',async () => {
    const response = await handler()(post(JSON.stringify({ ...initialize,pad: 'x'.repeat(MAX_BODY) })));
    expect(response.status).toBe(413);
  });

  it('rate-limits per address, with a higher limit for the assistants\' published ranges',async () => {
    let now = 0;
    const limiter = createLimiter({ ...LIMITS,perAddress: 3,perAssistantAddress: 5 },() => now);
    const handle = handler({ limiter });
    for (let i = 0; i < 3; i++) expect((await handle(post(initialize),'198.51.100.9')).status).toBe(200);
    const limited = await handle(post(initialize),'198.51.100.9');
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await handle(post(initialize),'198.51.100.10')).status).toBe(200); // another address
    for (let i = 0; i < 5; i++) expect((await handle(post(initialize),'160.79.105.20')).status).toBe(200); // Anthropic's range
    expect((await handle(post(initialize),'160.79.105.20')).status).toBe(429);
    now += LIMITS.windowMs; // a new minute forgets everything
    expect((await handle(post(initialize),'198.51.100.9')).status).toBe(200);
  });

  it('knows the assistants\' published address ranges',() => {
    expect(isAssistantAddress('160.79.104.1')).toBe(true);
    expect(isAssistantAddress('160.79.111.254')).toBe(true);
    expect(isAssistantAddress('160.79.112.1')).toBe(false);
    expect(isAssistantAddress('::ffff:160.79.104.9')).toBe(true);
    expect(isAssistantAddress('203.0.113.1')).toBe(false);
  });

  it('logs nothing: no tool input or result ever reaches the console',async () => {
    const spies = (['log','info','warn','error','debug','trace'] as const).map(method => vi.spyOn(console,method).mockImplementation(() => {}));
    const client = await connect('modern');
    await client.callTool({ name: 'find_games',arguments: { age: 9,genre: 'Adventure',mood: 'curious' } });
    await client.callTool({ name: 'show_game',arguments: { game: 'agentmon' } });
    await client.callTool({ name: 'parent_info',arguments: {} });
    await client.callTool({ name: 'show_game',arguments: { game: 'nope' } }).catch(() => {});
    await client.close();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

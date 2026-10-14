// Unit-test plumbing: the real HTTP handler, called in-process through the official MCP client.
import { Client,StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { siteFrom } from '../src/config';
import { createHttpHandler } from '../src/http';
import type { CatalogGame } from '../src/data/types';

export const site = siteFrom('http://127.0.0.1:4332');
export const WIDGET = '<!doctype html><title>widget</title>';
export const builds = new Map<string,string>();
export const readBuild = async (game: CatalogGame) => { const text = builds.get(game.slug); if (text === undefined) throw new Error('no build'); return text; };

export function handler(options: Partial<Parameters<typeof createHttpHandler>[0]> = {}) {
  return createHttpHandler({ site,widgetHtml: WIDGET,readBuild,...options });
}

/** A connected client: "legacy" is the 2025 initialize handshake, "modern" pins 2026-07-28. */
export async function connect(era: 'legacy' | 'modern' = 'legacy',options: Partial<Parameters<typeof createHttpHandler>[0]> = {}) {
  const handle = handler(options);
  const client = new Client({ name: 'unit-tests',version: '1' },era === 'modern' ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : {});
  const transport = new StreamableHTTPClientTransport(new URL('http://mcp.test/mcp'),{ fetch: (url,init) => handle(new Request(url,init),'203.0.113.7') });
  await client.connect(transport);
  return client;
}

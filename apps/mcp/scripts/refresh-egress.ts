// npm run refresh-egress --workspace apps/mcp
// Snapshots the published addresses AI assistants call MCP servers from (src/data/egress.json). The rate
// limiter gives these a higher per-address limit, because one address there carries many people's requests.
// Anthropic publishes one range on a docs page (copied here); OpenAI publishes a JSON list.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ANTHROPIC = { source: 'https://platform.claude.com/docs/en/api/ip-addresses',ranges: ['160.79.104.0/21'] };
const OPENAI = 'https://openai.com/chatgpt-connectors.json';

const response = await fetch(OPENAI);
if (!response.ok) throw new Error(`${OPENAI} answered ${response.status}.`);
const list = await response.json() as { creationTime: string; prefixes: { ipv4Prefix?: string; ipv6Prefix?: string }[] };
const openai = list.prefixes.map(prefix => prefix.ipv4Prefix ?? prefix.ipv6Prefix).filter((range): range is string => !!range).sort();
const out = { updated: new Date().toISOString().slice(0,10),anthropic: ANTHROPIC,openai: { source: OPENAI,listCreated: list.creationTime,ranges: openai } };
writeFileSync(resolve(import.meta.dirname,'../src/data/egress.json'),`${JSON.stringify(out,null,2)}\n`);
console.log(`Saved ${ANTHROPIC.ranges.length} Anthropic and ${openai.length} OpenAI ranges.`);

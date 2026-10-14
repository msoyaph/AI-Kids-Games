// Basic rate limiting, per server instance, with nothing logged or stored.
// Addresses are only ever held as a keyed hash (the key is random per instance and never leaves memory),
// and every count is dropped when its minute is up. Assistants call from a few shared addresses (all of
// Claude's traffic comes from one Anthropic range), so their published ranges get a higher limit.
import { createHmac,randomBytes } from 'node:crypto';
import egress from './data/egress.json';

export const LIMITS = { windowMs: 60_000,perAddress: 120,perAssistantAddress: 3000,perInstance: 12_000 };
export type Limit = { ok: true } | { ok: false; retryAfter: number };

const ipv4 = (address: string) => {
  const parts = address.replace(/^::ffff:/i,'').split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return undefined;
  return parts.reduce((value,part) => value*256+Number(part),0);
};
const ranges = [...egress.anthropic.ranges,...egress.openai.ranges].flatMap(range => {
  const [base,bits] = range.split('/'), start = ipv4(base), size = 2**(32-Number(bits));
  return start === undefined || !(Number(bits) >= 0 && Number(bits) <= 32) ? [] : [{ start: Math.floor(start/size)*size,size }];
});
/** In a range Anthropic or OpenAI publish for their assistants' MCP calls (src/data/egress.json). */
export const isAssistantAddress = (address: string) => { const value = ipv4(address); return value !== undefined && ranges.some(range => value >= range.start && value < range.start+range.size); };

export function createLimiter(limits = LIMITS,now = Date.now) {
  const key = randomBytes(32);
  let windowStart = -Infinity,total = 0;
  const counts = new Map<string,number>();
  return (address: string | undefined): Limit => {
    const time = now();
    if (time-windowStart >= limits.windowMs) { windowStart = time; total = 0; counts.clear(); }
    const retryAfter = Math.max(1,Math.ceil((windowStart+limits.windowMs-time)/1000));
    if (++total > limits.perInstance) return { ok: false,retryAfter };
    const id = createHmac('sha256',key).update(address ?? '').digest('base64url');
    const count = (counts.get(id) ?? 0)+1; counts.set(id,count);
    return count > (address && isAssistantAddress(address) ? limits.perAssistantAddress : limits.perAddress) ? { ok: false,retryAfter } : { ok: true };
  };
}

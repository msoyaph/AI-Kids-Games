/** npx tsx scripts/rooms.ts [roomId] — check every Trial room: shape, solvable, solution length. */
import { parseRoom } from '../src/core/puzzle/puzzle';
import { solve } from '../src/core/puzzle/solver';
import { TRIALS } from '../src/data/trials';

const only = process.argv[2];
for (const t of TRIALS) for (const def of t.rooms) {
  if (only && def.id !== only) continue;
  const widths = new Set(def.rows.map(r => r.length));
  const room = parseRoom(def);
  const issues: string[] = [];
  if (widths.size !== 1) issues.push(`uneven rows ${[...widths]}`);
  for (const e of def.emitters ?? []) if (room.grid[e.y * room.w + e.x] !== 'L') issues.push(`emitter ${e.x},${e.y} is "${room.grid[e.y * room.w + e.x]}"`);
  for (const p of def.platforms ?? []) for (const [x, y] of p.path) if (room.grid[y * room.w + x] !== '=') issues.push(`platform ${x},${y} is "${room.grid[y * room.w + x]}"`);
  const sol = solve(room);
  console.log(`${def.id.padEnd(5)} ${sol ? `solved in ${String(sol.actions.length).padStart(2)}` : 'UNSOLVABLE  '} ${issues.join('; ')}${only && sol ? `\n  ${sol.actions.join(' ')}` : ''}`);
}

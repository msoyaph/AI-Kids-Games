import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { games } from '../src/data/games';
import { validateRegistry } from '../src/lib/registry';
const errors = validateRegistry(games, path => existsSync(resolve('public', path)));
if (errors.length) { console.error('Game registry validation failed:\n' + errors.map(error => `  • ${error}`).join('\n')); process.exit(1); }
console.log(`Game registry validated: ${games.length} games, all folders and artwork present.`);

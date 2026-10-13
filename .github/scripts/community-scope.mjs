// Community pull requests (SUBMITTING.md) may change only their own folder, community/<slug>/.
// Prints `slugs=[...]` for $GITHUB_OUTPUT: the community games this pull request changes (empty for
// any other pull request). Fails, naming every stray file, when a pull request that touches
// community/ also touches anything else, or more than one game.
// Env: BASE, HEAD (commits). The slug pattern matches scripts/lib/repo.ts, so nothing unsafe
// ever reaches a shell or a job name.
import { execFileSync } from 'node:child_process';

export const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** The decision for a list of changed paths: { slugs, problems }. */
export function scope(files) {
  const community = files.filter(file => file.startsWith('community/'));
  if (!community.length) return { slugs: [],problems: [] };
  const problems = [];
  const slugs = [...new Set(community.map(file => file.split('/')[1]))];
  for (const slug of slugs) if (!SLUG.test(slug ?? '') || community.some(file => file === `community/${slug}`)) problems.push(`"community/${slug}" isn't a valid game folder: use lowercase letters, digits and single hyphens.`);
  if (slugs.length > 1) problems.push(`This pull request changes ${slugs.length} community games (${slugs.join(', ')}). Submit one game per pull request.`);
  const stray = files.filter(file => !file.startsWith('community/'));
  if (stray.length) problems.push(`A community pull request may change only its own community/<slug>/ folder. These files are outside it:\n${stray.map(file => `  - ${file}`).join('\n')}\nMove your changes into community/${slugs[0] ?? '<slug>'}/ or remove them.`);
  return { slugs: problems.length ? [] : slugs,problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BASE,HEAD } = process.env;
  const files = BASE && !/^0+$/.test(BASE) ? execFileSync('git',['diff','--name-only',`${BASE}...${HEAD}`],{ encoding: 'utf8' }).split('\n').filter(Boolean) : [];
  const { slugs,problems } = scope(files);
  if (problems.length) { console.error(`Community pull request check failed:\n\n${problems.join('\n\n')}`); process.exit(1); }
  console.error(slugs.length ? `Community game in this pull request: ${slugs.join(', ')}` : 'No community games changed.');
  console.log(`slugs=${JSON.stringify(slugs)}`);
}

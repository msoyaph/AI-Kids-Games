// Community pull requests (SUBMITTING.md) may change only their own folder, community/<slug>/.
// Prints `slugs=[...]` for $GITHUB_OUTPUT: the community games (valid folder names only) this pull
// request changes, so CI checks them even when the pull request breaks a rule; empty for any other
// pull request. With --strict it fails, naming every stray file, when a pull request that touches
// community/ also touches anything else, or more than one game. Only the owner's own pull requests
// (OWNER=true: a branch of this repository, opened by the repository owner) may change a game's
// approval, listing or approved commit, and add its art in apps/site/public/media/community/<slug>/
// (npm run review-submission -- <PR> --approve): a contributor can't list their own game.
// Env: BASE, HEAD (commits), OWNER. The slug pattern matches scripts/lib/repo.ts, so nothing unsafe
// ever reaches a shell or a job name.
import { execFileSync } from 'node:child_process';

export const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Outside its folder, the owner's approval of a game may change only its art and the generated llms.txt. */
const approvalFiles = (slug) => (file) => file.startsWith(`apps/site/public/media/community/${slug}/`) || file === 'llms.txt';

/** The decision for a list of changed paths: { slugs, problems }. */
export function scope(files,{ owner = false } = {}) {
  const community = files.filter(file => file.startsWith('community/'));
  if (!community.length) return { slugs: [],problems: [] };
  const problems = [];
  const slugs = [...new Set(community.map(file => file.split('/')[1]))];
  for (const slug of slugs) if (!SLUG.test(slug ?? '') || community.some(file => file === `community/${slug}`)) problems.push(`"community/${slug}" isn't a valid game folder: use lowercase letters, digits and single hyphens.`);
  if (slugs.length > 1) problems.push(`This pull request changes ${slugs.length} community games (${slugs.join(', ')}). Submit one game per pull request.`);
  const stray = files.filter(file => !file.startsWith('community/') && !(owner && slugs.length === 1 && approvalFiles(slugs[0])(file)));
  if (stray.length) problems.push(`A community pull request may change only its own community/<slug>/ folder. These files are outside it:\n${stray.map(file => `  - ${file}`).join('\n')}\nMove your changes into community/${slugs[0] ?? '<slug>'}/ or remove them.`);
  return { slugs: slugs.filter(slug => SLUG.test(slug ?? '')),problems };
}

/**
 * The fields only the owner's review tool may set, compared between the base and the pull request:
 * approval, listing and submitted.sourceCommit. A new game starts as "submitted", with no approval
 * and sourceCommit "pending". `base` and `head` are the parsed game.json files (null when absent).
 */
export function ownerFields(slug,base,head,{ owner = false } = {}) {
  if (owner || !head) return [];
  const fix = 'Only the owner\'s review tool sets these (MODERATION.md). Put back the values from main; a new game uses "listing": "submitted", "sourceCommit": "pending" and no "approval".';
  const was = base ?? { listing: 'submitted',submitted: { sourceCommit: 'pending' } };
  const changed = [];
  if (JSON.stringify(head.approval ?? null) !== JSON.stringify(was.approval ?? null)) changed.push('approval');
  if (head.listing !== was.listing) changed.push(`listing ("${was.listing}" → "${head.listing}")`);
  if (head.submitted?.sourceCommit !== was.submitted?.sourceCommit) changed.push('submitted.sourceCommit');
  return changed.length ? [`community/${slug}/game.json changes ${changed.join(', ')}. ${fix}`] : [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BASE,HEAD } = process.env, owner = process.env.OWNER === 'true';
  const files = BASE && !/^0+$/.test(BASE) ? execFileSync('git',['diff','--name-only',`${BASE}...${HEAD}`],{ encoding: 'utf8' }).split('\n').filter(Boolean) : [];
  const { slugs,problems } = scope(files,{ owner });
  const read = (commit,slug) => { try { return JSON.parse(execFileSync('git',['show',`${commit}:community/${slug}/game.json`],{ encoding: 'utf8',stdio: ['ignore','pipe','ignore'] })); } catch { return null; } };
  for (const slug of slugs) problems.push(...ownerFields(slug,read(BASE,slug),read(HEAD,slug),{ owner }));
  if (problems.length) { console.error(`Community pull request check failed:\n\n${problems.join('\n\n')}`); if (process.argv.includes('--strict')) process.exit(1); }
  else console.error(slugs.length ? `Community game in this pull request: ${slugs.join(', ')}${owner ? ' (the owner\'s pull request)' : ''}` : 'No community games changed.');
  console.log(`slugs=${JSON.stringify(slugs)}`);
}

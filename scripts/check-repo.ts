// Public-repo hygiene, run in CI: no file over 10 MB, no local machine paths, no deployment or
// scratch folders, and no self-hosted runners (never safe on a public repository).
import { execFileSync } from 'node:child_process';
import { existsSync,readFileSync,statSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './lib/repo';

const MAX_BYTES = 10 * 1024 * 1024;
const FORBIDDEN = [/(^|\/)\.vercel\//,/(^|\/)\.openai\//,/(^|\/)captures\//,/(^|\/)\.claude\/worktrees\//,/(^|\/)\.claude\/settings\.local\.json$/,/(^|\/)\.env(\.(?!example$)[^/]*)?$/];
const LOCAL_PATH = /(?:\/Users\/[A-Za-z][\w.-]*\/|\/home\/[a-z][\w.-]*\/|[A-Z]:\\Users\\)/;
const TEXT = /\.(?:[cm]?[jt]sx?|json|md|ya?ml|html|css|svg|txt|cff|sh|toml)$/;

const files = execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{ cwd: root }).toString().split('\0').filter(Boolean).filter(file => existsSync(resolve(root,file)));
const errors: string[] = [];
for (const file of files) {
  const full = resolve(root,file);
  if (FORBIDDEN.some(pattern => pattern.test(file))) errors.push(`${file}: deployment, scratch or local-only files do not belong in the public repo.`);
  const { size } = statSync(full);
  if (size > MAX_BYTES) errors.push(`${file}: ${(size/1048576).toFixed(1)} MB is over the 10 MB limit.`);
  if (!TEXT.test(file) || size > 4 * 1024 * 1024) continue;
  const text = readFileSync(full,'utf8');
  if (file !== 'scripts/check-repo.ts' && LOCAL_PATH.test(text)) errors.push(`${file}: contains a local machine path (${text.match(LOCAL_PATH)![0]}…). Use a repo-relative path.`);
  if (/(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(file) && /self-hosted/i.test(text)) errors.push(`${file}: self-hosted runners must never be used with this public repository.`);
}
if (files.some(file => /^(?:apps|games|templates)\/[^/]+\/\.github\/workflows\//.test(file))) errors.push('Workflows belong in the root .github/workflows; GitHub ignores nested ones.');

if (errors.length) { console.error(`Repository checks failed:\n${errors.map(error => `  • ${error}`).join('\n')}`); process.exit(1); }
console.log(`Repository checks passed: ${files.length} files, none over 10 MB, no local paths, no self-hosted runners.`);

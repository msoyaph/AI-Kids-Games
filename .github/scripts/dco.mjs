// Every commit in a community pull request must be signed off (Developer Certificate of Origin,
// https://developercertificate.org): a "Signed-off-by: Name <email>" line whose email matches the
// commit's author. `git commit -s` adds it. Env: BASE, HEAD.
import { execFileSync } from 'node:child_process';

/** Problems for commits given as { sha, author: email, message }. */
export function unsigned(commits) {
  return commits.filter(commit => {
    const lines = [...commit.message.matchAll(/^Signed-off-by: .+ <([^>]+)>\s*$/gim)].map(match => match[1].toLowerCase());
    return !lines.includes(commit.author.toLowerCase());
  }).map(commit => `${commit.sha.slice(0,7)} "${commit.message.split('\n')[0].slice(0,60)}" has no "Signed-off-by:" line for ${commit.author}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BASE,HEAD } = process.env;
  const raw = execFileSync('git',['log','--no-merges','--format=%H%x1f%ae%x1f%B%x1e',`${BASE}..${HEAD}`],{ encoding: 'utf8' });
  const commits = raw.split('\x1e').map(entry => entry.trim()).filter(Boolean).map(entry => { const [sha,author,message] = entry.split('\x1f'); return { sha,author,message }; });
  const problems = unsigned(commits);
  if (problems.length) {
    console.error(`Every commit must be signed off (DCO):\n${problems.map(problem => `  - ${problem}`).join('\n')}\n\nHow to fix: sign off your commits with\n  git rebase --signoff ${BASE.slice(0,7)}\n  git push --force-with-lease\nand use "git commit -s" from now on. SUBMITTING.md explains what signing off means.`);
    process.exit(1);
  }
  console.error(`All ${commits.length} commit(s) are signed off.`);
}

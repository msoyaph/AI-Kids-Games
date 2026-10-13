// npm run review-submission -- <PR>                      review a community game pull request
// npm run review-submission -- <PR> --approve            after merging it as "submitted": list it
// npm run review-submission -- <PR> --decline "reason"   write a kind decline comment
//
// The owner's review kit (MODERATION.md). It checks the pull request out into an isolated git
// worktree (.review/pr-<n>/, git-ignored) and runs every check on it with this checkout's own,
// trusted tools: the submission's code is only bundled with our config and run inside Chromium,
// and its unit tests never run here (--untrusted). It plays the game, saves a screenshot of each
// screen it reaches plus a recording, and writes .review/pr-<n>/REVIEW.md: what the game is, what
// the checks found, every piece of text in the game, the risky code patterns, and an approve or
// decline checklist. Approving writes the owner's approval into the game's manifest, adds its
// cover and screenshots for the site, and prints the commit for the owner to make.
import { execFileSync,spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import { join,relative,resolve } from 'node:path';
import sharp from 'sharp';
import { scope } from '../.github/scripts/community-scope.mjs';
import { sourceSha256 } from './lib/community';
import type { CommunityManifest } from './lib/manifest';
import { communityDir,root,site } from './lib/repo';
import type { CheckResult } from './submission/types';

const args = process.argv.slice(2);
const pr = Number(args.find(arg => /^\d+$/.test(arg)));
const approve = args.includes('--approve'), declineAt = args.indexOf('--decline');
if (!pr) { console.error('Usage: npm run review-submission -- <PR number> [--approve | --decline "reason"]'); process.exit(2); }
const git = (...a: string[]) => execFileSync('git',a,{ cwd: root,encoding: 'utf8' }).trim();
const gh = (...a: string[]) => execFileSync('gh',a,{ cwd: root,encoding: 'utf8' }).trim();
const info = JSON.parse(gh('pr','view',String(pr),'--json','number,title,url,state,isDraft,headRefOid,baseRefName,author,files,mergedAt')) as { number: number; title: string; url: string; state: string; isDraft: boolean; headRefOid: string; baseRefName: string; author: { login: string }; files: { path: string }[]; mergedAt: string | null };
const { slugs,problems } = scope(info.files.map(file => file.path));
if (problems.length || slugs.length !== 1) { console.error(`PR #${pr} isn't a valid community submission:\n${problems.join('\n') || 'it changes no community game'}`); process.exit(1); }
const slug = slugs[0]!;
const work = resolve(root,'.review',`pr-${pr}`), reviewFile = join(work,'REVIEW.md'), stateFile = join(work,'review.json');
const reviewer = `@${gh('api','user','-q','.login')}`;

if (declineAt >= 0) {
  const reason = args[declineAt+1] ?? 'it doesn\'t meet the requirements yet';
  const body = `Thank you for making **${slug}** and sending it to AI Kids Games! We can't list it as it is, because ${reason}.\n\nYou're welcome to fix this and push to this pull request again: run \`npm run check-submission -- ${slug}\` before you do. SUBMITTING.md explains every rule, and MODERATION.md how reviews work.`;
  const file = join(work,'decline.md'); mkdirSync(work,{ recursive: true }); writeFileSync(file,`${body}\n`);
  console.log(`${body}\n\nTo post it (your choice):\n  gh pr comment ${pr} --body-file ${relative(root,file)}\n  gh pr close ${pr}`);
  process.exit(0);
}

if (approve) {
  // The approval goes on main, after the pull request was merged with listing "submitted".
  if (!info.mergedAt) { console.error(`PR #${pr} isn't merged yet. Merge it first (it stays off the site while listing is "submitted"), then approve.`); process.exit(1); }
  if (!existsSync(stateFile)) { console.error(`No review for PR #${pr} here yet. Run: npm run review-submission -- ${pr}`); process.exit(1); }
  const state = JSON.parse(readFileSync(stateFile,'utf8')) as { head: string; sourceSha256: string; reportSha256: string; ok: boolean; screens: string[] };
  if (!state.ok) { console.error('The review found failing checks. Fix them (a new commit and a new review) before approving.'); process.exit(1); }
  if (git('status','--porcelain')) { console.error('Your checkout has uncommitted changes. Commit or stash them first.'); process.exit(1); }
  git('fetch','-q','origin'); git('switch','-q','main'); git('merge','-q','--ff-only','origin/main');
  const dir = communityDir(slug);
  if (sourceSha256(dir) !== state.sourceSha256) { console.error(`community/${slug} on main isn't what you reviewed (the source changed after the review). Review the merged commit again.`); process.exit(1); }
  const manifestPath = join(dir,'game.json'), m = JSON.parse(readFileSync(manifestPath,'utf8')) as CommunityManifest;
  m.submitted = { ...m.submitted,sourceCommit: state.head };
  m.listing = 'listed';
  m.approval = { by: reviewer,date: new Date().toISOString().slice(0,10),commit: state.head,sourceSha256: state.sourceSha256,reportSha256: state.reportSha256 };
  writeFileSync(manifestPath,`${JSON.stringify(m,null,2)}\n`);
  // The site's art for the game: a 16:9 cover and screenshots from the review, plus a share image.
  const media = join(site,'public/media/community',slug); mkdirSync(media,{ recursive: true });
  const scenes = state.screens.filter(path => /scene-/.test(path)), others = state.screens.filter(path => !/scene-/.test(path));
  const pictures = [...scenes,...others].slice(0,5);
  if (!pictures.length) { console.error('The review has no screenshots to use as art.'); process.exit(1); }
  await sharp(pictures[0]).resize(1600,900,{ fit: 'cover' }).webp({ quality: 82 }).toFile(join(media,'cover.webp'));
  await sharp(pictures[0]).resize(1200,630,{ fit: 'cover' }).jpeg({ quality: 82,mozjpeg: true }).toFile(join(media,'og.jpg'));
  for (const [index,picture] of pictures.entries()) await sharp(picture).resize(1280,720,{ fit: 'cover' }).webp({ quality: 80 }).toFile(join(media,`shot-${index+1}.webp`));
  spawnSync('npm',['run','-s','manifests'],{ cwd: root,stdio: 'inherit' });
  console.log(`
Approved ${slug} (reviewed commit ${state.head.slice(0,7)}). Now, on a branch:

  git switch -c approve-${slug}
  git add community/${slug}/game.json apps/site/public/media/community/${slug} llms.txt
  git commit -s -m "Approve community game ${slug} (PR #${pr})"
  git push -u origin approve-${slug} && gh pr create --fill

When that merges with a release, give the game its own address on the play origin:

  vercel domains add aikg-${slug}.vercel.app ai-kids-games-play --scope real-tours
`);
  process.exit(0);
}

// ---- The review ----
console.log(`Reviewing PR #${pr} "${info.title}" by @${info.author.login}: community/${slug} at ${info.headRefOid.slice(0,7)}`);
const tree = join(work,'tree');
if (existsSync(tree)) { spawnSync('git',['worktree','remove','--force',tree],{ cwd: root }); rmSync(tree,{ recursive: true,force: true }); }
mkdirSync(work,{ recursive: true });
git('fetch','-q','origin',`+pull/${pr}/head:refs/review/pr-${pr}`);
git('worktree','add','-q','--detach',tree,`refs/review/pr-${pr}`);
const head = git('-C',tree,'rev-parse','HEAD');
const screens = join(work,'screens'); rmSync(screens,{ recursive: true,force: true });
// This checkout's trusted tools, pointed at the pull request's community folder.
const run = spawnSync('npx',['tsx',resolve(root,'scripts/check-submission.ts'),slug,'--untrusted','--record',screens],{ cwd: root,encoding: 'utf8',env: { ...process.env,AIKG_COMMUNITY_ROOT: join(tree,'community') } });
process.stdout.write(run.stdout);
const dir = join(tree,'community',slug);
const reportJson = readFileSync(join(dir,'.check/report.json'),'utf8');
const report = JSON.parse(reportJson) as { ok: boolean; bytes?: number; checks: CheckResult[]; texts: { text: string; file: string; line: number }[]; risks: { pattern: string; file: string; line: number; code: string }[]; screens: string[]; video?: string; storageKeys: string[] };
const m = JSON.parse(readFileSync(join(dir,'game.json'),'utf8')) as CommunityManifest;
const source = sourceSha256(dir), reportSha = createHash('sha256').update(reportJson).digest('hex');

// Things worth a look even when every check passes: what the game can do, and what could hide code.
const capabilities: [string,RegExp][] = [['fullscreen',/requestFullscreen/],['pointer lock',/requestPointerLock/],['vibration',/navigator\.vibrate/],['speech',/speechSynthesis/],['gamepads',/getGamepads/],['clipboard',/clipboard/],['text decoding (atob, fromCharCode)',/\batob\(|String\.fromCharCode/],['HTML from strings (innerHTML)',/\.innerHTML\s*=|insertAdjacentHTML/],['long encoded strings',/['"`][A-Za-z0-9+/=]{300,}['"`]/]];
const files: { path: string; bytes: number }[] = [];
const walk = (folder: string) => { for (const name of readdirSync(folder).sort()) { const path = join(folder,name), rel = relative(dir,path); if (rel === '.check') continue; try { const entries = readdirSync(path); void entries; walk(path); } catch { files.push({ path: rel,bytes: readFileSync(path).length }); } } };
walk(dir);
const uses = capabilities.map(([what,pattern]) => [what,files.filter(file => /\.(m?js|tsx?|html)$/.test(file.path) && pattern.test(readFileSync(join(dir,file.path),'utf8'))).map(file => file.path)] as const).filter(([,where]) => where.length);
const pkg = JSON.parse(readFileSync(join(dir,'package.json'),'utf8')) as { dependencies?: Record<string,string> };
const mark = { pass: '✓',fail: '✗',warn: '!',skip: '–' } as const;
const texts = [...new Map(report.texts.map(t => [t.text,t])).values()];
const rel = (path: string) => relative(work,path);
// Sentences and labels first; single-word strings in code (key names, ids, colors) go in a folded list.
const looksLikeCode = (t: { text: string; file: string }) => !/\s/.test(t.text.trim()) && !/\.(html|json)$/.test(t.file);
const readable = texts.filter(t => !looksLikeCode(t)), codeish = texts.filter(looksLikeCode);
const line = (t: { text: string; file: string; line: number }) => `- \`${t.file}:${t.line}\` ${t.text.replace(/\s+/g,' ').slice(0,200)}`;

const md = `# Review: ${m.title} (PR #${pr})

[${info.title}](${info.url}) by @${info.author.login} (handle in the manifest: ${m.creator?.handle}), commit \`${head.slice(0,12)}\`. Reviewed ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC with this checkout's tools.

**Checks: ${report.ok ? 'all passed' : 'some FAILED'}.** Source fingerprint \`${source.slice(0,16)}…\`, report \`${reportSha.slice(0,16)}…\`.

## What the game is

- **${m.title}**: ${m.tagline}
- ${m.shortDescription}
- ${m.longDescription}
- **Ages:** ${m.ageRange} (min ${m.minAge}). **Content notes:** ${m.contentNotes}
- **Plays on:** ${(m.devices ?? []).join(', ')} with ${(m.controls?.types ?? []).join(', ')}. **Play time:** ${m.playTime}
- **Originality (the creator's words):** ${m.originality}
- **Saves:** prefix \`${m.storage?.prefix}\`; during play it saved: ${report.storageKeys.length ? report.storageKeys.map(key => `\`${key}\``).join(', ') : 'nothing'}
- **Built size:** ${report.bytes ? `${(report.bytes/1024).toFixed(0)} KB` : 'not built'}; **packages:** ${Object.keys(pkg.dependencies ?? {}).join(', ') || 'none'}

## Checks

${report.checks.map(check => `### ${mark[check.status]} ${check.title}\n${[...check.notes.map(note => `- ${note}`),...check.problems.map(problem => `- ${(problem.severity ?? 'fail') === 'fail' ? '✗' : '!'} ${problem.message.replace(/\n/g,' ')}`)].join('\n') || '- ok'}`).join('\n\n')}

## Screens it reached

${report.screens.map(path => `![${rel(path)}](${rel(path)})`).join('\n')}

${report.video ? `Recording: [${rel(report.video)}](${rel(report.video)})` : 'No recording.'}

## Every piece of text in the game (${texts.length})

Words and sentences players can see (${readable.length}):

${readable.map(line).join('\n')}

<details><summary>Short strings in the code (${codeish.length}): names, keys and values, worth a skim</summary>

${codeish.map(line).join('\n')}

</details>

## Risky code patterns

${report.risks.length ? report.risks.map(risk => `- **${risk.pattern}** at \`${risk.file}:${risk.line}\`: \`${risk.code.replace(/`/g,'\'')}\``).join('\n') : '- None found.'}

**What it uses (worth a look, not wrong by itself):** ${uses.length ? uses.map(([what,where]) => `${what} (${where.join(', ')})`).join('; ') : 'nothing notable'}.

## Files (${files.length}, ${(files.reduce((sum,file) => sum+file.bytes,0)/1024).toFixed(0)} KB)

${files.map(file => `- \`${file.path}\` ${(file.bytes/1024).toFixed(1)} KB`).join('\n')}

## Decision

Approve only if every box is true:

- [ ] Every check passed, and any "!" notes above are fine in context.
- [ ] I played it (screens and recording above, or \`npm run dev:community\` on this worktree), and it's fun, finished and fits the ages.
- [ ] All the text above is friendly, honest and age-appropriate. Nothing asks for personal details or points elsewhere.
- [ ] It looks original: no other companies' names, characters, art or music.
- [ ] Nothing in the code looks hidden, encoded or out of place.
- [ ] The manifest is honest: ages, content notes, controls, devices.

**Approve:** merge PR #${pr} (it stays off the site while listing is "submitted"), then:

    npm run review-submission -- ${pr} --approve

**Decline:**

    npm run review-submission -- ${pr} --decline "the reason, in kind words"
`;
writeFileSync(reviewFile,md);
writeFileSync(stateFile,`${JSON.stringify({ pr,slug,head,sourceSha256: source,reportSha256: reportSha,ok: report.ok,screens: report.screens,video: report.video },null,2)}\n`);
console.log(`\nReview written: ${relative(root,reviewFile)} (${report.screens.length} screens${report.video ? ', a recording' : ''}).${report.ok ? '' : ' Some checks FAILED.'}`);
process.exit(report.ok ? 0 : 1);

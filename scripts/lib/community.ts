// The fingerprint of a community game's source: what the owner reviewed and approved. Every file in
// community/<slug>/ (except the git-ignored .check/), with game.json's review fields left out, so
// the approval commit doesn't change it. The play origin's production build serves a game only
// while its fingerprint still equals approval.sourceSha256: any later change needs a new review.
import { createHash } from 'node:crypto';
import { existsSync,readdirSync,readFileSync,statSync } from 'node:fs';
import { join,relative } from 'node:path';
import type { CommunityManifest } from './manifest';

export function sourceSha256(dir: string): string {
  const hash = createHash('sha256');
  const files: string[] = [];
  const walk = (folder: string) => { for (const name of readdirSync(folder).sort()) { const path = join(folder,name), rel = relative(dir,path); if (rel === '.check' || rel === 'node_modules') continue; if (statSync(path).isDirectory()) walk(path); else files.push(rel); } };
  if (existsSync(dir)) walk(dir);
  for (const rel of files) {
    let bytes = readFileSync(join(dir,rel));
    if (rel === 'game.json') {
      const manifest = JSON.parse(bytes.toString('utf8'));
      delete manifest.approval; delete manifest.listing;
      if (manifest.submitted) delete manifest.submitted.sourceCommit;
      bytes = Buffer.from(JSON.stringify(manifest));
    }
    hash.update(`${rel}\0`).update(bytes).update('\0');
  }
  return hash.digest('hex');
}

export type CommunityMode = 'production' | 'preview' | 'local';
/** Where this build runs: Vercel production, a Vercel preview, or a local or CI build. */
export const communityMode = (): CommunityMode => process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'preview' : 'local';

/**
 * The community games a build serves, the same for the play origin and the website.
 * Production: only approved, listed games whose source still matches the approval. Previews and
 * local builds: every game that isn't unlisted, marked as a preview until it is approved.
 */
export function servedCommunity(manifests: CommunityManifest[],mode: CommunityMode,dirOf: (slug: string) => string) {
  const served: { manifest: CommunityManifest; preview: boolean }[] = [], skipped: { slug: string; why: string }[] = [];
  for (const m of manifests) {
    const approved = m.listing === 'listed' && !!m.approval && sourceSha256(dirOf(m.slug)) === m.approval.sourceSha256;
    const why = mode === 'production'
      ? (m.listing !== 'listed' ? `listing is "${m.listing}"` : !m.approval ? 'no approval' : !approved ? 'its source changed after the approval (needs a new review)' : '')
      : (m.listing === 'unlisted' ? 'unlisted' : '');
    if (why) skipped.push({ slug: m.slug,why }); else served.push({ manifest: m,preview: !approved });
  }
  return { served,skipped };
}

/** Each game's address on the play origin: its own host in production, a path on previews and locally. */
export function playUrl(slug: string,mode: CommunityMode) {
  if (mode === 'production') return `https://aikg-${slug}.vercel.app/`;
  if (mode === 'preview') {
    // Vercel's branch address for the play project: the branch lowercased, other characters as "-".
    const branch = (process.env.VERCEL_GIT_COMMIT_REF ?? 'main').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return `https://ai-kids-games-play-git-${branch}-real-tours.vercel.app/${slug}/`;
  }
  return `${(process.env.AIKG_PLAY_BASE ?? 'http://127.0.0.1:4320').replace(/\/$/,'')}/${slug}/`;
}

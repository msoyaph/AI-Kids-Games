// Keep the owner's production approval gate even if hosting classifies a deploy incorrectly.
// A Vercel production build is allowed only when two keys agree on this exact package.json
// version, so a new release always needs a new version and a new approval:
//   1. DEPLOYMENT.json's productionApproval records the owner's approval for this version
//      (committed to the repo), and
//   2. AIKG_ALLOW_PRODUCTION equals this version. It is set only in Vercel's Production
//      environment, and only at release time; Preview never has it.
// A Git deployment must also come from main (the production branch after release).
import { readFileSync } from 'node:fs';
const environment = process.env.VERCEL_ENV;
const previewOnly = process.env.AIKG_PREVIEW_ONLY === '1';
if (previewOnly && environment !== 'preview') {
  throw new Error(`Preview-only deployment refused: Vercel classified this build as ${environment || 'unknown'}. Production requires owner approval.`);
}
if (process.env.VERCEL === '1' && environment === 'production') {
  const { version } = JSON.parse(readFileSync('package.json','utf8')) as { version: string };
  const approval = (JSON.parse(readFileSync('DEPLOYMENT.json','utf8')) as { productionApproval?: { approved?: boolean; release?: string; date?: string } }).productionApproval;
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (!(approval?.approved === true && approval.release === version)) throw new Error(`Production deployment refused: release ${version} has no recorded owner approval in DEPLOYMENT.json.`);
  if (process.env.AIKG_ALLOW_PRODUCTION !== version) throw new Error(`Production deployment refused: AIKG_ALLOW_PRODUCTION in Vercel's Production environment must be set to ${version} at release time.`);
  if (branch && branch !== 'main') throw new Error(`Production deployment refused: production deploys only from main, not ${branch}.`);
  console.log(`Production deployment of release ${version} approved by the owner on ${approval.date ?? 'record'}.`);
}

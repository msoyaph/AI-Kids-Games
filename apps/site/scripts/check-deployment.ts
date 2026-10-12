// Keep the owner's production approval gate even if hosting classifies a deploy incorrectly.
// A Vercel production build is allowed only for a release the owner approved: either
// AIKG_ALLOW_PRODUCTION=approved, or DEPLOYMENT.json's productionApproval names this exact
// package.json version. A new release needs a new version and a new recorded approval.
import { readFileSync } from 'node:fs';
const environment = process.env.VERCEL_ENV;
const previewOnly = process.env.AIKG_PREVIEW_ONLY === '1';
if (previewOnly && environment !== 'preview') {
  throw new Error(`Preview-only deployment refused: Vercel classified this build as ${environment || 'unknown'}. Production requires owner approval.`);
}
if (process.env.VERCEL === '1' && environment === 'production') {
  const { version } = JSON.parse(readFileSync('package.json','utf8')) as { version: string };
  const approval = (JSON.parse(readFileSync('DEPLOYMENT.json','utf8')) as { productionApproval?: { approved?: boolean; release?: string; date?: string } }).productionApproval;
  const approved = process.env.AIKG_ALLOW_PRODUCTION === 'approved' || (approval?.approved === true && approval.release === version);
  if (!approved) throw new Error(`Production deployment refused: release ${version} has no recorded owner approval in DEPLOYMENT.json.`);
  console.log(`Production deployment of release ${version} approved by the owner on ${approval?.date ?? 'record'}.`);
}

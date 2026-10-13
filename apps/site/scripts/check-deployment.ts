// Keep the owner's production approval gate even if hosting classifies a deploy incorrectly.
// A Vercel production build is allowed only when two keys agree on this exact package.json
// version, so a new release always needs a new version and a new approval:
//   1. DEPLOYMENT.json's productionApproval records the owner's approval for this version
//      (committed to the repo), and
//   2. AIKG_ALLOW_PRODUCTION equals this version. It is set only in Vercel's Production
//      environment, and only at release time; Preview never has it.
// A Git deployment must also come from main (the production branch after release), and the GPU
// browser suites CI can't run (local-suites.ts) must have passed on the release machine for this
// version and for exactly the game sources this release ships (DEPLOYMENT.json localSuites, whose
// build-inputs hashes must match BUILD_IMPORTS.json).
import { readFileSync } from 'node:fs';
import { LOCAL_SUITES,type LocalSuites } from './local-suites';

const environment = process.env.VERCEL_ENV;
const previewOnly = process.env.AIKG_PREVIEW_ONLY === '1';
if (previewOnly && environment !== 'preview') {
  throw new Error(`Preview-only deployment refused: Vercel classified this build as ${environment || 'unknown'}. Production requires owner approval.`);
}
if (process.env.VERCEL === '1' && environment === 'production') {
  const { version } = JSON.parse(readFileSync('package.json','utf8')) as { version: string };
  const record = JSON.parse(readFileSync('DEPLOYMENT.json','utf8')) as { productionApproval?: { approved?: boolean; release?: string; date?: string }; localSuites?: LocalSuites };
  const approval = record.productionApproval;
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (!(approval?.approved === true && approval.release === version)) throw new Error(`Production deployment refused: release ${version} has no recorded owner approval in DEPLOYMENT.json.`);
  if (process.env.AIKG_ALLOW_PRODUCTION !== version) throw new Error(`Production deployment refused: AIKG_ALLOW_PRODUCTION in Vercel's Production environment must be set to ${version} at release time.`);
  if (branch && branch !== 'main') throw new Error(`Production deployment refused: production deploys only from main, not ${branch}.`);
  const shipped = (JSON.parse(readFileSync('BUILD_IMPORTS.json','utf8')) as { games: { slug: string; inputsSha256: string }[] }).games;
  for (const game of LOCAL_SUITES) {
    const run = record.localSuites?.release === version ? record.localSuites.suites.find(suite => suite.game === game) : undefined;
    if (!run || run.failed !== 0 || !(run.passed > 0)) throw new Error(`Production deployment refused: ${game}'s GPU browser suite has no passing run recorded for release ${version} (npm run release:local).`);
    if (run.inputsSha256 !== shipped.find(entry => entry.slug === game)?.inputsSha256) throw new Error(`Production deployment refused: ${game}'s recorded browser suite ran on different sources than release ${version} ships. Run npm run release:local again.`);
  }
  console.log(`Production deployment of release ${version} approved by the owner on ${approval.date ?? 'record'}; GPU browser suites passed on ${record.localSuites!.commit}.`);
}

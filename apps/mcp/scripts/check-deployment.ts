// The owner's production gate, as on the website (apps/site/scripts/check-deployment.ts): a Vercel
// production build of this app needs two keys that agree on this exact package.json version:
//   1. DEPLOYMENT.json's productionApproval records the owner's approval for this version, and
//   2. AIKG_ALLOW_PRODUCTION equals this version (set only in this project's Production environment).
// A Git deployment must also come from main. Previews never need either.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function checkDeployment(env: NodeJS.ProcessEnv = process.env,dir = resolve(import.meta.dirname,'..')) {
  const target = env.VERCEL_TARGET_ENV || env.VERCEL_ENV;
  if (target !== 'production') return `Not a production build (${target || 'local'}): no approval needed.`;
  const { version } = JSON.parse(readFileSync(resolve(dir,'package.json'),'utf8')) as { version: string };
  const approval = (JSON.parse(readFileSync(resolve(dir,'DEPLOYMENT.json'),'utf8')) as { productionApproval?: { approved?: boolean; release?: string; date?: string } | null }).productionApproval;
  if (!(approval?.approved === true && approval.release === version)) throw new Error(`Production deployment refused: release ${version} of the MCP app has no recorded owner approval in apps/mcp/DEPLOYMENT.json.`);
  if (env.AIKG_ALLOW_PRODUCTION !== version) throw new Error(`Production deployment refused: AIKG_ALLOW_PRODUCTION in this project's Production environment must be set to ${version} at release time.`);
  const branch = env.VERCEL_GIT_COMMIT_REF;
  if (branch && branch !== 'main') throw new Error(`Production deployment refused: production deploys only from main, not ${branch}.`);
  return `Production deployment of MCP app ${version} approved by the owner on ${approval.date ?? 'record'}.`;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(checkDeployment());

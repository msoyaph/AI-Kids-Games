// npm run test:smoke [-- <site address>]      (default: the live site)
// After a production release, the only browser test against production: tests/e2e/smoke.spec.ts on the
// desktop project. The full suites run against the release's preview deployment before the merge
// (AIKG_BASE_URL=<preview> AIKG_VERCEL_BYPASS=<secret> npm run test:e2e). Each run against a hosted
// site is recorded in DEPLOYMENT.json productionTests, with its time window, so npm run plays can say
// which days include test traffic.
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUBLIC_ORIGIN } from '../src/data/site';

const url = process.argv[2] ?? process.env.SITE_ORIGIN ?? PUBLIC_ORIGIN;
const hosted = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
const from = new Date().toISOString();
const run = spawnSync('npx',['playwright','test','tests/e2e/smoke.spec.ts','--project=desktop','--reporter=list'],{ cwd: resolve(import.meta.dirname,'..'),stdio: 'inherit',env: { ...process.env,AIKG_BASE_URL: url } });
const to = new Date().toISOString();
if (hosted) {
  const file = resolve(import.meta.dirname,'../DEPLOYMENT.json');
  const record = JSON.parse(readFileSync(file,'utf8'));
  const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname,'../package.json'),'utf8')) as { version: string };
  record.productionTests = [...(record.productionTests ?? []),{ release: version,kind: 'smoke',url,from,to,result: run.status === 0 ? 'passed' : 'failed' }];
  writeFileSync(file,`${JSON.stringify(record,null,2)}\n`);
  console.log(`Recorded the smoke test (${from} to ${to}) in DEPLOYMENT.json productionTests. Commit it with the release record.`);
}
process.exit(run.status ?? 1);

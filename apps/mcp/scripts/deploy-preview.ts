// npm run deploy:preview --workspace apps/mcp
// Builds and uploads a PREVIEW of the MCP app (never production: --target preview, and the build's
// builds.json says preview), then records its address in DEPLOYMENT.json. Needs the Vercel CLI logged in
// to the real-tours team and apps/mcp/.vercel/project.json (git-ignored) linking ai-kids-games-mcp.
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = resolve(import.meta.dirname,'..');
const run = (command: string,args: string[]) => { const result = spawnSync(command,args,{ cwd: here,encoding: 'utf8',env: { ...process.env,VERCEL_ENV: 'preview' } }); if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr}`); return result.stdout+result.stderr; };
run('npx',['tsx','scripts/build.ts']);
const output = run('npx',['--yes','vercel@50.9.1','deploy','--prebuilt','--target','preview','--scope','real-tours','--yes']);
const url = output.match(/Preview: (https:\/\/\S+\.vercel\.app)/)?.[1];
if (!url || /Production:/.test(output)) throw new Error(`Unexpected deploy output:\n${output}`);
const commit = spawnSync('git',['rev-parse','--short','HEAD'],{ cwd: here,encoding: 'utf8' }).stdout.trim();
const record = JSON.parse(readFileSync(resolve(here,'DEPLOYMENT.json'),'utf8'));
record.preview = { url,endpoint: `${url}/mcp`,commit,deployedAt: new Date().toISOString().slice(0,10),protection: 'Vercel Authentication off on this project only (owner decision, 2026-10-13)' };
writeFileSync(resolve(here,'DEPLOYMENT.json'),`${JSON.stringify(record,null,2)}\n`);
console.log(`Preview: ${url}/mcp`);

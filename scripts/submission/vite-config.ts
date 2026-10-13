// The one Vite config every community game is built with (check-submission, the play origin's
// build and the dev server). A submission can't bring its own: any vite.config in its folder is
// rejected, and this config sets configFile: false. The build is one self-contained index.html,
// as the starter's, with the no-network CSP, and imports may only reach the game's own folder or
// an allow-listed package. Builds log errors only: the checks report problems themselves, with
// fixes.
import { readFileSync } from 'node:fs';
import { dirname,relative,resolve,sep } from 'node:path';
import type { InlineConfig,Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { root } from '../lib/repo';
import { GAME_CSP } from './csp';

export const KIT = resolve(root,'tooling/community-kit');
export const ALLOWLIST: Record<string,string> = JSON.parse(readFileSync(resolve(KIT,'allowlist.json'),'utf8')).packages;
/** "three/addons/x.js" → "three"; "@types/three" stays whole. */
export const packageName = (specifier: string) => specifier.startsWith('@') ? specifier.split('/').slice(0,2).join('/') : specifier.split('/')[0]!;
const bare = (specifier: string) => !/^(\.{1,2}\/|\/|\0|[a-zA-Z]:|data:|virtual:)/.test(specifier) && !specifier.startsWith('/@') && !specifier.startsWith('vite/');

/** Rejects imports of packages that aren't allowed, and paths that leave the game's folder. */
function importGuard(dir: string): Plugin {
  return {
    name: 'community-import-guard',enforce: 'pre',
    resolveId(specifier,importer) {
      if (!importer || importer.includes('node_modules')) return null;
      if (bare(specifier)) {
        const name = packageName(specifier);
        if (!(name in ALLOWLIST)) this.error(`"${specifier}" isn't an allowed package. Community games may only import ${Object.keys(ALLOWLIST).join(', ')} (tooling/community-kit/allowlist.json). Write it in your own code instead.`);
        return null;
      }
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const target = specifier.startsWith('/') ? resolve(dir,`.${specifier}`) : resolve(dirname(importer.split('?')[0]!),specifier.split('?')[0]!);
        if (!target.startsWith(dir+sep) && target !== dir) this.error(`"${specifier}" (in ${relative(dir,importer)}) reaches outside your game's folder. Keep every file inside community/<slug>/.`);
      }
      return null;
    }
  };
}

const cspMeta: Plugin = { name: 'no-network-csp',apply: 'build',transformIndexHtml: html => html.replace(/<meta charset="UTF-8"\s*\/?>/i,match => `${match}\n    <meta http-equiv="Content-Security-Policy" content="${GAME_CSP}" />`) };

export function communityViteConfig(dir: string,outDir: string,mode: 'build' | 'dev' = 'build'): InlineConfig {
  return {
    configFile: false,envDir: false,root: dir,base: './',publicDir: false,logLevel: mode === 'dev' ? 'warn' : 'error',clearScreen: false,mode: mode === 'dev' ? 'development' : 'production',
    plugins: [importGuard(dir),cspMeta,viteSingleFile({ removeViteModuleLoader: true })],
    build: { outDir,emptyOutDir: true,target: 'es2020',assetsInlineLimit: 100_000_000,cssCodeSplit: false,modulePreload: false,reportCompressedSize: false },
    server: { host: '127.0.0.1',strictPort: false,fs: { strict: true,allow: [dir,resolve(root,'node_modules')] } }
  };
}

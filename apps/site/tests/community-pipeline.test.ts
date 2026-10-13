import { describe,expect,it } from 'vitest';
import type { CommunityManifest } from '../../../scripts/lib/manifest';
import { checkContent } from '../../../scripts/submission/content';
import { checkDependencies,checkFiles } from '../../../scripts/submission/files';
import { maxFlashesPerSecond,type Frame } from '../../../scripts/submission/flash';
import { scanSource } from '../../../scripts/submission/source';
import type { SourceFile,Submission } from '../../../scripts/submission/types';

const manifest = (slug: string,extra: Partial<CommunityManifest> = {}) => ({ slug,listing: 'submitted',storage: { prefix: `${slug.replace(/-/g,'')}.`,keys: [] },...extra }) as unknown as CommunityManifest;
const submission = (files: Record<string,string>,m: Partial<CommunityManifest> = {}): Submission => ({
  slug: 'test-game',dir: '/tmp/test-game',checkDir: '/tmp/test-game/.check',manifest: manifest('test-game',m),
  files: Object.entries(files).map(([path,text]): SourceFile => ({ path,bytes: Buffer.byteLength(text),text }))
});

describe('check-submission finds problems, with a fix for each',() => {
  it('reaching outside: network, eval, outside addresses, navigation, packages and imports',() => {
    const { access,risks } = scanSource(submission({ 'src/main.ts': [
      'import confetti from "canvas-confetti";','import x from "../../../apps/site/src/data/site";','fetch("https://example.com/score");','eval("1+1");',
      'new Function("return 1");','setTimeout("go()", 10);','const img = "https://cdn.example.com/a.png";','window.open("https://example.com");','navigator.sendBeacon("/x");','new WebSocket("wss://x");',
      'const ns = "http://www.w3.org/2000/svg";'
    ].join('\n') }));
    const text = access.problems.map(problem => problem.message).join('\n');
    for (const what of ['canvas-confetti','outside your game\'s folder','fetch()','eval()','new Function','string to setTimeout','cdn.example.com','open()','sendBeacon','WebSocket']) expect(text).toContain(what);
    expect(text).not.toContain('w3.org');
    expect(access.status).toBe('fail');
    expect(risks.every(risk => risk.file === 'src/main.ts' && risk.line > 0)).toBe(true);
    expect(access.problems.every(problem => problem.fix.length > 10)).toBe(true);
  });
  it('the test runner is allowed in tests only',() => {
    const { access } = scanSource(submission({ 'tests/unit/a.test.ts': 'import { it } from "vitest";','src/main.ts': 'import { it } from "vitest";' }));
    expect(access.problems.map(problem => problem.file)).toEqual(['src/main.ts']);
  });
  it('storage: no clear(), no other storage, keys under the prefix',() => {
    const { storage } = scanSource(submission({ 'src/main.ts': 'localStorage.clear();\nsessionStorage.setItem("a","b");\nlocalStorage.setItem("highscore","1");\nlocalStorage.setItem("testgame.save","1");' }));
    const text = storage.problems.map(problem => problem.message).join('\n');
    expect(text).toMatch(/clear\(\)/); expect(text).toMatch(/sessionStorage/); expect(text).toMatch(/"highscore"/); expect(text).not.toMatch(/testgame\.save/);
  });
  it('markup and styles: outside scripts, links, fonts',() => {
    const { access } = scanSource(submission({ 'index.html': '<script src="https://cdn.example.com/x.js"></script><a href="https://example.com">x</a>','src/style.css': '@import url("https://fonts.example.com/a.css");\n@font-face { font-family: X; }' }));
    expect(access.problems.length).toBeGreaterThanOrEqual(3);
  });
  it('files: binaries, minified code, configs, lockfiles and builds',() => {
    const s = submission({ 'game.json': '{}','package.json': '{}','index.html': '<html></html>','src/main.ts': 'x','src/min.js': 'a'.repeat(3000),'vite.config.ts': 'x','package-lock.json': '{}','dist/index.html': 'x','src/logo.png': 'x' });
    s.files.find(file => file.path === 'src/logo.png')!.text = null;
    const text = checkFiles(s).problems.map(problem => problem.message).join('\n');
    for (const what of ['minified','config','lockfile','build output','.png']) expect(text).toContain(what);
  });
  it('dependencies: only allow-listed packages at exact versions, no scripts',() => {
    const text = checkDependencies(submission({ 'package.json': JSON.stringify({ name: 'x',license: 'MIT',scripts: { postinstall: 'curl evil' },dependencies: { three: '^0.186.1','left-pad': '1.3.0' } }) })).problems.map(problem => problem.message).join('\n');
    expect(text).toMatch(/"scripts"/); expect(text).toMatch(/"three" is "\^0\.186\.1"/); expect(text).toMatch(/"left-pad" isn't an allowed package/);
  });
  it('content: rude words and trademarks fail, risky topics are flagged for review',() => {
    const result = checkContent([{ text: 'You are a b1tch',file: 'src/a.ts',line: 1 },{ text: 'Build like in Minecraft',file: 'src/a.ts',line: 2 },{ text: 'Spin the casino wheel',file: 'src/a.ts',line: 3 },{ text: 'Catch the stars!',file: 'src/a.ts',line: 4 }]);
    const fails = result.problems.filter(problem => (problem.severity ?? 'fail') === 'fail').map(problem => problem.message).join('\n'), warns = result.problems.filter(problem => problem.severity === 'warn');
    expect(fails).toMatch(/rude or hateful/); expect(fails).toMatch(/"minecraft"/);
    expect(warns.map(problem => problem.message).join()).toMatch(/gambling/);
    expect(result.problems.some(problem => problem.message.includes('Catch the stars'))).toBe(false);
  });
  it('flash safety counter (WCAG three flashes, from vanex-defense\'s self-test)',() => {
    const wave = (hz: number,square: boolean): Frame[] => Array.from({ length: 180 },(_,i) => { const t = i/60; return { t,l: [0.05,square ? (Math.floor(t*hz*2) % 2 ? 0.6 : 0.05) : 0.3+0.25*Math.sin(t*hz*Math.PI*2)] }; });
    expect(maxFlashesPerSecond(wave(5,true)).max).toBeGreaterThanOrEqual(4);
    expect(maxFlashesPerSecond(wave(2,false)).max).toBeLessThanOrEqual(3);
  });
});

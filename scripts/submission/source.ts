// Reads a submission's source with the TypeScript compiler (not text search), so each finding has
// an exact file and line: anything that could reach outside the game (network, outside URLs,
// eval, navigation, packages that aren't allowed), storage outside the game's prefix, and every
// piece of text in the game, for the content check and the owner's review.
import { dirname,join,normalize,sep } from 'node:path';
import ts from 'typescript';
import { result,type CheckResult,type Problem,type Submission } from './types';
import { ALLOWLIST,packageName } from './vite-config';

/** The kit's test runner: a game's own tests (never its build) may import it. */
const TEST_PACKAGES = new Set(['vitest']);

export interface GameText { text: string; file: string; line: number }
export interface Risk { pattern: string; file: string; line: number; code: string }
export interface SourceScan { access: CheckResult; storage: CheckResult; texts: GameText[]; risks: Risk[] }

/** XML namespaces in SVG and HTML are identifiers, not addresses the game visits. */
const NAMESPACES = /^https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xhtml|1999\/xlink|2000\/xmlns\/?|1998\/Math\/MathML|XML\/1998\/namespace)/;
const URL_IN = /\b(https?|wss?|ftp):\/\/[^\s'"`<>)]+|(^|[\s'"(=])\/\/[a-z0-9.-]+\.[a-z]{2,}\//i;
const TRACKERS = /google-?analytics|googletagmanager|gtag\(|doubleclick|googlesyndication|admob|facebook\.net|fbq\(|connect\.facebook|mixpanel|amplitude\.com|@amplitude|segment\.(io|com)|posthog|hotjar|sentry\.io|@sentry|bugsnag|datadog|newrelic|clarity\.ms|unityads|applovin|ironsource|chartboost|adcolony|vungle/i;
const NETWORK_NEW = new Set(['XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','RTCPeerConnection','WebTransport','Function','BroadcastChannel']);
const FIX = {
  network: 'Remove it. Community games make no network requests of any kind: everything (art, sound, data) is in your own code.',
  eval: 'Remove it. eval and new Function run text as code, which the game\'s security policy blocks; write the code directly.',
  url: 'Remove the address. Games can\'t link to or load anything from other sites; put what you need in your own code.',
  leave: 'Remove it. A game can\'t open other pages or windows or navigate away; the website handles Back and links.',
  tracker: 'Remove it. Ads, analytics and tracking are never allowed in AI Kids Games.',
  storage: 'Use src/storage.ts (from the starter), which keeps every save under your game\'s prefix.'
};

export function scanSource(s: Submission): SourceScan {
  const access: Problem[] = [], storage: Problem[] = [], texts: GameText[] = [], risks: Risk[] = [];
  const prefix = s.manifest?.storage?.prefix ?? '';
  const add = (list: Problem[],message: string,fix: string,file: string,line: number,code: string,pattern: string,severity: 'fail' | 'warn' = 'fail') => {
    list.push({ message,fix,file,line,severity }); risks.push({ pattern,file,line,code: code.trim().slice(0,160) });
  };
  for (const file of s.files) {
    if (file.text === null) continue;
    const text = file.text, lineOf = (index: number) => text.slice(0,index).split('\n').length;
    if (/\.(m?js|tsx?)$/.test(file.path)) scanCode(file.path,text);
    else if (file.path.endsWith('.html') || file.path.endsWith('.svg')) scanMarkup(file.path,text,lineOf);
    else if (file.path.endsWith('.css')) scanCss(file.path,text,lineOf);
    else if (file.path === 'game.json') collectJson(file.path,text);
    if (!file.path.endsWith('.md') && TRACKERS.test(text)) { const at = text.search(TRACKERS); add(access,`${file.path} mentions an ad, analytics or tracking service ("${text.slice(at,at+30).split(/\s/)[0]}").`,FIX.tracker,file.path,lineOf(at),text.slice(at,at+60),'tracker'); }
  }

  function scanCode(path: string,code: string) {
    const source = ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const at = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
    const snippet = (node: ts.Node) => node.getText(source);
    const name = (expr: ts.Expression): string => ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) ? `${name(expr.expression)}.${expr.name.text}` : ts.isElementAccessExpression(expr) && ts.isStringLiteral(expr.argumentExpression) ? `${name(expr.expression)}.${expr.argumentExpression.text}` : '';
    const strip = (full: string) => full.replace(/^(window|globalThis|self)\./,'');
    const checkSpecifier = (specifier: string,node: ts.Node) => {
      if (/^(\.{1,2}\/|\/)/.test(specifier)) {
        const target = normalize(join(dirname(path),specifier));
        if (target.startsWith('..') || target.startsWith(sep)) add(access,`${path} imports "${specifier}", outside your game's folder.`,'Keep every file you import inside community/<slug>/.',path,at(node),snippet(node),'import outside folder');
      } else if (!(packageName(specifier) in ALLOWLIST) && !(path.startsWith('tests/') && TEST_PACKAGES.has(packageName(specifier)))) add(access,`${path} imports "${specifier}", which isn't an allowed package.`,`Write it yourself. Allowed packages: ${Object.keys(ALLOWLIST).join(', ')}.`,path,at(node),snippet(node),'package not allowed');
    };
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) checkSpecifier(node.moduleSpecifier.text,node);
      if (ts.isCallExpression(node)) {
        const callee = strip(name(node.expression)), first = node.arguments[0];
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (first && ts.isStringLiteral(first)) checkSpecifier(first.text,node);
          else add(access,`${path} has a dynamic import() of a computed path.`,'Use a normal import at the top of the file.',path,at(node),snippet(node),'dynamic import');
        }
        if (callee === 'require') add(access,`${path} uses require().`,'Use import instead.',path,at(node),snippet(node),'require');
        if (['fetch','navigator.sendBeacon','importScripts'].includes(callee)) add(access,`${path} calls ${callee}(), a network request.`,FIX.network,path,at(node),snippet(node),'network');
        if (callee === 'eval') add(access,`${path} calls eval().`,FIX.eval,path,at(node),snippet(node),'eval');
        if (['setTimeout','setInterval'].includes(callee) && first && (ts.isStringLiteral(first) || ts.isTemplateExpression(first) || ts.isNoSubstitutionTemplateLiteral(first))) add(access,`${path} passes a string to ${callee}(), which runs it as code.`,FIX.eval,path,at(node),snippet(node),'eval');
        if (['open','location.assign','location.replace','document.open','document.write','document.writeln','history.pushState','history.replaceState'].includes(callee)) add(access,`${path} calls ${callee}().`,FIX.leave,path,at(node),snippet(node),'navigation');
        if (callee.endsWith('postMessage') && node.arguments[1] && ts.isStringLiteral(node.arguments[1]) && node.arguments[1].text === '*') add(access,`${path} posts messages to any page ("*").`,'Remove it: games don\'t talk to other pages.',path,at(node),snippet(node),'postMessage *');
        if (/(^|\.)(geolocation|mediaDevices|getUserMedia|getDisplayMedia|bluetooth|usb|serial|hid|clipboard)(\.|$)/.test(callee)) add(access,`${path} uses ${callee}, which asks for device access.`,'Remove it: games never use the camera, microphone, location, clipboard or other devices.',path,at(node),snippet(node),'device access');
        if (/^(localStorage|sessionStorage)\.clear$/.test(callee)) add(storage,`${path} calls ${callee}(), which would wipe every game's saves.`,'Remove it. To reset, remove only your own keys (your prefix) one by one.',path,at(node),snippet(node),'storage clear');
        if (/^localStorage\.(setItem|getItem|removeItem)$/.test(callee) && first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) && prefix && !first.text.startsWith(prefix)) add(storage,`${path} uses the storage key "${first.text}", which doesn't start with "${prefix}".`,FIX.storage,path,at(node),snippet(node),'storage key');
      }
      if (ts.isNewExpression(node)) { const ctor = strip(name(node.expression)); if (NETWORK_NEW.has(ctor)) add(access,`${path} creates a new ${ctor}.`,ctor === 'Function' ? FIX.eval : FIX.network,path,at(node),snippet(node),ctor === 'Function' ? 'eval' : 'network'); }
      if (ts.isPropertyAccessExpression(node)) {
        const full = strip(name(node));
        if (/^(sessionStorage|indexedDB|caches|document\.cookie|navigator\.serviceWorker)$/.test(full) || /^(sessionStorage|indexedDB|caches)\./.test(full)) add(storage,`${path} uses ${full}.`,'Use only localStorage under your prefix, through src/storage.ts.',path,at(node),snippet(node),'storage api');
        if (/^(location|document\.location|top\.location|parent\.location)\.href$/.test(full) && ts.isBinaryExpression(node.parent) && node.parent.left === node) add(access,`${path} sets ${full}, which leaves the game.`,FIX.leave,path,at(node),snippet(node.parent),'navigation');
        if (/^(top|parent|opener)\./.test(full)) add(access,`${path} reaches into ${full.split('.')[0]}, the page around the game.`,'Remove it: a game only touches its own page.',path,at(node),snippet(node),'parent access');
      }
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const value = ts.isJsxText(node) ? node.text.trim() : node.text;
        if (value && !(ts.isStringLiteral(node) && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)))) {
          texts.push({ text: value,file: path,line: at(node) });
          const url = URL_IN.exec(value);
          if (url && !NAMESPACES.test(url[0].trim())) add(access,`${path} has an outside address: "${url[0].trim().slice(0,80)}".`,FIX.url,path,at(node),snippet(node),'outside URL');
        }
      }
      ts.forEachChild(node,visit);
    };
    visit(source);
  }

  function scanMarkup(path: string,html: string,lineOf: (index: number) => number) {
    const rules: [RegExp,string,string][] = [
      [/<script\b[^>]*\bsrc\s*=\s*["']?(?!\.?\/?src\/|\.\/|\/src\/)[^"'\s>]+/gi,'loads a script from outside your folder',FIX.network],
      [/<(link|img|iframe|frame|embed|object|audio|video|source|track|form|base|meta\s+http-equiv\s*=\s*["']?refresh)\b[^>]*\b(href|src|data|action|content)\s*=\s*["']?[^"'\s>]*(https?:|\/\/)/gi,'loads or links something from another site',FIX.url],
      [/<(iframe|frame|embed|object|form|base)\b/gi,'has an element that can load other pages or send data',FIX.leave],
      [/\bhref\s*=\s*["']?(https?:|\/\/|mailto:|tel:)/gi,'links to another site',FIX.leave]
    ];
    for (const [pattern,what,fix] of rules) for (const match of html.matchAll(pattern)) add(access,`${path} ${what}: ${match[0].slice(0,80)}`,fix,path,lineOf(match.index!),match[0],'markup');
    // Words people see: text between tags, and alt, title, aria-label and placeholder.
    const visible = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,match => '\n'.repeat(match.split('\n').length-1));
    for (const match of visible.matchAll(/>([^<]+)</g)) { const value = match[1]!.trim(); if (value) texts.push({ text: value,file: path,line: lineOf(match.index!) }); }
    for (const match of visible.matchAll(/\b(alt|title|aria-label|placeholder|content)\s*=\s*"([^"]+)"/gi)) texts.push({ text: match[2]!,file: path,line: lineOf(match.index!) });
    for (const match of html.matchAll(/(https?:\/\/[^\s"'<>)]+)/gi)) if (!NAMESPACES.test(match[1]!) && !/\b(href|src|data|action|content)\s*=\s*["']?$/i.test(html.slice(Math.max(0,match.index!-12),match.index))) add(access,`${path} has an outside address: "${match[1]!.slice(0,80)}".`,FIX.url,path,lineOf(match.index!),match[1]!,'outside URL');
  }

  function scanCss(path: string,css: string,lineOf: (index: number) => number) {
    for (const match of css.matchAll(/@import\b[^;]*|url\(\s*["']?(https?:|\/\/)[^)]*\)|@font-face\b/gi)) add(access,`${path} ${match[0].startsWith('@font') ? 'declares a web font' : 'loads something from outside'}: ${match[0].slice(0,80)}`,match[0].startsWith('@font') ? 'Use the system fonts (font-family: system-ui, sans-serif) instead of web fonts.' : FIX.url,path,lineOf(match.index!),match[0],'css');
  }

  function collectJson(path: string,json: string) {
    try {
      const walk = (value: unknown,key = ''): void => { if (typeof value === 'string') { if (!['$schema','hook','prefix','probe','sourceCommit','commit','sourceSha256','reportSha256','date'].includes(key) && value.trim()) texts.push({ text: value,file: path,line: 1 }); } else if (Array.isArray(value)) value.forEach(item => walk(item,key)); else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) walk(v,k); };
      walk(JSON.parse(json));
    } catch { /* the manifest check reports invalid JSON */ }
  }

  return {
    access: result('access','No outside access',access),
    storage: result('storage-static','Storage (in the code)',storage),
    texts,risks
  };
}

import { describe,expect,it } from 'vitest';
import { GENRES as MANIFEST_GENRES,DEVICES as MANIFEST_DEVICES,MOODS as MANIFEST_MOODS,trademarksIn } from '../../../scripts/lib/manifest';
import { DEVICES,GENRES,MOODS } from '../src/catalog';
import { siteFrom } from '../src/config';
import { argText,description,instructions,parentInfo,sourceLine,tools } from '../src/text';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const site = siteFrom('https://aikids.games');
const everything = JSON.stringify({ tools,argText,description,instructions: instructions(site),parent: parentInfo(site),source: sourceLine(site) });

describe('what the app says',() => {
  it('never names another company\'s game or trademark (tool descriptions, arguments, instructions, copy)',() => {
    expect(trademarksIn(everything)).toEqual([]);
    const widget = ['views.ts','player.ts'].map(file => readFileSync(resolve(import.meta.dirname,'../widget/src',file),'utf8')).join('\n');
    expect(trademarksIn(widget)).toEqual([]);
  });

  it('speaks to parents and caregivers and never invites a child to use the assistant',() => {
    expect(instructions(site)).toContain('parents and caregivers');
    expect(instructions(site)).toContain('Speak to the grown-up');
    expect(everything).not.toMatch(/\b(ask me|chat with me|kids can ask|tell your (mom|dad|parent))\b/i);
  });

  it('describes the requests parents actually make',() => {
    for (const request of ['racing game','quick puzzle for an 8-year-old','kid-safe games with no ads']) expect(tools.find_games.description).toContain(request);
  });

  it('uses the brand domain in labels only once the site is served from it',() => {
    expect(site.label).toBe('aikids.games');
    expect(siteFrom('https://ai-kids-games-fawn.vercel.app').label).toBe('AI Kids Games');
    expect(sourceLine(site)).toBe('From AI Kids Games: free, ad-free games for kids. aikids.games');
    expect(() => siteFrom('http://example.com')).toThrow();
  });

  it('spells the brand "AI Kids Games" everywhere',() => {
    const widget = ['views.ts','player.ts','storage.ts','index.html'].map(file => readFileSync(resolve(import.meta.dirname,'../widget',file.endsWith('.html') ? file : `src/${file}`),'utf8')).join('\n');
    for (const text of [everything,widget]) expect(text).not.toMatch(/\bAi Kids Games\b|\bAI kids games\b|\bAIKids\b/);
  });

  it('offers the same genres, devices and moods as the manifests',() => {
    expect([...GENRES]).toEqual([...MANIFEST_GENRES]);
    expect([...DEVICES]).toEqual([...MANIFEST_DEVICES]);
    expect([...MOODS]).toEqual([...MANIFEST_MOODS]);
  });
});

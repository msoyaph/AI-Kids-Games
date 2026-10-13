import { afterEach,describe,expect,it,vi } from 'vitest';
import { enterFullscreen,exitFullscreen,fullscreenSupported,iPhoneSafari,lockOrientation,standaloneDisplay,unlockOrientation } from '../src/lib/fullscreen';
import { markTipSeen,tipsSeen,TIPS_KEY,type StorageLike } from '../src/lib/storage';

const memory = (): StorageLike & { map: Map<string,string> } => { const map = new Map<string,string>(); return { map,getItem: key => map.get(key) ?? null,setItem: (key,value) => { map.set(key,value); },removeItem: key => { map.delete(key); } }; };
const media = (matches: Record<string,boolean>) => (query: string) => ({ matches: !!matches[query],media: query });
/** A fake document: `standard` / `prefixed` fullscreen APIs present or not. */
function fakeDocument({ standard,prefixed }: { standard: boolean; prefixed: boolean }) {
  const calls: string[] = [];
  const documentElement: Record<string,unknown> = {};
  if (standard) documentElement.requestFullscreen = async () => { calls.push('request'); };
  if (prefixed) documentElement.webkitRequestFullscreen = () => { calls.push('webkitRequest'); };
  const doc = {
    documentElement,fullscreenEnabled: standard,webkitFullscreenEnabled: prefixed,fullscreenElement: null as unknown,webkitFullscreenElement: null as unknown,
    exitFullscreen: async () => { calls.push('exit'); },webkitExitFullscreen: () => { calls.push('webkitExit'); }
  };
  return { doc,calls,element: documentElement as unknown as HTMLElement };
}
afterEach(() => vi.unstubAllGlobals());

describe('fullscreen support',() => {
  it('uses the standard API, or Safari’s prefixed one (older iPad Safari), and hides where neither exists (iPhone)',async () => {
    for (const [standard,prefixed,supported] of [[true,false,true],[false,true,true],[true,true,true],[false,false,false]] as const) {
      const { doc,calls,element } = fakeDocument({ standard,prefixed }); vi.stubGlobal('document',doc);
      expect(fullscreenSupported()).toBe(supported);
      if (supported) { await enterFullscreen(element); expect(calls).toEqual([standard ? 'request' : 'webkitRequest']); }
      else await expect(enterFullscreen(element)).rejects.toThrow();
    }
  });
  it('exits through whichever API holds the fullscreen element',async () => {
    const { doc,calls } = fakeDocument({ standard: false,prefixed: true }); vi.stubGlobal('document',doc);
    doc.webkitFullscreenElement = {}; await exitFullscreen(); expect(calls).toEqual(['webkitExit']);
    doc.webkitFullscreenElement = null; doc.fullscreenElement = {}; await exitFullscreen(); expect(calls).toEqual(['webkitExit','exit']);
  });
  it('iPhone Safari: navigator.standalone exists and no element fullscreen; iPad has fullscreen',() => {
    vi.stubGlobal('navigator',{ standalone: false,userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)' });
    vi.stubGlobal('document',fakeDocument({ standard: false,prefixed: false }).doc); expect(iPhoneSafari()).toBe(true);
    vi.stubGlobal('document',fakeDocument({ standard: true,prefixed: true }).doc); expect(iPhoneSafari()).toBe(false);
    vi.stubGlobal('navigator',{ userAgent: 'Android' });
    vi.stubGlobal('document',fakeDocument({ standard: false,prefixed: false }).doc); expect(iPhoneSafari()).toBe(false);
    // desktop Safari builds may expose navigator.standalone too; only an iPhone gets the card
    vi.stubGlobal('navigator',{ standalone: false,userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }); expect(iPhoneSafari()).toBe(false);
  });
  it('knows when it was opened from the Home Screen',() => {
    vi.stubGlobal('matchMedia',media({}));
    vi.stubGlobal('navigator',{ standalone: true }); expect(standaloneDisplay()).toBe(true);
    vi.stubGlobal('navigator',{ standalone: false }); expect(standaloneDisplay()).toBe(false);
    vi.stubGlobal('matchMedia',media({ '(display-mode: standalone)': true })); expect(standaloneDisplay()).toBe(true);
  });
});

describe('orientation lock',() => {
  it('locks to the game’s orientation on Android only, never for "any", and never throws',async () => {
    const calls: string[] = [];
    vi.stubGlobal('screen',{ orientation: { lock: async (o: string) => { calls.push(`lock:${o}`); },unlock: () => { calls.push('unlock'); } } });
    vi.stubGlobal('navigator',{ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)' });
    expect(await lockOrientation('landscape')).toBe(true);
    expect(await lockOrientation('any')).toBe(false);
    unlockOrientation();
    vi.stubGlobal('navigator',{ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)' });
    expect(await lockOrientation('portrait')).toBe(false);
    expect(calls).toEqual(['lock:landscape','unlock']);
    vi.stubGlobal('navigator',{ userAgent: 'Android' });
    vi.stubGlobal('screen',{ orientation: { lock: async () => { throw new Error('NotSupportedError'); } } });
    expect(await lockOrientation('landscape')).toBe(false);
    vi.stubGlobal('screen',{});
    expect(await lockOrientation('landscape')).toBe(false);
    expect(() => unlockOrientation()).not.toThrow();
  });
});

describe('one-time tips (aikg:tips)',() => {
  it('remembers answered tips, ignores junk and never throws',() => {
    const storage = memory();
    expect(tipsSeen(storage)).toEqual([]);
    markTipSeen('fullscreen',storage); markTipSeen('fullscreen',storage); markTipSeen('home-screen',storage);
    expect(storage.map.get(TIPS_KEY)).toBe('["fullscreen","home-screen"]');
    storage.setItem(TIPS_KEY,'["fullscreen",7,"other"]'); expect(tipsSeen(storage)).toEqual(['fullscreen']);
    storage.setItem(TIPS_KEY,'{'); expect(tipsSeen(storage)).toEqual([]);
    const blocked: StorageLike = { getItem: () => { throw new Error('blocked'); },setItem: () => { throw new Error('full'); },removeItem: () => {} };
    expect(tipsSeen(blocked)).toEqual([]); expect(() => markTipSeen('fullscreen',blocked)).not.toThrow(); expect(tipsSeen(undefined)).toEqual([]);
  });
  it('is the only key it writes, under the site’s aikg: prefix',() => {
    const storage = memory(); markTipSeen('home-screen',storage);
    expect([...storage.map.keys()]).toEqual(['aikg:tips']);
  });
});

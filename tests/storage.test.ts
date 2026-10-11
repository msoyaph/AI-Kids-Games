import { describe,expect,it } from 'vitest';
import { addRecent,FAVORITES_KEY,readList,RECENT_KEY,writeList,type StorageLike } from '../src/lib/storage';
const memory = (): StorageLike => { const map = new Map<string,string>(); return { getItem: key => map.get(key) || null,setItem: (key,value) => { map.set(key,value); },removeItem: key => { map.delete(key); } }; };
const valid = ['theabonk','light-crossing'];
describe('device-local lists',() => {
  it('round-trips favorites',() => { const storage = memory(); expect(writeList(FAVORITES_KEY,['theabonk'],storage)).toBe(true); expect(readList(FAVORITES_KEY,storage,valid)).toEqual(['theabonk']); });
  it('removes unknown, duplicate, and invalid saved values',() => { const storage = memory(); storage.setItem(FAVORITES_KEY,JSON.stringify(['theabonk','unknown','theabonk',7,null,'light-crossing'])); expect(readList(FAVORITES_KEY,storage,valid)).toEqual(valid); });
  it('does not throw when storage is blocked, full, absent, or corrupt',() => { const blocked: StorageLike = { getItem: () => { throw new Error('blocked'); },setItem: () => { throw new Error('full'); },removeItem: () => {} }; expect(readList(FAVORITES_KEY,blocked,valid)).toEqual([]); expect(writeList(FAVORITES_KEY,valid,blocked)).toBe(false); expect(writeList(FAVORITES_KEY,valid,undefined)).toBe(false); const corrupt = memory(); corrupt.setItem(FAVORITES_KEY,'{'); expect(readList(FAVORITES_KEY,corrupt,valid)).toEqual([]); });
  it('rejects non-array JSON',() => { const storage = memory(); storage.setItem(FAVORITES_KEY,'{"theabonk": true}'); expect(readList(FAVORITES_KEY,storage,valid)).toEqual([]); });
  it('moves replayed games first without duplicates',() => expect(addRecent(valid,'light-crossing')).toEqual(['light-crossing','theabonk']));
  it('caps recently played at ten games',() => { const all = Array.from({ length: 20 },(_,i) => `game-${i}`); const storage = memory(); writeList(RECENT_KEY,all,storage); expect(readList(RECENT_KEY,storage,all)).toHaveLength(10); expect(addRecent(all,'new')).toHaveLength(10); });
});

import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHAR_BY_ID, GUESTS, HOST, HOSTS, hostById } from '../../src/data/characters';
import { DAYS, opensOnDay } from '../../src/data/days';
import { FOOD_BY_ID, MENU, STATION_ORDER } from '../../src/data/menu';

describe('the character registry', () => {
  it('has six hosts to play as and plenty of friends, each with a unique id', () => {
    expect(new Set(CHARACTERS.map(c => c.id)).size).toBe(CHARACTERS.length);
    expect(CHARACTERS.filter(c => c.role === 'host')).toEqual(HOSTS);
    expect(HOSTS.map(h => h.name)).toEqual(['Minty', 'Single Scoop', 'Double Scoop', 'Vanilla', 'Raspberry', 'Cookie Cream']);
    expect(HOST.id).toBe('minty');
    expect(hostById('double').name).toBe('Double Scoop');
    expect(hostById('pim')).toBe(HOST);
    expect(new Set(HOSTS.map(h => h.perk?.id)).size).toBe(HOSTS.length);
    for (const guest of GUESTS) expect(guest.perk).toBeUndefined();
    expect(GUESTS.length).toBeGreaterThanOrEqual(8);
    for (const c of CHARACTERS) expect(CHAR_BY_ID[c.id]).toBe(c);
  });

  it('gives every character a complete, valid look', () => {
    const hex = /^#[0-9a-f]{6}$/;
    for (const c of CHARACTERS) {
      for (const color of [c.bg, c.look.skin, c.look.hair, c.look.outfit, c.look.accent, c.look.shoes]) expect(color, c.id).toMatch(hex);
      expect(c.name.length, c.id).toBeGreaterThan(1);
      expect(c.patience, c.id).toBeGreaterThan(0.5);
      expect(c.voice, c.id).toBeGreaterThan(0.4);
      if (c.favorite) expect(FOOD_BY_ID[c.favorite], c.id).toBeDefined();
    }
  });

  it('keeps the hosts true to their design sheets', () => {
    expect(HOST.look.hairStyle).toBe('twintailBun');
    expect(HOST.look.eyes).toBe('arches');
    expect(HOST.look.accessories).toEqual(expect.arrayContaining(['bowtie', 'hairpin']));
    const single = hostById('single').look, double = hostById('double').look;
    expect([single.hairStyle, single.eyes, single.outfitStyle]).toEqual(['scoopBun', 'arches', 'bubble']);
    expect(single.accessories).toContain('cravat');
    expect([double.hairStyle, double.eyes]).toEqual(['doubleScoop', 'arches']);
    expect(double.accessories).toEqual(expect.arrayContaining(['bowtie', 'backbow', 'wafer']));
    const vanilla = hostById('vanilla').look, raspberry = hostById('raspberry').look;
    expect([vanilla.hairStyle, vanilla.eyes, vanilla.outfitStyle]).toEqual(['vanillaCurls', 'arches', 'bell']);
    expect(vanilla.accessories).toEqual(expect.arrayContaining(['flowerbow', 'waferstick']));
    expect([raspberry.hairStyle, raspberry.eyes, raspberry.outfitStyle]).toEqual(['berryBow', 'arches', 'apron']);
    expect(raspberry.accessories).toContain('gembow');
    const cookie = hostById('cookie').look;
    expect([cookie.hairStyle, cookie.eyes, cookie.outfitStyle]).toEqual(['cookieCream', 'arches', 'coat']);
    expect(cookie.accessories).toEqual(expect.arrayContaining(['bowtie', 'wafersticks']));
  });
});

describe('the menu and the days', () => {
  it('has one station for every food', () => {
    expect([...STATION_ORDER].sort()).toEqual(MENU.map(f => f.id).sort());
  });

  it('only adds foods as the days go on', () => {
    for (let i = 0; i < DAYS.length; i++) {
      const day = DAYS[i];
      expect(day.guests).toBeGreaterThan(0);
      expect(day.sizes[0] + day.sizes[1] + day.sizes[2]).toBeGreaterThan(0);
      expect(day.gap[0]).toBeLessThanOrEqual(day.gap[1]);
      for (const food of day.menu) expect(FOOD_BY_ID[food]).toBeDefined();
      if (i > 0) for (const food of DAYS[i - 1].menu) expect(day.menu).toContain(food);
    }
    for (const f of MENU) expect(opensOnDay(f.id)).toBeLessThanOrEqual(DAYS.length);
  });
});

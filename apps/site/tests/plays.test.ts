import { describe,expect,it } from 'vitest';
import { csvLines,DIMENSIONS,metricsArgs,monthRange,parseTotals,previousMonth,rows,savedMonths,testDays } from '../scripts/plays-lib';

describe('npm run plays: our host\'s request totals, never analytics',() => {
  it('reads only totals per path, in production, without bots: never IPs, browsers or unique visitors',() => {
    const args = metricsArgs({ since: '30d' }).join(' ');
    for (const forbidden of ['clientIp','clientUserAgent','clientJa4','asn','requestId','referrer','unique']) expect(args).not.toContain(forbidden);
    expect(args).toContain('--filter environment:production');
    expect(args).toContain('--filter botCategory:""');
    expect(args).toContain('--group-by requestPath');
    expect(args).toMatch(/vercel@\d+\.\d+\.\d+ metrics vercel\.request\.count/);
    const used = [...args.matchAll(/--(?:group-by|filter) ([a-zA-Z]+)/g)].map(match => match[1]);
    expect(used.every(dimension => (DIMENSIONS as readonly string[]).includes(dimension))).toBe(true);
  });

  it('turns the CLI\'s JSON into totals per game and plays (about two requests per play)',() => {
    const output = 'Vercel CLI 61.1.0\n'+JSON.stringify({ summary: [
      { requestPath: '/games/tuck-pop/index.html',vercel_request_count_count: 21 },
      { requestPath: '/games/space-sky/index.html',vercel_request_count_count: 40 },
      { requestPath: '/games/space-sky/',vercel_request_count_count: 2 },
      { requestPath: '/games/unknown.txt',vercel_request_count_count: 5 }
    ] });
    const totals = parseTotals(output);
    expect(Object.fromEntries(totals)).toEqual({ 'tuck-pop': 21,'space-sky': 42 });
    expect(rows(totals,[{ slug: 'tuck-pop',title: 'Tuck Pop' },{ slug: 'space-sky',title: 'Space Sky' },{ slug: 'agentmon',title: 'Agentmon' }])).toEqual([
      { slug: 'space-sky',title: 'Space Sky',requests: 42,plays: 21 },
      { slug: 'tuck-pop',title: 'Tuck Pop',requests: 21,plays: 11 },
      { slug: 'agentmon',title: 'Agentmon',requests: 0,plays: 0 }
    ]);
    expect(() => parseTotals('{"status":"action_required","hint":"pick a team"}')).toThrow(/pick a team/);
  });

  it('saves calendar months, clipped to the 30 days Vercel keeps',() => {
    const now = new Date('2026-11-02T12:00:00Z');
    expect(previousMonth(now)).toBe('2026-10');
    expect(monthRange('2026-10',now)).toEqual({ since: '2026-10-03T12:00:00.000Z',until: '2026-11-01T00:00:00.000Z',complete: false });
    expect(monthRange('2026-10',new Date('2026-10-31T00:00:00Z')).complete).toBe(false); // not over yet
    expect(monthRange('2026-02',new Date('2026-03-01T06:00:00Z'))).toEqual({ since: '2026-02-01T00:00:00.000Z',until: '2026-03-01T00:00:00.000Z',complete: true });
    expect(() => monthRange('2026-08',now)).toThrow(/no longer keeps/);
    expect(() => monthRange('2026-13',now)).toThrow(/2026-10/);
  });

  it('notes the days our own tests ran against production, and never saves a month twice',() => {
    const tests = [{ release: '2.9.0',kind: 'smoke',from: '2026-10-14T05:39:06Z',to: '2026-10-14T05:39:54Z' },{ release: '2.8.0',kind: 'full',from: '2026-09-01T00:00:00Z',to: '2026-09-01T01:00:00Z' }];
    expect(testDays(tests,'2026-10-01T00:00:00Z','2026-11-01T00:00:00Z')).toEqual(['2026-10-14']);
    const lines = csvLines('2026-10',{ since: '2026-10-01T00:00:00.000Z',until: '2026-11-01T00:00:00.000Z',complete: true },[{ slug: 'tuck-pop',title: 'Tuck Pop',requests: 4,plays: 2 }],['2026-10-14'],true);
    expect(lines).toEqual(['month,from,to,complete,game,requests,approx_plays,production_test_days','2026-10,2026-10-01T00:00:00.000Z,2026-11-01T00:00:00.000Z,yes,tuck-pop,4,2,2026-10-14']);
    expect([...savedMonths(`${lines.join('\n')}\n`)]).toEqual(['2026-10']);
  });
});

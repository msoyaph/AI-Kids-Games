import re, json, sys, urllib.request, html
from html.parser import HTMLParser
BASE = sys.argv[1].rstrip('/')
UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return r.status, dict(r.headers), r.read().decode('utf8','replace')
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read().decode('utf8','replace')
class P(HTMLParser):
    def __init__(s): super().__init__(); s.text=[]; s.skip=0; s.h=[]; s.cur=None; s.links=[]; s.imgs=[]; s.inroot=0; s.depth=0
    def handle_starttag(s,t,a):
        a=dict(a)
        if t in ('script','style','noscript','title'): s.skip+=1
        if t in ('h1','h2','h3'): s.cur=[t,'']
        if t=='a' and a.get('href'): s.links.append(a['href'])
        if t=='img': s.imgs.append(a.get('alt'))
    def handle_endtag(s,t):
        if t in ('script','style','noscript','title'): s.skip-=1
        if s.cur and t==s.cur[0]: s.h.append((s.cur[0],s.cur[1].strip())); s.cur=None
    def handle_data(s,d):
        if s.skip: return
        if s.cur: s.cur[1]+=d
        if d.strip(): s.text.append(d.strip())
sm = get(BASE+'/sitemap.xml')[2]
urls = re.findall(r'<loc>([^<]+)</loc>', sm)
paths = [re.sub(r'^https?://[^/]+','',u) or '/' for u in urls]
extra = ['/play/tuck-pop','/play/theabonk','/favorites','/not-a-real-page']
rows=[]
for path in paths+extra:
    st, hd, body = get(BASE+path)
    m = lambda rx: (re.search(rx, body, re.S) or [None,None])[1]
    p=P(); p.feed(body)
    ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', body, re.S)
    types=[]
    for blk in ld:
        try:
            d=json.loads(blk); g=d.get('@graph',[d]); types += [x.get('@type') for x in g]
        except Exception as e: types.append('INVALID:'+str(e))
    rows.append(dict(path=path,status=st,xrobots=hd.get('x-robots-tag') or hd.get('X-Robots-Tag'),title=html.unescape(m(r'<title>(.*?)</title>') or ''),desc=html.unescape(m(r'<meta name="description" content="([^"]*)"') or ''),canonical=m(r'<link rel="canonical" href="([^"]*)"'),ogurl=m(r'<meta property="og:url" content="([^"]*)"'),ogimg=m(r'<meta property="og:image" content="([^"]*)"'),robots=m(r'<meta name="robots" content="([^"]*)"'),ld=types,headings=p.h,words=len(' '.join(p.text).split()),bodytext=' '.join(p.text)[:160],links=len(p.links),imgs=p.imgs))
json.dump(rows, open('crawl.json','w'), indent=1, ensure_ascii=False)
print(f"{len(urls)} sitemap URLs; sitemap hosts: {sorted(set(re.findall(r'https?://([^/<]+)', sm)))}")
for r in rows: print(f"{r['status']} {r['path']:<28} words={r['words']:<4} h={len(r['headings'])} links={r['links']} ld={r['ld']} robots={r['robots']} canon={r['canonical']}")

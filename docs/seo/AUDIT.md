# SEO and AI-search audit: production, 2026-10-13 (release 2.4.1)

Audited https://ai-kids-games-fawn.vercel.app (the live site) before any fixes.

**Method:**
- [`crawl.py`](crawl.py) fetches every sitemap URL, plus play pages, Favorites and an unknown
  path, the way a crawler does: the raw HTML, with a Googlebot user agent and no JavaScript.
- A Playwright pass loads the same pages with JavaScript. It checks headings, alt text and
  descriptions, and requests every internal and external link.
- DNS, WHOIS and the Vercel CLI check the domain.

## Findings

| Area | Status | Finding |
|---|---|---|
| Domain | ✗ Not connected | `aikids.games` is not registered: the `.games` registry's nameserver answers NXDOMAIN. It is attached to the Vercel project (with `www`), waiting for DNS. Production is `ai-kids-games-fawn.vercel.app`. |
| Canonical, OG, sitemap, robots, llms.txt | ✓ | All point at the live `vercel.app` address (`SITE_ORIGIN`). |
| Links to the unregistered domain | ✗ | README (2 links and a "launching soon" badge), CITATION.cff, SECURITY.md, the game schema `$id`, issue templates and the *List your game* heading name `aikids.games`. The trailer's end card shows it too (baked into the video). |
| Content without JavaScript | ✗ Critical | **Every page has 0 words, 0 headings and 0 links in its HTML.** The shells carry only `<title>`, meta tags and JSON-LD. Crawlers that don't run JavaScript (most AI crawlers, and Bing in part) see empty pages. |
| Unknown URLs | ✗ | `/anything` returns **200** with the home shell and canonical `/` (a soft 404). The cause is a catch-all rewrite in `vercel.json`. |
| Coverage | ✓ | All 7 released games, Tuck Pop included, are in the sitemap (22 URLs), `llms.txt`, the README table and the JSON-LD. Agentmon is not on `main`, so it appears nowhere. |
| Structured data | ◐ | Parses, and WebSite, Organization and VideoGame types are valid. Missing: Organization `sameAs` beyond GitHub, a logo `ImageObject`, ItemList and breadcrumbs, FAQ, and the trailer's VideoObject. |
| Titles | ✓ | Unique on every page. |
| Meta descriptions | ◐ | Game pages run 181–232 characters (search results cut off around 155–160). The 9 category pages share one template. Play pages are 29–54 characters. |
| Headings (rendered) | ◐ | One h1 per page. Game pages' h1 is the logo image (named by its alt text only). |
| Alt text and links (rendered) | ✓ | No image without alt. 32 internal links all return 200; 3 external links all return 200. |
| Robots | ✓ | Production allows `*` plus GPTBot, ClaudeBot, PerplexityBot, Google-Extended and Applebot-Extended, and links the sitemap. Favorites is `noindex`. |
| Previews | ✓ | Preview builds write `noindex` and `Disallow: /`, and previews need Vercel sign-in. |
| Brand spelling | ◐ | "Ai Kids Games" everywhere; the new logo says "AI Kids Games". Two game builds (Cliff Valley and Space Sky) contain "Ai Kids Games" and can't change until their next release. |
| Accuracy | ✗ | *For parents* says "TheaBonk needs a keyboard and mouse or a gamepad". TheaBonk 2.0 plays by touch. |
| FAQ, guides, per-game safety | ✗ | None yet. The *For parents* table has ages and content notes. |
| IndexNow | ✗ | Not set up. |
| Lighthouse (mobile, production) | ✓ | Home 99/100/100/100; details 99/100/100/100; play 91 (exempt)/100/100/100. |

## Plan

1. Prerender every page's real content into its HTML at build time; return real 404s.
2. Typed, tested structured data:
   - Organization with `sameAs` and a founder;
   - WebSite, plus ItemList for the home and category pages;
   - VideoGame and BreadcrumbList for each game;
   - FAQPage, Article and VideoObject.
3. A parent FAQ, three guides, and a manifest-driven *Safety and privacy* section on every game page.
4. One brand spelling: **AI Kids Games**, matching the new logo. The new logo, favicons, OG
   images and metadata come from the owner's artwork.
5. Nothing links to `aikids.games` until it is live. IndexNow gets a key file and a release ping.

## After: this branch (local Vercel-like build, before release)

| Area | Result |
|---|---|
| Content without JavaScript | Every page has its real words, headings and links: home 193 words, game pages 360–432 with 12 headings, FAQ 1,035, guides 612–698. |
| Unknown URLs | 404 with a "not found" page and `noindex`. |
| Structured data | Organization, WebSite, ItemList, CollectionPage, BreadcrumbList, VideoGame, FAQPage, Article and VideoObject, typed with schema-dts and tested. |
| Sitemap | 27 URLs: the FAQ, the guides index and 3 guides are new. |
| Descriptions | 50–160 characters on every page (tested). |
| Domain | Nothing links to `aikids.games`. The live address is one constant plus `SITE_ORIGIN`. |
| Brand | "AI Kids Games" across the site, manifests, llms.txt, README and docs. Exceptions: two game builds (until their next release) and historical logs. |
| IndexNow | Key file served; `npm run indexnow` sends only changed pages after each release. |
| Lighthouse mobile (local) | All 90+ in every category. Home 93/100/100/100; details 96/100/100/100; play 94/100/100/100; Tuck Pop details 96, Tuck Pop play 99, FAQ 99, guide 99, About 96 (all 100/100/100 in the other categories). |

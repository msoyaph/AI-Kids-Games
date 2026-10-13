# Owner's launch checklist: domain, search engines and sharing

What only the owner can do: buying the domain, the DNS records, accounts at Google and Bing, and
posts in public places.

**Checked 2026-10-13** against:
- Vercel's API for this project;
- the official docs and rules pages linked in each step.

Nothing here has been done for you.

## 1. Connect aikids.games

**Where things stand:**
- `aikids.games` is **not registered**: the `.games` registry answers NXDOMAIN and its RDAP returns 404.
- In Vercel it is already added to the project **ai-kids-games** (team **real-tours**):
  - `aikids.games` is set up as the primary domain;
  - `www.aikids.games` already redirects to it with a **308**.
- Only the DNS is missing.

1. **Buy the domain** at any registrar that sells `.games`, for example Porkbun, Gandi or Cloudflare Registrar.
   - Compare **renewal** prices, not first-year prices.
   - `.game` (singular) is a different, pricier TLD.
   - Cloudflare Registrar requires Cloudflare's nameservers, so use the records in step 2 there, not Vercel's nameservers.
2. **Add these DNS records** at the registrar. These are the values Vercel's API gives for this project today; the domain card under Vercel → ai-kids-games → Settings → Domains shows the same values.

   | Name | Type | Value |
   |---|---|---|
   | `@` | A | `216.150.1.1` |
   | `@` | A | `216.150.16.1` |
   | `www` | CNAME | `b958b7994f87b614.vercel-dns-016.com` |

   - Delete any parking or forwarding records for `@` and `www`, and any AAAA record on `@`.
   - If there is a CAA record, it must allow `letsencrypt.org`.
   - On Cloudflare DNS, set both records to **DNS only** (grey cloud).
3. **Wait until Vercel shows Valid Configuration** for both names and a certificate is issued. Check with:
   ```bash
   curl -sI https://aikids.games/ | head -1
   curl -sI 'https://www.aikids.games/games?x=1' | grep -i -E '^HTTP|^location'
   ```
   The second should be a `308` to `https://aikids.games/games?x=1`.
4. **Switch the site to its permanent address.** This is one release, which needs your approval as usual:
   - Vercel → ai-kids-games → Settings → Environment Variables → **Production**: set `SITE_ORIGIN` to `https://aikids.games`.
   - In the repo:
     - Set `PUBLIC_ORIGIN` in `apps/site/src/data/site.ts` to `https://aikids.games`, then run `npm run manifests`, which updates `llms.txt`.
     - Update the live address in `README.md`, `BRAND.md`, `SECURITY.md` and `CITATION.cff` (search for `ai-kids-games-fawn`).
   - **Redirect the old address.** Add this to `apps/site/vercel.json`, so that `ai-kids-games-fawn.vercel.app` permanently redirects to the new domain. Matching the exact host leaves preview deployments alone.
     ```json
     "redirects": [
       {
         "source": "/:path*",
         "has": [{ "type": "host", "value": "ai-kids-games-fawn\\.vercel\\.app" }],
         "destination": "https://aikids.games/:path*",
         "permanent": true
       }
     ]
     ```
   - After the release, check:
     - `curl -sI https://ai-kids-games-fawn.vercel.app/about` returns `308` to `https://aikids.games/about`;
     - `curl -s https://aikids.games/robots.txt` lists `Sitemap: https://aikids.games/sitemap.xml`;
     - page sources show `https://aikids.games` canonicals.
   - On GitHub, set the repo's **Website** (About ⚙︎) to `https://aikids.games`.

## 2. Google Search Console

1. Go to <https://search.google.com/search-console> → **Add property** → **Domain** → `aikids.games` (no `https://`, no `www`).
2. **Verify with DNS:** add the TXT record Google shows, `@ TXT google-site-verification=<token>`, at your registrar, then click **Verify**.
   - The record can take a few hours to appear (up to 2–3 days).
   - Never delete it, or you lose verification.
3. **Sitemaps** → submit `https://aikids.games/sitemap.xml`. Only after step 1.4: the sitemap must list `aikids.games` addresses.
4. **URL Inspection** (search bar at the top) → paste `https://aikids.games/` → **Test live URL** → **Request indexing**. Repeat for:
   - `/games`, `/faq`, `/guides`;
   - each game's page, for example `/game/tuck-pop`.

   Daily limits apply, and indexing usually takes days.
5. **Check the structured data in Google's own tool.** At <https://search.google.com/test/rich-results>, test:
   - `https://aikids.games/game/tuck-pop` (VideoGame and breadcrumbs);
   - `/faq` (FAQ);
   - a guide (Article);
   - `/about` (Video).

   Google shows FAQ rich results only for a few authoritative sites now, so "eligible" there just means valid. The data still helps Bing and AI assistants.
6. **Skip "Change of address".** It needs a domain-level property for the old site, which `*.vercel.app` can't have. The site is two days old, so the permanent redirect from step 1.4 is enough: keep it for at least a year.

Sources:
- [Add a property](https://support.google.com/webmasters/answer/34592)
- [Verification](https://support.google.com/webmasters/answer/9008080)
- [Sitemaps](https://support.google.com/webmasters/answer/7451001)
- [URL Inspection](https://support.google.com/webmasters/answer/9012289)
- [Site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)

## 3. Bing Webmaster Tools and IndexNow

1. Go to <https://www.bing.com/webmasters> → **Add a site**. Use either method:
   - **Import from Google Search Console** (quickest, after section 2). It brings the verification and the sitemap across.
   - **Add your site manually** → `https://aikids.games/` → **Add CNAME record to DNS**. Bing shows the exact name and target (the target is usually `verify.bing.com`). Add it at your registrar, then click **Verify**.
2. **Sitemaps** → **Submit sitemap** → `https://aikids.games/sitemap.xml`.
3. **IndexNow is already set up in the repo.**
   - The key file `apps/site/public/<key>.txt` is served at the site root.
   - After each production release and its checks, run:
     ```bash
     npm run indexnow --workspace apps/site
     ```
   - It sends only the pages whose words changed since the last run.
   - Commit `apps/site/indexnow-state.json` with the release record.
   - Bing shows the submissions under **IndexNow** in Webmaster Tools.
   - IndexNow reaches Bing, Yandex, Seznam, Naver and others. Google doesn't use it, so use section 2 for Google.

Sources:
- [IndexNow documentation](https://www.indexnow.org/documentation)
- [Bing: get started with IndexNow](https://www.bing.com/indexnow/getstarted)

## 4. Sharing it beyond the site

Use the permanent address once section 1 is done. Every place below forbids asking for upvotes.

### Show HN (Hacker News)
- **What qualifies:** something people can try right now, with no sign-up. That fits: 7 free games, no accounts.
- **Title:** `Show HN: AI Kids Games – free browser games for kids, no ads or tracking`. No caps, exclamation marks or hype.
- **Be there to answer:** post when you can reply for a few hours.
- **Write it yourself:** the guidelines ask that posts and comments not be AI-generated or AI-edited, even about AI-built projects. Say how the games were made, what the kid-safety work involved, and what you learned.
- **Don't** ask anyone to upvote or comment.
- Rules: [Show HN](https://news.ycombinator.com/showhn.html) · [HN guidelines](https://news.ycombinator.com/newsguidelines.html)

### Product Hunt
- **Account:** a personal account with a complete profile (real name, photo, headline). It must have been active in the community **for at least a week** before you post.
- **Post it yourself:** makers may post their own product. Use **Submit → New Product**, with no shortened or UTM links.
- **What the listing needs:**
  - **Tagline:** 60 characters max, for example "Free, ad-free browser games for kids. No sign-ups." (50 characters).
  - **Description:** keep it within 260 characters.
  - **Images:** a square 240×240 thumbnail; at least 2 gallery images at 1270×760.
  - **Video:** the YouTube trailer.
  - **Pricing:** Free. Up to 3 topics.
  - **First comment:** say why you built it and ask for feedback.
- **When:** schedule it for **12:01 am Pacific**.
- **Never ask for upvotes**, not even from friends. Posts that do get demoted or removed.
- Rules: [Launch guide](https://www.producthunt.com/launch) · [Upvote rules](https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product)

### itch.io
- **itch.io isn't for kids.** Its terms say it is **not intended for under-13s**, and it has its own accounts, comments and analytics. So make it a page for **parents and makers**, not a place to send kids.
- **Best fit:** one page per game with **Kind of project: HTML** (each game is one self-contained `index.html`, which uploads directly), linking back to the game's page on the site.
  - Mark **Generative AI → Code** (plus anything else AI-made) honestly.
  - Set no price.
  - Upload a cover image.
  - Saves made there are separate from the site's.
- **A page that only links out** probably won't appear in browse or search: itch lists only pages you can play, download or buy.
- **Self-promotion:** only on the **Release Announcements** board, not in other games' comments or jams.
- Rules: [HTML games](https://itch.io/docs/creators/html5) · [Quality guidelines](https://itch.io/docs/creators/quality-guidelines) · [Getting indexed](https://itch.io/docs/creators/getting-indexed)

### GitHub "awesome" lists that fit (checked 2026-10-13)

None of these bans submitting your own project or sets a minimum star count; aviaryan's list needs a popular post on X instead. Read each CONTRIBUTING file before you submit.

| List | How to submit | Fit |
|---|---|---|
| [lappemic/awesome-ai-built-games](https://github.com/lappemic/awesome-ai-built-games) | Issue form (preferred) or PR. Must be mostly AI-built (link the proof: `docs/prompts`) and playable now. Format: `- [Name](url) - One sentence. Built with Claude Code · TypeScript.` Alphabetical, no hype words. Portals go under **Directories**. | Best: the site under Directories, or your strongest 1–2 games |
| [Trilarion/opensourcegames](https://github.com/Trilarion/opensourcegames) (1k★) | One issue per game, or a PR adding `entries/<name>.md` from its template (Home, State, Play, Platform: Web, Code repository, MIT). | Good: one entry per game |
| [201flaviosilva-labs/Open-Source-Games](https://github.com/201flaviosilva-labs/Open-Source-Games) | Issue or PR to the README table `\| Name \| Description \| [GitHub](src) \| [Play](url) \|` under Browser-Based → genre. It has accepted makers' own games. | Good |
| [maxi-w/awesome-ai-generated-games](https://github.com/maxi-w/awesome-ai-generated-games) | Issue form only, one game per issue. Must be playable within 10 s with no account, with a specific "how it was made". | Small, but a good fit |
| [bobeff/open-source-games](https://github.com/bobeff/open-source-games) (15.8k★) | One PR per game, alphabetical: `**[Title](link)** - Short description. [[source]](link)`. Added only if the maintainer finds it interesting. | Long shot, slow |
| [proyecto26/awesome-jsgames](https://github.com/proyecto26/awesome-jsgames) | Open an issue to discuss it before any PR. | Long shot, slow |

Skipped:
- [aviaryan/awesome-ai-games](https://github.com/aviaryan/awesome-ai-games): needs a post on X with about 600 likes.
- [leereilly/games](https://github.com/leereilly/games): archived.

## Could not confirm

- Bing's exact CNAME target (Bing's dialog shows it).
- Product Hunt's description limit: 260 or 500 characters (sources disagree; 260 is safe).
- Whether an itch.io page that only links out ever appears in browse.

# apps/play: the play origin for community games

The `ai-kids-games-play` Vercel project (Root Directory `apps/play`) builds every community game
(`community/<slug>/`) from source with the shared kit and serves each from its own address. That
keeps community games away from the website's origin, where our own games and the site's storage
live.

- **Production:** each approved game is served only on its own host, `aikg-<slug>.vercel.app`.
  `vercel.app` is on the Public Suffix List, so every host is its own site. Every other path and
  host returns 404.
- **Previews:** games by path (`/<slug>/`), behind Vercel sign-in.
- **Headers on every response:** no connections at all (`connect-src 'none'`), nothing from
  outside, and only the website may frame it.

The build (`scripts/build.ts`) writes Vercel's Build Output API (`.vercel/output`), with the routes
and headers from `scripts/routes.ts`; `vercel.json` only names the build command. Production builds
run the website's release guard first, and serve only approved, listed games whose source still
matches the approval. See SUBMITTING.md and MODERATION.md at the repository root.

```bash
npm run build --workspace apps/play     # preview mode locally (every game that isn't unlisted)
npm run serve --workspace apps/play     # http://127.0.0.1:4320/<slug>/
```

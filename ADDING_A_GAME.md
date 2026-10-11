# Adding a game

The catalog is a typed list in `src/data/games.ts`. Every row, category page,
search result, favorite, detail page, and play page reads that list.

## The quickest path

1. Put a self-contained game build in `public/games/<slug>/index.html`.
2. Put its thumbnail/banner in `public/art/`. A single image can fill both roles.
3. Add an entry to `src/data/games.ts`, using the launch games as examples.
4. Run `npm run build`. Missing files, duplicate slugs, and invalid metadata fail
   with a clear error. Rebuild and redeploy after a change.

Use a lowercase slug, such as `star-garden`. All file paths are local.
Keep every required field, including `status`, controls, device support,
parent notes, age guidance, release date, and accent color. Set `featured: true`
to include the game in the rotating hero and Featured row.

## Interactive scaffolding

Run `npm run add-game` from the project folder. Answer the prompts for name,
categories, age guidance, content notes, controls, and devices. The script
creates a coming-soon game, original placeholder SVG, and registry entry.
It refuses to overwrite an existing slug or folder. Replace the placeholder
and change `status` to `Ready to play` or a truthful preview label before launch.

## Review a game before publishing

Use a trusted build with no ads, external scripts, analytics, external requests,
accounts, chat, uploads, or user-generated content. Game saves must stay in
memory; only the catalog may persist favorites and recently played. Do not use
cookies, localStorage, sessionStorage, or IndexedDB in a game. Describe actual
controls and current features, and use a grown-up-reviewed age suggestion.

Keep the restrictive Content-Security-Policy in the launch games' `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
```

All script, CSS, and imagery must be inlined or data URLs. The play iframe uses
`allow-scripts allow-pointer-lock allow-same-origin`, with no pop-up or top-page
navigation permissions. Because scripts and same-origin access are both allowed,
this is suitable only for reviewed, trusted local game builds; do not accept
uploads or untrusted games.

Run `npm test` and `npm run test:e2e` before deployment. Try the real game on its
listed devices and check that no external network requests or persistent saves
appear. The security policy complements this review; it does not replace it.

## Categories

Launch categories are Action, Adventure, and Cozy. For a new category, extend
the `Category` type in `games.ts`, its icon mapping in `Home.tsx`, and the
scaffolder's choices. Rows and category routing otherwise update automatically.

## Artwork and a different host

SVG, PNG, WebP, and JPEG all work. Use a 3:2 image around 900×600 pixels.
Supply useful alt text when adapting the card or hero illustrations to new games.
When changing hosts, update the absolute origin in `index.html` and
`src/lib/meta.ts` and `scripts/generate-route-shells.ts` for Open Graph metadata.
Never load fonts or artwork remotely.

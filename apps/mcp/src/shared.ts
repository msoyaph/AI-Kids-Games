// Shared by the server, the widget and the tests: the widget's address and the build resources'
// addresses. No Node or DOM APIs and no runtime imports, so the widget bundle stays small.

/** One widget for every tool; the tool result says which view to show. Change the version on breaking changes (hosts cache by URI). */
export const WIDGET_URI = 'ui://aikg/widget-v1.html';
export const WIDGET_MIME = 'text/html;profile=mcp-app';
/** A game's verified build, for hosts that let widgets read server resources instead of fetching from the site. */
export const BUILD_URI = (slug: string) => `aikg://games/${slug}/index.html`;
export const BUILD_TEMPLATE = 'aikg://games/{slug}/index.html';

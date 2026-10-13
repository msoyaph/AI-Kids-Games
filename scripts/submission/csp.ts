// The Content Security Policy every community game runs under: in its build (a <meta> tag, as the
// starter adds) and on its hosting origin (apps/play/vercel.json, which adds frame-ancestors).
// Nothing can be loaded or sent: no connections, no outside scripts, styles, fonts, images or frames.
export const GAME_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'";

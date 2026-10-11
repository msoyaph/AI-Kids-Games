import type { Game } from '../data/games';
export function validateRegistry(registry: readonly Game[], fileExists: (path: string) => boolean): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const fields = ['slug','title','tagline','description','ageGuidance','contentNotes','estimatedPlayTime','thumbnail','banner','releaseDate','accentColor','status'] as const;
  for (const game of registry) {
    const label = game.slug || '(unnamed game)';
    for (const field of fields) if (typeof game[field] !== 'string' || !game[field].trim()) errors.push(`${label}: required field "${field}" is missing.`);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(game.slug)) errors.push(`${label}: use a lowercase slug with single hyphens.`);
    if (seen.has(game.slug)) errors.push(`${label}: duplicate slug.`);
    seen.add(game.slug);
    for (const field of ['categories','tags','supportedDevices'] as const) if (!Array.isArray(game[field]) || !game[field].length) errors.push(`${label}: "${field}" must not be empty.`);
    if (!game.controls?.types?.length || !game.controls?.howToPlay?.length) errors.push(`${label}: controls and how-to-play steps are required.`);
    if (!Number.isInteger(game.minAge) || game.minAge < 0 || game.minAge > 18) errors.push(`${label}: minAge must be a whole number from 0 to 18.`);
    if (typeof game.featured !== 'boolean') errors.push(`${label}: featured must be true or false.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game.releaseDate) || Number.isNaN(Date.parse(game.releaseDate))) errors.push(`${label}: releaseDate must be YYYY-MM-DD.`);
    if (!/^#[0-9a-f]{6}$/i.test(game.accentColor)) errors.push(`${label}: accentColor must be a six-digit hex color.`);
    if (!fileExists(`games/${game.slug}/index.html`)) errors.push(`${label}: public/games/${game.slug}/index.html does not exist.`);
    for (const asset of [game.thumbnail,game.banner]) if (!asset?.startsWith('/') || asset.startsWith('//') || !fileExists(asset.slice(1))) errors.push(`${label}: local image "${asset}" does not exist.`);
  }
  return errors;
}

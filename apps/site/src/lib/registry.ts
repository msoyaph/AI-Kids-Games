import type { Game } from '../data/games';
import { temporaryArt } from '../data/temporary-art';
export function validateRegistry(registry: readonly Game[], fileExists: (path: string) => boolean): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const fields = ['slug','title','tagline','description','ageGuidance','contentNotes','estimatedPlayTime','releaseDate','accentColor','status'] as const;
  const motions = ['float','bob','twinkle','drift'];
  for (const game of registry) {
    const label = game.slug || '(unnamed game)';
    for (const field of fields) if (typeof game[field] !== 'string' || !game[field].trim()) errors.push(`${label}: required field "${field}" is missing.`);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(game.slug)) errors.push(`${label}: use a lowercase slug with single hyphens.`);
    if (seen.has(game.slug)) errors.push(`${label}: duplicate slug.`);
    seen.add(game.slug);
    for (const field of ['categories','tags','supportedDevices'] as const) if (!Array.isArray(game[field]) || !game[field].length) errors.push(`${label}: "${field}" must not be empty.`);
    if (!game.controls?.types?.length || !game.controls?.howToPlay?.length) errors.push(`${label}: controls and how-to-play steps are required.`);
    if (!Array.isArray(game.quickStart) || game.quickStart.length < 2 || game.quickStart.length > 4 || game.quickStart.some(step => typeof step !== 'string' || !step.trim())) errors.push(`${label}: quickStart needs 2–4 short steps.`);
    if (!Array.isArray(game.coverLayers) || game.coverLayers.some(motion => !motions.includes(motion))) errors.push(`${label}: coverLayers may only use ${motions.join(', ')}.`);
    if (!Number.isInteger(game.minAge) || game.minAge < 0 || game.minAge > 18) errors.push(`${label}: minAge must be a whole number from 0 to 18.`);
    if (typeof game.featured !== 'boolean') errors.push(`${label}: featured must be true or false.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game.releaseDate) || Number.isNaN(Date.parse(game.releaseDate))) errors.push(`${label}: releaseDate must be YYYY-MM-DD.`);
    if (!/^#[0-9a-f]{6}$/i.test(game.accentColor)) errors.push(`${label}: accentColor must be a six-digit hex color.`);
    if (!fileExists(`games/${game.slug}/index.html`)) errors.push(`${label}: public/games/${game.slug}/index.html does not exist.`);
    const temporary = temporaryArt[game.slug];
    const art = temporary
      // Temporary art (src/data/temporary-art.ts): the game's own screenshots, until it is recaptured.
      ? [`media/${game.slug}/temp/cover.webp`,`media/${game.slug}/logo.svg`,`og/${game.slug}.jpg`,...temporary.shots.flatMap((_,i) => [`media/${game.slug}/temp/shot-${i+1}.jpg`,`media/${game.slug}/temp/shot-${i+1}-thumb.jpg`])]
      : [`media/${game.slug}/cover.svg`,`media/${game.slug}/logo.svg`,...(Array.isArray(game.coverLayers) ? game.coverLayers : []).map(motion => `media/${game.slug}/cover-${motion}.svg`)];
    if (game.status === 'Ready to play' && temporary?.loop) art.push(`media/${game.slug}/loop.mp4`,`media/${game.slug}/loop.webm`,`media/${game.slug}/poster.jpg`,`media/${game.slug}/poster-thumb.jpg`);
    if (game.status === 'Ready to play' && !temporary) art.push(`media/${game.slug}/loop.mp4`,`media/${game.slug}/loop.webm`,`media/${game.slug}/poster.jpg`,`media/${game.slug}/poster-thumb.jpg`,`og/${game.slug}.jpg`);
    for (const asset of art) if (!fileExists(asset)) errors.push(`${label}: public/${asset} does not exist.`);
  }
  return errors;
}

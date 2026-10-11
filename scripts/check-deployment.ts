// Keep the user's production approval gate even if hosting classifies a first deploy incorrectly.
const environment = process.env.VERCEL_ENV;
const previewOnly = process.env.AIKG_PREVIEW_ONLY === '1';
if (previewOnly && environment !== 'preview') {
  throw new Error(`Preview-only deployment refused: Vercel classified this build as ${environment || 'unknown'}. Production requires owner approval.`);
}
if (process.env.VERCEL === '1' && environment === 'production' && process.env.AIKG_ALLOW_PRODUCTION !== 'approved') {
  throw new Error('Production deployment refused: explicit owner approval is required.');
}

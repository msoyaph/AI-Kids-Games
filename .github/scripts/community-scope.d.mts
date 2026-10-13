// Types for community-scope.mjs (used by scripts/review-submission.ts).
export const SLUG: RegExp;
export function scope(files: string[]): { slugs: string[]; problems: string[] };

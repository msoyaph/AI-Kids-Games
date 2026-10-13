// Types for community-scope.mjs (used by scripts/review-submission.ts).
export const SLUG: RegExp;
export function scope(files: string[],options?: { owner?: boolean }): { slugs: string[]; problems: string[] };
export function ownerFields(slug: string,base: object | null,head: object | null,options?: { owner?: boolean }): string[];

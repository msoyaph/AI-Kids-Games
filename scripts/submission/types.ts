// What every submission check reports: pass, fail, warn (for the human review) or skip, with a
// fix for every problem.
import type { CommunityManifest } from '../lib/manifest';

export type Status = 'pass' | 'fail' | 'warn' | 'skip';
export interface Problem { message: string; fix: string; file?: string; line?: number; severity?: 'fail' | 'warn' }
export interface CheckResult { id: string; title: string; status: Status; problems: Problem[]; notes: string[] }
export interface SourceFile { path: string; bytes: number; text: string | null }
export interface Submission {
  slug: string;
  /** community/<slug>/ */
  dir: string;
  /** community/<slug>/.check/ (git-ignored): the build and the report. */
  checkDir: string;
  manifest: CommunityManifest | null;
  files: SourceFile[];
}

/** A check result from its problems: any failure fails it, warnings alone warn. */
export function result(id: string,title: string,problems: Problem[],notes: string[] = []): CheckResult {
  const status = problems.some(problem => (problem.severity ?? 'fail') === 'fail') ? 'fail' : problems.length ? 'warn' : 'pass';
  return { id,title,status,problems,notes };
}
export const skipped = (id: string,title: string,why: string): CheckResult => ({ id,title,status: 'skip',problems: [],notes: [why] });

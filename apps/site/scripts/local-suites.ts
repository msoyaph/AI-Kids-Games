// Browser suites that need a real GPU, so GitHub's runners (software WebGL only) can't run them.
// They run on the release machine with `npm run release:local` (scripts/release-local.ts at the repo
// root), which records the result in DEPLOYMENT.json (localSuites). The production guard
// (check-deployment.ts) refuses a release without a passing record for its version and for exactly
// the game sources it ships. Follow-up: get these suites passing on CI, then remove them here.
export const LOCAL_SUITES = ['space-sky','light-crossing'] as const;

export interface LocalSuiteRun { game: string; version: string; inputsSha256: string; command: string; passed: number; failed: number; flaky: number; skipped: number; ranAt: string }
export interface LocalSuites { release: string; commit: string; suites: LocalSuiteRun[] }

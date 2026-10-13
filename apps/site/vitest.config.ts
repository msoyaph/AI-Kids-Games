import { defineConfig } from 'vitest/config';
// The community games list (src/data/community.generated.ts) is generated, not committed: make it
// before any test imports it.
export default defineConfig({ test: { include: ['tests/*.test.ts'],globalSetup: ['./scripts/generate-community.ts'] } });

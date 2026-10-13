// Runs a community game's unit tests (community/<slug>/tests/unit). check-submission passes --root.
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node',include: ['tests/unit/**/*.test.ts'] } });

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // whole-run simulations; generous so loaded machines / CI runners don't flake
    testTimeout: 30_000,
  },
});

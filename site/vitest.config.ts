/// <reference types="vitest/config" />

import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/obligations/**/*.test.ts',
      'tests/pbt/framework-selection.pbt.test.ts',
    ],
    retry: 0,
    // Nightly CI runs right after a fresh `npm ci` on a loaded machine; cold
    // caches make first-in-file init (Shiki/KaTeX, nested vitest boot) blow
    // the 5s default. Cap workers so subprocess-spawning test files don't
    // stack on every core.
    testTimeout: 30_000,
    maxWorkers: '50%',
  },
});

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
  },
});

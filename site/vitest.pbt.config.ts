/// <reference types="vitest/config" />

import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/pbt/u1/**/*.pbt.test.ts', 'tests/pbt/u2/**/*.pbt.test.ts'],
    setupFiles: ['tests/pbt/u1/setup.ts'],
    fileParallelism: false,
    retry: 0,
  },
});

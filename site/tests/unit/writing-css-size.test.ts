// U2 writing.css size (nfr-design performance-design "writing.css ≤ 3 KiB";
// Code Generation review R-01; loop-back 1 repair, plan Step 13). writing.css
// holds only the rules more than one Writing page shares and /writing's own;
// a rule only one other page uses lives in that page's stylesheet.
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const WRITING_CSS = resolve('src/styles/writing.css');
/** The design target: 3 KiB, unminified, as written. */
const WRITING_CSS_MAX_BYTES = 3072;

describe('writing.css (R-01)', () => {
  test('is 3,072 bytes or less unminified', () => {
    expect(statSync(WRITING_CSS).size).toBeLessThanOrEqual(WRITING_CSS_MAX_BYTES);
  });

  test('carries no rule that only the homepage or only /writing/all uses', () => {
    const css = readFileSync(WRITING_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const selector of ['.week-posts', '.year-header', '.year-group', '.compact-row']) {
      expect(css, selector).not.toContain(selector);
    }
  });
});

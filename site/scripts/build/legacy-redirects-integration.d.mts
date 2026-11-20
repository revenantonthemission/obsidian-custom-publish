import type { AstroIntegration } from 'astro';
import type { RedirectRule } from '../redirect-table.mjs';

export interface RedirectTable {
  readonly version: 1;
  readonly rules: readonly RedirectRule[];
}

/**
 * Writes `<outDir>/_redirects.json` from the built tag pages. Rejects with a
 * coded error (REDIRECT_TARGET_MISSING, REDIRECT_PATH_INVALID, ...) and writes
 * no table when the rules cannot be proven.
 */
export function writeRedirectTable(outDir: string | URL): Promise<RedirectTable>;

export default function legacyRedirectsIntegration(): AstroIntegration;

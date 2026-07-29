import { verificationEvidenceSchema } from '../../../scripts/profile/verification-provider.mjs';

/**
 * The provider owns the contract. This module never restates the 48 required
 * keys — it imports them and derives every key it emits through builders that
 * are checked against the imported set, so a drifted dimension fails loudly
 * here instead of silently producing an evidence record the provider rejects.
 */
export const REQUIRED_MATRIX: readonly string[] =
  verificationEvidenceSchema.browserMatrix;
export const REQUIRED_OBLIGATIONS: readonly string[] =
  verificationEvidenceSchema.browserObligations;
export const REQUIRED_SPEC_FILES: readonly string[] =
  verificationEvidenceSchema.browserSpecFiles;

const REQUIRED_MATRIX_SET = new Set(REQUIRED_MATRIX);

export type ProfileRoute = '/resume' | '/portfolio';
export type ThemeName = 'light' | 'dark';
export type DetailsState = 'closed' | 'all-open';
export type JavaScriptState = 'enabled' | 'disabled';
export type FocusedEngine = 'firefox' | 'webkit';

export const PROFILE_ROUTES: readonly ProfileRoute[] = Object.freeze([
  '/resume',
  '/portfolio',
]);

/**
 * 479/480 and 767/768 straddle the two CSS breakpoints so each boundary is
 * exercised on both sides; 390x844 is a real mobile device profile rather than
 * a synthetic narrow viewport.
 */
export const RESPONSIVE_VIEWPORTS: readonly string[] = Object.freeze([
  '320x800',
  '479x900',
  '480x900',
  '767x1024',
  '768x1024',
  '1440x900',
  '390x844',
]);

export const COMPATIBILITY_VIEWPORTS: readonly string[] = Object.freeze([
  '320x800',
  '1280x800',
]);

export const AXE_VIEWPORTS: readonly string[] = Object.freeze([
  '320x800',
  '1440x900',
]);

export const THEMES: readonly ThemeName[] = Object.freeze(['light', 'dark']);
export const DETAILS_STATES: readonly DetailsState[] = Object.freeze([
  'closed',
  'all-open',
]);
export const JAVASCRIPT_STATES: readonly JavaScriptState[] = Object.freeze([
  'enabled',
  'disabled',
]);
export const PRINT_PAPER_FORMATS: readonly string[] = Object.freeze([
  'A4',
  'Letter',
]);

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export function parseViewport(viewport: string): Viewport {
  const [width, height] = viewport.split('x').map((part) => Number(part));
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new Error(`"${viewport}" is not a WIDTHxHEIGHT viewport.`);
  }
  return Object.freeze({ width, height });
}

function requireMatrixKey(key: string): string {
  if (!REQUIRED_MATRIX_SET.has(key)) {
    throw new Error(
      `"${key}" is not part of the required browser completion matrix.`,
    );
  }
  return key;
}

export function responsiveKey(route: ProfileRoute, viewport: string): string {
  return requireMatrixKey(`responsive|chromium|${route}|${viewport}`);
}

export function compatibilityKey(
  engine: FocusedEngine,
  route: ProfileRoute,
  viewport: string,
  javaScript: JavaScriptState,
): string {
  return requireMatrixKey(
    `compatibility|${engine}|${route}|${viewport}|js-${javaScript}`,
  );
}

export function axeKey(
  route: ProfileRoute,
  viewport: string,
  theme: ThemeName,
  details: DetailsState,
): string {
  return requireMatrixKey(
    `axe|chromium|${route}|${viewport}|${theme}|${details}`,
  );
}

export function printKey(paperFormat: string): string {
  return requireMatrixKey(`print|chromium|/resume|${paperFormat}`);
}

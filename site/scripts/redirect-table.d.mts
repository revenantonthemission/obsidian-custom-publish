export interface RedirectRule {
  readonly from: string;
  readonly to: string;
}

export interface RedirectTableError {
  /** REDIRECT_TABLE_JSON, _VERSION, _SHAPE, _UNREADABLE, or REDIRECT_PATH_INVALID. */
  readonly code: string;
  readonly message: string;
}

export type RedirectValidation =
  | { readonly ok: true; readonly rules: readonly RedirectRule[] }
  | { readonly ok: false; readonly error: RedirectTableError };

export interface RedirectTableState {
  readonly status: 'none' | 'loaded' | 'rejected';
  readonly rules: readonly RedirectRule[];
  readonly error: RedirectTableError | null;
}

export interface RedirectTableIo {
  readFile?(path: string): string;
  stat?(path: string): { mtimeMs: number; size?: number; ino?: number };
  onRead?(state: RedirectTableState): void;
}

export interface RedirectTableHandle {
  current(): RedirectTableState;
}

export const REDIRECT_TABLE_FILE: '_redirects.json';
export const REDIRECT_TABLE_VERSION: 1;
export const HOSTILE_QUERY: RegExp;

/** The first of G1–G8 the path breaks, or null. */
export function checkRedirectPath(path: string): string | null;
export function validateRedirectTable(value: unknown): RedirectValidation;
export function parseRedirectTable(text: string): RedirectValidation;
export function loadRedirectTable(tablePath: string, io?: RedirectTableIo): RedirectTableHandle;
export function matchRedirect(rules: readonly RedirectRule[], decodedPath: string): string | null;
export function redirectLocation(to: string, rawQuery: string | null): string;
export function isHostileQuery(rawQuery: string | null): boolean;
export function isHeaderValueSafe(value: string): boolean;

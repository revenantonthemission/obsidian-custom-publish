/**
 * Appearance model (FR3; interaction-spec.md, "Appearance Model").
 *
 * The site follows the system appearance unless the reader picks light or
 * dark. The choice is one localStorage key, `appearance`; anything missing,
 * unrecognized or unreadable means `auto`. The module is pure: storage and the
 * system preference are passed in, so the island and the tests share it.
 *
 * BaseLayout's inline bootstrap repeats the read and the legacy cleanup in
 * ES5, because it runs before any module is loaded. Keep the two in step.
 */

export type Appearance = 'auto' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export const APPEARANCE_STORAGE_KEY = 'appearance';

/** The cycle order of the appearance button: 자동, 라이트, 다크. */
export const APPEARANCES: readonly Appearance[] = Object.freeze(['auto', 'light', 'dark']);

/**
 * Every key the retired theme system wrote: the bootstrap and ThemeToggle
 * (`theme`, `theme-manual`) and solar.ts (`solar`, `geo`, `geo-denied`).
 * No legacy value carries over; a tab still running the old build can write
 * them again, which is harmless because nothing reads them any more.
 */
export const LEGACY_THEME_KEYS: readonly string[] = Object.freeze([
  'theme',
  'theme-manual',
  'solar',
  'geo',
  'geo-denied',
]);

/** The subset of the Web Storage API the model needs. */
export interface AppearanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const LABELS: Readonly<Record<Appearance, string>> = Object.freeze({
  auto: '화면 모드: 자동',
  light: '화면 모드: 라이트',
  dark: '화면 모드: 다크',
});

export function parseAppearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function nextAppearance(current: Appearance): Appearance {
  const index = APPEARANCES.indexOf(current);
  return APPEARANCES[(index + 1) % APPEARANCES.length]!;
}

/** The accessible name of the appearance button for a mode. */
export function appearanceLabel(appearance: Appearance): string {
  return LABELS[appearance];
}

/** What the polite live region says after the reader switches modes. */
export function appearanceAnnouncement(appearance: Appearance): string {
  return appearance === 'auto' ? `${LABELS.auto} (시스템 설정을 따름)` : LABELS[appearance];
}

/** Blocked or missing storage reads as `auto`, as the model specifies. */
export function readStoredAppearance(storage: AppearanceStorage | null): Appearance {
  if (storage === null) return 'auto';
  try {
    return parseAppearance(storage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

/** Returns false when the choice could not be stored; it then lasts for the current page only. */
export function writeStoredAppearance(
  storage: AppearanceStorage | null,
  appearance: Appearance
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, appearance);
    return true;
  } catch {
    return false;
  }
}

/** Removes every legacy key it can; returns how many removals succeeded. */
export function removeLegacyThemeKeys(storage: AppearanceStorage | null): number {
  if (storage === null) return 0;
  let removed = 0;
  for (const key of LEGACY_THEME_KEYS) {
    try {
      storage.removeItem(key);
      removed += 1;
    } catch {
      // Blocked storage: the bootstrap already treats the page as `auto`.
    }
  }
  return removed;
}

export function resolveScheme(appearance: Appearance, systemPrefersDark: boolean): ColorScheme {
  if (appearance === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return appearance;
}

/** `data-theme` on <html>: set only for an explicit choice, so CSS follows the system otherwise. */
export function themeAttribute(appearance: Appearance): ColorScheme | null {
  return appearance === 'auto' ? null : appearance;
}

/** The page's storage, or null where reading it throws (privacy modes, blocked cookies). */
export function browserStorage(): AppearanceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

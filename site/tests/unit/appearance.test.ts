// FR3 appearance model (interaction-spec.md, "Appearance Model"; C-11). The
// module is pure: storage and the system preference are passed in, so these
// tests use fakes, including a storage whose every call throws.
import { describe, expect, test } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  LEGACY_THEME_KEYS,
  appearanceAnnouncement,
  appearanceLabel,
  nextAppearance,
  parseAppearance,
  readStoredAppearance,
  removeLegacyThemeKeys,
  resolveScheme,
  themeAttribute,
  writeStoredAppearance,
  type AppearanceStorage,
} from '../../src/lib/appearance';

function memoryStorage(
  initial: Record<string, string> = {}
): AppearanceStorage & { snapshot(): Record<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    snapshot: () => Object.fromEntries(values),
  };
}

const blockedStorage: AppearanceStorage = {
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
  removeItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
};

describe('appearance model', () => {
  test('parses the three stored values', () => {
    expect(parseAppearance('auto')).toBe('auto');
    expect(parseAppearance('light')).toBe('light');
    expect(parseAppearance('dark')).toBe('dark');
  });

  test('treats missing, empty and unrecognized values as auto', () => {
    for (const value of [null, undefined, '', 'bogus', 'Dark', ' light', 'system', '1']) {
      expect(parseAppearance(value), String(value)).toBe('auto');
    }
  });

  test('cycles auto, light, dark and back, announcing each mode in Korean', () => {
    expect(nextAppearance('auto')).toBe('light');
    expect(nextAppearance('light')).toBe('dark');
    expect(nextAppearance('dark')).toBe('auto');
    expect(appearanceLabel('auto')).toBe('화면 모드: 자동');
    expect(appearanceLabel('light')).toBe('화면 모드: 라이트');
    expect(appearanceLabel('dark')).toBe('화면 모드: 다크');
    expect(appearanceAnnouncement('light')).toBe('화면 모드: 라이트');
    expect(appearanceAnnouncement('dark')).toBe('화면 모드: 다크');
    expect(appearanceAnnouncement('auto')).toBe('화면 모드: 자동 (시스템 설정을 따름)');
  });

  test('lists exactly the keys the old theme system wrote', () => {
    expect([...LEGACY_THEME_KEYS]).toEqual(['theme', 'theme-manual', 'solar', 'geo', 'geo-denied']);
    expect(LEGACY_THEME_KEYS).not.toContain(APPEARANCE_STORAGE_KEY);
    expect(Object.isFrozen(LEGACY_THEME_KEYS)).toBe(true);
  });

  test('reads and writes the stored choice, and falls back to auto when storage is blocked', () => {
    const storage = memoryStorage({ appearance: 'dark' });
    expect(readStoredAppearance(storage)).toBe('dark');
    expect(writeStoredAppearance(storage, 'light')).toBe(true);
    expect(storage.snapshot()).toEqual({ appearance: 'light' });
    expect(readStoredAppearance(blockedStorage)).toBe('auto');
    expect(readStoredAppearance(null)).toBe('auto');
    expect(writeStoredAppearance(blockedStorage, 'dark')).toBe(false);
    expect(writeStoredAppearance(null, 'dark')).toBe(false);
  });

  test('removes every legacy key and keeps the new choice, even when storage throws', () => {
    const storage = memoryStorage({
      theme: 'dark',
      'theme-manual': '2026-10-20T00:00:00.000Z',
      solar: '{"date":"2026-10-20"}',
      geo: '{"lat":37.5,"lng":127}',
      'geo-denied': '1',
      appearance: 'light',
      unrelated: 'kept',
    });
    removeLegacyThemeKeys(storage);
    expect(storage.snapshot()).toEqual({ appearance: 'light', unrelated: 'kept' });
    expect(() => removeLegacyThemeKeys(blockedStorage)).not.toThrow();
    expect(() => removeLegacyThemeKeys(null)).not.toThrow();
  });

  test('auto follows the system preference; light and dark override it', () => {
    expect(resolveScheme('auto', true)).toBe('dark');
    expect(resolveScheme('auto', false)).toBe('light');
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
    expect(themeAttribute('auto')).toBeNull();
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});

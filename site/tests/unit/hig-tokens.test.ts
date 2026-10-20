// C-02 and C-03 (accessibility-checklist.md): contrast of the HIG token layer,
// recomputed from site/src/styles/tokens.css on every run so a token edit that
// breaks a pair fails here, before any browser check. Includes the mockups
// review fixes R-01 (code panel) and R-02 (non-text on the regular glass bar).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const SITE_ROOT = resolve(import.meta.dirname, '..', '..');
const TOKENS_PATH = resolve(SITE_ROOT, 'src', 'styles', 'tokens.css');
const THEME_PATHS = {
  light: resolve(SITE_ROOT, 'src', 'lib', 'shiki-themes', 'xcode-light.json'),
  dark: resolve(SITE_ROOT, 'src', 'lib', 'shiki-themes', 'xcode-dark.json'),
} as const;

type Scheme = 'light' | 'dark';
type Rgba = readonly [number, number, number, number];

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;
const HUES = ['blue', 'green', 'orange', 'red', 'purple', 'gray'] as const;

/** Every color token design-system-mapping.md defines, plus the review fixes. */
const COLOR_TOKENS = [
  '--c-bg', '--c-bg-grouped', '--c-surface', '--c-surface-2', '--c-code-bg',
  '--c-text', '--c-text-secondary', '--c-text-tertiary', '--c-separator',
  '--c-control-border', '--c-fill', '--c-tint', '--c-tint-hover', '--c-tint-fill',
  '--c-on-tint', '--c-scrim', '--c-glass-regular', '--c-glass-thick',
  '--c-bar-focus-ring', '--c-bar-indicator',
  ...HUES.flatMap((hue) => [`--c-${hue}`, `--c-${hue}-text`]),
] as const;

/** Non-color tokens: type, spacing, radius, elevation, layout and motion. */
const SCALE_TOKENS = [
  '--glass-blur', '--c-glass-edge', '--shadow-float', '--c-callout-mix',
  '--font-body', '--font-code',
  '--text-large-title', '--text-title-1', '--text-title-2', '--text-title-3',
  '--text-headline', '--text-body', '--text-callout', '--text-subheadline',
  '--text-footnote', '--text-caption',
  '--space-1', '--space-2', '--space-3', '--space-4', '--space-5',
  '--space-6', '--space-8', '--space-10', '--space-12', '--space-16',
  '--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-capsule',
  '--max-reading', '--outline-width',
  '--dur-fast', '--dur-normal', '--dur-slow', '--ease-standard', '--ease-spring',
] as const;

function readBlock(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) throw new Error(`tokens.css has no block opened by ${opener}`);
  let depth = 0;
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(css.indexOf('{', start) + 1, index);
    }
  }
  throw new Error(`tokens.css block ${opener} is not closed`);
}

function declarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1]!, match[2]!.trim().replace(/\s+/g, ' '));
  }
  return map;
}

function loadTokens(): { light: Map<string, string>; dark: Map<string, string>; darkByAttribute: Map<string, string> } {
  const css = readFileSync(TOKENS_PATH, 'utf8');
  const light = declarations(readBlock(css, ':root {'));
  const mediaBlock = readBlock(css, '@media (prefers-color-scheme: dark)');
  const darkBySystem = declarations(readBlock(mediaBlock, ':root:not([data-theme="light"]) {'));
  const darkByAttribute = declarations(readBlock(css, ':root[data-theme="dark"] {'));
  return {
    light,
    dark: new Map([...light, ...darkBySystem]),
    darkByAttribute: new Map([...light, ...darkByAttribute]),
  };
}

function resolveValue(tokens: Map<string, string>, name: string, seen = new Set<string>()): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`${name} is not defined`);
  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (reference === null) return value;
  if (seen.has(name)) throw new Error(`${name} refers to itself`);
  return resolveValue(tokens, reference[1]!, new Set([...seen, name]));
}

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex !== null) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((d) => d + d).join('') : hex[1]!;
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)).concat(1) as unknown as Rgba;
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (rgba !== null) {
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  }
  throw new Error(`"${value}" is not a hex or rgba() color`);
}

function color(tokens: Map<string, string>, name: string): Rgba {
  return parseColor(resolveValue(tokens, name));
}

/** Source-over compositing in sRGB, the method the design's evidence used. */
function composite(top: Rgba, backdrop: Rgba): Rgba {
  const alpha = top[3];
  return [0, 1, 2].map((channel) => top[channel]! * alpha + backdrop[channel]! * (1 - alpha)).concat(1) as unknown as Rgba;
}

function luminance([r, g, b]: Rgba): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(foreground: Rgba, background: Rgba): number {
  const opaque = foreground[3] < 1 ? composite(foreground, background) : foreground;
  const [lighter, darker] = [luminance(opaque), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

function failures(pairs: readonly { label: string; ratio: number; minimum: number }[]): string[] {
  return pairs
    .filter(({ ratio, minimum }) => ratio < minimum)
    .map(({ label, ratio, minimum }) => `${label}: ${ratio.toFixed(2)} < ${minimum}`);
}

const SCHEMES: readonly Scheme[] = ['light', 'dark'];
const BLACK: Rgba = [0, 0, 0, 1];
const WHITE: Rgba = [255, 255, 255, 1];
/** The backdrop that scrolls under glass can be anything; the worst case is the opposite extreme. */
const WORST_BACKDROP: Record<Scheme, Rgba> = { light: BLACK, dark: WHITE };

describe('HIG token layer (tokens.css)', () => {
  const tokens = loadTokens();
  const byScheme: Record<Scheme, Map<string, string>> = { light: tokens.light, dark: tokens.dark };

  test('defines every design-system token, and both dark blocks agree', () => {
    const missing = [...COLOR_TOKENS, ...SCALE_TOKENS].filter((name) => !tokens.light.has(name));
    expect(missing).toEqual([]);
    for (const name of COLOR_TOKENS) {
      expect(() => color(tokens.dark, name), name).not.toThrow();
      expect(resolveValue(tokens.darkByAttribute, name), `${name} differs between the two dark blocks`).toBe(
        resolveValue(tokens.dark, name),
      );
    }
  });

  test('opaque text pairs reach 4.5:1 in both appearances (C-02)', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const map = byScheme[scheme];
      const grounds = ['--c-bg', '--c-bg-grouped', '--c-surface', '--c-surface-2'];
      const texts = ['--c-text', '--c-text-secondary', '--c-tint', '--c-tint-hover'];
      return [
        ...texts.flatMap((text) =>
          grounds.map((ground) => ({
            label: `${scheme} ${text} on ${ground}`,
            ratio: contrast(color(map, text), color(map, ground)),
            minimum: TEXT_MIN,
          })),
        ),
        {
          label: `${scheme} --c-on-tint on --c-tint-fill`,
          ratio: contrast(color(map, '--c-on-tint'), color(map, '--c-tint-fill')),
          minimum: TEXT_MIN,
        },
      ];
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('control boundaries and the focus ring reach 3:1 against every ground (C-02)', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const map = byScheme[scheme];
      return ['--c-bg', '--c-bg-grouped', '--c-surface', '--c-surface-2'].flatMap((ground) =>
        ['--c-control-border', '--c-tint'].map((token) => ({
          label: `${scheme} ${token} against ${ground}`,
          ratio: contrast(color(map, token), color(map, ground)),
          minimum: NON_TEXT_MIN,
        })),
      );
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('callout titles reach 4.5:1 on their tinted fill and graph nodes 3:1 on the page', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const map = byScheme[scheme];
      const mix = Number.parseFloat(resolveValue(map, '--c-callout-mix')) / 100;
      return HUES.flatMap((hue) => {
        const base = color(map, `--c-${hue}`);
        const text = color(map, `--c-${hue}-text`);
        const page = color(map, '--c-bg');
        const fill = composite([base[0], base[1], base[2], mix], page);
        // Light graph nodes use the text variant, dark ones the base (design-system-mapping.md).
        const node = scheme === 'light' ? text : base;
        return [
          { label: `${scheme} ${hue} callout title on fill`, ratio: contrast(text, fill), minimum: TEXT_MIN },
          { label: `${scheme} ${hue} graph node on page`, ratio: contrast(node, page), minimum: NON_TEXT_MIN },
        ];
      });
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('regular glass carries primary text at 4.5:1 over the worst-case backdrop (C-03)', () => {
    const pairs = SCHEMES.map((scheme) => {
      const map = byScheme[scheme];
      const surface = composite(color(map, '--c-glass-regular'), WORST_BACKDROP[scheme]);
      return {
        label: `${scheme} --c-text on regular glass`,
        ratio: contrast(color(map, '--c-text'), surface),
        minimum: TEXT_MIN,
      };
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('thick glass carries every text token at 4.5:1 over the worst-case backdrop (C-03)', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const map = byScheme[scheme];
      const surface = composite(color(map, '--c-glass-thick'), WORST_BACKDROP[scheme]);
      return ['--c-text', '--c-text-secondary', '--c-tint'].map((text) => ({
        label: `${scheme} ${text} on thick glass`,
        ratio: contrast(color(map, text), surface),
        minimum: TEXT_MIN,
      }));
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('the focus ring and current-item indicator on the regular glass bar reach 3:1 (R-02)', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const map = byScheme[scheme];
      const surface = composite(color(map, '--c-glass-regular'), WORST_BACKDROP[scheme]);
      return ['--c-bar-focus-ring', '--c-bar-indicator'].map((token) => ({
        label: `${scheme} ${token} on regular glass`,
        ratio: contrast(color(map, token), surface),
        minimum: NON_TEXT_MIN,
      }));
    });
    expect(failures(pairs)).toEqual([]);
  });

  test('every Xcode-style syntax color reaches 4.5:1 on the code panel token (R-01)', () => {
    const pairs = SCHEMES.flatMap((scheme) => {
      const theme = JSON.parse(readFileSync(THEME_PATHS[scheme], 'utf8')) as {
        type: string;
        colors: Record<string, string>;
        tokenColors: { scope?: string | string[]; settings: { foreground?: string } }[];
      };
      expect(theme.type).toBe(scheme);
      const panel = color(byScheme[scheme], '--c-code-bg');
      expect(parseColor(theme.colors['editor.background']!.toLowerCase())).toEqual(panel);
      const foregrounds = [
        { label: 'editor.foreground', value: theme.colors['editor.foreground']! },
        ...theme.tokenColors.flatMap((rule) =>
          rule.settings.foreground === undefined
            ? []
            : [{ label: String(rule.scope), value: rule.settings.foreground }],
        ),
      ];
      expect(foregrounds.length).toBeGreaterThan(10);
      return foregrounds.map(({ label, value }) => ({
        label: `${scheme} ${label}`,
        ratio: contrast(parseColor(value.toLowerCase()), panel),
        minimum: TEXT_MIN,
      }));
    });
    expect(failures(pairs)).toEqual([]);
  });
});

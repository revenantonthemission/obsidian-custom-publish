// FR2.2 and NFR4 over the built output: every file a built stylesheet points
// at must exist, so the self-hosted Pretendard really loads. An unresolved
// url() still builds, and the metric-matched fallback hides it on screen, so
// only the output shows the gap; the résumé PDF renderer's font check is what
// first caught it. Like hig-built-html.test.ts, this builds the site into its
// own temporary directory and never depends on site/dist.
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildSiteInto } from './support/astro-build.js';

const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const FONT_FACE_PATTERN = /@font-face\s*{[^}]*}/g;
const PRELOAD_PATTERN = /<link\b[^>]*\brel="preload"[^>]*>/g;

interface Stylesheet {
  readonly file: string;
  readonly css: string;
}

async function filesUnder(directory: string, extension: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath, entry.name));
}

async function isFile(path: string): Promise<boolean> {
  return stat(path).then(
    (found) => found.isFile(),
    () => false
  );
}

/** The site path a url() in `stylesheet` asks for, or null for data: and remote urls. */
function sitePath(outputRoot: string, stylesheet: string, target: string): string | null {
  if (/^(data:|[a-z]+:\/\/|#)/i.test(target)) return null;
  const path = target.split(/[?#]/)[0]!;
  const absolute = path.startsWith('/') ? join(outputRoot, path) : join(dirname(stylesheet), path);
  return `/${relative(outputRoot, absolute)}`;
}

describe('built assets: what the stylesheets load exists', () => {
  let outputRoot = '';
  let stylesheets: Stylesheet[] = [];
  let html: string[] = [];

  beforeAll(async () => {
    outputRoot = await mkdtemp(join(tmpdir(), 'obsidian-hig-assets-'));
    const result = await buildSiteInto(outputRoot);
    if (result.status !== 0 || result.error !== undefined) {
      throw new Error(
        [
          'The isolated Astro build failed.',
          result.error?.message ?? '',
          result.stdout,
          result.stderr,
        ].join('\n')
      );
    }
    stylesheets = await Promise.all(
      (await filesUnder(outputRoot, '.css')).map(async (file) => ({
        file,
        css: await readFile(file, 'utf8'),
      }))
    );
    html = await Promise.all(
      (await filesUnder(outputRoot, '.html')).map((file) => readFile(file, 'utf8'))
    );
  }, 75_000);

  afterAll(async () => {
    if (outputRoot !== '') await rm(outputRoot, { force: true, recursive: true });
  });

  test('every url() in the built CSS points at a file the build emitted', async () => {
    expect(stylesheets.length).toBeGreaterThan(0);
    const missing = new Set<string>();
    for (const { file, css } of stylesheets) {
      for (const [, , target] of css.matchAll(URL_PATTERN)) {
        const path = sitePath(outputRoot, file, target!);
        if (path !== null && !(await isFile(join(outputRoot, path)))) {
          missing.add(`${relative(outputRoot, file)} -> ${target}`);
        }
      }
    }
    expect({ missing: missing.size, first: [...missing].slice(0, 3) }).toEqual({
      missing: 0,
      first: [],
    });
  });

  test('every Pretendard subset is self-hosted, and the preloads are files the faces use (FR2.2, R-10)', () => {
    const faces = stylesheets.flatMap(({ file, css }) =>
      [...css.matchAll(FONT_FACE_PATTERN)]
        .map(([rule]) => rule)
        .filter((rule) => rule.includes('RVNNT Profile'))
        .map((rule) => ({ file, rule }))
    );
    expect(faces).toHaveLength(92);

    const faceFiles = new Set(
      faces.flatMap(({ file, rule }) =>
        [...rule.matchAll(URL_PATTERN)].map(([, , target]) => sitePath(outputRoot, file, target!))
      )
    );
    const preloads = new Set(
      html.flatMap((page) =>
        [...page.matchAll(PRELOAD_PATTERN)]
          .map(([link]) => link)
          .filter((link) => link.includes('as="font"'))
          .map((link) => /\bhref="([^"]+)"/.exec(link)?.[1] ?? '')
      )
    );
    expect(preloads.size).toBe(2);
    expect([...preloads].filter((href) => !faceFiles.has(href))).toEqual([]);
  });
});

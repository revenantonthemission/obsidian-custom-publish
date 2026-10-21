// C-12 and C-13 (accessibility-checklist.md) over the built HTML, plus the
// static half of FR5.9 and FR5.10. Like profile-presentation.test.ts, it builds
// the site into its own temporary directory, so it never depends on site/dist
// and runs wherever test:unit runs (including the Jenkins Verify stage).
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { Element, Root, RootContent } from 'hast';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildSiteInto } from './support/astro-build.js';

const HANGUL = /[가-힣]/;

interface Page {
  readonly route: string;
  readonly tree: Root;
}

interface Found {
  readonly node: Element;
  readonly ancestors: readonly Element[];
}

function findAll(
  tree: Root,
  predicate: (node: Element, ancestors: readonly Element[]) => boolean
): Found[] {
  const found: Found[] = [];
  const walk = (children: readonly RootContent[], ancestors: readonly Element[]): void => {
    for (const child of children) {
      if (child.type !== 'element') continue;
      if (predicate(child, ancestors)) found.push({ node: child, ancestors });
      walk(child.children, [...ancestors, child]);
      if (child.content) walk(child.content.children, [...ancestors, child]);
    }
  };
  walk(tree.children, []);
  return found;
}

function attribute(node: Element, name: string): string | undefined {
  const value = node.properties[name];
  if (value === undefined || value === null || value === false) return undefined;
  return Array.isArray(value) ? value.join(' ') : String(value);
}

function hasClass(node: Element, name: string): boolean {
  const value = node.properties.className;
  return Array.isArray(value) && value.map(String).includes(name);
}

function text(node: Element | RootContent): string {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element') return '';
  return node.children.map(text).join('');
}

function byClass(tree: Root, tag: string, className: string): Found[] {
  return findAll(tree, (node) => node.tagName === tag && hasClass(node, className));
}

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('built HTML: Korean names and hidden decoration', () => {
  let outputRoot = '';
  let pages: Page[] = [];

  beforeAll(async () => {
    outputRoot = await mkdtemp(join(tmpdir(), 'obsidian-hig-output-'));
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
    const parser = unified().use(rehypeParse);
    pages = await Promise.all(
      (await htmlFiles(outputRoot)).map(async (file) => ({
        route: `/${relative(outputRoot, file)}`,
        tree: parser.parse(await readFile(file, 'utf8')) as Root,
      }))
    );
  }, 75_000);

  afterAll(async () => {
    if (outputRoot !== '') await rm(outputRoot, { force: true, recursive: true });
  });

  test('every aria-label on every built route is Korean (C-12)', () => {
    expect(pages.length).toBeGreaterThan(20);
    const english = pages.flatMap(({ route, tree }) =>
      findAll(tree, (node) => attribute(node, 'ariaLabel') !== undefined)
        .map(({ node }) => attribute(node, 'ariaLabel')!)
        .filter((label) => !HANGUL.test(label))
        .map((label) => `${route}: "${label}"`)
    );
    expect([...new Set(english)]).toEqual([]);
  });

  test('every route renders each chrome control once, with its Korean name (C-12, FR5.5)', () => {
    for (const { route, tree } of pages) {
      const search = findAll(
        tree,
        (node) => node.tagName === 'button' && hasClass(node, 'search-trigger')
      );
      expect(
        search.map(({ node }) => attribute(node, 'ariaLabel')),
        route
      ).toEqual(['검색 열기']);
      const appearance = byClass(tree, 'button', 'appearance-toggle');
      expect(appearance, route).toHaveLength(1);
      expect(text(appearance[0]!.node), route).toBe(
        '화면 모드: 자동화면 모드: 라이트화면 모드: 다크'
      );
      const menu = byClass(tree, 'summary', 'mobile-nav-toggle');
      expect(
        menu.map(({ node }) => attribute(node, 'ariaLabel')),
        route
      ).toEqual(['주요 탐색 메뉴']);
      const top = byClass(tree, 'button', 'back-to-top');
      expect(
        top.map(({ node }) => attribute(node, 'ariaLabel')),
        route
      ).toEqual(['맨 위로']);
      const skip = byClass(tree, 'a', 'skip-link');
      expect(
        skip.map(({ node }) => text(node).trim()),
        route
      ).toEqual(['본문으로 건너뛰기']);
    }
  });

  test('every inline svg without a title is hidden from assistive technology (C-13)', () => {
    // A named image (role="img" with an accessible name, like the graph) is
    // content, not decoration; every other svg needs a <title> or aria-hidden.
    const isNamedImage = (node: Element): boolean =>
      attribute(node, 'role') === 'img' &&
      (attribute(node, 'ariaLabel') ?? attribute(node, 'ariaLabelledBy') ?? '').trim() !== '';
    // aria-hidden hides the whole subtree: KaTeX draws stretchy symbols as svg
    // inside `.katex-html[aria-hidden="true"]` and exposes the MathML copy.
    const isHidden = (node: Element, ancestors: readonly Element[]): boolean =>
      [...ancestors, node].some((element) => attribute(element, 'ariaHidden') === 'true');
    const exposed = pages.flatMap(({ route, tree }) =>
      findAll(
        tree,
        (node, ancestors) =>
          node.tagName === 'svg' &&
          !isNamedImage(node) &&
          !node.children.some((child) => child.type === 'element' && child.tagName === 'title') &&
          !isHidden(node, ancestors)
      ).map(({ ancestors }) => {
        const parent = ancestors.at(-1);
        return `${route}: svg in ${parent?.tagName ?? 'root'}.${String(parent?.properties.className ?? '')}`;
      })
    );
    expect([...new Set(exposed)]).toEqual([]);
  });

  test('the shortcut hint offers ⌘K on Apple platforms and Ctrl K elsewhere (C-13, FR5.9)', () => {
    for (const { route, tree } of pages) {
      const hints = findAll(
        tree,
        (node) => node.tagName === 'kbd' && hasClass(node, 'search-shortcut')
      );
      expect(hints, route).toHaveLength(1);
      const variants = findAll(
        { type: 'root', children: [hints[0]!.node] },
        (node) => attribute(node, 'dataPlatformOnly') !== undefined
      ).map(({ node }) => [attribute(node, 'dataPlatformOnly'), text(node).trim()]);
      expect(variants, route).toEqual([
        ['apple', '⌘K'],
        ['other', 'Ctrl K'],
      ]);
      const bootstrap = findAll(
        tree,
        (node) => node.tagName === 'script' && text(node).includes('data-appearance')
      );
      expect(bootstrap, route).toHaveLength(1);
      expect(text(bootstrap[0]!.node), route).toContain('data-platform');
    }
  });

  test('reading progress moves by transform once per frame and back to top respects reduced motion (FR5.10)', () => {
    for (const { route, tree } of pages) {
      const progress = byClass(tree, 'div', 'reading-progress');
      expect(
        progress.map(({ node }) => attribute(node, 'ariaHidden')),
        route
      ).toEqual(['true']);
      const scroll = findAll(
        tree,
        (node) => node.tagName === 'script' && text(node).includes('back-to-top')
      );
      expect(scroll, route).toHaveLength(1);
      const source = text(scroll[0]!.node);
      expect(source, route).toContain('requestAnimationFrame');
      expect(source, route).toContain('scaleX');
      expect(source, route).toContain('prefers-reduced-motion');
      expect(source, route).not.toMatch(/\.style\.width/);
    }
  });

  test('chrome icons are svg icons, never text glyphs (FR5.9)', () => {
    for (const { route, tree } of pages) {
      const chrome = [
        ...byClass(tree, 'button', 'back-to-top'),
        ...byClass(tree, 'summary', 'mobile-nav-toggle'),
        ...byClass(tree, 'button', 'search-trigger'),
      ];
      for (const { node } of chrome) {
        expect(
          findAll({ type: 'root', children: [node] }, (child) => child.tagName === 'svg').length,
          route
        ).toBeGreaterThan(0);
        expect(text(node), route).not.toMatch(/[↑▶→↘]/);
      }
    }
  });
});

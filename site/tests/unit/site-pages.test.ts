import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { getAllSitePages, getSitePageContent, getSitePageMeta } from '../../src/lib/data.js';

let contentDir: string | null = null;

function fixtureContent(pages: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'site-pages-'));
  mkdirSync(join(dir, 'pages'), { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(pages));
  return dir;
}

afterEach(() => {
  if (contentDir) rmSync(contentDir, { recursive: true, force: true });
  contentDir = null;
});

describe('site pages data', () => {
  test('lists only pages named in the manifest', () => {
    contentDir = fixtureContent(['pages/about.json', 'pages/about.md', 'pages/contact.json']);
    writeFileSync(
      join(contentDir, 'pages', 'about.json'),
      JSON.stringify({ slug: 'about', title: 'About' })
    );
    writeFileSync(join(contentDir, 'pages', 'about.md'), '# About');
    writeFileSync(
      join(contentDir, 'pages', 'contact.json'),
      JSON.stringify({ slug: 'contact', title: 'Contact' })
    );

    expect(getAllSitePages(contentDir).map((p) => p.slug)).toEqual(['about', 'contact']);
  });

  test('reads meta and body by slug', () => {
    contentDir = fixtureContent(['pages/about.json', 'pages/about.md']);
    writeFileSync(
      join(contentDir, 'pages', 'about.json'),
      JSON.stringify({ slug: 'about', title: 'About' })
    );
    writeFileSync(join(contentDir, 'pages', 'about.md'), '# About');

    expect(getSitePageMeta('about', contentDir)).toEqual({ slug: 'about', title: 'About' });
    expect(getSitePageContent('about', contentDir)).toBe('# About');
  });

  test('returns null and empty content for a missing page', () => {
    contentDir = fixtureContent([]);
    expect(getSitePageMeta('missing', contentDir)).toBeNull();
    expect(getSitePageContent('missing', contentDir)).toBe('');
  });

  test('fails closed when the manifest lists a page that is not on disk', () => {
    contentDir = fixtureContent(['pages/about.json']);
    expect(() => getAllSitePages(contentDir!)).toThrow(/^WR001/);
  });
});

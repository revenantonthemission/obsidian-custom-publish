import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getResumeDocumentLink } from '../../src/lib/profile/document-boundary.js';
import {
  buildPortfolioPresentation,
  buildResumePresentation,
} from '../../src/components/profile/presentation.js';
import {
  selectPortfolioProfile,
  selectResumeProfile,
} from '../../src/lib/profile/selectors.js';
import type { ProfileData, ValidatedProfile } from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

const ROOT = process.cwd();
const ASTRO_CLI = resolve(ROOT, 'node_modules/astro/bin/astro.mjs');
const PRIMARY_NAVIGATION = ['/tags', '/graph', '/resume', '/portfolio'];
const CASE_STUDY_DIMENSIONS = [
  'problem',
  'role',
  'keyDecisions',
  'architecture',
  'outcomes',
  'lessons',
] as const;

describe('renderer-neutral profile presentation', () => {
  test('builds the fixed résumé hierarchy, typed blocks and static actions', () => {
    const presentation = buildResumePresentation(
      selectResumeProfile(validSource()),
      getResumeDocumentLink(),
    );

    expect(presentation.shell.identity).toEqual({
      route: 'resume',
      pathname: '/resume',
      label: 'Résumé',
    });
    expect(presentation.shell.navigation.map(({ href, current }) => [href, current]))
      .toEqual([
        ['/', false],
        ['/resume', true],
        ['/portfolio', false],
      ]);
    expect(presentation.sections.map(({ kind }) => kind)).toEqual([
      'intro',
      'skills',
      'highlights',
      'projects',
    ]);

    const intro = presentation.sections[0];
    const highlights = presentation.sections[2];
    expect(intro?.kind).toBe('intro');
    expect(highlights?.kind).toBe('highlights');
    if (intro?.kind !== 'intro' || highlights?.kind !== 'highlights') {
      throw new Error('expected fixture presentation sections');
    }

    expect(intro.details[0]).toMatchObject({
      tag: 'paragraph',
      text: {
        factId: 'narrative-detailed-intro',
      },
    });
    expect(intro.actions).toEqual([
      expect.objectContaining({
        id: 'email',
        kind: 'email',
        href: 'mailto:tester@example.com',
      }),
      expect.objectContaining({
        id: 'github',
        kind: 'github',
        href: 'https://github.com/example-user',
      }),
      expect.objectContaining({
        id: 'resume-document',
        kind: 'document',
        href: '/resume.pdf',
      }),
    ]);
    expect(highlights.groups).toHaveLength(1);
    expect(highlights.groups[0]?.entries[0]).toMatchObject({
      kind: 'career',
      id: 'example-company',
      initiallyOpen: false,
      details: [
        {
          tag: 'list',
          style: 'unordered',
          items: [
            {
              factId: 'experience-detail-one',
            },
          ],
        },
      ],
    });
  });

  test('omits absent optionals and preserves all portfolio dimensions without markup or client state fields', () => {
    const source = validSource();
    const resume = buildResumePresentation(
      selectResumeProfile(source),
      getResumeDocumentLink(),
    );
    const portfolio = buildPortfolioPresentation(selectPortfolioProfile(source));

    expect(resume.sections.map(({ kind }) => kind)).not.toContain('education');
    expect(resume.sections.map(({ kind }) => kind)).not.toContain('certifications');
    expect(portfolio.sections.map(({ kind }) => kind)).toEqual([
      'intro',
      'projects',
    ]);

    const projects = portfolio.sections[1];
    expect(projects?.kind).toBe('projects');
    if (projects?.kind !== 'projects') {
      throw new Error('expected portfolio project section');
    }
    expect(projects.projects.map(({ id }) => id)).toEqual([
      'project-beta',
      'project-gamma',
      'project-alpha',
    ]);
    expect(
      projects.projects.map((project) =>
        project.dimensions.map(({ key }) => key),
      ),
    ).toEqual([
      CASE_STUDY_DIMENSIONS,
      CASE_STUDY_DIMENSIONS,
      CASE_STUDY_DIMENSIONS,
    ]);

    const serialized = JSON.stringify({ resume, portfolio });
    expect(serialized).not.toMatch(
      /(?:rawHtml|html|markdown|clientState|hydration|tab|modal|carousel)/i,
    );
    expect(serialized).not.toContain('<script');
  });
});

describe('production Astro profile output', () => {
  let outputRoot = '';
  let resumeHtml = '';
  let portfolioHtml = '';
  let searchIndex: unknown;
  let navTree: unknown;

  beforeAll(async () => {
    outputRoot = await mkdtemp(join(tmpdir(), 'obsidian-profile-output-'));
    const result = spawnSync(
      process.execPath,
      [ASTRO_CLI, 'build', '--outDir', outputRoot],
      {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60_000,
      },
    );

    if (result.status !== 0 || result.error !== undefined) {
      throw new Error(
        [
          'The isolated Astro profile build failed.',
          result.error?.message ?? '',
          result.stdout,
          result.stderr,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    const [searchIndexText, navTreeText, resume, portfolio] = await Promise.all([
      readFile(join(outputRoot, 'search-index.json'), 'utf8'),
      readFile(join(outputRoot, 'nav-tree.json'), 'utf8'),
      readFile(join(outputRoot, 'resume', 'index.html'), 'utf8'),
      readFile(join(outputRoot, 'portfolio', 'index.html'), 'utf8'),
    ]);
    searchIndex = JSON.parse(searchIndexText);
    navTree = JSON.parse(navTreeText);
    resumeHtml = resume;
    portfolioHtml = portfolio;
  }, 75_000);

  afterAll(async () => {
    if (outputRoot !== '') {
      await rm(outputRoot, { force: true, recursive: true });
    }
  });

  test('renders the résumé shell, closed disclosures and static navigation', () => {
    assertProfileShell(resumeHtml, 'resume', 'Résumé');
    expect(headingTexts(resumeHtml, 2)).toEqual([
      '소개·연락·PDF',
      '핵심 역량',
      '경력·대표 성과',
      '대표 프로젝트 요약',
      '교육',
      '자격',
    ]);
    assertLogicalHeadingOrder(resumeHtml);
    assertNavigation(resumeHtml, '/resume');
    assertClosedResumeDetails(resumeHtml);
    expect(testIds(resumeHtml)).toEqual(
      expect.arrayContaining([
        'contact-actions-link-email',
        'contact-actions-link-github',
        'contact-actions-link-resume-document',
      ]),
    );
    expect(testIds(resumeHtml)).toContainEqual(
      expect.stringMatching(/^resume-entry-details-[a-z0-9-]+$/),
    );
    expect(testIds(resumeHtml)).toContainEqual(
      expect.stringMatching(/^resume-entry-summary-[a-z0-9-]+$/),
    );
    assertProfileMetadata(
      resumeHtml,
      '/resume',
      'resume-summary',
      ['ProfilePage', 'Person'],
    );
  });

  test('renders portfolio articles, six dimensions and static navigation', () => {
    assertProfileShell(portfolioHtml, 'portfolio', 'Portfolio');
    expect(headingTexts(portfolioHtml, 2)).toEqual([
      '소개와 연락',
      '대표 프로젝트',
    ]);
    assertLogicalHeadingOrder(portfolioHtml);
    assertNavigation(portfolioHtml, '/portfolio');
    assertCaseStudies(portfolioHtml);
    expect(testIds(portfolioHtml)).toContainEqual(
      expect.stringMatching(/^evidence-actions-link-[a-z0-9-]+$/),
    );
    assertProfileMetadata(
      portfolioHtml,
      '/portfolio',
      'portfolio-summary',
      ['CollectionPage', 'ItemList'],
    );
  });

  test('keeps profile routes out of copied search and knowledge navigation data', () => {
    expect(searchDocumentSlugs(searchIndex)).not.toContain('resume');
    expect(searchDocumentSlugs(searchIndex)).not.toContain('portfolio');
    expect(navTreeSlugs(navTree)).not.toContain('resume');
    expect(navTreeSlugs(navTree)).not.toContain('portfolio');

    for (const html of [resumeHtml, portfolioHtml]) {
      expect(anchorHrefs(elementByClass(html, 'nav', 'desktop-nav'))).toEqual(
        PRIMARY_NAVIGATION,
      );
      expect(anchorHrefs(elementByClass(html, 'nav', 'profile-local-navigation')))
        .toEqual(['/', '/resume', '/portfolio']);
    }
  });
});

function validSource(
  input: ProfileData = cloneProfileFixture(),
): ValidatedProfile {
  const result = validateProfile(input);
  if (!result.ok) {
    throw new Error(
      result.issues.map(({ code, path }) => `${code}@${path}`).join(', '),
    );
  }
  return result.value;
}

function assertProfileShell(
  html: string,
  route: 'resume' | 'portfolio',
  label: string,
): void {
  expect(openingTags(html, 'h1')).toHaveLength(1);
  expect(html).toMatch(
    new RegExp(
      `<h1\\b[^>]*data-testid="profile-shell-heading"[^>]*>\\s*${escapeRegExp(label)}\\s*</h1>`,
    ),
  );
  expect(html).toContain(`data-testid="profile-shell-${route}"`);
  const ids = testIds(html);
  expect(ids).toContain('profile-local-navigation');
  expect(new Set(ids).size).toBe(ids.length);
  expect(html).not.toMatch(/<form\b/i);
}

function assertLogicalHeadingOrder(html: string): void {
  const levels = headingLevels(html);
  expect(levels[0]).toBe(1);
  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  for (let index = 1; index < levels.length; index += 1) {
    expect(levels[index]).toBeLessThanOrEqual(levels[index - 1]! + 1);
  }
}

function assertNavigation(html: string, currentHref: string): void {
  const desktop = elementByClass(html, 'nav', 'desktop-nav');
  const mobile = elementByClass(html, 'nav', 'mobile-nav-dropdown');
  const local = elementByClass(html, 'nav', 'profile-local-navigation');

  expect(anchorHrefs(desktop)).toEqual(PRIMARY_NAVIGATION);
  expect(anchorHrefs(mobile)).toEqual(PRIMARY_NAVIGATION);
  expect(currentAnchorHrefs(desktop)).toEqual([currentHref]);
  expect(currentAnchorHrefs(mobile)).toEqual([currentHref]);
  expect(anchorHrefs(local)).toEqual(['/', '/resume', '/portfolio']);
  expect(currentAnchorHrefs(local)).toEqual([currentHref]);

  const mobileDetails = openingTags(html, 'details').find((tag) =>
    /\bclass="mobile-nav-disclosure"/.test(tag),
  );
  expect(mobileDetails).toBeDefined();
  expect(mobileDetails).not.toMatch(/\bopen(?:\s|=|>)/);
  expect(mobileDetails).not.toMatch(/\bclient(?:\s|=|>)/);
  expect(isInsideAstroIsland(html, mobileDetails!)).toBe(false);
}

function assertClosedResumeDetails(html: string): void {
  const details = [...html.matchAll(
    /(<details\b(?=[^>]*data-testid="resume-entry-details-([a-z0-9-]+)")[^>]*>)([\s\S]*?)<\/details>/g,
  )];

  expect(details.length).toBeGreaterThan(0);
  for (const detail of details) {
    const openingTag = detail[1]!;
    const id = detail[2]!;
    const body = detail[3]!;
    expect(openingTag).not.toMatch(/\bopen(?:\s|=|>)/);

    const summary = new RegExp(
      `<summary\\b(?=[^>]*data-testid="resume-entry-summary-${escapeRegExp(id)}")[^>]*>([\\s\\S]*?)</summary>`,
    ).exec(body);
    expect(summary, `missing native summary for ${id}`).not.toBeNull();
    const heading = openingTags(summary?.[1] ?? '', 'span').find(
      (tag) => /\bclass="[^"]*\bresume-entry-heading\b/.test(tag),
    );
    expect(heading, `missing logical heading for ${id}`).toBeDefined();
    expect(attribute(heading ?? '', 'role')).toBe('heading');
    expect(attribute(heading ?? '', 'aria-level')).toBe('4');
  }
}

function assertCaseStudies(html: string): void {
  const articles = [...html.matchAll(
    /<article\b(?=[^>]*data-testid="case-study-article-[a-z0-9-]+")[^>]*>[\s\S]*?<\/article>/g,
  )].map(([article]) => article);

  expect(articles.length).toBeGreaterThanOrEqual(3);
  expect(articles.length).toBeLessThanOrEqual(6);
  for (const article of articles) {
    expect(article).toMatch(
      /data-testid="case-study-title-[a-z0-9-]+"/,
    );
    expect([...article.matchAll(/data-profile-dimension="([^"]+)"/g)].map(
      (match) => match[1],
    )).toEqual(CASE_STUDY_DIMENSIONS);
    expect(article).toMatch(
      /data-testid="case-study-dimension-problem-[a-z0-9-]+"/,
    );
    expect(article).toMatch(
      /data-testid="case-study-dimension-lessons-[a-z0-9-]+"/,
    );
  }
}

function assertProfileMetadata(
  html: string,
  pathname: '/resume' | '/portfolio',
  visibleSummaryClass: 'resume-summary' | 'portfolio-summary',
  expectedTypes: readonly string[],
): void {
  expect(openingTags(html, 'title')).toHaveLength(1);
  expect(metaTags(html, 'name', 'description')).toHaveLength(1);
  expect(metaTags(html, 'property', 'og:title')).toHaveLength(1);
  expect(metaTags(html, 'property', 'og:description')).toHaveLength(1);
  expect(metaTags(html, 'property', 'og:type')).toHaveLength(1);
  expect(metaTags(html, 'property', 'og:url')).toHaveLength(1);
  expect(metaTags(html, 'name', 'twitter:card')).toHaveLength(1);
  expect(metaTags(html, 'name', 'twitter:title')).toHaveLength(1);
  expect(metaTags(html, 'name', 'twitter:description')).toHaveLength(1);
  const canonical = linkTags(html, 'rel', 'canonical');
  expect(canonical).toHaveLength(1);
  expect(attribute(canonical[0]!, 'href')).toBe(
    `https://rvnnt.dev${pathname}`,
  );
  const description = attribute(
    metaTags(html, 'name', 'description')[0]!,
    'content',
  );
  expect(description).toBe(
    stripTags(elementByClass(html, 'p', visibleSummaryClass)),
  );

  const documents = [...html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
  )]
    .filter((match) => attribute(match[1]!, 'type') === 'application/ld+json')
    .map((match) => JSON.parse(match[2]!));
  expect(documents).toHaveLength(expectedTypes.length);
  expect(documents.map((document) => document['@type'])).toEqual(
    expectedTypes,
  );
}

function headingTexts(html: string, level: number): string[] {
  return [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'g'))]
    .map((match) => stripTags(match[1]!));
}

function headingLevels(html: string): number[] {
  const levels: number[] = [];
  for (const [, tagName, attributes] of html.matchAll(
    /<([a-z][\w-]*)\b([^>]*)>/gi,
  )) {
    const headingTag = /^h([1-6])$/i.exec(tagName!);
    if (headingTag !== null) {
      levels.push(Number(headingTag[1]));
      continue;
    }
    if (
      attribute(attributes!, 'role') === 'heading' &&
      attribute(attributes!, 'aria-level') !== undefined
    ) {
      levels.push(Number(attribute(attributes!, 'aria-level')));
    }
  }
  return levels;
}

function elementByClass(html: string, tag: string, className: string): string {
  const open = new RegExp(`<${tag}\\b[^>]*\\bclass="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*>`, 'i').exec(html);
  if (open === null || open.index === undefined) {
    throw new Error(`Could not find ${tag}.${className}`);
  }
  const closeIndex = html.indexOf(`</${tag}>`, open.index + open[0].length);
  if (closeIndex === -1) {
    throw new Error(`Could not close ${tag}.${className}`);
  }
  return html.slice(open.index, closeIndex + tag.length + 3);
}

function anchorHrefs(html: string): string[] {
  return openingTags(html, 'a').flatMap((tag) => {
    const href = attribute(tag, 'href');
    return href === undefined ? [] : [href];
  });
}

function currentAnchorHrefs(html: string): string[] {
  return openingTags(html, 'a').flatMap((tag) =>
    attribute(tag, 'aria-current') === 'page'
      ? [attribute(tag, 'href')!]
      : [],
  );
}

function openingTags(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(
    ([match]) => match,
  );
}

function metaTags(html: string, name: string, value: string): string[] {
  return openingTags(html, 'meta').filter(
    (tag) => attribute(tag, name) === value,
  );
}

function linkTags(html: string, name: string, value: string): string[] {
  return openingTags(html, 'link').filter(
    (tag) => attribute(tag, name) === value,
  );
}

function isInsideAstroIsland(html: string, openingTag: string): boolean {
  const elementIndex = html.indexOf(openingTag);
  if (elementIndex === -1) {
    throw new Error('Could not locate the rendered mobile disclosure.');
  }
  const nearestOpen = html.lastIndexOf('<astro-island', elementIndex);
  const nearestClose = html.lastIndexOf('</astro-island>', elementIndex);
  return nearestOpen > nearestClose;
}

function testIds(html: string): string[] {
  return [...html.matchAll(/\bdata-testid="([^"]+)"/g)].map(
    (match) => match[1]!,
  );
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, 'i').exec(tag)?.[1];
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchDocumentSlugs(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.documents)) {
    throw new Error('Expected copied search-index.json documents.');
  }
  return value.documents.flatMap((document) =>
    isRecord(document) && typeof document.slug === 'string'
      ? [document.slug]
      : [],
  );
}

function navTreeSlugs(value: unknown): string[] {
  const slugs: string[] = [];
  collectNavTreeSlugs(value, slugs);
  return slugs;
}

function collectNavTreeSlugs(value: unknown, slugs: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectNavTreeSlugs(item, slugs));
    return;
  }
  if (!isRecord(value)) return;

  if (typeof value.slug === 'string') {
    slugs.push(value.slug);
  }
  if (Array.isArray(value.roots)) {
    collectNavTreeSlugs(value.roots, slugs);
  }
  if (Array.isArray(value.children)) {
    collectNavTreeSlugs(value.children, slugs);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildSiteInto } from './support/astro-build.js';
import { getResumeDocumentLink } from '../../src/lib/profile/document-boundary.js';
import { getCurrentResumeDocumentLink } from '../../src/lib/profile/current-resume-document.js';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';
import type { ProfilePathname } from '../../src/lib/profile/metadata.js';
import {
  buildPortfolioPresentation,
  buildResumePresentation,
} from '../../src/components/profile/presentation.js';
import { selectPortfolioProfile, selectResumeProfile } from '../../src/lib/profile/selectors.js';
import type { ProfileData, ValidatedProfile } from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

const PRIMARY_NAVIGATION = ['/tags', '/graph', '/resume', '/portfolio'];
const PRODUCT_ENGINEER_PATH = '/portfolio/product-engineer';
const PRODUCT_ENGINEER_PROJECTS = ['docsuri'] as const;
const INFRA_ENGINEER_PATH = '/portfolio/infra-engineer';
const INFRA_ENGINEER_PROJECTS = ['docsuri', 'obsidian-custom-publish'] as const;
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
      getResumeDocumentLink()
    );

    expect(presentation.shell.identity).toEqual({
      route: 'resume',
      pathname: '/resume',
      label: 'Résumé',
    });
    expect(presentation.shell.navigation.map(({ href, current }) => [href, current])).toEqual([
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
        label: 'tester@example.com',
      }),
      expect.objectContaining({
        id: 'github',
        kind: 'github',
        href: 'https://github.com/example-user',
        label: 'https://github.com/example-user',
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

  test('keeps project contribution facts in the project and preserves portfolio action labels', () => {
    const fixture = cloneProfileFixture();
    const source = validSource({
      ...fixture,
      projects: fixture.projects.map((project) => ({
        ...project,
        ...(project.id === 'project-alpha'
          ? {
              resumeDetails: [
                {
                  tag: 'list',
                  style: 'unordered',
                  items: [
                    {
                      factId: 'project-alpha-resume-contribution',
                      value: '입력 검증을 구현해 잘못된 출력을 방지했습니다.',
                    },
                  ],
                },
              ],
            }
          : {}),
      })),
    } as ProfileData);
    const resume = buildResumePresentation(selectResumeProfile(source));
    const projects = resume.sections.find((section) => section.kind === 'projects');
    if (projects?.kind !== 'projects') throw new Error('Expected project section.');
    expect(projects.projects.find(({ id }) => id === 'project-alpha')).toMatchObject({
      portfolioHref: '/portfolio#project-project-alpha',
      details: [
        {
          tag: 'list',
          style: 'unordered',
          items: [
            {
              factId: 'project-alpha-resume-contribution',
              value: '입력 검증을 구현해 잘못된 출력을 방지했습니다.',
            },
          ],
        },
      ],
    });
    const portfolio = buildPortfolioPresentation(selectPortfolioProfile(source));
    const intro = portfolio.sections[0];
    if (intro?.kind !== 'intro') throw new Error('Expected portfolio intro.');
    expect(intro.actions.map(({ label }) => label)).toEqual([
      '이메일 보내기',
      'GitHub 프로필 보기',
    ]);
  });

  // BR4.2: 자격증 (credentials) sits between 학력 and 어학 자격, and an empty
  // collection renders no section.
  test('places 자격증 after 학력 and before 어학 자격', () => {
    const resume = buildResumePresentation(
      selectResumeProfile(validSource(profileWithCertificationSections(true, true)))
    );
    const kinds = resume.sections.map(({ kind }) => kind);
    expect(kinds.slice(-3)).toEqual(['education', 'credentials', 'certifications']);

    const credentials = resume.sections.find((section) => section.kind === 'credentials');
    if (credentials?.kind !== 'credentials') throw new Error('Expected a credentials section.');
    expect(credentials.heading).toBe('자격증');
    expect(credentials.entries.map(({ id, issuer }) => [id, issuer?.value])).toEqual([
      ['aws-example', 'Amazon Web Services'],
    ]);
    const certifications = resume.sections.find((section) => section.kind === 'certifications');
    expect(certifications?.kind === 'certifications' && certifications.heading).toBe('어학 자격');
  });

  test.each([
    [false, true, 'credentials'],
    [true, false, 'certifications'],
  ])(
    'omits a section whose collection is empty (credentials %s, certifications %s)',
    (withCredentials, withCertifications, absent) => {
      const resume = buildResumePresentation(
        selectResumeProfile(
          validSource(profileWithCertificationSections(withCredentials, withCertifications))
        )
      );
      expect(resume.sections.map(({ kind }) => kind)).not.toContain(absent);
    }
  );

  // BR3.1: one dotted formatter for every period; the stored value stays ISO.
  test.each([
    [
      { tag: 'date', value: '2025-09-06' },
      { tag: 'date', value: '2027-09-06' },
      '2025.09.06 – 2027.09.06',
    ],
    [
      { tag: 'year-month', value: '2023-07' },
      { tag: 'year-month', value: '2023-08' },
      '2023.07 – 2023.08',
    ],
    [{ tag: 'year', value: '2019' }, { tag: 'year', value: '2026' }, '2019 – 2026'],
    [{ tag: 'year-month', value: '2024-03' }, { tag: 'present' }, '2024.03 – 현재'],
    [{ tag: 'date', value: '2026-07-17' }, { tag: 'present' }, '2026.07.17 – 현재'],
  ])('displays the period %o – %o as %s', (start, end, text) => {
    const fixture = cloneProfileFixture() as unknown as {
      experiences: Array<{ period: { value: unknown } }>;
    };
    fixture.experiences[0]!.period.value = { start, end };
    const resume = buildResumePresentation(
      selectResumeProfile(validSource(fixture as unknown as ProfileData))
    );
    const highlights = resume.sections.find((section) => section.kind === 'highlights');
    if (highlights?.kind !== 'highlights') throw new Error('Expected highlights section.');
    const entry = highlights.groups[0]?.entries[0];
    if (entry?.kind !== 'career') throw new Error('Expected a career entry.');

    expect(entry.period.text).toBe(text);
    expect(entry.period.value).toEqual({ start, end });
  });

  test('omits absent optionals and preserves all portfolio dimensions without markup or client state fields', () => {
    const source = validSource();
    const resume = buildResumePresentation(selectResumeProfile(source), getResumeDocumentLink());
    const portfolio = buildPortfolioPresentation(selectPortfolioProfile(source));

    expect(resume.sections.map(({ kind }) => kind)).not.toContain('education');
    expect(resume.sections.map(({ kind }) => kind)).not.toContain('certifications');
    expect(portfolio.sections.map(({ kind }) => kind)).toEqual(['intro', 'projects']);

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
    expect(projects.projects.map((project) => project.dimensions.map(({ key }) => key))).toEqual([
      CASE_STUDY_DIMENSIONS,
      CASE_STUDY_DIMENSIONS,
      CASE_STUDY_DIMENSIONS,
    ]);

    const serialized = JSON.stringify({ resume, portfolio });
    expect(serialized).not.toMatch(
      /(?:rawHtml|html|markdown|clientState|hydration|tab|modal|carousel)/i
    );
    expect(serialized).not.toContain('<script');
  });
});

describe('production Astro profile output', () => {
  let outputRoot = '';
  let resumeHtml = '';
  let portfolioHtml = '';
  let productEngineerHtml = '';
  let infraEngineerHtml = '';
  let searchIndex: unknown;
  let navTree: unknown;

  beforeAll(async () => {
    outputRoot = await mkdtemp(join(tmpdir(), 'obsidian-profile-output-'));
    // Builds take turns with other built-HTML tests (support/astro-build.ts).
    const result = await buildSiteInto(outputRoot);

    if (result.status !== 0 || result.error !== undefined) {
      throw new Error(
        [
          'The isolated Astro profile build failed.',
          result.error?.message ?? '',
          result.stdout,
          result.stderr,
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    const [searchIndexText, navTreeText, resume, portfolio, productEngineer, infraEngineer] =
      await Promise.all([
        readFile(join(outputRoot, 'search-index.json'), 'utf8'),
        readFile(join(outputRoot, 'nav-tree.json'), 'utf8'),
        readFile(join(outputRoot, 'resume', 'index.html'), 'utf8'),
        readFile(join(outputRoot, 'portfolio', 'index.html'), 'utf8'),
        readFile(join(outputRoot, 'portfolio', 'product-engineer', 'index.html'), 'utf8'),
        readFile(join(outputRoot, 'portfolio', 'infra-engineer', 'index.html'), 'utf8'),
      ]);
    searchIndex = JSON.parse(searchIndexText);
    navTree = JSON.parse(navTreeText);
    resumeHtml = resume;
    portfolioHtml = portfolio;
    productEngineerHtml = productEngineer;
    infraEngineerHtml = infraEngineer;
  }, 75_000);

  afterAll(async () => {
    if (outputRoot !== '') {
      await rm(outputRoot, { force: true, recursive: true });
    }
  });

  test('renders the résumé shell, closed disclosures and static navigation', async () => {
    assertProfileShell(resumeHtml, 'resume', 'Résumé');
    expect(headingTexts(resumeHtml, 2)).toEqual([
      '프로필',
      '핵심 역량',
      '경력·대표 성과',
      '프로젝트',
      '학력',
      '자격증',
      '어학 자격',
    ]);
    assertLogicalHeadingOrder(resumeHtml);
    assertNavigation(resumeHtml, '/resume');
    assertClosedResumeDetails(resumeHtml);
    expect(testIds(resumeHtml)).toEqual(
      expect.arrayContaining(['contact-actions-link-email', 'contact-actions-link-github'])
    );
    const documentLink = await getCurrentResumeDocumentLink(getProductionProfileAssembly().source);
    expect(testIds(resumeHtml).includes('contact-actions-link-resume-document')).toBe(
      documentLink !== undefined
    );
    const resume = getProductionProfileAssembly().resume;
    expect(resumeHtml).toMatch(
      new RegExp(
        `data-testid="contact-actions-link-email"[^>]*>\\s*${escapeRegExp(resume.contactActions.email.value)}`
      )
    );
    expect(resumeHtml).toMatch(
      new RegExp(
        `data-testid="contact-actions-link-github"[^>]*>\\s*${escapeRegExp(resume.contactActions.github.value)}`
      )
    );
    const project = elementByClass(resumeHtml, 'article', 'resume-project-summary');
    expect(anchorHrefs(project)).toContain('https://rvnnt.dev/portfolio#project-docsuri');
    for (const block of resume.projectSummaries[0]?.details ?? []) {
      const facts = block.tag === 'paragraph' ? [block.text] : block.items;
      for (const fact of facts) {
        expect(project).toContain(`data-profile-fact-id="${fact.factId}"`);
      }
    }
    expect(testIds(resumeHtml)).toContainEqual(
      expect.stringMatching(/^resume-entry-details-[a-z0-9-]+$/)
    );
    expect(testIds(resumeHtml)).toContainEqual(
      expect.stringMatching(/^resume-entry-summary-[a-z0-9-]+$/)
    );
    assertProfileMetadata(resumeHtml, '/resume', 'resume-summary', ['ProfilePage', 'Person']);
  });

  test('renders portfolio articles, six dimensions and static navigation', () => {
    assertProfileShell(portfolioHtml, 'portfolio', 'Portfolio');
    expect(headingTexts(portfolioHtml, 2)).toEqual(['프로필', '대표 프로젝트']);
    assertLogicalHeadingOrder(portfolioHtml);
    assertNavigation(portfolioHtml, '/portfolio');
    assertCaseStudies(portfolioHtml);
    expect(testIds(portfolioHtml)).toContainEqual(
      expect.stringMatching(/^evidence-actions-link-[a-z0-9-]+$/)
    );
    assertProfileMetadata(portfolioHtml, '/portfolio', 'portfolio-summary', [
      'CollectionPage',
      'ItemList',
    ]);
  });

  test('renders the product engineer portfolio with its own metadata and only DocSuri', () => {
    assertProfileShell(productEngineerHtml, 'portfolio', 'Product Engineer Portfolio');
    expect(headingTexts(productEngineerHtml, 2)).toEqual(['프로필', '대표 프로젝트']);
    assertLogicalHeadingOrder(productEngineerHtml);
    assertNavigation(productEngineerHtml, '/portfolio');
    assertCaseStudies(productEngineerHtml, 1);
    assertProfileMetadata(productEngineerHtml, PRODUCT_ENGINEER_PATH, 'portfolio-summary', [
      'CollectionPage',
      'ItemList',
    ]);
    expect(stripTags(elementByClass(productEngineerHtml, 'p', 'portfolio-eyebrow'))).toBe(
      '프로덕트 엔지니어링 · 사용자 경험 · 구현과 운영'
    );
    expect(elementByClass(productEngineerHtml, 'p', 'portfolio-summary')).not.toContain(
      'data-profile-fact-id'
    );

    const articles = openingTags(productEngineerHtml, 'article').filter((tag) =>
      attribute(tag, 'data-testid')?.startsWith('case-study-article-')
    );
    const articleIds = articles.map((tag) => attribute(tag, 'id'));
    expect(articleIds).toEqual(PRODUCT_ENGINEER_PROJECTS.map((id) => `project-${id}`));
    expect(
      anchorHrefs(elementByClass(productEngineerHtml, 'nav', 'portfolio-project-navigation'))
    ).toEqual(articleIds.map((id) => `#${id}`));
    const focusLabels = openingTags(productEngineerHtml, 'p').filter((tag) =>
      attribute(tag, 'class')?.split(/\s+/).includes('portfolio-project-focus')
    );
    expect(focusLabels).toHaveLength(PRODUCT_ENGINEER_PROJECTS.length);
    for (const article of articles) {
      expect(isInsideAstroIsland(productEngineerHtml, article)).toBe(false);
    }

    const factIds = [...productEngineerHtml.matchAll(/data-profile-fact-id="([^"]+)"/g)].map(
      (match) => match[1]
    );
    expect(factIds.length).toBeGreaterThan(0);
    expect(new Set(factIds).size).toBe(factIds.length);

    const canonical = `https://rvnnt.dev${PRODUCT_ENGINEER_PATH}`;
    expect(attribute(metaTags(productEngineerHtml, 'property', 'og:url')[0]!, 'content')).toBe(
      canonical
    );
    expect(
      stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/.exec(productEngineerHtml)?.[1] ?? '')
    ).toContain('Product Engineer');
    const documents = jsonLdDocuments(productEngineerHtml);
    expect(documents[0]).toMatchObject({
      '@id': `${canonical}#collection-page`,
      url: canonical,
      mainEntity: { '@id': `${canonical}#projects` },
    });
    const itemList = documents[1] as {
      '@id': string;
      numberOfItems: number;
      itemListElement: Array<{
        position: number;
        url: string;
        item: { '@id': string; url: string };
      }>;
    };
    expect(itemList['@id']).toBe(`${canonical}#projects`);
    expect(itemList.numberOfItems).toBe(PRODUCT_ENGINEER_PROJECTS.length);
    expect(
      itemList.itemListElement.map(({ position, url, item }) => [
        position,
        url,
        item['@id'],
        item.url,
      ])
    ).toEqual(
      PRODUCT_ENGINEER_PROJECTS.map((id, index) => {
        const url = `${canonical}#project-${id}`;
        return [index + 1, url, url, url];
      })
    );
  });

  test('renders the infrastructure portfolio with matching project anchors and metadata', () => {
    assertProfileShell(infraEngineerHtml, 'portfolio', 'Infra Engineer Portfolio');
    expect(headingTexts(infraEngineerHtml, 2)).toEqual(['프로필', '대표 프로젝트']);
    assertLogicalHeadingOrder(infraEngineerHtml);
    assertNavigation(infraEngineerHtml, '/portfolio');
    assertCaseStudies(infraEngineerHtml, 2);
    assertProfileMetadata(infraEngineerHtml, INFRA_ENGINEER_PATH, 'portfolio-summary', [
      'CollectionPage',
      'ItemList',
    ]);
    const ids = openingTags(infraEngineerHtml, 'article').map((tag) => attribute(tag, 'id'));
    expect(ids).toEqual(INFRA_ENGINEER_PROJECTS.map((id) => `project-${id}`));
    expect(
      anchorHrefs(elementByClass(infraEngineerHtml, 'nav', 'portfolio-project-navigation'))
    ).toEqual(ids.map((id) => `#${id}`));
    const canonical = `https://rvnnt.dev${INFRA_ENGINEER_PATH}`;
    const documents = jsonLdDocuments(infraEngineerHtml);
    expect(documents[1]).toMatchObject({
      '@id': `${canonical}#projects`,
      numberOfItems: 2,
      itemListElement: INFRA_ENGINEER_PROJECTS.map((id, index) => ({
        position: index + 1,
        url: `${canonical}#project-${id}`,
      })),
    });
    expect(attribute(metaTags(infraEngineerHtml, 'property', 'og:url')[0]!, 'content')).toBe(
      canonical
    );
    expect(infraEngineerHtml).toContain(
      'data-profile-fact-id="project-docsuri-architecture-local-runtime"'
    );
    expect(infraEngineerHtml).toContain(
      'data-profile-fact-id="project-docsuri-outcomes-recovery-checks"'
    );
    expect(infraEngineerHtml).toContain(
      'data-profile-fact-id="project-obsidian-custom-publish-problem-renderer-exit"'
    );
    expect(elementByClass(infraEngineerHtml, 'p', 'portfolio-summary')).not.toContain(
      'data-profile-fact-id'
    );
    const factIds = [...infraEngineerHtml.matchAll(/data-profile-fact-id="([^"]+)"/g)].map(
      (match) => match[1]
    );
    expect(new Set(factIds).size).toBe(factIds.length);
    expect(infraEngineerHtml).not.toContain('cdn.jsdelivr.net');
  });

  test('links all portfolio roles with exactly one current role on each page', () => {
    for (const [html, pathname] of [
      [portfolioHtml, '/portfolio'],
      [productEngineerHtml, PRODUCT_ENGINEER_PATH],
      [infraEngineerHtml, INFRA_ENGINEER_PATH],
    ] as const) {
      const navigation = elementByClass(html, 'nav', 'portfolio-role-navigation');
      expect(attribute(openingTags(navigation, 'nav')[0]!, 'aria-label')).toBe('직무별 포트폴리오');
      expect(anchorHrefs(navigation)).toEqual([
        '/portfolio',
        PRODUCT_ENGINEER_PATH,
        INFRA_ENGINEER_PATH,
      ]);
      expect(currentAnchorHrefs(navigation)).toEqual([pathname]);
      expect(stripTags(navigation)).toContain('Data Engineer / AI');
      expect(stripTags(navigation)).toContain('Product Engineer');
      expect(stripTags(navigation)).toContain('Infra Engineer');
      expect(isInsideAstroIsland(html, openingTags(navigation, 'nav')[0]!)).toBe(false);
    }
  });

  test('keeps portfolio jump links and native detail content in the static document', () => {
    const navigation = elementByClass(portfolioHtml, 'nav', 'portfolio-project-navigation');
    const articleIds = openingTags(portfolioHtml, 'article')
      .map((tag) => attribute(tag, 'id'))
      .filter((id): id is string => id?.startsWith('project-') === true);
    expect(anchorHrefs(navigation)).toEqual(articleIds.map((id) => `#${id}`));

    const disclosures = openingTags(portfolioHtml, 'details').filter((tag) =>
      /\bclass="case-study-details"/.test(tag)
    );
    expect(disclosures.length).toBeGreaterThan(0);
    for (const disclosure of disclosures) {
      expect(disclosure).not.toMatch(/\bopen(?:\s|=|>)/);
      expect(isInsideAstroIsland(portfolioHtml, disclosure)).toBe(false);
    }
    const disclosureBodies = [
      ...portfolioHtml.matchAll(
        /<details\b(?=[^>]*class="case-study-details")[^>]*>([\s\S]*?)<\/details>/g
      ),
    ];
    expect(disclosureBodies).toHaveLength(disclosures.length);
    for (const [, body] of disclosureBodies) {
      expect(body).toContain('data-profile-fact-id=');
      expect(stripTags(body!.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/, ''))).not.toBe('');
    }
    const factIds = [...portfolioHtml.matchAll(/data-profile-fact-id="([^"]+)"/g)].map(
      (match) => match[1]
    );
    expect(new Set(factIds).size).toBe(factIds.length);
  });

  test('renders portfolio topic labels as subheadings rather than inline em-dash leads', () => {
    const subtitles = [
      ...portfolioHtml.matchAll(
        /<h5\b[^>]*\bclass="[^"]*\bprofile-content-subtitle\b[^"]*"[^>]*>([\s\S]*?)<\/h5>/g
      ),
    ];
    expect(subtitles.length).toBeGreaterThan(0);
    for (const [heading, label] of subtitles) {
      expect(stripTags(label!)).not.toBe('');
      expect(heading).not.toContain('—');
    }
    for (const [article] of portfolioHtml.matchAll(
      /<article\b(?=[^>]*data-testid="case-study-article-[a-z0-9-]+")[^>]*>[\s\S]*?<\/article>/g
    )) {
      expect(stripTags(article)).not.toContain('—');
    }
    expect(portfolioHtml).not.toMatch(/<p\b[^>]*>[^<]*<h5\b/);
    expect(resumeHtml).not.toContain('profile-content-subtitle');
  });

  test('keeps profile routes out of copied search and knowledge navigation data', () => {
    expect(searchDocumentSlugs(searchIndex)).not.toContain('resume');
    expect(searchDocumentSlugs(searchIndex)).not.toContain('portfolio');
    expect(navTreeSlugs(navTree)).not.toContain('resume');
    expect(navTreeSlugs(navTree)).not.toContain('portfolio');
    expect(searchDocumentSlugs(searchIndex)).not.toContain('portfolio/product-engineer');
    expect(navTreeSlugs(navTree)).not.toContain('portfolio/product-engineer');
    expect(searchDocumentSlugs(searchIndex)).not.toContain('portfolio/infra-engineer');
    expect(navTreeSlugs(navTree)).not.toContain('portfolio/infra-engineer');

    for (const html of [resumeHtml, portfolioHtml, productEngineerHtml, infraEngineerHtml]) {
      expect(anchorHrefs(elementByClass(html, 'nav', 'desktop-nav'))).toEqual(PRIMARY_NAVIGATION);
      expect(anchorHrefs(elementByClass(html, 'nav', 'profile-local-navigation'))).toEqual([
        '/',
        '/resume',
        '/portfolio',
      ]);
    }
  });
});

function exampleCertification(id: string, title: string, issuer: string) {
  return {
    id,
    order: 10,
    title: { factId: `${id}-title`, value: title },
    issuer: { factId: `${id}-issuer`, value: issuer },
    period: {
      factId: `${id}-period`,
      value: {
        start: { tag: 'date', value: '2025-09-06' },
        end: { tag: 'date', value: '2027-09-06' },
      },
    },
    details: [],
    evidence: [],
  };
}

function profileWithCertificationSections(
  withCredentials: boolean,
  withCertifications: boolean
): ProfileData {
  const fixture = cloneProfileFixture();
  return {
    ...fixture,
    education: [
      {
        id: 'example-university',
        order: 10,
        title: { factId: 'education-example-title', value: '예시 대학교' },
        details: [],
        evidence: [],
      },
    ],
    credentials: withCredentials
      ? [exampleCertification('aws-example', 'AWS 예시 자격', 'Amazon Web Services')]
      : [],
    certifications: withCertifications
      ? [exampleCertification('language-example', '어학 예시 자격', 'ACTFL')]
      : [],
  } as unknown as ProfileData;
}

function validSource(input: ProfileData = cloneProfileFixture()): ValidatedProfile {
  const result = validateProfile(input);
  if (!result.ok) {
    throw new Error(result.issues.map(({ code, path }) => `${code}@${path}`).join(', '));
  }
  return result.value;
}

function assertProfileShell(html: string, route: 'resume' | 'portfolio', label: string): void {
  expect(openingTags(html, 'h1')).toHaveLength(1);
  expect(html).toMatch(
    new RegExp(
      `<h1\\b[^>]*data-testid="profile-shell-heading"[^>]*>\\s*${escapeRegExp(label)}\\s*</h1>`
    )
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
    /\bclass="mobile-nav-disclosure"/.test(tag)
  );
  expect(mobileDetails).toBeDefined();
  expect(mobileDetails).not.toMatch(/\bopen(?:\s|=|>)/);
  expect(mobileDetails).not.toMatch(/\bclient(?:\s|=|>)/);
  expect(isInsideAstroIsland(html, mobileDetails!)).toBe(false);
}

function assertClosedResumeDetails(html: string): void {
  const details = [
    ...html.matchAll(
      /(<details\b(?=[^>]*data-testid="resume-entry-details-([a-z0-9-]+)")[^>]*>)([\s\S]*?)<\/details>/g
    ),
  ];

  expect(details.length).toBeGreaterThan(0);
  for (const detail of details) {
    const openingTag = detail[1]!;
    const id = detail[2]!;
    const body = detail[3]!;
    expect(openingTag).not.toMatch(/\bopen(?:\s|=|>)/);

    const summary = new RegExp(
      `<summary\\b(?=[^>]*data-testid="resume-entry-summary-${escapeRegExp(id)}")[^>]*>([\\s\\S]*?)</summary>`
    ).exec(body);
    expect(summary, `missing native summary for ${id}`).not.toBeNull();
    const heading = openingTags(summary?.[1] ?? '', 'span').find((tag) =>
      /\bclass="[^"]*\bresume-entry-heading\b/.test(tag)
    );
    expect(heading, `missing logical heading for ${id}`).toBeDefined();
    expect(attribute(heading ?? '', 'role')).toBe('heading');
    expect(attribute(heading ?? '', 'aria-level')).toBe('4');
  }
}

function assertCaseStudies(html: string, expectedCount?: number): void {
  const articles = [
    ...html.matchAll(
      /<article\b(?=[^>]*data-testid="case-study-article-[a-z0-9-]+")[^>]*>[\s\S]*?<\/article>/g
    ),
  ].map(([article]) => article);

  if (expectedCount === undefined) {
    expect(articles.length).toBeGreaterThanOrEqual(3);
    expect(articles.length).toBeLessThanOrEqual(6);
  } else {
    expect(articles).toHaveLength(expectedCount);
  }
  for (const article of articles) {
    expect(article).toMatch(/data-testid="case-study-title-[a-z0-9-]+"/);
    expect(
      [...article.matchAll(/data-profile-dimension="([^"]+)"/g)].map((match) => match[1])
    ).toEqual(CASE_STUDY_DIMENSIONS);
    expect(article).toMatch(/data-testid="case-study-dimension-problem-[a-z0-9-]+"/);
    expect(article).toMatch(/data-testid="case-study-dimension-lessons-[a-z0-9-]+"/);
  }
}

function assertProfileMetadata(
  html: string,
  pathname: ProfilePathname,
  visibleSummaryClass: 'resume-summary' | 'portfolio-summary',
  expectedTypes: readonly string[]
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
  expect(attribute(canonical[0]!, 'href')).toBe(`https://rvnnt.dev${pathname}`);
  const description = attribute(metaTags(html, 'name', 'description')[0]!, 'content');
  expect(description).toBe(stripTags(elementByClass(html, 'p', visibleSummaryClass)));

  const documents = jsonLdDocuments(html);
  expect(documents).toHaveLength(expectedTypes.length);
  expect(documents.map((document) => document['@type'])).toEqual(expectedTypes);
}

function jsonLdDocuments(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((match) => attribute(match[1]!, 'type') === 'application/ld+json')
    .map((match) => JSON.parse(match[2]!) as Record<string, unknown>);
}

function headingTexts(html: string, level: number): string[] {
  return [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'g'))].map(
    (match) => stripTags(match[1]!)
  );
}

function headingLevels(html: string): number[] {
  const levels: number[] = [];
  for (const [, tagName, attributes] of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
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
  const open = new RegExp(
    `<${tag}\\b[^>]*\\bclass="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*>`,
    'i'
  ).exec(html);
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
    attribute(tag, 'aria-current') === 'page' ? [attribute(tag, 'href')!] : []
  );
}

function openingTags(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(([match]) => match);
}

function metaTags(html: string, name: string, value: string): string[] {
  return openingTags(html, 'meta').filter((tag) => attribute(tag, name) === value);
}

function linkTags(html: string, name: string, value: string): string[] {
  return openingTags(html, 'link').filter((tag) => attribute(tag, name) === value);
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
  return [...html.matchAll(/\bdata-testid="([^"]+)"/g)].map((match) => match[1]!);
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, 'i').exec(tag)?.[1];
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchDocumentSlugs(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.documents)) {
    throw new Error('Expected copied search-index.json documents.');
  }
  return value.documents.flatMap((document) =>
    isRecord(document) && typeof document.slug === 'string' ? [document.slug] : []
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

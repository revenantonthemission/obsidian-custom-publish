// Other blog pages (FR4.3, FR4.5, FR5.6, FR5.8; mockups W5–W8 and W11;
// interaction-spec.md "Grouped List and Post Row", "Tag Chip", "Graph View and
// Local Graph", "Segmented Control"). Colors are the light tokens of
// tokens.css unless a test emulates dark.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';
import {
  SEGMENT_INDICATOR,
  gotoSettled,
  horizontalOverflow,
  measureTargets,
  renderedContrast,
  undersized,
  viewportFor,
} from './support/hig';

const TARGET = { width: 44, height: 44 };
const ROW_MIN_HEIGHT = 60;
const GRAPH_IMAGE = '모든 글의 연결 관계를 보여주는 그래프';

const LIGHT = {
  bg: 'rgb(255, 255, 255)',
  bgGrouped: 'rgb(242, 242, 247)',
  surface: 'rgb(255, 255, 255)',
  textSecondary: 'rgb(99, 99, 102)',
  tint: 'rgb(15, 118, 110)',
  tintFill: 'rgb(15, 118, 110)',
  graphHub: 'rgb(199, 0, 20)',
  graphEtc: 'rgb(108, 108, 112)',
} as const;

const DARK = { graphHub: 'rgb(255, 69, 58)', graphEtc: 'rgb(142, 142, 147)' } as const;

async function pageBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
}

/** Every row of an inset grouped list is one link that fills the row and is at least 60 px tall. */
async function expectGroupedRows(list: Locator, count: number): Promise<void> {
  const rows = list.locator(':scope > li');
  await expect(rows).toHaveCount(count);
  const shapes = await rows.evaluateAll((items) =>
    items.map((item) => {
      const links = item.querySelectorAll('a');
      const link = links[0]?.getBoundingClientRect();
      const row = item.getBoundingClientRect();
      return {
        text: item.textContent?.trim().slice(0, 30) ?? '',
        links: links.length,
        height: link?.height ?? 0,
        fills: link !== undefined && link.width >= row.width - 1,
      };
    })
  );
  for (const shape of shapes) {
    expect(shape.links, shape.text).toBe(1);
    expect(shape.height, shape.text).toBeGreaterThanOrEqual(ROW_MIN_HEIGHT - 0.5);
    expect(shape.fills, shape.text).toBe(true);
  }
}

async function graphNodeCount(page: Page): Promise<number> {
  const response = await page.request.get('/graph.json');
  const data = (await response.json()) as { nodes: unknown[] };
  return data.nodes.length;
}

// U1 homepage opening (BR6.2–BR6.6; FR3.1–FR3.3; AC3.1.1–AC3.2.4). The page
// no longer renders a vault note: one Large Title, the owner's name and short
// introduction from the approved profile facts, and two equal capsules.
const OWNER = getProductionProfileAssembly().homepage;

test.describe('homepage (W5)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('exactly one h1, "Passion Project", which is also the document title', async ({ page }) => {
    await gotoSettled(page, '/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Passion Project' })).toBeVisible();
    await expect(page).toHaveTitle('Passion Project');
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
  });

  test('shows the owner name and short introduction, never the headline (FR3.2)', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    const opening = page.locator('.home-opening');
    await expect(opening.getByText(OWNER.name.value, { exact: true })).toBeVisible();
    await expect(opening.getByText(OWNER.shortIntro.value, { exact: true })).toBeVisible();
    await expect(page.locator('main')).not.toContainText(OWNER.headline.value);
  });

  test('Résumé and Portfolio are equal 44 px capsules to /resume and /portfolio (FR3.3)', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    const resume = page.getByTestId('home-opening-resume-link');
    const portfolio = page.getByTestId('home-opening-portfolio-link');
    await expect(resume).toHaveText('Résumé');
    await expect(resume).toHaveAttribute('href', '/resume');
    await expect(portfolio).toHaveText('Portfolio');
    await expect(portfolio).toHaveAttribute('href', '/portfolio');
    expect(undersized(await measureTargets(page, '.home-opening-actions a'), TARGET)).toEqual([]);
    const looks = await page.locator('.home-opening-actions a').evaluateAll((links) =>
      links.map((link) => {
        const style = getComputedStyle(link);
        return [
          style.backgroundColor,
          style.color,
          style.borderRadius,
          style.fontSize,
          style.fontWeight,
          style.minHeight,
          style.paddingInline,
        ].join('|');
      })
    );
    expect(looks).toHaveLength(2);
    expect(looks[1]).toBe(looks[0]);
  });

  test('이번 주 글 is a grouped card of full rows ending with 모든 글 보기 (FR3.4, BR2.1)', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    const section = page.getByTestId('week-list');
    await expect(section.getByRole('heading', { level: 2, name: '이번 주 글' })).toBeVisible();
    await expectGroupedRows(section.locator('ul.grouped-list'), 3);
    await expect(section.getByTestId('all-posts-link')).toHaveText('모든 글 보기');
    await expect(section.getByText('이번 주에 발행한 글이 없습니다.')).toHaveCount(0);
  });

  test('every request the homepage makes stays on its own origin (NFR2.1, NFR3.1)', async ({
    page,
    baseURL,
  }) => {
    const own = new URL(baseURL ?? 'http://127.0.0.1:4329').origin;
    const foreign: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol !== 'data:' && url.origin !== own) foreign.push(request.url());
    });
    await gotoSettled(page, '/');
    await page.waitForLoadState('networkidle');
    expect(foreign).toEqual([]);
  });
});

test.describe('hub and tag pages (W6, W7)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('a hub lists its posts as one inset grouped list of 60 px rows', async ({ page }) => {
    await gotoSettled(page, '/hubs/hub-page');
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
    await expect(page.getByRole('heading', { level: 1, name: 'Hub Page' })).toBeVisible();
    await expect(page.getByText('3개 글')).toBeVisible();
    await expectGroupedRows(page.locator('main .grouped-list'), 3);
  });

  test('a hub without posts says so in one secondary row of its group (FR4.5)', async ({
    page,
  }) => {
    await gotoSettled(page, '/hubs/empty-hub');
    const list = page.locator('main .grouped-list');
    const empty = list.getByText('이 허브에 연결된 글이 아직 없습니다.');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveCSS('color', LIGHT.textSecondary);
    await expect(list.locator('a')).toHaveCount(0);
  });

  test('the tag index shows 44 px chips whose names include the post count', async ({ page }) => {
    await gotoSettled(page, '/writing/tags');
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
    await expect(page.getByRole('heading', { level: 1, name: '태그' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'test, 글 11개' })).toHaveAttribute(
      'href',
      '/writing/tags/test'
    );
    const chips = await measureTargets(page, '.tag-chip');
    expect(chips.length).toBeGreaterThan(5);
    expect(undersized(chips, TARGET)).toEqual([]);
  });

  test('a tag page lists its posts as grouped rows without nested tag links', async ({ page }) => {
    await gotoSettled(page, '/writing/tags/test');
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
    await expect(page.getByRole('heading', { level: 1, name: '#test' })).toBeVisible();
    await expect(page.getByText('11개 글')).toBeVisible();
    await expectGroupedRows(page.locator('main .grouped-list'), 11);
  });
});

test.describe('not found (W11)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('names the problem, offers search and home as 44 px capsules, and lists recent posts', async ({
    page,
  }) => {
    await gotoSettled(page, '/404');
    expect(await pageBackground(page)).toBe(LIGHT.bg);
    await expect(
      page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' })
    ).toBeVisible();
    await expect(page.getByText('주소가 바뀌었을 수 있습니다.')).toBeVisible();
    const search = page.getByRole('button', { name: '사이트 검색' });
    await expect(search).toHaveCSS('background-color', LIGHT.tintFill);
    await expect(page.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
    expect(
      undersized(await measureTargets(page, '.not-found-actions :is(a, button)'), TARGET)
    ).toEqual([]);
    await expect(page.getByRole('heading', { level: 2, name: '최근 글' })).toBeVisible();
    await expectGroupedRows(page.locator('main .grouped-list'), 5);
    await search.click();
    await expect(page.locator('input:focus')).toBeVisible();
  });
});

test.describe('graph page (W8; FR5.6)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('the 그래프 | 목록 control switches to a keyboard list of every note and its links', async ({
    page,
    browserName,
  }) => {
    await gotoSettled(page, '/writing/graph');
    await expect(page.getByRole('heading', { level: 1, name: '그래프' })).toBeVisible();
    const graphTab = page.getByRole('tab', { name: '그래프' });
    const listTab = page.getByRole('tab', { name: '목록' });
    await expect(graphTab).toHaveAttribute('aria-selected', 'true');
    expect(undersized(await measureTargets(page, '.graph-tabs [role="tab"]'), TARGET)).toEqual([]);
    await graphTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(listTab).toBeFocused();
    await expect(listTab).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('tabpanel', { name: '목록' });
    await expect(panel).toBeVisible();
    await expect(panel.locator('.graph-list-note')).toHaveCount(await graphNodeCount(page));
    const hubRow = panel.locator('.graph-list-note', {
      has: page.getByRole('link', { name: 'Hub Page', exact: true }),
    });
    await expect(hubRow.getByRole('link', { name: 'Simple Post', exact: true })).toBeVisible();
    expect(undersized(await measureTargets(page, '.graph-list a'), TARGET)).toEqual([]);
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const href = await page.evaluate(() =>
      document.activeElement?.closest('[role="tabpanel"]')
        ? document.activeElement.getAttribute('href')
        : null
    );
    expect(href).toMatch(/^\/(posts|hubs)\//);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  });

  test('legend chips pair a shape and a color with a Korean label, and filter with aria-pressed', async ({
    page,
  }) => {
    await gotoSettled(page, '/writing/graph');
    const legend = page.getByRole('group', { name: '그래프 범례 및 필터' });
    const expected = [
      ['운영체제', 'circle'],
      ['웹', 'square'],
      ['데이터베이스', 'diamond'],
      ['네트워크', 'triangle'],
      ['허브', 'star'],
      ['기타', 'ring'],
    ] as const;
    for (const [label, shape] of expected) {
      const chip = legend.getByRole('button', { name: label, exact: true });
      await expect(chip, label).toHaveAttribute('aria-pressed', 'false');
      await expect(chip.locator(`svg[data-shape="${shape}"]`), label).toHaveCount(1);
    }
    expect(undersized(await measureTargets(page, '.graph-legend-chip'), TARGET)).toEqual([]);
    const hub = legend.getByRole('button', { name: '허브', exact: true });
    await hub.click();
    await expect(hub).toHaveAttribute('aria-pressed', 'true');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`nodes take their category's shape and token color, with 24 px hit areas, ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoSettled(page, '/writing/graph');
      const nodes = page.locator('svg .graph-node');
      await expect(nodes).toHaveCount(await graphNodeCount(page));
      const facts = await nodes.evaluateAll((elements) =>
        elements.map((element) => {
          const shape = element.querySelector<SVGElement>('.graph-node-shape');
          const style = shape ? getComputedStyle(shape) : null;
          const kind = shape?.getAttribute('data-shape') ?? null;
          return {
            category: element.getAttribute('data-category'),
            shape: kind,
            paint: style === null ? null : kind === 'ring' ? style.stroke : style.fill,
            hitRadius: element.querySelector('.graph-node-hit')?.getAttribute('r') ?? null,
          };
        })
      );
      const colors = scheme === 'light' ? LIGHT : DARK;
      const hub = facts.find(({ category }) => category === 'hub');
      expect(hub).toEqual({
        category: 'hub',
        shape: 'star',
        paint: colors.graphHub,
        hitRadius: '12',
      });
      const others = facts.filter(({ category }) => category === 'etc');
      expect(others.length).toBeGreaterThan(0);
      for (const fact of others) {
        expect(fact).toEqual({
          category: 'etc',
          shape: 'ring',
          paint: colors.graphEtc,
          hitRadius: '12',
        });
      }
    });
  }

  test('the graph image names itself and points to the list view', async ({ page }) => {
    await gotoSettled(page, '/writing/graph');
    const image = page.getByRole('img', { name: GRAPH_IMAGE });
    await expect(image).toBeVisible();
    await expect(image).toHaveAccessibleDescription(/목록/);
  });

  test('shows loading until the data arrives (FR4.5)', async ({ page }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/graph.json', async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto('/writing/graph');
    await expect(page.getByText('그래프를 불러오는 중')).toBeVisible();
    release();
    await expect(page.getByRole('img', { name: GRAPH_IMAGE })).toBeVisible();
  });

  test('shows an error with retry when graph.json fails (FR4.5)', async ({ page }) => {
    let fail = true;
    await page.route('**/graph.json', (route) => (fail ? route.abort() : route.continue()));
    await page.goto('/writing/graph');
    await expect(page.getByText('그래프를 불러오지 못했습니다')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.getByRole('img', { name: GRAPH_IMAGE })).toBeVisible();
  });

  test('says so when there is nothing to draw (FR4.5)', async ({ page }) => {
    await page.route('**/graph.json', (route) => route.fulfill({ json: { nodes: [], edges: [] } }));
    await page.goto('/writing/graph');
    await expect(page.getByText('표시할 노트가 없습니다')).toBeVisible();
  });
});

test.describe('related lists and the local graph below a post (W3; FR5.6)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('backlinks and related posts are grouped rows', async ({ page }) => {
    await gotoSettled(page, '/posts/simple-post');
    await expectGroupedRows(page.locator('.backlinks .grouped-list'), 5);
    await expectGroupedRows(page.locator('.related-posts .grouped-list'), 5);
  });

  test('the local graph switches to a keyboard list of the same neighbors', async ({ page }) => {
    await gotoSettled(page, '/posts/simple-post');
    const section = page.locator('section.post-local-graph');
    await section.scrollIntoViewIfNeeded();
    const listTab = section.getByRole('tab', { name: '목록' });
    await expect(section.getByRole('tab', { name: '그래프' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await listTab.click();
    await expect(listTab).toHaveAttribute('aria-selected', 'true');
    const panel = section.getByRole('tabpanel', { name: '목록' });
    await expect(panel).toBeVisible();
    for (const name of ['Hub Page', 'Post With Code', 'Post With Callouts']) {
      await expect(panel.getByRole('link', { name, exact: true }), name).toBeVisible();
    }
    await expect(panel.getByRole('link', { name: 'Simple Post', exact: true })).toHaveCount(0);
    expect(
      undersized(await measureTargets(page, '.post-local-graph [role="tabpanel"] a'), TARGET)
    ).toEqual([]);
    expect(
      undersized(await measureTargets(page, '.post-local-graph [role="tab"]'), TARGET)
    ).toEqual([]);
  });
});

// Loop-back 1 (NFR1; review findings R-05 and R-12). The selected segment is
// ringed in --c-segment-indicator, which hig-tokens.test.ts holds at 3:1
// against the track.
test.describe('selection states (NFR1; R-05, R-12)', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const scheme of ['light', 'dark'] as const) {
    test(`the selected 그래프 | 목록 segment is ringed in --c-segment-indicator, ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoSettled(page, '/writing/graph');
      const shadow = await page
        .locator('.graph-tabs')
        .evaluate((tabs) => getComputedStyle(tabs, '::before').boxShadow);
      expect(shadow).toContain(`${SEGMENT_INDICATOR[scheme]} 0px 0px 0px 1px inset`);
    });

    test(`a current tag chip keeps its name, mark and count at 4.5:1, ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      // interaction-spec.md "Tag Chip" defines the current state, but no route
      // renders it yet, so the test marks one chip current: on the grouped tag
      // index and in a post header on the reading background.
      for (const path of ['/writing/tags', '/posts/post-with-code']) {
        await gotoSettled(page, path);
        await page
          .locator('.tag-chip')
          .first()
          .evaluate((chip) => chip.setAttribute('aria-current', 'page'));
        const pairs = await renderedContrast(
          page,
          '.tag-chip[aria-current="page"], .tag-chip[aria-current="page"] span'
        );
        expect(pairs.length, path).toBeGreaterThan(1);
        expect(
          pairs.filter(({ ratio }) => ratio < 4.5),
          path
        ).toEqual([]);
      }
    });
  }
});

// Loop-back 2 (NFR1-b; review finding R-17; U1 infra R-01). The fixture post
// "Post With Formatting" highlights a real link (==[…](/posts/simple-post/)==),
// so the check runs on rendered markup with no DOM injection. The highlight
// must take the site's fill, not the browser's yellow, and its link must keep
// 4.5:1 on it.
test.describe('a highlighted link in a post (NFR1-b; R-17)', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const scheme of ['light', 'dark'] as const) {
    test(`a highlight takes --c-mark-fill and its link reaches 4.5:1, ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoSettled(page, '/posts/post-with-formatting');
      const mark = page.locator('.post-content mark:has(a)');
      await expect(mark).toHaveCount(1);
      await expect(mark.locator('a')).toHaveAttribute('href', '/posts/simple-post/');
      const expected = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--c-mark-fill)';
        document.body.append(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      });
      await expect(mark).toHaveCSS('background-color', expected);
      const pairs = await renderedContrast(page, '.post-content mark a');
      expect(pairs).toHaveLength(1);
      expect(pairs.filter(({ ratio }) => ratio < 4.5)).toEqual([]);
    });
  }
});

test.describe('desktop page width', () => {
  test.use({ viewport: viewportFor(1440) });

  for (const path of [
    '/',
    '/hubs/hub-page',
    '/writing/tags',
    '/writing/tags/test',
    '/posts/simple-post',
  ]) {
    test(`${path} widens to the floating bar instead of keeping the phone measure`, async ({
      page,
    }) => {
      await gotoSettled(page, path);
      const width = await page
        .locator('.site-main')
        .evaluate((main) => main.getBoundingClientRect().width);
      expect(width).toBeGreaterThan(1090);
      expect(width).toBeLessThanOrEqual(1100);
    });
  }
});

test.describe('narrow widths', () => {
  test.use({ viewport: viewportFor(320) });

  for (const path of [
    '/',
    '/hubs/hub-page',
    '/hubs/empty-hub',
    '/writing/tags',
    '/writing/tags/test',
    '/404',
    '/writing/graph',
  ]) {
    test(`${path} never scrolls sideways at 320 px`, async ({ page }) => {
      await gotoSettled(page, path);
      const report = await horizontalOverflow(page);
      expect(report.offenders).toEqual([]);
      expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth + 1);
    });
  }
});

// U3: the tag index, a tag page and the graph, moved under /writing (rules.md
// BR1.1–BR1.3, BR4.1, BR4.2; NFR1.15, NFR2.4, NFR6.14). Each keeps its content
// and gains one "‹ Writing" back link above the Large Title; the axe matrix,
// chrome targets and reduced motion reach them through HIG_ROUTES.
const MOVED_ROUTES = Object.freeze([
  { path: '/writing/tags', title: '태그' },
  { path: '/writing/tags/test', title: '#test' },
  { path: '/writing/graph', title: '그래프' },
] as const);

const fonts = (subsets: readonly number[]): string[] => subsets.map((n) => `font:${n}`);
/** The shared chrome's islands and their runtime: theme toggle (load) and search (idle). */
const CHROME_SCRIPTS = Object.freeze([
  'js:ThemeToggle',
  'js:client',
  'js:preact.module',
  'js:hooks.module',
  'js:jsxRuntime.module',
  'js:createLucideIcon',
  'js:Search',
  'js:modal',
]);
/**
 * The logical requests of each moved route (performance-design.md §3.3),
 * measured on the routes they replace (/tags, /tags/test, /graph) before the
 * move: the move adds no request and drops none (NFR6.14).
 */
const EXPECTED_REQUESTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  '/writing/tags': [
    'document',
    'css:BaseLayout',
    ...CHROME_SCRIPTS,
    ...fonts([84, 87, 88, 89, 90, 91]),
  ],
  '/writing/tags/test': [
    'document',
    'css:BaseLayout',
    ...CHROME_SCRIPTS,
    ...fonts([81, 82, 84, 85, 86, 87, 88, 89, 90, 91]),
  ],
  '/writing/graph': [
    'document',
    'css:BaseLayout',
    'css:graph',
    ...CHROME_SCRIPTS,
    'js:graph.astro_astro_type_script_index_0_lang',
    'js:GraphView',
    'js:tabs',
    'js:graphSim',
    ...fonts([80, 81, 84, 86, 87, 88, 89, 90, 91]),
    'data:graph.json',
  ],
});

/** One logical resource per request: content hashes are ignored, names are not. */
function logicalResource(route: string, pathname: string): string {
  if (pathname === route) return 'document';
  if (pathname === '/graph.json') return 'data:graph.json';
  const font = /^\/_astro\/PretendardVariable\.subset\.(\d+)\.[\w-]+\.woff2$/.exec(pathname);
  if (font) return `font:${font[1]}`;
  const asset = /^\/_astro\/(.+)\.[\w-]+\.(css|js)$/.exec(pathname);
  if (asset) return `${asset[2]}:${asset[1]}`;
  return `other:${pathname}`;
}

test.describe('moved discovery pages (U3; BR1.1, BR1.2, BR4.1, BR4.2)', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const route of MOVED_ROUTES) {
    test(`${route.path}: one h1, and a 44 px back link to /writing above it`, async ({ page }) => {
      expect(await gotoSettled(page, route.path)).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible();
      const back = page.getByTestId('back-link');
      await expect(back).toHaveCount(1);
      await expect(back).toHaveAttribute('href', '/writing');
      await expect(back).toHaveText('Writing');
      expect(undersized(await measureTargets(page, '[data-testid="back-link"]'), TARGET)).toEqual(
        []
      );
      const backBox = await back.boundingBox();
      const titleBox = await page.locator('h1').boundingBox();
      expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(titleBox!.y + 0.5);
      await back.click();
      await expect(page).toHaveURL(/\/writing$/);
    });

    test(`${route.path}: the back link has a visible focus ring`, async ({ page, browserName }) => {
      await gotoSettled(page, route.path);
      const back = page.getByTestId('back-link');
      // WebKit's default Tab skips links, as Safari does; Option-Tab reaches them.
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      let reached = false;
      for (let presses = 0; presses < 40 && !reached; presses += 1) {
        await page.keyboard.press(tab);
        reached = await back.evaluate((element) => element === document.activeElement);
      }
      expect(reached, 'the back link is in the tab order').toBe(true);
      const ring = await back.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
      });
      expect(ring.style).not.toBe('none');
      expect(ring.width).toBeGreaterThanOrEqual(2);
    });

    test(`${route.path}: the bar marks Writing as the current section`, async ({ page }) => {
      await gotoSettled(page, route.path);
      const marks = await page
        .locator('.desktop-nav a')
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('aria-current'))
            .filter((value): value is string => value !== null)
        );
      expect(marks).toEqual(['true']);
    });

    test(`${route.path}: the same requests as the route it replaces, all on its own origin`, async ({
      page,
      baseURL,
      browserName,
    }) => {
      // Which font subsets an engine fetches follows its unicode-range
      // handling, so the fixed list is Chromium's, as in the performance spec.
      test.skip(browserName !== 'chromium', 'the request list is measured in Chromium');
      const own = new URL(baseURL ?? 'http://127.0.0.1:4329').origin;
      const requests: URL[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol !== 'data:') requests.push(url);
      });
      await gotoSettled(page, route.path);
      expect(requests.filter((url) => url.origin !== own).map(String)).toEqual([]);
      const logical = requests.map((url) => logicalResource(route.path, url.pathname));
      const expected = EXPECTED_REQUESTS[route.path] ?? [];
      expect([...logical].sort()).toEqual([...expected].sort());
      expect(logical).toHaveLength(expected.length);
    });
  }
});

// U3: the old addresses over HTTP, against the production server this suite
// runs (rules.md BR3.2, BR3.3; NFR5.22; contract C5). The 301 carries
// Cache-Control: no-cache so a rollback can undo it (NFR design diary
// 2026-11-20T00:55).
test.describe('old addresses over HTTP (U3; BR3.2, BR3.3)', () => {
  const REDIRECTS = Object.freeze([
    ['/tags', '/writing/tags'],
    ['/tags/', '/writing/tags'],
    ['/graph', '/writing/graph'],
    ['/graph/', '/writing/graph'],
    ['/tags/test', '/writing/tags/test'],
    ['/tags/test/', '/writing/tags/test'],
  ] as const);

  test('each old address answers 301 with its new Location and no-cache', async ({ request }) => {
    for (const [from, to] of REDIRECTS) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(301);
      expect(response.headers()['location'], from).toBe(to);
      expect(response.headers()['cache-control'], from).toBe('no-cache');
    }
  });

  test('the query is kept, byte for byte', async ({ request }) => {
    for (const [from, to] of [
      ['/tags?from=post', '/writing/tags?from=post'],
      ['/tags/test/?q=%ED%95%9C', '/writing/tags/test?q=%ED%95%9C'],
    ] as const) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(301);
      expect(response.headers()['location'], from).toBe(to);
    }
  });

  test('/graph.json is a file, an unknown tag is 404, an encoded control byte is 400', async ({
    request,
  }) => {
    const data = await request.get('/graph.json', { maxRedirects: 0 });
    expect(data.status()).toBe(200);
    expect(data.headers()['content-type']).toBe('application/json; charset=utf-8');
    expect(data.headers()['location']).toBeUndefined();
    const unknown = await request.get('/tags/nonexistent', { maxRedirects: 0 });
    expect(unknown.status()).toBe(404);
    expect(unknown.headers()['location']).toBeUndefined();
    const hostile = await request.get('/tags?x=%0d%0a', { maxRedirects: 0 });
    expect(hostile.status()).toBe(400);
    expect(hostile.headers()['location']).toBeUndefined();
    // The server keeps answering after the refusal.
    expect((await request.get('/tags', { maxRedirects: 0 })).status()).toBe(301);
  });

  test('a browser following an old address lands on the new page', async ({ page }) => {
    await page.goto('/tags/test?from=post');
    await expect(page).toHaveURL(/\/writing\/tags\/test\?from=post$/);
    await expect(page.getByRole('heading', { level: 1, name: '#test' })).toBeVisible();
  });
});

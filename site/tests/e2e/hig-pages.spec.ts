// Other blog pages (FR4.3, FR4.5, FR5.6, FR5.8; mockups W5–W8 and W11;
// interaction-spec.md "Grouped List and Post Row", "Tag Chip", "Graph View and
// Local Graph", "Segmented Control"). Colors are the light tokens of
// tokens.css unless a test emulates dark.
import { expect, test, type Locator, type Page } from '@playwright/test';
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

test.describe('homepage (W5)', () => {
  test.use({ viewport: viewportFor(1024) });

  test('a Large Title, then the note sections and the profile as cards on the grouped background', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    await expect(page.getByRole('heading', { level: 1, name: 'obsidian-press' })).toBeVisible();
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
    await expect(page.locator('.home-card')).toHaveCount(2);
    const looks = await page
      .locator('.home-card, .home-profile, .recent-posts')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, radius: style.borderTopLeftRadius };
        })
      );
    expect(looks).toHaveLength(4);
    for (const look of looks) expect(look).toEqual(looks[0]);
    expect(looks[0]!.background).toBe(LIGHT.surface);
  });

  test('오늘 발행된 글 keeps its empty message as secondary text inside the card (FR4.5)', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    const section = page.locator('.recent-posts');
    await expect(section.getByRole('heading', { name: '오늘 발행된 글' })).toBeVisible();
    const empty = section.getByText('오늘 발행된 글이 없습니다.');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveCSS('color', LIGHT.textSecondary);
  });

  test('the profile actions are 44 px capsules and note links keep the token tint', async ({
    page,
  }) => {
    await gotoSettled(page, '/');
    await expect(page.locator('.home-profile-actions a')).toHaveCount(2);
    expect(undersized(await measureTargets(page, '.home-profile-actions a'), TARGET)).toEqual([]);
    // The is:global override in index.astro painted these --c-tint-hover (FR4.3).
    await expect(page.locator('.home-content a').first()).toHaveCSS('color', LIGHT.tint);
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
    await gotoSettled(page, '/tags');
    expect(await pageBackground(page)).toBe(LIGHT.bgGrouped);
    await expect(page.getByRole('heading', { level: 1, name: '태그' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'test, 글 11개' })).toHaveAttribute(
      'href',
      '/tags/test'
    );
    const chips = await measureTargets(page, '.tag-chip');
    expect(chips.length).toBeGreaterThan(5);
    expect(undersized(chips, TARGET)).toEqual([]);
  });

  test('a tag page lists its posts as grouped rows without nested tag links', async ({ page }) => {
    await gotoSettled(page, '/tags/test');
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
    await gotoSettled(page, '/graph');
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
    await gotoSettled(page, '/graph');
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
      await gotoSettled(page, '/graph');
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
    await gotoSettled(page, '/graph');
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
    await page.goto('/graph');
    await expect(page.getByText('그래프를 불러오는 중')).toBeVisible();
    release();
    await expect(page.getByRole('img', { name: GRAPH_IMAGE })).toBeVisible();
  });

  test('shows an error with retry when graph.json fails (FR4.5)', async ({ page }) => {
    let fail = true;
    await page.route('**/graph.json', (route) => (fail ? route.abort() : route.continue()));
    await page.goto('/graph');
    await expect(page.getByText('그래프를 불러오지 못했습니다')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.getByRole('img', { name: GRAPH_IMAGE })).toBeVisible();
  });

  test('says so when there is nothing to draw (FR4.5)', async ({ page }) => {
    await page.route('**/graph.json', (route) => route.fulfill({ json: { nodes: [], edges: [] } }));
    await page.goto('/graph');
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
      await gotoSettled(page, '/graph');
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
      for (const path of ['/tags', '/posts/post-with-code']) {
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

// Loop-back 2 (NFR1-b; review finding R-17). No fixture note highlights a link,
// so the test wraps the homepage note's link in <mark>, the markup ==[[…]]==
// renders to. The note must take the site's highlight, not the browser's
// yellow, and its link must keep 4.5:1 on it.
test.describe('highlights in the homepage note (NFR1-b; R-17)', () => {
  test.use({ viewport: viewportFor(1024) });

  for (const scheme of ['light', 'dark'] as const) {
    test(`a highlight takes --c-mark-fill and its link reaches 4.5:1, ${scheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoSettled(page, '/');
      await page
        .locator('.home-content p a')
        .first()
        .evaluate((link) => {
          const mark = document.createElement('mark');
          link.replaceWith(mark);
          mark.append(link);
        });
      const mark = page.locator('.home-content mark');
      const expected = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--c-mark-fill)';
        document.body.append(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      });
      await expect(mark).toHaveCSS('background-color', expected);
      const pairs = await renderedContrast(page, '.home-content mark a');
      expect(pairs).toHaveLength(1);
      expect(pairs.filter(({ ratio }) => ratio < 4.5)).toEqual([]);
    });
  }
});

test.describe('desktop page width', () => {
  test.use({ viewport: viewportFor(1440) });

  for (const path of ['/', '/hubs/hub-page', '/tags', '/tags/test', '/posts/simple-post']) {
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
    '/tags',
    '/tags/test',
    '/404',
    '/graph',
  ]) {
    test(`${path} never scrolls sideways at 320 px`, async ({ page }) => {
      await gotoSettled(page, path);
      const report = await horizontalOverflow(page);
      expect(report.offenders).toEqual([]);
      expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth + 1);
    });
  }
});

import { expect, test } from '@playwright/test';
import { recordEvidenceFragment } from './support/evidence.js';
import { PRINT_PAPER_FORMATS, printKey } from './support/matrix.js';
import {
  applyDetailsState,
  gotoRoute,
  playwrightVersion,
} from './support/profile-page.js';

const SPEC_FILE = 'profile-print.spec.ts';
const PRINT_ROUTE = '/resume';

const completed: string[] = [];
const pageCounts = new Map<string, number>();

/**
 * Counts pages from the produced bytes with the same PDF.js build the later
 * inspection step is pinned to, so the page-count report is read out of the
 * document rather than inferred from layout.
 */
async function countPdfPages(bytes: Uint8Array): Promise<number> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
}

test.describe('print contract', () => {
  test('print media expands closed disclosures and drops site chrome', async ({
    page,
  }) => {
    await gotoRoute(page, PRINT_ROUTE);
    // Deliberately leave every disclosure closed: print must not depend on the
    // reader having expanded anything on screen.
    await applyDetailsState(page, 'closed');
    await page.emulateMedia({ media: 'print' });

    const printed = await page.evaluate(() => {
      const entries = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          'details.resume-entry',
        ),
      ];
      const header = document.querySelector('header.site-header');
      return {
        entryCount: entries.length,
        openCount: entries.filter((entry) => entry.open).length,
        hiddenDetailContent: entries.filter((entry) => {
          const content = entry.querySelector<HTMLElement>(
            '.resume-entry-detail-content',
          );
          return (
            content === null ||
            window.getComputedStyle(content).display === 'none'
          );
        }).length,
        breakInsideRespected: entries.every((entry) =>
          ['avoid-page', 'avoid'].includes(
            window.getComputedStyle(entry).breakInside,
          ),
        ),
        headerDisplay:
          header === null
            ? 'none'
            : window.getComputedStyle(header).display,
      };
    });

    expect(printed.entryCount).toBeGreaterThan(0);
    expect(printed.openCount, 'the on-screen state stays closed').toBe(0);
    expect(
      printed.hiddenDetailContent,
      'every closed disclosure must still print its content',
    ).toBe(0);
    expect(
      printed.breakInsideRespected,
      'résumé entries must not break across pages',
    ).toBe(true);
    expect(printed.headerDisplay, 'site chrome must not print').toBe('none');

    await page.emulateMedia({ media: null });
  });

  for (const paperFormat of PRINT_PAPER_FORMATS) {
    test(`${PRINT_ROUTE} paginates on ${paperFormat}`, async ({ page }) => {
      await gotoRoute(page, PRINT_ROUTE);
      await applyDetailsState(page, 'closed');

      const bytes = await page.pdf({
        format: paperFormat,
        printBackground: true,
        preferCSSPageSize: true,
      });
      expect(
        bytes.byteLength,
        `${paperFormat} must produce a document`,
      ).toBeGreaterThan(0);

      const pageCount = await countPdfPages(new Uint8Array(bytes));
      expect(
        pageCount,
        `${paperFormat} must paginate to at least one page`,
      ).toBeGreaterThan(0);
      pageCounts.set(paperFormat, pageCount);

      completed.push(printKey(paperFormat));
    });
  }

  test.afterAll(async () => {
    if (completed.length !== PRINT_PAPER_FORMATS.length) return;
    // The page count is reported, not asserted against a fixed number: paper
    // size and font metrics legitimately move it, and pinning it here would
    // make the suite fail for reasons that are not defects.
    process.stdout.write(
      `${JSON.stringify({
        report: 'print-page-count',
        route: PRINT_ROUTE,
        pages: Object.fromEntries(pageCounts),
      })}\n`,
    );
    await recordEvidenceFragment({
      specFile: SPEC_FILE,
      project: 'chromium',
      matrixKeys: [...completed].sort(),
      obligations: { 'print-contract': 'pass' },
      tools: { playwright: await playwrightVersion() },
    });
  });
});

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { PROFILE_PATHS } from './profile-paths.mjs';
import { installRequestLedger } from './request-ledger.mjs';

const RENDER_RULE = 'AC-U03-01/NFR-U1-005';
const RESUME_ROUTE = '/resume';
const PAPER = 'A4';
const MARGIN_MM = 12;
const DEFAULT_RENDER_TIMEOUT_MS = 120_000;
const LOOPBACK_HOSTS = Object.freeze(['127.0.0.1', 'localhost']);
const WOFF2_MIME = 'font/woff2';

/**
 * Screen-only chrome. Print must omit every one of these: a résumé that prints
 * its own site header is not a résumé.
 */
const SCREEN_ONLY_SELECTORS = Object.freeze([
  '.site-header',
  '.site-footer',
  '.profile-local-navigation',
  '.reading-progress',
  '.skip-link',
  '[data-profile-action-kind="document"]',
]);

const AVOID_BREAK = Object.freeze(['avoid-page', 'avoid']);

export class ResumePdfRendererError extends Error {
  constructor(message, { code, stage, details = {}, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ResumePdfRendererError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = RENDER_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function rendererError(code, message, stage, details, cause) {
  return new ResumePdfRendererError(message, { code, stage, details, cause });
}

function requireSupervisedOrigin(baseURL) {
  let url;
  try {
    url = new URL(baseURL);
  } catch (cause) {
    throw rendererError(
      'PDF_RENDER_BASE_URL_INVALID',
      'The candidate may only be rendered from one supervised loopback preview.',
      'pdf.render.origin',
      {},
      cause,
    );
  }
  if (!LOOPBACK_HOSTS.includes(url.hostname)) {
    throw rendererError(
      'PDF_RENDER_ORIGIN_NOT_LOOPBACK',
      'The candidate may only be rendered from one supervised loopback preview.',
      'pdf.render.origin',
      { hostname: url.hostname },
    );
  }
  return url.origin;
}

/**
 * Renders the private résumé candidate.
 *
 * The renderer owns three of the seven machine-check groups — `font`, `network`
 * and `print`. The other four are counts only the inspector and the mapper can
 * establish, so they are deliberately absent here rather than guessed.
 */
export async function renderResumePdfCandidate({
  baseURL,
  buildIdentity,
  emittedAssets = [],
  timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
} = {}) {
  requireSupervisedOrigin(baseURL);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError('timeoutMs must be a positive safe integer');
  }

  const browser = await chromium.launch({ headless: true });
  const chromiumVersion = browser.version();
  let context;
  let ledger;
  let fontResponse = null;

  try {
    context = await browser.newContext({ baseURL });
    ledger = await installRequestLedger(context, {
      baseURL,
      emittedAssets,
      buildIdentity,
    });

    // Recorded before the first navigation so the font's own response — not a
    // later re-request — is what the receipt reports.
    context.on('response', (response) => {
      if (fontResponse !== null) return;
      if (!response.url().endsWith('.woff2')) return;
      fontResponse = {
        ok: response.ok(),
        status: response.status(),
        mime: (response.headers()['content-type'] ?? '').split(';')[0].trim(),
      };
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    const navigation = await page.goto(RESUME_ROUTE, { waitUntil: 'load' });
    if (navigation === null || navigation.status() !== 200) {
      throw rendererError(
        'PDF_RENDER_ROUTE_NOT_READY',
        'The résumé route did not answer 200 on the supervised preview.',
        'pdf.render.navigate',
        { status: navigation?.status() ?? null },
      );
    }
    await page.waitForLoadState('networkidle');

    const font = await observeFontReadiness(page, fontResponse);

    // A closed <details> is hidden by the user agent with content-visibility
    // on its slot, which overriding `display` on a descendant does not defeat:
    // the computed style reads `block` while nothing is painted. The candidate
    // is therefore printed with every disclosure genuinely open.
    await page.evaluate(() => {
      const shell = document.querySelector('.profile-shell');
      for (const element of shell?.querySelectorAll('details') ?? []) {
        element.open = true;
      }
    });

    await page.emulateMedia({ media: 'print' });
    const print = await observePrintContract(page);
    const skeleton = await observeSurfaceSkeleton(page);
    await page.emulateMedia({ media: null });

    const bytes = await page.pdf({
      format: PAPER,
      margin: {
        top: `${MARGIN_MM}mm`,
        right: `${MARGIN_MM}mm`,
        bottom: `${MARGIN_MM}mm`,
        left: `${MARGIN_MM}mm`,
      },
      preferCSSPageSize: true,
      printBackground: false,
      tagged: true,
      outline: true,
    });
    if (bytes.byteLength === 0) {
      throw rendererError(
        'PDF_RENDER_EMPTY',
        'The renderer produced an empty candidate.',
        'pdf.render.print',
      );
    }

    // Every subresource must have settled before the page goes away, or the
    // ledger would record an attempt with no matching response.
    await page.waitForLoadState('networkidle');
    await page.close();

    const requestLedger = await ledger.finalize({
      requireProfileRoutes: false,
    });
    const network = Object.freeze({
      loopbackOnly: true,
      successfulNonLoopbackRequests: requestLedger.external.successful,
    });
    if (network.successfulNonLoopbackRequests !== 0) {
      throw rendererError(
        'PDF_RENDER_NON_LOOPBACK_RESPONSE',
        'A non-loopback response was observed while rendering the candidate.',
        'pdf.render.network',
        { successful: network.successfulNonLoopbackRequests },
      );
    }

    const pdfSha256 = sha256(bytes);
    const candidateId = deriveCandidateId(buildIdentity, pdfSha256);
    const candidatePath = resolve(
      PROFILE_PATHS.pdfCandidateRoot,
      `${candidateId}.pdf`,
    );
    await mkdir(PROFILE_PATHS.pdfCandidateRoot, { recursive: true });
    await writeFile(candidatePath, bytes);

    return Object.freeze({
      rule: RENDER_RULE,
      candidate: Object.freeze({ candidateId, pdfSha256 }),
      candidatePath,
      bytes,
      skeleton,
      machineChecks: Object.freeze({ font, network, print }),
      tools: Object.freeze({
        node: process.versions.node,
        chromium: chromiumVersion,
      }),
      requestLedger,
    });
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function observeFontReadiness(page, fontResponse) {
  const observed = await page.evaluate(async () => {
    await document.fonts.ready;
    const family = window
      .getComputedStyle(document.body)
      .fontFamily.split(',')[0]
      .replace(/["']/g, '')
      .trim();
    return {
      family,
      fontsReady: true,
      // The résumé prints at 10pt; asking about the size it actually uses is
      // what makes this check mean "the Korean glyphs are available".
      fontsCheck: document.fonts.check(`10pt "${family}"`),
    };
  });

  if (fontResponse === null || !fontResponse.ok) {
    throw rendererError(
      'PDF_RENDER_FONT_NOT_SERVED',
      'The pinned profile font was not served by the supervised preview.',
      'pdf.render.font',
      { response: fontResponse },
    );
  }
  if (fontResponse.mime !== WOFF2_MIME) {
    throw rendererError(
      'PDF_RENDER_FONT_MIME_UNEXPECTED',
      'The profile font was served with an unexpected media type.',
      'pdf.render.font',
      { mime: fontResponse.mime },
    );
  }
  if (!observed.fontsCheck) {
    throw rendererError(
      'PDF_RENDER_FONT_NOT_READY',
      'The profile font was not usable at résumé body size when printing began.',
      'pdf.render.font',
      { family: observed.family },
    );
  }

  return Object.freeze({
    family: observed.family,
    responseOk: true,
    mime: WOFF2_MIME,
    fontsReady: true,
    fontsCheck: true,
  });
}

async function observePrintContract(page) {
  const observed = await page.evaluate(
    ({ screenOnlySelectors, avoidBreak }) => {
      const PX_PER_PT = 96 / 72;
      const shell = document.querySelector('.profile-shell');
      if (shell === null) return null;

      const textElements = [
        ...shell.querySelectorAll('p, li, span, dd, dt, td, th'),
      ].filter((element) => (element.textContent ?? '').trim().length > 0);

      let minimumPt = Number.POSITIVE_INFINITY;
      let minimumLineHeight = Number.POSITIVE_INFINITY;
      for (const element of textElements) {
        const style = window.getComputedStyle(element);
        const fontPx = Number.parseFloat(style.fontSize);
        if (!Number.isFinite(fontPx) || fontPx <= 0) continue;
        minimumPt = Math.min(minimumPt, fontPx / PX_PER_PT);
        const lineHeightPx = Number.parseFloat(style.lineHeight);
        if (Number.isFinite(lineHeightPx) && lineHeightPx > 0) {
          minimumLineHeight = Math.min(
            minimumLineHeight,
            lineHeightPx / fontPx,
          );
        }
      }

      const shown = screenOnlySelectors.filter((selector) =>
        [...document.querySelectorAll(selector)].some(
          (element) => window.getComputedStyle(element).display !== 'none',
        ),
      );

      const detailContents = [
        ...shell.querySelectorAll('.resume-entry-detail-content'),
      ];
      const entries = [...shell.querySelectorAll('details.resume-entry')];
      const headings = [
        ...shell.querySelectorAll(
          '.profile-section h2, .profile-section h3, .profile-section h4, .profile-section h5',
        ),
      ];

      const clipped = [...shell.querySelectorAll('*')].filter((element) => {
        const style = window.getComputedStyle(element);
        return (
          style.textOverflow === 'ellipsis' ||
          (['hidden', 'clip'].includes(style.overflowX) &&
            element.scrollWidth > element.clientWidth + 1)
        );
      });

      return {
        bodyTextMinimumPt: Number.isFinite(minimumPt) ? minimumPt : 0,
        lineHeightMinimum: Number.isFinite(minimumLineHeight)
          ? minimumLineHeight
          : 0,
        screenOnlyShown: shown,
        detailContentCount: detailContents.length,
        // Measured as real layout, not as computed `display`. A hidden
        // disclosure still reports `display: block`, so only a box with height
        // proves the content will actually be on the page.
        detailsCollapsed: detailContents.filter(
          (element) => element.getBoundingClientRect().height <= 0,
        ).length,
        entryCount: entries.length,
        entriesSplittable: entries.filter(
          (element) =>
            !avoidBreak.includes(window.getComputedStyle(element).breakInside),
        ).length,
        longDetailsUnsplittable: detailContents.filter(
          (element) => window.getComputedStyle(element).breakInside !== 'auto',
        ).length,
        headingCount: headings.length,
        headingsUnkept: headings.filter(
          (element) =>
            !avoidBreak.includes(window.getComputedStyle(element).breakAfter),
        ).length,
        clippedCount: clipped.length,
      };
    },
    {
      screenOnlySelectors: [...SCREEN_ONLY_SELECTORS],
      avoidBreak: [...AVOID_BREAK],
    },
  );

  if (observed === null) {
    throw rendererError(
      'PDF_RENDER_SHELL_MISSING',
      'The résumé shell was absent when the print contract was measured.',
      'pdf.render.print',
    );
  }

  requirePrintFact(
    observed.screenOnlyShown.length === 0,
    'PDF_RENDER_SCREEN_ONLY_PRINTED',
    'Screen-only chrome would print into the candidate.',
    { shown: observed.screenOnlyShown },
  );
  requirePrintFact(
    observed.detailContentCount > 0 && observed.detailsCollapsed === 0,
    'PDF_RENDER_DETAILS_COLLAPSED',
    'A disclosure would print collapsed, hiding approved résumé content.',
    {
      detailContentCount: observed.detailContentCount,
      collapsed: observed.detailsCollapsed,
    },
  );
  requirePrintFact(
    observed.entryCount > 0 && observed.entriesSplittable === 0,
    'PDF_RENDER_ENTRY_SPLITTABLE',
    'A résumé entry would break across pages.',
    { entryCount: observed.entryCount, splittable: observed.entriesSplittable },
  );
  requirePrintFact(
    observed.longDetailsUnsplittable === 0,
    'PDF_RENDER_LONG_DETAIL_UNSPLITTABLE',
    'A long detail body may not refuse to break; only entries are atomic.',
    { unsplittable: observed.longDetailsUnsplittable },
  );
  requirePrintFact(
    observed.headingCount > 0 && observed.headingsUnkept === 0,
    'PDF_RENDER_HEADING_ORPHANED',
    'A heading could be separated from the block it introduces.',
    { headingCount: observed.headingCount, unkept: observed.headingsUnkept },
  );
  requirePrintFact(
    observed.clippedCount === 0,
    'PDF_RENDER_CONTENT_CLIPPED',
    'Print layout would clip or ellipsise approved content.',
    { clipped: observed.clippedCount },
  );

  return Object.freeze({
    paper: PAPER,
    marginMm: MARGIN_MM,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    printBackground: false,
    detailsExpanded: true,
    screenOnlyOmitted: true,
    noClipping: true,
    bodyTextMinimumPt: observed.bodyTextMinimumPt,
    lineHeightMinimum: observed.lineHeightMinimum,
    entriesUnsplittable: true,
    longDetailsSplittable: true,
    headingFirstBlockKept: true,
  });
}

/**
 * Observes the ordinal skeleton from the printed document itself.
 *
 * Chromium does not carry `data-profile-entity-*` into the PDF, and the tag
 * tree cannot separate a contact link from a skill: both are `L > LI`, yet one
 * has no entity and the other is an entity of its own. The ordinals therefore
 * come from the rendered document, not from the approved manifest — taking
 * them from the answer key would let a PDF that disagrees with the document
 * still pass.
 */
async function observeSurfaceSkeleton(page) {
  const observed = await page.evaluate(() => {
    const SECTION = '[data-profile-section]';
    const ENTITY = '[data-profile-entity-kind][data-profile-entity-id]';
    const FACT_ATTRIBUTES = [
      'data-profile-fact-id',
      'data-profile-label-fact-id',
      'data-profile-destination-fact-id',
    ];
    const FACT = FACT_ATTRIBUTES.map((name) => `[${name}]`).join(',');

    const shell = document.querySelector('.profile-shell');
    if (shell === null) return null;

    const sectionElements = [...shell.querySelectorAll(SECTION)];
    const entityElements = [...shell.querySelectorAll(ENTITY)];
    const sectionOf = new Map(
      sectionElements.map((element, index) => [element, index]),
    );
    const entityOf = new Map(
      entityElements.map((element, index) => [element, index]),
    );
    const ordinalOf = (element, selector, table) => {
      const owner = element?.closest(selector) ?? null;
      return owner === null ? null : (table.get(owner) ?? null);
    };
    const visibleText = (element) =>
      (element.textContent ?? '').replace(/\s+/gu, ' ').trim();

    const facts = [];
    for (const element of shell.querySelectorAll(FACT)) {
      for (const attribute of FACT_ATTRIBUTES) {
        if (!element.hasAttribute(attribute)) continue;
        facts.push({
          factOrder: facts.length + 1,
          sectionOrdinal: ordinalOf(element, SECTION, sectionOf),
          entityOrdinal: ordinalOf(element, ENTITY, entityOf),
          text: visibleText(element),
          href: element.getAttribute('href'),
        });
      }
    }

    return {
      sections: sectionElements.map((_, index) => ({ sectionOrdinal: index })),
      entities: entityElements.map((element, index) => ({
        entityOrdinal: index,
        sectionOrdinal: ordinalOf(element, SECTION, sectionOf),
        // `closest` from the element itself would find the entity again, so the
        // search for an enclosing entity starts at the parent.
        parentEntityOrdinal: ordinalOf(element.parentElement, ENTITY, entityOf),
      })),
      facts,
    };
  });

  if (observed === null) {
    throw rendererError(
      'PDF_RENDER_SHELL_MISSING',
      'The résumé shell was absent when the ordinal skeleton was observed.',
      'pdf.render.skeleton',
    );
  }
  for (const fact of observed.facts) {
    if (fact.sectionOrdinal === null) {
      throw rendererError(
        'PDF_RENDER_FACT_OUTSIDE_SECTION',
        'A rendered fact does not belong to any profile section.',
        'pdf.render.skeleton',
        { factOrder: fact.factOrder },
      );
    }
  }

  return deepFreezeSkeleton(observed);
}

function deepFreezeSkeleton(skeleton) {
  return Object.freeze({
    sections: Object.freeze(skeleton.sections.map(Object.freeze)),
    entities: Object.freeze(skeleton.entities.map(Object.freeze)),
    facts: Object.freeze(skeleton.facts.map(Object.freeze)),
  });
}

function requirePrintFact(held, code, message, details) {
  if (held) return;
  throw rendererError(code, message, 'pdf.render.print', details);
}

/**
 * A candidate is identified by the build it came from and the exact bytes it
 * is. Deriving rather than minting means the same build and the same bytes
 * always name the same candidate.
 */
function deriveCandidateId(buildIdentity, pdfSha256) {
  const buildId = buildIdentity?.id;
  if (typeof buildId !== 'string' || buildId.length === 0) {
    throw rendererError(
      'PDF_RENDER_BUILD_IDENTITY_INVALID',
      'A candidate must be attributed to one clean build.',
      'pdf.render.identity',
    );
  }
  return sha256(Buffer.from(JSON.stringify({ buildId, pdfSha256 })));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export const resumePdfRendererTesting = Object.freeze({
  deriveCandidateId,
  requireSupervisedOrigin,
  SCREEN_ONLY_SELECTORS,
});

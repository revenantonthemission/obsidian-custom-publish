import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import obligationMap from '../obligations/u1-profile.json';

interface CanonicalTest {
  readonly id: string;
  readonly path: string;
  readonly kind: string;
  readonly semanticPropertyId?: string;
}

/**
 * Declared rather than inferred, because the list is now empty: TypeScript
 * infers `never[]` from the JSON and every field access becomes an error. The
 * shape has to outlive the entries so a future deferral still type-checks.
 */
interface DeferredCoverage {
  readonly ids: readonly string[];
  readonly canonicalTestId: string;
  readonly remainingStep: number;
  readonly rationale: string;
}

const requiredObligationIds = [
  ...rangeIds('U1-P', 1, 12),
  ...rangeIds('DE-P', 1, 15),
  ...rangeIds('NFR-U1-', 1, 15, 3),
  ...rangeIds('AC-U02-', 1, 4, 2),
  ...rangeIds('AC-U03-', 1, 4, 2),
  ...rangeIds('AC-U04-', 1, 4, 2),
  ...rangeIds('AC-U05-', 1, 4, 2),
  ...rangeIds('AC-E01-', 1, 4, 2),
  ...rangeIds('AC-E02-', 1, 4, 2),
  ...rangeIds('AC-E03-', 1, 4, 2),
  'AC-U01-02',
  'AC-U01-03',
  'AC-U01-04',
  'EDGE-001',
  'EDGE-002',
  'EDGE-003',
  'EDGE-004',
  'EDGE-005',
  'EDGE-006',
  'EDGE-008',
  'EDGE-009',
  'EDGE-010',
  'EDGE-011',
] as const;

describe('U1 obligation map', () => {
  test('contains every required obligation exactly once', () => {
    const ids = obligationMap.obligations.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of requiredObligationIds) {
      expect(ids, `missing obligation ${id}`).toContain(id);
    }
  });

  test('references only unique canonical tests and semantic properties', () => {
    const canonicalTests = obligationMap.canonicalTests as CanonicalTest[];
    const canonicalIds = canonicalTests.map(({ id }) => id);
    const semanticIds = canonicalTests
      .map(({ semanticPropertyId }) => semanticPropertyId)
      .filter((value): value is string => Boolean(value));

    expect(new Set(canonicalIds).size).toBe(canonicalIds.length);
    expect(new Set(semanticIds).size).toBe(semanticIds.length);

    for (const obligation of obligationMap.obligations) {
      expect(canonicalIds, `unknown canonical test ${obligation.canonicalTestId}`).toContain(
        obligation.canonicalTestId,
      );
    }
  });

  test('uses stable repository-local test paths', () => {
    const canonicalTests = obligationMap.canonicalTests as CanonicalTest[];
    for (const canonicalTest of canonicalTests) {
      expect(canonicalTest.path).toMatch(
        /^tests\/(?:unit\/[^/]+\.test\.ts|pbt\/u1\/[^/]+\.pbt\.test\.ts|e2e\/[^/]+\.spec\.ts)$/,
      );

      if (process.env.U1_VERIFY_OBLIGATION_PATHS === '1') {
        expect(
          existsSync(resolve(process.cwd(), canonicalTest.path)),
          `missing canonical test path ${canonicalTest.path}`,
        ).toBe(true);
      }
    }
  });

  test('documents every PBT N/A decision with a rationale', () => {
    const ids = obligationMap.notApplicable.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of obligationMap.notApplicable) {
      expect(item.id.startsWith('PBT-')).toBe(true);
      expect(item.rationale.trim().length).toBeGreaterThan(20);
    }
  });

  test('keeps only later-step refinement coverage explicitly deferred', () => {
    const canonicalIds = new Set(
      (obligationMap.canonicalTests as CanonicalTest[]).map(({ id }) => id),
    );
    const obligationIds = new Set(
      obligationMap.obligations.map(({ id }) => id),
    );
    const deferred = obligationMap.deferredCoverage as DeferredCoverage[];
    const deferredIds = deferred.flatMap(({ ids }) => ids);

    expect(new Set(deferredIds).size).toBe(deferredIds.length);
    for (const item of deferred) {
      expect(
        canonicalIds.has(item.canonicalTestId),
        `unknown deferred canonical test ${item.canonicalTestId}`,
      ).toBe(true);
      expect(item.remainingStep).toBeGreaterThan(9);
      expect(item.rationale.trim().length).toBeGreaterThan(40);
      for (const id of item.ids) {
        expect(
          obligationIds.has(id),
          `unknown deferred obligation ${id}`,
        ).toBe(true);
      }
    }

    // Nothing is deferred any more. Step 22 closed NFR-P-RELEASE-01 with the
    // pure journal transition model and its state-machine suite. Step 25
    // closed FD-P-C11-01, but by re-pointing it rather than by declaring the
    // wait over: it had named PBT-U1-DOCUMENT, whose properties compare
    // manifest against manifest and never exercise the rendered or PDF
    // evidence mapping. Clearing the entry while it still named that suite
    // would have asserted coverage no test performs.
    expect(
      deferred.map(({ canonicalTestId, remainingStep, ids }) => ({
        canonicalTestId,
        remainingStep,
        ids,
      })),
    ).toEqual([]);
  });

  test('closes frontend aliases in their canonical suites and preserves later owners', () => {
    const canonicalByObligation = new Map(
      obligationMap.obligations.map(({ id, canonicalTestId }) => [
        id,
        canonicalTestId,
      ]),
    );
    const deferredIds = new Set(
      (obligationMap.deferredCoverage as DeferredCoverage[]).flatMap(
        ({ ids }) => ids,
      ),
    );

    const presentationAliases = [
      'U1-P07',
      'P-C02-01',
      'P-C02-02',
      'P-C02-03',
      'FD-P-C02-01',
      'FD-P-C02-02',
      'FD-P-C02-03',
    ];
    const metadataAliases = [
      'U1-P09',
      'P-C04-01',
      'P-C04-02',
      'FD-P-C04-01',
      'FD-P-C04-02',
    ];
    const navigationAliases = [
      'U1-P10',
      'P-C05-01',
      'P-C05-02',
      'P-C05-03',
      'FD-P-C05-01',
      'FD-P-C05-02',
    ];

    for (const id of presentationAliases) {
      expect(canonicalByObligation.get(id)).toBe(
        'PBT-U1-PRESENTATION',
      );
      expect(deferredIds.has(id)).toBe(false);
    }
    for (const id of [...metadataAliases, ...navigationAliases]) {
      expect(canonicalByObligation.get(id)).toBe(
        'PBT-U1-METADATA-NAVIGATION',
      );
      expect(deferredIds.has(id)).toBe(false);
    }
    expect(canonicalByObligation.get('DE-P13')).toBe(
      'PBT-U1-METADATA-NAVIGATION',
    );
    expect(canonicalByObligation.get('DE-P15')).toBe(
      'PBT-U1-DOCUMENT',
    );
    // FD-P-C11-01 is the four-surface mapping obligation. It pointed at
    // PBT-U1-DOCUMENT while that suite only compares manifest against
    // manifest — it never calls compareRenderedManifest, mapPdfEvidence or
    // compareResumeSurfaces. The suite that does is resume-pdf.test.ts, so
    // the obligation now names it and nothing is deferred any more.
    expect(canonicalByObligation.get('FD-P-C11-01')).toBe('UNIT-U1-PDF');
    expect(deferredIds.has('FD-P-C11-01')).toBe(false);
    expect(obligationMap.deferredCoverage).toStrictEqual([]);
  });

  test('keeps test fixtures out of production modules', () => {
    const sourceRoot = resolve(process.cwd(), 'src');
    const productionFiles = collectFiles(sourceRoot).filter((path) =>
      /\.(?:astro|js|mjs|ts|tsx)$/.test(path),
    );

    for (const path of productionFiles) {
      const source = readFileSync(path, 'utf8');
      expect(source, `${path} imports test fixtures`).not.toMatch(
        /(?:tests\/fixtures|profile-fixtures)/,
      );
    }

    const fixtureSource = readFileSync(
      resolve(process.cwd(), 'tests/fixtures/profile-fixtures.ts'),
      'utf8',
    );
    expect(fixtureSource).not.toMatch(
      /(?:profile-data|production-profile|verification\/profile)/,
    );
  });
});

function rangeIds(
  prefix: string,
  start: number,
  end: number,
  width = 2,
): string[] {
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `${prefix}${String(start + index).padStart(width, '0')}`,
  );
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

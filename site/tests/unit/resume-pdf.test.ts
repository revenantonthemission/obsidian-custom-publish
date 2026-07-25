import { beforeAll, describe, expect, test } from 'vitest';
import { resumePdfInspectorTesting } from '../../scripts/profile/pdf-inspector.mjs';
import { mapPdfEvidence } from '../../src/lib/profile/resume-evidence.js';
import { buildResumeManifestForTest } from '../../src/lib/profile/resume-manifest.js';
import { getProductionProfileAssembly } from '../../src/lib/profile/production-profile.js';

type AnyRecord = Record<string, any>;

/**
 * These tests build a candidate the mapper accepts and then break it one way at
 * a time. Using the real approved manifest keeps the baseline honest, and
 * synthesising the candidate side keeps the suite free of a browser.
 */
let manifest: AnyRecord;
let skeleton: AnyRecord;
let baseline: AnyRecord;

/** Rebuilds the label a period renders as from the token the manifest holds. */
function periodDisplay(token: string): string {
  const point = (part: string): string => {
    const segments = part.split(':');
    return segments.length <= 2 ? '현재' : (segments.at(-1) ?? '');
  };
  const [start, end] = token.split('|');
  return `${point(start ?? '')} – ${point(end ?? '')}`;
}

function displayTextFor(entry: AnyRecord): string {
  if (entry.valueKind === 'period') return periodDisplay(entry.normalizedValue);
  if (entry.valueKind === 'email') return '이메일 보내기';
  if (entry.valueKind === 'github-url') return 'GitHub 프로필 보기';
  return entry.normalizedValue;
}

function hrefFor(entry: AnyRecord): string | null {
  if (entry.valueKind === 'email') return `mailto:${entry.normalizedValue}`;
  if (
    entry.valueKind === 'github-url' ||
    entry.valueKind === 'external-url' ||
    entry.valueKind === 'internal-path'
  ) {
    return entry.normalizedValue;
  }
  return null;
}

function sectionOrdinalOf(entry: AnyRecord): number {
  return manifest.sectionOrder.findIndex(
    (section: AnyRecord) =>
      section.key === entry.sectionKey && section.order === entry.sectionOrder,
  );
}

function entityOrdinalOf(entry: AnyRecord): number | null {
  if (entry.entity === null) return null;
  return manifest.entityOrder.findIndex(
    (entity: AnyRecord) =>
      entity.sectionKey === entry.sectionKey &&
      entity.sectionOrder === entry.sectionOrder &&
      entity.kind === entry.entity.kind &&
      entity.id === entry.entity.id &&
      entity.order === entry.entity.order,
  );
}

function buildSkeleton(): AnyRecord {
  return {
    sections: manifest.sectionOrder.map((_: unknown, index: number) => ({
      sectionOrdinal: index,
    })),
    entities: manifest.entityOrder.map((entity: AnyRecord, index: number) => ({
      entityOrdinal: index,
      sectionOrdinal: manifest.sectionOrder.findIndex(
        (section: AnyRecord) =>
          section.key === entity.sectionKey &&
          section.order === entity.sectionOrder,
      ),
      parentEntityOrdinal:
        entity.parent === null
          ? null
          : manifest.entityOrder.findIndex(
              (candidate: AnyRecord) =>
                candidate.sectionKey === entity.sectionKey &&
                candidate.sectionOrder === entity.sectionOrder &&
                candidate.kind === entity.parent.kind &&
                candidate.id === entity.parent.id,
            ),
    })),
    facts: manifest.entries.map((entry: AnyRecord, index: number) => ({
      factOrder: index + 1,
      factId: entry.factId,
      sectionOrdinal: sectionOrdinalOf(entry),
      entityOrdinal: entityOrdinalOf(entry),
      text: displayTextFor(entry),
      href: hrefFor(entry),
      rendered: true,
    })),
  };
}

function buildSnapshot(): AnyRecord {
  const structure = resumePdfInspectorTesting.buildStructureTree(
    skeleton as never,
  ) as AnyRecord;
  const factNodes = structure.nodes.filter(
    (node: AnyRecord) => node.role === 'fact',
  );
  let annotationIndex = 0;

  const occurrences = manifest.entries.map(
    (entry: AnyRecord, index: number) => {
      const href = hrefFor(entry);
      const node = factNodes.find(
        (candidate: AnyRecord) => candidate.occurrenceOrder === index + 1,
      );
      return {
        occurrenceOrder: index + 1,
        sectionOrdinal: sectionOrdinalOf(entry),
        entityOrdinal: entityOrdinalOf(entry),
        valueKind: entry.valueKind,
        fragments: [
          {
            pageNumber: 1,
            itemIndex: index,
            text: displayTextFor(entry),
            lineWrapBefore: false,
          },
        ],
        urlAnnotations:
          href === null
            ? []
            : [
                {
                  pageNumber: 1,
                  annotationIndex: annotationIndex++,
                  destination: href,
                },
              ],
        structurePath: [...(node?.path ?? [0])],
      };
    },
  );

  return {
    schemaVersion: 1,
    candidate: { candidateId: 'c'.repeat(64), pdfSha256: 'd'.repeat(64) },
    sourceIdentity: manifest.sourceIdentity,
    manifestFingerprint: manifest.fingerprint,
    pageCount: 1,
    occurrences,
    structure,
    outline: {
      entries: manifest.sectionOrder.map((_: unknown, index: number) => ({
        outlineOrder: index + 1,
        sectionOrdinal: index,
        pageNumber: 1,
      })),
    },
    renderedPages: [{ pageNumber: 1, evidenceId: 'e'.repeat(64) }],
    tools: {
      node: process.versions.node,
      playwright: '1.61.1',
      chromium: '149.0.0.0',
      pdfjs: '5.4.624',
      pretendard: '1.3.9',
    },
  };
}

function mutated(change: (snapshot: AnyRecord) => void): AnyRecord {
  const copy = structuredClone(baseline) as AnyRecord;
  change(copy);
  return copy;
}

function expectRejected(snapshot: AnyRecord, because: string): void {
  const result = mapPdfEvidence(manifest as never, snapshot);
  expect(result.ok, because).toBe(false);
}

beforeAll(async () => {
  const built = await buildResumeManifestForTest(
    getProductionProfileAssembly().resume,
  );
  if (!built.ok) throw new Error('the approved manifest must build');
  manifest = built.value as unknown as AnyRecord;
  skeleton = buildSkeleton();
  baseline = buildSnapshot();
});

describe('pdf inspector structure', () => {
  test('normalizes one document, its sections, entities and facts', () => {
    const structure = resumePdfInspectorTesting.buildStructureTree(
      skeleton as never,
    ) as AnyRecord;
    const roles = (role: string) =>
      structure.nodes.filter((node: AnyRecord) => node.role === role).length;

    expect(roles('document')).toBe(1);
    expect(roles('section')).toBe(manifest.sectionOrder.length);
    expect(roles('entity')).toBe(manifest.entityOrder.length);
    expect(roles('fact')).toBe(manifest.entries.length);

    // Depth-first order is what makes the filtered arrays line up with the
    // ordinals the mapper indexes by.
    expect(structure.entityOrder).toEqual(
      manifest.entityOrder.map((_: unknown, index: number) => index),
    );
    expect(structure.readingOrder).toEqual(
      manifest.entries.map((_: unknown, index: number) => index + 1),
    );
    expect(structure.nodes[0].path).toEqual([0]);
    expect(structure.nodes[0].parentPath).toBeNull();
  });

  test('reads a value kind from the observation alone', () => {
    const kind = resumePdfInspectorTesting.inferValueKind;
    expect(kind({ text: '이메일', href: 'mailto:a@b.c' })).toBe('email');
    expect(kind({ text: 'GitHub', href: 'https://github.com/someone' })).toBe(
      'github-url',
    );
    expect(kind({ text: '2023-07 – 2023-08', href: null })).toBe('period');
    expect(kind({ text: '2019 – 현재', href: null })).toBe('period');
    expect(kind({ text: 'Rust', href: null })).toBe('text');
  });

  test('claims a run only when the mapper would read the same value back', () => {
    const stream = [
      { pageNumber: 1, itemIndex: 0, text: '프로그래밍', hasEOL: true },
      { pageNumber: 1, itemIndex: 1, text: '과', hasEOL: false },
    ];
    // Korean wraps mid-word: the wrap must not become a space here.
    const run = resumePdfInspectorTesting.findTextRun(stream, 0, '프로그래밍과');
    expect(run).not.toBeNull();
    expect(run?.wraps.has(1)).toBe(false);

    const spaced = resumePdfInspectorTesting.findTextRun(
      stream,
      0,
      '프로그래밍 과',
    );
    expect(spaced?.wraps.has(1)).toBe(true);
    expect(
      resumePdfInspectorTesting.findTextRun(stream, 0, '없는 값'),
    ).toBeNull();
  });
});

describe('pdf evidence mapping', () => {
  test('maps every approved entry exactly once', () => {
    const result = mapPdfEvidence(manifest as never, baseline);
    expect(result.ok, 'the synthesized candidate must map').toBe(true);
    if (result.ok) {
      expect(result.value.mappings).toHaveLength(manifest.entries.length);
    }
  });

  test('rejects a candidate missing an approved fact', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences.pop();
      }),
      'a missing occurrence must fail',
    );
  });

  test('rejects a candidate carrying an extra occurrence', () => {
    expectRejected(
      mutated((snapshot) => {
        const last = structuredClone(snapshot.occurrences.at(-1));
        last.occurrenceOrder = snapshot.occurrences.length + 1;
        last.fragments[0].itemIndex += 1000;
        snapshot.occurrences.push(last);
      }),
      'an extra occurrence must fail',
    );
  });

  test('rejects a changed value', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[0].fragments[0].text = '다른 이름';
      }),
      'a changed value must fail',
    );
  });

  test('rejects reordered occurrences', () => {
    expectRejected(
      mutated((snapshot) => {
        const first = snapshot.occurrences[0];
        const second = snapshot.occurrences[1];
        snapshot.occurrences[0] = { ...second, occurrenceOrder: 1 };
        snapshot.occurrences[1] = { ...first, occurrenceOrder: 2 };
      }),
      'reordered occurrences must fail',
    );
  });

  test('rejects an ambiguous occurrence', () => {
    expectRejected(
      mutated((snapshot) => {
        // Two occurrences that could equally answer the same expected entry.
        const twin = structuredClone(snapshot.occurrences[7]);
        twin.occurrenceOrder = snapshot.occurrences.length + 1;
        twin.fragments[0].itemIndex += 1000;
        twin.structurePath = [...twin.structurePath, 99];
        snapshot.occurrences.push(twin);
      }),
      'an ambiguous occurrence must fail',
    );
  });

  test('rejects a link whose annotation points elsewhere', () => {
    expectRejected(
      mutated((snapshot) => {
        const link = snapshot.occurrences.find(
          (occurrence: AnyRecord) => occurrence.urlAnnotations.length === 1,
        );
        link.urlAnnotations[0].destination = 'https://example.invalid/';
      }),
      'a redirected link must fail',
    );
  });

  test('rejects a broken structure tree', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.structure.nodes.pop();
      }),
      'a truncated structure must fail',
    );
  });

  test('rejects an outline that does not cover the sections', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.outline.entries.pop();
      }),
      'an incomplete outline must fail',
    );
  });

  test('rejects a stale candidate', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.sourceIdentity = {
          ...snapshot.sourceIdentity,
          value: 'f'.repeat(64),
        };
      }),
      'a stale source identity must fail',
    );
  });

  test('rejects an unreadable candidate', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.pageCount = 0;
      }),
      'a candidate with no pages must fail',
    );
  });
});

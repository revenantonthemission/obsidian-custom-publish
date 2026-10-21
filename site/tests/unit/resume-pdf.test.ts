import { beforeAll, describe, expect, test } from 'vitest';
import { resumePdfInspectorTesting } from '../../scripts/profile/pdf-inspector.mjs';
import { mapPdfEvidence } from '../../src/lib/profile/resume-evidence.js';
import { resumeReceiptsTesting } from '../../src/lib/profile/resume-receipts.js';
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

/**
 * Rebuilds the label a period renders as from the token the manifest holds.
 * The page shows the stored ISO value with dots (BR3.1).
 */
function periodDisplay(token: string): string {
  const point = (part: string): string => {
    const segments = part.split(':');
    return segments.length <= 2 ? '현재' : (segments.at(-1) ?? '').replaceAll('-', '.');
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

/** The destination half of an evidence link rendered on one `<a>` with its label. */
function isPairedDestination(index: number): boolean {
  const entry = manifest.entries[index];
  const previous = manifest.entries[index - 1];
  return (
    entry?.entity?.kind === 'evidence-link' &&
    String(entry.path).endsWith('.destination') &&
    previous?.path === String(entry.path).replace(/\.destination$/u, '.label')
  );
}

function sectionOrdinalOf(entry: AnyRecord): number {
  return manifest.sectionOrder.findIndex(
    (section: AnyRecord) => section.key === entry.sectionKey && section.order === entry.sectionOrder
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
      entity.order === entry.entity.order
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
          section.key === entity.sectionKey && section.order === entity.sectionOrder
      ),
      parentEntityOrdinal:
        entity.parent === null
          ? null
          : manifest.entityOrder.findIndex(
              (candidate: AnyRecord) =>
                candidate.sectionKey === entity.sectionKey &&
                candidate.sectionOrder === entity.sectionOrder &&
                candidate.kind === entity.parent.kind &&
                candidate.id === entity.parent.id
            ),
    })),
    facts: manifest.entries.map((entry: AnyRecord, index: number) => {
      const paired = isPairedDestination(index);
      const label = isPairedDestination(index + 1);
      return {
        factOrder: index + 1,
        factId: entry.factId,
        sectionOrdinal: sectionOrdinalOf(entry),
        entityOrdinal: entityOrdinalOf(entry),
        // A pair shares the label's text and the destination's href on one element.
        text: paired ? manifest.entries[index - 1].normalizedValue : displayTextFor(entry),
        href: label ? hrefFor(manifest.entries[index + 1]) : hrefFor(entry),
        binding: paired ? 'destination' : label ? 'label' : 'value',
        elementOrder: paired ? index : index + 1,
        rendered: true,
      };
    }),
  };
}

function buildSnapshot(): AnyRecord {
  const structure = resumePdfInspectorTesting.buildStructureTree(skeleton as never) as AnyRecord;
  const factNodes = structure.nodes.filter((node: AnyRecord) => node.role === 'fact');
  let annotationIndex = 0;

  const occurrences = manifest.entries.map((entry: AnyRecord, index: number) => {
    const href = hrefFor(entry);
    const node = factNodes.find((candidate: AnyRecord) => candidate.occurrenceOrder === index + 1);
    // An evidence link renders its label as the link text; its destination is
    // the link's URI only, so the destination claims no visible text.
    const paired = isPairedDestination(index);
    return {
      occurrenceOrder: index + 1,
      sectionOrdinal: sectionOrdinalOf(entry),
      entityOrdinal: entityOrdinalOf(entry),
      valueKind: entry.valueKind,
      fragments: paired
        ? []
        : [
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
  });

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
  const built = await buildResumeManifestForTest(getProductionProfileAssembly().resume);
  if (!built.ok) throw new Error('the approved manifest must build');
  manifest = built.value as unknown as AnyRecord;
  skeleton = buildSkeleton();
  baseline = buildSnapshot();
});

describe('pdf inspector structure', () => {
  test('normalizes one document, its sections, entities and facts', () => {
    const structure = resumePdfInspectorTesting.buildStructureTree(skeleton as never) as AnyRecord;
    const roles = (role: string) =>
      structure.nodes.filter((node: AnyRecord) => node.role === role).length;

    expect(roles('document')).toBe(1);
    expect(roles('section')).toBe(manifest.sectionOrder.length);
    expect(roles('entity')).toBe(manifest.entityOrder.length);
    expect(roles('fact')).toBe(manifest.entries.length);

    // Depth-first order is what makes the filtered arrays line up with the
    // ordinals the mapper indexes by.
    expect(structure.entityOrder).toEqual(
      manifest.entityOrder.map((_: unknown, index: number) => index)
    );
    expect(structure.readingOrder).toEqual(
      manifest.entries.map((_: unknown, index: number) => index + 1)
    );
    expect(structure.nodes[0].path).toEqual([0]);
    expect(structure.nodes[0].parentPath).toBeNull();
  });

  test('reads a value kind from the observation alone', () => {
    const kind = resumePdfInspectorTesting.inferValueKind;
    expect(kind({ text: '이메일', href: 'mailto:a@b.c' })).toBe('email');
    expect(kind({ text: 'GitHub', href: 'https://github.com/someone' })).toBe('github-url');
    expect(kind({ text: '2023.07 – 2023.08', href: null })).toBe('period');
    expect(kind({ text: '2019 – 현재', href: null })).toBe('period');
    expect(kind({ text: 'Rust', href: null })).toBe('text');
  });

  // BR3.2: the inspector reads the dotted display of all three precisions,
  // and the hyphenated stored form is no longer a displayed period.
  test('reads dotted periods of every precision and nothing else as a period', () => {
    const kind = resumePdfInspectorTesting.inferValueKind;
    expect(kind({ text: '2025.09.06 – 2027.09.06', href: null })).toBe('period');
    expect(kind({ text: '2026.07.17 – 현재', href: null })).toBe('period');
    expect(kind({ text: '2019 – 2026', href: null })).toBe('period');
    expect(kind({ text: '2023-07 – 2023-08', href: null })).toBe('text');
    expect(kind({ text: '2025-09-06 – 2027-09-06', href: null })).toBe('text');
    expect(kind({ text: '2025.13.01 – 2027.09.06', href: null })).toBe('text');
    expect(kind({ text: '2025.9.6 – 2027.09.06', href: null })).toBe('text');
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

    const spaced = resumePdfInspectorTesting.findTextRun(stream, 0, '프로그래밍 과');
    expect(spaced?.wraps.has(1)).toBe(true);
    expect(resumePdfInspectorTesting.findTextRun(stream, 0, '없는 값')).toBeNull();
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
      'a missing occurrence must fail'
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
      'an extra occurrence must fail'
    );
  });

  test('rejects a changed value', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[0].fragments[0].text = '다른 이름';
      }),
      'a changed value must fail'
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
      'reordered occurrences must fail'
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
      'an ambiguous occurrence must fail'
    );
  });

  test('rejects a link whose annotation points elsewhere', () => {
    expectRejected(
      mutated((snapshot) => {
        const link = snapshot.occurrences.find(
          (occurrence: AnyRecord) => occurrence.urlAnnotations.length === 1
        );
        link.urlAnnotations[0].destination = 'https://example.invalid/';
      }),
      'a redirected link must fail'
    );
  });

  test('rejects a broken structure tree', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.structure.nodes.pop();
      }),
      'a truncated structure must fail'
    );
  });

  test('rejects an outline that does not cover the sections', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.outline.entries.pop();
      }),
      'an incomplete outline must fail'
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
      'a stale source identity must fail'
    );
  });

  test('rejects an unreadable candidate', () => {
    expectRejected(
      mutated((snapshot) => {
        snapshot.pageCount = 0;
      }),
      'a candidate with no pages must fail'
    );
  });
});

/**
 * Option A (approved 2026-10-21): an evidence link renders its label fact and
 * its destination fact on one `<a>`. The label claims the visible link text;
 * the destination claims only the link annotation's URI. Every other element
 * still carries one fact that claims its own text.
 */
const AWS_URL =
  'https://cp.certmetrics.com/amazon/en/public/verify/credential/eede0b68fb004a24bdcce600d3dd92cf';

function pairIndexes(): { label: number; destination: number } {
  const destination = manifest.entries.findIndex(
    (entry: AnyRecord) => entry.valueKind === 'external-url' && entry.normalizedValue === AWS_URL
  );
  return { label: destination - 1, destination };
}

describe('pdf inspector: an evidence link carrying a label and a destination', () => {
  const LINK_TEXT = '인증 확인 링크';

  function linkFact(factOrder: number, binding: string, elementOrder: number, href: string | null) {
    return {
      factOrder,
      factId: `fact-${factOrder}`,
      sectionOrdinal: 0,
      entityOrdinal: 0,
      text: LINK_TEXT,
      href,
      binding,
      elementOrder,
      rendered: true,
    };
  }

  function pageWith(destination: string | null) {
    return [
      {
        pageNumber: 1,
        annotations:
          destination === null ? [] : [{ pageNumber: 1, annotationIndex: 0, destination }],
      },
    ];
  }

  const stream = [...LINK_TEXT].map((text, itemIndex) => ({
    pageNumber: 1,
    itemIndex,
    text,
    hasEOL: false,
  }));

  function extract(facts: AnyRecord[], text = stream, destination: string | null = AWS_URL) {
    return resumePdfInspectorTesting.extractOccurrences(text, pageWith(destination), {
      sections: [{ sectionOrdinal: 0 }],
      entities: [{ entityOrdinal: 0, sectionOrdinal: 0, parentEntityOrdinal: null }],
      facts,
    }) as AnyRecord[];
  }

  const pair = () => [linkFact(1, 'label', 1, AWS_URL), linkFact(2, 'destination', 1, AWS_URL)];

  test('the label claims the link text and the destination claims only the URI', () => {
    const [label, destination] = extract(pair());
    expect(label).toMatchObject({ valueKind: 'text', urlAnnotations: [] });
    expect(label.fragments.map(({ text }: AnyRecord) => text).join('')).toBe(LINK_TEXT);
    expect(destination).toMatchObject({
      valueKind: 'external-url',
      fragments: [],
      urlAnnotations: [{ pageNumber: 1, annotationIndex: 0, destination: AWS_URL }],
    });
  });

  test('refuses a pair whose link text is wrong', () => {
    const wrong = [...'다른 링크'].map((text, itemIndex) => ({
      pageNumber: 1,
      itemIndex,
      text,
      hasEOL: false,
    }));
    expect(() => extract(pair(), wrong)).toThrow(
      expect.objectContaining({ code: 'PDF_INSPECT_FACT_TEXT_MISSING' })
    );
  });

  test.each([
    ['points elsewhere', 'https://example.invalid/'],
    ['is missing', null],
  ])('refuses a pair whose URI %s', (_label, destination) => {
    expect(() => extract(pair(), stream, destination)).toThrow(
      expect.objectContaining({ code: 'PDF_INSPECT_LINK_ANNOTATION_MISSING' })
    );
  });

  test('refuses a third fact riding on the same element', () => {
    const facts = [...pair(), linkFact(3, 'value', 1, AWS_URL)];
    expect(() => extract(facts)).toThrow(
      expect.objectContaining({ code: 'PDF_INSPECT_FACT_TEXT_MISSING' })
    );
  });

  test('does not pair a destination rendered on a different element', () => {
    const facts = [linkFact(1, 'label', 1, AWS_URL), linkFact(2, 'destination', 2, AWS_URL)];
    expect(() => extract(facts)).toThrow(
      expect.objectContaining({ code: 'PDF_INSPECT_FACT_TEXT_MISSING' })
    );
  });

  test('keeps a single-fact link claiming its own text and its URI', () => {
    const [link] = extract([linkFact(1, 'value', 1, AWS_URL)]);
    expect(link).toMatchObject({
      valueKind: 'external-url',
      urlAnnotations: [{ destination: AWS_URL }],
    });
    expect(link.fragments).toHaveLength(LINK_TEXT.length);
  });
});

describe('pdf evidence mapping: an evidence link pair', () => {
  test('maps the label to its text and the destination to its URI', () => {
    const { label, destination } = pairIndexes();
    expect(label).toBeGreaterThan(0);
    const result = mapPdfEvidence(manifest as never, baseline);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mappings[label]).toMatchObject({
      normalizedObservedValue: '인증 확인 링크',
      urlAnnotationReferences: [],
    });
    expect(result.value.mappings[destination]).toMatchObject({
      normalizedObservedValue: AWS_URL,
      fragmentReferences: [],
    });
  });

  test('rejects a destination that claims visible text', () => {
    const { destination } = pairIndexes();
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[destination].fragments = [
          { pageNumber: 1, itemIndex: 9_000, text: '인증 확인 링크', lineWrapBefore: false },
        ];
      }),
      'a destination claims only the URI'
    );
  });

  test('rejects a destination that reuses the label’s text', () => {
    const { label, destination } = pairIndexes();
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[destination].fragments = structuredClone(
          snapshot.occurrences[label].fragments
        );
      }),
      'one fragment cannot answer two facts'
    );
  });

  test('rejects a pair whose URI is wrong or missing', () => {
    const { destination } = pairIndexes();
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[destination].urlAnnotations[0].destination =
          'https://example.invalid/';
      }),
      'a wrong URI must fail'
    );
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[destination].urlAnnotations = [];
      }),
      'a missing URI must fail'
    );
  });

  test('rejects a label that claims the URI', () => {
    const { label, destination } = pairIndexes();
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[label].urlAnnotations =
          snapshot.occurrences[destination].urlAnnotations;
        snapshot.occurrences[destination].urlAnnotations = [];
      }),
      'the URI belongs to the destination'
    );
  });

  test('rejects a destination annotation on another page than its label', () => {
    const { destination } = pairIndexes();
    expectRejected(
      mutated((snapshot) => {
        snapshot.pageCount = 2;
        snapshot.renderedPages.push({ pageNumber: 2, evidenceId: 'f'.repeat(64) });
        snapshot.occurrences[destination].urlAnnotations[0].pageNumber = 2;
      }),
      'the pair is one element on one page'
    );
  });

  test('keeps every single-fact link claiming its own text', () => {
    const single = manifest.entries.findIndex(
      (entry: AnyRecord) => entry.valueKind === 'email' || entry.valueKind === 'github-url'
    );
    expect(single).toBeGreaterThanOrEqual(0);
    expectRejected(
      mutated((snapshot) => {
        snapshot.occurrences[single].fragments = [];
      }),
      'a single-fact link must claim its text'
    );
  });
});

describe('release receipt full mapping: an evidence link pair', () => {
  function mappings(): AnyRecord[] {
    const result = mapPdfEvidence(manifest as never, baseline);
    if (!result.ok) throw new Error('the baseline must map');
    return structuredClone(result.value.mappings) as unknown as AnyRecord[];
  }

  test('accepts the mapped pair', () => {
    expect(resumeReceiptsTesting.validateFullMapping(mappings(), manifest as never)).toBe(true);
  });

  test('rejects a destination mapping that references text', () => {
    const { label, destination } = pairIndexes();
    const value = mappings();
    value[destination].fragmentReferences = [{ pageNumber: 1, itemIndex: 9_000 }];
    expect(value[label].fragmentReferences.length).toBeGreaterThan(0);
    expect(resumeReceiptsTesting.validateFullMapping(value, manifest as never)).toBe(false);
  });

  test('rejects a single-fact link mapping without text', () => {
    const single = manifest.entries.findIndex(
      (entry: AnyRecord) => entry.valueKind === 'email' || entry.valueKind === 'github-url'
    );
    const value = mappings();
    value[single].fragmentReferences = [];
    expect(resumeReceiptsTesting.validateFullMapping(value, manifest as never)).toBe(false);
  });
});

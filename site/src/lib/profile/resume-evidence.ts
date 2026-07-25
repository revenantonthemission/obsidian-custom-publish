import {
  createValidationIssue,
  sortAndDedupeIssues,
} from './issues.js';
import {
  compareResumeFactManifests,
  RESUME_MANIFEST_SCHEMA_VERSION,
} from './resume-manifest.js';
import type {
  ProfileSourceIdentity,
  ResumeEntityOrder,
  ResumeFactManifest,
  ResumeManifestEntry,
  ResumeManifestFingerprint,
  ResumeManifestValueKind,
  ResumeSectionOrder,
} from './resume-manifest.js';
import type {
  FactId,
  NonEmptyReadonlyArray,
  ProfilePath,
  ValidationIssue,
  ValidationResult,
} from './types.js';

declare const renderedSurfaceEvidenceBrand: unique symbol;
declare const mappedResumeEvidenceBrand: unique symbol;
declare const surfaceManifestComparisonBrand: unique symbol;

export const RESUME_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const RESUME_TOOL_VERSIONS = Object.freeze({
  playwright: '1.61.1',
  pdfjs: '5.4.624',
  pretendard: '1.3.9',
});

export interface ResumeToolVersions {
  readonly node: string;
  readonly playwright: typeof RESUME_TOOL_VERSIONS.playwright;
  readonly chromium: string;
  readonly pdfjs: typeof RESUME_TOOL_VERSIONS.pdfjs;
  readonly pretendard: typeof RESUME_TOOL_VERSIONS.pretendard;
}

export interface RenderedManifestEntryObservation
  extends ResumeManifestEntry {
  readonly occurrenceOrder: number;
  readonly annotationOccurrence: number;
  readonly domPresent: true;
  readonly rendered: boolean;
}

export interface RenderedResumeManifestObservation {
  readonly schemaVersion: typeof RESUME_EVIDENCE_SCHEMA_VERSION;
  readonly surface: 'web' | 'print';
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly fingerprint: ResumeManifestFingerprint;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly RenderedManifestEntryObservation[];
}

export type RenderedSurfaceEvidence =
  RenderedResumeManifestObservation & {
    readonly [renderedSurfaceEvidenceBrand]: 'RenderedSurfaceEvidence';
  };

export interface PdfTextFragment {
  readonly pageNumber: number;
  readonly itemIndex: number;
  readonly text: string;
  /**
   * Only an extraction-confirmed visual line wrap may set this flag. It is
   * converted to one U+0020 before NFC comparison.
   */
  readonly lineWrapBefore: boolean;
}

export interface PdfUrlAnnotation {
  readonly pageNumber: number;
  readonly annotationIndex: number;
  readonly destination: string;
}

/**
 * Deliberately contains no fact ID, semantic path, section key, or entity ID.
 * Those identities are assigned only after a unique full ordered mapping.
 */
export interface PdfObservedOccurrence {
  readonly occurrenceOrder: number;
  readonly sectionOrdinal: number;
  readonly entityOrdinal: number | null;
  readonly valueKind: ResumeManifestValueKind;
  readonly fragments: readonly PdfTextFragment[];
  readonly urlAnnotations: readonly PdfUrlAnnotation[];
  readonly structurePath: NonEmptyReadonlyArray<number>;
}

export type PdfStructureRole = 'document' | 'section' | 'entity' | 'fact';

/**
 * A normalized tagged-PDF structure node. Paths are zero-based child-index
 * paths rooted at `[0]`; the nodes collection is strict depth-first preorder.
 * Nodes carry only structural ordinals, never fact IDs or semantic paths.
 */
export interface PdfStructureNode {
  readonly nodeOrder: number;
  readonly path: NonEmptyReadonlyArray<number>;
  readonly role: PdfStructureRole;
  readonly parentPath: readonly number[] | null;
  readonly children: readonly NonEmptyReadonlyArray<number>[];
  readonly sectionOrdinal: number | null;
  readonly entityOrdinal: number | null;
  readonly occurrenceOrder: number | null;
}

export interface PdfStructureObservation {
  readonly tagged: boolean;
  readonly readingOrder: readonly number[];
  readonly sectionOrder: readonly number[];
  readonly entityOrder: readonly number[];
  readonly nodes: NonEmptyReadonlyArray<PdfStructureNode>;
}

export interface PdfOutlineEntry {
  readonly outlineOrder: number;
  readonly sectionOrdinal: number;
  readonly pageNumber: number;
}

export interface PdfOutlineObservation {
  readonly entries: readonly PdfOutlineEntry[];
}

export interface PdfRenderedPageEvidence {
  readonly pageNumber: number;
  readonly evidenceId: string;
}

export interface PdfInspectionSnapshot {
  readonly schemaVersion: typeof RESUME_EVIDENCE_SCHEMA_VERSION;
  readonly candidate: Readonly<{
    candidateId: string;
    pdfSha256: string;
  }>;
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly manifestFingerprint: ResumeManifestFingerprint;
  readonly pageCount: number;
  readonly occurrences: readonly PdfObservedOccurrence[];
  readonly structure: PdfStructureObservation;
  readonly outline: PdfOutlineObservation;
  readonly renderedPages: readonly PdfRenderedPageEvidence[];
  readonly tools: ResumeToolVersions;
}

export interface ResumeEvidenceMapping {
  readonly expectedEntry: ResumeManifestEntry;
  readonly observedOccurrenceOrder: number;
  readonly sectionOrdinal: number;
  readonly entityOrdinal: number | null;
  readonly normalizedObservedValue: string;
  readonly fragmentReferences: readonly Readonly<{
    pageNumber: number;
    itemIndex: number;
  }>[];
  readonly urlAnnotationReferences: readonly Readonly<{
    pageNumber: number;
    annotationIndex: number;
    destination: string;
  }>[];
  readonly structurePath: NonEmptyReadonlyArray<number>;
}

export interface MappedResumeEvidence {
  readonly [mappedResumeEvidenceBrand]: 'MappedResumeEvidence';
  readonly schemaVersion: typeof RESUME_EVIDENCE_SCHEMA_VERSION;
  readonly candidate: PdfInspectionSnapshot['candidate'];
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly fingerprint: ResumeManifestFingerprint;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly mappings: readonly ResumeEvidenceMapping[];
  readonly structure: PdfStructureObservation;
  readonly outline: PdfOutlineObservation;
  readonly renderedPages: readonly PdfRenderedPageEvidence[];
  readonly tools: ResumeToolVersions;
}

export interface ExactSurfaceIdentity {
  readonly surface: 'web' | 'print';
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly fingerprint: ResumeManifestFingerprint;
  readonly sectionCount: number;
  readonly entityCount: number;
  readonly entryCount: number;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
}

export interface ExactPdfSurfaceIdentity {
  readonly surface: 'pdf';
  readonly candidate: PdfInspectionSnapshot['candidate'];
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly fingerprint: ResumeManifestFingerprint;
  readonly sectionCount: number;
  readonly entityCount: number;
  readonly mappedEntryCount: number;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
}

export interface SurfaceManifestComparison {
  readonly [surfaceManifestComparisonBrand]: 'SurfaceManifestComparison';
  readonly schemaVersion: typeof RESUME_EVIDENCE_SCHEMA_VERSION;
  readonly result: 'pass';
  readonly sourceIdentity: ProfileSourceIdentity;
  readonly fingerprint: ResumeManifestFingerprint;
  readonly expectedEntryCount: number;
  readonly web: ExactSurfaceIdentity;
  readonly print: ExactSurfaceIdentity;
  readonly pdf: ExactPdfSurfaceIdentity;
}

export type ResumeEvidenceResult<Value> = ValidationResult<Value>;

type SnapshotResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false }>;

type OwnRecord = Record<string, unknown>;

const MANIFEST_KEYS = [
  'schemaVersion',
  'sourceIdentity',
  'sectionOrder',
  'entityOrder',
  'entries',
  'fingerprint',
] as const;
const RENDERED_KEYS = [
  'schemaVersion',
  'surface',
  'sourceIdentity',
  'fingerprint',
  'sectionOrder',
  'entityOrder',
  'entries',
] as const;
const RENDERED_ENTRY_ADDITIONAL_KEYS = [
  'occurrenceOrder',
  'annotationOccurrence',
  'domPresent',
  'rendered',
] as const;
const PDF_SNAPSHOT_KEYS = [
  'schemaVersion',
  'candidate',
  'sourceIdentity',
  'manifestFingerprint',
  'pageCount',
  'occurrences',
  'structure',
  'outline',
  'renderedPages',
  'tools',
] as const;
const PDF_OCCURRENCE_KEYS = [
  'occurrenceOrder',
  'sectionOrdinal',
  'entityOrdinal',
  'valueKind',
  'fragments',
  'urlAnnotations',
  'structurePath',
] as const;
const PDF_FRAGMENT_KEYS = [
  'pageNumber',
  'itemIndex',
  'text',
  'lineWrapBefore',
] as const;
const PDF_URL_KEYS = [
  'pageNumber',
  'annotationIndex',
  'destination',
] as const;
const PDF_STRUCTURE_KEYS = [
  'tagged',
  'readingOrder',
  'sectionOrder',
  'entityOrder',
  'nodes',
] as const;
const PDF_STRUCTURE_NODE_KEYS = [
  'nodeOrder',
  'path',
  'role',
  'parentPath',
  'children',
  'sectionOrdinal',
  'entityOrdinal',
  'occurrenceOrder',
] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const VALUE_KINDS = new Set<ResumeManifestValueKind>([
  'text',
  'email',
  'github-url',
  'external-url',
  'internal-path',
  'period',
]);

/**
 * Compares actual structured DOM observations. It never derives semantic
 * identity from flattened text and never sorts or deduplicates observations.
 */
export function compareRenderedManifest(
  expected: ResumeFactManifest,
  observation: unknown,
): ResumeEvidenceResult<RenderedSurfaceEvidence> {
  try {
    const safeExpected = inspectManifest(expected);
    const snapshot = snapshotResumeDocumentData(observation);
    if (
      safeExpected === null ||
      !snapshot.ok ||
      !isOwnRecord(snapshot.value) ||
      !hasExactKeys(snapshot.value, RENDERED_KEYS)
    ) {
      return evidenceFailure('field.type', 'profile.document.rendered');
    }

    const surface = snapshot.value.surface;
    if (surface !== 'web' && surface !== 'print') {
      return evidenceFailure(
        'field.type',
        'profile.document.rendered.surface',
      );
    }

    const rootPath = `profile.document.${surface}`;
    const issues: ValidationIssue[] = [];
    if (snapshot.value.schemaVersion !== RESUME_EVIDENCE_SCHEMA_VERSION) {
      issues.push(issue('field.type', `${rootPath}.schemaVersion`));
    }
    if (
      !resumeDocumentDataEqual(
        safeExpected.sourceIdentity,
        snapshot.value.sourceIdentity,
      )
    ) {
      issues.push(issue('document.stale', `${rootPath}.sourceIdentity`));
    }
    if (
      !resumeDocumentDataEqual(
        safeExpected.fingerprint,
        snapshot.value.fingerprint,
      )
    ) {
      issues.push(issue('document.stale', `${rootPath}.fingerprint`));
    }
    if (
      !resumeDocumentDataEqual(
        safeExpected.sectionOrder,
        snapshot.value.sectionOrder,
      )
    ) {
      issues.push(issue('document.parity', `${rootPath}.sectionOrder`));
    }
    if (
      !resumeDocumentDataEqual(
        safeExpected.entityOrder,
        snapshot.value.entityOrder,
      )
    ) {
      issues.push(issue('document.parity', `${rootPath}.entityOrder`));
    }

    const observedEntries = snapshot.value.entries;
    if (!Array.isArray(observedEntries)) {
      issues.push(issue('field.type', `${rootPath}.entries`));
    } else {
      compareRenderedEntries(
        safeExpected.entries,
        observedEntries,
        surface,
        rootPath,
        issues,
      );
    }

    if (issues.length > 0) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData(snapshot.value) as unknown as RenderedSurfaceEvidence,
    );
  } catch {
    return evidenceFailure('document.parity', 'profile.document.rendered');
  }
}

/**
 * Maps structure-bounded PDF occurrences to manifest entries. Semantic IDs
 * exist only on the expected side; every expected entry must have one and
 * only one complete candidate occurrence.
 */
export function mapPdfEvidence(
  expected: ResumeFactManifest,
  snapshotCandidate: unknown,
): ResumeEvidenceResult<MappedResumeEvidence> {
  try {
    const expectedSnapshot = inspectManifest(expected);
    const snapshot = snapshotResumeDocumentData(snapshotCandidate);
    if (
      expectedSnapshot === null ||
      !snapshot.ok ||
      !isOwnRecord(snapshot.value) ||
      !hasExactKeys(snapshot.value, PDF_SNAPSHOT_KEYS)
    ) {
      return evidenceFailure('field.type', 'profile.document.pdf');
    }

    const pdf = snapshot.value;
    const issues: ValidationIssue[] = [];
    validatePdfEnvelope(expectedSnapshot, pdf, issues);
    const parsed = parsePdfOccurrences(pdf, issues);
    if (parsed === null || issues.length > 0) {
      return failure(issues);
    }

    validateStructure(expectedSnapshot, pdf, parsed, issues);
    validateOutline(expectedSnapshot, pdf, issues);
    validateRenderedPages(pdf, issues);

    const mappings: ResumeEvidenceMapping[] = [];
    const claimedOccurrenceOrders = new Set<number>();
    for (
      let entryIndex = 0;
      entryIndex < expectedSnapshot.entries.length;
      entryIndex += 1
    ) {
      const entry = expectedSnapshot.entries[entryIndex];
      if (entry === undefined) {
        issues.push(
          issue('document.parity', `profile.document.pdf.entries[${entryIndex}]`),
        );
        continue;
      }

      const sectionOrdinal = findSectionOrdinal(expectedSnapshot, entry);
      const entityOrdinal = findEntityOrdinal(expectedSnapshot, entry);
      if (sectionOrdinal < 0 || entityOrdinal === undefined) {
        issues.push(
          issue('document.parity', `profile.document.pdf.entries[${entryIndex}]`),
        );
        continue;
      }

      const candidates = parsed.filter((occurrence) =>
        occurrenceMatches(
          occurrence,
          entry,
          sectionOrdinal,
          entityOrdinal,
        ),
      );

      if (candidates.length !== 1) {
        issues.push(
          issue(
            'document.parity',
            `profile.document.pdf.occurrences[${entryIndex}]`,
          ),
        );
        continue;
      }

      const occurrence = candidates[0];
      if (
        occurrence === undefined ||
        occurrence.occurrenceOrder !== entryIndex + 1 ||
        claimedOccurrenceOrders.has(occurrence.occurrenceOrder)
      ) {
        issues.push(
          issue(
            'document.parity',
            `profile.document.pdf.occurrences[${entryIndex}]`,
          ),
        );
        continue;
      }

      claimedOccurrenceOrders.add(occurrence.occurrenceOrder);
      mappings.push({
        expectedEntry: entry,
        observedOccurrenceOrder: occurrence.occurrenceOrder,
        sectionOrdinal,
        entityOrdinal,
        normalizedObservedValue: occurrence.normalizedObservedValue,
        fragmentReferences: occurrence.fragments.map((fragment) => ({
          pageNumber: fragment.pageNumber,
          itemIndex: fragment.itemIndex,
        })),
        urlAnnotationReferences: occurrence.urlAnnotations.map(
          (annotation) => ({
            pageNumber: annotation.pageNumber,
            annotationIndex: annotation.annotationIndex,
            destination: annotation.destination,
          }),
        ),
        structurePath: occurrence.structurePath,
      });
    }

    if (
      parsed.length !== expectedSnapshot.entries.length ||
      claimedOccurrenceOrders.size !== parsed.length
    ) {
      issues.push(issue('document.parity', 'profile.document.pdf.occurrences'));
    }
    if (issues.length > 0) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData({
        schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
        candidate: pdf.candidate,
        sourceIdentity: expectedSnapshot.sourceIdentity,
        fingerprint: expectedSnapshot.fingerprint,
        sectionOrder: expectedSnapshot.sectionOrder,
        entityOrder: expectedSnapshot.entityOrder,
        mappings,
        structure: pdf.structure,
        outline: pdf.outline,
        renderedPages: pdf.renderedPages,
        tools: pdf.tools,
      }) as unknown as MappedResumeEvidence,
    );
  } catch {
    return evidenceFailure('document.parity', 'profile.document.pdf');
  }
}

/**
 * Requires all four ordered semantic surfaces independently. A successful
 * hash or another surface cannot substitute for a missing surface.
 */
export function compareResumeSurfaces(input: {
  readonly expected: ResumeFactManifest;
  readonly web: RenderedSurfaceEvidence;
  readonly print: RenderedSurfaceEvidence;
  readonly pdf: MappedResumeEvidence;
}): ResumeEvidenceResult<SurfaceManifestComparison> {
  try {
    const inputSnapshot = snapshotResumeDocumentData(input);
    if (
      !inputSnapshot.ok ||
      !isOwnRecord(inputSnapshot.value) ||
      !hasExactKeys(inputSnapshot.value, [
        'expected',
        'web',
        'print',
        'pdf',
      ])
    ) {
      return evidenceFailure('field.type', 'profile.document.comparison');
    }

    const expected = inspectManifest(inputSnapshot.value.expected);
    if (expected === null) {
      return evidenceFailure('document.source.invalid', 'profile.document.expected');
    }

    const webResult = compareRenderedManifest(
      expected,
      inputSnapshot.value.web,
    );
    const printResult = compareRenderedManifest(
      expected,
      inputSnapshot.value.print,
    );
    const issues: ValidationIssue[] = [];
    if (!webResult.ok) {
      issues.push(...webResult.issues);
    } else if (webResult.value.surface !== 'web') {
      issues.push(issue('document.parity', 'profile.document.web.surface'));
    }
    if (!printResult.ok) {
      issues.push(...printResult.issues);
    } else if (printResult.value.surface !== 'print') {
      issues.push(issue('document.parity', 'profile.document.print.surface'));
    }

    const mappedPdf = validateMappedEvidence(
      expected,
      inputSnapshot.value.pdf,
    );
    if (!mappedPdf.ok) {
      issues.push(...mappedPdf.issues);
    }
    if (issues.length > 0 || !webResult.ok || !printResult.ok || !mappedPdf.ok) {
      return failure(issues);
    }

    return success(
      deepFreezeResumeDocumentData({
        schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
        result: 'pass',
        sourceIdentity: expected.sourceIdentity,
        fingerprint: expected.fingerprint,
        expectedEntryCount: expected.entries.length,
        web: surfaceIdentity(webResult.value),
        print: surfaceIdentity(printResult.value),
        pdf: {
          surface: 'pdf',
          candidate: mappedPdf.value.candidate,
          sourceIdentity: mappedPdf.value.sourceIdentity,
          fingerprint: mappedPdf.value.fingerprint,
          sectionCount: mappedPdf.value.sectionOrder.length,
          entityCount: mappedPdf.value.entityOrder.length,
          mappedEntryCount: mappedPdf.value.mappings.length,
          sectionOrder: mappedPdf.value.sectionOrder,
          entityOrder: mappedPdf.value.entityOrder,
          entries: mappedPdf.value.mappings.map(
            (mapping) => mapping.expectedEntry,
          ),
        },
      }) as unknown as SurfaceManifestComparison,
    );
  } catch {
    return evidenceFailure('document.parity', 'profile.document.comparison');
  }
}

interface ParsedPdfOccurrence extends PdfObservedOccurrence {
  readonly normalizedObservedValue: string;
}

interface StructureOccurrenceBinding {
  readonly occurrenceOrder: number;
  readonly sectionOrdinal: number;
  readonly entityOrdinal: number | null;
  readonly structurePath: readonly number[];
}

function compareRenderedEntries(
  expectedEntries: readonly ResumeManifestEntry[],
  candidates: readonly unknown[],
  surface: 'web' | 'print',
  rootPath: string,
  issues: ValidationIssue[],
): void {
  if (candidates.length !== expectedEntries.length) {
    issues.push(issue('document.parity', `${rootPath}.entries`));
  }

  const annotationOccurrences = new Set<number>();
  const count = Math.max(candidates.length, expectedEntries.length);
  for (let index = 0; index < count; index += 1) {
    const expected = expectedEntries[index];
    const candidate = candidates[index];
    const path = `${rootPath}.entries[${index}]`;
    if (expected === undefined || !isOwnRecord(candidate)) {
      issues.push(issue('document.parity', path));
      continue;
    }

    const expectedKeys = Object.keys(expected);
    const allowedKeys = [...expectedKeys, ...RENDERED_ENTRY_ADDITIONAL_KEYS];
    if (!hasExactKeys(candidate, allowedKeys)) {
      issues.push(issue('field.type', path));
      continue;
    }

    const base: OwnRecord = Object.create(null) as OwnRecord;
    for (const key of expectedKeys) {
      base[key] = candidate[key];
    }
    if (!resumeDocumentDataEqual(expected, base)) {
      issues.push(issue('document.parity', path));
    }
    if (
      candidate.occurrenceOrder !== index + 1 ||
      !isPositiveInteger(candidate.annotationOccurrence) ||
      annotationOccurrences.has(candidate.annotationOccurrence)
    ) {
      issues.push(issue('document.parity', path));
    } else {
      annotationOccurrences.add(candidate.annotationOccurrence);
    }
    if (candidate.domPresent !== true) {
      issues.push(issue('document.parity', `${path}.domPresent`));
    }
    if (typeof candidate.rendered !== 'boolean') {
      issues.push(issue('field.type', `${path}.rendered`));
    } else if (surface === 'print' && !candidate.rendered) {
      issues.push(issue('document.parity', `${path}.rendered`));
    }
  }
}

function validatePdfEnvelope(
  expected: ResumeFactManifest,
  pdf: OwnRecord,
  issues: ValidationIssue[],
): void {
  if (pdf.schemaVersion !== RESUME_EVIDENCE_SCHEMA_VERSION) {
    issues.push(issue('field.type', 'profile.document.pdf.schemaVersion'));
  }
  if (!isCandidateIdentity(pdf.candidate)) {
    issues.push(issue('field.type', 'profile.document.pdf.candidate'));
  }
  if (!resumeDocumentDataEqual(expected.sourceIdentity, pdf.sourceIdentity)) {
    issues.push(issue('document.stale', 'profile.document.pdf.sourceIdentity'));
  }
  if (!resumeDocumentDataEqual(expected.fingerprint, pdf.manifestFingerprint)) {
    issues.push(issue('document.stale', 'profile.document.pdf.manifestFingerprint'));
  }
  if (!isPositiveInteger(pdf.pageCount)) {
    issues.push(issue('document.unreadable', 'profile.document.pdf.pageCount'));
  }
  if (!isToolVersions(pdf.tools)) {
    issues.push(issue('field.type', 'profile.document.pdf.tools'));
  }
}

function parsePdfOccurrences(
  pdf: OwnRecord,
  issues: ValidationIssue[],
): readonly ParsedPdfOccurrence[] | null {
  if (!Array.isArray(pdf.occurrences)) {
    issues.push(issue('field.type', 'profile.document.pdf.occurrences'));
    return null;
  }

  const pageCount = typeof pdf.pageCount === 'number' ? pdf.pageCount : 0;
  const occurrences: ParsedPdfOccurrence[] = [];
  const fragmentKeys = new Set<string>();
  const annotationKeys = new Set<string>();
  const structurePaths = new Set<string>();

  for (let index = 0; index < pdf.occurrences.length; index += 1) {
    const value = pdf.occurrences[index];
    const path = `profile.document.pdf.occurrences[${index}]`;
    if (
      !isOwnRecord(value) ||
      !hasExactKeys(value, PDF_OCCURRENCE_KEYS) ||
      value.occurrenceOrder !== index + 1 ||
      !isNonNegativeInteger(value.sectionOrdinal) ||
      !(
        value.entityOrdinal === null ||
        isNonNegativeInteger(value.entityOrdinal)
      ) ||
      !isManifestValueKind(value.valueKind) ||
      !Array.isArray(value.fragments) ||
      !Array.isArray(value.urlAnnotations) ||
      !isNonEmptyIntegerArray(value.structurePath)
    ) {
      issues.push(issue('field.type', path));
      continue;
    }

    const structurePathKey = value.structurePath.join('.');
    if (structurePaths.has(structurePathKey)) {
      issues.push(issue('document.parity', `${path}.structurePath`));
    }
    structurePaths.add(structurePathKey);

    const fragments: PdfTextFragment[] = [];
    for (
      let fragmentIndex = 0;
      fragmentIndex < value.fragments.length;
      fragmentIndex += 1
    ) {
      const fragment = value.fragments[fragmentIndex];
      if (
        !isOwnRecord(fragment) ||
        !hasExactKeys(fragment, PDF_FRAGMENT_KEYS) ||
        !isPageNumber(fragment.pageNumber, pageCount) ||
        !isNonNegativeInteger(fragment.itemIndex) ||
        typeof fragment.text !== 'string' ||
        typeof fragment.lineWrapBefore !== 'boolean' ||
        (fragmentIndex === 0 && fragment.lineWrapBefore)
      ) {
        issues.push(
          issue('field.type', `${path}.fragments[${fragmentIndex}]`),
        );
        continue;
      }

      const key = `${fragment.pageNumber}:${fragment.itemIndex}`;
      if (fragmentKeys.has(key)) {
        issues.push(
          issue('document.parity', `${path}.fragments[${fragmentIndex}]`),
        );
      }
      fragmentKeys.add(key);
      fragments.push(fragment as unknown as PdfTextFragment);
    }

    const urlAnnotations: PdfUrlAnnotation[] = [];
    for (
      let annotationIndex = 0;
      annotationIndex < value.urlAnnotations.length;
      annotationIndex += 1
    ) {
      const annotation = value.urlAnnotations[annotationIndex];
      if (
        !isOwnRecord(annotation) ||
        !hasExactKeys(annotation, PDF_URL_KEYS) ||
        !isPageNumber(annotation.pageNumber, pageCount) ||
        !isNonNegativeInteger(annotation.annotationIndex) ||
        typeof annotation.destination !== 'string'
      ) {
        issues.push(
          issue(
            'field.type',
            `${path}.urlAnnotations[${annotationIndex}]`,
          ),
        );
        continue;
      }

      const key = `${annotation.pageNumber}:${annotation.annotationIndex}`;
      if (annotationKeys.has(key)) {
        issues.push(
          issue(
            'document.parity',
            `${path}.urlAnnotations[${annotationIndex}]`,
          ),
        );
      }
      annotationKeys.add(key);
      urlAnnotations.push(annotation as unknown as PdfUrlAnnotation);
    }

    const normalizedObservedValue = normalizePdfOccurrence(
      value.valueKind,
      fragments,
      urlAnnotations,
    );
    if (normalizedObservedValue === null) {
      issues.push(issue('document.parity', path));
      continue;
    }

    occurrences.push({
      occurrenceOrder: value.occurrenceOrder,
      sectionOrdinal: value.sectionOrdinal,
      entityOrdinal: value.entityOrdinal,
      valueKind: value.valueKind,
      fragments,
      urlAnnotations,
      structurePath: value.structurePath as unknown as NonEmptyReadonlyArray<number>,
      normalizedObservedValue,
    });
  }

  return occurrences;
}

function normalizePdfOccurrence(
  kind: ResumeManifestValueKind,
  fragments: readonly PdfTextFragment[],
  annotations: readonly PdfUrlAnnotation[],
): string | null {
  if (isLinkValueKind(kind)) {
    if (annotations.length !== 1) {
      return null;
    }
    const destination = annotations[0]?.destination;
    if (destination === undefined) {
      return null;
    }
    return kind === 'email' && destination.startsWith('mailto:')
      ? destination.slice('mailto:'.length)
      : destination;
  }

  if (annotations.length !== 0 || fragments.length === 0) {
    return null;
  }

  let value = '';
  for (const fragment of fragments) {
    if (fragment.lineWrapBefore) {
      value += ' ';
    }
    value += fragment.text.replaceAll('\u00ad', '');
  }
  return value.normalize('NFC');
}

function occurrenceMatches(
  occurrence: ParsedPdfOccurrence,
  entry: ResumeManifestEntry,
  sectionOrdinal: number,
  entityOrdinal: number | null,
): boolean {
  if (
    occurrence.sectionOrdinal !== sectionOrdinal ||
    occurrence.entityOrdinal !== entityOrdinal ||
    occurrence.valueKind !== entry.valueKind ||
    occurrence.normalizedObservedValue !== entry.normalizedValue
  ) {
    return false;
  }

  if (!isLinkValueKind(entry.valueKind)) {
    return occurrence.urlAnnotations.length === 0;
  }

  const destination = occurrence.urlAnnotations[0]?.destination;
  const expectedDestination =
    entry.valueKind === 'email'
      ? `mailto:${entry.normalizedValue}`
      : entry.normalizedValue;
  return (
    occurrence.urlAnnotations.length === 1 &&
    destination === expectedDestination
  );
}

function validateStructure(
  expected: ResumeFactManifest,
  pdf: OwnRecord,
  occurrences: readonly ParsedPdfOccurrence[],
  issues: ValidationIssue[],
): void {
  if (!structureTreeMatches(pdf.structure, expected, occurrences)) {
    issues.push(issue('document.parity', 'profile.document.pdf.structure'));
  }
}

function validateOutline(
  expected: ResumeFactManifest,
  pdf: OwnRecord,
  issues: ValidationIssue[],
): void {
  const outline = pdf.outline;
  if (
    !isOwnRecord(outline) ||
    !hasExactKeys(outline, ['entries']) ||
    !Array.isArray(outline.entries) ||
    outline.entries.length !== expected.sectionOrder.length
  ) {
    issues.push(issue('document.parity', 'profile.document.pdf.outline'));
    return;
  }

  const pageCount = typeof pdf.pageCount === 'number' ? pdf.pageCount : 0;
  for (let index = 0; index < outline.entries.length; index += 1) {
    const entry = outline.entries[index];
    if (
      !isOwnRecord(entry) ||
      !hasExactKeys(entry, [
        'outlineOrder',
        'sectionOrdinal',
        'pageNumber',
      ]) ||
      entry.outlineOrder !== index + 1 ||
      entry.sectionOrdinal !== index ||
      !isPageNumber(entry.pageNumber, pageCount)
    ) {
      issues.push(
        issue('document.parity', `profile.document.pdf.outline.entries[${index}]`),
      );
    }
  }
}

function validateRenderedPages(
  pdf: OwnRecord,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(pdf.renderedPages) || !isPositiveInteger(pdf.pageCount)) {
    issues.push(issue('document.unreadable', 'profile.document.pdf.renderedPages'));
    return;
  }

  if (pdf.renderedPages.length !== pdf.pageCount) {
    issues.push(issue('document.unreadable', 'profile.document.pdf.renderedPages'));
  }
  for (let index = 0; index < pdf.renderedPages.length; index += 1) {
    const page = pdf.renderedPages[index];
    if (
      !isOwnRecord(page) ||
      !hasExactKeys(page, ['pageNumber', 'evidenceId']) ||
      page.pageNumber !== index + 1 ||
      !isSafeIdentifier(page.evidenceId)
    ) {
      issues.push(
        issue('document.unreadable', `profile.document.pdf.renderedPages[${index}]`),
      );
    }
  }
}

function validateMappedEvidence(
  expected: ResumeFactManifest,
  candidate: unknown,
): ResumeEvidenceResult<MappedResumeEvidence> {
  if (!isOwnRecord(candidate)) {
    return evidenceFailure('field.type', 'profile.document.pdf');
  }

  const requiredKeys = [
    'schemaVersion',
    'candidate',
    'sourceIdentity',
    'fingerprint',
    'sectionOrder',
    'entityOrder',
    'mappings',
    'structure',
    'outline',
    'renderedPages',
    'tools',
  ];
  if (
    !hasExactKeys(candidate, requiredKeys) ||
    candidate.schemaVersion !== RESUME_EVIDENCE_SCHEMA_VERSION ||
    !isCandidateIdentity(candidate.candidate) ||
    !resumeDocumentDataEqual(expected.sourceIdentity, candidate.sourceIdentity) ||
    !resumeDocumentDataEqual(expected.fingerprint, candidate.fingerprint) ||
    !resumeDocumentDataEqual(expected.sectionOrder, candidate.sectionOrder) ||
    !resumeDocumentDataEqual(expected.entityOrder, candidate.entityOrder) ||
    !Array.isArray(candidate.mappings) ||
    candidate.mappings.length !== expected.entries.length ||
    !isToolVersions(candidate.tools)
  ) {
    return evidenceFailure('document.parity', 'profile.document.pdf');
  }

  const observedOrders = new Set<number>();
  const structurePaths = new Set<string>();
  const fragmentReferences = new Set<string>();
  const annotationReferences = new Set<string>();
  const renderedPageCount = Array.isArray(candidate.renderedPages)
    ? candidate.renderedPages.length
    : 0;
  for (let index = 0; index < candidate.mappings.length; index += 1) {
    const mapping = candidate.mappings[index];
    const expectedEntry = expected.entries[index];
    const expectedSectionOrdinal =
      expectedEntry === undefined
        ? -1
        : findSectionOrdinal(expected, expectedEntry);
    const expectedEntityOrdinal =
      expectedEntry === undefined
        ? undefined
        : findEntityOrdinal(expected, expectedEntry);
    if (
      !isOwnRecord(mapping) ||
      !hasExactKeys(mapping, [
        'expectedEntry',
        'observedOccurrenceOrder',
        'sectionOrdinal',
        'entityOrdinal',
        'normalizedObservedValue',
        'fragmentReferences',
        'urlAnnotationReferences',
        'structurePath',
      ]) ||
      !resumeDocumentDataEqual(
        expectedEntry,
        mapping.expectedEntry,
      ) ||
      mapping.observedOccurrenceOrder !== index + 1 ||
      observedOrders.has(mapping.observedOccurrenceOrder as number) ||
      mapping.sectionOrdinal !== expectedSectionOrdinal ||
      mapping.entityOrdinal !== expectedEntityOrdinal ||
      mapping.normalizedObservedValue !==
        expectedEntry?.normalizedValue ||
      !isReferenceArray(
        mapping.fragmentReferences,
        false,
        renderedPageCount,
      ) ||
      !isReferenceArray(
        mapping.urlAnnotationReferences,
        true,
        renderedPageCount,
      ) ||
      !isNonEmptyIntegerArray(mapping.structurePath) ||
      !mappingReferencesMatchEntry(mapping, expectedEntry) ||
      structurePaths.has(
        (mapping.structurePath as readonly number[]).join('.'),
      )
    ) {
      return evidenceFailure(
        'document.parity',
        `profile.document.pdf.mappings[${index}]`,
      );
    }
    observedOrders.add(mapping.observedOccurrenceOrder as number);
    structurePaths.add(
      (mapping.structurePath as readonly number[]).join('.'),
    );
    if (
      !addUniqueReferences(
        mapping.fragmentReferences as readonly OwnRecord[],
        false,
        fragmentReferences,
      ) ||
      !addUniqueReferences(
        mapping.urlAnnotationReferences as readonly OwnRecord[],
        true,
        annotationReferences,
      )
    ) {
      return evidenceFailure(
        'document.parity',
        `profile.document.pdf.mappings[${index}]`,
      );
    }
  }

  if (
    !isMappedStructure(candidate.structure, expected, candidate.mappings) ||
    !isMappedOutline(
      candidate.outline,
      expected,
      candidate.renderedPages,
    ) ||
    !isMappedRenderedPages(candidate.renderedPages)
  ) {
    return evidenceFailure('document.parity', 'profile.document.pdf');
  }

  return success(
    deepFreezeResumeDocumentData(candidate) as unknown as MappedResumeEvidence,
  );
}

function mappingReferencesMatchEntry(
  mapping: OwnRecord,
  entry: ResumeManifestEntry | undefined,
): boolean {
  if (
    entry === undefined ||
    !Array.isArray(mapping.fragmentReferences) ||
    !Array.isArray(mapping.urlAnnotationReferences)
  ) {
    return false;
  }
  if (!isLinkValueKind(entry.valueKind)) {
    return (
      mapping.fragmentReferences.length > 0 &&
      mapping.urlAnnotationReferences.length === 0
    );
  }
  if (mapping.urlAnnotationReferences.length !== 1) {
    return false;
  }
  const annotation = mapping.urlAnnotationReferences[0];
  const expectedDestination =
    entry.valueKind === 'email'
      ? `mailto:${entry.normalizedValue}`
      : entry.normalizedValue;
  return (
    isOwnRecord(annotation) &&
    annotation.destination === expectedDestination
  );
}

function addUniqueReferences(
  references: readonly OwnRecord[],
  annotation: boolean,
  seen: Set<string>,
): boolean {
  for (const reference of references) {
    const index = annotation
      ? reference.annotationIndex
      : reference.itemIndex;
    const key = `${reference.pageNumber}:${index}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

/** Rebrands a persisted mapped-evidence value after full structural checks. */
export function validateMappedResumeEvidence(
  expected: ResumeFactManifest,
  candidate: unknown,
): ResumeEvidenceResult<MappedResumeEvidence> {
  try {
    const safeExpected = inspectManifest(expected);
    const safeCandidate = snapshotResumeDocumentData(candidate);
    if (safeExpected === null || !safeCandidate.ok) {
      return evidenceFailure('document.parity', 'profile.document.pdf');
    }
    return validateMappedEvidence(safeExpected, safeCandidate.value);
  } catch {
    return evidenceFailure('document.parity', 'profile.document.pdf');
  }
}

function isReferenceArray(
  value: unknown,
  includesDestination: boolean,
  maximumPageNumber: number,
): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  const seen = new Set<string>();
  for (const reference of value) {
    const keys = includesDestination
      ? ['pageNumber', 'annotationIndex', 'destination']
      : ['pageNumber', 'itemIndex'];
    if (
      !isOwnRecord(reference) ||
      !hasExactKeys(reference, keys) ||
      !isPositiveInteger(reference.pageNumber) ||
      reference.pageNumber > maximumPageNumber ||
      !(includesDestination
        ? isNonNegativeInteger(reference.annotationIndex) &&
          typeof reference.destination === 'string'
        : isNonNegativeInteger(reference.itemIndex))
    ) {
      return false;
    }
    const index = includesDestination
      ? reference.annotationIndex
      : reference.itemIndex;
    const key = `${reference.pageNumber}:${index}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

function structureTreeMatches(
  value: unknown,
  expected: ResumeFactManifest,
  occurrences: readonly StructureOccurrenceBinding[],
): boolean {
  if (
    !isOwnRecord(value) ||
    !hasExactKeys(value, PDF_STRUCTURE_KEYS) ||
    value.tagged !== true ||
    !isIntegerArray(value.readingOrder) ||
    !isIntegerArray(value.sectionOrder) ||
    !isIntegerArray(value.entityOrder) ||
    !Array.isArray(value.nodes) ||
    value.nodes.length === 0
  ) {
    return false;
  }

  const nodes: OwnRecord[] = [];
  const byPath = new Map<string, OwnRecord>();
  for (let index = 0; index < value.nodes.length; index += 1) {
    const node = value.nodes[index];
    if (
      !isOwnRecord(node) ||
      !hasExactKeys(node, PDF_STRUCTURE_NODE_KEYS) ||
      node.nodeOrder !== index + 1 ||
      !isNonEmptyIntegerArray(node.path) ||
      !isStructureRole(node.role) ||
      !(
        node.parentPath === null ||
        isNonEmptyIntegerArray(node.parentPath)
      ) ||
      !Array.isArray(node.children) ||
      !node.children.every(isNonEmptyIntegerArray) ||
      !(
        node.sectionOrdinal === null ||
        isNonNegativeInteger(node.sectionOrdinal)
      ) ||
      !(
        node.entityOrdinal === null ||
        isNonNegativeInteger(node.entityOrdinal)
      ) ||
      !(
        node.occurrenceOrder === null ||
        isPositiveInteger(node.occurrenceOrder)
      ) ||
      node.path[0] !== 0
    ) {
      return false;
    }

    const key = structurePathKey(node.path);
    if (byPath.has(key)) {
      return false;
    }
    nodes.push(node);
    byPath.set(key, node);
  }

  const root = nodes[0];
  if (
    root === undefined ||
    !numberArraysEqual(root.path as readonly number[], [0]) ||
    root.role !== 'document' ||
    root.parentPath !== null ||
    root.sectionOrdinal !== null ||
    root.entityOrdinal !== null ||
    root.occurrenceOrder !== null ||
    nodes.some((node, index) => index > 0 && node.parentPath === null)
  ) {
    return false;
  }

  for (const node of nodes) {
    const children = node.children as readonly (readonly number[])[];
    const childKeys = new Set<string>();
    for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
      const childPath = children[childIndex];
      if (childPath === undefined) {
        return false;
      }
      const expectedChildPath = [
        ...(node.path as readonly number[]),
        childIndex,
      ];
      if (!numberArraysEqual(childPath, expectedChildPath)) {
        return false;
      }
      const childKey = structurePathKey(childPath);
      const child = byPath.get(childKey);
      if (
        child === undefined ||
        childKeys.has(childKey) ||
        !numberArraysEqual(
          child.parentPath as readonly number[],
          node.path as readonly number[],
        )
      ) {
        return false;
      }
      childKeys.add(childKey);
    }
    if (
      node !== root &&
      (node.parentPath === null ||
        byPath.get(
          structurePathKey(node.parentPath as readonly number[]),
        ) === undefined)
    ) {
      return false;
    }
  }

  const traversal: OwnRecord[] = [];
  const visited = new Set<string>();
  if (!appendStructurePreorder(root, byPath, visited, traversal)) {
    return false;
  }
  if (
    traversal.length !== nodes.length ||
    traversal.some((node, index) => node !== nodes[index])
  ) {
    return false;
  }

  const documents = nodes.filter((node) => node.role === 'document');
  const sections = nodes.filter((node) => node.role === 'section');
  const entities = nodes.filter((node) => node.role === 'entity');
  const facts = nodes.filter((node) => node.role === 'fact');
  if (
    documents.length !== 1 ||
    sections.length !== expected.sectionOrder.length ||
    entities.length !== expected.entityOrder.length ||
    facts.length !== occurrences.length ||
    (root.children as readonly unknown[]).length !== sections.length
  ) {
    return false;
  }

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const rootChild = (root.children as readonly (readonly number[])[])[index];
    if (
      section === undefined ||
      rootChild === undefined ||
      section.sectionOrdinal !== index ||
      section.entityOrdinal !== null ||
      section.occurrenceOrder !== null ||
      !numberArraysEqual(
        section.parentPath as readonly number[],
        root.path as readonly number[],
      ) ||
      !numberArraysEqual(
        section.path as readonly number[],
        rootChild,
      )
    ) {
      return false;
    }
  }

  for (let index = 0; index < entities.length; index += 1) {
    const node = entities[index];
    const expectedEntity = expected.entityOrder[index];
    if (
      node === undefined ||
      expectedEntity === undefined ||
      node.entityOrdinal !== index ||
      node.occurrenceOrder !== null
    ) {
      return false;
    }
    const sectionOrdinal = expected.sectionOrder.findIndex(
      (section) =>
        section.key === expectedEntity.sectionKey &&
        section.order === expectedEntity.sectionOrder,
    );
    if (sectionOrdinal < 0 || node.sectionOrdinal !== sectionOrdinal) {
      return false;
    }

    const expectedParent =
      expectedEntity.parent === null
        ? sections[sectionOrdinal]
        : entities.find((candidate, candidateIndex) => {
            const parentEntity = expected.entityOrder[candidateIndex];
            return (
              parentEntity !== undefined &&
              parentEntity.sectionKey === expectedEntity.sectionKey &&
              parentEntity.sectionOrder === expectedEntity.sectionOrder &&
              parentEntity.kind === expectedEntity.parent?.kind &&
              parentEntity.id === expectedEntity.parent.id
            );
          });
    if (
      expectedParent === undefined ||
      !numberArraysEqual(
        node.parentPath as readonly number[],
        expectedParent.path as readonly number[],
      )
    ) {
      return false;
    }
  }

  const occurrenceByOrder = new Map<number, StructureOccurrenceBinding>();
  for (const occurrence of occurrences) {
    if (
      occurrenceByOrder.has(occurrence.occurrenceOrder) ||
      !isNonEmptyIntegerArray(occurrence.structurePath)
    ) {
      return false;
    }
    occurrenceByOrder.set(occurrence.occurrenceOrder, occurrence);
  }
  for (let index = 0; index < facts.length; index += 1) {
    const node = facts[index];
    const occurrence = occurrenceByOrder.get(index + 1);
    if (
      node === undefined ||
      occurrence === undefined ||
      node.occurrenceOrder !== index + 1 ||
      node.sectionOrdinal !== occurrence.sectionOrdinal ||
      node.entityOrdinal !== occurrence.entityOrdinal ||
      (node.children as readonly unknown[]).length !== 0 ||
      !numberArraysEqual(
        node.path as readonly number[],
        occurrence.structurePath,
      )
    ) {
      return false;
    }
    const expectedParent =
      occurrence.entityOrdinal === null
        ? sections[occurrence.sectionOrdinal]
        : entities[occurrence.entityOrdinal];
    if (
      expectedParent === undefined ||
      !numberArraysEqual(
        node.parentPath as readonly number[],
        expectedParent.path as readonly number[],
      )
    ) {
      return false;
    }
  }

  return (
    numberArraysEqual(
      value.readingOrder,
      facts.map((node) => node.occurrenceOrder as number),
    ) &&
    numberArraysEqual(
      value.sectionOrder,
      sections.map((node) => node.sectionOrdinal as number),
    ) &&
    numberArraysEqual(
      value.entityOrder,
      entities.map((node) => node.entityOrdinal as number),
    )
  );
}

function appendStructurePreorder(
  node: OwnRecord,
  byPath: ReadonlyMap<string, OwnRecord>,
  visited: Set<string>,
  output: OwnRecord[],
): boolean {
  const key = structurePathKey(node.path as readonly number[]);
  if (visited.has(key)) {
    return false;
  }
  visited.add(key);
  output.push(node);
  for (const childPath of node.children as readonly (readonly number[])[]) {
    const child = byPath.get(structurePathKey(childPath));
    if (
      child === undefined ||
      !appendStructurePreorder(child, byPath, visited, output)
    ) {
      return false;
    }
  }
  return true;
}

function structurePathKey(path: readonly number[]): string {
  return path.join('/');
}

function isStructureRole(value: unknown): value is PdfStructureRole {
  return (
    value === 'document' ||
    value === 'section' ||
    value === 'entity' ||
    value === 'fact'
  );
}

function isMappedStructure(
  value: unknown,
  expected: ResumeFactManifest,
  mappings: readonly unknown[],
): boolean {
  const bindings: StructureOccurrenceBinding[] = [];
  for (const mapping of mappings) {
    if (
      !isOwnRecord(mapping) ||
      !isPositiveInteger(mapping.observedOccurrenceOrder) ||
      !isNonNegativeInteger(mapping.sectionOrdinal) ||
      !(
        mapping.entityOrdinal === null ||
        isNonNegativeInteger(mapping.entityOrdinal)
      ) ||
      !isNonEmptyIntegerArray(mapping.structurePath)
    ) {
      return false;
    }
    bindings.push({
      occurrenceOrder: mapping.observedOccurrenceOrder,
      sectionOrdinal: mapping.sectionOrdinal,
      entityOrdinal: mapping.entityOrdinal,
      structurePath: mapping.structurePath,
    });
  }
  return structureTreeMatches(value, expected, bindings);
}

function isMappedOutline(
  value: unknown,
  expected: ResumeFactManifest,
  renderedPages: unknown,
): boolean {
  if (
    !isOwnRecord(value) ||
    !hasExactKeys(value, ['entries']) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(renderedPages) ||
    value.entries.length !== expected.sectionOrder.length
  ) {
    return false;
  }
  return value.entries.every(
    (entry, index) =>
      isOwnRecord(entry) &&
      hasExactKeys(entry, [
        'outlineOrder',
        'sectionOrdinal',
        'pageNumber',
      ]) &&
      entry.outlineOrder === index + 1 &&
      entry.sectionOrdinal === index &&
      isPositiveInteger(entry.pageNumber) &&
      entry.pageNumber <= renderedPages.length,
  );
}

function isMappedRenderedPages(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (page, index) =>
        isOwnRecord(page) &&
        hasExactKeys(page, ['pageNumber', 'evidenceId']) &&
        page.pageNumber === index + 1 &&
        isSafeIdentifier(page.evidenceId),
    )
  );
}

function findSectionOrdinal(
  manifest: ResumeFactManifest,
  entry: ResumeManifestEntry,
): number {
  return manifest.sectionOrder.findIndex(
    (section) =>
      section.key === entry.sectionKey && section.order === entry.sectionOrder,
  );
}

function findEntityOrdinal(
  manifest: ResumeFactManifest,
  entry: ResumeManifestEntry,
): number | null | undefined {
  if (entry.entity === null) {
    return null;
  }

  const matches: number[] = [];
  for (let index = 0; index < manifest.entityOrder.length; index += 1) {
    const entity = manifest.entityOrder[index];
    if (
      entity !== undefined &&
      entity.sectionKey === entry.sectionKey &&
      entity.sectionOrder === entry.sectionOrder &&
      entity.kind === entry.entity.kind &&
      entity.id === entry.entity.id &&
      entity.order === entry.entity.order
    ) {
      matches.push(index);
    }
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function inspectManifest(candidate: unknown): ResumeFactManifest | null {
  const snapshot = snapshotResumeDocumentData(candidate);
  if (
    !snapshot.ok ||
    !isOwnRecord(snapshot.value) ||
    !hasExactKeys(snapshot.value, MANIFEST_KEYS) ||
    snapshot.value.schemaVersion !== RESUME_MANIFEST_SCHEMA_VERSION
  ) {
    return null;
  }

  const comparison = compareResumeFactManifests(
    snapshot.value as unknown as ResumeFactManifest,
    snapshot.value,
  );
  return comparison.ok ? comparison.value : null;
}

function surfaceIdentity(
  value: RenderedSurfaceEvidence,
): ExactSurfaceIdentity {
  return {
    surface: value.surface,
    sourceIdentity: value.sourceIdentity,
    fingerprint: value.fingerprint,
    sectionCount: value.sectionOrder.length,
    entityCount: value.entityOrder.length,
    entryCount: value.entries.length,
    sectionOrder: value.sectionOrder,
    entityOrder: value.entityOrder,
    entries: value.entries.map((entry) => {
      const base: Record<string, unknown> = {};
      for (const key of Object.keys(entry)) {
        if (!RENDERED_ENTRY_ADDITIONAL_KEYS.includes(
          key as (typeof RENDERED_ENTRY_ADDITIONAL_KEYS)[number],
        )) {
          base[key] = entry[key as keyof RenderedManifestEntryObservation];
        }
      }
      return base as unknown as ResumeManifestEntry;
    }),
  };
}

function isCandidateIdentity(value: unknown): boolean {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, ['candidateId', 'pdfSha256']) &&
    isSafeIdentifier(value.candidateId) &&
    typeof value.pdfSha256 === 'string' &&
    SHA256_PATTERN.test(value.pdfSha256)
  );
}

function isToolVersions(value: unknown): boolean {
  return (
    isOwnRecord(value) &&
    hasExactKeys(value, [
      'node',
      'playwright',
      'chromium',
      'pdfjs',
      'pretendard',
    ]) &&
    isCanonicalNonEmptyString(value.node) &&
    value.playwright === RESUME_TOOL_VERSIONS.playwright &&
    isCanonicalNonEmptyString(value.chromium) &&
    value.pdfjs === RESUME_TOOL_VERSIONS.pdfjs &&
    value.pretendard === RESUME_TOOL_VERSIONS.pretendard
  );
}

function isLinkValueKind(kind: ResumeManifestValueKind): boolean {
  return (
    kind === 'email' ||
    kind === 'github-url' ||
    kind === 'external-url' ||
    kind === 'internal-path'
  );
}

function isManifestValueKind(value: unknown): value is ResumeManifestValueKind {
  return typeof value === 'string' && VALUE_KINDS.has(value as ResumeManifestValueKind);
}

function isPageNumber(value: unknown, pageCount: number): value is number {
  return (
    isPositiveInteger(value) &&
    isPositiveInteger(pageCount) &&
    value <= pageCount
  );
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isIntegerArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(isNonNegativeInteger);
}

function isNonEmptyIntegerArray(
  value: unknown,
): value is NonEmptyReadonlyArray<number> {
  return Array.isArray(value) && value.length > 0 && value.every(isNonNegativeInteger);
}

function numberArraysEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isSafeIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.normalize('NFC') === value &&
    SAFE_IDENTIFIER_PATTERN.test(value)
  );
}

function isCanonicalNonEmptyString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\n') &&
    value.normalize('NFC') === value
  );
}

function success<Value>(value: Value): ValidationResult<Value> {
  return Object.freeze({ ok: true, value });
}

function evidenceFailure(
  code: ValidationIssue['code'],
  path: string,
): ValidationResult<never> {
  return failure([issue(code, path)]);
}

function failure(
  issues: readonly ValidationIssue[],
): ValidationResult<never> {
  const sorted = sortAndDedupeIssues(issues);
  const nonEmpty =
    sorted.length > 0
      ? sorted
      : [issue('document.parity', 'profile.document')];
  return Object.freeze({
    ok: false,
    issues: Object.freeze(nonEmpty) as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

function issue(
  code: ValidationIssue['code'],
  path: string,
): ValidationIssue {
  return createValidationIssue(code, path as ProfilePath);
}

/** @internal Shared only with the pure receipt module. */
export function snapshotResumeDocumentData(
  value: unknown,
): SnapshotResult {
  try {
    return {
      ok: true,
      value: cloneOwnedData(value, new WeakMap<object, unknown>(), 0),
    };
  } catch {
    return { ok: false };
  }
}

function cloneOwnedData(
  value: unknown,
  seen: WeakMap<object, unknown>,
  depth: number,
): unknown {
  if (depth > 100) {
    throw new TypeError('Document evidence nesting is too deep.');
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new TypeError('Document evidence number is not canonical.');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError('Document evidence contains unsupported data.');
  }
  if (seen.has(value)) {
    throw new TypeError('Document evidence must be acyclic.');
  }

  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.some(
        (key) =>
          typeof key === 'symbol' ||
          (key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key)),
      )
    ) {
      throw new TypeError('Document evidence array has extra keys.');
    }
    const clone: unknown[] = [];
    seen.set(value, clone);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined ||
        !('value' in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError('Document evidence array must be dense data.');
      }
      clone.push(cloneOwnedData(descriptor.value, seen, depth + 1));
    }
    seen.delete(value);
    return Object.freeze(clone);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Document evidence object must be plain data.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const clone: OwnRecord = Object.create(null) as OwnRecord;
  seen.set(value, clone);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string') {
      throw new TypeError('Document evidence symbol keys are forbidden.');
    }
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError('Document evidence accessors are forbidden.');
    }
    clone[key] = cloneOwnedData(descriptor.value, seen, depth + 1);
  }
  seen.delete(value);
  return Object.freeze(clone);
}

/** @internal Shared only with the pure receipt module. */
export function resumeDocumentDataEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) =>
        resumeDocumentDataEqual(value, right[index]),
      )
    );
  }
  if (!isOwnRecord(left) || !isOwnRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        resumeDocumentDataEqual(left[key], right[key]),
    )
  );
}

/** @internal Shared only with the pure receipt module. */
export function deepFreezeResumeDocumentData<Value>(value: Value): Value {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeResumeDocumentData(child);
  }
  return Object.freeze(value);
}

function isOwnRecord(value: unknown): value is OwnRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: OwnRecord,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

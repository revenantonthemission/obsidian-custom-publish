export class ResumePdfRendererError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface ResumeSurfaceFactObservation {
  readonly factOrder: number;
  readonly factId: string;
  readonly sectionOrdinal: number;
  readonly entityOrdinal: number | null;
  readonly text: string;
  readonly href: string | null;
  readonly rendered: boolean;
}

export interface ResumeSurfaceSkeleton {
  readonly sections: readonly Readonly<{ sectionOrdinal: number }>[];
  readonly entities: readonly Readonly<{
    entityOrdinal: number;
    sectionOrdinal: number | null;
    parentEntityOrdinal: number | null;
  }>[];
  readonly facts: readonly ResumeSurfaceFactObservation[];
}

/**
 * One rendered-surface observation. The approved fields come from the manifest;
 * `domPresent` and `rendered` are what the DOM decided.
 */
export interface RenderedSurfaceObservation {
  readonly schemaVersion: number;
  readonly surface: 'web' | 'print';
  readonly sourceIdentity: unknown;
  readonly fingerprint: unknown;
  readonly sectionOrder: readonly unknown[];
  readonly entityOrder: readonly unknown[];
  readonly entries: readonly Readonly<{
    occurrenceOrder: number;
    annotationOccurrence: number;
    domPresent: true;
    rendered: boolean;
  }>[];
}

export function renderResumePdfCandidate(input: {
  baseURL: string;
  buildIdentity: unknown;
  manifest: unknown;
  schemaVersion: number;
  emittedAssets?: readonly { path: string; bytes: number; sha256: string }[];
  timeoutMs?: number;
}): Promise<
  Readonly<{
    rule: string;
    candidate: Readonly<{ candidateId: string; pdfSha256: string }>;
    candidatePath: string;
    bytes: Uint8Array;
    /** Ordinal skeleton, consumed by the inspector to bound PDF extraction. */
    skeleton: ResumeSurfaceSkeleton;
    webSurface: RenderedSurfaceObservation;
    printSurface: RenderedSurfaceObservation;
    machineChecks: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    tools: Readonly<{ node: string; chromium: string }>;
    requestLedger: Readonly<Record<string, unknown>>;
  }>
>;

export const resumePdfRendererTesting: Readonly<Record<string, unknown>>;

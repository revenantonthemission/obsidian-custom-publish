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

export function renderResumePdfCandidate(input: {
  baseURL: string;
  buildIdentity: unknown;
  emittedAssets?: readonly { path: string; bytes: number; sha256: string }[];
  timeoutMs?: number;
}): Promise<
  Readonly<{
    rule: string;
    candidate: Readonly<{ candidateId: string; pdfSha256: string }>;
    candidatePath: string;
    bytes: Uint8Array;
    skeleton: ResumeSurfaceSkeleton;
    webSurface: ResumeSurfaceSkeleton;
    machineChecks: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    tools: Readonly<{ node: string; chromium: string }>;
    requestLedger: Readonly<Record<string, unknown>>;
  }>
>;

export const resumePdfRendererTesting: Readonly<Record<string, unknown>>;

import type { ResumeSurfaceSkeleton } from './pdf-renderer.d.mts';

export class ResumePdfInspectorError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function inspectResumePdfCandidate(input: {
  candidatePath: string;
  candidate: Readonly<{ candidateId: string; pdfSha256: string }>;
  sourceIdentity: unknown;
  manifestFingerprint: unknown;
  skeleton: ResumeSurfaceSkeleton;
  tools: Readonly<{ node: string; chromium: string }>;
}): Promise<
  Readonly<{
    rule: string;
    snapshot: Readonly<Record<string, any>>;
    snapshotPath: string;
  }>
>;

export const resumePdfInspectorTesting: Readonly<{
  buildStructureTree(
    skeleton: ResumeSurfaceSkeleton,
  ): Readonly<Record<string, any>>;
  findTextRun(
    stream: readonly Readonly<{
      pageNumber: number;
      itemIndex: number;
      text: string;
      hasEOL: boolean;
    }>[],
    cursor: number,
    target: string,
  ): Readonly<{ start: number; end: number; wraps: ReadonlySet<number> }> | null;
  inferValueKind(fact: Readonly<{ text: string; href: string | null }>): string;
}>;

export class ResumePdfViewerError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function buildResumePdfViewer(input: {
  candidate: Readonly<{ candidateId: string; pdfSha256: string }>;
  candidatePath: string;
  snapshot: Readonly<Record<string, any>>;
}): Promise<
  Readonly<{ rule: string; viewerPath: string; candidateHref: string }>
>;

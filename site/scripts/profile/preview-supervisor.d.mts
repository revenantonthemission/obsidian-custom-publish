export class PreviewSupervisorError extends Error {
  readonly code: string;
  readonly stage: string;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(
    message: string,
    options: {
      code: string;
      stage: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  );
}

export function startStaticPreview(input: {
  distRoot: string;
  buildIdentity: unknown;
  requiredRoutes: readonly (
    | string
    | { path: string; expectedMime: string }
  )[];
  startupTimeoutMs?: number;
  readinessTimeoutMs?: number;
  requestTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  outputLimitBytes?: number;
}): Promise<Readonly<{
  baseURL: string;
  processIdentity: Readonly<Record<string, unknown>>;
  buildIdentity: unknown;
  routes: readonly unknown[];
  cleanup(): Promise<Readonly<Record<string, unknown>>>;
  diagnostics(): Readonly<Record<string, unknown>>;
  assertActive(): void;
}>>;

export const previewSupervisorTesting: Readonly<{
  inferExpectedMime(route: string): string;
  normalizeStartupFailure(
    error: unknown,
    context: Record<string, unknown>,
  ): PreviewSupervisorError;
  normalizeRequiredRoutes(
    routes: readonly (
      | string
      | { path: string; expectedMime: string }
    )[],
  ): readonly Readonly<{ path: string; expectedMime: string }>[];
  validateExactRoute(value: string, label: string): string;
}>;

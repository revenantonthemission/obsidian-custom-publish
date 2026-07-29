export const STARTUP_RETRY_RULE: string;
export const RETRY_ELIGIBLE_STARTUP_STAGES: readonly string[];

export class StartupStageError extends Error {
  readonly stage: string;
  readonly code: string;
  readonly errorCode: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(input: {
    stage: string;
    errorCode: string;
    message: string;
    details?: Record<string, unknown>;
    cause?: unknown;
  });
}

export class StartupRetryError extends Error {
  readonly stage: string;
  readonly attempt: number;
  readonly code: string;
  readonly errorCode: string;
  readonly rule: string;
  readonly identities: readonly Readonly<Record<string, unknown>>[];
  readonly details: Readonly<Record<string, unknown>>;
}

export function isRetryEligibleStartupStage(stage: string): boolean;
export function assertFreshStartupIdentity(
  previousIdentity: Record<string, unknown> | null | undefined,
  nextIdentity: Record<string, unknown>,
): Readonly<Record<string, unknown>>;

export function runWithStartupRetry<T>(input: {
  createAttempt(context: Readonly<{
    attempt: number;
    maxAttempts: number;
    previousIdentity: Readonly<Record<string, unknown>> | null;
    rule: string;
  }>): {
    identity: Record<string, unknown>;
    getRuntimeIdentity?():
      | Record<string, unknown>
      | Promise<Record<string, unknown>>;
    run(context: Readonly<Record<string, unknown>>): Promise<T> | T;
    teardown(context: Readonly<{
      attempt: number;
      identity: Record<string, unknown>;
      failure: Record<string, unknown>;
      rule: string;
    }>): Promise<Record<string, unknown>> | Record<string, unknown>;
  } | Promise<{
    identity: Record<string, unknown>;
    getRuntimeIdentity?():
      | Record<string, unknown>
      | Promise<Record<string, unknown>>;
    run(context: Readonly<Record<string, unknown>>): Promise<T> | T;
    teardown(context: Readonly<{
      attempt: number;
      identity: Record<string, unknown>;
      failure: Record<string, unknown>;
      rule: string;
    }>): Promise<Record<string, unknown>> | Record<string, unknown>;
  }>;
}): Promise<Readonly<{
  value: T;
  evidence: Readonly<{
    attemptCount: number;
    retried: boolean;
    attempts: readonly unknown[];
  }>;
}>>;

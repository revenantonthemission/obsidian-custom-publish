export class BrowserRequestLedgerError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function installRequestLedger(
  context: {
    pages(): readonly unknown[];
    route(
      pattern: string,
      handler: (route: unknown) => Promise<void>,
    ): Promise<
      | {
          dispose(): Promise<void>;
          [Symbol.asyncDispose]?: () => Promise<void>;
        }
      | void
    >;
    on(event: string, handler: (value: any) => void): void;
    off(event: string, handler: (value: any) => void): void;
    unroute?(pattern: string, handler: (route: unknown) => Promise<void>): Promise<void>;
  },
  input: {
    baseURL: string;
    emittedAssets?: readonly {
      path: string;
      bytes: number;
      sha256: string;
    }[];
    buildIdentity?: unknown;
  },
): Promise<Readonly<{
  supervisedOrigin: string;
  finalize(input?: {
    requireProfileRoutes?: boolean;
    staticAssetEvidence?: unknown;
    timeoutMs?: number;
  }): Promise<Readonly<Record<string, any>>>;
  snapshot(): Readonly<Record<string, any>>;
}>>;

export const requestLedgerTesting: Readonly<Record<string, unknown>>;

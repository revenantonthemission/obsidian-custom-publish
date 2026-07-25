export type ProfileRoute = '/resume' | '/portfolio';
export type VerificationResult = 'pass';

export interface FileIdentity {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface BuildAssetIdentity extends FileIdentity {
  readonly kind: 'route-css' | 'route-html' | 'route-js';
  readonly route: ProfileRoute;
}

export interface AccessibilityReviewSubject {
  readonly schemaVersion: 1;
  readonly domain: 'rvnnt.accessibility-review-subject.v1';
  readonly algorithm: 'sha256';
  readonly digest: string;
  readonly authoredFiles: readonly FileIdentity[];
  readonly buildAssets: readonly BuildAssetIdentity[];
  readonly tools: Readonly<{
    node: string;
    astro: string;
    vite: string;
    playwright: string;
    axe: string;
  }>;
}

export interface CleanBuildIdentity {
  readonly id: string;
  readonly manifestSha256: string;
  readonly sourceGraphSha256: string;
  readonly outputSha256: string;
  readonly routes: readonly string[];
  readonly [key: string]: unknown;
}

export interface BrowserVerificationEvidence {
  readonly schemaVersion: 1;
  readonly group: 'browser';
  readonly result: VerificationResult;
  readonly buildId: string;
  readonly reviewSubjectSchemaVersion: 1;
  readonly reviewSubjectDigest: string;
  readonly specFiles: readonly string[];
  readonly completedMatrix: readonly string[];
  readonly obligations: Readonly<Record<string, VerificationResult>>;
  readonly skippedReasons: readonly [];
  readonly summary: Readonly<{
    discovered: number;
    passed: number;
    failed: 0;
    skipped: 0;
    didNotRun: 0;
  }>;
  readonly tools: Readonly<{
    playwright: string;
    axe: string;
    chromium: string;
    firefox: string;
    webkit: string;
  }>;
}

export interface LinkRouteEvidence {
  readonly route: ProfileRoute;
  readonly status: 200;
  readonly contentType: 'text/html';
  readonly bodyBytes: number;
  readonly canonical: string;
  readonly metadataUnique: true;
  readonly visibleSummaryMatchesDescription: true;
  readonly jsonLdVisibleFactParity: true;
}

export interface ApprovedExternalDestinationEvidence {
  readonly url: string;
  readonly verifier: string;
  readonly checkedAt: string;
  readonly result: 'approved';
}

export interface LinkMetadataVerificationEvidence {
  readonly schemaVersion: 1;
  readonly group: 'link-metadata';
  readonly result: VerificationResult;
  readonly buildId: string;
  readonly reviewSubjectSchemaVersion: 1;
  readonly reviewSubjectDigest: string;
  readonly checks: Readonly<Record<string, VerificationResult>>;
  readonly routes: readonly LinkRouteEvidence[];
  readonly externalUrlEvidence: Readonly<{
    runtimeReachabilityRequests: 0;
    destinations: readonly ApprovedExternalDestinationEvidence[];
  }>;
  readonly skippedReasons: readonly [];
}

export interface EmittedAssetIdentity extends FileIdentity {}

export interface BrowserRequestRecord {
  readonly id: number;
  readonly url: string;
  readonly resourceType: string;
  readonly initiator: string | null;
  readonly logicalRoute: ProfileRoute | null;
  readonly sameOrigin: boolean;
  readonly emittedAssetIdentity: EmittedAssetIdentity | null;
}

export interface BrowserResponseRecord extends BrowserRequestRecord {
  readonly status: number;
}

export interface BrowserRequestLedgerEvidence {
  readonly schemaVersion: 1;
  readonly rule: 'PERF-02/LC-U1-06';
  readonly supervisedOrigin: string;
  readonly buildIdentity: CleanBuildIdentity;
  readonly attempted: readonly BrowserRequestRecord[];
  readonly blocked: readonly [];
  readonly successful: readonly BrowserResponseRecord[];
  readonly external: Readonly<{
    attempted: 0;
    blocked: 0;
    successful: 0;
  }>;
  readonly guard: Readonly<{
    routeRegistration:
      | 'context-unroute-fallback'
      | 'playwright-disposable';
    pendingHandlers: 0;
    inFlightRequests: 0;
    pages: 0;
  }>;
  readonly interceptionBypassed: readonly [];
  readonly missingEmittedAssetIdentities: readonly [];
  readonly missingProfileRoutes: readonly [];
  readonly staticAssetEvidence: Readonly<{
    schemaVersion: 1;
    buildId: string;
    manifestSha256: string;
    observedAssets: readonly EmittedAssetIdentity[];
  }>;
}

export interface ManualAccessibilityState {
  readonly route: ProfileRoute;
  readonly engine: 'chromium';
  readonly viewport: '320x800' | '1440x900';
  readonly theme: 'light' | 'dark';
  readonly details: 'closed' | 'all-open' | 'not-applicable';
  readonly checks: Readonly<Record<string, VerificationResult>>;
}

export interface ManualWebAccessibilityRecord {
  readonly schemaVersion: 1;
  readonly result: VerificationResult;
  readonly reviewSubjectSchemaVersion: 1;
  readonly reviewSubjectDigest: string;
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly states: readonly ManualAccessibilityState[];
  readonly targetSizeExceptions: readonly Readonly<{
    element: string;
    wcagException: string;
    rationale: string;
  }>[];
  readonly skippedReasons: readonly [];
}

export interface ProfileAssetBudgetEvidence {
  readonly schemaVersion: 1;
  readonly rule: 'PERF-01/LC-U1-04/LC-U1-05';
  readonly result: VerificationResult;
  readonly buildIdentity: CleanBuildIdentity;
  readonly routes: readonly unknown[];
  readonly css: Readonly<Record<string, unknown>>;
  readonly javaScript: Readonly<Record<string, unknown>>;
}

export interface ComposedVerificationEvidence {
  readonly schemaVersion: 1;
  readonly command: 'test:e2e';
  readonly rule: 'LC-U1-18/LC-U1-19';
  readonly result: VerificationResult;
  readonly buildIdentity: CleanBuildIdentity;
  readonly accessibilityReviewSubject: AccessibilityReviewSubject;
  readonly groups: Readonly<{
    browser: BrowserVerificationEvidence;
    linkMetadata: LinkMetadataVerificationEvidence;
    resource: Readonly<{
      result: VerificationResult;
      assetBudget: ProfileAssetBudgetEvidence;
      requestLedger: BrowserRequestLedgerEvidence;
    }>;
    manualWebAccessibility: ManualWebAccessibilityRecord;
  }>;
}

export class VerificationProviderError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function computeAccessibilityReviewSubject(input: {
  manifest: Readonly<Record<string, unknown>>;
  siteRoot?: string;
}): Promise<AccessibilityReviewSubject>;

export interface ComposeVerificationEvidenceInput {
  command?: 'test:e2e';
  buildIdentity: CleanBuildIdentity;
  buildManifest: Readonly<{
    buildIdentity: Readonly<{
      id: string;
      sourceGraphSha256: string;
      outputSha256: string;
      routes: readonly string[];
    }>;
    pageGraph: Readonly<Record<string, unknown>>;
    routeOutputs: readonly Readonly<{
      route: string;
      outputs: readonly string[];
    }>[];
    initialRollupGraphs: Readonly<Record<string, unknown>>;
    rollupGraphs: Readonly<Record<string, unknown>>;
    viteManifest: Readonly<Record<string, unknown>>;
    outputFiles: readonly EmittedAssetIdentity[];
  }>;
  accessibilityReviewSubject: AccessibilityReviewSubject;
  browserEvidence: BrowserVerificationEvidence;
  linkMetadataEvidence: LinkMetadataVerificationEvidence;
  assetBudgetEvidence: ProfileAssetBudgetEvidence;
  requestLedgerEvidence: BrowserRequestLedgerEvidence;
  manualWebAccessibilityRecord: ManualWebAccessibilityRecord;
}

export function composeVerificationEvidence(
  input: ComposeVerificationEvidenceInput,
): ComposedVerificationEvidence;

export function runE2EVerification(input?: {
  playwrightTimeoutMs?: number;
  outputLimitBytes?: number;
}): Promise<Readonly<Record<string, unknown>>>;

export const verificationEvidenceSchema: Readonly<{
  schemaVersion: 1;
  accessibilityReviewSubjectSchemaVersion: 1;
  browserSpecFiles: readonly string[];
  browserObligations: readonly string[];
  browserMatrix: readonly string[];
  linkChecks: readonly string[];
  manualChecks: readonly string[];
  manualMatrix: readonly string[];
  reviewSubjectSourceFiles: readonly string[];
  reviewSubjectSourceDirectories: readonly string[];
}>;

export const verificationProviderTesting: Readonly<
  Record<string, (...args: readonly unknown[]) => unknown>
>;

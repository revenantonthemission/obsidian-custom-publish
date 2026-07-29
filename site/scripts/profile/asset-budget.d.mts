export class ProfileAssetBudgetError extends Error {
  readonly code: string;
  readonly errorCode: string;
  readonly stage: string;
  readonly rule: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function analyzeProfileAssets(input?: {
  manifestPath?: string;
  distRoot?: string;
}): Promise<Readonly<Record<string, any>>>;

export const assetBudgetTesting: Readonly<{
  analyzeClientJavaScript(input: any): Readonly<Record<string, any>>;
  analyzeManifest(
    manifest: any,
    readAsset: (path: string) => Promise<Uint8Array> | Uint8Array,
  ): Promise<Readonly<Record<string, any>>>;
  buildCssProvenance: (...args: any[]) => any;
  resolveProfileRouteDocument: (...args: any[]) => any;
  scanFinalHtml: (...args: any[]) => any;
  unionProfileAssets: (...args: any[]) => any;
}>;

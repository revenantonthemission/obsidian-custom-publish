export type ProfileFontMaterializationStatus = 'materialized' | 'reused';

export interface ProfileFontMaterializationResult {
  readonly status: ProfileFontMaterializationStatus;
  readonly family: 'RVNNT Profile';
  readonly packageVersion: '1.3.9';
  readonly sourceSetSha256: string;
  readonly outputCount: number;
  readonly legalComment: string;
  readonly licenseMetadata: string;
}

export class ProfileFontMaterializationError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function materializeProfileFont(): Promise<ProfileFontMaterializationResult>;

export const fontMaterializerTesting: Readonly<{
  materializeAtSiteRoot(
    siteRoot: string,
  ): Promise<ProfileFontMaterializationResult>;
}>;

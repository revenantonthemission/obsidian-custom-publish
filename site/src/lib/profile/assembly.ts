import { hasVerifiedFactApprovalCapability } from './fact-approval.js';
import {
  selectHomepageProfile,
  selectPortfolioProfile,
  selectResumeProfile,
} from './selectors.js';
import type {
  FactApprovedProfile,
  FactApprovedProfileAssembly,
  HomepageProfile,
  PortfolioProfile,
  ResumeProfile,
  ValidatedProfile,
  ValidatedProfileAssembly,
} from './types.js';

/**
 * Test-only seam for exercising validated projections without a human fact
 * approval receipt. Production consumers must use
 * `assembleFactApprovedProfile`.
 *
 * @internal
 */
export function assembleValidatedProfile(
  source: ValidatedProfile,
): ValidatedProfileAssembly {
  return Object.freeze({
    source,
    ...selectProfileViews(source),
  });
}

/**
 * Production assembly boundary. The branded input can only be produced after
 * aggregate validation and exact fact-approval correspondence succeed.
 */
export function assembleFactApprovedProfile(
  source: FactApprovedProfile,
): FactApprovedProfileAssembly {
  if (!hasVerifiedFactApprovalCapability(source)) {
    throw new TypeError(
      'A verified fact-approval capability is required for production assembly.',
    );
  }

  return Object.freeze({
    source,
    ...selectProfileViews(source.profile),
  });
}

function selectProfileViews(
  profile: ValidatedProfile,
): Readonly<{
  resume: ResumeProfile;
  portfolio: PortfolioProfile;
  homepage: HomepageProfile;
}> {
  return Object.freeze({
    resume: selectResumeProfile(profile),
    portfolio: selectPortfolioProfile(profile),
    homepage: selectHomepageProfile(profile),
  });
}

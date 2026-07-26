export { assembleFactApprovedProfile } from './assembly.js';
export {
  buildApprovedPortfolioMetadata,
  buildApprovedResumeMetadata,
  validateMetadataConsistency,
} from './metadata.js';
export {
  buildApprovedResumeDocumentRequest,
  getResumeDocumentLink,
  validateCurrentResumeDocumentRequest,
  validateResumeDocumentLink,
} from './document-boundary.js';
export { buildApprovedResumeManifest } from './resume-manifest.js';

export type {
  FactApprovalReceipt,
  FactApprovalReview,
} from './fact-approval.js';
export type {
  ResumeDocumentLink,
  ResumeDocumentRequest,
} from './document-boundary.js';
export type {
  ProfilePageMetadata,
  ProfileRoute,
  SiteIdentity,
  SocialMetadata,
} from './metadata.js';
export type { ResumeFactManifest } from './resume-manifest.js';
export type {
  FactApprovedProfile,
  FactApprovedProfileAssembly,
  HomepageProfile,
  PortfolioProfile,
  ResumeProfile,
  ValidationIssue,
  ValidationResult,
} from './types.js';

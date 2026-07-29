declare const factIdBrand: unique symbol;
declare const entityIdBrand: unique symbol;
declare const displayOrderBrand: unique symbol;
declare const normalizedTextBrand: unique symbol;
declare const singleLineTextBrand: unique symbol;
declare const bodyTextBrand: unique symbol;
declare const koreanNarrativeTextBrand: unique symbol;
declare const emailAddressBrand: unique symbol;
declare const githubProfileUrlBrand: unique symbol;
declare const externalEvidenceUrlBrand: unique symbol;
declare const internalEvidencePathBrand: unique symbol;
declare const profilePathBrand: unique symbol;
declare const normalizedProfileBrand: unique symbol;
declare const validatedProfileBrand: unique symbol;
declare const verifiedFactApprovalBrand: unique symbol;

export type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T;

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type FactId = string & { readonly [factIdBrand]: 'FactId' };

export type EntityKind =
  | 'skill-group'
  | 'skill'
  | 'experience'
  | 'achievement'
  | 'project'
  | 'education'
  | 'certification'
  | 'evidence-link';

export type EntityId<Kind extends EntityKind> = string & {
  readonly [entityIdBrand]: Kind;
};

export type DisplayOrder = number & {
  readonly [displayOrderBrand]: 'DisplayOrder';
};

export type NormalizedText = string & {
  readonly [normalizedTextBrand]: 'NormalizedText';
};

export type SingleLineText = NormalizedText & {
  readonly [singleLineTextBrand]: 'SingleLineText';
};

export type BodyText = NormalizedText & {
  readonly [bodyTextBrand]: 'BodyText';
};

export type KoreanNarrativeText = NormalizedText & {
  readonly [koreanNarrativeTextBrand]: 'KoreanNarrativeText';
};

export type KoreanSingleLineText = KoreanNarrativeText & SingleLineText;

export type EmailAddress = string & {
  readonly [emailAddressBrand]: 'EmailAddress';
};

export type GitHubProfileUrl = string & {
  readonly [githubProfileUrlBrand]: 'GitHubProfileUrl';
};

export type ExternalEvidenceUrl = string & {
  readonly [externalEvidenceUrlBrand]: 'ExternalEvidenceUrl';
};

export type InternalEvidencePath = string & {
  readonly [internalEvidencePathBrand]: 'InternalEvidencePath';
};

export type ProfilePath = string & {
  readonly [profilePathBrand]: 'ProfilePath';
};

export interface PublicFact<Value> {
  readonly factId: FactId;
  readonly value: Value;
}

export interface YearPoint {
  readonly tag: 'year';
  readonly value: string;
}

export interface YearMonthPoint {
  readonly tag: 'year-month';
  readonly value: string;
}

export type DatePoint = YearPoint | YearMonthPoint;

export interface PresentPeriodEnd {
  readonly tag: 'present';
}

export type PeriodEnd = DatePoint | PresentPeriodEnd;

export interface Period {
  readonly start: DatePoint;
  readonly end: PeriodEnd;
}

export interface ParagraphBlock {
  readonly tag: 'paragraph';
  readonly text: PublicFact<BodyText>;
}

export interface ListBlock {
  readonly tag: 'list';
  readonly style: 'ordered' | 'unordered';
  readonly items: NonEmptyReadonlyArray<PublicFact<SingleLineText>>;
}

export type ContentBlock = ParagraphBlock | ListBlock;
export type ContentBlocks = NonEmptyReadonlyArray<ContentBlock>;

export interface ExternalLinkDestination {
  readonly tag: 'external';
  readonly value: ExternalEvidenceUrl;
}

export interface InternalLinkDestination {
  readonly tag: 'internal';
  readonly value: InternalEvidencePath;
}

export type LinkDestination =
  | ExternalLinkDestination
  | InternalLinkDestination;

export type ProfileEntityReference =
  | Readonly<{
      tag: 'experience';
      id: EntityId<'experience'>;
    }>
  | Readonly<{
      tag: 'achievement';
      id: EntityId<'achievement'>;
    }>;

export interface EvidenceLink {
  readonly id: EntityId<'evidence-link'>;
  readonly order: DisplayOrder;
  readonly label: PublicFact<SingleLineText>;
  readonly destination: PublicFact<LinkDestination>;
}

export interface ProfileIdentity {
  readonly name: PublicFact<SingleLineText>;
  readonly headline: PublicFact<KoreanSingleLineText>;
}

export interface ProfileNarrative {
  readonly shortIntro: PublicFact<KoreanNarrativeText>;
  readonly detailedIntro: ContentBlocks;
  readonly resumeSummary: PublicFact<KoreanSingleLineText>;
  readonly portfolioSummary: PublicFact<KoreanSingleLineText>;
}

export interface ContactProfile {
  readonly email: PublicFact<EmailAddress>;
  readonly github: PublicFact<GitHubProfileUrl>;
  readonly additionalLinks: readonly EvidenceLink[];
}

export interface Skill {
  readonly id: EntityId<'skill'>;
  readonly order: DisplayOrder;
  readonly name: PublicFact<SingleLineText>;
}

export interface SkillGroup {
  readonly id: EntityId<'skill-group'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly skills: NonEmptyReadonlyArray<Skill>;
}

export interface Experience {
  readonly id: EntityId<'experience'>;
  readonly order: DisplayOrder;
  readonly organization: PublicFact<SingleLineText>;
  readonly role: PublicFact<SingleLineText>;
  readonly period: PublicFact<Period>;
  readonly summary: PublicFact<KoreanSingleLineText>;
  readonly details: ContentBlocks;
  readonly evidence: readonly EvidenceLink[];
}

export interface Achievement {
  readonly id: EntityId<'achievement'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly summary: PublicFact<KoreanSingleLineText>;
  readonly details: ContentBlocks;
  readonly evidence: readonly EvidenceLink[];
}

export interface Project {
  readonly id: EntityId<'project'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly outcomeSummary: PublicFact<KoreanSingleLineText>;
  readonly problem: ContentBlocks;
  readonly role: ContentBlocks;
  readonly keyDecisions: ContentBlocks;
  readonly architecture: ContentBlocks;
  readonly outcomes: ContentBlocks;
  readonly lessons: ContentBlocks;
  readonly evidence: readonly EvidenceLink[];
  readonly relatedProfileEntity?: ProfileEntityReference;
}

export interface Education {
  readonly id: EntityId<'education'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly subtitle?: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly details: readonly ContentBlock[];
  readonly evidence: readonly EvidenceLink[];
}

export interface Certification {
  readonly id: EntityId<'certification'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly issuer?: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly details: readonly ContentBlock[];
  readonly evidence: readonly EvidenceLink[];
}

export interface ProfileData {
  readonly identity: ProfileIdentity;
  readonly narrative: ProfileNarrative;
  readonly contact: ContactProfile;
  readonly skillGroups: readonly SkillGroup[];
  readonly experiences: readonly Experience[];
  readonly achievements: readonly Achievement[];
  readonly projects: readonly Project[];
  readonly education: readonly Education[];
  readonly certifications: readonly Certification[];
}

export type NormalizedProfile = DeepReadonly<ProfileData> & {
  readonly [normalizedProfileBrand]: 'NormalizedProfile';
};

export type ValidatedProfile = DeepReadonly<ProfileData> & {
  readonly [validatedProfileBrand]: 'ValidatedProfile';
};

export interface FactApprovalIdentity {
  readonly schemaVersion: number;
  readonly receiptId: string;
  readonly inventoryRevision: string;
  readonly inventoryDigest: string;
  readonly productionDiffRevision: string;
  readonly productionDiffDigest: string;
  readonly approvedRecordsDigest: string;
  readonly materializedProfileDigest: string;
  readonly decision: 'Approved';
  readonly decisionAuditId: string;
  readonly decisionRecordedAt: string;
}

export type VerifiedFactApproval = DeepReadonly<FactApprovalIdentity> & {
  readonly [verifiedFactApprovalBrand]: 'VerifiedFactApproval';
};

export interface FactApprovedProfile {
  readonly profile: ValidatedProfile;
  readonly approval: VerifiedFactApproval;
}

export interface ContactActions {
  readonly email: PublicFact<EmailAddress>;
  readonly github: PublicFact<GitHubProfileUrl>;
  readonly additionalLinks: readonly EvidenceLink[];
}

export interface ResumeProjectSummary {
  readonly id: EntityId<'project'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly outcomeSummary: PublicFact<KoreanSingleLineText>;
}

export type ProjectDimensionKey =
  | 'problem'
  | 'role'
  | 'keyDecisions'
  | 'architecture'
  | 'outcomes'
  | 'lessons';

export interface ProjectDimension<Key extends ProjectDimensionKey> {
  readonly key: Key;
  readonly blocks: ContentBlocks;
}

export type ProjectDimensions = readonly [
  ProjectDimension<'problem'>,
  ProjectDimension<'role'>,
  ProjectDimension<'keyDecisions'>,
  ProjectDimension<'architecture'>,
  ProjectDimension<'outcomes'>,
  ProjectDimension<'lessons'>,
];

export interface PortfolioProject {
  readonly id: EntityId<'project'>;
  readonly order: DisplayOrder;
  readonly title: PublicFact<SingleLineText>;
  readonly period?: PublicFact<Period>;
  readonly outcomeSummary: PublicFact<KoreanSingleLineText>;
  readonly dimensions: ProjectDimensions;
  readonly evidence: readonly EvidenceLink[];
  readonly relatedProfileEntity?: ProfileEntityReference;
}

export interface ResumeProfile {
  readonly identity: ProfileIdentity;
  readonly resumeSummary: PublicFact<KoreanSingleLineText>;
  readonly detailedIntro: ContentBlocks;
  readonly contactActions: ContactActions;
  readonly skillGroups: readonly SkillGroup[];
  readonly experiences: readonly Experience[];
  readonly achievements: readonly Achievement[];
  readonly projectSummaries: readonly ResumeProjectSummary[];
  readonly education?: NonEmptyReadonlyArray<Education>;
  readonly certifications?: NonEmptyReadonlyArray<Certification>;
}

export interface PortfolioProfile {
  readonly portfolioSummary: PublicFact<KoreanSingleLineText>;
  readonly contactActions: ContactActions;
  readonly projects: readonly PortfolioProject[];
}

export interface HomepageProfile {
  readonly name: PublicFact<SingleLineText>;
  readonly headline: PublicFact<KoreanSingleLineText>;
  readonly shortIntro: PublicFact<KoreanNarrativeText>;
  readonly routes: Readonly<{
    resume: '/resume';
    portfolio: '/portfolio';
  }>;
}

export interface ValidatedProfileAssembly {
  readonly source: ValidatedProfile;
  readonly resume: ResumeProfile;
  readonly portfolio: PortfolioProfile;
  readonly homepage: HomepageProfile;
}

export interface FactApprovedProfileAssembly {
  readonly source: FactApprovedProfile;
  readonly resume: ResumeProfile;
  readonly portfolio: PortfolioProfile;
  readonly homepage: HomepageProfile;
}

export type ProfileIssueCode =
  | 'field.required'
  | 'field.type'
  | 'text.empty'
  | 'collection.minimum'
  | 'collection.range'
  | 'fact.identifier.format'
  | 'fact.identifier.duplicate'
  | 'identifier.format'
  | 'identifier.duplicate'
  | 'order.positive-integer'
  | 'order.duplicate'
  | 'period.precision'
  | 'period.value'
  | 'period.range'
  | 'reference.kind'
  | 'reference.missing'
  | 'contact.email.invalid'
  | 'contact.github.invalid'
  | 'evidence.url.invalid'
  | 'content.block.kind'
  | 'content.block.empty'
  | 'approval.record.missing'
  | 'approval.status'
  | 'approval.value-mismatch'
  | 'approval.production-extra'
  | 'metadata.title.mismatch'
  | 'metadata.route.invalid'
  | 'metadata.description.mismatch'
  | 'metadata.claim.unsupported'
  | 'metadata.structured-data.invalid'
  | 'jsonld.serialization'
  | 'navigation.model.invalid'
  | 'navigation.current.invalid'
  | 'document.link.invalid'
  | 'document.source.invalid'
  | 'document.generation.failed'
  | 'document.missing'
  | 'document.unreadable'
  | 'document.stale'
  | 'document.parity';

export interface ValidationIssue {
  readonly code: ProfileIssueCode;
  readonly path: ProfilePath;
  readonly message: string;
}

export type ValidationResult<Value> =
  | Readonly<{
      ok: true;
      value: Value;
      issues?: never;
    }>
  | Readonly<{
      ok: false;
      issues: NonEmptyReadonlyArray<ValidationIssue>;
      value?: never;
    }>;

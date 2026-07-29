import {
  createValidationIssue,
  sortAndDedupeIssues,
} from './issues.js';
import { hasVerifiedFactApprovalCapability } from './fact-approval.js';
import {
  selectHomepageProfile,
  selectPortfolioProfile,
  selectResumeProfile,
} from './selectors.js';
import type {
  FactApprovedProfile,
  NonEmptyReadonlyArray,
  PortfolioProfile,
  PublicFact,
  ResumeProfile,
  SingleLineText,
  ValidatedProfile,
  ValidationIssue,
  ValidationResult,
} from './types.js';

declare const jsonLdDocumentBrand: unique symbol;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | JsonObject;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonLdSchemaType =
  | 'ProfilePage'
  | 'Person'
  | 'CollectionPage'
  | 'ItemList';

/**
 * C04 serializes only `payload`. `schemaType` is the typed host discriminator
 * and must equal payload["@type"].
 */
export interface JsonLdDocument {
  readonly [jsonLdDocumentBrand]: 'JsonLdDocument';
  readonly schemaType: JsonLdSchemaType;
  readonly payload: JsonObject;
}

export interface SiteIdentity {
  readonly origin: string;
}

export type ProfileRoute = 'resume' | 'portfolio';
export type ProfilePathname = '/resume' | '/portfolio';

export interface SocialMetadata {
  readonly title: string;
  readonly description: string;
  readonly url: string;
}

export interface ProfilePageMetadata {
  readonly route: ProfileRoute;
  readonly pathname: ProfilePathname;
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly openGraph: SocialMetadata;
  readonly twitter: SocialMetadata;
  readonly jsonLd: readonly JsonLdDocument[];
}

export type MetadataProjectionSource =
  | Readonly<{
      route: 'resume';
      profile: ResumeProfile;
    }>
  | Readonly<{
      route: 'portfolio';
      name: PublicFact<SingleLineText>;
      profile: PortfolioProfile;
    }>;

interface JsonDifference {
  readonly kind: 'missing' | 'extra' | 'value';
  readonly path: string;
}

type DataSnapshot =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; path: string }>;

type ApprovedSourceInspection =
  | Readonly<{ ok: true; profile: ValidatedProfile }>
  | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>;

type OwnDataRecord =
  | Readonly<{
      ok: true;
      values: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{ ok: false }>;

const METADATA_KEYS = [
  'route',
  'pathname',
  'title',
  'description',
  'canonical',
  'openGraph',
  'twitter',
  'jsonLd',
] as const;

const SOCIAL_KEYS = ['title', 'description', 'url'] as const;

export function buildApprovedResumeMetadata(
  site: SiteIdentity,
  source: FactApprovedProfile,
): ValidationResult<ProfilePageMetadata> {
  const inspected = inspectApprovedSource(source);
  if (!inspected.ok) {
    return failure(inspected.issues);
  }

  try {
    return buildResumeMetadataForTest(
      site,
      selectResumeProfile(inspected.profile),
    );
  } catch {
    return invalidApprovedSource();
  }
}

export function buildApprovedPortfolioMetadata(
  site: SiteIdentity,
  source: FactApprovedProfile,
): ValidationResult<ProfilePageMetadata> {
  const inspected = inspectApprovedSource(source);
  if (!inspected.ok) {
    return failure(inspected.issues);
  }

  try {
    const homepage = selectHomepageProfile(inspected.profile);
    return buildPortfolioMetadataForTest(
      site,
      homepage.name,
      selectPortfolioProfile(inspected.profile),
    );
  } catch {
    return invalidApprovedSource();
  }
}

/**
 * Pure projection seam for owner-local tests. Production callers must use
 * `buildApprovedResumeMetadata`.
 *
 * @internal
 */
export function buildResumeMetadataForTest(
  site: SiteIdentity,
  profile: ResumeProfile,
): ValidationResult<ProfilePageMetadata> {
  try {
    const source: MetadataProjectionSource = Object.freeze({
      route: 'resume',
      profile,
    });
    const expected = buildExpectedMetadata(site, source);
    if (!expected.ok) {
      return expected;
    }

    return validateMetadataConsistencyForTest(site, source, expected.value);
  } catch {
    return invalidProjectionSource('resume');
  }
}

/**
 * Pure projection seam for owner-local tests. Production callers must use
 * `buildApprovedPortfolioMetadata`.
 *
 * @internal
 */
export function buildPortfolioMetadataForTest(
  site: SiteIdentity,
  name: PublicFact<SingleLineText>,
  profile: PortfolioProfile,
): ValidationResult<ProfilePageMetadata> {
  try {
    const source: MetadataProjectionSource = Object.freeze({
      route: 'portfolio',
      name,
      profile,
    });
    const expected = buildExpectedMetadata(site, source);
    if (!expected.ok) {
      return expected;
    }

    return validateMetadataConsistencyForTest(site, source, expected.value);
  } catch {
    return invalidProjectionSource('portfolio');
  }
}

/**
 * Production consistency gate. A plain ValidatedProfile or projection cannot
 * cross this API; callers must present the receipt-gated FactApprovedProfile.
 */
export function validateMetadataConsistency(
  site: SiteIdentity,
  source: FactApprovedProfile,
  route: ProfileRoute,
  candidate: unknown,
): ValidationResult<ProfilePageMetadata> {
  const inspected = inspectApprovedSource(source);
  if (!inspected.ok) {
    return failure(inspected.issues);
  }

  if (route !== 'resume' && route !== 'portfolio') {
    return failure([
      createValidationIssue(
        'metadata.route.invalid',
        'profile.metadata',
      ),
    ]);
  }

  try {
    if (route === 'resume') {
      return validateMetadataConsistencyForTest(
        site,
        Object.freeze({
          route: 'resume',
          profile: selectResumeProfile(inspected.profile),
        }),
        candidate,
      );
    }

    const homepage = selectHomepageProfile(inspected.profile);
    return validateMetadataConsistencyForTest(
      site,
      Object.freeze({
        route: 'portfolio',
        name: homepage.name,
        profile: selectPortfolioProfile(inspected.profile),
      }),
      candidate,
    );
  } catch {
    return invalidApprovedSource();
  }
}

/**
 * Projection-only validation seam for deterministic mutation tests.
 *
 * @internal
 */
export function validateMetadataConsistencyForTest(
  site: SiteIdentity,
  source: MetadataProjectionSource,
  candidate: unknown,
): ValidationResult<ProfilePageMetadata> {
  try {
    if (source.route !== 'resume' && source.route !== 'portfolio') {
      return failure([
        createValidationIssue(
          'metadata.route.invalid',
          'profile.metadata',
        ),
      ]);
    }

    const expected = buildExpectedMetadata(site, source);
    if (!expected.ok) {
      return expected;
    }

    const snapshot = snapshotOwnedData(candidate, 'metadata');
    if (!snapshot.ok) {
      return invalidCandidateSnapshot(source.route, snapshot.path);
    }

    const issues: ValidationIssue[] = [];
    validateMetadataCandidate(expected.value, snapshot.value, issues);
    const finalIssues = sortAndDedupeIssues(issues);

    if (finalIssues.length > 0) {
      return failure(finalIssues);
    }

    // Return the immutable allowlisted reconstruction, never the caller's
    // possibly mutable candidate.
    return Object.freeze({
      ok: true,
      value: expected.value,
    });
  } catch {
    return invalidProjectionSource();
  }
}

function buildExpectedMetadata(
  site: SiteIdentity,
  source: MetadataProjectionSource,
): ValidationResult<ProfilePageMetadata> {
  const pathname = routePathname(source.route);
  const siteOrigin = validatedSiteOrigin(site);
  if (siteOrigin === undefined) {
    return failure([
      createValidationIssue(
        'metadata.route.invalid',
        `profile.metadata.${source.route}.canonical`,
      ),
    ]);
  }

  const canonical = `${siteOrigin}${pathname}`;
  const name =
    source.route === 'resume'
      ? source.profile.identity.name.value
      : source.name.value;
  const title =
    source.route === 'resume'
      ? `${name} — Résumé`
      : `${name} — Portfolio`;
  const description =
    source.route === 'resume'
      ? source.profile.resumeSummary.value
      : source.profile.portfolioSummary.value;
  const social = (): SocialMetadata =>
    Object.freeze({
      title,
      description,
      url: canonical,
    });

  const metadata: ProfilePageMetadata = {
    route: source.route,
    pathname,
    title,
    description,
    canonical,
    openGraph: social(),
    twitter: social(),
    jsonLd:
      source.route === 'resume'
        ? buildResumeJsonLd(canonical, title, source.profile)
        : buildPortfolioJsonLd(
            siteOrigin,
            canonical,
            title,
            source.profile,
          ),
  };

  return Object.freeze({
    ok: true,
    value: Object.freeze(metadata),
  });
}

function buildResumeJsonLd(
  canonical: string,
  title: string,
  profile: ResumeProfile,
): readonly JsonLdDocument[] {
  const personId = `${canonical}#person`;

  return frozenArray([
    jsonLdDocument(
      'ProfilePage',
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${canonical}#profile-page`,
        url: canonical,
        name: title,
        description: profile.resumeSummary.value,
        mainEntity: {
          '@id': personId,
        },
      },
    ),
    jsonLdDocument(
      'Person',
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': personId,
        name: profile.identity.name.value,
        email: profile.contactActions.email.value,
        sameAs: [profile.contactActions.github.value],
      },
    ),
  ]);
}

function buildPortfolioJsonLd(
  siteOrigin: string,
  canonical: string,
  title: string,
  profile: PortfolioProfile,
): readonly JsonLdDocument[] {
  const itemListId = `${canonical}#projects`;

  return frozenArray([
    jsonLdDocument(
      'CollectionPage',
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection-page`,
        url: canonical,
        name: title,
        description: profile.portfolioSummary.value,
        mainEntity: {
          '@id': itemListId,
        },
      },
    ),
    jsonLdDocument(
      'ItemList',
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': itemListId,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: profile.projects.length,
        itemListElement: profile.projects.map((project, index) => {
          const projectUrl =
            `${canonical}#project-${project.id}`;
          const evidenceUrls = project.evidence.map((evidence) =>
            evidence.destination.value.tag === 'external'
              ? evidence.destination.value.value
              : `${siteOrigin}${evidence.destination.value.value}`,
          );

          return {
            '@type': 'ListItem',
            position: index + 1,
            url: projectUrl,
            item: {
              '@type': 'CreativeWork',
              '@id': projectUrl,
              url: projectUrl,
              name: project.title.value,
              description: project.outcomeSummary.value,
              ...(evidenceUrls.length === 0
                ? {}
                : { citation: evidenceUrls }),
            },
          };
        }),
      },
    ),
  ]);
}

function jsonLdDocument(
  schemaType: JsonLdSchemaType,
  payload: JsonObject,
): JsonLdDocument {
  return Object.freeze({
    schemaType,
    payload: deepFreezeOwned(payload),
  }) as JsonLdDocument;
}

function inspectApprovedSource(
  source: FactApprovedProfile,
): ApprovedSourceInspection {
  try {
    if (!hasVerifiedFactApprovalCapability(source)) {
      return invalidApprovedSourceInspection();
    }

    const sourceRecord = ownDataRecord(source, ['profile', 'approval']);
    if (!sourceRecord.ok) {
      return invalidApprovedSourceInspection();
    }

    const approval = ownDataRecord(sourceRecord.values.approval, [
      'schemaVersion',
      'receiptId',
      'inventoryRevision',
      'inventoryDigest',
      'productionDiffRevision',
      'productionDiffDigest',
      'approvedRecordsDigest',
      'materializedProfileDigest',
      'decision',
      'decisionAuditId',
      'decisionRecordedAt',
    ]);
    if (
      !approval.ok ||
      approval.values.decision !== 'Approved' ||
      !isObjectLike(sourceRecord.values.profile)
    ) {
      return invalidApprovedSourceInspection();
    }

    return Object.freeze({
      ok: true,
      profile: sourceRecord.values.profile as ValidatedProfile,
    });
  } catch {
    return invalidApprovedSourceInspection();
  }
}

function validateMetadataCandidate(
  expected: ProfilePageMetadata,
  candidate: unknown,
  issues: ValidationIssue[],
): void {
  const basePath = `profile.metadata.${expected.route}`;

  if (!isObject(candidate)) {
    issues.push(
      createValidationIssue(
        'metadata.title.mismatch',
        `${basePath}.title`,
      ),
      createValidationIssue(
        'metadata.description.mismatch',
        `${basePath}.description`,
      ),
      createValidationIssue(
        'metadata.route.invalid',
        `${basePath}.canonical`,
      ),
      createValidationIssue(
        'metadata.structured-data.invalid',
        `${basePath}.jsonLd`,
      ),
    );
    return;
  }

  if (!hasOnlyKeys(candidate, METADATA_KEYS)) {
    issues.push(
      createValidationIssue(
        'metadata.claim.unsupported',
        basePath,
      ),
    );
  }

  if (
    candidate.route !== expected.route ||
    candidate.pathname !== expected.pathname ||
    candidate.canonical !== expected.canonical
  ) {
    issues.push(
      createValidationIssue(
        'metadata.route.invalid',
        `${basePath}.canonical`,
      ),
    );
  }

  if (candidate.title !== expected.title) {
    issues.push(
      createValidationIssue(
        'metadata.title.mismatch',
        `${basePath}.title`,
      ),
    );
  }

  if (candidate.description !== expected.description) {
    issues.push(
      createValidationIssue(
        'metadata.description.mismatch',
        `${basePath}.description`,
      ),
    );
  }

  validateSocialMetadata(
    expected.openGraph,
    candidate.openGraph,
    `${basePath}.openGraph`,
    issues,
  );
  validateSocialMetadata(
    expected.twitter,
    candidate.twitter,
    `${basePath}.twitter`,
    issues,
  );
  validateJsonLd(
    expected.route,
    expected.jsonLd,
    candidate.jsonLd,
    `${basePath}.jsonLd`,
    issues,
  );
}

function validateSocialMetadata(
  expected: SocialMetadata,
  candidate: unknown,
  basePath: string,
  issues: ValidationIssue[],
): void {
  if (!isObject(candidate)) {
    issues.push(
      createValidationIssue(
        'metadata.title.mismatch',
        `${basePath}.title`,
      ),
      createValidationIssue(
        'metadata.description.mismatch',
        `${basePath}.description`,
      ),
      createValidationIssue(
        'metadata.route.invalid',
        `${basePath}.url`,
      ),
    );
    return;
  }

  if (!hasOnlyKeys(candidate, SOCIAL_KEYS)) {
    issues.push(
      createValidationIssue(
        'metadata.claim.unsupported',
        basePath,
      ),
    );
  }

  if (candidate.title !== expected.title) {
    issues.push(
      createValidationIssue(
        'metadata.title.mismatch',
        `${basePath}.title`,
      ),
    );
  }
  if (candidate.description !== expected.description) {
    issues.push(
      createValidationIssue(
        'metadata.description.mismatch',
        `${basePath}.description`,
      ),
    );
  }
  if (candidate.url !== expected.url) {
    issues.push(
      createValidationIssue(
        'metadata.route.invalid',
        `${basePath}.url`,
      ),
    );
  }
}

function validateJsonLd(
  route: ProfileRoute,
  expected: readonly JsonLdDocument[],
  candidate: unknown,
  issuePath: string,
  issues: ValidationIssue[],
): void {
  const differences: JsonDifference[] = [];
  collectJsonDifferences(expected, candidate, 'jsonLd', differences);

  let hasStructuralDifference = false;
  let hasUnsupportedClaim = false;

  for (const difference of differences) {
    if (
      difference.kind === 'extra' &&
      !isStructuralCollectionPath(difference.path)
    ) {
      hasUnsupportedClaim = true;
      continue;
    }

    if (
      difference.kind === 'value' &&
      isFactClaimPath(route, difference.path)
    ) {
      hasUnsupportedClaim = true;
      continue;
    }

    hasStructuralDifference = true;
  }

  if (hasStructuralDifference) {
    issues.push(
      createValidationIssue(
        'metadata.structured-data.invalid',
        issuePath,
      ),
    );
  }
  if (hasUnsupportedClaim) {
    issues.push(
      createValidationIssue(
        'metadata.claim.unsupported',
        issuePath,
      ),
    );
  }
}

function collectJsonDifferences(
  expected: unknown,
  candidate: unknown,
  path: string,
  differences: JsonDifference[],
): void {
  if (Array.isArray(expected)) {
    if (!Array.isArray(candidate)) {
      differences.push({ kind: 'value', path });
      return;
    }

    const length = Math.max(expected.length, candidate.length);
    for (let index = 0; index < length; index += 1) {
      const itemPath = `${path}[${index}]`;
      if (index >= expected.length) {
        differences.push({ kind: 'extra', path: itemPath });
      } else if (index >= candidate.length) {
        differences.push({ kind: 'missing', path: itemPath });
      } else {
        collectJsonDifferences(
          expected[index],
          candidate[index],
          itemPath,
          differences,
        );
      }
    }
    return;
  }

  if (isObject(expected)) {
    if (!isObject(candidate)) {
      differences.push({ kind: 'value', path });
      return;
    }

    for (const key of Object.keys(expected)) {
      const childPath = `${path}.${key}`;
      if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
        differences.push({ kind: 'missing', path: childPath });
      } else {
        collectJsonDifferences(
          expected[key],
          candidate[key],
          childPath,
          differences,
        );
      }
    }

    for (const key of Object.keys(candidate)) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        differences.push({
          kind: 'extra',
          path: `${path}.${key}`,
        });
      }
    }
    return;
  }

  if (!Object.is(expected, candidate)) {
    differences.push({ kind: 'value', path });
  }
}

function isFactClaimPath(
  route: ProfileRoute,
  path: string,
): boolean {
  if (route === 'resume') {
    return (
      /^jsonLd\[0\]\.payload\.(?:name|description)$/.test(path) ||
      /^jsonLd\[1\]\.payload\.(?:name|email)$/.test(path) ||
      /^jsonLd\[1\]\.payload\.sameAs\[\d+\]$/.test(path)
    );
  }

  return (
    /^jsonLd\[0\]\.payload\.(?:name|description)$/.test(path) ||
    /^jsonLd\[1\]\.payload\.itemListElement\[\d+\]\.item\.(?:name|description)$/.test(
      path,
    ) ||
    /^jsonLd\[1\]\.payload\.itemListElement\[\d+\]\.item\.citation\[\d+\]$/.test(
      path,
    )
  );
}

function isStructuralCollectionPath(path: string): boolean {
  return (
    /^jsonLd\[\d+\]$/.test(path) ||
    /^jsonLd\[1\]\.payload\.itemListElement\[\d+\]$/.test(path)
  );
}

function routePathname(route: ProfileRoute): ProfilePathname {
  return route === 'resume' ? '/resume' : '/portfolio';
}

function validatedSiteOrigin(value: unknown): string | undefined {
  const snapshot = snapshotOwnedData(value, 'site');
  if (
    !snapshot.ok ||
    !isObject(snapshot.value) ||
    !hasOnlyKeys(snapshot.value, ['origin']) ||
    typeof snapshot.value.origin !== 'string'
  ) {
    return undefined;
  }

  try {
    const parsed = new URL(snapshot.value.origin);
    return (
      parsed.protocol === 'https:' &&
      parsed.origin === snapshot.value.origin &&
      parsed.username === '' &&
      parsed.password === ''
    )
      ? snapshot.value.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function hasOnlyKeys(
  value: Record<PropertyKey, unknown>,
  expected: readonly string[],
): boolean {
  const allowed = new Set(expected);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function ownDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
): OwnDataRecord {
  try {
    if (!isObjectLike(value) || Array.isArray(value)) {
      return Object.freeze({ ok: false });
    }

    const keys = Reflect.ownKeys(value);
    if (
      keys.some((key) => typeof key !== 'string') ||
      keys.length !== expectedKeys.length
    ) {
      return Object.freeze({ ok: false });
    }

    const expected = new Set(expectedKeys);
    const values: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      if (typeof key !== 'string' || !expected.has(key)) {
        return Object.freeze({ ok: false });
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        descriptor.enumerable !== true
      ) {
        return Object.freeze({ ok: false });
      }
      values[key] = descriptor.value;
    }

    return Object.freeze({
      ok: true,
      values: Object.freeze(values),
    });
  } catch {
    return Object.freeze({ ok: false });
  }
}

function snapshotOwnedData(
  value: unknown,
  path: string,
): DataSnapshot {
  try {
    return snapshotOwnedDataInternal(value, path, new WeakSet<object>());
  } catch {
    return Object.freeze({ ok: false, path });
  }
}

function snapshotOwnedDataInternal(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): DataSnapshot {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return Object.freeze({ ok: true, value });
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? Object.freeze({ ok: true, value })
      : Object.freeze({ ok: false, path });
  }

  if (!isObjectLike(value)) {
    return Object.freeze({ ok: false, path });
  }
  if (ancestors.has(value)) {
    return Object.freeze({ ok: false, path });
  }

  ancestors.add(value);
  const result = Array.isArray(value)
    ? snapshotArray(value, path, ancestors)
    : snapshotRecord(value, path, ancestors);
  ancestors.delete(value);
  return result;
}

function snapshotArray(
  value: readonly unknown[],
  path: string,
  ancestors: WeakSet<object>,
): DataSnapshot {
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > 10_000
  ) {
    return Object.freeze({ ok: false, path });
  }

  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== 'string' ||
        (key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key)),
    )
  ) {
    return Object.freeze({ ok: false, path });
  }

  const output: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(
      value,
      String(index),
    );
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.enumerable !== true
    ) {
      return Object.freeze({
        ok: false,
        path: `${path}[${index}]`,
      });
    }

    const child = snapshotOwnedDataInternal(
      descriptor.value,
      `${path}[${index}]`,
      ancestors,
    );
    if (!child.ok) {
      return child;
    }
    output.push(child.value);
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze(output),
  });
}

function snapshotRecord(
  value: object,
  path: string,
  ancestors: WeakSet<object>,
): DataSnapshot {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return Object.freeze({ ok: false, path });
  }

  const keys = Reflect.ownKeys(value);
  if (
    keys.length > 1_000 ||
    keys.some((key) => typeof key !== 'string')
  ) {
    return Object.freeze({ ok: false, path });
  }

  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    if (typeof key !== 'string') {
      return Object.freeze({ ok: false, path });
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.enumerable !== true
    ) {
      return Object.freeze({
        ok: false,
        path: `${path}.${key}`,
      });
    }

    const child = snapshotOwnedDataInternal(
      descriptor.value,
      `${path}.${key}`,
      ancestors,
    );
    if (!child.ok) {
      return child;
    }
    output[key] = child.value;
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze(output),
  });
}

function frozenArray<Value>(
  values: readonly Value[],
): readonly Value[] {
  return Object.freeze([...values]);
}

function deepFreezeOwned<Value>(value: Value): Value {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreezeOwned(child);
  }
  return Object.freeze(value);
}

function invalidApprovedSourceInspection(): ApprovedSourceInspection {
  return Object.freeze({
    ok: false,
    issues: Object.freeze([
      createValidationIssue('approval.status', 'profile.facts'),
    ]),
  });
}

function invalidApprovedSource<Value>(): ValidationResult<Value> {
  return failure([
    createValidationIssue('approval.status', 'profile.facts'),
  ]);
}

function invalidProjectionSource<Value>(
  route?: ProfileRoute,
): ValidationResult<Value> {
  return failure([
    createValidationIssue(
      'metadata.claim.unsupported',
      route === undefined
        ? 'profile.metadata'
        : `profile.metadata.${route}`,
    ),
  ]);
}

function invalidCandidateSnapshot<Value>(
  route: ProfileRoute,
  snapshotPath: string,
): ValidationResult<Value> {
  const basePath = `profile.metadata.${route}`;
  return failure([
    createValidationIssue(
      snapshotPath.startsWith('metadata.jsonLd')
        ? 'metadata.structured-data.invalid'
        : 'metadata.claim.unsupported',
      snapshotPath.startsWith('metadata.jsonLd')
        ? `${basePath}.jsonLd`
        : basePath,
    ),
  ]);
}

function failure<Value>(
  issues: readonly ValidationIssue[],
): ValidationResult<Value> {
  const canonical = sortAndDedupeIssues(issues);
  return Object.freeze({
    ok: false,
    issues: canonical as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

import type {
  ProfilePageMetadata,
  ProfileRoute,
} from '../../../src/lib/profile/metadata.js';
import type {
  ResumeDocumentRequest,
} from '../../../src/lib/profile/document-boundary.js';
import type {
  ResumeFactManifest,
} from '../../../src/lib/profile/resume-manifest.js';
import type {
  ProfileIssueCode,
  ProfilePath,
} from '../../../src/lib/profile/types.js';

export const METADATA_MUTATION_KINDS = [
  'pathname',
  'title',
  'canonical',
  'description',
  'approved-claim',
  'unsupported-claim',
  'structured-type',
  'structured-count',
  'structured-order',
  'structured-position',
] as const;

export type MetadataMutationKind =
  (typeof METADATA_MUTATION_KINDS)[number];

export interface MetadataMutation {
  readonly candidate: unknown;
  readonly expectedCode: ProfileIssueCode;
  readonly expectedPath: ProfilePath;
}

export function mutateMetadata(
  metadata: ProfilePageMetadata,
  kind: MetadataMutationKind,
): MetadataMutation {
  const candidate = structuredClone(metadata) as MutableRecord;
  const basePath = `profile.metadata.${metadata.route}`;

  switch (kind) {
    case 'pathname':
      candidate.pathname = `${String(candidate.pathname)}-wrong`;
      return metadataMutation(
        candidate,
        'metadata.route.invalid',
        `${basePath}.canonical`,
      );
    case 'title':
      candidate.title = `${String(candidate.title)} (변형)`;
      return metadataMutation(
        candidate,
        'metadata.title.mismatch',
        `${basePath}.title`,
      );
    case 'canonical':
      candidate.canonical = `${String(candidate.canonical)}/wrong`;
      return metadataMutation(
        candidate,
        'metadata.route.invalid',
        `${basePath}.canonical`,
      );
    case 'description':
      candidate.description = `${String(candidate.description)} 변형`;
      return metadataMutation(
        candidate,
        'metadata.description.mismatch',
        `${basePath}.description`,
      );
    case 'approved-claim':
      mutateApprovedClaim(candidate, metadata.route);
      return metadataMutation(
        candidate,
        'metadata.claim.unsupported',
        `${basePath}.jsonLd`,
      );
    case 'unsupported-claim':
      candidate.unapprovedClaim = 'canonical source에 없는 주장';
      return metadataMutation(
        candidate,
        'metadata.claim.unsupported',
        basePath,
      );
    case 'structured-type':
      jsonLdDocument(candidate, 0).payload['@type'] = 'Person';
      return metadataMutation(
        candidate,
        'metadata.structured-data.invalid',
        `${basePath}.jsonLd`,
      );
    case 'structured-count':
      jsonLdCollection(candidate).pop();
      return metadataMutation(
        candidate,
        'metadata.structured-data.invalid',
        `${basePath}.jsonLd`,
      );
    case 'structured-order':
      jsonLdCollection(candidate).reverse();
      return metadataMutation(
        candidate,
        'metadata.structured-data.invalid',
        `${basePath}.jsonLd`,
      );
    case 'structured-position':
      mutateStructuredPosition(candidate, metadata.route);
      return metadataMutation(
        candidate,
        'metadata.structured-data.invalid',
        `${basePath}.jsonLd`,
      );
  }
}

export const MANIFEST_MUTATION_KINDS = [
  'delete-entry',
  'add-entry',
  'reorder-entry',
  'source-identity',
  'entry-value-kind',
  'entry-normalized-value',
  'section-vector-key',
  'section-vector-order',
  'entry-section-key',
  'entry-section-order',
  'entity-vector-kind',
  'entity-vector-id',
  'entity-vector-order',
  'entry-entity-kind',
  'entry-entity-id',
  'entry-entity-order',
] as const;

export type ManifestMutationKind =
  (typeof MANIFEST_MUTATION_KINDS)[number];

export function mutateResumeManifest(
  manifest: ResumeFactManifest,
  kind: ManifestMutationKind,
): unknown {
  const candidate = structuredClone(manifest) as MutableRecord;
  const entries = candidate.entries as MutableRecord[];

  switch (kind) {
    case 'delete-entry':
      entries.splice(Math.floor(entries.length / 2), 1);
      return candidate;
    case 'add-entry': {
      const source = structuredClone(
        entries[entries.length - 1],
      ) as MutableRecord;
      source.entryOrder = entries.length + 1;
      source.factId = 'pbt-extra-fact';
      source.path = 'profile.pbt.extra';
      source.normalizedValue = '추가된 synthetic 사실';
      entries.push(source);
      return candidate;
    }
    case 'reorder-entry': {
      const first = entries[0];
      entries[0] = entries[1];
      entries[1] = first;
      return candidate;
    }
    case 'source-identity': {
      const sourceIdentity =
        candidate.sourceIdentity as MutableRecord;
      sourceIdentity.digest = flipDigest(
        String(sourceIdentity.digest),
      );
      return candidate;
    }
    case 'entry-value-kind':
      entries[0].valueKind = 'email';
      return candidate;
    case 'entry-normalized-value':
      entries[0].normalizedValue =
        `${String(entries[0].normalizedValue)}-변형`;
      return candidate;
    case 'section-vector-key': {
      const sections = candidate.sectionOrder as MutableRecord[];
      sections[0].key = 'skills';
      return candidate;
    }
    case 'section-vector-order': {
      const sections = candidate.sectionOrder as MutableRecord[];
      sections[0].order = Number(sections[0].order) + 100;
      return candidate;
    }
    case 'entry-section-key':
      entries[0].sectionKey = 'skills';
      return candidate;
    case 'entry-section-order':
      entries[0].sectionOrder =
        Number(entries[0].sectionOrder) + 100;
      return candidate;
    case 'entity-vector-kind': {
      const entity = firstEntityOrder(candidate);
      entity.kind = 'project';
      return candidate;
    }
    case 'entity-vector-id': {
      const entity = firstEntityOrder(candidate);
      entity.id = `${String(entity.id)}-변형`;
      return candidate;
    }
    case 'entity-vector-order': {
      const entity = firstEntityOrder(candidate);
      entity.order = Number(entity.order) + 100;
      return candidate;
    }
    case 'entry-entity-kind': {
      const entity = firstEntryEntity(entries);
      entity.kind = 'project';
      return candidate;
    }
    case 'entry-entity-id': {
      const entity = firstEntryEntity(entries);
      entity.id = `${String(entity.id)}-변형`;
      return candidate;
    }
    case 'entry-entity-order': {
      const entity = firstEntryEntity(entries);
      entity.order = Number(entity.order) + 100;
      return candidate;
    }
  }
}

export const DOCUMENT_REQUEST_MUTATION_KINDS = [
  'source-route',
  'public-href',
  'repository-path',
  'source-identity',
  'manifest-fingerprint',
  'expected-manifest',
] as const;

export type DocumentRequestMutationKind =
  (typeof DOCUMENT_REQUEST_MUTATION_KINDS)[number];

export interface DocumentRequestMutation {
  readonly candidate: unknown;
  readonly expectedCode: ProfileIssueCode;
  readonly expectedPath: string;
}

export function mutateDocumentRequest(
  request: ResumeDocumentRequest,
  kind: DocumentRequestMutationKind,
): DocumentRequestMutation {
  const candidate = structuredClone(request) as MutableRecord;

  switch (kind) {
    case 'source-route':
      candidate.sourceRoute = '/portfolio';
      return documentMutation(
        candidate,
        'document.source.invalid',
        'profile.document.sourceRoute',
      );
    case 'public-href':
      candidate.publicHref = '/resume-latest.pdf';
      return documentMutation(
        candidate,
        'document.link.invalid',
        'profile.document.publicHref',
      );
    case 'repository-path':
      candidate.repositoryPath = 'site/public/resume-latest.pdf';
      return documentMutation(
        candidate,
        'document.source.invalid',
        'profile.document.repositoryPath',
      );
    case 'source-identity': {
      const identity = candidate.sourceIdentity as MutableRecord;
      identity.digest = flipDigest(String(identity.digest));
      return documentMutation(
        candidate,
        'document.source.invalid',
        'profile.document.request.sourceIdentity',
      );
    }
    case 'manifest-fingerprint': {
      const fingerprint =
        candidate.manifestFingerprint as MutableRecord;
      fingerprint.digest = flipDigest(String(fingerprint.digest));
      return documentMutation(
        candidate,
        'document.source.invalid',
        'profile.document.request.manifestFingerprint',
      );
    }
    case 'expected-manifest':
      candidate.expectedManifest = mutateResumeManifest(
        request.expectedManifest,
        'entry-normalized-value',
      );
      return documentMutation(
        candidate,
        'document.source.invalid',
        'profile.document.expectedManifest',
      );
  }
}

export function mutateResumeDocumentLink(
  link: Readonly<{ href: string; label: string }>,
  field: 'href' | 'label',
): unknown {
  return field === 'href'
    ? { ...link, href: '/resume-latest.pdf' }
    : { ...link, label: '다른 다운로드' };
}

function mutateApprovedClaim(
  candidate: MutableRecord,
  route: ProfileRoute,
): void {
  if (route === 'resume') {
    const person = jsonLdDocument(candidate, 1);
    person.payload.name = `${String(person.payload.name)} 변형`;
    return;
  }

  const itemList = jsonLdDocument(candidate, 1).payload;
  const entries = itemList.itemListElement as MutableRecord[];
  const item = entries[0].item as MutableRecord;
  item.name = `${String(item.name)} 변형`;
}

function mutateStructuredPosition(
  candidate: MutableRecord,
  route: ProfileRoute,
): void {
  if (route === 'portfolio') {
    const itemList = jsonLdDocument(candidate, 1).payload;
    const entries = itemList.itemListElement as MutableRecord[];
    entries[0].position = Number(entries[0].position) + 1;
    return;
  }

  const page = jsonLdDocument(candidate, 0).payload;
  const mainEntity = page.mainEntity as MutableRecord;
  mainEntity['@id'] = `${String(mainEntity['@id'])}-wrong`;
}

function jsonLdCollection(candidate: MutableRecord): MutableRecord[] {
  return candidate.jsonLd as MutableRecord[];
}

function jsonLdDocument(
  candidate: MutableRecord,
  index: number,
): Readonly<{ payload: MutableRecord }> {
  const document = jsonLdCollection(candidate)[index];
  return {
    payload: document.payload as MutableRecord,
  };
}

function metadataMutation(
  candidate: unknown,
  expectedCode: ProfileIssueCode,
  expectedPath: string,
): MetadataMutation {
  return Object.freeze({
    candidate,
    expectedCode,
    expectedPath: expectedPath as ProfilePath,
  });
}

function documentMutation(
  candidate: unknown,
  expectedCode: ProfileIssueCode,
  expectedPath: string,
): DocumentRequestMutation {
  return Object.freeze({
    candidate,
    expectedCode,
    expectedPath,
  });
}

function flipDigest(value: string): string {
  return `${value[0] === '0' ? '1' : '0'}${value.slice(1)}`;
}

function firstEntityOrder(candidate: MutableRecord): MutableRecord {
  const entities = candidate.entityOrder as MutableRecord[];
  const entity = entities[0];
  if (entity === undefined) {
    throw new Error('Synthetic résumé manifest must have an entity.');
  }
  return entity;
}

function firstEntryEntity(entries: MutableRecord[]): MutableRecord {
  const entry = entries.find(
    (candidate) =>
      candidate.entity !== null &&
      typeof candidate.entity === 'object',
  );
  if (entry === undefined) {
    throw new Error(
      'Synthetic résumé manifest must have an entity-backed entry.',
    );
  }
  return entry.entity as MutableRecord;
}

type MutableRecord = Record<string, any>;

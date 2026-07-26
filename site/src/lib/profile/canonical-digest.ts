import { createValidationIssue, sortAndDedupeIssues } from './issues.js';
import type {
  Achievement,
  Certification,
  ContentBlock,
  Education,
  EvidenceLink,
  Experience,
  PublicFact,
  ResumeProfile,
  ResumeProjectSummary,
  Skill,
  SkillGroup,
  ValidationIssue,
  ValidationResult,
} from './types.js';
import type {
  ResumeEntityOrder,
  ResumeFactManifest,
  ResumeManifestEntry,
  ResumeSectionOrder,
} from './resume-manifest.js';

declare const canonicalDigestBrand: unique symbol;

export const CANONICAL_DIGEST_SCHEMA_VERSION = 1 as const;
export const PROFILE_SOURCE_DIGEST_DOMAIN =
  'obsidian-press:profile-source' as const;
export const RESUME_FACT_MANIFEST_DIGEST_DOMAIN =
  'obsidian-press:resume-fact-manifest' as const;

export type CanonicalDigestDomain =
  | typeof PROFILE_SOURCE_DIGEST_DOMAIN
  | typeof RESUME_FACT_MANIFEST_DIGEST_DOMAIN;

/** A versioned, domain-separated SHA-256 identity. */
export type CanonicalDigest<Domain extends CanonicalDigestDomain> = Readonly<{
  readonly domain: Domain;
  readonly schemaVersion: typeof CANONICAL_DIGEST_SCHEMA_VERSION;
  readonly algorithm: 'sha256';
  readonly digest: string;
  readonly [canonicalDigestBrand]: Domain;
}>;

export type ProfileSourceDigest = CanonicalDigest<
  typeof PROFILE_SOURCE_DIGEST_DOMAIN
>;
export type ResumeFactManifestDigest = CanonicalDigest<
  typeof RESUME_FACT_MANIFEST_DIGEST_DOMAIN
>;

export interface ResumeFactManifestDigestInput {
  readonly sourceIdentity: ProfileSourceDigest;
  readonly sectionOrder: readonly ResumeSectionOrder[];
  readonly entityOrder: readonly ResumeEntityOrder[];
  readonly entries: readonly ResumeManifestEntry[];
}

type CanonicalNode =
  | Readonly<{ readonly tag: 'text'; readonly value: string }>
  | Readonly<{ readonly tag: 'decimal'; readonly value: number }>
  | Readonly<{ readonly tag: 'sha256'; readonly value: string }>
  | Readonly<{ readonly tag: 'absent' }>
  | Readonly<{ readonly tag: 'present'; readonly value: CanonicalNode }>
  | Readonly<{ readonly tag: 'list'; readonly values: readonly CanonicalNode[] }>
  | Readonly<{ readonly tag: 'record'; readonly fields: readonly CanonicalField[] }>
  | Readonly<{
      readonly tag: 'variant';
      readonly variant: string;
      readonly value: CanonicalNode;
    }>;

interface CanonicalField {
  readonly tag: string;
  readonly value: CanonicalNode;
}

const TEXT = 0x01;
const DECIMAL = 0x02;
const SHA256 = 0x03;
const ABSENT = 0x04;
const PRESENT = 0x05;
const LIST = 0x06;
const RECORD = 0x07;
const VARIANT = 0x08;
const MAX_U32 = 0xffff_ffff;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const FIELD_TAG_PATTERN = /^[A-Za-z][A-Za-z0-9.-]*$/;

/**
 * Validates only the public shape of a digest. The private brand is created
 * exclusively by this module, so callers must still obtain source identity
 * through the corresponding digest function.
 */
export function validateCanonicalDigest<Domain extends CanonicalDigestDomain>(
  candidate: unknown,
  expectedDomain: Domain,
): ValidationResult<CanonicalDigest<Domain>> {
  const digest = snapshotDigest(candidate);
  if (
    digest === null ||
    digest.domain !== expectedDomain ||
    digest.schemaVersion !== CANONICAL_DIGEST_SCHEMA_VERSION ||
    digest.algorithm !== 'sha256' ||
    !isSha256(digest.digest)
  ) {
    return digestFailure('profile.document.sourceIdentity');
  }

  return Object.freeze({
    ok: true,
    value: freezeDigest(expectedDomain, digest.digest),
  });
}

/** Computes the identity of the exact selected ResumeProfile projection. */
export async function digestProfileSource(
  resume: ResumeProfile,
): Promise<ValidationResult<ProfileSourceDigest>> {
  return digestPayload(PROFILE_SOURCE_DIGEST_DOMAIN, () =>
    resumeProfileNode(resume),
  );
}

/** Computes the ordered manifest identity; the manifest fingerprint itself is excluded. */
export async function digestResumeFactManifest(
  input: ResumeFactManifestDigestInput,
): Promise<ValidationResult<ResumeFactManifestDigest>> {
  return digestPayload(RESUME_FACT_MANIFEST_DIGEST_DOMAIN, () =>
    record([
      field('sourceIdentity', sha256(input.sourceIdentity.digest)),
      field('sectionOrder', list(input.sectionOrder.map(sectionOrderNode))),
      field('entityOrder', list(input.entityOrder.map(entityOrderNode))),
      field('entries', list(input.entries.map(manifestEntryNode))),
    ]),
  );
}

async function digestPayload<Domain extends CanonicalDigestDomain>(
  domain: Domain,
  buildPayload: () => CanonicalNode,
): Promise<ValidationResult<CanonicalDigest<Domain>>> {
  try {
    const bytes = encodeEnvelope(domain, buildPayload());
    const copied = Uint8Array.from(bytes);
    const output = await globalThis.crypto.subtle.digest(
      'SHA-256',
      copied.buffer,
    );
    return Object.freeze({
      ok: true,
      value: freezeDigest(domain, toHex(new Uint8Array(output))),
    });
  } catch {
    return digestFailure('profile.document.sourceIdentity');
  }
}

function encodeEnvelope(
  domain: CanonicalDigestDomain,
  payload: CanonicalNode,
): Uint8Array {
  return concat([
    framedText(domain),
    u32(CANONICAL_DIGEST_SCHEMA_VERSION),
    encodeNode(payload),
  ]);
}

function encodeNode(node: CanonicalNode): Uint8Array {
  switch (node.tag) {
    case 'text':
      return concat([byte(TEXT), framedText(node.value)]);
    case 'decimal':
      return concat([byte(DECIMAL), framedAscii(decimalText(node.value))]);
    case 'sha256':
      return concat([byte(SHA256), hexBytes(node.value)]);
    case 'absent':
      return byte(ABSENT);
    case 'present': {
      const value = encodeNode(node.value);
      return concat([byte(PRESENT), framedBytes(value)]);
    }
    case 'list': {
      assertU32(node.values.length, 'list count');
      return concat([
        byte(LIST),
        u32(node.values.length),
        ...node.values.map((value) => framedBytes(encodeNode(value))),
      ]);
    }
    case 'record': {
      assertU32(node.fields.length, 'record field count');
      const seen = new Set<string>();
      const fields = node.fields.map((entry) => {
        if (!FIELD_TAG_PATTERN.test(entry.tag) || seen.has(entry.tag)) {
          throw new TypeError('Canonical record has an invalid or duplicate field tag.');
        }
        seen.add(entry.tag);
        return concat([framedText(entry.tag), framedBytes(encodeNode(entry.value))]);
      });
      return concat([byte(RECORD), u32(node.fields.length), ...fields]);
    }
    case 'variant': {
      if (!FIELD_TAG_PATTERN.test(node.variant)) {
        throw new TypeError('Canonical variant has an invalid tag.');
      }
      return concat([
        byte(VARIANT),
        framedText(node.variant),
        framedBytes(encodeNode(node.value)),
      ]);
    }
  }
}

function resumeProfileNode(resume: ResumeProfile): CanonicalNode {
  return record([
    field('projection', text('resume')),
    field(
      'identity',
      record([
        field('name', publicFactNode('single-line-text', resume.identity.name)),
        field(
          'headline',
          publicFactNode('korean-single-line-text', resume.identity.headline),
        ),
      ]),
    ),
    field(
      'resumeSummary',
      publicFactNode('korean-single-line-text', resume.resumeSummary),
    ),
    field('detailedIntro', contentBlocksNode(resume.detailedIntro)),
    field(
      'contactActions',
      record([
        field('email', publicFactNode('email', resume.contactActions.email)),
        field('github', publicFactNode('github-url', resume.contactActions.github)),
        field(
          'additionalLinks',
          list(resume.contactActions.additionalLinks.map(evidenceLinkNode)),
        ),
      ]),
    ),
    field('skillGroups', list(resume.skillGroups.map(skillGroupNode))),
    field('experiences', list(resume.experiences.map(experienceNode))),
    field('achievements', list(resume.achievements.map(achievementNode))),
    field('projectSummaries', list(resume.projectSummaries.map(projectNode))),
    field(
      'education',
      optionalListNode(resume.education, (value) => educationNode(value)),
    ),
    field(
      'certifications',
      optionalListNode(resume.certifications, (value) => certificationNode(value)),
    ),
  ]);
}

function publicFactNode<Value>(
  valueKind: string,
  fact: PublicFact<Value>,
): CanonicalNode {
  return record([
    field('factId', text(String(fact.factId))),
    field('valueKind', text(valueKind)),
    field('value', valueNode(valueKind, fact.value)),
  ]);
}

function valueNode(valueKind: string, value: unknown): CanonicalNode {
  if (valueKind === 'period') {
    return periodNode(value as ResumeProfile['experiences'][number]['period']['value']);
  }
  if (valueKind === 'link-destination') {
    const destination = value as EvidenceLink['destination']['value'];
    return variant(
      destination.tag,
      record([field('value', text(String(destination.value)))]),
    );
  }
  return text(String(value));
}

function contentBlocksNode(blocks: readonly ContentBlock[]): CanonicalNode {
  return list(
    blocks.map((block) => {
      if (block.tag === 'paragraph') {
        return variant(
          'paragraph',
          record([
            field('text', publicFactNode('body-text', block.text)),
          ]),
        );
      }
      return variant(
        'list',
        record([
          field('style', text(block.style)),
          field(
            'items',
            list(
              block.items.map((item) =>
                publicFactNode('single-line-text', item),
              ),
            ),
          ),
        ]),
      );
    }),
  );
}

function evidenceLinkNode(link: EvidenceLink): CanonicalNode {
  return record([
    field('kind', text('evidence-link')),
    field('id', text(String(link.id))),
    field('order', decimal(Number(link.order))),
    field('label', publicFactNode('single-line-text', link.label)),
    field(
      'destination',
      publicFactNode('link-destination', link.destination),
    ),
  ]);
}

function skillGroupNode(group: SkillGroup): CanonicalNode {
  return record([
    field('kind', text('skill-group')),
    field('id', text(String(group.id))),
    field('order', decimal(Number(group.order))),
    field('title', publicFactNode('single-line-text', group.title)),
    field(
      'skills',
      list(
        group.skills.map((skill) =>
          record([
            field('kind', text('skill')),
            field('id', text(String(skill.id))),
            field('order', decimal(Number(skill.order))),
            field('name', publicFactNode('single-line-text', skill.name)),
          ]),
        ),
      ),
    ),
  ]);
}

function experienceNode(value: Experience): CanonicalNode {
  return record([
    field('kind', text('experience')),
    field('id', text(String(value.id))),
    field('order', decimal(Number(value.order))),
    field('organization', publicFactNode('single-line-text', value.organization)),
    field('role', publicFactNode('single-line-text', value.role)),
    field('period', publicFactNode('period', value.period)),
    field('summary', publicFactNode('korean-single-line-text', value.summary)),
    field('details', contentBlocksNode(value.details)),
    field('evidence', list(value.evidence.map(evidenceLinkNode))),
  ]);
}

function achievementNode(value: Achievement): CanonicalNode {
  return record([
    field('kind', text('achievement')),
    field('id', text(String(value.id))),
    field('order', decimal(Number(value.order))),
    field('title', publicFactNode('single-line-text', value.title)),
    field(
      'period',
      value.period === undefined
        ? absent()
        : present(publicFactNode('period', value.period)),
    ),
    field('summary', publicFactNode('korean-single-line-text', value.summary)),
    field('details', contentBlocksNode(value.details)),
    field('evidence', list(value.evidence.map(evidenceLinkNode))),
  ]);
}

function projectNode(value: ResumeProjectSummary): CanonicalNode {
  return record([
    field('kind', text('project')),
    field('id', text(String(value.id))),
    field('order', decimal(Number(value.order))),
    field('title', publicFactNode('single-line-text', value.title)),
    field(
      'period',
      value.period === undefined
        ? absent()
        : present(publicFactNode('period', value.period)),
    ),
    field(
      'outcomeSummary',
      publicFactNode('korean-single-line-text', value.outcomeSummary),
    ),
  ]);
}

function educationNode(value: Education): CanonicalNode {
  return record([
    field('kind', text('education')),
    field('id', text(String(value.id))),
    field('order', decimal(Number(value.order))),
    field('title', publicFactNode('single-line-text', value.title)),
    field(
      'subtitle',
      value.subtitle === undefined
        ? absent()
        : present(publicFactNode('single-line-text', value.subtitle)),
    ),
    field(
      'period',
      value.period === undefined
        ? absent()
        : present(publicFactNode('period', value.period)),
    ),
    field('details', contentBlocksNode(value.details)),
    field('evidence', list(value.evidence.map(evidenceLinkNode))),
  ]);
}

function certificationNode(value: Certification): CanonicalNode {
  return record([
    field('kind', text('certification')),
    field('id', text(String(value.id))),
    field('order', decimal(Number(value.order))),
    field('title', publicFactNode('single-line-text', value.title)),
    field(
      'issuer',
      value.issuer === undefined
        ? absent()
        : present(publicFactNode('single-line-text', value.issuer)),
    ),
    field(
      'period',
      value.period === undefined
        ? absent()
        : present(publicFactNode('period', value.period)),
    ),
    field('details', contentBlocksNode(value.details)),
    field('evidence', list(value.evidence.map(evidenceLinkNode))),
  ]);
}

function periodNode(period: ResumeProfile['experiences'][number]['period']['value']): CanonicalNode {
  const datePoint = (value: { readonly tag: string; readonly value: string }) =>
    variant(value.tag, record([field('value', text(value.value))]));
  return record([
    field('start', datePoint(period.start)),
    field(
      'end',
      period.end.tag === 'present'
        ? variant('present', record([]))
        : datePoint(period.end),
    ),
  ]);
}

function sectionOrderNode(value: ResumeSectionOrder): CanonicalNode {
  return record([
    field('key', text(value.key)),
    field('order', decimal(value.order)),
  ]);
}

function entityOrderNode(value: ResumeEntityOrder): CanonicalNode {
  return record([
    field('sectionKey', text(value.sectionKey)),
    field('sectionOrder', decimal(value.sectionOrder)),
    field('kind', text(value.kind)),
    field('id', text(value.id)),
    field('order', decimal(value.order)),
    field(
      'parent',
      value.parent === null
        ? absent()
        : present(
            record([
              field('kind', text(value.parent.kind)),
              field('id', text(value.parent.id)),
            ]),
          ),
    ),
  ]);
}

function manifestEntryNode(value: ResumeManifestEntry): CanonicalNode {
  return record([
    field('entryOrder', decimal(value.entryOrder)),
    field('sectionKey', text(value.sectionKey)),
    field('sectionOrder', decimal(value.sectionOrder)),
    field(
      'entity',
      value.entity === null
        ? absent()
        : present(
            record([
              field('kind', text(value.entity.kind)),
              field('id', text(value.entity.id)),
              field('order', decimal(value.entity.order)),
            ]),
          ),
    ),
    field('factId', text(value.factId)),
    field('path', text(value.path)),
    field('valueKind', text(value.valueKind)),
    field('normalizedValue', text(value.normalizedValue)),
  ]);
}

function optionalListNode<Value>(
  value: readonly Value[] | undefined,
  mapper: (entry: Value) => CanonicalNode,
): CanonicalNode {
  return value === undefined ? absent() : present(list(value.map(mapper)));
}

function record(fields: readonly CanonicalField[]): CanonicalNode {
  return { tag: 'record', fields };
}

function field(tag: string, value: CanonicalNode): CanonicalField {
  return { tag, value };
}

function text(value: string): CanonicalNode {
  return { tag: 'text', value };
}

function decimal(value: number): CanonicalNode {
  return { tag: 'decimal', value };
}

function sha256(value: string): CanonicalNode {
  return { tag: 'sha256', value };
}

function absent(): CanonicalNode {
  return { tag: 'absent' };
}

function present(value: CanonicalNode): CanonicalNode {
  return { tag: 'present', value };
}

function list(values: readonly CanonicalNode[]): CanonicalNode {
  return { tag: 'list', values };
}

function variant(variantTag: string, value: CanonicalNode): CanonicalNode {
  return { tag: 'variant', variant: variantTag, value };
}

function framedText(value: string): Uint8Array {
  return framedBytes(utf8(value));
}

function framedAscii(value: string): Uint8Array {
  return framedBytes(new TextEncoder().encode(value));
}

function framedBytes(value: Uint8Array): Uint8Array {
  assertU32(value.byteLength, 'byte length');
  return concat([u32(value.byteLength), value]);
}

function utf8(value: string): Uint8Array {
  if (hasUnpairedSurrogate(value)) {
    throw new TypeError('Canonical text cannot contain an unpaired surrogate.');
  }
  return new TextEncoder().encode(value.normalize('NFC'));
}

function decimalText(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('Canonical decimal must be a non-negative safe integer.');
  }
  return String(value);
}

function hexBytes(value: string): Uint8Array {
  if (!isSha256(value)) {
    throw new TypeError('Canonical SHA-256 value must be lowercase hexadecimal.');
  }
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function byte(value: number): Uint8Array {
  return Uint8Array.of(value);
}

function u32(value: number): Uint8Array {
  assertU32(value, 'unsigned 32-bit integer');
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  assertU32(length, 'encoded payload length');
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function assertU32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_U32) {
    throw new TypeError(`${label} must fit an unsigned 32-bit integer.`);
  }
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function toHex(value: Uint8Array): string {
  return Array.from(value, (byteValue) => byteValue.toString(16).padStart(2, '0')).join('');
}

function freezeDigest<Domain extends CanonicalDigestDomain>(
  domain: Domain,
  digest: string,
): CanonicalDigest<Domain> {
  return Object.freeze({
    domain,
    schemaVersion: CANONICAL_DIGEST_SCHEMA_VERSION,
    algorithm: 'sha256' as const,
    digest,
  }) as CanonicalDigest<Domain>;
}

function digestFailure(path: string): ValidationResult<never> {
  const issues = sortAndDedupeIssues([
    createValidationIssue('document.source.invalid', path),
  ]);
  return Object.freeze({ ok: false, issues: issues as [ValidationIssue, ...ValidationIssue[]] });
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function snapshotDigest(
  candidate: unknown,
): Readonly<Record<string, unknown>> | null {
  try {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return null;
    }
    const prototype = Object.getPrototypeOf(candidate);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    const keys = Reflect.ownKeys(candidate);
    if (
      keys.length !== DIGEST_KEYS.length ||
      keys.some(
        (key) =>
          typeof key !== 'string' ||
          !DIGEST_KEYS.includes(key as (typeof DIGEST_KEYS)[number]),
      )
    ) {
      return null;
    }

    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of DIGEST_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (
        descriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

const DIGEST_KEYS = ['domain', 'schemaVersion', 'algorithm', 'digest'] as const;

export type { ResumeFactManifest };

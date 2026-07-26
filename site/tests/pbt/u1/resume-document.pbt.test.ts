import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  digestProfileSource,
  digestResumeFactManifest,
} from '../../../src/lib/profile/canonical-digest.js';
import {
  buildApprovedResumeDocumentRequest,
  getResumeDocumentLink,
  validateCurrentResumeDocumentRequest,
  validateResumeDocumentLink,
} from '../../../src/lib/profile/document-boundary.js';
import {
  buildResumeManifestForTest,
  compareResumeFactManifests,
} from '../../../src/lib/profile/resume-manifest.js';
import type {
  ResumeFactManifest,
} from '../../../src/lib/profile/resume-manifest.js';
import type {
  ResumeProfile,
} from '../../../src/lib/profile/types.js';
import {
  approveSyntheticProfile,
  buildResumeManifestOracle,
  documentRequestMutationKindArbitrary,
  resumeManifestSourceArbitrary,
} from './arbitraries/manifest.js';
import {
  MANIFEST_MUTATION_KINDS,
  mutateDocumentRequest,
  mutateResumeDocumentLink,
  mutateResumeManifest,
} from './mutations.js';

test.prop([resumeManifestSourceArbitrary])(
  'U1-P12 canonical digests are deterministic, NFC-stable and field-sensitive',
  async ({ resume }) => {
    const first = await digestProfileSource(resume);
    const repeated = await digestProfileSource(resume);
    expect(first.ok).toBe(true);
    expect(repeated.ok).toBe(true);
    if (!first.ok || !repeated.ok) return;

    expect(repeated.value).toEqual(first.value);
    expect(first.value.domain).toBe('obsidian-press:profile-source');
    expect(first.value.schemaVersion).toBe(1);
    expect(first.value.algorithm).toBe('sha256');
    expect(first.value.digest).toMatch(/^[a-f0-9]{64}$/);

    const composed = await digestProfileSource(
      resumeWithSummary(resume, '합성 Café'),
    );
    const decomposed = await digestProfileSource(
      resumeWithSummary(resume, '합성 Cafe\u0301'),
    );
    const changed = await digestProfileSource(
      resumeWithSummary(resume, '합성 Cafés'),
    );
    expect(composed.ok).toBe(true);
    expect(decomposed.ok).toBe(true);
    expect(changed.ok).toBe(true);
    if (!composed.ok || !decomposed.ok || !changed.ok) return;

    expect(decomposed.value.digest).toBe(composed.value.digest);
    expect(changed.value.digest).not.toBe(composed.value.digest);
  },
);

test.prop([resumeManifestSourceArbitrary])(
  'U1-P12 builds a complete ordered fact/path/kind/value manifest',
  async ({ resume }) => {
    const built = await buildResumeManifestForTest(resume);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const manifest = built.value;
    const oracle = buildResumeManifestOracle(resume);

    const repeated = await buildResumeManifestForTest(resume);
    expect(repeated).toEqual(built);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.sectionOrder).toEqual(oracle.sectionOrder);
    expect(manifest.entityOrder).toEqual(oracle.entityOrder);
    expect(manifest.entries).toEqual(oracle.entries);

    const sourceDigest = await digestProfileSource(resume);
    expect(sourceDigest.ok).toBe(true);
    if (sourceDigest.ok) {
      expect(manifest.sourceIdentity).toEqual(sourceDigest.value);
    }

    const fingerprint = await recomputeManifestFingerprint(manifest);
    expect(fingerprint.ok).toBe(true);
    if (fingerprint.ok) {
      expect(manifest.fingerprint).toEqual(fingerprint.value);
      expect(manifest.fingerprint.domain).toBe(
        'obsidian-press:resume-fact-manifest',
      );
      expect(manifest.fingerprint.digest).not.toBe(
        manifest.sourceIdentity.digest,
      );
    }
  },
);

test.prop([resumeManifestSourceArbitrary])(
  'U1-P12 accepts only exact ordered manifest parity',
  async ({ resume }) => {
    const built = await buildResumeManifestForTest(resume);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const identical = compareResumeFactManifests(
      built.value,
      structuredClone(built.value),
    );
    expect(identical.ok).toBe(true);

    for (const mutationKind of MANIFEST_MUTATION_KINDS) {
      const candidate = mutateResumeManifest(
        built.value,
        mutationKind,
      );
      expect(candidate).not.toEqual(built.value);

      const mismatch = compareResumeFactManifests(
        built.value,
        candidate,
      );
      expect(mismatch.ok, mutationKind).toBe(false);
      if (!mismatch.ok) {
        expect(mismatch.issues).toEqual([
          expect.objectContaining({
            code: 'document.parity',
            path: 'profile.document.parity',
          }),
        ]);
      }
    }
  },
);

test.prop([
  resumeManifestSourceArbitrary,
  documentRequestMutationKindArbitrary,
])(
  'U1-P12 guards source identity, fixed paths and full request parity',
  async ({ validated }, mutationKind) => {
    const assembly = approveSyntheticProfile(validated);
    const built = await buildApprovedResumeDocumentRequest(assembly);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    expect(built.value.sourceRoute).toBe('/resume');
    expect(built.value.publicHref).toBe('/resume.pdf');
    expect(built.value.repositoryPath).toBe('site/public/resume.pdf');
    expect(built.value.sourceIdentity).toEqual(
      built.value.expectedManifest.sourceIdentity,
    );
    expect(built.value.manifestFingerprint).toEqual(
      built.value.expectedManifest.fingerprint,
    );

    const current = await validateCurrentResumeDocumentRequest(
      built.value,
      assembly,
    );
    expect(current.ok).toBe(true);

    const mutation = mutateDocumentRequest(
      built.value,
      mutationKind,
    );
    const rejected = await validateCurrentResumeDocumentRequest(
      mutation.candidate,
      assembly,
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.issues).toContainEqual(
        expect.objectContaining({
          code: mutation.expectedCode,
          path: mutation.expectedPath,
        }),
      );
      expect('value' in rejected).toBe(false);
    }
  },
);

test.prop([fc.constantFrom<'href' | 'label'>('href', 'label')])(
  'U1-P12 exposes one stable résumé PDF link and rejects link drift',
  (field) => {
    const link = getResumeDocumentLink();
    expect(link).toEqual({
      href: '/resume.pdf',
      label: 'PDF 이력서 다운로드',
    });
    expect(validateResumeDocumentLink(link).ok).toBe(true);

    const mutation = mutateResumeDocumentLink(link, field);
    const result = validateResumeDocumentLink(mutation);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toEqual(
        expect.objectContaining({
          code: 'document.link.invalid',
          path: 'profile.document.href',
        }),
      );
    }
  },
);

function resumeWithSummary(
  profile: ResumeProfile,
  value: string,
): ResumeProfile {
  const candidate = structuredClone(profile) as unknown as {
    resumeSummary: { value: string };
  };
  candidate.resumeSummary.value = value;
  return candidate as unknown as ResumeProfile;
}

function recomputeManifestFingerprint(manifest: ResumeFactManifest) {
  return digestResumeFactManifest({
    sourceIdentity: manifest.sourceIdentity,
    sectionOrder: manifest.sectionOrder,
    entityOrder: manifest.entityOrder,
    entries: manifest.entries,
  });
}

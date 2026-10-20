import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  getCurrentResumeDocumentLink,
  resolveCurrentResumeDocumentLinkForTest,
} from '../../src/lib/profile/current-resume-document.js';
import { getResumeDocumentLink } from '../../src/lib/profile/document-boundary.js';
import { buildResumeManifestForTest } from '../../src/lib/profile/resume-manifest.js';
import { selectResumeProfile } from '../../src/lib/profile/selectors.js';
import type { FactApprovedProfile } from '../../src/lib/profile/types.js';
import { validateProfile } from '../../src/lib/profile/validation.js';
import { cloneProfileFixture } from '../fixtures/profile-fixtures.js';

async function fixture() {
  const profile = validateProfile(cloneProfileFixture());
  if (!profile.ok) throw new Error('Invalid profile fixture.');
  const result = await buildResumeManifestForTest(selectResumeProfile(profile.value));
  if (!result.ok) throw new Error('Invalid manifest fixture.');
  const manifest = result.value;
  const pdfBytes = new TextEncoder().encode('%PDF-1.7\nsynthetic document bytes\n%%EOF');
  const identity = {
    candidateId: 'a'.repeat(64),
    pdfSha256: createHash('sha256').update(pdfBytes).digest('hex'),
    sourceIdentity: { ...manifest.sourceIdentity },
    manifestFingerprint: { ...manifest.fingerprint },
    manifestDigest: { ...manifest.fingerprint },
  };
  const receipt = {
    schemaVersion: 1,
    kind: 'resume-release',
    result: 'approved',
    publicTarget: { href: '/resume.pdf', repositoryPath: 'site/public/resume.pdf' },
    ...structuredClone(identity),
    machineReceiptIdentity: { schemaVersion: 1, ...structuredClone(identity) },
    manualReview: {
      schemaVersion: 1,
      kind: 'resume-human-review',
      result: 'pass',
      ...structuredClone(identity),
    },
  };
  return { manifest, pdfBytes, receipt };
}

describe('current résumé document link', () => {
  test('returns only the public link when current identities and PDF bytes match', async () => {
    const { manifest, pdfBytes, receipt } = await fixture();
    expect(resolveCurrentResumeDocumentLinkForTest(manifest, receipt, pdfBytes)).toEqual(
      getResumeDocumentLink()
    );
  });

  test('withholds the link after source or manifest identity changes', async () => {
    const { manifest, pdfBytes, receipt } = await fixture();
    for (const key of ['sourceIdentity', 'fingerprint'] as const) {
      const changed = { ...manifest, [key]: { ...manifest[key], digest: 'b'.repeat(64) } };
      expect(resolveCurrentResumeDocumentLinkForTest(changed, receipt, pdfBytes)).toBeUndefined();
    }
  });

  test('hashes the actual PDF and rejects changed or missing bytes', async () => {
    const { manifest, receipt } = await fixture();
    for (const bytes of [new Uint8Array(), new TextEncoder().encode('different document')]) {
      expect(resolveCurrentResumeDocumentLinkForTest(manifest, receipt, bytes)).toBeUndefined();
    }
  });

  test('requires an approved release at the fixed public target', async () => {
    const { manifest, pdfBytes, receipt } = await fixture();
    for (const changed of [
      { ...receipt, schemaVersion: 2 },
      { ...receipt, kind: 'resume-draft' },
      { ...receipt, result: 'pending' },
      { ...receipt, publicTarget: { ...receipt.publicTarget, href: '/old-resume.pdf' } },
      {
        ...receipt,
        publicTarget: { ...receipt.publicTarget, repositoryPath: 'site/public/old.pdf' },
      },
      { ...receipt, sourceIdentity: { ...receipt.sourceIdentity, algorithm: 'sha1' } },
    ]) {
      expect(resolveCurrentResumeDocumentLinkForTest(manifest, changed, pdfBytes)).toBeUndefined();
    }
  });

  test('requires machine and human review identities to refer to the same released bytes', async () => {
    const { manifest, pdfBytes, receipt } = await fixture();
    for (const key of ['machineReceiptIdentity', 'manualReview'] as const) {
      const changed = { ...receipt, [key]: { ...receipt[key], pdfSha256: 'c'.repeat(64) } };
      expect(resolveCurrentResumeDocumentLinkForTest(manifest, changed, pdfBytes)).toBeUndefined();
    }
    expect(
      resolveCurrentResumeDocumentLinkForTest(
        manifest,
        {
          ...receipt,
          manualReview: { ...receipt.manualReview, result: 'pending' },
        },
        pdfBytes
      )
    ).toBeUndefined();
  });

  test('rejects malformed receipts without invoking getters', async () => {
    const { manifest, pdfBytes, receipt } = await fixture();
    let reads = 0;
    const candidate = {
      ...receipt,
      get result() {
        reads += 1;
        return 'approved';
      },
    };
    for (const value of [null, {}, candidate]) {
      expect(resolveCurrentResumeDocumentLinkForTest(manifest, value, pdfBytes)).toBeUndefined();
    }
    expect(reads).toBe(0);
  });

  test('the production entry rejects an unapproved source', async () => {
    expect(await getCurrentResumeDocumentLink({} as FactApprovedProfile)).toBeUndefined();
  });
});

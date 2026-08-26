import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import receiptDocument from '../../verification/profile/fact-approval.json';
import { profileData } from '../../src/lib/profile/profile-data.js';
import {
  getProductionProfileAssembly,
  productionProfileTesting,
} from '../../src/lib/profile/production-profile.js';
import { buildApprovedResumeManifest } from '../../src/lib/profile/resume-manifest.js';
import { buildApprovedResumeDocumentRequest } from '../../src/lib/profile/document-boundary.js';
import type { ProfileData } from '../../src/lib/profile/types.js';

const EXPECTED_MATERIALIZED_DIGEST =
  '3f9a26e5e8f789f0017d9804a2c199dfcd68d2eb562b6f4c0e407e8f230b3a24';
const FORBIDDEN_PROFILE_KEYS = new Set([
  'approvedRecordsDigest',
  'decision',
  'decisionAuditId',
  'decisionRecord',
  'decisionRecordedAt',
  'inventoryDigest',
  'inventoryRevision',
  'materializedProfileDigest',
  'productionDiffDigest',
  'productionDiffRevision',
  'receiptId',
  'schemaVersion',
  'status',
]);

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
});

describe('approved production profile boundary', () => {
  test('materializes all 89 approved facts with a zero-diff identity', () => {
    const evaluation = productionProfileTesting.evaluate(
      profileData,
      receiptDocument,
    );
    const factProjection = evaluation.facts.map((fact) => ({
      factId: fact.factId,
      canonicalPath: fact.canonicalPath,
      normalizedValue: fact.normalizedValue,
      targetSurfaces: fact.targetSurfaces,
      requirement: fact.requirement,
    }));
    const recordProjection = evaluation.records.map((record) => ({
      factId: record.factId,
      canonicalPath: record.canonicalPath,
      normalizedValue: record.normalizedValue,
      targetSurfaces: record.targetSurfaces,
      requirement: record.requirement,
    }));

    expect(evaluation.facts).toHaveLength(89);
    expect(evaluation.records).toHaveLength(89);
    expect(recordProjection).toEqual(factProjection);
    expect(evaluation.materializedProfileDigest).toBe(
      EXPECTED_MATERIALIZED_DIGEST,
    );
    expect(evaluation.approvedRecordsDigest).toBe(
      receiptDocument.approvedRecordsDigest,
    );
    expect(evaluation.productionDiffDigest).toBe(
      receiptDocument.productionDiffDigest,
    );
    expect(
      evaluation.records.every(
        (record) =>
          record.status === 'Approved' &&
          record.decisionRecord?.auditInteractionId ===
            receiptDocument.decisionAuditId &&
          record.decisionRecord?.recordedAt ===
            receiptDocument.decisionRecordedAt,
      ),
    ).toBe(true);
    expect(Object.isFrozen(evaluation.assembly)).toBe(true);
    expect(Object.isFrozen(evaluation.assembly.source)).toBe(true);
  });

  test('exposes one cached build-time assembly and no raw source via the barrel', async () => {
    expect(getProductionProfileAssembly()).toBe(
      getProductionProfileAssembly(),
    );

    const barrel = await readFile(
      resolve(process.cwd(), 'src/lib/profile/index.ts'),
      'utf8',
    );
    expect(barrel).not.toMatch(/profile-data|production-profile/);
  });

  test('keeps receipt and review metadata outside the public profile graph', () => {
    const found = new Set<string>();
    walkKeys(profileData, found);

    expect([...found].filter((key) => FORBIDDEN_PROFILE_KEYS.has(key))).toEqual(
      [],
    );
    expect(Object.keys(profileData)).toEqual([
      'identity',
      'narrative',
      'contact',
      'skillGroups',
      'experiences',
      'achievements',
      'projects',
      'education',
      'certifications',
    ]);
    expect(profileData.achievements).toEqual([]);
    expect(profileData.contact.additionalLinks).toEqual([]);
    expect(
      profileData.projects.every(
        (project) =>
          !Object.hasOwn(project, 'period') &&
          !Object.hasOwn(project, 'relatedProfileEntity'),
      ),
    ).toBe(true);
    expect(
      profileData.certifications.every(
        (certification) => !Object.hasOwn(certification, 'issuer'),
      ),
    ).toBe(true);
  });

  test.each([
    ['missing key', (receipt: Record<string, unknown>) => {
      delete receipt.decisionAuditId;
    }],
    ['extra key', (receipt: Record<string, unknown>) => {
      receipt.profileName = 'not-allowed';
    }],
    ['schema drift', (receipt: Record<string, unknown>) => {
      receipt.schemaVersion = 2;
    }],
    ['revision drift', (receipt: Record<string, unknown>) => {
      receipt.inventoryRevision = 'profile-facts-r4';
    }],
    ['decision drift', (receipt: Record<string, unknown>) => {
      receipt.decision = 'Pending';
    }],
    ['audit drift', (receipt: Record<string, unknown>) => {
      receipt.decisionAuditId = 'U1-CG-S14-OTHER';
    }],
    ['timestamp drift', (receipt: Record<string, unknown>) => {
      receipt.decisionRecordedAt = '2026-07-25T03:44:32Z';
    }],
  ])('rejects %s in the machine receipt', (_label, mutate) => {
    const receipt = structuredClone(
      receiptDocument,
    ) as unknown as Record<string, unknown>;
    mutate(receipt);

    expect(() =>
      productionProfileTesting.evaluate(profileData, receipt),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_RECEIPT_INVALID',
        path: 'verification/profile/fact-approval.json',
      }),
    );
  });

  test('rejects an approved fact value change before assembly', () => {
    const candidate = cloneProfile();
    (
      candidate.identity.name as unknown as {
        value: string;
      }
    ).value = '변경된 이름';

    expect(() =>
      productionProfileTesting.evaluate(candidate, receiptDocument),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_DIGEST_MISMATCH',
        path: 'profile.facts',
      }),
    );
  });

  test('rejects a valid numeric order change through the structural digest', () => {
    const candidate = cloneProfile();
    (
      candidate.projects[0] as unknown as {
        order: number;
      }
    ).order = 11;

    expect(() =>
      productionProfileTesting.evaluate(candidate, receiptDocument),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_DIGEST_MISMATCH',
        path: 'profile',
      }),
    );
  });

  test('rejects a valid relation addition through the structural digest', () => {
    const candidate = cloneProfile();
    (
      candidate.projects[0] as unknown as {
        relatedProfileEntity: {
          tag: 'experience';
          id: string;
        };
      }
    ).relatedProfileEntity = {
      tag: 'experience',
      id: 'hansono',
    };

    expect(() =>
      productionProfileTesting.evaluate(candidate, receiptDocument),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_DIGEST_MISMATCH',
        path: 'profile',
      }),
    );
  });

  test('rejects invalid profile data without producing a partial assembly', () => {
    const candidate = cloneProfile();
    (
      candidate.identity.name as unknown as {
        value: string;
      }
    ).value = '   ';

    expect(() =>
      productionProfileTesting.evaluate(candidate, receiptDocument),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_SOURCE_INVALID',
        path: 'profile',
      }),
    );
  });

  test('rejects private approval metadata smuggled into an otherwise valid source', () => {
    const candidate = cloneProfile() as unknown as ProfileData & {
      receiptId: string;
    };
    candidate.receiptId = receiptDocument.receiptId;

    expect(() =>
      productionProfileTesting.evaluate(candidate, receiptDocument),
    ).toThrow(
      expect.objectContaining({
        code: 'PROFILE_APPROVAL_SOURCE_INVALID',
        path: 'profile',
      }),
    );
  });

  test('rejects every unmodeled root or nested source key before normalization', () => {
    const rootExtra = cloneProfile() as unknown as ProfileData & {
      status: string;
    };
    rootExtra.status = 'Pending';
    const nestedExtra = cloneProfile();
    (
      nestedExtra.identity.name as unknown as {
        reviewState: string;
      }
    ).reviewState = 'Pending';

    for (const candidate of [rootExtra, nestedExtra]) {
      expect(() =>
        productionProfileTesting.evaluate(candidate, receiptDocument),
      ).toThrow(
        expect.objectContaining({
          code: 'PROFILE_APPROVAL_SOURCE_INVALID',
          path: 'profile',
        }),
      );
    }
  });

  test('detects receipt identity content and filenames in output', async () => {
    const cleanRoot = await createTemporaryRoot();
    await writeFile(join(cleanRoot, 'index.html'), '<main>profile</main>');
    await expect(
      productionProfileTesting.assertNoProfileApprovalLeak(cleanRoot),
    ).resolves.toBeUndefined();

    await writeFile(
      join(cleanRoot, 'asset.js'),
      `const marker = "${receiptDocument.receiptId}";`,
    );
    await expect(
      productionProfileTesting.assertNoProfileApprovalLeak(cleanRoot),
    ).rejects.toMatchObject({
      code: 'PROFILE_APPROVAL_OUTPUT_LEAK',
      path: 'build.output',
    });

    const filenameRoot = await createTemporaryRoot();
    await writeFile(join(filenameRoot, 'fact-approval.json'), '{}');
    await expect(
      productionProfileTesting.assertNoProfileApprovalLeak(filenameRoot),
    ).rejects.toMatchObject({
      code: 'PROFILE_APPROVAL_OUTPUT_LEAK',
      path: 'build.output',
    });

    const markerFilenameRoot = await createTemporaryRoot();
    await writeFile(
      join(markerFilenameRoot, receiptDocument.receiptId),
      '',
    );
    await expect(
      productionProfileTesting.assertNoProfileApprovalLeak(
        markerFilenameRoot,
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_APPROVAL_OUTPUT_LEAK',
      path: 'build.output',
    });

    const markerDirectoryRoot = await createTemporaryRoot();
    await mkdir(
      join(markerDirectoryRoot, receiptDocument.approvedRecordsDigest),
    );
    await expect(
      productionProfileTesting.assertNoProfileApprovalLeak(
        markerDirectoryRoot,
      ),
    ).rejects.toMatchObject({
      code: 'PROFILE_APPROVAL_OUTPUT_LEAK',
      path: 'build.output',
    });
  });

  test('keeps raw production data and the machine receipt behind one source boundary', async () => {
    const sourceRoot = resolve(process.cwd(), 'src');
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const productionSource = await readFile(
      resolve(sourceRoot, 'lib/profile/production-profile.ts'),
      'utf8',
    );
    const rawSource = await readFile(
      resolve(sourceRoot, 'lib/profile/profile-data.ts'),
      'utf8',
    );

    expect(productionSource).toContain("from './profile-data.js'");
    expect(productionSource).toContain(
      "verification/profile/fact-approval.json",
    );
    expect(rawSource).not.toMatch(
      /receiptId|decisionAuditId|inventoryDigest|productionDiffDigest|Pending|Excluded/,
    );
    expect(rawSource).not.toMatch(
      /placeholder|inferred|TODO|FIXME|example\.com/i,
    );

    for (const path of sourceFiles) {
      if (path.endsWith('/lib/profile/production-profile.ts')) {
        continue;
      }
      const source = await readFile(path, 'utf8');
      expect(source, `${path} bypasses the profile source boundary`).not.toMatch(
        /from\s+['"][^'"]*profile-data(?:\.js)?['"]/,
      );
      expect(source, `${path} imports the private approval receipt`).not.toMatch(
        /verification\/profile\/fact-approval\.json/,
      );
    }
  });
});

function cloneProfile(): ProfileData {
  return structuredClone(profileData) as unknown as ProfileData;
}

function walkKeys(value: unknown, found: Set<string>): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkKeys(item, found));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    found.add(key);
    walkKeys(nested, found);
  }
}

async function createTemporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'profile-approval-test-'));
  temporaryRoots.push(root);
  return root;
}

async function collectSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (entry.isFile() && /\.(?:astro|js|mjs|ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe('approved production source builds its résumé manifest', () => {
  // Regression for a defect found in Step 22: `isValidApprovalIdentity` used a
  // local lowercase-only slug pattern for the four approval identifiers, while
  // the fact-approval module that mints them allows any canonical identifier.
  // The uppercase decision audit ID therefore failed, and every approved
  // manifest — and with it the whole PDF document path — was unbuildable while
  // each stage still looked correct in isolation.
  //
  // Asserting against the real production assembly rather than a fixture is
  // the point: a synthetic approval with a lowercase audit ID would have
  // passed the broken code.
  test('buildApprovedResumeManifest succeeds for the real approved profile', async () => {
    const assembly = getProductionProfileAssembly();

    const manifest = await buildApprovedResumeManifest(assembly.source);

    expect(manifest.ok).toBe(true);
    if (!manifest.ok) return;
    expect(manifest.value.entries.length).toBeGreaterThan(0);
    expect(manifest.value.sourceIdentity.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.value.fingerprint.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  test('the approved decision audit ID is accepted even though it is not a lowercase slug', () => {
    const { approval } = getProductionProfileAssembly().source;

    // Pins the exact shape that broke: uppercase letters and a compact
    // timestamp. If the approval process ever mints a lowercase ID this test
    // still passes, but the manifest test above is what actually guards the
    // behaviour.
    expect(approval.decisionAuditId).not.toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(approval.decision).toBe('Approved');
  });

  test('buildApprovedResumeDocumentRequest resolves the current document request', async () => {
    const request = await buildApprovedResumeDocumentRequest(
      getProductionProfileAssembly(),
    );

    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.value.publicHref).toBe('/resume.pdf');
    expect(request.value.repositoryPath).toBe('site/public/resume.pdf');
    expect(request.value.expectedManifest.entries.length).toBeGreaterThan(0);
  });
});

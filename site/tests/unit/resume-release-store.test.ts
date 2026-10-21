import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  compareResumeFactManifests,
  RESUME_MANIFEST_SCHEMA_VERSION,
  resumeSectionOrderForSchema,
} from '../../src/lib/profile/resume-manifest.js';
import type { ResumeFactManifest } from '../../src/lib/profile/resume-manifest.js';

/**
 * BR6.2 (review R-01): historical release records stay readable. The stored
 * r8 release (`verification/resume/current-release.json`) was approved under
 * manifest schema 1, whose six sections end with `certifications` at 6.
 * Schema 2 inserts `credentials` at 6, so a record is read against the
 * section order of its own schema version, never against the live one.
 */
type AnyRecord = Record<string, any>;

let r8Release: AnyRecord;

/** The manifest the r8 release recorded, as its web comparison carries it. */
function r8Manifest(schemaVersion: number): ResumeFactManifest {
  const web = r8Release.comparison.web;
  return {
    schemaVersion,
    sourceIdentity: r8Release.sourceIdentity,
    sectionOrder: web.sectionOrder,
    entityOrder: web.entityOrder,
    entries: web.entries,
    fingerprint: r8Release.manifestFingerprint,
  } as unknown as ResumeFactManifest;
}

beforeAll(async () => {
  r8Release = JSON.parse(
    await readFile(resolve('verification/resume/current-release.json'), 'utf8')
  ) as AnyRecord;
});

describe('the stored r8 release record (BR6.2)', () => {
  test('is the six-section record this test is about', () => {
    expect(r8Release.comparison.web.sectionOrder).toEqual([
      { key: 'intro-contact', order: 1 },
      { key: 'skills', order: 2 },
      { key: 'highlights', order: 3 },
      { key: 'project-summaries', order: 4 },
      { key: 'education', order: 5 },
      { key: 'certifications', order: 6 },
    ]);
  });

  test('still validates as a schema-1 manifest', () => {
    const manifest = r8Manifest(1);
    expect(compareResumeFactManifests(manifest, manifest).ok).toBe(true);
  });

  test('does not validate when read against the schema-2 order', () => {
    const manifest = r8Manifest(2);
    expect(compareResumeFactManifests(manifest, manifest).ok).toBe(false);
  });

  test('keeps the two section orders apart by schema version', () => {
    expect(RESUME_MANIFEST_SCHEMA_VERSION).toBe(2);
    expect(resumeSectionOrderForSchema(1)?.map(({ key }) => key)).toEqual([
      'intro-contact',
      'skills',
      'highlights',
      'project-summaries',
      'education',
      'certifications',
    ]);
    expect(resumeSectionOrderForSchema(2)?.map(({ key, order }) => `${order}:${key}`)).toEqual([
      '1:intro-contact',
      '2:skills',
      '3:highlights',
      '4:project-summaries',
      '5:education',
      '6:credentials',
      '7:certifications',
    ]);
  });

  test('refuses an unknown schema version', () => {
    const manifest = r8Manifest(3);
    expect(compareResumeFactManifests(manifest, manifest).ok).toBe(false);
    expect(resumeSectionOrderForSchema(3)).toBeUndefined();
  });
});

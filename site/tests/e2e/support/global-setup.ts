import { resetEvidenceFragments } from './evidence.js';

/**
 * Runs once in the parent process before any worker starts. Clearing the
 * fragment directory here — rather than from a spec — is what guarantees that
 * the merged record describes this run alone.
 */
export default async function globalSetup(): Promise<void> {
  await resetEvidenceFragments();
}

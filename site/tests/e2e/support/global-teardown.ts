import { sealBrowserEvidence } from './evidence.js';

/**
 * Runs once in the parent process after every project has finished, and is the
 * only place the browser evidence record is written. It runs after failures
 * too: an incomplete record is written on purpose so the missing cells are
 * visible instead of the file simply being absent.
 */
export default async function globalTeardown(): Promise<void> {
  const sealed = await sealBrowserEvidence();
  if (sealed.complete) return;

  process.stderr.write(
    `${JSON.stringify({
      errorCode: 'BROWSER_EVIDENCE_INCOMPLETE',
      stage: 'test.e2e.teardown',
      missingSpecFiles: sealed.missingSpecFiles,
      missingMatrixKeys: sealed.missingMatrixKeys,
      extraMatrixKeys: sealed.extraMatrixKeys,
      missingObligations: sealed.missingObligations,
      missingTools: sealed.missingTools,
    })}\n`,
  );
}

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { PROFILE_PATHS } from './profile-paths.mjs';

const VIEWER_RULE = 'AC-U03-03/NFR-U1-006';

export class ResumePdfViewerError extends Error {
  constructor(message, { code, stage, details = {} } = {}) {
    super(message);
    this.name = 'ResumePdfViewerError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = VIEWER_RULE;
    this.details = Object.freeze({ ...details });
  }
}

const HTML_ESCAPES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/gu,
    (character) => HTML_ESCAPES[character],
  );
}

/**
 * Builds the local review surface for one private candidate.
 *
 * The reviewer needs two things this page provides and the PDF alone does not:
 * the reading order the tagged structure actually declares, and the exact text
 * that was extracted for every approved fact. The candidate itself is linked,
 * never copied, so reviewing never produces a second set of bytes to confuse
 * with the one under review.
 */
export async function buildResumePdfViewer({
  candidate,
  candidatePath,
  snapshot,
} = {}) {
  if (
    typeof candidate?.candidateId !== 'string' ||
    typeof candidate?.pdfSha256 !== 'string'
  ) {
    throw new TypeError('candidate must carry candidateId and pdfSha256');
  }
  try {
    await stat(candidatePath);
  } catch {
    throw new ResumePdfViewerError(
      'The candidate the viewer would present is not on disk.',
      {
        code: 'PDF_VIEWER_CANDIDATE_MISSING',
        stage: 'pdf.viewer.build',
        details: { candidatePath },
      },
    );
  }

  await mkdir(PROFILE_PATHS.pdfViewerRoot, { recursive: true });
  const viewerPath = resolve(
    PROFILE_PATHS.pdfViewerRoot,
    `${candidate.candidateId}.html`,
  );
  const candidateHref = relative(PROFILE_PATHS.pdfViewerRoot, candidatePath);

  const factNodes = snapshot.structure.nodes.filter(
    (node) => node.role === 'fact',
  );
  const rows = snapshot.occurrences.map((occurrence) => {
    const node = factNodes.find(
      (candidateNode) =>
        candidateNode.occurrenceOrder === occurrence.occurrenceOrder,
    );
    const text = occurrence.fragments
      .map(
        (fragment, index) =>
          `${index > 0 && fragment.lineWrapBefore ? ' ' : ''}${fragment.text}`,
      )
      .join('');
    const pages = [
      ...new Set(occurrence.fragments.map((fragment) => fragment.pageNumber)),
    ];
    return `<tr>
      <td>${occurrence.occurrenceOrder}</td>
      <td>${escapeHtml(occurrence.valueKind)}</td>
      <td>${occurrence.sectionOrdinal}</td>
      <td>${occurrence.entityOrdinal === null ? '—' : occurrence.entityOrdinal}</td>
      <td>${escapeHtml(pages.join(', '))}</td>
      <td>${escapeHtml((node?.path ?? []).join('.'))}</td>
      <td>${escapeHtml(text)}</td>
      <td>${escapeHtml(
        occurrence.urlAnnotations
          .map((annotation) => annotation.destination)
          .join(' '),
      )}</td>
    </tr>`;
  });

  const outlineRows = snapshot.outline.entries.map(
    (entry) =>
      `<tr><td>${entry.outlineOrder}</td><td>${entry.sectionOrdinal}</td><td>${entry.pageNumber}</td></tr>`,
  );

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>Résumé candidate review — ${escapeHtml(candidate.candidateId.slice(0, 12))}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #111; }
  h1 { font-size: 1.4rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
  dt { font-weight: 600; }
  code { font-family: ui-monospace, monospace; word-break: break-all; }
  table { border-collapse: collapse; margin-top: 1rem; width: 100%; }
  th, td { border: 1px solid #bbb; padding: 0.3rem 0.5rem; text-align: left; vertical-align: top; font-size: 0.9rem; }
  th { background: #f2f2f2; }
  .note { background: #fffbe6; border: 1px solid #e6d27a; padding: 0.75rem; margin: 1rem 0; }
</style>
</head>
<body>
<h1>Résumé candidate review surface</h1>
<p class="note">This candidate is private and unapproved. Reviewing it here authorises nothing;
promotion is a separate, explicit step gated on the exact SHA below.</p>
<dl>
  <dt>Candidate</dt><dd><code>${escapeHtml(candidate.candidateId)}</code></dd>
  <dt>PDF SHA-256</dt><dd><code>${escapeHtml(candidate.pdfSha256)}</code></dd>
  <dt>Pages</dt><dd>${snapshot.pageCount}</dd>
  <dt>Facts</dt><dd>${snapshot.occurrences.length}</dd>
  <dt>Document</dt><dd><a href="${escapeHtml(candidateHref)}">open the candidate PDF</a></dd>
</dl>

<h2>Outline</h2>
<table><thead><tr><th>Order</th><th>Section</th><th>Page</th></tr></thead>
<tbody>${outlineRows.join('')}</tbody></table>

<h2>Reading order and extracted facts</h2>
<table><thead><tr>
<th>#</th><th>Kind</th><th>Section</th><th>Entity</th><th>Pages</th><th>Structure</th><th>Extracted text</th><th>Link</th>
</tr></thead>
<tbody>${rows.join('')}</tbody></table>
</body>
</html>
`;

  await writeFile(viewerPath, html, 'utf8');
  return Object.freeze({ rule: VIEWER_RULE, viewerPath, candidateHref });
}

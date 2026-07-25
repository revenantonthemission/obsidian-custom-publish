import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROFILE_PATHS } from './profile-paths.mjs';

const INSPECT_RULE = 'AC-U03-02/NFR-U1-006';
const EVIDENCE_SCHEMA_VERSION = 1;
const PERIOD_SEPARATOR = /\s*–\s*/u;
const PERIOD_POINT = /^(?:\d{4}|\d{4}-(?:0[1-9]|1[0-2])|현재)$/u;
const GITHUB_PREFIX = 'https://github.com/';

export class ResumePdfInspectorError extends Error {
  constructor(message, { code, stage, details = {}, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ResumePdfInspectorError';
    this.code = code;
    this.errorCode = code;
    this.stage = stage;
    this.rule = INSPECT_RULE;
    this.details = Object.freeze({ ...details });
  }
}

function inspectorError(code, message, stage, details, cause) {
  return new ResumePdfInspectorError(message, { code, stage, details, cause });
}

/**
 * Reads one private candidate into the snapshot the C11 mapper consumes.
 *
 * The snapshot's ordinals come from the skeleton the renderer observed on the
 * printed document, never from the approved manifest. What the PDF itself has
 * to prove is that the approved text is really in it, in that order, with the
 * link destinations the document declared.
 */
export async function inspectResumePdfCandidate({
  candidatePath,
  candidate,
  sourceIdentity,
  manifestFingerprint,
  skeleton,
  tools,
} = {}) {
  requireCandidateIdentity(candidate);
  requireSkeleton(skeleton);

  const bytes = await readCandidateBytes(candidatePath);
  if (sha256(bytes) !== candidate.pdfSha256) {
    throw inspectorError(
      'PDF_INSPECT_CANDIDATE_STALE',
      'The candidate on disk is not the bytes the identity names.',
      'pdf.inspect.read',
      { candidateId: candidate.candidateId },
    );
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let document;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch (cause) {
    throw inspectorError(
      'PDF_INSPECT_UNREADABLE',
      'The candidate could not be opened as a PDF document.',
      'pdf.inspect.read',
      {},
      cause,
    );
  }

  try {
    const pageCount = document.numPages;
    if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
      throw inspectorError(
        'PDF_INSPECT_EMPTY',
        'The candidate reports no pages.',
        'pdf.inspect.read',
        { pageCount },
      );
    }

    const pages = await readPages(document, pageCount);
    if (!pages.every((page) => page.tagged)) {
      throw inspectorError(
        'PDF_INSPECT_NOT_TAGGED',
        'The candidate is missing its tagged structure tree.',
        'pdf.inspect.structure',
        {
          untagged: pages
            .filter((page) => !page.tagged)
            .map((page) => page.pageNumber),
        },
      );
    }

    const stream = pages.flatMap((page) => page.textStream);
    const occurrences = extractOccurrences(stream, pages, skeleton);
    const structure = buildStructureTree(skeleton);
    bindStructurePaths(structure, occurrences);
    const outline = await readOutline(document, pageCount, skeleton);
    const renderedPages = pages.map((page) => ({
      pageNumber: page.pageNumber,
      evidenceId: sha256(
        Buffer.from(page.textStream.map((item) => item.text).join(''), 'utf8'),
      ),
    }));

    const snapshot = deepFreeze({
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      candidate: { ...candidate },
      sourceIdentity,
      manifestFingerprint,
      pageCount,
      occurrences,
      structure,
      outline,
      renderedPages,
      tools: await resolveToolVersions(tools),
    });

    const snapshotPath = resolve(
      PROFILE_PATHS.pdfInspectionRoot,
      `${candidate.candidateId}.json`,
    );
    await mkdir(PROFILE_PATHS.pdfInspectionRoot, { recursive: true });
    await writeFile(
      snapshotPath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      'utf8',
    );

    return Object.freeze({ rule: INSPECT_RULE, snapshot, snapshotPath });
  } finally {
    await document.destroy().catch(() => undefined);
  }
}

async function readCandidateBytes(candidatePath) {
  if (typeof candidatePath !== 'string' || candidatePath.length === 0) {
    throw new TypeError('candidatePath must be one absolute path');
  }
  try {
    return await readFile(candidatePath);
  } catch (cause) {
    throw inspectorError(
      'PDF_INSPECT_CANDIDATE_MISSING',
      'The private candidate is not present for inspection.',
      'pdf.inspect.read',
      { candidatePath },
      cause,
    );
  }
}

async function readPages(document, pageCount) {
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const [structure, content, annotations] = await Promise.all([
      page.getStructTree(),
      page.getTextContent({ includeMarkedContent: true }),
      page.getAnnotations(),
    ]);
    const { textItems, byMarkedContent } = indexMarkedContent(
      pageNumber,
      content.items,
    );
    pages.push({
      pageNumber,
      tagged: structure !== null && structure !== undefined,
      textItems,
      // Reading order, not paint order — see readingOrderStream.
      textStream: readingOrderStream(structure, byMarkedContent, textItems),
      annotations: annotations.map((annotation, annotationIndex) => ({
        pageNumber,
        annotationIndex,
        destination:
          typeof annotation.url === 'string' ? annotation.url : null,
      })),
    });
  }
  return pages;
}

/**
 * Splits a page's content into text items and the marked-content ranges that
 * bind them to the tagged structure tree. `itemIndex` stays the item's index
 * among text items alone, so a fragment reference identifies the same item
 * however the page is later re-read.
 */
function indexMarkedContent(pageNumber, items) {
  const textItems = [];
  const byMarkedContent = new Map();
  const open = [];

  for (const item of items) {
    if (item.type === 'beginMarkedContent') {
      open.push(null);
      continue;
    }
    if (item.type === 'beginMarkedContentProps') {
      open.push(typeof item.id === 'string' ? item.id : null);
      continue;
    }
    if (item.type === 'endMarkedContent') {
      open.pop();
      continue;
    }

    const itemIndex = textItems.length;
    textItems.push({
      pageNumber,
      itemIndex,
      text: typeof item.str === 'string' ? item.str : '',
      hasEOL: item.hasEOL === true,
    });
    for (let depth = open.length - 1; depth >= 0; depth -= 1) {
      const id = open[depth];
      if (id === null) continue;
      const bucket = byMarkedContent.get(id);
      if (bucket === undefined) byMarkedContent.set(id, [itemIndex]);
      else bucket.push(itemIndex);
      break;
    }
  }

  return { textItems, byMarkedContent };
}

/**
 * Text item order in a PDF is paint order, which layout is free to reorder — a
 * `<summary>` can be painted after the section that follows it. The tagged
 * structure tree is what states reading order, so the stream the occurrences
 * are claimed from is assembled by walking that tree, not the content stream.
 */
function readingOrderStream(structure, byMarkedContent, textItems) {
  const stream = [];
  const seen = new Set();
  const visit = (node) => {
    if (node === null || typeof node !== 'object') return;
    if (typeof node.id === 'string') {
      for (const itemIndex of byMarkedContent.get(node.id) ?? []) {
        if (seen.has(itemIndex)) continue;
        seen.add(itemIndex);
        stream.push(textItems[itemIndex]);
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(structure);
  return stream;
}

/**
 * Walks the extracted text once, in order, claiming one run per rendered fact.
 * Scanning forward from the previous claim is what makes document order part
 * of the evidence rather than an assumption: a fact that appears out of order
 * simply will not be found.
 */
function extractOccurrences(stream, pages, skeleton) {
  const occurrences = [];
  const claimedAnnotations = new Set();
  let cursor = 0;

  for (const fact of skeleton.facts) {
    const valueKind = inferValueKind(fact);
    const run = findTextRun(stream, cursor, fact.text);
    if (run === null) {
      throw inspectorError(
        'PDF_INSPECT_FACT_TEXT_MISSING',
        'A rendered fact could not be found in the candidate text.',
        'pdf.inspect.occurrences',
        { factOrder: fact.factOrder, text: fact.text.slice(0, 60) },
      );
    }

    const fragments = stream
      .slice(run.start, run.end + 1)
      .map((item, index) => ({
        pageNumber: item.pageNumber,
        itemIndex: item.itemIndex,
        text: item.text,
        // Set only where the wrap stands for a space in the rendered text; the
        // first fragment can never carry one, since nothing precedes it.
        lineWrapBefore: run.wraps.has(index),
      }));

    const urlAnnotations = isLinkKind(valueKind)
      ? [claimAnnotation(pages, fact, claimedAnnotations)]
      : [];

    occurrences.push({
      occurrenceOrder: occurrences.length + 1,
      sectionOrdinal: fact.sectionOrdinal,
      entityOrdinal: fact.entityOrdinal,
      valueKind,
      fragments,
      urlAnnotations,
      structurePath: [],
    });
    cursor = run.end + 1;
  }

  return occurrences;
}

function claimAnnotation(pages, fact, claimed) {
  for (const page of pages) {
    for (const annotation of page.annotations) {
      const key = `${annotation.pageNumber}:${annotation.annotationIndex}`;
      if (annotation.destination !== fact.href || claimed.has(key)) continue;
      claimed.add(key);
      return {
        pageNumber: annotation.pageNumber,
        annotationIndex: annotation.annotationIndex,
        destination: annotation.destination,
      };
    }
  }
  throw inspectorError(
    'PDF_INSPECT_LINK_ANNOTATION_MISSING',
    'A rendered link has no matching annotation in the candidate.',
    'pdf.inspect.annotations',
    { factOrder: fact.factOrder, href: fact.href },
  );
}

function findTextRun(stream, cursor, target) {
  const wanted = target.normalize('NFC');
  if (wanted.length === 0) return null;

  for (let start = cursor; start < stream.length; start += 1) {
    const run = buildRunAt(stream, start, wanted);
    if (run !== null) return run;
  }
  return null;
}

/**
 * Rebuilds the target using exactly the rule the mapper will apply, so a run
 * is only accepted when the mapper would read the same value back.
 *
 * A line wrap contributes a space only when the source text has one there.
 * Korean wraps mid-word without a space, so treating every wrap as a space
 * would insert one into the middle of a word and silently corrupt the value.
 */
function buildRunAt(stream, start, wanted) {
  let built = '';
  const wraps = new Set();
  for (let index = start; index < stream.length; index += 1) {
    if (index > start && stream[index - 1].hasEOL) {
      if (wanted.startsWith(`${built} `)) {
        built += ' ';
        wraps.add(index - start);
      }
    }
    built += stream[index].text.normalize('NFC');
    if (built === wanted) return { start, end: index, wraps };
    if (!wanted.startsWith(built)) return null;
  }
  return null;
}

function collapse(value) {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function inferValueKind(fact) {
  const href = fact.href;
  if (typeof href === 'string' && href.length > 0) {
    if (href.startsWith('mailto:')) return 'email';
    if (href.startsWith(GITHUB_PREFIX)) return 'github-url';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return 'external-url';
    }
    if (href.startsWith('/')) return 'internal-path';
  }
  const parts = collapse(fact.text).split(PERIOD_SEPARATOR);
  if (parts.length === 2 && parts.every((part) => PERIOD_POINT.test(part))) {
    return 'period';
  }
  return 'text';
}

function isLinkKind(valueKind) {
  return ['email', 'github-url', 'external-url', 'internal-path'].includes(
    valueKind,
  );
}

/**
 * Builds the normalized domain tree the mapper compares against the manifest:
 * one document, its sections, their entities and the facts they carry. Child
 * order follows the printed document, so the depth-first walk visits entities
 * and facts in exactly their ordinal order.
 */
function buildStructureTree(skeleton) {
  const factByOrder = new Map(
    skeleton.facts.map((fact) => [fact.factOrder, fact]),
  );
  const entityPosition = new Map();
  for (const entity of skeleton.entities) {
    const owned = skeleton.facts.filter((fact) =>
      entityChain(skeleton, fact.entityOrdinal).includes(entity.entityOrdinal),
    );
    if (owned.length === 0) {
      throw inspectorError(
        'PDF_INSPECT_ENTITY_WITHOUT_FACT',
        'A rendered entity carries no fact and cannot be positioned.',
        'pdf.inspect.structure',
        { entityOrdinal: entity.entityOrdinal },
      );
    }
    entityPosition.set(
      entity.entityOrdinal,
      Math.min(...owned.map((fact) => fact.factOrder)),
    );
  }

  const childrenOf = (kind, ordinal) => {
    const entities = skeleton.entities
      .filter((entity) =>
        kind === 'section'
          ? entity.parentEntityOrdinal === null &&
            entity.sectionOrdinal === ordinal
          : entity.parentEntityOrdinal === ordinal,
      )
      .map((entity) => ({
        kind: 'entity',
        ordinal: entity.entityOrdinal,
        position: entityPosition.get(entity.entityOrdinal) ?? 0,
      }));
    const facts = skeleton.facts
      .filter((fact) =>
        kind === 'section'
          ? fact.entityOrdinal === null && fact.sectionOrdinal === ordinal
          : fact.entityOrdinal === ordinal,
      )
      .map((fact) => ({
        kind: 'fact',
        ordinal: fact.factOrder,
        position: fact.factOrder,
      }));
    return [...entities, ...facts].sort((a, b) => a.position - b.position);
  };

  const nodes = [];
  const emit = (role, path, parentPath, ordinals, childCount) => {
    nodes.push({
      nodeOrder: nodes.length + 1,
      path,
      role,
      parentPath,
      children: Array.from({ length: childCount }, (_, index) => [
        ...path,
        index,
      ]),
      sectionOrdinal: ordinals.sectionOrdinal,
      entityOrdinal: ordinals.entityOrdinal,
      occurrenceOrder: ordinals.occurrenceOrder,
    });
  };

  const walk = (entry, path, parentPath) => {
    if (entry.kind === 'fact') {
      const fact = factByOrder.get(entry.ordinal);
      emit(
        'fact',
        path,
        parentPath,
        {
          sectionOrdinal: fact.sectionOrdinal,
          entityOrdinal: fact.entityOrdinal,
          occurrenceOrder: fact.factOrder,
        },
        0,
      );
      return;
    }
    const entity = skeleton.entities[entry.ordinal];
    const children = childrenOf('entity', entry.ordinal);
    emit(
      'entity',
      path,
      parentPath,
      {
        sectionOrdinal: entity.sectionOrdinal,
        entityOrdinal: entity.entityOrdinal,
        occurrenceOrder: null,
      },
      children.length,
    );
    children.forEach((child, index) => walk(child, [...path, index], path));
  };

  const rootPath = [0];
  emit(
    'document',
    rootPath,
    null,
    { sectionOrdinal: null, entityOrdinal: null, occurrenceOrder: null },
    skeleton.sections.length,
  );
  skeleton.sections.forEach((section, index) => {
    const sectionPath = [...rootPath, index];
    const children = childrenOf('section', section.sectionOrdinal);
    emit(
      'section',
      sectionPath,
      rootPath,
      {
        sectionOrdinal: section.sectionOrdinal,
        entityOrdinal: null,
        occurrenceOrder: null,
      },
      children.length,
    );
    children.forEach((child, childIndex) =>
      walk(child, [...sectionPath, childIndex], sectionPath),
    );
  });

  return {
    tagged: true,
    readingOrder: nodes
      .filter((node) => node.role === 'fact')
      .map((node) => node.occurrenceOrder),
    sectionOrder: nodes
      .filter((node) => node.role === 'section')
      .map((node) => node.sectionOrdinal),
    entityOrder: nodes
      .filter((node) => node.role === 'entity')
      .map((node) => node.entityOrdinal),
    nodes,
  };
}

/** Each occurrence points at the fact node that carries it. */
function bindStructurePaths(structure, occurrences) {
  const factNodes = structure.nodes.filter((node) => node.role === 'fact');
  for (const occurrence of occurrences) {
    const node = factNodes.find(
      (candidate) => candidate.occurrenceOrder === occurrence.occurrenceOrder,
    );
    if (node === undefined) {
      throw inspectorError(
        'PDF_INSPECT_OCCURRENCE_UNPLACED',
        'An occurrence has no fact node in the normalized structure.',
        'pdf.inspect.structure',
        { occurrenceOrder: occurrence.occurrenceOrder },
      );
    }
    occurrence.structurePath = [...node.path];
  }
}

function entityChain(skeleton, entityOrdinal) {
  const chain = [];
  let current = entityOrdinal;
  while (current !== null && current !== undefined) {
    chain.push(current);
    current = skeleton.entities[current]?.parentEntityOrdinal ?? null;
  }
  return chain;
}

async function readOutline(document, pageCount, skeleton) {
  const outline = await document.getOutline();
  const root = Array.isArray(outline) ? outline[0] : undefined;
  const sections = Array.isArray(root?.items) ? root.items : [];
  if (sections.length !== skeleton.sections.length) {
    throw inspectorError(
      'PDF_INSPECT_OUTLINE_INCOMPLETE',
      'The candidate outline does not list every profile section.',
      'pdf.inspect.outline',
      { observed: sections.length, expected: skeleton.sections.length },
    );
  }

  const entries = [];
  for (let index = 0; index < sections.length; index += 1) {
    const pageNumber = await resolveOutlinePage(document, sections[index]);
    if (pageNumber === null || pageNumber > pageCount) {
      throw inspectorError(
        'PDF_INSPECT_OUTLINE_DESTINATION_INVALID',
        'A section outline entry does not resolve to a page in the candidate.',
        'pdf.inspect.outline',
        { sectionOrdinal: index },
      );
    }
    entries.push({ outlineOrder: index + 1, sectionOrdinal: index, pageNumber });
  }
  return { entries };
}

async function resolveOutlinePage(document, item) {
  try {
    const destination =
      typeof item?.dest === 'string'
        ? await document.getDestination(item.dest)
        : item?.dest;
    if (!Array.isArray(destination) || destination.length === 0) return null;
    return (await document.getPageIndex(destination[0])) + 1;
  } catch {
    return null;
  }
}

async function resolveToolVersions(tools) {
  const node = tools?.node;
  const chromium = tools?.chromium;
  if (typeof node !== 'string' || typeof chromium !== 'string') {
    throw inspectorError(
      'PDF_INSPECT_TOOLS_INCOMPLETE',
      'The renderer did not report the runtime it produced the candidate with.',
      'pdf.inspect.tools',
    );
  }
  return {
    node,
    playwright: await packageVersion('@playwright/test'),
    chromium,
    pdfjs: await packageVersion('pdfjs-dist'),
    pretendard: await packageVersion('pretendard'),
  };
}

async function packageVersion(packageName) {
  const manifest = JSON.parse(
    await readFile(
      resolve(
        PROFILE_PATHS.siteRoot,
        'node_modules',
        packageName,
        'package.json',
      ),
      'utf8',
    ),
  );
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw inspectorError(
      'PDF_INSPECT_TOOL_VERSION_MISSING',
      'A pinned inspection tool does not declare its version.',
      'pdf.inspect.tools',
      { packageName },
    );
  }
  return manifest.version;
}

function requireCandidateIdentity(candidate) {
  if (
    typeof candidate?.candidateId !== 'string' ||
    typeof candidate?.pdfSha256 !== 'string'
  ) {
    throw new TypeError('candidate must carry candidateId and pdfSha256');
  }
}

function requireSkeleton(skeleton) {
  if (
    !Array.isArray(skeleton?.sections) ||
    !Array.isArray(skeleton?.entities) ||
    !Array.isArray(skeleton?.facts) ||
    skeleton.facts.length === 0
  ) {
    throw new TypeError('skeleton must carry sections, entities and facts');
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

export const resumePdfInspectorTesting = Object.freeze({
  buildStructureTree,
  findTextRun,
  inferValueKind,
});

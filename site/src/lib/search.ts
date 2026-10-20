/**
 * Full-text search over the preprocessor's index (FR5.2). search-index.json
 * arrives over the network, so prepareSearchIndex validates it once and
 * builds the sorted word list that prefix matching needs; searchIndex never
 * modifies the prepared index or the data it came from.
 *
 * Ranking is the site's existing one: a title containing the whole query
 * scores 100, and every indexed word that a query token begins adds its
 * count for each document it appears in.
 */
import type { SearchDocument, SearchHit } from './types';

export const SEARCH_RESULT_LIMIT = 10;
const TITLE_MATCH_BOOST = 100;

export interface SearchResult {
  readonly slug: string;
  readonly title: string;
  readonly snippet: string;
  readonly href: string;
  readonly score: number;
}

export interface PreparedSearchIndex {
  readonly documents: readonly SearchDocument[];
  readonly postings: ReadonlyMap<string, readonly SearchHit[]>;
  /** Every indexed word in code-unit order, for binary-searched prefix scans. */
  readonly words: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toDocument(value: unknown): SearchDocument {
  if (!isRecord(value) || typeof value.slug !== 'string' || typeof value.title !== 'string') {
    throw new Error('search-index.json has a malformed document');
  }
  return {
    slug: value.slug,
    title: value.title,
    snippet: typeof value.snippet === 'string' ? value.snippet : '',
  };
}

function toHits(value: unknown, documentCount: number): SearchHit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((hit) => {
    if (!isRecord(hit)) return [];
    const { doc_idx: index, count } = hit;
    const valid =
      Number.isInteger(index) && (index as number) >= 0 && (index as number) < documentCount;
    return valid && typeof count === 'number' ? [{ doc_idx: index as number, count }] : [];
  });
}

/** Validates the fetched index; throws when it is not a search index at all. */
export function prepareSearchIndex(raw: unknown): PreparedSearchIndex {
  if (!isRecord(raw) || !Array.isArray(raw.documents) || !isRecord(raw.inverted_index)) {
    throw new Error('search-index.json is not a search index');
  }
  const documents = raw.documents.map(toDocument);
  const postings = new Map(
    Object.entries(raw.inverted_index)
      .map(([word, hits]) => [word, toHits(hits, documents.length)] as const)
      .filter(([, hits]) => hits.length > 0)
  );
  return { documents, postings, words: [...postings.keys()].sort() };
}

/** The index of the first word not less than the token. */
function firstWordFrom(words: readonly string[], token: string): number {
  let low = 0;
  let high = words.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((words[middle] ?? '') < token) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** The words that begin with the token. */
function wordsStartingWith(words: readonly string[], token: string): string[] {
  const matches: string[] = [];
  for (let index = firstWordFrom(words, token); index < words.length; index += 1) {
    const word = words[index]!;
    if (!word.startsWith(token)) break;
    matches.push(word);
  }
  return matches;
}

/** The best matches for the query, at most SEARCH_RESULT_LIMIT, best first. */
export function searchIndex(index: PreparedSearchIndex, query: string): SearchResult[] {
  const normalized = query.toLowerCase().trim();
  if (normalized === '') return [];
  const scores = new Map<number, number>();
  const add = (document: number, points: number): void => {
    scores.set(document, (scores.get(document) ?? 0) + points);
  };

  index.documents.forEach((document, position) => {
    if (document.title.toLowerCase().includes(normalized)) add(position, TITLE_MATCH_BOOST);
  });
  for (const token of normalized.split(/\s+/)) {
    for (const word of wordsStartingWith(index.words, token)) {
      for (const hit of index.postings.get(word) ?? []) add(hit.doc_idx, hit.count);
    }
  }

  return [...scores.entries()]
    .sort(([a, scoreA], [b, scoreB]) => scoreB - scoreA || a - b)
    .slice(0, SEARCH_RESULT_LIMIT)
    .map(([position, score]) => {
      const { slug, title, snippet } = index.documents[position]!;
      return { slug, title, snippet, href: `/posts/${slug}`, score };
    });
}

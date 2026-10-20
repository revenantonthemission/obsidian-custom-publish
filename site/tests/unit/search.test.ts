// The search index and query (FR5.2, FR4.5). The index arrives over the
// network, so it is validated before use, and searching never modifies it.
import { describe, expect, test } from 'vitest';
import { prepareSearchIndex, searchIndex, SEARCH_RESULT_LIMIT } from '../../src/lib/search';

const RAW = {
  documents: [
    { slug: 'simple-post', title: 'Simple Post', snippet: 'A simple post.' },
    { slug: 'memory', title: '메모리 관리', snippet: '페이지와 프레임' },
    { slug: 'paging', title: 'Paging', snippet: 'Pages and frames.' },
  ],
  inverted_index: {
    simple: [{ doc_idx: 0, count: 2 }],
    page: [{ doc_idx: 2, count: 1 }],
    pages: [{ doc_idx: 2, count: 2 }],
    paging: [{ doc_idx: 2, count: 3 }],
    페이지: [{ doc_idx: 1, count: 4 }],
    post: [{ doc_idx: 0, count: 1 }],
  },
};

describe('prepareSearchIndex', () => {
  test('rejects data that is not a search index', () => {
    expect(() => prepareSearchIndex(null)).toThrow();
    expect(() => prepareSearchIndex({ documents: [] })).toThrow();
    expect(() => prepareSearchIndex({ documents: 'x', inverted_index: {} })).toThrow();
  });

  test('drops hits that point at no document', () => {
    const index = prepareSearchIndex({
      documents: [{ slug: 'a', title: 'A', snippet: '' }],
      inverted_index: { word: [{ doc_idx: 0, count: 1 }, { doc_idx: 7, count: 1 }] },
    });
    expect(searchIndex(index, 'word').map(({ slug }) => slug)).toEqual(['a']);
  });

  test('never modifies the data it was given', () => {
    const copy = structuredClone(RAW);
    searchIndex(prepareSearchIndex(RAW), 'pag');
    expect(RAW).toEqual(copy);
  });
});

describe('searchIndex', () => {
  const index = prepareSearchIndex(RAW);

  test('a blank query finds nothing', () => {
    expect(searchIndex(index, '   ')).toEqual([]);
  });

  test('a token matches every indexed word it begins', () => {
    expect(searchIndex(index, 'pag').map(({ slug }) => slug)).toEqual(['paging']);
  });

  test('a title match outranks body matches', () => {
    const results = searchIndex(index, 'post');
    expect(results[0]?.slug).toBe('simple-post');
  });

  test('Korean words are found', () => {
    expect(searchIndex(index, '페이지').map(({ slug }) => slug)).toEqual(['memory']);
  });

  test('results carry the title, the snippet and the post address', () => {
    expect(searchIndex(index, 'simple')[0]).toMatchObject({
      slug: 'simple-post',
      title: 'Simple Post',
      snippet: 'A simple post.',
      href: '/posts/simple-post',
    });
  });

  test(`results stop at ${SEARCH_RESULT_LIMIT}`, () => {
    const many = prepareSearchIndex({
      documents: Array.from({ length: 15 }, (_, i) => ({ slug: `p${i}`, title: `Post ${i}`, snippet: '' })),
      inverted_index: {},
    });
    expect(searchIndex(many, 'post')).toHaveLength(SEARCH_RESULT_LIMIT);
  });
});

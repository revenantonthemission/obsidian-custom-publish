import { describe, expect, test } from 'vitest';

import { renderMarkdown } from '../../src/lib/render.js';

describe('definition lists', () => {
  test('renders term/definition pairs as dl/dt/dd', async () => {
    const html = await renderMarkdown('용어\n: 용어에 대한 정의입니다.\n');
    expect(html).toContain('<dl>');
    expect(html).toContain('<dt>용어</dt>');
    expect(html).toContain('용어에 대한 정의입니다.');
    expect(html).toContain('<dd>');
  });

  test('supports multiple definitions for one term', async () => {
    const html = await renderMarkdown('Term\n: first definition\n: second definition\n');
    expect(html.match(/<dd>/g)?.length).toBe(2);
  });
});

describe('tilde handling matches Obsidian', () => {
  test('single tilde stays literal text', async () => {
    const html = await renderMarkdown('H~2~O\n');
    expect(html).not.toContain('<del>');
    expect(html).toContain('H~2~O');
  });

  test('double tilde still renders strikethrough', async () => {
    const html = await renderMarkdown('~~취소선~~\n');
    expect(html).toContain('<del>취소선</del>');
  });
});

describe('abbreviations', () => {
  test('definition line disappears and occurrences become abbr with tooltip', async () => {
    const html = await renderMarkdown(
      'AMD는 CPU를 만든다.\n\n*[AMD]: Advanced Micro Devices\n',
    );
    expect(html).toContain('<abbr title="Advanced Micro Devices">AMD</abbr>');
    expect(html).not.toContain('*[AMD]');
  });

  test('multiple definitions on consecutive lines all apply', async () => {
    const html = await renderMarkdown(
      'TLB와 ASID 설명.\n\n*[TLB]: Translation Lookaside Buffer\n*[ASID]: Address Space Identifier\n',
    );
    expect(html).toContain('<abbr title="Translation Lookaside Buffer">TLB</abbr>');
    expect(html).toContain('<abbr title="Address Space Identifier">ASID</abbr>');
  });

  test('definition titles leave no leftover text in the output', async () => {
    const html = await renderMarkdown(
      'TLB 설명.\n\n*[TLB]: Translation Lookaside Buffer\n*[ASID]: Address Space Identifier\n',
    );
    // Title text may appear only inside title attributes, never as body text.
    const withoutAttributes = html.replace(/title="[^"]*"/g, '');
    expect(withoutAttributes).not.toContain('Translation Lookaside Buffer');
    expect(withoutAttributes).not.toContain('Address Space Identifier');
  });
});

describe('CJK emphasis', () => {
  test('bold closing directly before Korean text still parses', async () => {
    const html = await renderMarkdown('**Tickless 커널(`NO_HZ`)**은 유휴 상태다.\n');
    expect(html).toContain('<strong>');
    expect(html).not.toContain('**');
  });

  test('italic adjacent to Korean particles parses', async () => {
    const html = await renderMarkdown('*스케줄러*가 동작한다.\n');
    expect(html).toContain('<em>스케줄러</em>');
  });
});

describe('existing extended syntax keeps working', () => {
  test('footnotes render with backref', async () => {
    const html = await renderMarkdown('본문[^1]\n\n[^1]: 각주 내용\n');
    expect(html).toContain('data-footnote-ref');
    expect(html).toContain('각주 내용');
  });

  test('task lists render checkboxes', async () => {
    const html = await renderMarkdown('- [x] done\n- [ ] todo\n');
    expect(html).toContain('type="checkbox" checked');
  });

  test('preprocessor mark tags pass through rehype-raw', async () => {
    const html = await renderMarkdown('<mark>하이라이트</mark> 텍스트\n');
    expect(html).toContain('<mark>하이라이트</mark>');
  });
});

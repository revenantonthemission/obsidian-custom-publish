// Mockups review finding R-04: rendered markdown is a flat run of siblings, so
// CSS alone cannot turn each homepage H2 section into a grouped card. A rehype
// step wraps every H2 and its following siblings in section.home-card. It runs
// for the homepage only; posts render exactly as before.
import { describe, expect, test } from 'vitest';

import { renderMarkdown, wrapHomeSections } from '../../src/lib/render.js';

function sections(html: string): string[] {
  return [...html.matchAll(/<section class="home-card">([\s\S]*?)<\/section>/g)].map(
    (match) => match[1]!
  );
}

const NOTE = [
  '환영 문단입니다.',
  '',
  '## 소개',
  '',
  '첫 절의 문단입니다.',
  '',
  '### 세부',
  '',
  '세부 문단입니다.',
  '',
  '## 마무리',
  '',
  '마지막 문단입니다.',
  '',
].join('\n');

describe('homepage section cards', () => {
  test('wraps each H2 section of the homepage note in section.home-card, in order', async () => {
    const html = await renderMarkdown(NOTE, { homeSections: true });
    const cards = sections(html);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatch(/^<h2 id="소개">소개<\/h2>/);
    expect(cards[0]).toContain('첫 절의 문단입니다.');
    expect(cards[1]).toMatch(/^<h2 id="마무리">마무리<\/h2>/);
    expect(cards[1]).toContain('마지막 문단입니다.');
  });

  test('leaves post rendering untouched', async () => {
    const html = await renderMarkdown(NOTE);
    expect(html).not.toContain('home-card');
    expect(html).not.toContain('<section');
    expect(html).toContain('<h2 id="소개">소개</h2>');
  });

  test('wraps nothing when the note has no H2', async () => {
    const markdown = '한 문단입니다.\n\n### 작은 제목\n\n본문입니다.\n';
    expect(await renderMarkdown(markdown, { homeSections: true })).toBe(
      await renderMarkdown(markdown)
    );
  });

  test('keeps nested headings inside their H2 section and the intro outside every card', async () => {
    const html = await renderMarkdown(NOTE, { homeSections: true });
    const cards = sections(html);
    expect(cards[0]).toContain('<h3 id="세부">세부</h3>');
    expect(cards[0]).toContain('세부 문단입니다.');
    expect(cards[1]).not.toContain('세부');
    const intro = html.slice(0, html.indexOf('<section'));
    expect(intro).toContain('환영 문단입니다.');
  });

  test('wraps already-rendered homepage chunks the same way, leaving other markup intact', async () => {
    const chunk =
      '<p>앞 문단</p>\n<h2 id="a">가</h2>\n<p>첫째</p>\n<ul>\n<li>항목</li>\n</ul>\n<h2 id="b">나</h2>\n<p>둘째</p>';
    const html = await wrapHomeSections(chunk);
    const cards = sections(html);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toBe('<h2 id="a">가</h2>\n<p>첫째</p>\n<ul>\n<li>항목</li>\n</ul>\n');
    expect(cards[1]).toBe('<h2 id="b">나</h2>\n<p>둘째</p>');
    expect(html.startsWith('<p>앞 문단</p>\n')).toBe(true);
  });
});

import { describe, expect, test } from 'vitest';

import { renderMarkdown } from '../../src/lib/render.js';

describe('image captions', () => {
  test('moves a standalone Markdown image figure out of its paragraph', async () => {
    const html = (await renderMarkdown('![두 번째 그림](/assets/second.png)')).trim();
    expect(html).toMatch(
      /^<figure class="image-figure"><img src="\/assets\/second\.png"[^>]*><figcaption>두 번째 그림<\/figcaption><\/figure>$/
    );
    expect(html).not.toContain('<p><figure');
  });

  test('keeps an image that sits inline with text out of a figure', async () => {
    const html = await renderMarkdown('앞 텍스트 ![두 번째 그림](/assets/second.png) 뒤 텍스트');
    expect(html).not.toContain('<figure');
    expect(html).toContain('alt="두 번째 그림"');
  });

  test('keeps a linked image out of a figure', async () => {
    const html = await renderMarkdown('[![두 번째 그림](/assets/second.png)](https://example.com)');
    expect(html).not.toContain('<figure');
    expect(html).toContain('alt="두 번째 그림"');
  });

  test('wraps a top-level raw image with alt text in a figure', async () => {
    const html = (
      await renderMarkdown('<img src="/assets/second.png" alt="두 번째 그림" />')
    ).trim();
    expect(html).toMatch(
      /^<figure class="image-figure"><img src="\/assets\/second\.png"[^>]*><figcaption>두 번째 그림<\/figcaption><\/figure>$/
    );
  });
});

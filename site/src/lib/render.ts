import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { remarkDefinitionList, defListHastHandlers } from 'remark-definition-list';
import remarkAbbr from '@richardtowers/remark-abbr';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeParse from 'rehype-parse';
import rehypeRaw from 'rehype-raw';
import rehypeShiki from '@shikijs/rehype';
import { transformerMetaHighlight } from '@shikijs/transformers';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import type { ThemeRegistration } from '@shikijs/types';
import { rehypeHomeSections } from './home-sections';
// Xcode-style code colors (design-system-mapping.md "Code Highlighting"; R-01):
// every syntax color reaches 4.5:1 on the code panel token --c-code-bg
// (tests/unit/hig-tokens.test.ts recomputes that from these files).
import xcodeDarkJson from './shiki-themes/xcode-dark.json';
import xcodeLightJson from './shiki-themes/xcode-light.json';

/** JSON imports type `type` as string; check it, then hand Shiki its theme type. */
function shikiTheme(
  theme: { readonly name: string; readonly type: string },
  scheme: 'light' | 'dark'
): ThemeRegistration {
  if (theme.type !== scheme) {
    throw new TypeError(`Shiki theme ${theme.name} must be a ${scheme} theme.`);
  }
  return theme as unknown as ThemeRegistration;
}

const xcodeLight = shikiTheme(xcodeLightJson, 'light');
const xcodeDark = shikiTheme(xcodeDarkJson, 'dark');

export interface RenderOptions {
  /** Wrap each H2 section in section.home-card. Homepage note only (R-04). */
  readonly homeSections?: boolean;
}

/* ── Custom rehype plugins ── */

function rehypeCodeFilename() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== 'pre') return;
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code'
      );
      if (!code) return;

      const meta = (code.data?.meta as string) || (code.properties?.['dataMeta'] as string) || '';
      const match = meta.match(/title[=:]"([^"]+)"/);
      if (!match) return;

      const filename = match[1];
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block'] },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['code-filename'] },
            children: [{ type: 'text', value: filename }],
          },
          node,
        ],
      };
      parent.children[index] = wrapper;
    });
  };
}

function rehypeImageCaption() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== 'img') return;

      node.properties.loading = 'lazy';
      node.properties.decoding = 'async';

      const alt = node.properties.alt as string;
      if (!alt || alt === 'image') return;

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['image-figure'] },
        children: [
          node,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: alt }],
          },
        ],
      };
      parent.children[index] = figure;
    });
  };
}

function rehypeTableWrapper() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== 'table') return;

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrapper'] },
        children: [node],
      };
      parent.children[index] = wrapper;
    });
  };
}

/** The markdown pipeline; `homeSections` adds the homepage card step (R-04). */
function createProcessor(homeSections: boolean) {
  return (
    unified()
      .use(remarkParse)
      // singleTilde: false — Obsidian only treats ~~text~~ as strikethrough;
      // the GFM default would corrupt literals like H~2~O.
      .use(remarkGfm, { singleTilde: false })
      // CommonMark flanking rules break **bold**은 when emphasis touches CJK
      // text or particles; this extension relaxes them the way Obsidian does.
      .use(remarkCjkFriendly)
      .use(remarkDefinitionList)
      // *[ABBR]: definition — hides the definition line and wraps occurrences
      // in <abbr title="...">.
      .use(remarkAbbr)
      .use(remarkMath)
      .use(remarkRehype, {
        allowDangerousHtml: true,
        // Korean names for the GFM footnote section and its back-references,
        // matching lang="ko" (FR5.5, C-12).
        footnoteLabel: '각주',
        footnoteBackLabel: (referenceIndex: number, rereferenceIndex: number) =>
          `본문의 ${referenceIndex + 1}번 각주 위치로 돌아가기${rereferenceIndex > 1 ? ` (${rereferenceIndex})` : ''}`,
        handlers: {
          ...defListHastHandlers,
          // Drop abbr definition nodes: without a handler remark-rehype falls
          // back to rendering their title text as bare body text.
          abbrDefinition: () => undefined,
        },
      })
      .use(rehypeRaw) // Pass through raw HTML from preprocessor (callout divs, wikilink anchors)
      .use(rehypeShiki, {
        themes: {
          light: xcodeLight,
          dark: xcodeDark,
        },
        defaultColor: false,
        transformers: [
          transformerMetaHighlight(),
          {
            // Inject data-language attribute on <pre> for CSS language badge
            pre(node) {
              node.properties['data-language'] = this.options.lang;
            },
          },
        ],
      })
      .use(rehypeSlug)
      .use(rehypeCodeFilename)
      .use(rehypeImageCaption)
      .use(rehypeTableWrapper)
      .use(rehypeKatex, { strict: false })
      .use(rehypeHomeSections, { enabled: homeSections })
      .use(rehypeStringify)
  );
}

const postProcessor = createProcessor(false);
const homeProcessor = createProcessor(true);

/**
 * Homepage chunks are split around the profile slot and the legacy
 * recent-posts heading *after* rendering (homepage.ts), so the cards are
 * wrapped per chunk: wrapping before the split would cut through sections.
 */
const homeChunkProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeHomeSections, { enabled: true })
  .use(rehypeStringify);

export async function renderMarkdown(md: string, options: RenderOptions = {}): Promise<string> {
  const processor = options.homeSections === true ? homeProcessor : postProcessor;
  const result = await processor.process(md);
  return String(result);
}

/** Wraps each H2 section of already-rendered homepage HTML in section.home-card. */
export async function wrapHomeSections(html: string): Promise<string> {
  const result = await homeChunkProcessor.process(html);
  return String(result);
}

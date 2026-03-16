import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeShiki from "@shikijs/rehype";
import { transformerMetaHighlight } from "@shikijs/transformers";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

/* ── Custom rehype plugins ── */

function rehypeCodeFilename() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "pre") return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code"
      );
      if (!code) return;

      const meta =
        (code.data?.meta as string) ||
        (code.properties?.["dataMeta"] as string) ||
        "";
      const match = meta.match(/title[=:]"([^"]+)"/);
      if (!match) return;

      const filename = match[1];
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-filename"] },
            children: [{ type: "text", value: filename }],
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
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "img") return;

      node.properties.loading = "lazy";
      node.properties.decoding = "async";

      const alt = node.properties.alt as string;
      if (!alt || alt === "image") return;

      const figure: Element = {
        type: "element",
        tagName: "figure",
        properties: { className: ["image-figure"] },
        children: [
          node,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };
      parent.children[index] = figure;
    });
  };
}

function rehypeTableWrapper() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "table") return;

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrapper"] },
        children: [node],
      };
      parent.children[index] = wrapper;
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw) // Pass through raw HTML from preprocessor (callout divs, wikilink anchors)
  .use(rehypeShiki, {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
    transformers: [transformerMetaHighlight()],
  })
  .use(rehypeSlug)
  .use(rehypeCodeFilename)
  .use(rehypeImageCaption)
  .use(rehypeTableWrapper)
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  const result = await processor.process(md);
  return String(result);
}

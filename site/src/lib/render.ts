import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw) // Pass through raw HTML from preprocessor (callout divs, wikilink anchors)
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  const result = await processor.process(md);
  return String(result);
}

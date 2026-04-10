export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

/** Extract heading entries (h2-h4) from rendered HTML via regex on rehype-slug id attributes. */
export function extractToc(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const re = /<h([2-4])\s+id="([^"]*)"[^>]*>(.*?)<\/h[2-4]>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    entries.push({
      depth: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, ""),
    });
  }
  return entries;
}

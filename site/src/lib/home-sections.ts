/**
 * Homepage section cards (mockups review finding R-04; FR4.3).
 *
 * Rendered markdown is a flat run of siblings, so CSS alone cannot give each
 * homepage H2 section its own grouped card. This rehype step wraps every H2
 * and the siblings that follow it, up to the next H2, in section.home-card.
 * Anything before the first H2 stays outside the cards as the intro. Posts do
 * not use it; the vault note itself never changes.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';

export const HOME_CARD_CLASS = 'home-card';

export interface HomeSectionsOptions {
  /** Off by default so a shared pipeline can carry the step without using it. */
  readonly enabled?: boolean;
}

function isH2(node: RootContent): node is Element {
  return node.type === 'element' && node.tagName === 'h2';
}

/** Returns new children with each H2 section wrapped; the input is not modified. */
export function wrapHomeSectionNodes(children: readonly RootContent[]): RootContent[] {
  const result: RootContent[] = [];
  let section: ElementContent[] | null = null;
  const flush = (): void => {
    if (section === null) return;
    result.push({
      type: 'element',
      tagName: 'section',
      properties: { className: [HOME_CARD_CLASS] },
      children: section,
    });
    section = null;
  };
  for (const child of children) {
    if (isH2(child)) {
      flush();
      section = [child];
    } else if (section !== null && child.type !== 'doctype') {
      section.push(child);
    } else {
      result.push(child);
    }
  }
  flush();
  return result;
}

/** The rehype plugin; enable it only for the homepage note. */
export function rehypeHomeSections(options: HomeSectionsOptions = {}) {
  return (tree: Root): void => {
    if (options.enabled !== true) return;
    tree.children = wrapHomeSectionNodes(tree.children);
  };
}

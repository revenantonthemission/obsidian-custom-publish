/**
 * Folding the sections under h2 and h3 headings (FR5.4, FR5.8;
 * interaction-spec.md "Heading Fold Toggle").
 *
 * Each heading is wrapped in a row with a 44 × 44 toggle at its end. The
 * toggle exposes aria-expanded and is named "‘<제목>’ 섹션 접기" or
 * "‘<제목>’ 섹션 펼치기"; its chevron turns by transform. A section runs to the
 * next heading of the same or a higher level, and the footnotes are never part
 * of one. A folded inner section stays folded when its outer one unfolds.
 * Following a link into a folded section, from the table of contents or a
 * footnote, unfolds it first.
 */
import { ICON_CHEVRON_RIGHT, svgIcon } from './svg-icon';

const FOLDABLE = new Set(['H2', 'H3']);
const ROW_CLASS = 'heading-fold';
const HIDDEN_CLASS = 'heading-fold-hidden';
const ICON_SIZE = 20;

interface OpenSection {
  readonly row: HTMLElement;
  readonly level: number;
}

function isRow(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.classList.contains(ROW_CLASS);
}

/** The heading level an element opens or closes sections at; 0 closes them all. */
function boundaryLevel(element: Element): number | null {
  if (isRow(element)) return Number(element.dataset.level);
  if (element.matches('section[data-footnotes], .footnotes')) return 0;
  const match = /^H([1-6])$/.exec(element.tagName);
  return match?.[1] ? Number(match[1]) : null;
}

function toggleOf(row: HTMLElement): HTMLButtonElement | null {
  return row.querySelector<HTMLButtonElement>(':scope > .heading-fold-toggle');
}

function isExpanded(row: HTMLElement): boolean {
  return toggleOf(row)?.getAttribute('aria-expanded') !== 'false';
}

function setExpanded(row: HTMLElement, expanded: boolean): void {
  const toggle = toggleOf(row);
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute(
    'aria-label',
    `‘${row.dataset.title ?? ''}’ 섹션 ${expanded ? '접기' : '펼치기'}`
  );
}

/** The sections that enclose each direct child of the article, in order. */
function enclosingSections(content: HTMLElement): Map<Element, readonly OpenSection[]> {
  const result = new Map<Element, readonly OpenSection[]>();
  let open: readonly OpenSection[] = [];
  for (const child of content.children) {
    const level = boundaryLevel(child);
    const enclosing = level === null ? open : open.filter((section) => section.level < level);
    result.set(child, enclosing);
    open = level !== null && isRow(child) ? [...enclosing, { row: child, level }] : enclosing;
  }
  return result;
}

function render(content: HTMLElement): void {
  for (const [child, enclosing] of enclosingSections(content)) {
    child.classList.toggle(
      HIDDEN_CLASS,
      enclosing.some((section) => !isExpanded(section.row))
    );
  }
}

/** Unfolds every folded section that hides the target. */
function reveal(content: HTMLElement, target: Element): void {
  let child: Element | null = target;
  while (child && child.parentElement !== content) child = child.parentElement;
  if (!child) return;
  const folded = (enclosingSections(content).get(child) ?? []).filter(
    (section) => !isExpanded(section.row)
  );
  if (folded.length === 0) return;
  for (const section of folded) setExpanded(section.row, true);
  render(content);
}

function wrap(content: HTMLElement, heading: HTMLElement): void {
  const title = heading.textContent?.trim() ?? '';
  const row = document.createElement('div');
  row.className = ROW_CLASS;
  row.dataset.level = heading.tagName.slice(1);
  row.dataset.title = title;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'heading-fold-toggle';
  toggle.append(svgIcon(ICON_CHEVRON_RIGHT, ICON_SIZE));
  toggle.addEventListener('click', () => {
    setExpanded(row, !isExpanded(row));
    render(content);
  });
  heading.before(row);
  row.append(heading, toggle);
  setExpanded(row, true);
}

function targetOf(hash: string): Element | null {
  if (hash.length < 2) return null;
  const id = hash.slice(1);
  try {
    return document.getElementById(decodeURIComponent(id)) ?? document.getElementById(id);
  } catch {
    return document.getElementById(id);
  }
}

const content = document.querySelector<HTMLElement>('.post-content');

if (content) {
  for (const child of [...content.children]) {
    if (child instanceof HTMLElement && FOLDABLE.has(child.tagName) && child.textContent?.trim()) {
      wrap(content, child);
    }
  }
  render(content);

  // Capture runs before the link's own handlers and before it scrolls.
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      const target = link ? targetOf(link.getAttribute('href') ?? '') : null;
      if (target && content.contains(target)) reveal(content, target);
    },
    true
  );
  window.addEventListener('hashchange', () => {
    const target = targetOf(window.location.hash);
    if (target && content.contains(target)) reveal(content, target);
  });
}

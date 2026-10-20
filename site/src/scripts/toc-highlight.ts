/**
 * Marks the section being read in the table of contents, in the outline panel
 * and in the outline sheet alike, with aria-current="location" (FR4.2, FR5.4;
 * interaction-spec.md "Outline Panel and Outline Sheet").
 *
 * The current section is the last heading whose top has passed the reading
 * line, a little below where a heading lands when a table of contents link
 * jumps to it. At the very bottom of the page the last heading is current,
 * since a short final section can never reach the line. The work runs at most
 * once per frame while scrolling.
 */

/** Distance below a jumped-to heading's resting place that still counts as reached. */
const LINE_SLACK = 24;

const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
const ids = [...new Set(links.map((link) => (link.getAttribute('href') ?? '').slice(1)))];
const headings = ids
  .map((id) => document.getElementById(id))
  .filter((heading): heading is HTMLElement => heading !== null);

let activeId: string | null = null;
let readingLine = 0;
let scheduled = false;

function measureReadingLine(): void {
  const first = headings[0];
  const margin = first ? Number.parseFloat(getComputedStyle(first).scrollMarginTop) : 0;
  readingLine = (Number.isFinite(margin) ? margin : 0) + LINE_SLACK;
}

function currentId(): string | null {
  // Headings inside a folded section have no box and are skipped.
  const visible = headings.filter((heading) => heading.getClientRects().length > 0);
  const root = document.documentElement;
  const atBottom =
    window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2;
  if (atBottom) return visible.at(-1)?.id ?? null;
  const passed = visible.filter((heading) => heading.getBoundingClientRect().top <= readingLine);
  return passed.at(-1)?.id ?? null;
}

function apply(id: string | null): void {
  if (id === activeId) return;
  activeId = id;
  const href = id === null ? null : `#${id}`;
  for (const link of links) {
    if (link.getAttribute('href') === href) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply(currentId());
  });
}

if (headings.length > 0) {
  measureReadingLine();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    measureReadingLine();
    schedule();
  });
  // Folding a section or a late image moves the headings without a scroll.
  const content = document.querySelector('.post-content');
  if (content) new ResizeObserver(schedule).observe(content);
  schedule();
}

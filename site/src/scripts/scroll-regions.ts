/**
 * Wide content scrolls inside its own region instead of widening the page
 * (mockups review finding R-05; WCAG 1.4.10 Reflow and 2.1.1 Keyboard).
 * While a code block, table, display formula or text diagram overflows, it is
 * a named, keyboard-focusable region, so it can be scrolled with the arrow
 * keys (axe scrollable-region-focusable). Once it fits again, it goes back to
 * plain content and leaves the Tab order. A ResizeObserver keeps this current
 * as the window, the text size or a folded section changes the width.
 */

const SCROLL_REGIONS: readonly (readonly [selector: string, label: string])[] = [
  ["pre.shiki", "코드, 가로로 스크롤 가능"],
  [".table-wrapper", "표, 가로로 스크롤 가능"],
  [".katex-display", "수식, 가로로 스크롤 가능"],
  ["pre.diagram-d2-ascii", "다이어그램, 가로로 스크롤 가능"],
];

/** One pixel of slack absorbs sub-pixel rounding. */
const OVERFLOW_SLACK = 1;

const labels = new Map<Element, string>();

function update(element: Element): void {
  const label = labels.get(element);
  if (label === undefined) return;
  const overflows = element.scrollWidth > element.clientWidth + OVERFLOW_SLACK;
  if (overflows) {
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", label);
    return;
  }
  // Shiki marks every block focusable; one that fits needs no Tab stop.
  element.removeAttribute("tabindex");
  element.removeAttribute("role");
  element.removeAttribute("aria-label");
}

const content = document.querySelector(".post-content");

if (content) {
  for (const [selector, label] of SCROLL_REGIONS) {
    for (const element of content.querySelectorAll(selector)) labels.set(element, label);
  }
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) update(entry.target);
  });
  for (const element of labels.keys()) {
    update(element);
    observer.observe(element);
  }
  // A late web font (KaTeX's) can widen the content without resizing the box.
  void document.fonts.ready.then(() => {
    for (const element of labels.keys()) update(element);
  });
}

/**
 * Keeps Tab and Shift+Tab inside an open modal: the outline sheet and the
 * search dialog (C-05). A native modal dialog makes the page behind it inert,
 * but Tab past its last control would still leave for the browser's own
 * interface, so every Tab is moved through the dialog's own controls, wrapping
 * at either end. Hidden controls and those out of the Tab order are skipped.
 */
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

/** The controls in the root that Tab can reach, in document order. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
}

/** The next stop in a ring of `count` stops; from outside the ring, the first or last. */
export function nextStop(current: number, count: number, backwards: boolean): number {
  if (current === -1) return backwards ? count - 1 : 0;
  return (current + (backwards ? count - 1 : 1)) % count;
}

/** Handles a keydown inside the root: a Tab moves to the next control in the root. */
export function trapTab(root: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  const focusables = focusableIn(root);
  if (focusables.length === 0) return;
  event.preventDefault();
  const current = focusables.indexOf(document.activeElement as HTMLElement);
  focusables[nextStop(current, focusables.length, event.shiftKey)]?.focus();
}

/**
 * The post outline (FR4.2, FR5.3; interaction-spec.md "Outline Panel and
 * Outline Sheet"; mockups W3 and W4).
 *
 * - Tabs: scripts/tabs.ts runs the 목차 | 탐색 tabs in the panel and the sheet.
 * - Sheet: below 1100 px the "목차 열기" button opens the outline as a native
 *   modal <dialog>, so the page behind it is inert. Focus moves to the
 *   selected tab, Tab and Shift+Tab stay inside the sheet (a modal dialog
 *   otherwise lets focus leave for the browser's own interface), and Escape,
 *   the close button or a click on the dimmed page close it and return focus
 *   to the button. Choosing a heading closes the sheet and moves focus to
 *   that heading. Widening the window to 1100 px closes the sheet, because
 *   the panel takes over.
 */

import { selectedTab } from "./tabs";

const PANEL_QUERY = "(min-width: 1100px)";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

type CloseReason = "dismiss" | "link" | "resize";

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
}

/** The next stop in a ring of `count` stops; from outside the ring, the first or last. */
function nextStop(current: number, count: number, backwards: boolean): number {
  if (current === -1) return backwards ? count - 1 : 0;
  return (current + (backwards ? count - 1 : 1)) % count;
}

/** Keeps Tab and Shift+Tab inside the open sheet, wrapping at either end. */
function trapTab(dialog: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  const focusables = focusableIn(dialog);
  if (focusables.length === 0) return;
  event.preventDefault();
  const current = focusables.indexOf(document.activeElement as HTMLElement);
  focusables[nextStop(current, focusables.length, event.shiftKey)]?.focus();
}

function isOutside(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  const box = dialog.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

/** Moves focus to the heading a table of contents link points at. */
function focusHeading(link: HTMLAnchorElement): void {
  const id = (link.getAttribute("href") ?? "").slice(1);
  const heading = id === "" ? null : document.getElementById(id);
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

function setUpSheet(): void {
  const dialog = document.querySelector<HTMLDialogElement>("dialog.outline-sheet");
  const opener = document.querySelector<HTMLButtonElement>(".outline-open");
  const panel = document.querySelector<HTMLElement>(".post-outline");
  if (!dialog || !opener || typeof dialog.showModal !== "function") return;

  let closeReason: CloseReason = "dismiss";
  const closeAs = (reason: CloseReason): void => {
    closeReason = reason;
    dialog.close();
  };

  opener.addEventListener("click", () => {
    if (dialog.open) return;
    closeReason = "dismiss";
    dialog.showModal();
    selectedTab(dialog)?.focus();
  });

  dialog.querySelector(".outline-close")?.addEventListener("click", () => closeAs("dismiss"));

  dialog.addEventListener("keydown", (event) => trapTab(dialog, event));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && isOutside(dialog, event)) {
      closeAs("dismiss");
      return;
    }
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    // The link still navigates to its heading once the sheet has closed.
    closeAs("link");
    requestAnimationFrame(() => focusHeading(link));
  });

  dialog.addEventListener("close", () => {
    const reason = closeReason;
    closeReason = "dismiss";
    if (reason === "link") return;
    if (reason === "resize") {
      if (panel) selectedTab(panel)?.focus();
      return;
    }
    opener.focus();
  });

  window.matchMedia(PANEL_QUERY).addEventListener("change", (event) => {
    if (event.matches && dialog.open) closeAs("resize");
  });
}

setUpSheet();

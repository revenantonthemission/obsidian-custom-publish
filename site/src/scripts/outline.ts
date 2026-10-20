/**
 * The post outline (FR4.2, FR5.3; interaction-spec.md "Outline Panel and
 * Outline Sheet"; mockups W3 and W4).
 *
 * - Tabs: the WAI-ARIA tabs pattern with automatic activation. Left and Right
 *   move between the tabs and select them; Home and End jump to the first or
 *   last tab. Only the selected tab is in the Tab order.
 * - Sheet: below 1100 px the "목차 열기" button opens the outline as a native
 *   modal <dialog>, so the page behind it is inert. Focus moves to the
 *   selected tab, Tab and Shift+Tab stay inside the sheet (a modal dialog
 *   otherwise lets focus leave for the browser's own interface), and Escape,
 *   the close button or a click on the dimmed page close it and return focus
 *   to the button. Choosing a heading closes the sheet and moves focus to
 *   that heading. Widening the window to 1100 px closes the sheet, because
 *   the panel takes over.
 */

const PANEL_QUERY = "(min-width: 1100px)";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

type CloseReason = "dismiss" | "link" | "resize";

// ── Tabs ──

function tabsOf(tablist: Element): HTMLElement[] {
  return [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];
}

function selectTab(tab: HTMLElement): void {
  const tablist = tab.closest('[role="tablist"]');
  if (!tablist) return;
  for (const candidate of tabsOf(tablist)) {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    const panelId = candidate.getAttribute("aria-controls");
    const panel = panelId === null ? null : document.getElementById(panelId);
    if (panel) panel.hidden = !selected;
  }
}

/** The index the key moves to, or null when the key is not a tab key. */
function targetIndex(key: string, index: number, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case "ArrowRight":
      return index === last ? 0 : index + 1;
    case "ArrowLeft":
      return index === 0 ? last : index - 1;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

function onTabKeydown(event: KeyboardEvent): void {
  const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
  const tablist = tab?.closest('[role="tablist"]');
  if (!tab || !tablist) return;
  const tabs = tabsOf(tablist);
  const next = targetIndex(event.key, tabs.indexOf(tab), tabs.length);
  const target = next === null ? undefined : tabs[next];
  if (!target) return;
  event.preventDefault();
  selectTab(target);
  target.focus();
}

function onTabClick(event: MouseEvent): void {
  const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
  if (tab) selectTab(tab);
}

function selectedTab(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
}

// ── Sheet ──

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
}

/** Keeps Tab and Shift+Tab inside the open sheet, wrapping at either end. */
function trapTab(dialog: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;
  const focusables = focusableIn(dialog);
  if (focusables.length === 0) return;
  event.preventDefault();
  const step = event.shiftKey ? -1 : 1;
  const current = focusables.indexOf(document.activeElement as HTMLElement);
  const next =
    current === -1
      ? event.shiftKey
        ? focusables.length - 1
        : 0
      : (current + step + focusables.length) % focusables.length;
  focusables[next]?.focus();
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

for (const tablist of document.querySelectorAll<HTMLElement>(".outline-tabs")) {
  tablist.addEventListener("keydown", onTabKeydown);
  tablist.addEventListener("click", onTabClick);
}
setUpSheet();

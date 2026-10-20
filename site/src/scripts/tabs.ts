/**
 * Segmented tabs (interaction-spec.md "Segmented Control"): the WAI-ARIA
 * tabs pattern with automatic activation for every [role="tablist"][data-tabs]
 * on the page, such as the post outline's 목차 | 탐색 and the graph page's
 * 그래프 | 목록. Left and Right move between the tabs and select them, Home
 * and End jump to the first or last tab, and only the selected tab is in the
 * Tab order. Importing the module wires the page once.
 */

function tabsOf(tablist: Element): HTMLElement[] {
  return [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];
}

/** Selects the tab and shows its panel; the other tabs' panels hide. */
export function selectTab(tab: HTMLElement): void {
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

/** The selected tab inside the root, if any. */
export function selectedTab(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
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

function onKeydown(event: KeyboardEvent): void {
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

function onClick(event: MouseEvent): void {
  const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
  if (tab) selectTab(tab);
}

for (const tablist of document.querySelectorAll<HTMLElement>('[role="tablist"][data-tabs]')) {
  tablist.addEventListener("keydown", onKeydown);
  tablist.addEventListener("click", onClick);
}

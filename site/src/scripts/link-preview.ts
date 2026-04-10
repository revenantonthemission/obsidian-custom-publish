interface PreviewEntry {
  title: string;
  tags: string[];
  summary: string;
}

let previewData: Record<string, PreviewEntry> | null = null;
let tooltip: HTMLDivElement | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

let mobileCard: HTMLDivElement | null = null;
let mobileBackdrop: HTMLDivElement | null = null;

const isMobile = window.matchMedia("(max-width: 767px)");

async function ensurePreviewData() {
  if (previewData) return previewData;
  try {
    const res = await fetch("/previews.json");
    previewData = await res.json();
  } catch {
    previewData = {};
  }
  return previewData;
}

function buildPreviewContent(preview: PreviewEntry, container: HTMLElement) {
  container.replaceChildren();

  const titleEl = document.createElement("div");
  titleEl.className = "preview-title";
  titleEl.textContent = preview.title;
  container.appendChild(titleEl);

  if (preview.tags.length) {
    const tagsEl = document.createElement("div");
    tagsEl.className = "preview-tags";
    for (const tag of preview.tags) {
      const tagSpan = document.createElement("span");
      tagSpan.textContent = tag;
      tagsEl.appendChild(tagSpan);
    }
    container.appendChild(tagsEl);
  }

  const summaryEl = document.createElement("p");
  summaryEl.className = "preview-summary";
  summaryEl.textContent = preview.summary;
  container.appendChild(summaryEl);
}

// ── Desktop: hover tooltip ──

function createTooltip() {
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.className = "link-preview-tooltip";
  document.body.appendChild(tooltip);
  return tooltip;
}

function showPreview(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || "";
  const match = href.match(/^\/posts\/(.+?)(?:#|$)/);
  if (!match) return;
  const slug = match[1];

  hoverTimer = setTimeout(async () => {
    const data = await ensurePreviewData();
    if (!data) return;
    const preview = data[slug];
    if (!preview) return;

    const tip = createTooltip();
    buildPreviewContent(preview, tip);

    const rect = anchor.getBoundingClientRect();
    const tipWidth = 280;
    let left = rect.left + window.scrollX;
    let top = rect.top + window.scrollY - 8;

    tip.style.left = `${Math.min(left, window.innerWidth - tipWidth - 16)}px`;
    tip.style.top = `${top}px`;
    tip.style.transform = "translateY(-100%)";
    tip.classList.add("visible");
  }, 300);
}

function hidePreview() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  if (tooltip) {
    tooltip.classList.remove("visible");
  }
}

// ── Mobile: tap to show bottom card ──

function createMobileCard() {
  if (mobileCard) return;
  mobileBackdrop = document.createElement("div");
  mobileBackdrop.className = "link-preview-backdrop";
  mobileBackdrop.addEventListener("click", hideMobilePreview);
  document.body.appendChild(mobileBackdrop);

  mobileCard = document.createElement("div");
  mobileCard.className = "link-preview-mobile";
  document.body.appendChild(mobileCard);
}

function hideMobilePreview() {
  mobileCard?.classList.remove("visible");
  mobileBackdrop?.classList.remove("visible");
}

async function showMobilePreview(anchor: HTMLAnchorElement, e: Event) {
  const href = anchor.getAttribute("href") || "";
  const match = href.match(/^\/posts\/(.+?)(?:#|$)/);
  if (!match) return;

  const slug = match[1];
  const data = await ensurePreviewData();
  if (!data) return;
  const preview = data[slug];
  if (!preview) return;

  e.preventDefault();
  createMobileCard();
  if (!mobileCard || !mobileBackdrop) return;

  buildPreviewContent(preview, mobileCard);

  const visitLink = document.createElement("a");
  visitLink.className = "preview-visit";
  visitLink.href = href;
  visitLink.textContent = "방문 →";
  mobileCard.appendChild(visitLink);

  mobileBackdrop.classList.add("visible");
  mobileCard.offsetHeight; // force reflow for transition
  mobileCard.classList.add("visible");
}

// ── Init ──

document.querySelectorAll('a[href^="/posts/"]').forEach((a) => {
  if (isMobile.matches) {
    a.addEventListener("click", (e) => showMobilePreview(a as HTMLAnchorElement, e));
  } else {
    a.addEventListener("mouseenter", () => showPreview(a as HTMLAnchorElement));
    a.addEventListener("mouseleave", hidePreview);
  }
});

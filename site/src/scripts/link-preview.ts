/**
 * Link preview card (FR5.7, C-07; interaction-spec.md "Link Preview"; mockups
 * W10). Links to other posts in the article get a text-only card with
 * role="tooltip", referenced from the link by aria-describedby while shown.
 *
 * - It opens on keyboard focus, or after 300 ms of mouse or pen hover.
 * - It stays open while the pointer is on the link or on the card, and closes
 *   on Escape (focus stays on the link), on blur, or 120 ms after the pointer
 *   leaves both, which meets WCAG 1.4.13.
 * - Touch is never intercepted: a tap navigates at once, and the browser's own
 *   press-and-hold preview stays available (the FR5.7 amendment, R-11).
 */

interface PreviewEntry {
  readonly title: string;
  readonly tags: readonly string[];
  readonly summary: string;
}

type PreviewIndex = ReadonlyMap<string, PreviewEntry>;

const HOVER_DELAY_MS = 300;
const HIDE_DELAY_MS = 120;
const CARD_ID = "link-preview";
const GAP = 8;
const EDGE = 16;
const LOAD_ERROR = "미리보기를 불러오지 못했습니다";
const POST_HREF = /^\/posts\/([^#?]+)/;

let indexRequest: Promise<PreviewIndex> | null = null;
let card: HTMLElement | null = null;
let current: HTMLAnchorElement | null = null;
let openTimer: number | undefined;
let closeTimer: number | undefined;
/** Set by a pointer press, so the focus that follows it opens nothing. */
let focusFromPointer = false;

// ── Data ──

function toEntry(value: unknown): PreviewEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const { title, tags, summary } = value as Record<string, unknown>;
  if (typeof title !== "string") return null;
  return {
    title,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
    summary: typeof summary === "string" ? summary : "",
  };
}

async function fetchIndex(): Promise<PreviewIndex> {
  const response = await fetch("/previews.json");
  if (!response.ok) throw new Error(`previews.json answered ${response.status}`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) throw new Error("previews.json is not an object");
  const entries = Object.entries(data as Record<string, unknown>).flatMap(([slug, value]) => {
    const entry = toEntry(value);
    return entry === null ? [] : [[slug, entry] as const];
  });
  return new Map(entries);
}

/** Loads the index once; a failed load is retried on the next preview. */
function loadIndex(): Promise<PreviewIndex> {
  indexRequest ??= fetchIndex().catch((error: unknown) => {
    indexRequest = null;
    throw error;
  });
  return indexRequest;
}

function slugOf(anchor: HTMLAnchorElement): string | null {
  const match = POST_HREF.exec(anchor.getAttribute("href") ?? "");
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

// ── Card ──

function paragraph(className: string, text: string): HTMLParagraphElement {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

function ensureCard(): HTMLElement {
  if (card) return card;
  const element = document.createElement("div");
  element.id = CARD_ID;
  element.className = "link-preview";
  element.setAttribute("role", "tooltip");
  element.dataset.material = "thick";
  element.hidden = true;
  element.addEventListener("pointerenter", cancelClose);
  element.addEventListener("pointerleave", scheduleClose);
  document.body.append(element);
  card = element;
  return element;
}

function fill(target: HTMLElement, entry: PreviewEntry | null): void {
  if (entry === null) {
    target.replaceChildren(paragraph("link-preview-summary", LOAD_ERROR));
    return;
  }
  const parts = [paragraph("link-preview-title", entry.title)];
  if (entry.tags.length > 0) {
    parts.push(paragraph("link-preview-tags", entry.tags.map((tag) => `#${tag}`).join(" ")));
  }
  if (entry.summary !== "") parts.push(paragraph("link-preview-summary", entry.summary));
  target.replaceChildren(...parts);
}

/** Below the link when it fits, otherwise above it; never past the edges. */
function place(target: HTMLElement, anchor: HTMLAnchorElement): void {
  const link = anchor.getBoundingClientRect();
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  const maxLeft = document.documentElement.clientWidth - width - EDGE;
  const left = Math.max(EDGE, Math.min(link.left, maxLeft));
  const below = link.bottom + GAP;
  const top = below + height <= window.innerHeight - EDGE ? below : Math.max(EDGE, link.top - GAP - height);
  target.style.left = `${left + window.scrollX}px`;
  target.style.top = `${top + window.scrollY}px`;
}

// ── Open and close ──

function clearTimers(): void {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
}

function close(): void {
  clearTimers();
  current?.removeAttribute("aria-describedby");
  current = null;
  if (card) card.hidden = true;
}

function cancelClose(): void {
  window.clearTimeout(closeTimer);
}

function scheduleClose(): void {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(close, HIDE_DELAY_MS);
}

async function open(anchor: HTMLAnchorElement): Promise<void> {
  const slug = slugOf(anchor);
  if (slug === null) return;
  clearTimers();
  if (current !== anchor) current?.removeAttribute("aria-describedby");
  current = anchor;
  let entry: PreviewEntry | null;
  try {
    entry = (await loadIndex()).get(slug) ?? null;
    // A post without a preview gets no card at all.
    if (entry === null) {
      if (current === anchor) close();
      return;
    }
  } catch {
    entry = null;
  }
  if (current !== anchor) return;
  const target = ensureCard();
  fill(target, entry);
  target.hidden = false;
  place(target, anchor);
  anchor.setAttribute("aria-describedby", CARD_ID);
}

function scheduleOpen(anchor: HTMLAnchorElement): void {
  clearTimers();
  openTimer = window.setTimeout(() => {
    void open(anchor);
  }, HOVER_DELAY_MS);
}

// ── Wiring ──

function wire(anchor: HTMLAnchorElement): void {
  anchor.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    if (current === anchor) cancelClose();
    else scheduleOpen(anchor);
  });
  anchor.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") scheduleClose();
  });
  anchor.addEventListener("pointerdown", () => {
    focusFromPointer = true;
    window.setTimeout(() => {
      focusFromPointer = false;
    }, 0);
  });
  anchor.addEventListener("focus", () => {
    if (focusFromPointer) return;
    void open(anchor);
  });
  anchor.addEventListener("blur", () => {
    if (current === anchor) close();
  });
}

for (const anchor of document.querySelectorAll<HTMLAnchorElement>('.post-content a[href^="/posts/"]')) {
  wire(anchor);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && card && !card.hidden) close();
});

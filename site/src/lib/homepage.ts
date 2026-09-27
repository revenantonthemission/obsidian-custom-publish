// U2 homepage composition (LC-U2-10): pure functions only — no I/O, no dates.
// index.astro composes these with getHomepage() and the U1 profile fragment.

export const PROFILE_SLOT_TOKEN = "<!-- profile:slot -->";

/** Fence-aware count of standalone slot-token lines (BR-U2-036~037). */
export function countSlotTokens(markdown: string): number {
  let inFence = false;
  let count = 0;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && line.trim() === PROFILE_SLOT_TOKEN) count += 1;
  }
  return count;
}

/** Fail closed on slot cardinality (BR-U2-038): 0 → HP003, 2+ → HP004. */
export function assertExactlyOneSlot(markdown: string, sourcePath: string): void {
  const count = countSlotTokens(markdown);
  if (count === 0) {
    throw new Error(`HP003 ${sourcePath}: profile slot token not found (count 0)`);
  }
  if (count > 1) {
    throw new Error(`HP004 ${sourcePath}: ${count} profile slot tokens found`);
  }
}

export interface SlotSplit {
  readonly before: string;
  readonly after: string;
}

/**
 * Split rendered HTML at the sole slot comment. Fenced copies cannot match:
 * rendering HTML-escapes code content, so only the authored token survives
 * as a literal comment (BR-U2-040 — the token itself is removed here).
 */
export function splitRenderedAtSlot(html: string, sourcePath: string): SlotSplit {
  const parts = html.split(PROFILE_SLOT_TOKEN);
  if (parts.length === 1) {
    throw new Error(`HP003 ${sourcePath}: rendered output lost the profile slot token`);
  }
  if (parts.length > 2) {
    throw new Error(
      `HP004 ${sourcePath}: ${parts.length - 1} slot tokens in rendered output`,
    );
  }
  return { before: parts[0], after: parts[1] };
}

/** The pre-U2 recent-posts rule, preserved verbatim (BR-U2-041). */
const RECENT_HEADING_RE = /<h2[^>]*>이번주에 작성된 포스트[^<]*<\/h2>[\s\S]*?(?=<h2|$)/;

export interface RecentSplit {
  readonly before: string;
  readonly after: string;
  readonly found: boolean;
}

export function splitAtRecentHeading(html: string): RecentSplit {
  const match = RECENT_HEADING_RE.exec(html);
  if (match === null) {
    return { before: html, after: "", found: false };
  }
  return {
    before: html.slice(0, match.index),
    after: html.slice(match.index + match[0].length),
    found: true,
  };
}

export interface TodayPostLike {
  readonly is_hub: boolean;
  readonly published?: string | null;
}

/** Today filter with the date as a parameter (PD-U2-04, NFR-U2-006). */
export function filterTodayPosts<T extends TodayPostLike>(
  posts: readonly T[],
  today: string,
): T[] {
  return posts.filter((p) => !p.is_hub && p.published === today);
}

/**
 * Build-start date: the documented e2e override wins when well-formed,
 * otherwise the real date (PD-U2-04). The only date read in the composition.
 */
export function resolveBuildDate(
  env: Readonly<Record<string, string | undefined>>,
  now: () => Date = () => new Date(),
): string {
  const override = env.HOMEPAGE_TODAY_OVERRIDE;
  if (override !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return override;
  }
  return now().toISOString().slice(0, 10);
}

export type HomepageChunk =
  | { readonly kind: "html"; readonly html: string }
  | { readonly kind: "recent" }
  | { readonly kind: "slot" };

/**
 * Ordered render plan: authored order with the slot and recent-posts
 * substitutions applied independently (BR-U2-042). Empty html chunks are
 * dropped; the slot chunk always renders.
 */
export function buildHomepageChunks(
  renderedHtml: string,
  sourcePath: string,
): HomepageChunk[] {
  const slot = splitRenderedAtSlot(renderedHtml, sourcePath);
  const chunks: HomepageChunk[] = [];
  let recentPlaced = false;
  for (const [part, side] of [
    [slot.before, "before"],
    [slot.after, "after"],
  ] as const) {
    const recent = splitAtRecentHeading(part);
    if (recent.before.trim() !== "") chunks.push({ kind: "html", html: recent.before });
    if (recent.found) {
      chunks.push({ kind: "recent" });
      recentPlaced = true;
    }
    if (recent.found && recent.after.trim() !== "") {
      chunks.push({ kind: "html", html: recent.after });
    }
    if (side === "before") chunks.push({ kind: "slot" });
  }
  // When the heading never matches — the real Vault uses an h3, which the
  // verbatim h2 rule ignores — the section still always renders, placed
  // directly after the profile slot.
  if (!recentPlaced) {
    const slotIndex = chunks.findIndex((c) => c.kind === "slot");
    chunks.splice(slotIndex + 1, 0, { kind: "recent" });
  }
  return chunks;
}

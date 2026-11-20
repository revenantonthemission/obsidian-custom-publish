// Homepage helpers (U1 BR6.5; NFR7.2): pure functions only — no I/O. The
// homepage no longer reads a vault note, so the profile slot, the section
// splits and HP001–HP004 are gone; what remains builds the interim
// "오늘 발행된 글" list until U2 replaces it.

export interface TodayPostLike {
  readonly is_hub: boolean;
  readonly published?: string | null;
}

/** Today filter with the date as a parameter (PD-U2-04, NFR-U2-006). */
export function filterTodayPosts<T extends TodayPostLike>(posts: readonly T[], today: string): T[] {
  return posts.filter((p) => !p.is_hub && p.published === today);
}

/**
 * Build-start date: the documented e2e override wins when well-formed,
 * otherwise the real date (PD-U2-04). The only date read on the homepage.
 */
export function resolveBuildDate(
  env: Readonly<Record<string, string | undefined>>,
  now: () => Date = () => new Date()
): string {
  const override = env.HOMEPAGE_TODAY_OVERRIDE;
  if (override !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return override;
  }
  return now().toISOString().slice(0, 10);
}

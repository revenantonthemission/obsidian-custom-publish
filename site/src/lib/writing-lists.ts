// WritingLists (U2 functional design rules.md BR1.1–BR1.7). Pure functions:
// the post metadata and the build date are arguments, so nothing here reads a
// file or the clock except resolveKoreanBuildDate, whose clock is injected.
// Every list holds ordinary posts only (BR1.1); hubs appear only as topics.
// Outputs are frozen and their order is total, so the same input always gives
// the same HTML (BR1.7; NFR4.7).
import type { PostMeta } from './types';

/** The fields the lists read; pages pass full PostMeta entries through. */
export type ListPost = Pick<PostMeta, 'slug' | 'title' | 'published' | 'is_hub'>;
export type TopicSource = ListPost & Pick<PostMeta, 'forward_links'>;

export interface YearGroup<T extends ListPost = PostMeta> {
  readonly label: string;
  readonly posts: readonly T[];
}

export interface Topic {
  readonly slug: string;
  readonly title: string;
  readonly count: number;
}

export interface WeekBounds {
  readonly monday: string;
  readonly sunday: string;
}

/** The last group on /writing/all, for posts without a published date (BR1.5). */
export const UNDATED_LABEL = '날짜 없음';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC noon of a YYYY-MM-DD date, or null when it is not a real calendar date. */
function calendarNoon(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const roundTrips =
    noon.getUTCFullYear() === year && noon.getUTCMonth() === month - 1 && noon.getUTCDate() === day;
  return roundTrips ? noon : null;
}

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * The build's Korean date (BR1.2). HOMEPAGE_TODAY_OVERRIDE, a test-only
 * setting, wins when it is a real YYYY-MM-DD date (the calendar check is new
 * in U2: `2026-13-45` is ignored); otherwise the clock plus 9 hours.
 */
export function resolveKoreanBuildDate(
  env: Readonly<Record<string, string | undefined>>,
  now: () => Date = () => new Date()
): string {
  const override = env.HOMEPAGE_TODAY_OVERRIDE;
  if (override !== undefined && calendarNoon(override) !== null) return override;
  return isoDay(new Date(now().getTime() + KST_OFFSET_MS));
}

/** Monday and Sunday of the date's week, as calendar dates (UTC-noon anchored). */
export function weekBounds(date: string): WeekBounds {
  const noon = calendarNoon(date);
  if (noon === null) throw new RangeError(`weekBounds: ${date} is not a YYYY-MM-DD date`);
  const sinceMonday = (noon.getUTCDay() + 6) % 7;
  const monday = new Date(noon.getTime() - sinceMonday * DAY_MS);
  return Object.freeze({
    monday: isoDay(monday),
    sunday: isoDay(new Date(monday.getTime() + 6 * DAY_MS)),
  });
}

/** Code-unit comparison, independent of locale (BR1.3). */
function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * The shared total order (BR1.3): published descending (undated last), then
 * title by UTF-16 code unit, then slug.
 */
export function comparePosts(a: ListPost, b: ListPost): number {
  if (a.published !== b.published) {
    if (a.published === null) return 1;
    if (b.published === null) return -1;
    return compareText(b.published, a.published);
  }
  return compareText(a.title, b.title) || compareText(a.slug, b.slug);
}

function sortedOrdinary<T extends ListPost>(meta: readonly T[], keep: (post: T) => boolean): T[] {
  return meta.filter((post) => !post.is_hub && keep(post)).sort(comparePosts);
}

const isDated = (post: ListPost): boolean => post.published !== null;

/** This week's posts (BR1.3): dated Monday–Sunday of `date`, newest first, no cap. */
export function weekPosts<T extends ListPost>(meta: readonly T[], date: string): readonly T[] {
  const { monday, sunday } = weekBounds(date);
  const inWeek = (post: T) =>
    post.published !== null && monday <= post.published && post.published <= sunday;
  return Object.freeze(sortedOrdinary(meta, inWeek));
}

/** The `limit` newest dated posts (BR1.4). */
export function recentPosts<T extends ListPost>(meta: readonly T[], limit = 5): readonly T[] {
  return Object.freeze(sortedOrdinary(meta, isDated).slice(0, limit));
}

/**
 * Every ordinary post exactly once (BR1.5): year groups newest first, then
 * "날짜 없음" (ordered by title) when there are undated posts. No empty group.
 */
export function postsByYear<T extends ListPost>(meta: readonly T[]): readonly YearGroup<T>[] {
  const groups: YearGroup<T>[] = [];
  let current: T[] = [];
  let label = '';
  for (const post of sortedOrdinary(meta, isDated)) {
    const year = post.published!.slice(0, 4);
    if (year !== label) {
      current = [];
      label = year;
      groups.push({ label, posts: current });
    }
    current.push(post);
  }
  const undated = sortedOrdinary(meta, (post) => !isDated(post));
  if (undated.length > 0) groups.push({ label: UNDATED_LABEL, posts: undated });
  return Object.freeze(
    groups.map((group) => Object.freeze({ label: group.label, posts: Object.freeze(group.posts) }))
  );
}

/**
 * One topic per hub, by title (BR1.6). The count is the hub's forward links
 * that resolve to a metadata entry, the same set the hub page lists.
 */
export function topics(meta: readonly TopicSource[]): readonly Topic[] {
  const known = new Set(meta.map((entry) => entry.slug));
  return Object.freeze(
    meta
      .filter((entry) => entry.is_hub)
      .sort((a, b) => compareText(a.title, b.title) || compareText(a.slug, b.slug))
      .map((entry) =>
        Object.freeze({
          slug: entry.slug,
          title: entry.title,
          count: entry.forward_links.filter((slug) => known.has(slug)).length,
        })
      )
  );
}

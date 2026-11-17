import { createValidationIssue, sortAndDedupeIssues } from './profile/issues.js';
import type { ValidationIssue, ValidationResult } from './profile/types.js';

export interface NavigationItem {
  readonly href: string;
  readonly label: string;
}

/**
 * The Writing marker (BR1.2): 'page' for the Writing route itself, 'section'
 * for its descendants, null everywhere else.
 */
export type NavigationMarker = 'page' | 'section' | null;

/** The rendered attribute value (BR1.3): 'page', 'true', or no attribute. */
export type NavigationAriaCurrent = 'page' | 'true' | null;

export interface NavigationState extends NavigationItem {
  readonly current: boolean;
  readonly ariaCurrent: NavigationAriaCurrent;
}

const PRIMARY_NAVIGATION = freezeNavigationModel([{ href: '/writing', label: 'Writing' }]);

const PROFILE_LOCAL_NAVIGATION = freezeNavigationModel([
  { href: '/', label: '홈' },
  { href: '/resume', label: 'Résumé' },
  { href: '/portfolio', label: 'Portfolio' },
]);

const NAVIGATION_MODEL_PATH = 'profile.navigation.model';
const NAVIGATION_CURRENT_PATH = 'profile.navigation.current';
const CONTROL_OR_WHITESPACE_PATTERN = /[\u0000-\u0020\u007f]/;
const INVALID_PERCENT_ESCAPE_PATTERN = /%(?![0-9A-Fa-f]{2})/;

export function getPrimaryNavigation(): readonly NavigationItem[] {
  return PRIMARY_NAVIGATION;
}

export function getProfileLocalNavigation(): readonly NavigationItem[] {
  return PROFILE_LOCAL_NAVIGATION;
}

/**
 * The Writing marker as a pure function of the normalised path (BR1.2, BR1.4):
 * the query and the fragment are dropped, one trailing slash is dropped, and
 * the result is compared against the model's href, segment by segment and case
 * sensitively. An unusable path yields no marker, never a guess; the build
 * fails closed on the existing validation instead.
 */
export function resolveNavigationMarker(pathname: string): NavigationMarker {
  const normalizedPathname = normalizePathname(pathname);
  const href = PRIMARY_NAVIGATION[0]?.href;

  if (normalizedPathname === undefined || href === undefined) {
    return null;
  }

  return markerForPath(normalizedPathname, href);
}

export function getPrimaryNavigationState(
  pathname: string
): ValidationResult<readonly NavigationState[]> {
  return getNavigationState(PRIMARY_NAVIGATION, pathname);
}

export function getProfileLocalNavigationState(
  pathname: string
): ValidationResult<readonly NavigationState[]> {
  return getNavigationState(PROFILE_LOCAL_NAVIGATION, pathname);
}

export function getNavigationState(
  items: readonly NavigationItem[],
  pathname: string
): ValidationResult<readonly NavigationState[]> {
  const issues: ValidationIssue[] = [];
  const inspectedItems = inspectNavigationItems(items, issues);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === undefined) {
    issues.push(createValidationIssue('navigation.current.invalid', NAVIGATION_CURRENT_PATH));
  }

  const model = inspectedItems === undefined ? undefined : resolveApprovedModel(inspectedItems);
  if (model === undefined) {
    issues.push(createValidationIssue('navigation.model.invalid', NAVIGATION_MODEL_PATH));
  }

  let states: readonly NavigationState[] | undefined;
  if (inspectedItems !== undefined && normalizedPathname !== undefined && model !== undefined) {
    states = freezeNavigationStates(
      inspectedItems.map((item) => buildNavigationState(item, normalizedPathname, model))
    );

    if (states.filter((state) => state.current).length > 1) {
      issues.push(createValidationIssue('navigation.current.invalid', NAVIGATION_CURRENT_PATH));
    }
  }

  const finalIssues = sortAndDedupeIssues(issues);
  if (finalIssues.length > 0 || states === undefined) {
    const failureIssues =
      finalIssues.length > 0
        ? finalIssues
        : [createValidationIssue('navigation.model.invalid', NAVIGATION_MODEL_PATH)];

    return Object.freeze({
      ok: false,
      issues: failureIssues as [ValidationIssue, ...ValidationIssue[]],
    });
  }

  return Object.freeze({
    ok: true,
    value: states,
  });
}

function inspectNavigationItems(
  items: readonly NavigationItem[],
  issues: ValidationIssue[]
): readonly NavigationItem[] | undefined {
  try {
    return inspectNavigationItemsSafely(items, issues);
  } catch {
    issues.push(createValidationIssue('navigation.model.invalid', NAVIGATION_MODEL_PATH));
    return undefined;
  }
}

function inspectNavigationItemsSafely(
  items: readonly NavigationItem[],
  issues: ValidationIssue[]
): readonly NavigationItem[] | undefined {
  if (!Array.isArray(items) || items.length === 0) {
    issues.push(createValidationIssue('navigation.model.invalid', NAVIGATION_MODEL_PATH));
    return undefined;
  }

  const inspected: NavigationItem[] = [];
  const hrefs = new Set<string>();
  const labels = new Set<string>();
  let valid = true;

  for (const candidate of items as readonly unknown[]) {
    if (!isRecord(candidate)) {
      valid = false;
      continue;
    }

    const keys = Reflect.ownKeys(candidate);
    if (keys.length !== 2 || !keys.includes('href') || !keys.includes('label')) {
      valid = false;
      continue;
    }

    const hrefDescriptor = Object.getOwnPropertyDescriptor(candidate, 'href');
    const labelDescriptor = Object.getOwnPropertyDescriptor(candidate, 'label');
    if (
      hrefDescriptor === undefined ||
      labelDescriptor === undefined ||
      !('value' in hrefDescriptor) ||
      !('value' in labelDescriptor)
    ) {
      valid = false;
      continue;
    }

    const href = hrefDescriptor.value;
    const label = labelDescriptor.value;
    if (
      typeof href !== 'string' ||
      normalizeNavigationHref(href) !== href ||
      typeof label !== 'string' ||
      label.length === 0 ||
      label.trim() !== label ||
      CONTROL_OR_WHITESPACE_PATTERN.test(label)
    ) {
      valid = false;
      continue;
    }

    if (hrefs.has(href) || labels.has(label)) {
      valid = false;
    }
    hrefs.add(href);
    labels.add(label);
    inspected.push({ href, label });
  }

  if (!valid || inspected.length !== items.length) {
    issues.push(createValidationIssue('navigation.model.invalid', NAVIGATION_MODEL_PATH));
    return undefined;
  }

  return inspected;
}

/** The approved model a state list was built from. */
type NavigationModel = 'primary' | 'profile';

function resolveApprovedModel(items: readonly NavigationItem[]): NavigationModel | undefined {
  if (sameNavigationModel(items, PRIMARY_NAVIGATION)) {
    return 'primary';
  }

  if (sameNavigationModel(items, PROFILE_LOCAL_NAVIGATION)) {
    return 'profile';
  }

  return undefined;
}

function sameNavigationModel(
  actual: readonly NavigationItem[],
  expected: readonly NavigationItem[]
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (item, index) => item.href === expected[index]?.href && item.label === expected[index]?.label
    )
  );
}

function normalizePathname(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  return normalizeNavigationHref(pathname);
}

function normalizeNavigationHref(value: string): string | undefined {
  if (
    value.length === 0 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('//') ||
    value.includes('\\') ||
    CONTROL_OR_WHITESPACE_PATTERN.test(value) ||
    INVALID_PERCENT_ESCAPE_PATTERN.test(value)
  ) {
    return undefined;
  }

  const normalized = value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;

  for (const segment of normalized.split('/')) {
    if (segment.length === 0) {
      continue;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return undefined;
    }

    if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) {
      return undefined;
    }
  }

  return normalized;
}

/**
 * The marker of one path against one href (BR1.2): the exact route is the
 * page itself, a descendant path belongs to that route's section, and every
 * other path belongs to neither. The home route has no descendants.
 */
function markerForPath(normalizedPathname: string, href: string): NavigationMarker {
  if (normalizedPathname === href) {
    return 'page';
  }

  if (href !== '/' && normalizedPathname.startsWith(`${href}/`)) {
    return 'section';
  }

  return null;
}

/** The rendered attribute value of a marker (BR1.3). */
function ariaCurrentForMarker(marker: NavigationMarker): NavigationAriaCurrent {
  if (marker === 'page') {
    return 'page';
  }

  if (marker === 'section') {
    return 'true';
  }

  return null;
}

function buildNavigationState(
  item: NavigationItem,
  normalizedPathname: string,
  model: NavigationModel
): NavigationState {
  const marker = markerForPath(normalizedPathname, item.href);

  if (model === 'primary') {
    return {
      href: item.href,
      label: item.label,
      current: marker !== null,
      ariaCurrent: ariaCurrentForMarker(marker),
    };
  }

  // The profile local view keeps its own 'page' marker for the current route
  // family (BR1.5); the section vocabulary belongs to the primary model.
  return {
    href: item.href,
    label: item.label,
    current: marker !== null,
    ariaCurrent: marker === null ? null : 'page',
  };
}

function freezeNavigationModel(items: readonly NavigationItem[]): readonly NavigationItem[] {
  return Object.freeze(
    items.map((item) =>
      Object.freeze({
        href: item.href,
        label: item.label,
      })
    )
  );
}

function freezeNavigationStates(states: readonly NavigationState[]): readonly NavigationState[] {
  return Object.freeze(
    states.map((state) =>
      Object.freeze({
        href: state.href,
        label: state.label,
        current: state.current,
        ariaCurrent: state.ariaCurrent,
      })
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

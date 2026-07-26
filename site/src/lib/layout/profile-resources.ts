import { createValidationIssue } from '../profile/issues.js';
import type {
  NonEmptyReadonlyArray,
  ValidationIssue,
  ValidationResult,
} from '../profile/types.js';

export type ManagedHeadResource =
  | Readonly<{
      id: 'jsdelivr-preconnect';
      rel: 'preconnect';
      href: 'https://cdn.jsdelivr.net';
      crossorigin: '';
    }>
  | Readonly<{
      id: 'legacy-pretendard';
      rel: 'stylesheet';
      href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
      crossorigin: '';
    }>
  | Readonly<{
      id: 'legacy-katex';
      rel: 'stylesheet';
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
      crossorigin: 'anonymous';
    }>;

export interface LegacyRouteResourcePolicy {
  readonly category: 'legacy';
  readonly fontSource: 'legacy-cdn-pretendard';
  readonly headResources: readonly ManagedHeadResource[];
}

export interface ProfileRouteResourcePolicy {
  readonly category: 'profile';
  readonly fontSource: 'local-profile-font';
  readonly headResources: readonly [];
}

export type RouteResourcePolicy =
  | LegacyRouteResourcePolicy
  | ProfileRouteResourcePolicy;

const RESOURCE_ISSUE_PATH = 'profile.metadata.resources';
const INVALID_PATHNAME_PATTERN = /[\u0000-\u0020\u007f\\?#]/;
const INVALID_DECODED_PATHNAME_PATTERN = /[\u0000-\u001f\u007f\\]/;

export const LEGACY_BASE_LAYOUT_RESOURCES = Object.freeze([
  Object.freeze({
    id: 'jsdelivr-preconnect',
    rel: 'preconnect',
    href: 'https://cdn.jsdelivr.net',
    crossorigin: '',
  }),
  Object.freeze({
    id: 'legacy-pretendard',
    rel: 'stylesheet',
    href:
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    crossorigin: '',
  }),
  Object.freeze({
    id: 'legacy-katex',
    rel: 'stylesheet',
    href: 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css',
    crossorigin: 'anonymous',
  }),
]) as readonly ManagedHeadResource[];

export const LEGACY_ROUTE_RESOURCE_POLICY = Object.freeze({
  category: 'legacy',
  fontSource: 'legacy-cdn-pretendard',
  headResources: LEGACY_BASE_LAYOUT_RESOURCES,
}) satisfies LegacyRouteResourcePolicy;

export const PROFILE_ROUTE_RESOURCE_POLICY = Object.freeze({
  category: 'profile',
  fontSource: 'local-profile-font',
  headResources: Object.freeze([]) as readonly [],
}) satisfies ProfileRouteResourcePolicy;

/**
 * Exact profile paths select the local profile font policy. Every other valid
 * pathname retains the current BaseLayout resource set unchanged.
 */
export function resolveRouteResourcePolicy(
  pathname: string,
): ValidationResult<RouteResourcePolicy> {
  if (!isValidPathname(pathname)) {
    return resourceFailure();
  }

  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return success(
    normalized === '/resume' || normalized === '/portfolio'
      ? PROFILE_ROUTE_RESOURCE_POLICY
      : LEGACY_ROUTE_RESOURCE_POLICY,
  );
}

/**
 * Revalidates policy-shaped input at the BaseLayout boundary and returns only
 * the canonical immutable policy. Unknown, mixed or extended resource sets
 * fail closed.
 */
export function validateRouteResourcePolicy(
  pathname: string,
  candidate: unknown,
): ValidationResult<RouteResourcePolicy> {
  try {
    const resolved = resolveRouteResourcePolicy(pathname);
    if (!resolved.ok) {
      return resolved;
    }

    if (
      !isPlainObject(candidate) ||
      !hasExactEnumerableDataKeys(candidate, [
        'category',
        'fontSource',
        'headResources',
      ])
    ) {
      return resourceFailure();
    }

    const category = enumerableDataValue(candidate, 'category');
    const fontSource = enumerableDataValue(candidate, 'fontSource');
    const headResources = enumerableDataValue(candidate, 'headResources');

    if (resolved.value.category === 'profile') {
      return fontSource === 'local-profile-font' &&
        category === 'profile' &&
        hasExactArrayShape(headResources, 0)
        ? success(PROFILE_ROUTE_RESOURCE_POLICY)
        : resourceFailure();
    }

    if (resolved.value.category === 'legacy') {
      return fontSource === 'legacy-cdn-pretendard' &&
        category === 'legacy' &&
        hasExactLegacyResources(headResources)
        ? success(LEGACY_ROUTE_RESOURCE_POLICY)
        : resourceFailure();
    }

    return resourceFailure();
  } catch {
    return resourceFailure();
  }
}

function hasExactLegacyResources(value: unknown): boolean {
  if (
    !hasExactArrayShape(value, LEGACY_BASE_LAYOUT_RESOURCES.length)
  ) {
    return false;
  }

  for (
    let index = 0;
    index < LEGACY_BASE_LAYOUT_RESOURCES.length;
    index += 1
  ) {
    const resource = enumerableDataValue(value, String(index));
    if (
      !isPlainObject(resource) ||
      !hasExactEnumerableDataKeys(resource, [
        'id',
        'rel',
        'href',
        'crossorigin',
      ])
    ) {
      return false;
    }
    const expected = LEGACY_BASE_LAYOUT_RESOURCES[index];
    if (
      enumerableDataValue(resource, 'id') === expected.id &&
      enumerableDataValue(resource, 'rel') === expected.rel &&
      enumerableDataValue(resource, 'href') === expected.href &&
      enumerableDataValue(resource, 'crossorigin') === expected.crossorigin
    ) {
      continue;
    }
    return false;
  }
  return true;
}

function isValidPathname(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.includes('//') ||
    INVALID_PATHNAME_PATTERN.test(value) ||
    !hasValidPercentEncoding(value) ||
    /%(?:2f|5c)/i.test(value) ||
    hasDotSegment(value)
  ) {
    return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  return (
    !decoded.includes('//') &&
    !decoded.includes('\\') &&
    !INVALID_DECODED_PATHNAME_PATTERN.test(decoded) &&
    !hasDotSegment(decoded) &&
    !/%(?:2f|5c)/i.test(decoded)
  );
}

function hasValidPercentEncoding(value: string): boolean {
  for (
    let index = value.indexOf('%');
    index >= 0;
    index = value.indexOf('%', index + 1)
  ) {
    if (!/^[0-9A-Fa-f]{2}$/.test(value.slice(index + 1, index + 3))) {
      return false;
    }
  }
  return true;
}

function hasDotSegment(value: string): boolean {
  return value
    .split('/')
    .some((segment) => segment === '.' || segment === '..');
}

function hasExactArrayShape(
  value: unknown,
  expectedLength: number,
): value is readonly unknown[] {
  if (!Array.isArray(value)) {
    return false;
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined ||
    !('value' in lengthDescriptor) ||
    lengthDescriptor.value !== expectedLength
  ) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedLength + 1 || !keys.includes('length')) {
    return false;
  }
  for (let index = 0; index < expectedLength; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !keys.includes(key) ||
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !('value' in descriptor)
    ) {
      return false;
    }
  }
  return true;
}

function hasExactEnumerableDataKeys(
  value: object,
  expected: readonly string[],
): boolean {
  const actual = Reflect.ownKeys(value).sort(comparePropertyKeys);
  const canonicalExpected = [...expected].sort(compareAscii);
  return (
    actual.length === canonicalExpected.length &&
    actual.every((key, index) => key === canonicalExpected[index]) &&
    canonicalExpected.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor !== undefined &&
        descriptor.enumerable === true &&
        'value' in descriptor
      );
    })
  );
}

function enumerableDataValue(
  owner: object,
  key: PropertyKey,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(owner, key);
  return descriptor !== undefined &&
    descriptor.enumerable === true &&
    'value' in descriptor
    ? descriptor.value
    : undefined;
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function compareAscii(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function comparePropertyKeys(
  left: PropertyKey,
  right: PropertyKey,
): number {
  if (typeof left !== 'string') {
    return typeof right === 'string' ? 1 : 0;
  }
  if (typeof right !== 'string') {
    return -1;
  }
  return compareAscii(left, right);
}

function success<Value>(value: Value): ValidationResult<Value> {
  return Object.freeze({ ok: true, value });
}

function resourceFailure<Value>(): ValidationResult<Value> {
  const issue = createValidationIssue(
    'metadata.route.invalid',
    RESOURCE_ISSUE_PATH,
  );
  return Object.freeze({
    ok: false,
    issues: Object.freeze([issue]) as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

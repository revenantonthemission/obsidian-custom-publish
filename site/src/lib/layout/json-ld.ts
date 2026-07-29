import { createValidationIssue } from '../profile/issues.js';
import type { JsonLdDocument } from '../profile/metadata.js';
import type {
  NonEmptyReadonlyArray,
  ValidationIssue,
  ValidationResult,
} from '../profile/types.js';

export interface JsonLdScriptPayload {
  readonly type: 'application/ld+json';
  readonly payload: string;
}

export type JsonLdScriptHost =
  | NonEmptyReadonlyArray<JsonLdScriptPayload>
  | null;

const JSON_LD_ISSUE_PATH = 'profile.metadata.structuredData';
const SCRIPT_UNSAFE_PATTERN = /[<>&\u2028\u2029]/;
const SCRIPT_ESCAPE = new Map<string, string>([
  ['<', '\\u003c'],
  ['>', '\\u003e'],
  ['&', '\\u0026'],
  ['\u2028', '\\u2028'],
  ['\u2029', '\\u2029'],
]);

/**
 * Converts each typed JSON-LD document into one inert script payload while
 * preserving document order. An absent or empty collection has no host.
 */
export function serializeJsonLdDocuments(
  documents: readonly JsonLdDocument[] | null | undefined,
): ValidationResult<JsonLdScriptHost> {
  if (documents === null || documents === undefined) {
    return success(null);
  }

  try {
    const documentValues = exactArrayDataValues(documents);
    if (documentValues === null) {
      return serializationFailure();
    }
    if (documentValues.length === 0) {
      return success(null);
    }

    const snapshots: JsonLdDocument[] = [];
    const payloads: JsonLdScriptPayload[] = [];
    for (const documentValue of documentValues) {
      const document = snapshotJsonLdDocument(documentValue);
      if (document === null) {
        return serializationFailure();
      }
      snapshots.push(document);

      const serialized = JSON.stringify(document.payload);
      if (typeof serialized !== 'string') {
        return serializationFailure();
      }

      payloads.push(
        Object.freeze({
          type: 'application/ld+json',
          payload: escapeForScript(serialized),
        }),
      );
    }

    const host = Object.freeze(
      payloads,
    ) as NonEmptyReadonlyArray<JsonLdScriptPayload>;
    const roundTrip = verifyJsonLdRoundTrip(
      Object.freeze(snapshots),
      host,
    );
    return roundTrip.ok ? success(host) : roundTrip;
  } catch {
    return serializationFailure();
  }
}

/**
 * Extracts and parses an already hosted payload collection. This is the pure
 * extraction seam used by BaseLayout contract tests.
 */
export function extractJsonLdDocuments(
  host: JsonLdScriptHost,
): ValidationResult<readonly JsonLdDocument[]> {
  if (host === null) {
    return success(Object.freeze([]));
  }

  try {
    const scriptValues = exactArrayDataValues(host);
    if (scriptValues === null || scriptValues.length === 0) {
      return serializationFailure();
    }

    const documents: JsonLdDocument[] = [];
    for (const candidate of scriptValues) {
      const script = snapshotScriptPayload(candidate);
      if (script === null) {
        return serializationFailure();
      }
      if (SCRIPT_UNSAFE_PATTERN.test(script.payload)) {
        return serializationFailure();
      }

      const parsed: unknown = JSON.parse(script.payload);
      const payload = snapshotJsonObject(
        parsed,
        new WeakSet<object>(),
      );
      if (payload === null) {
        return serializationFailure();
      }
      const schemaType = enumerableDataValue(payload, '@type');
      if (!isJsonLdSchemaType(schemaType)) {
        return serializationFailure();
      }
      documents.push(
        Object.freeze({
          schemaType,
          payload,
        }) as JsonLdDocument,
      );
    }

    return success(Object.freeze(documents));
  } catch {
    return serializationFailure();
  }
}

/**
 * Verifies serialize → host extraction → parse as ordered structural equality.
 */
export function verifyJsonLdRoundTrip(
  expected: readonly JsonLdDocument[] | null | undefined,
  host: JsonLdScriptHost,
): ValidationResult<readonly JsonLdDocument[]> {
  try {
    if (expected === null || expected === undefined) {
      return host === null
        ? success(Object.freeze([]))
        : serializationFailure();
    }
    const expectedValues = exactArrayDataValues(expected);
    if (expectedValues === null) {
      return serializationFailure();
    }
    if (expectedValues.length === 0) {
      return host === null
        ? success(Object.freeze([]))
        : serializationFailure();
    }

    const snapshots: JsonLdDocument[] = [];
    for (const expectedValue of expectedValues) {
      const snapshot = snapshotJsonLdDocument(expectedValue);
      if (snapshot === null) {
        return serializationFailure();
      }
      snapshots.push(snapshot);
    }

    const extracted = extractJsonLdDocuments(host);
    if (!extracted.ok) {
      return extracted;
    }
    if (
      extracted.value.length !== snapshots.length ||
      !snapshots.every((document, index) =>
        jsonValuesEqual(document, extracted.value[index]),
      )
    ) {
      return serializationFailure();
    }

    return extracted;
  } catch {
    return serializationFailure();
  }
}

function escapeForScript(serialized: string): string {
  return serialized.replace(
    /[<>&\u2028\u2029]/g,
    (character) => SCRIPT_ESCAPE.get(character) as string,
  );
}

function snapshotJsonLdDocument(
  value: unknown,
): JsonLdDocument | null {
  if (!isPlainJsonObject(value)) {
    return null;
  }
  const keys = Reflect.ownKeys(value).sort(comparePropertyKeys);
  const payload = enumerableDataValue(value, 'payload');
  const schemaType = enumerableDataValue(value, 'schemaType');
  if (
    keys.length !== 2 ||
    keys[0] !== 'payload' ||
    keys[1] !== 'schemaType' ||
    !isJsonLdSchemaType(schemaType)
  ) {
    return null;
  }

  const payloadSnapshot = snapshotJsonObject(
    payload,
    new WeakSet<object>(),
  );
  if (
    payloadSnapshot === null ||
    enumerableDataValue(payloadSnapshot, '@type') !== schemaType
  ) {
    return null;
  }

  return Object.freeze({
    schemaType,
    payload: payloadSnapshot,
  }) as JsonLdDocument;
}

function isJsonLdSchemaType(
  value: unknown,
): value is JsonLdDocument['schemaType'] {
  return (
    value === 'ProfilePage' ||
    value === 'Person' ||
    value === 'CollectionPage' ||
    value === 'ItemList'
  );
}

function snapshotJsonValue(
  value: unknown,
  ancestors: WeakSet<object>,
): JsonLdDocument['payload'][string] | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && !Object.is(value, -0)
      ? value
      : undefined;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  if (ancestors.has(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    ancestors.add(value);
    try {
      const values = exactArrayDataValues(value);
      if (values === null) {
        return undefined;
      }

      const snapshot: JsonLdDocument['payload'][string][] = [];
      for (const item of values) {
        const itemSnapshot = snapshotJsonValue(item, ancestors);
        if (itemSnapshot === undefined) {
          return undefined;
        }
        snapshot.push(itemSnapshot);
      }
      return Object.freeze(snapshot);
    } finally {
      ancestors.delete(value);
    }
  }

  return snapshotJsonObject(value, ancestors) ?? undefined;
}

function snapshotJsonObject(
  value: unknown,
  ancestors: WeakSet<object>,
): JsonLdDocument['payload'] | null {
  if (!isPlainJsonObject(value) || ancestors.has(value)) {
    return null;
  }

  ancestors.add(value);
  try {
    const snapshot = Object.create(null) as Record<
      string,
      JsonLdDocument['payload'][string]
    >;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === 'symbol') {
        return null;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !('value' in descriptor)
      ) {
        return null;
      }
      const child = snapshotJsonValue(descriptor.value, ancestors);
      if (child === undefined) {
        return null;
      }
      Object.defineProperty(snapshot, key, {
        configurable: false,
        enumerable: true,
        value: child,
        writable: false,
      });
    }
    return Object.freeze(snapshot);
  } finally {
    ancestors.delete(value);
  }
}

function exactArrayDataValues(
  value: unknown,
): readonly unknown[] | null {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return null;
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(
    value,
    'length',
  );
  if (
    lengthDescriptor === undefined ||
    !('value' in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    return null;
  }
  const length = lengthDescriptor.value as number;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    !keys.includes('length') ||
    keys.some((key) => typeof key === 'symbol')
  ) {
    return null;
  }

  const values: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !keys.includes(key) ||
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !('value' in descriptor)
    ) {
      return null;
    }
    values.push(descriptor.value);
  }
  return Object.freeze(values);
}

function isPlainJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotScriptPayload(
  value: unknown,
): JsonLdScriptPayload | null {
  if (!isPlainJsonObject(value)) {
    return null;
  }
  const keys = Reflect.ownKeys(value).sort(comparePropertyKeys);
  const payload = enumerableDataValue(value, 'payload');
  const type = enumerableDataValue(value, 'type');
  if (
    keys.length !== 2 ||
    keys[0] !== 'payload' ||
    keys[1] !== 'type' ||
    type !== 'application/ld+json' ||
    typeof payload !== 'string'
  ) {
    return null;
  }
  return Object.freeze({ type, payload });
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

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => jsonValuesEqual(item, right[index]))
    );
  }

  const leftKeys = Object.keys(left).sort(compareAscii);
  const rightKeys = Object.keys(right).sort(compareAscii);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        jsonValuesEqual(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
        ),
    )
  );
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

function serializationFailure<Value>(): ValidationResult<Value> {
  const issue = createValidationIssue(
    'jsonld.serialization',
    JSON_LD_ISSUE_PATH,
  );
  return Object.freeze({
    ok: false,
    issues: Object.freeze([issue]) as NonEmptyReadonlyArray<ValidationIssue>,
  });
}

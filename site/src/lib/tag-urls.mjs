// The one owner of every tag and graph address, old and new (U3 BR2.1, BR2.2;
// frontend-components.md "Address module"). A dependency-free ES module, so the
// TypeScript site code and the plain-Node build step (the redirect-table
// writer) import the same rule and the pages and the table cannot drift apart.
//
// Two forms of one address:
// - decoded (`tagPath`, `legacyTagPath`, ...): what the redirect table stores;
// - encoded (`tagHref`): what goes into markup, each segment encoded once.

const TAG_INDEX_PATH = '/writing/tags';
const GRAPH_PATH = '/writing/graph';
const LEGACY_TAG_INDEX_PATH = '/tags';
const LEGACY_GRAPH_PATH = '/graph';

/**
 * The tag key: `/` and whitespace runs become `-`, the name is lower-cased.
 * The rule the tag index has always been keyed by (BR2.1); idempotent, so a
 * key passes through unchanged. Dots are kept (`node.js`), which BR3.6 serves.
 */
export function sanitizeTag(tag) {
  return tag.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
}

/**
 * The key of one tag, refused with TAG001 when it cannot be one path segment:
 * empty, or a dot segment that would walk out of the tag directory (G5).
 */
function tagKey(tag) {
  const key = sanitizeTag(tag);
  if (key === '' || key === '.' || key === '..') {
    const error = new Error(
      `TAG001 ${JSON.stringify(tag)}: a tag key must be a non-empty path segment`
    );
    error.code = 'TAG001';
    throw error;
  }
  return key;
}

/** Each segment percent-encoded exactly once; the separators stay (BR2.2). */
export function encodePath(decodedPath) {
  return decodedPath.split('/').map(encodeURIComponent).join('/');
}

/** `/writing/tags`: the tag index (BR1.1). */
export function tagIndexPath() {
  return TAG_INDEX_PATH;
}

/** `/writing/graph`: the graph page (BR1.1). */
export function graphPath() {
  return GRAPH_PATH;
}

/** `/tags`: the old tag index, now a redirect (BR3.1). */
export function legacyTagIndexPath() {
  return LEGACY_TAG_INDEX_PATH;
}

/** `/graph`: the old graph page, now a redirect (BR3.1). */
export function legacyGraphPath() {
  return LEGACY_GRAPH_PATH;
}

/** `/writing/tags/<key>`, decoded. */
export function tagPath(tag) {
  return `${TAG_INDEX_PATH}/${tagKey(tag)}`;
}

/** `/writing/tags/<key>`, each segment encoded once: the form markup uses. */
export function tagHref(tag) {
  return encodePath(tagPath(tag));
}

/** `/tags/<key>`, decoded: the old address the redirect table names. */
export function legacyTagPath(tag) {
  return `${LEGACY_TAG_INDEX_PATH}/${tagKey(tag)}`;
}

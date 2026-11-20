/** The tag key the tag index is keyed by (BR2.1). */
export function sanitizeTag(tag: string): string;
/** Each segment percent-encoded exactly once (BR2.2). */
export function encodePath(decodedPath: string): string;
export function tagIndexPath(): '/writing/tags';
export function graphPath(): '/writing/graph';
export function legacyTagIndexPath(): '/tags';
export function legacyGraphPath(): '/graph';
/** Decoded `/writing/tags/<key>`; throws TAG001 for an empty or dot-segment key. */
export function tagPath(tag: string): string;
/** Encoded `/writing/tags/<key>`; throws TAG001 for an empty or dot-segment key. */
export function tagHref(tag: string): string;
/** Decoded `/tags/<key>`; throws TAG001 for an empty or dot-segment key. */
export function legacyTagPath(tag: string): string;

// Image sizes read at build time (NFR2; loop-back 1, code-generation plan Step 40).
// An <img> that carries width and height lets the browser reserve the image's
// box before the file arrives, so a late diagram no longer pushes the text
// below it down (CLS). The sizes come from the files themselves: the root
// element of an SVG, and the header of a PNG, GIF, JPEG or WebP. Each format
// keeps its size in a few fixed bytes, so no dependency is needed.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

const ASSET_PREFIX = '/assets/';

/**
 * The size of the file an `/assets/…` image source names, or null. A source
 * outside the assets folder, a missing or unreadable file and an unknown
 * format all give null, and the image keeps its unsized markup. That fallback
 * is deliberate: the preprocessor already reports a missing attachment, and
 * `just crossunit`'s link sweep reports the broken image link.
 */
export function assetImageSize(assetsDir: string, src: string): ImageSize | null {
  if (!src.startsWith(ASSET_PREFIX)) return null;
  const pathname = src.slice(ASSET_PREFIX.length).split(/[?#]/, 1)[0] ?? '';
  const root = path.resolve(assetsDir);
  const file = path.resolve(root, decodePath(pathname));
  if (!file.startsWith(root + path.sep)) return null;
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(file);
  } catch {
    // Missing (ENOENT), a folder (EISDIR) or unreadable: no size, as above.
    return null;
  }
  return imageSize(bytes);
}

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/** The displayed size of an image from its bytes, or null when the format or size is unknown. */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  return pngSize(bytes) ?? gifSize(bytes) ?? jpegSize(bytes) ?? webpSize(bytes) ?? svgSize(bytes);
}

function sizeOf(width: number, height: number): ImageSize | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return Object.freeze({
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  });
}

/* ── Byte readers (callers check the length first) ── */

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at]! << 8) | bytes[at + 1]!;
}

function u16le(bytes: Uint8Array, at: number): number {
  return bytes[at]! | (bytes[at + 1]! << 8);
}

function u24le(bytes: Uint8Array, at: number): number {
  return bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
}

function u32be(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0
  );
}

function u32le(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16) | (bytes[at + 3]! << 24)) >>> 0
  );
}

/* ── PNG: the IHDR chunk follows the 8-byte signature ── */

const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 24 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null;
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  return sizeOf(u32be(bytes, 16), u32be(bytes, 20));
}

/* ── GIF: the logical screen size follows the signature ── */

function gifSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 10) return null;
  const signature = ascii(bytes, 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;
  return sizeOf(u16le(bytes, 6), u16le(bytes, 8));
}

/* ── JPEG: the start-of-frame segment holds the size ── */

// SOF0–SOF15, except DHT (0xC4), JPG (0xC8) and DAC (0xCC), which share the range.
const JPEG_FRAME_MARKERS: ReadonlySet<number> = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
// EXIF orientations 5–8 store the picture turned a quarter; browsers display
// it upright (image-orientation: from-image), so its width and height swap.
const QUARTER_TURNS: ReadonlySet<number> = new Set([5, 6, 7, 8]);

function jpegSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let orientation = 1;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset += 1; // a fill byte before the marker
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // the image or its scan began with no frame header
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2; // a marker without a length
      continue;
    }
    const end = offset + 2 + u16be(bytes, offset + 2);
    if (end > bytes.length || end < offset + 4) return null;
    if (marker === 0xe1) orientation = exifOrientation(bytes, offset + 4, end) ?? orientation;
    if (JPEG_FRAME_MARKERS.has(marker)) {
      if (end < offset + 9) return null;
      const height = u16be(bytes, offset + 5);
      const width = u16be(bytes, offset + 7);
      return QUARTER_TURNS.has(orientation) ? sizeOf(height, width) : sizeOf(width, height);
    }
    offset = end;
  }
  return null;
}

/** The Orientation tag of an APP1 EXIF payload in [start, end), or null. */
function exifOrientation(bytes: Uint8Array, start: number, end: number): number | null {
  if (end - start < 14 || ascii(bytes, start, 6) !== 'Exif\0\0') return null;
  const tiff = start + 6;
  const order = ascii(bytes, tiff, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const read16 = (at: number) => (order === 'II' ? u16le(bytes, at) : u16be(bytes, at));
  const read32 = (at: number) => (order === 'II' ? u32le(bytes, at) : u32be(bytes, at));
  if (read16(tiff + 2) !== 42) return null;
  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > end) return null;
  const count = read16(ifd);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return null;
    if (read16(entry) === 0x0112) return read16(entry + 8);
  }
  return null;
}

/* ── WebP: a RIFF file whose first chunk is VP8, VP8L or VP8X ── */

function webpSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8 ' && bytes.length >= 30 && u24le(bytes, 23) === 0x2a019d) {
    return sizeOf(u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff);
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = u32le(bytes, 21);
    return sizeOf((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return sizeOf(u24le(bytes, 24) + 1, u24le(bytes, 27) + 1);
  }
  return null;
}

/* ── SVG: the root element's width and height, else its viewBox ── */

const COMMENT_RE = /<!--[\s\S]*?-->/g;
// The root start tag, with attribute values matched whole (a value may hold ">").
const SVG_ROOT_RE = /<svg\b((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/i;
const ATTRIBUTE_RE = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
const LENGTH_RE = /^\+?((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|pt|pc|in|cm|mm)?$/i;
// CSS absolute units in CSS pixels; percentages, em and ex depend on where the
// image is drawn, so they give no size of their own.
const PX_PER_UNIT: Readonly<Record<string, number>> = Object.freeze({
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
});

function svgSize(bytes: Uint8Array): ImageSize | null {
  const root = SVG_ROOT_RE.exec(new TextDecoder().decode(bytes).replace(COMMENT_RE, ''));
  if (!root) return null;
  const attributes = parseAttributes(root[1] ?? '');
  const width = absoluteLength(attributes.get('width'));
  const height = absoluteLength(attributes.get('height'));
  if (width !== null && height !== null) return sizeOf(width, height);
  const box = viewBoxSize(attributes.get('viewbox'));
  if (box === null) return null;
  // One absolute side: the other follows the viewBox ratio, as browsers size it.
  if (width !== null) return sizeOf(width, (width * box.height) / box.width);
  if (height !== null) return sizeOf((height * box.width) / box.height, height);
  return sizeOf(box.width, box.height);
}

function parseAttributes(source: string): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE_RE)) {
    const name = match[1]!.toLowerCase();
    if (!attributes.has(name)) attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function absoluteLength(value: string | undefined): number | null {
  const match = value === undefined ? null : LENGTH_RE.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * PX_PER_UNIT[(match[2] ?? 'px').toLowerCase()]!;
}

function viewBoxSize(value: string | undefined): ImageSize | null {
  if (value === undefined) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [, , width, height] = parts as [number, number, number, number];
  return width > 0 && height > 0 ? { width, height } : null;
}

// NFR2 (loop-back 1, code-generation plan Step 39): post images carry their
// own width and height, read at build time from the files under content/assets,
// so the browser reserves their space before they load (CLS). The first image
// of a document, or its first light/dark diagram pair, loads eagerly because
// it is the likeliest Largest Contentful Paint; every later image stays lazy.
// The SVG roots below are the shapes the fixture build writes for D2 and
// Mermaid; the raster files are minimal headers, which is all a size reader
// needs to read.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { renderMarkdown } from '../../src/lib/render.js';

let root: string;
let assetsDir: string;

function u16be(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u24le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
}

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function ascii(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0));
}

function png(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32be(13),
    ...ascii('IHDR'),
    ...u32be(width),
    ...u32be(height),
    8,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}

function gif(width: number, height: number): Uint8Array {
  return Uint8Array.from([...ascii('GIF89a'), ...u16le(width), ...u16le(height), 0, 0, 0, 0x3b]);
}

function jpegSegment(marker: number, payload: readonly number[]): number[] {
  return [0xff, marker, ...u16be(payload.length + 2), ...payload];
}

/** A JPEG with a JFIF header, an optional EXIF orientation and a start-of-frame segment. */
function jpeg(
  width: number,
  height: number,
  options: { readonly sofMarker?: number; readonly orientation?: number } = {}
): Uint8Array {
  const segments = [...jpegSegment(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])];
  if (options.orientation !== undefined) {
    // Big-endian TIFF header, then IFD0 with one entry: Orientation (0x0112), SHORT, 1.
    const tiff = [
      ...ascii('MM'),
      ...u16be(42),
      ...u32be(8),
      ...u16be(1),
      ...u16be(0x0112),
      ...u16be(3),
      ...u32be(1),
      ...u16be(options.orientation),
      0,
      0,
      ...u32be(0),
    ];
    segments.push(...jpegSegment(0xe1, [...ascii('Exif'), 0, 0, ...tiff]));
  }
  segments.push(
    ...jpegSegment(options.sofMarker ?? 0xc0, [8, ...u16be(height), ...u16be(width), 1, 1, 0x11, 0])
  );
  return Uint8Array.from([0xff, 0xd8, ...segments, 0xff, 0xd9]);
}

function webp(chunk: string, payload: readonly number[]): Uint8Array {
  const body = [...ascii('WEBP'), ...ascii(chunk), ...u32le(payload.length), ...payload];
  return Uint8Array.from([...ascii('RIFF'), ...u32le(body.length), ...body]);
}

function webpLossy(width: number, height: number): Uint8Array {
  return webp('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, ...u16le(width), ...u16le(height), 0, 0]);
}

function webpLossless(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  return webp('VP8L', [0x2f, ...u32le(bits), 0]);
}

function webpExtended(width: number, height: number): Uint8Array {
  return webp('VP8X', [0, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]);
}

const SVG_FILES: Readonly<Record<string, string>> = {
  // D2: the root has only a viewBox; the nested svg is not the image's size.
  'd2-light.svg':
    '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" data-d2-version="v0.9.0" preserveAspectRatio="xMinYMin meet" viewBox="0 0 803 274"><svg class="d2-481560411 d2-svg" width="803" height="274" viewBox="-101 -86 803 274"><rect x="-101" y="-86" width="803" height="274" /></svg></svg>',
  // Mermaid: a percentage width, which gives no size; the viewBox does.
  'mermaid-light.svg':
    '<svg id="my-svg" width="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="flowchart" style="max-width: 409.828px; background-color: transparent;" viewBox="0 0 409.828125 70" role="graphics-document document" aria-roledescription="flowchart-v2"><g></g></svg>',
  'nested.svg':
    '<!-- <svg width="1" height="1"> --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><svg width="10" height="10"></svg></svg>',
  'sized.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 1280 720"></svg>',
  'points.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" width="300pt" height="150pt" viewBox="0 0 300 150"></svg>',
  'width-only.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2" width="500px" viewBox="0 0 1000 400"></svg>',
  'no-size.svg': '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" /></svg>',
};

const RASTER_FILES: Readonly<Record<string, Uint8Array>> = {
  'photo.png': png(640, 480),
  'second.png': png(320, 240),
  'third.png': png(160, 120),
  'wide.png': png(600, 400),
  'icon.gif': gif(32, 16),
  'baseline.jpg': jpeg(1200, 800),
  'progressive.jpeg': jpeg(300, 200, { sofMarker: 0xc2 }),
  'portrait.jpg': jpeg(4032, 3024, { orientation: 6 }),
  'upright.jpg': jpeg(4032, 3024, { orientation: 1 }),
  'lossy.webp': webpLossy(400, 300),
  'lossless.webp': webpLossless(123, 45),
  'extended.webp': webpExtended(1920, 1080),
  'broken.png': Uint8Array.from(ascii('this is not an image')),
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'render-images-'));
  assetsDir = join(root, 'assets');
  mkdirSync(assetsDir);
  mkdirSync(join(assetsDir, 'folder.png'));
  for (const [name, text] of Object.entries(SVG_FILES)) writeFileSync(join(assetsDir, name), text);
  for (const [name, bytes] of Object.entries(RASTER_FILES))
    writeFileSync(join(assetsDir, name), bytes);
  // A real image next to, not inside, the assets folder.
  writeFileSync(join(root, 'outside.png'), png(50, 50));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface ImageTag {
  readonly src: string | null;
  attribute(name: string): string | null;
}

/** Every rendered img element, in document order, with an attribute reader. */
function images(html: string): ImageTag[] {
  return [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => {
    const attribute = (name: string): string | null => {
      const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
      return match ? match[1]! : null;
    };
    return { src: attribute('src'), attribute };
  });
}

function imageMarkup(...sources: readonly string[]): string {
  return sources.map((source) => `<img src="${source}" alt="" />`).join('\n\n') + '\n';
}

async function sizesOf(...sources: readonly string[]): Promise<(string | null)[][]> {
  const html = await renderMarkdown(imageMarkup(...sources), { assetsDir });
  return images(html).map((image) => [image.attribute('width'), image.attribute('height')]);
}

describe('post image sizes (NFR2: space reserved before the image loads)', () => {
  test('sizes an SVG from its root width and height, in CSS pixels', async () => {
    expect(
      await sizesOf('/assets/sized.svg', '/assets/points.svg', '/assets/width-only.svg')
    ).toEqual([
      ['640', '360'],
      // 300pt × 150pt is 400 × 200 CSS px.
      ['400', '200'],
      // An absolute width with a viewBox: the height follows the viewBox ratio.
      ['500', '200'],
    ]);
  });

  test('sizes D2 and Mermaid diagrams, whose roots give no absolute size, from the root viewBox', async () => {
    expect(
      await sizesOf('/assets/d2-light.svg', '/assets/mermaid-light.svg', '/assets/nested.svg')
    ).toEqual([
      ['803', '274'],
      ['410', '70'],
      ['400', '100'],
    ]);
  });

  test('sizes PNG, GIF, JPEG and WebP images from their file headers', async () => {
    expect(
      await sizesOf(
        '/assets/photo.png',
        '/assets/icon.gif',
        '/assets/baseline.jpg',
        '/assets/progressive.jpeg',
        '/assets/lossy.webp',
        '/assets/lossless.webp',
        '/assets/extended.webp'
      )
    ).toEqual([
      ['640', '480'],
      ['32', '16'],
      ['1200', '800'],
      ['300', '200'],
      ['400', '300'],
      ['123', '45'],
      ['1920', '1080'],
    ]);
  });

  test('swaps a JPEG’s width and height when its EXIF orientation turns it a quarter turn', async () => {
    expect(await sizesOf('/assets/portrait.jpg', '/assets/upright.jpg')).toEqual([
      ['3024', '4032'],
      ['4032', '3024'],
    ]);
  });

  test('keeps a width the note set and adds the matching height; keeps both when both are set', async () => {
    const markdown = [
      '<img src="/assets/wide.png" alt="" width="300" />',
      '',
      '<img src="/assets/wide.png" alt="" width="300" height="100" />',
      '',
    ].join('\n');
    const html = await renderMarkdown(markdown, { assetsDir });
    expect(
      images(html).map((image) => [image.attribute('width'), image.attribute('height')])
    ).toEqual([
      ['300', '200'],
      ['300', '100'],
    ]);
  });

  test('leaves a missing, unreadable, sizeless, outside or remote image unsized, without throwing', async () => {
    const sources = [
      '/assets/photo.png',
      '/assets/missing.png',
      '/assets/broken.png',
      '/assets/folder.png',
      '/assets/no-size.svg',
      '/assets/../outside.png',
      'https://example.com/remote.png',
    ];
    const html = await renderMarkdown(imageMarkup(...sources), { assetsDir });
    const rendered = images(html);
    expect(rendered.map((image) => image.src)).toEqual(sources);
    for (const image of rendered.slice(1)) {
      expect([image.src, image.attribute('width'), image.attribute('height')]).toEqual([
        image.src,
        null,
        null,
      ]);
      expect([image.src, image.attribute('loading')]).toEqual([image.src, 'lazy']);
    }
  });
});

describe('post image loading (NFR2: the likeliest LCP image is not lazy)', () => {
  test('loads the first image eagerly at high priority and every later image lazily', async () => {
    const markdown = [
      '첫 문단입니다.',
      '',
      '<img src="/assets/photo.png" alt="" />',
      '',
      '<img src="/assets/second.png" alt="두 번째 그림" />',
      '',
      '<img src="/assets/third.png" alt="" />',
      '',
    ].join('\n');
    const html = await renderMarkdown(markdown, { assetsDir });
    const loading = images(html).map((image) => [
      image.src,
      image.attribute('loading'),
      image.attribute('fetchpriority'),
      image.attribute('decoding'),
    ]);
    expect(loading).toEqual([
      ['/assets/photo.png', 'eager', 'high', 'async'],
      ['/assets/second.png', 'lazy', null, 'async'],
      ['/assets/third.png', 'lazy', null, 'async'],
    ]);
    // A described image keeps its figure and caption, now with its size.
    expect(html).toMatch(
      /<figure class="image-figure"><img src="\/assets\/second\.png"[^>]* width="320" height="240"[^>]*><figcaption>두 번째 그림<\/figcaption><\/figure>/
    );
  });

  test('loads both images of the first light/dark diagram pair eagerly, and later pairs lazily', async () => {
    const pair = (name: string) =>
      [
        `<div class="diagram-container"><img src="/assets/${name}-light.svg" class="diagram diagram-${name} diagram-light" alt="" />`,
        `<img src="/assets/${name}-dark.svg" class="diagram diagram-${name} diagram-dark" alt="" /></div>`,
      ].join('\n');
    const markdown = [
      'A D2 diagram:',
      '',
      pair('d2'),
      '',
      'A Mermaid diagram:',
      '',
      pair('mermaid'),
      '',
    ].join('\n');
    const html = await renderMarkdown(markdown, { assetsDir });
    expect(
      images(html).map((image) => [
        image.src,
        image.attribute('loading'),
        image.attribute('fetchpriority'),
      ])
    ).toEqual([
      ['/assets/d2-light.svg', 'eager', 'high'],
      ['/assets/d2-dark.svg', 'eager', 'high'],
      ['/assets/mermaid-light.svg', 'lazy', null],
      ['/assets/mermaid-dark.svg', 'lazy', null],
    ]);
  });
});

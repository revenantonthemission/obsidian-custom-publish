#!/usr/bin/env node
// Local static server for the built site — replaces the S3 + CloudFront stack.
// Replicates the CloudFront viewer-request function (clean URLs → index.html)
// and the 404.html custom error response. No dependencies; runs under launchd.
//
// Usage: node local-server.mjs [webroot]
//   PORT (default 8080), HOST (default 127.0.0.1) via environment.
//
// U3 (BR3.2–BR3.6): before the file lookup, the old Tags and Graph addresses
// are answered 301 from the build-written `_redirects.json` (see
// redirect-table.mjs), and a path that resolves to a directory is served by
// that directory's index.html. The handler never throws: an uncaught exception
// would exit the process and keep the blog down until launchd restarts it.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import {
  REDIRECT_TABLE_FILE,
  isHeaderValueSafe,
  isHostileQuery,
  loadRedirectTable,
  matchRedirect,
  redirectLocation,
} from './redirect-table.mjs';

const WEB_ROOT = resolve(process.argv[2] ?? join(homedir(), 'Sites', 'obsidian-blog'));
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

/** The table state as the start-up line and the change lines name it. */
function describeRedirects(state) {
  if (state.status === 'loaded') {
    return `${state.rules.length} rule${state.rules.length === 1 ? '' : 's'}`;
  }
  return state.status === 'rejected' ? 'table rejected' : 'none';
}

let started = false;
// Read once now and again only when the file appears, changes or disappears
// (BR3.5); one log line per read, never per request (BR3.4).
const redirects = loadRedirectTable(join(WEB_ROOT, REDIRECT_TABLE_FILE), {
  onRead: (state) => {
    if (state.status === 'rejected') {
      console.error(`obsidian-blog redirect table rejected: ${state.error.message}`);
    } else if (started) {
      console.log(`obsidian-blog redirects: ${describeRedirects(state)}`);
    }
  },
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const COMPRESSIBLE = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.webmanifest',
  '.svg',
  '.xml',
  '.txt',
  '.map',
]);

// Mirrors the retired CloudFront function: directory URLs and extension-less
// URLs both resolve to an index.html inside that path.
function rewriteUri(uri) {
  if (uri.endsWith('/')) return `${uri}index.html`;
  if (!uri.includes('.')) return `${uri}/index.html`;
  return uri;
}

function resolvePath(uri) {
  const candidate = resolve(join(WEB_ROOT, uri));
  // Containment check — decoded Korean slugs are fine, `..` traversal is not.
  if (candidate !== WEB_ROOT && !candidate.startsWith(WEB_ROOT + sep)) return null;
  return candidate;
}

function isFile(path) {
  return path !== null && existsSync(path) && statSync(path).isFile();
}

/**
 * The file a decoded path is served from, or null for the 404 page. Beyond
 * the clean-URL rewrite, a path that resolves to a directory is served by its
 * index.html whatever its shape (BR3.6), so a dotted tag key such as
 * `/writing/tags/node.js` is reachable; the containment check still applies.
 */
function resolveFile(uri) {
  const rewritten = resolvePath(rewriteUri(uri));
  if (isFile(rewritten)) return rewritten;
  const directory = resolvePath(uri);
  if (directory === null || !existsSync(directory) || !statSync(directory).isDirectory()) {
    return null;
  }
  const index = resolvePath(join(uri, 'index.html'));
  return isFile(index) ? index : null;
}

function refuse(res, status) {
  if (!res.headersSent) res.writeHead(status, { 'Content-Length': 0 });
  res.end();
}

/**
 * A matched old address (BR3.3; security-design.md §2–§4): 400 for a raw
 * query carrying an encoded control byte, otherwise 301 to the target encoded
 * once plus the raw query byte for byte. `no-cache` lets a browser revalidate
 * the redirect, so a rollback undoes it (NFR design diary 2026-11-20T00:55).
 */
function answerRedirect(res, uri, target, rawQuery) {
  if (isHostileQuery(rawQuery)) {
    console.error(
      `obsidian-blog refused a redirect query with a control byte: ${JSON.stringify(uri)}`
    );
    refuse(res, 400);
    return;
  }
  try {
    const location = redirectLocation(target, rawQuery);
    if (!isHeaderValueSafe(location)) {
      refuse(res, 400);
      return;
    }
    res.writeHead(301, { Location: location, 'Cache-Control': 'no-cache', 'Content-Length': 0 });
    res.end();
  } catch {
    // ERR_INVALID_CHAR or an unencodable target: answered, never thrown.
    refuse(res, 400);
  }
}

function send(req, res, filePath, status) {
  const stat = statSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const lastModified = stat.mtime.toUTCString();

  if (status === 200 && req.headers['if-modified-since'] === lastModified) {
    res.writeHead(304);
    res.end();
    return;
  }

  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Last-Modified': lastModified,
    'X-Content-Type-Options': 'nosniff',
    // Hashed build assets are immutable; everything else revalidates so a
    // fresh rsync shows up without an invalidation step.
    'Cache-Control': filePath.includes(`${sep}_astro${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  };

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const shouldGzip = acceptsGzip && COMPRESSIBLE.has(ext) && stat.size > 1024;

  if (req.method === 'HEAD') {
    if (!shouldGzip) headers['Content-Length'] = stat.size;
    else headers['Content-Encoding'] = 'gzip';
    res.writeHead(status, headers);
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  if (shouldGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
    res.writeHead(status, headers);
    stream.pipe(createGzip()).pipe(res);
  } else {
    headers['Content-Length'] = stat.size;
    res.writeHead(status, headers);
    stream.pipe(res);
  }
}

function notFound(req, res) {
  const errorPage = join(WEB_ROOT, '404.html');
  if (existsSync(errorPage)) {
    send(req, res, errorPage, 404);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  let uri;
  try {
    uri = decodeURIComponent(
      new URL(req.url, `http://${req.headers.host ?? 'localhost'}`).pathname
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  // The raw query, byte for byte: never the parsed URL's re-encoded search (§4).
  const queryAt = req.url.indexOf('?');
  const rawQuery = queryAt === -1 ? null : req.url.slice(queryAt + 1);
  const target = matchRedirect(redirects.current().rules, uri);
  if (target !== null) {
    answerRedirect(res, uri, target, rawQuery);
    return;
  }

  try {
    const filePath = resolveFile(uri);
    if (filePath === null) {
      notFound(req, res);
      return;
    }
    send(req, res, filePath, 200);
  } catch {
    // A path the file system refuses (or a file gone mid-request).
    refuse(res, 500);
  }
});

server.listen(PORT, HOST, () => {
  const state = redirects.current();
  started = true;
  console.log(
    `obsidian-blog serving ${WEB_ROOT} at http://${HOST}:${PORT} (redirects: ${describeRedirects(state)})`
  );
});

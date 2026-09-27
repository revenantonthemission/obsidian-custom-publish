#!/usr/bin/env node
// Local static server for the built site — replaces the S3 + CloudFront stack.
// Replicates the CloudFront viewer-request function (clean URLs → index.html)
// and the 404.html custom error response. No dependencies; runs under launchd.
//
// Usage: node local-server.mjs [webroot]
//   PORT (default 8080), HOST (default 127.0.0.1) via environment.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

const WEB_ROOT = resolve(process.argv[2] ?? join(homedir(), 'Sites', 'obsidian-blog'));
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt', '.map',
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
    uri = decodeURIComponent(new URL(req.url, `http://${req.headers.host ?? 'localhost'}`).pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  const filePath = resolvePath(rewriteUri(uri));
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    notFound(req, res);
    return;
  }
  send(req, res, filePath, 200);
});

server.listen(PORT, HOST, () => {
  console.log(`obsidian-blog serving ${WEB_ROOT} at http://${HOST}:${PORT}`);
});

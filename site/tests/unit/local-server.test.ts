// U3 static server over HTTP (rules.md BR3.2–BR3.6; NFR5.22, NFR6.16;
// security-design.md §2–§4 and §8). The real scripts/local-server.mjs runs as a
// child process, never imported: it listens at module scope, exactly as launchd
// runs it. Each server takes a free port from a port-0 listener on 127.0.0.1,
// never 8080 (the live blog) or 4329 (the HIG server), serves a temporary web
// root, and is killed, with its root removed, in teardown, also on failure.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request, type IncomingHttpHeaders } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SERVER_SCRIPT = resolve(process.cwd(), 'scripts/local-server.mjs');
const RESERVED_PORTS = new Set([8080, 4329]);
const STARTUP_TIMEOUT_MS = 10_000;
const KOREAN_ENCODED = '%EC%9A%B4%EC%98%81%EC%B2%B4%EC%A0%9C';

interface RunningServer {
  readonly child: ChildProcess;
  readonly port: number;
  readonly startupLine: string;
}

interface Answer {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

async function freePort(): Promise<number> {
  for (;;) {
    const port = await new Promise<number>((resolvePort, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        const assigned = typeof address === 'object' && address !== null ? address.port : 0;
        probe.close(() => resolvePort(assigned));
      });
    });
    if (port > 0 && !RESERVED_PORTS.has(port)) return port;
  }
}

/** Starts the server on `root` and resolves once its start-up line is printed. */
async function startServer(root: string): Promise<RunningServer> {
  const port = await freePort();
  const child = spawn(process.execPath, [SERVER_SCRIPT, root], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const startupLine = await new Promise<string>((resolveLine, reject) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      reject(new Error(`server did not start: ${stdout} ${stderr}`));
    }, STARTUP_TIMEOUT_MS);
    const ready = new RegExp(`serving .* at http://127\\.0\\.0\\.1:${port}`);
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      const line = stdout.split('\n').find((candidate) => ready.test(candidate));
      if (line !== undefined) {
        clearTimeout(timer);
        resolveLine(line);
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited with ${code}: ${stderr}`));
    });
  }).catch(async (error: unknown) => {
    await stopServer(child);
    throw error;
  });
  return { child, port, startupLine };
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

/** One GET with the request target sent exactly as written. */
function get(port: number, path: string): Promise<Answer> {
  return new Promise((resolveAnswer, reject) => {
    const outgoing = request(
      { host: '127.0.0.1', port, path, method: 'GET', agent: false },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('end', () =>
          resolveAnswer({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );
    outgoing.on('error', reject);
    outgoing.end();
  });
}

function put(root: string, relative: string, body: string): void {
  const file = join(root, relative);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, body);
}

function writeTable(root: string, rules: readonly { from: string; to: string }[]): void {
  put(root, '_redirects.json', JSON.stringify({ version: 1, rules }));
}

const RULES = Object.freeze([
  { from: '/graph', to: '/writing/graph' },
  { from: '/tags', to: '/writing/tags' },
  { from: '/tags/node.js', to: '/writing/tags/node.js' },
  { from: '/tags/test', to: '/writing/tags/test' },
  { from: '/tags/운영체제', to: '/writing/tags/운영체제' },
]);

/** A built site in miniature, with no page at "/" so that "//host" answers 404. */
function seedRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  put(root, '404.html', '<!doctype html><title>not found</title>');
  put(root, 'graph.json', '{"nodes":[],"edges":[]}');
  for (const page of [
    'writing/tags',
    'writing/graph',
    'writing/tags/test',
    'writing/tags/운영체제',
  ]) {
    put(root, `${page}/index.html`, `<!doctype html><title>${page}</title>`);
  }
  // A dotted tag key: no fixture tag has one, so the page is synthetic (BR3.6).
  put(root, 'writing/tags/node.js/index.html', '<!doctype html><title>node.js</title>');
  return root;
}

describe('start-up line (infrastructure-design memory 2026-11-20T01:40)', () => {
  test('names the table state: none, n rules, or table rejected', async () => {
    const root = seedRoot('u3-server-startup-');
    try {
      const lines: string[] = [];
      for (const prepare of [
        () => undefined,
        () => writeTable(root, RULES.slice(0, 3)),
        () => writeTable(root, [{ from: '//evil.example', to: '/writing/tags' }]),
      ]) {
        prepare();
        const server = await startServer(root);
        lines.push(server.startupLine);
        await stopServer(server.child);
      }
      expect(lines[0]).toContain('redirects: none');
      expect(lines[1]).toContain('redirects: 3 rules');
      expect(lines[2]).toContain('redirects: table rejected');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('redirects and files on a seeded web root', () => {
  let root = '';
  let server: RunningServer | null = null;

  beforeAll(async () => {
    root = seedRoot('u3-server-');
    writeTable(root, RULES);
    server = await startServer(root);
  });

  afterAll(async () => {
    if (server !== null) await stopServer(server.child);
    rmSync(root, { recursive: true, force: true });
  });

  function port(): number {
    if (server === null) throw new Error('server not started');
    return server.port;
  }

  test('/tags and /tags/ answer 301 to /writing/tags with Cache-Control: no-cache', async () => {
    for (const path of ['/tags', '/tags/']) {
      const answer = await get(port(), path);
      expect(answer.status, path).toBe(301);
      expect(answer.headers.location, path).toBe('/writing/tags');
      expect(answer.headers['cache-control'], path).toBe('no-cache');
    }
  });

  test('/tags/node.js answers 301, and its target answers 200 through the directory index', async () => {
    const redirect = await get(port(), '/tags/node.js');
    expect(redirect.status).toBe(301);
    expect(redirect.headers.location).toBe('/writing/tags/node.js');
    const target = await get(port(), '/writing/tags/node.js');
    expect(target.status).toBe(200);
    expect(target.body).toContain('<title>node.js</title>');
    expect(target.headers['content-type']).toBe('text/html; charset=utf-8');
  });

  test('an encoded Korean tag answers 301 to the once-encoded target', async () => {
    const answer = await get(port(), `/tags/${KOREAN_ENCODED}`);
    expect(answer.status).toBe(301);
    expect(answer.headers.location).toBe(`/writing/tags/${KOREAN_ENCODED}`);
    const target = await get(port(), answer.headers.location ?? '');
    expect(target.status).toBe(200);
  });

  test('the query is kept', async () => {
    const answer = await get(port(), '/tags/test?x=a');
    expect(answer.status).toBe(301);
    expect(answer.headers.location).toBe('/writing/tags/test?x=a');
    const graph = await get(port(), '/graph/?from=post&q=%ED%95%9C');
    expect(graph.headers.location).toBe('/writing/graph?from=post&q=%ED%95%9C');
  });

  test('an encoded control byte in the query answers 400, and the next request is answered normally', async () => {
    const refused = await get(port(), '/tags?x=%0d%0a');
    expect(refused.status).toBe(400);
    expect(refused.headers.location).toBeUndefined();
    const next = await get(port(), '/tags');
    expect(next.status).toBe(301);
    expect(next.headers.location).toBe('/writing/tags');
  });

  test('/graph.json is served as a file, never redirected', async () => {
    const answer = await get(port(), '/graph.json');
    expect(answer.status).toBe(200);
    expect(answer.headers.location).toBeUndefined();
    expect(answer.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(answer.body)).toEqual({ nodes: [], edges: [] });
  });

  test('an unknown tag answers the normal 404', async () => {
    for (const path of ['/tags/nonexistent', '/tagsold', '/writing/tags/nonexistent']) {
      const answer = await get(port(), path);
      expect(answer.status, path).toBe(404);
      expect(answer.headers.location, path).toBeUndefined();
      expect(answer.body, path).toContain('<title>not found</title>');
    }
  });

  test('a host in the request target never reaches a Location header', async () => {
    const bare = await get(port(), '//evil.example');
    expect(bare.status).toBe(404);
    expect(bare.headers.location).toBeUndefined();
    const encoded = await get(port(), '/%2F%2Fevil.example');
    expect(encoded.status).toBe(404);
    expect(encoded.headers.location).toBeUndefined();
    // Only the parsed path is looked up, so the answer is the table's own target.
    const withPath = await get(port(), '//evil.example/tags');
    expect(withPath.status).toBe(301);
    expect(withPath.headers.location).toBe('/writing/tags');
  });
});

describe('a table that arrives after start (BR3.5)', () => {
  test('is picked up without a restart', async () => {
    const root = seedRoot('u3-server-late-');
    let server: RunningServer | null = null;
    try {
      server = await startServer(root);
      expect(server.startupLine).toContain('redirects: none');
      expect((await get(server.port, '/tags')).status).toBe(404);
      writeTable(root, RULES);
      const answer = await get(server.port, '/tags');
      expect(answer.status).toBe(301);
      expect(answer.headers.location).toBe('/writing/tags');
    } finally {
      if (server !== null) await stopServer(server.child);
      rmSync(root, { recursive: true, force: true });
    }
  });
});

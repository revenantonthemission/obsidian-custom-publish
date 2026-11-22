import { execFileSync } from 'node:child_process';

export const DEFAULT_LOCAL_ORIGIN = 'http://127.0.0.1:8080';
export const DEFAULT_PUBLIC_ORIGIN = 'https://rvnnt.dev';
export const DEFAULT_RETRIES = 5;
export const DEFAULT_RETRY_DELAY_MS = 1000;
export const REQUEST_TIMEOUT_MS = 5000;
export const POST_INDEX_PATH = '/writing/all';

export function parseArgs(argv = []) {
  const opts = {
    noPostCheck: false,
    localOrigin: DEFAULT_LOCAL_ORIGIN,
    publicOrigin: DEFAULT_PUBLIC_ORIGIN,
    retries: DEFAULT_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-post-check') opts.noPostCheck = true;
    else if (arg === '--local-origin') opts.localOrigin = argv[++i];
    else if (arg === '--public-origin') opts.publicOrigin = argv[++i];
    else if (arg === '--retries') opts.retries = Number(argv[++i]);
    else if (arg === '--retry-delay-ms') opts.retryDelayMs = Number(argv[++i]);
    else throw new Error(`알 수 없는 인자: ${arg}`);
  }
  return opts;
}

export function parseFirstPostLink(html) {
  const match = /href="(\/posts\/[^"#?]+)"/.exec(html ?? '');
  if (!match) return null;
  return match[1];
}

export async function discoverPostPath(fetchImpl, localOrigin) {
  for (const path of ['/', POST_INDEX_PATH]) {
    try {
      const response = await request(fetchImpl, `${localOrigin}${path}`);
      const postPath = parseFirstPostLink(await response.text());
      if (postPath) return postPath;
    } catch {}
  }
  return null;
}

export function mapFailureToTrigger(check) {
  if (check === 'H1' || check === 'H2') return { trigger: 'T1', severity: 'P1' };
  return { trigger: 'T2', severity: 'P2' };
}

/** @typedef {{ status: number, headers: { get(name: string): string | null }, text(): Promise<string> }} FetchResponse */
/** @typedef {(url: string | URL, init?: object) => Promise<FetchResponse>} FetchLike */
/** @typedef {{ retries?: number, retryDelayMs?: number, sleepImpl?: (ms: number) => Promise<void> }} RetryOptions */

/** @param {FetchLike} fetchImpl */
async function request(fetchImpl, url, options = {}) {
  return fetchImpl(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** @returns {FetchLike} */
function defaultFetch() {
  return (url, init) => globalThis.fetch(url, init);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkStatus(
  fetchImpl,
  url,
  expected,
  { retries = 0, retryDelayMs = 0, sleepImpl = sleep } = {}
) {
  let lastStatus = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await request(fetchImpl, url);
      lastStatus = response.status;
      if (response.status === expected)
        return { ok: true, status: response.status, attempts: attempt + 1 };
    } catch {
      lastStatus = null;
    }
    if (attempt < retries) await sleepImpl(retryDelayMs);
  }
  return { ok: false, status: lastStatus, attempts: retries + 1 };
}

/** @param {FetchLike} fetchImpl @param {string} origin @param {RetryOptions} options */
export async function checkLegacyRedirect(
  fetchImpl,
  origin,
  { retries = 0, retryDelayMs = 0, sleepImpl = sleep } = {}
) {
  let last = { ok: false, status: null, attempts: retries + 1, location: null };
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await request(fetchImpl, `${origin}/tags`, { redirect: 'manual' });
      const location = response.headers?.get?.('location') ?? null;
      const cacheControl = response.headers?.get?.('cache-control') ?? '';
      if (response.status !== 301 || !location || !/no-cache/i.test(cacheControl)) {
        last = { ok: false, status: response.status, attempts: attempt + 1, location };
      } else {
        const target = await checkStatus(fetchImpl, new URL(location, origin).toString(), 200);
        last = { ok: target.ok, status: response.status, attempts: attempt + 1, location };
        if (target.ok) return last;
      }
    } catch {
      last = { ok: false, status: null, attempts: attempt + 1, location: null };
    }
    if (attempt < retries) await sleepImpl(retryDelayMs);
  }
  return last;
}

export async function runChecks({
  fetchImpl = defaultFetch(),
  localOrigin = DEFAULT_LOCAL_ORIGIN,
  publicOrigin = DEFAULT_PUBLIC_ORIGIN,
  retries = DEFAULT_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleepImpl = sleep,
} = {}) {
  const results = [];
  const origins = [
    { name: 'local', base: localOrigin },
    { name: 'public', base: publicOrigin },
  ];

  const postPath = await discoverPostPath(fetchImpl, localOrigin);

  for (const origin of origins) {
    const h1 = await checkStatus(fetchImpl, `${origin.base}/`, 200);
    results.push({ check: 'H1', origin: origin.name, ...h1 });

    if (postPath) {
      const h2 = await checkStatus(fetchImpl, `${origin.base}${postPath}`, 200);
      results.push({ check: 'H2', origin: origin.name, path: postPath, ...h2 });
    } else {
      results.push({
        check: 'H2',
        origin: origin.name,
        path: null,
        ok: false,
        status: null,
        attempts: 0,
      });
    }

    const h3 = await checkLegacyRedirect(fetchImpl, origin.base, {
      retries,
      retryDelayMs,
      sleepImpl,
    });
    results.push({ check: 'H3', origin: origin.name, ...h3 });
  }

  return results;
}

export function formatResults(results) {
  return results
    .map((r) => {
      const detail = r.path ? ` ${r.path}` : r.location ? ` -> ${r.location}` : '';
      return `${r.ok ? 'PASS' : 'FAIL'} ${r.check} ${r.origin}${detail} status=${r.status ?? 'none'} attempts=${r.attempts}`;
    })
    .join('\n');
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function latestMergeCommit() {
  try {
    return run('git', ['log', '-1', '--merges', '--format=%H']) || null;
  } catch {
    return null;
  }
}

export function autoRecover({ runImpl = run, mergeCommit = null } = {}) {
  const sha = mergeCommit ?? latestMergeCommit();
  if (!sha) return { attempted: false, reason: '되돌릴 병합 커밋을 찾지 못함' };
  runImpl('git', ['revert', '-m', '1', '--no-edit', sha]);
  runImpl('just', ['deploy-no-check']);
  return { attempted: true, reverted: sha };
}

export async function main(argv = []) {
  const opts = parseArgs(argv);
  if (opts.noPostCheck) {
    console.log('post-deploy-check: --no-post-check, 검사와 자동 복구를 건너뜁니다.');
    return 0;
  }

  const results = await runChecks(opts);
  console.log(formatResults(results));
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) return 0;

  for (const item of failed) {
    const { trigger, severity } = mapFailureToTrigger(item.check);
    console.log(`FAIL ${item.check}/${item.origin}: trigger=${trigger} severity=${severity}`);
  }

  try {
    console.log(`자동 복구: ${JSON.stringify(autoRecover())}`);
  } catch (error) {
    console.log(`자동 복구 실패: ${error.message}`);
  }
  return 1;
}

const invokedPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : '';
if (invokedPath && import.meta.url === invokedPath) {
  process.exitCode = await main(process.argv.slice(2));
}

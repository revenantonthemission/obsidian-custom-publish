import { describe, expect, it, vi } from 'vitest';
import {
  checkLegacyRedirect,
  checkStatus,
  formatResults,
  mapFailureToTrigger,
  parseArgs,
  parseFirstPostLink,
  runChecks,
} from '../../scripts/post-deploy-check.mjs';

type FetchResponse = {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

const response = (
  status: number,
  headers: Record<string, string> = {},
  body = ''
): FetchResponse => ({
  status,
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  text: async () => body,
});

describe('post-deploy-check', () => {
  it('parses the first post link from homepage HTML', () => {
    expect(parseFirstPostLink('<a href="/posts/alpha">A</a><a href="/posts/beta">B</a>')).toBe(
      '/posts/alpha'
    );
    expect(parseFirstPostLink('<p>no links</p>')).toBeNull();
  });

  it('maps H1/H2 to T1 and H3 to T2', () => {
    expect(mapFailureToTrigger('H1')).toEqual({ trigger: 'T1', severity: 'P1' });
    expect(mapFailureToTrigger('H2')).toEqual({ trigger: 'T1', severity: 'P1' });
    expect(mapFailureToTrigger('H3')).toEqual({ trigger: 'T2', severity: 'P2' });
  });

  it('checks a 200 status on the happy path', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200));
    const result = await checkStatus(fetchImpl, 'http://origin/', 200);
    expect(result).toEqual({ ok: true, status: 200, attempts: 1 });
  });

  it('retries a transient failure before succeeding', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const result = await checkStatus(fetchImpl, 'http://origin/', 200, {
      retries: 1,
      retryDelayMs: 1000,
      sleepImpl,
    });
    expect(result).toEqual({ ok: true, status: 200, attempts: 2 });
    expect(sleepImpl).toHaveBeenCalledWith(1000);
  });

  it('accepts a legacy redirect with 301, no-cache and a 200 target', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url) === 'http://origin/tags') {
        return response(301, { location: '/writing/tags', 'cache-control': 'no-cache' });
      }
      return response(200);
    });
    const result = await checkLegacyRedirect(fetchImpl, 'http://origin', {
      retries: 0,
      retryDelayMs: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.location).toBe('/writing/tags');
  });

  it('rejects a legacy redirect without Cache-Control: no-cache', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(301, { location: '/writing/tags' }));
    const result = await checkLegacyRedirect(fetchImpl, 'http://origin', {
      retries: 0,
      retryDelayMs: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('runs H1, H2 and H3 against both origins', async () => {
    const fetchImpl = vi.fn(async (url) => {
      const target = String(url);
      if (target === 'http://local/tags' || target === 'https://public/tags') {
        return response(301, { location: '/writing/tags', 'cache-control': 'no-cache' });
      }
      if (target.endsWith('/')) {
        return response(200, {}, '<a href="/posts/sample">Sample</a>');
      }
      return response(200);
    });
    const results = await runChecks({
      fetchImpl,
      localOrigin: 'http://local',
      publicOrigin: 'https://public',
      retries: 0,
      retryDelayMs: 0,
    });
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.filter((r) => r.origin === 'local')).toHaveLength(3);
    expect(results.filter((r) => r.origin === 'public')).toHaveLength(3);
  });

  it('formats results with status and retry count', () => {
    const text = formatResults([
      { check: 'H1', origin: 'local', ok: true, status: 200, attempts: 1 },
      {
        check: 'H3',
        origin: 'public',
        ok: false,
        status: 404,
        attempts: 5,
        location: '/writing/tags',
      },
    ]);
    expect(text).toContain('PASS H1 local status=200 attempts=1');
    expect(text).toContain('FAIL H3 public -> /writing/tags status=404 attempts=5');
  });

  it('parses the recursion-guard flag', () => {
    expect(parseArgs(['--no-post-check']).noPostCheck).toBe(true);
    expect(parseArgs([]).noPostCheck).toBe(false);
  });
});

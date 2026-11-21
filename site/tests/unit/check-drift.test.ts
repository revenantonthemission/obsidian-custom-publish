import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildChecks, formatChecks, loadBaseline } from '../../scripts/check-drift.mjs';

const baseline = loadBaseline();

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'drift-'));
  const home = join(root, 'home');
  const webRoot = join(root, 'web');
  mkdirSync(join(home, 'Library/LaunchAgents'), { recursive: true });
  mkdirSync(join(home, '.cloudflared'), { recursive: true });
  mkdirSync(join(webRoot, 'posts'), { recursive: true });
  mkdirSync(join(webRoot, 'writing'), { recursive: true });
  for (const name of ['_redirects.json', 'index.html']) writeFileSync(join(webRoot, name), 'x');
  writeFileSync(
    join(home, 'Library/LaunchAgents/dev.rvnnt.blog.plist'),
    '<string>127.0.0.1</string><string>8080</string>site/scripts/local-server.mjs Sites/obsidian-blog'
  );
  writeFileSync(
    join(home, 'Library/LaunchAgents/homebrew.mxcl.jenkins.plist'),
    '--httpListenAddress=127.0.0.1 --httpPort=8081'
  );
  writeFileSync(
    join(home, '.cloudflared/obsidian-blog.yml'),
    'hostname: rvnnt.dev\nservice: http://127.0.0.1:8080\n'
  );
  return { home, webRoot };
}

describe('check-drift', () => {
  it('loads the recorded baseline', () => {
    expect(baseline.webRoot.expected).toContain('_redirects.json');
    expect(baseline.webRoot.forbidden).toContain('tags');
  });

  it('passes when every expected value and path matches', () => {
    const { home, webRoot } = fixture();
    const checks = buildChecks(baseline, { home, webRoot });
    expect(checks.every((check) => check.ok)).toBe(true);
  });

  it('reports a changed plist value as drift', () => {
    const { home, webRoot } = fixture();
    writeFileSync(
      join(home, 'Library/LaunchAgents/dev.rvnnt.blog.plist'),
      '<string>0.0.0.0</string>'
    );
    const checks = buildChecks(baseline, { home, webRoot });
    expect(checks.find((check) => check.name === 'blogPlist')?.ok).toBe(false);
  });

  it('reports a forbidden legacy tree as drift', () => {
    const { home, webRoot } = fixture();
    mkdirSync(join(webRoot, 'tags'));
    const checks = buildChecks(baseline, { home, webRoot });
    expect(checks.find((check) => check.name === 'webRoot/tags')?.ok).toBe(false);
  });

  it('formats results with OK and DRIFT markers', () => {
    const text = formatChecks([
      { name: 'blogPlist', ok: true, detail: '일치', file: '' },
      { name: 'webRoot/tags', ok: false, detail: '제거되어야 할 이전 트리', file: '' },
    ]);
    expect(text).toContain('OK   blogPlist');
    expect(text).toContain('DRIFT webRoot/tags');
  });
});

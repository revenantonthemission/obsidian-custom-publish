import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BASELINE = fileURLToPath(new URL('../config/drift-baseline.json', import.meta.url));
const DEFAULT_WEB_ROOT = '/Users/revenantonthemission/Sites/obsidian-blog';

export function loadBaseline(path = DEFAULT_BASELINE) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function buildChecks(
  baseline,
  { home = process.env.HOME, webRoot = process.env.WEB_ROOT } = {}
) {
  const checks = [];
  for (const [name, spec] of Object.entries(baseline)) {
    if (name === 'webRoot') continue;
    const file = join(home, spec.path);
    const text = existsSync(file) ? readFileSync(file, 'utf8') : null;
    checks.push({
      name,
      file,
      ok: text !== null && spec.contains.every((value) => text.includes(value)),
      detail:
        text === null
          ? '파일 없음'
          : spec.contains.filter((value) => !text.includes(value)).join(', ') || '일치',
    });
  }
  const root = webRoot || DEFAULT_WEB_ROOT;
  for (const name of baseline.webRoot.expected) {
    checks.push({
      name: `webRoot/${name}`,
      file: join(root, name),
      ok: existsSync(join(root, name)),
      detail: '필수 항목',
    });
  }
  for (const name of baseline.webRoot.forbidden) {
    checks.push({
      name: `webRoot/${name}`,
      file: join(root, name),
      ok: !existsSync(join(root, name)),
      detail: '제거되어야 할 이전 트리',
    });
  }
  return checks;
}

export function formatChecks(checks) {
  return checks
    .map((check) => `${check.ok ? 'OK  ' : 'DRIFT'} ${check.name} — ${check.detail}`)
    .join('\n');
}

export function runDriftCheck(options) {
  const checks = buildChecks(loadBaseline(options?.baseline), options);
  return { checks, ok: checks.every((check) => check.ok) };
}

const invokedPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : '';
if (invokedPath && import.meta.url === invokedPath) {
  const { checks, ok } = runDriftCheck();
  console.log(formatChecks(checks));
  process.exitCode = ok ? 0 : 1;
}

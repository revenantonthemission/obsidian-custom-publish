import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Review finding R-01 (HIG redesign): every package the site's source imports
 * is declared in `package.json`. An undeclared package resolves only while npm
 * happens to hoist a transitive copy, and the nightly deploy runs a clean
 * install, so a different hoisting layout would break the build or silently
 * drop a stylesheet such as KaTeX's.
 */
const SOURCE_ROOT = resolve('src');
const SOURCE_EXTENSIONS = /\.(ts|tsx|astro|mjs|js)$/;
// `import x from 'pkg'`, `import 'pkg/file.css'`, `export … from 'pkg'`; captures `type` when present.
const IMPORT_RE = /\b(?:import|export)\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;

interface PackageJson {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

interface BareImport {
  readonly file: string;
  readonly name: string;
  readonly typeOnly: boolean;
}

function sourceFiles(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.test(entry.name) ? [path] : [];
  });
}

/** `@scope/pkg/sub` → `@scope/pkg`, `pkg/sub` → `pkg`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isBare(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:');
}

function bareImports(): readonly BareImport[] {
  return sourceFiles(SOURCE_ROOT).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(IMPORT_RE)]
      .filter((match) => isBare(match[2]))
      .map((match) => ({ file, name: packageName(match[2]), typeOnly: match[1] !== undefined }))
  );
}

/** `@types/hast` for `hast`, `@types/scope__pkg` for `@scope/pkg`. */
function typesPackage(name: string): string {
  return `@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`;
}

const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as PackageJson;
const runtime = new Set(Object.keys(manifest.dependencies ?? {}));
const all = new Set([...runtime, ...Object.keys(manifest.devDependencies ?? {})]);

describe('declared dependencies (R-01)', () => {
  test('the scan finds the imports it is meant to check', () => {
    const names = new Set(bareImports().map((entry) => entry.name));
    expect(names).toContain('katex');
    expect(names).toContain('astro');
  });

  test('every runtime import is a declared dependency', () => {
    const missing = bareImports()
      .filter((entry) => !entry.typeOnly && !runtime.has(entry.name))
      .map((entry) => `${entry.name} (${entry.file.slice(SOURCE_ROOT.length + 1)})`);
    expect([...new Set(missing)]).toEqual([]);
  });

  test('every type-only import is declared, directly or through @types', () => {
    const missing = bareImports()
      .filter((entry) => entry.typeOnly)
      .filter((entry) => !all.has(entry.name) && !all.has(typesPackage(entry.name)))
      .map((entry) => `${entry.name} (${entry.file.slice(SOURCE_ROOT.length + 1)})`);
    expect([...new Set(missing)]).toEqual([]);
  });
});

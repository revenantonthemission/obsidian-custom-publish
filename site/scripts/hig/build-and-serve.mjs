#!/usr/bin/env node
// HIG browser-check runner (code-generation plan Step 9, NFR3/NFR7).
//
// Builds the site once against the fixture vault — the same preparation the
// Jenkins Verify stage performs — then serves site/dist through the production
// static server (scripts/local-server.mjs) on 127.0.0.1:4329, so the checks run
// against exactly what launchd serves, never against `astro dev`.
//
// It overwrites the generated, gitignored content/ and site/public/*.json with
// fixture output, as Jenkins Verify does. Run `just preprocess` afterwards to
// restore real vault output for local work. HIG_SKIP_BUILD=1 reuses the current
// dist/ (useful when only a spec changed).
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_ROOT = resolve(import.meta.dirname, '..', '..');
const REPO_ROOT = resolve(SITE_ROOT, '..');
const PREPROCESSOR = resolve(REPO_ROOT, 'preprocessor', 'target', 'release', 'obsidian-press');
const HOST = '127.0.0.1';
const PORT = process.env.HIG_PORT ?? '4329';
const COPIED_JSON = ['search-index.json', 'graph.json', 'previews.json', 'nav-tree.json'];

function fail(message) {
  console.error(`hig: ${message}`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
  }
}

function prepareFixtureContent() {
  if (!existsSync(PREPROCESSOR)) {
    fail('the release preprocessor is missing; run `cargo build --release --manifest-path preprocessor/Cargo.toml` first');
  }
  // The preprocessor resolves .puppeteer-config.json from its cwd, so it runs
  // from the repository root like the Justfile and Jenkins do.
  run(PREPROCESSOR, ['./fixtures/vault', './content'], REPO_ROOT);
  for (const file of COPIED_JSON) {
    cpSync(resolve(REPO_ROOT, 'content', file), resolve(SITE_ROOT, 'public', file));
  }
  const assets = resolve(REPO_ROOT, 'content', 'assets');
  if (existsSync(assets)) {
    const target = resolve(SITE_ROOT, 'public', 'assets');
    mkdirSync(target, { recursive: true });
    cpSync(assets, target, { recursive: true });
  }
  run(process.execPath, ['scripts/crossunit/ensure-fixture-content.mjs'], SITE_ROOT);
}

if (process.env.HIG_SKIP_BUILD !== '1') {
  prepareFixtureContent();
  run('npx', ['astro', 'build'], SITE_ROOT);
} else if (!existsSync(resolve(SITE_ROOT, 'dist', 'index.html'))) {
  fail('HIG_SKIP_BUILD=1 needs an existing site/dist build');
}

const server = spawn(process.execPath, ['scripts/local-server.mjs', 'dist'], {
  cwd: SITE_ROOT,
  stdio: 'inherit',
  env: { ...process.env, HOST, PORT },
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code ?? 0);
});

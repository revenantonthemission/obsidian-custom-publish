// Verification support: before a verification build, materialize one
// deterministic discoverable post so the homepage's "오늘 발행된 글" e2e case
// has a post on the pinned date — but only when it is absent, so output from a
// real preprocessor run always wins. This writes test-fixture inputs for
// verification builds only.
//
// U1 (BR7.2): the site no longer reads a homepage artifact, so this script no
// longer writes `content/homepage/`.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = resolve(siteRoot, '..', 'content');

/** The date the e2e "글 있음" case pins via HOMEPAGE_TODAY_OVERRIDE. */
export const FIXTURE_POST_PUBLISHED = '2024-03-01';

const FIXTURE_POST_META = Object.freeze({
  slug: 'fixture-e2e-post',
  title: 'Fixture E2E Post',
  tags: ['fixture'],
  created: FIXTURE_POST_PUBLISHED,
  published: FIXTURE_POST_PUBLISHED,
  updated: null,
  backlinks: [],
  forward_links: [],
  is_hub: false,
  hub_parent: null,
  description: null,
  reading_time_min: 1,
  word_count: 10,
  related_posts: [],
});

/**
 * Ensure the e2e fixture post exists before a verification build. Never
 * overwrites existing content.
 */
export async function ensureE2eFixtureContent() {
  const metaDir = resolve(contentRoot, 'meta');
  const postMetaPath = resolve(metaDir, 'fixture-e2e-post.json');
  const postBodyDir = resolve(contentRoot, 'posts');
  const postBodyPath = resolve(postBodyDir, 'fixture-e2e-post.md');
  if (!existsSync(postMetaPath)) {
    await mkdir(metaDir, { recursive: true });
    await mkdir(postBodyDir, { recursive: true });
    await writeFile(postMetaPath, `${JSON.stringify(FIXTURE_POST_META, null, 2)}\n`, 'utf8');
    if (!existsSync(postBodyPath)) {
      await writeFile(postBodyPath, 'e2e fixture 게시물 본문입니다.\n', 'utf8');
    }
  }
  await registerInManifest(['meta/fixture-e2e-post.json', 'posts/fixture-e2e-post.md']);
}

/**
 * The site fails closed with WR001 when `meta/*.json` differs from the
 * preprocessor's `manifest.json` (U2 NFR5.19), so the files written above are
 * listed there too, keeping the inventory sorted. Without a manifest nothing is
 * added: the build then reports the missing preprocessor run itself.
 */
async function registerInManifest(entries) {
  const manifestPath = resolve(contentRoot, 'manifest.json');
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const missing = entries.filter(
    (entry) => existsSync(resolve(contentRoot, entry)) && !manifest.includes(entry)
  );
  if (missing.length === 0) return;
  const updated = [...manifest, ...missing].sort();
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
}

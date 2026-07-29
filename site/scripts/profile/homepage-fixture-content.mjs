// U2 verification support: the fail-closed homepage gateway (HP001) means a
// content-less clean build can no longer produce `/`. Before a verification
// build, materialize a deterministic fixture homepage artifact — but only when
// the artifact is absent, so output from a real preprocessor run always wins.
// This writes test-fixture inputs for verification builds; the production
// artifact path stays the preprocessor (FR-017).

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../../', import.meta.url));
const contentRoot = resolve(siteRoot, '..', 'content');

/** The date the e2e "글 있음" case pins via HOMEPAGE_TODAY_OVERRIDE. */
export const FIXTURE_POST_PUBLISHED = '2024-03-01';

const HOMEPAGE_BODY = `환영합니다. 검증 빌드용 fixture 홈페이지입니다.

<!-- profile:slot -->

## 소개

첫 화면 소개 문단입니다.

## 이번주에 작성된 포스트

이 절은 오늘 발행 글로 치환됩니다.

## 마무리

마지막 절입니다.
`;

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
 * Ensure the homepage artifact (and one discoverable post for the today-case)
 * exists before a verification build. Never overwrites existing content.
 */
export async function ensureHomepageFixtureContent() {
  const homepageDir = resolve(contentRoot, 'homepage');
  const bodyPath = resolve(homepageDir, 'index.md');
  const metaPath = resolve(homepageDir, 'meta.json');

  if (!existsSync(bodyPath) || !existsSync(metaPath)) {
    await mkdir(homepageDir, { recursive: true });
    await writeFile(bodyPath, HOMEPAGE_BODY, 'utf8');
    await writeFile(metaPath, `${JSON.stringify({ title: 'Fixture Homepage' }, null, 2)}\n`, 'utf8');
  }

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
}

# Obsidian Publish Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 8 features (sitemap, OG meta, 404 page, outline highlights, heading folding, last updated date, related posts, CloudFront analytics) to achieve Obsidian Publish parity.

**Architecture:** Front-end features (sitemap, OG, 404, outline, folding) are Astro template/CSS changes. Back-end features (last updated, related posts) require Rust preprocessor changes that flow through `PostMeta` JSON into Astro components. Analytics is Terraform-only.

**Tech Stack:** Astro 6, Preact, Rust (preprocessor), Terraform (AWS), CSS

---

### Task 1: 404 Page

**Files:**
- Create: `site/src/pages/404.astro`

**Step 1: Create the 404 page**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="페이지를 찾을 수 없습니다">
  <div class="not-found">
    <h1>404</h1>
    <p>페이지를 찾을 수 없습니다.</p>
    <a href="/">홈으로 돌아가기</a>
  </div>
</BaseLayout>

<style>
  .not-found {
    text-align: center;
    padding: 4rem 1rem;
  }
  .not-found h1 {
    font-size: 4rem;
    color: var(--c-text-muted);
    margin-bottom: 0.5rem;
  }
  .not-found p {
    color: var(--c-text-muted);
    margin-bottom: 1.5rem;
  }
</style>
```

**Step 2: Build and verify**

Run: `cd site && npx astro build`
Expected: `dist/404.html` exists. CloudFront `main.tf` already points `response_page_path = "/404.html"`.

**Step 3: Commit**

```bash
git add site/src/pages/404.astro
git commit -m "feat: add 404 page"
```

---

### Task 2: Sitemap

**Files:**
- Modify: `site/astro.config.mjs`
- Modify: `site/package.json` (via npm install)

**Step 1: Install the sitemap integration**

Run: `cd site && npm install @astrojs/sitemap`

**Step 2: Update Astro config**

In `site/astro.config.mjs`, add the sitemap integration and site URL:

```js
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rvnnt.dev',
  integrations: [preact(), sitemap()],
  output: 'static',
});
```

**Step 3: Build and verify**

Run: `cd site && npx astro build`
Expected: `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist.

**Step 4: Commit**

```bash
git add site/astro.config.mjs site/package.json site/package-lock.json
git commit -m "feat: add sitemap.xml via @astrojs/sitemap"
```

---

### Task 3: Open Graph / SEO Meta Tags

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`
- Modify: `site/src/layouts/PostLayout.astro`

**Step 1: Expand BaseLayout Props and add meta tags**

In `site/src/layouts/BaseLayout.astro`, update the Props interface and `<head>`:

```astro
---
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import Search from "../islands/Search.tsx";

interface Props {
  title?: string;
  description?: string;
  ogType?: string;
  canonicalUrl?: string;
}

const {
  title = "obsidian-press",
  description = "obsidian-press — personal knowledge base",
  ogType = "website",
  canonicalUrl,
} = Astro.props;
const siteUrl = "https://rvnnt.dev";
const fullUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
---
```

Add inside `<head>`, after the `<title>` tag:

```html
<meta name="description" content={description} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content={ogType} />
<meta property="og:url" content={fullUrl} />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<link rel="canonical" href={fullUrl} />
```

**Step 2: Pass post-specific props from PostLayout**

In `site/src/layouts/PostLayout.astro`, update the BaseLayout invocation.
Requires a summary — use the first 160 chars of raw content as description, or import from previews.json.

Simplest approach: derive from `meta.title` and `meta.tags`:

```astro
<BaseLayout
  title={meta.title}
  description={`${meta.title} — ${meta.tags.join(", ")}`}
  ogType="article"
  canonicalUrl={`/posts/${meta.slug}`}
>
```

**Step 3: Build and verify**

Run: `cd site && npx astro build`
Check: `grep 'og:title' dist/posts/container/index.html` returns a meta tag.

**Step 4: Commit**

```bash
git add site/src/layouts/BaseLayout.astro site/src/layouts/PostLayout.astro
git commit -m "feat: add Open Graph and SEO meta tags"
```

---

### Task 4: Outline Highlights (TOC Scroll Spy)

**Files:**
- Modify: `site/src/layouts/PostLayout.astro` (add script)
- Modify: `site/src/components/TableOfContents.astro` (add active CSS)

**Step 1: Add IntersectionObserver script to PostLayout**

Add a new `<script>` block in PostLayout, after the existing link preview script:

```html
<script>
  function initTocHighlight() {
    const headings = document.querySelectorAll('.post-content h2[id], .post-content h3[id], .post-content h4[id]');
    if (!headings.length) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          document.querySelectorAll('.toc-item a').forEach((a) => {
            a.classList.toggle('toc-active', a.getAttribute('href') === `#${id}`);
          });
        }
      }
    }, {
      rootMargin: '-64px 0px -80% 0px',
    });

    headings.forEach((h) => observer.observe(h));
  }
  initTocHighlight();
</script>
```

**Step 2: Add active CSS to TableOfContents**

In `site/src/components/TableOfContents.astro`, add to the `<style>` block:

```css
.toc-item a.toc-active {
  color: var(--c-accent);
  font-weight: 600;
}
```

Also add the same rule in `site/src/styles/mobile-sidebar.css` for mobile TOC:

```css
.mobile-sidebar-body .toc-item a.toc-active {
  color: var(--c-accent);
  font-weight: 600;
}
```

**Step 3: Build and verify**

Run: `cd site && npx astro build`
Manual test: open a post, scroll through sections, TOC active item should change.

**Step 4: Commit**

```bash
git add site/src/layouts/PostLayout.astro site/src/components/TableOfContents.astro site/src/styles/mobile-sidebar.css
git commit -m "feat: add TOC scroll spy with active heading highlight"
```

---

### Task 5: Heading Folding

**Files:**
- Modify: `site/src/layouts/PostLayout.astro` (add script)
- Modify: `site/src/styles/post.css` (add fold CSS)

**Step 1: Add heading fold script to PostLayout**

Add a new `<script>` block in PostLayout:

```html
<script>
  function initHeadingFold() {
    const content = document.querySelector('.post-content');
    if (!content) return;

    content.querySelectorAll('h2, h3').forEach((heading) => {
      const btn = document.createElement('button');
      btn.className = 'heading-fold-toggle';
      btn.ariaLabel = '섹션 접기/펼치기';
      btn.textContent = '▶';
      heading.prepend(btn);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const headingLevel = parseInt(heading.tagName[1]);
        const collapsed = heading.classList.toggle('collapsed');

        let sibling = heading.nextElementSibling;
        while (sibling) {
          if (sibling.matches('h1, h2, h3') && parseInt(sibling.tagName[1]) <= headingLevel) break;
          (sibling as HTMLElement).style.display = collapsed ? 'none' : '';
          sibling = sibling.nextElementSibling;
        }
      });
    });

    // Auto-expand collapsed section when TOC link is clicked
    document.querySelectorAll('.toc-item a').forEach((a) => {
      a.addEventListener('click', () => {
        const targetId = a.getAttribute('href')?.slice(1);
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;

        // Expand all ancestor headings that may be collapsed
        let el = target.previousElementSibling;
        while (el) {
          if (el.matches('.collapsed')) {
            (el as HTMLElement).click();
          }
          el = el.previousElementSibling;
        }
        // Also check if the target itself is a collapsed heading
        if (target.classList.contains('collapsed')) {
          target.querySelector('.heading-fold-toggle')?.dispatchEvent(new Event('click'));
        }
      });
    });
  }
  initHeadingFold();
</script>
```

**Step 2: Add CSS for fold toggle**

In `site/src/styles/post.css`, add:

```css
/* ── Heading fold toggle ── */
.heading-fold-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.6em;
  color: var(--c-text-muted);
  padding: 0 0.4rem 0 0;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
  display: inline-block;
  transform: rotate(90deg);
  vertical-align: middle;
}

h2:hover .heading-fold-toggle,
h3:hover .heading-fold-toggle,
.heading-fold-toggle:focus-visible {
  opacity: 1;
}

h2.collapsed .heading-fold-toggle,
h3.collapsed .heading-fold-toggle {
  transform: rotate(0deg);
  opacity: 1;
}
```

**Step 3: Build and verify**

Run: `cd site && npx astro build`
Manual test: hover over h2/h3 headings, see chevron appear, click to collapse.

**Step 4: Commit**

```bash
git add site/src/layouts/PostLayout.astro site/src/styles/post.css
git commit -m "feat: add heading fold/collapse toggle"
```

---

### Task 6: Last Updated Date

**Files:**
- Modify: `preprocessor/src/types.rs` (add `updated` field)
- Modify: `preprocessor/src/scanner.rs` (git log lookup)
- Modify: `preprocessor/src/output.rs` (include in OutputMeta)
- Modify: `site/src/lib/types.ts` (add `updated` field)
- Modify: `site/src/layouts/PostLayout.astro` (display updated date)

**Step 1: Add `updated` field to PostMeta in types.rs**

In `preprocessor/src/types.rs`, add to `PostMeta`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostMeta {
    pub slug: String,
    pub title: String,
    pub file_path: PathBuf,
    pub tags: Vec<String>,
    pub created: Option<String>,
    pub published: Option<String>,
    pub updated: Option<String>,  // NEW
    pub is_hub: bool,
    pub hub_parent: Option<String>,
    pub raw_content: String,
}
```

**Step 2: Look up git date in scanner.rs**

In `preprocessor/src/scanner.rs`, add a helper function and call it during post construction:

```rust
/// Get the last git commit date for a file, or None if unavailable.
fn git_last_modified(file_path: &Path) -> Option<String> {
    std::process::Command::new("git")
        .args(["log", "-1", "--format=%Y-%m-%d", "--"])
        .arg(file_path)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let date = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if date.is_empty() { None } else { Some(date) }
            } else {
                None
            }
        })
}
```

Call `git_last_modified(&entry_path)` when building each `PostMeta` and assign to `updated`.

**Step 3: Add `updated` to OutputMeta in output.rs**

In `preprocessor/src/output.rs`, add `updated: Option<String>` to `OutputMeta` and populate it from `post.updated.clone()`.

**Step 4: Run tests**

Run: `cd preprocessor && cargo test`
Expected: All existing tests pass (the `updated` field will be `None` in fixture tests since fixtures may not have git history).

**Step 5: Update Astro types**

In `site/src/lib/types.ts`, add to `PostMeta`:

```ts
export interface PostMeta {
  // ... existing fields ...
  updated: string | null;  // NEW
}
```

**Step 6: Display in PostLayout**

In `site/src/layouts/PostLayout.astro`, add after the reading time span:

```astro
{meta.updated && meta.updated !== meta.published && (
  <span>최종 수정: <time datetime={meta.updated}>{meta.updated}</time></span>
)}
```

**Step 7: Build and verify**

Run: `cd site && npx astro build`
Expected: Posts with git history show "최종 수정: YYYY-MM-DD" when updated date differs from published.

**Step 8: Commit**

```bash
git add preprocessor/src/types.rs preprocessor/src/scanner.rs preprocessor/src/output.rs site/src/lib/types.ts site/src/layouts/PostLayout.astro
git commit -m "feat: show last updated date from git history"
```

---

### Task 7: Related Posts

**Files:**
- Create: `preprocessor/src/related.rs`
- Modify: `preprocessor/src/lib.rs` (register module)
- Modify: `preprocessor/src/types.rs` (add RelatedPost type)
- Modify: `preprocessor/src/output.rs` (compute + include related)
- Create: `site/src/components/RelatedPosts.astro`
- Modify: `site/src/lib/types.ts` (add related field)
- Modify: `site/src/layouts/PostLayout.astro` (render component)

**Step 1: Add RelatedPost type in types.rs**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedPost {
    pub slug: String,
    pub title: String,
    pub tags: Vec<String>,
}
```

**Step 2: Create related.rs**

Create `preprocessor/src/related.rs`:

```rust
use crate::types::{LinkGraph, RelatedPost, VaultIndex};

/// Compute the top 3 related posts for a given post index.
pub fn find_related(index: &VaultIndex, graph: &LinkGraph, post_idx: usize) -> Vec<RelatedPost> {
    let post = &index.posts[post_idx];
    let mut scores: Vec<(usize, i32)> = Vec::new();

    for (j, other) in index.posts.iter().enumerate() {
        if j == post_idx { continue; }
        let mut score: i32 = 0;

        // Shared tags: +2 per tag
        for tag in &post.tags {
            if other.tags.contains(tag) {
                score += 2;
            }
        }

        // Forward link: +3
        let forward = &graph.forward_links[post_idx];
        if forward.iter().any(|l| l.target_slug == other.slug) {
            score += 3;
        }

        // Backlink: +3
        let backlinks = &graph.backlinks[post_idx];
        if backlinks.contains(&other.slug) {
            score += 3;
        }

        // Same hub parent: +1
        if let (Some(a), Some(b)) = (&post.hub_parent, &other.hub_parent) {
            if a == b { score += 1; }
        }

        if score > 0 {
            scores.push((j, score));
        }
    }

    scores.sort_by(|a, b| b.1.cmp(&a.1));
    scores.truncate(3);

    scores.iter().map(|&(j, _)| {
        let p = &index.posts[j];
        RelatedPost {
            slug: p.slug.clone(),
            title: p.title.clone(),
            tags: p.tags.clone(),
        }
    }).collect()
}
```

**Step 3: Register module in lib.rs**

Add `pub mod related;` to `preprocessor/src/lib.rs`.

**Step 4: Add `related` to OutputMeta in output.rs**

Add `related: Vec<RelatedPost>` to `OutputMeta`. In the per-post loop, call:

```rust
let related = crate::related::find_related(index, graph, i);
```

And assign to `OutputMeta { ..., related }`.

**Step 5: Run tests**

Run: `cd preprocessor && cargo test`
Expected: All tests pass.

**Step 6: Update Astro types**

In `site/src/lib/types.ts`:

```ts
export interface RelatedPost {
  slug: string;
  title: string;
  tags: string[];
}

export interface PostMeta {
  // ... existing fields ...
  related: RelatedPost[];  // NEW
}
```

**Step 7: Create RelatedPosts.astro**

Create `site/src/components/RelatedPosts.astro`:

```astro
---
import { sanitizeTag } from "../lib/data";
import type { RelatedPost } from "../lib/types";

interface Props {
  related: RelatedPost[];
}

const { related } = Astro.props;
---

{related.length > 0 && (
  <section class="related-posts">
    <h2>관련 글</h2>
    <ul>
      {related.map((post) => (
        <li>
          <a href={`/posts/${post.slug}`}>{post.title}</a>
          <div class="related-tags">
            {post.tags.slice(0, 3).map((tag) => (
              <a href={`/tags/${sanitizeTag(tag)}`} class="post-tag">{tag}</a>
            ))}
          </div>
        </li>
      ))}
    </ul>
  </section>
)}

<style>
  .related-posts {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--c-border);
  }
  .related-posts h2 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: var(--c-text-muted);
  }
  .related-posts ul {
    list-style: none;
    padding: 0;
  }
  .related-posts li {
    margin-bottom: 0.6rem;
  }
  .related-tags {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.2rem;
  }
  .post-tag {
    background: var(--c-code-bg);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    font-size: 0.75rem;
    color: var(--c-text-muted);
  }
  .post-tag:hover {
    color: var(--c-accent);
    text-decoration: none;
  }
</style>
```

**Step 8: Render in PostLayout**

In `site/src/layouts/PostLayout.astro`, import and add below BacklinkList:

```astro
import RelatedPosts from "../components/RelatedPosts.astro";
```

```astro
<BacklinkList backlinks={meta.backlinks} />
<RelatedPosts related={meta.related} />
```

**Step 9: Build and verify**

Run: `cd site && npx astro build`
Expected: Posts show "관련 글" section with up to 3 related posts.

**Step 10: Commit**

```bash
git add preprocessor/src/related.rs preprocessor/src/lib.rs preprocessor/src/types.rs preprocessor/src/output.rs site/src/components/RelatedPosts.astro site/src/layouts/PostLayout.astro site/src/lib/types.ts
git commit -m "feat: add related posts section with hybrid scoring"
```

---

### Task 8: CloudFront Analytics (Access Logs)

**Files:**
- Modify: `infra/main.tf`

**Step 1: Add logging S3 bucket**

In `infra/main.tf`, add after the site bucket:

```hcl
# ── CloudFront Access Logs ──

resource "aws_s3_bucket" "cf_logs" {
  bucket = "${var.bucket_name}-cf-logs"
}

resource "aws_s3_bucket_lifecycle_configuration" "cf_logs" {
  bucket = aws_s3_bucket.cf_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"
    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "cf_logs" {
  bucket = aws_s3_bucket.cf_logs.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "cf_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.cf_logs]
  bucket     = aws_s3_bucket.cf_logs.id
  acl        = "log-delivery-write"
}
```

**Step 2: Enable logging on CloudFront distribution**

In the `aws_cloudfront_distribution.site` resource, add inside the resource block:

```hcl
  logging_config {
    bucket          = aws_s3_bucket.cf_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cf-logs/"
  }
```

**Step 3: Plan and verify**

Run: `cd infra && AWS_PROFILE=mfa terraform plan`
Expected: Shows creation of log bucket + modification of CloudFront distribution.

**Step 4: Commit (do not apply — requires manual review)**

```bash
git add infra/main.tf
git commit -m "feat: add CloudFront access logging to S3 with 90-day retention"
```

Note: `terraform apply` should be run manually after reviewing the plan.

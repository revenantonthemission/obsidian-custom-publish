# obsidian-blog (obsidian-press)

Obsidian Publish replacement: Rust preprocessor + Astro static site.
Live at https://rvnnt.dev

## Architecture
- `preprocessor/` — Rust CLI, 5-pass pipeline (scan → link → transform → search → output)
- `site/` — Astro 6 + Preact islands, consumes `content/` from preprocessor
- `infra/` — Terraform for S3 + CloudFront
- `content/` — generated, gitignored

## Build Commands
- `just preprocess` — run preprocessor against vault (copies search-index.json + graph.json to site/public/)
- `just build` — preprocess + astro build
- `just test` — cargo test in preprocessor/
- `cd site && npx astro build` — build site only (bun not in PATH, use npm/npx)
- `cd site && npx astro dev` — dev server

## Vault Path
`/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault`
Note: iCloud path uses tildes (`iCloud~md~obsidian`), not dots.

## AWS
- Profile: `mfa` (use `AWS_PROFILE=mfa` for all aws/terraform commands)
- S3: `obsidian-custom-s3`, CloudFront: `E35HZFVGD0OJ04`
- ACM cert in us-east-1, domain DNS on Cloudflare

## Git Flow
- Feature branches per phase off `develop`, `--no-ff` merges back
- Never pile multiple phases on one feature branch

## Rust Gotchas
- `Vec::dedup()` only removes consecutive duplicates — always `sort()` first
- lindera token field is `surface`, not `text`; feature is `embed-ko-dic`
- Compile regexes with `LazyLock`, not inside functions

## Astro Gotchas
- Preprocessor outputs raw HTML (callout divs, wikilink anchors) — `rehype-raw` is required in the unified pipeline
- KaTeX set to `strict: false` for Korean text in math blocks
- Tags may contain `/` — sanitized to `-` via `sanitizeTag()` in `data.ts`
- Korean filenames produce slugs with special chars — slugify strips non-alphanumeric except Korean + hyphens

## Testing
- 27 Rust integration tests using `fixtures/vault/` (8 test markdown files)
- Tests run against real fixture data, not mocks
- `cargo test` from `preprocessor/` directory (tests use relative path `../fixtures/vault`)

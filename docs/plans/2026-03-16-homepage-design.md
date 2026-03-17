# Homepage = Passion Project.md Design

## Summary

Replace the current index page (hub cards + post list) with the rendered content of `Passion Project.md`. The "이번주에 작성된 포스트" section is dynamically replaced with recent posts at build time.

## How It Works

1. `index.astro` loads the Passion Project post by slug (`passion-project`)
2. Renders it through the unified pipeline (remark/rehype/Shiki/KaTeX)
3. Splits the rendered HTML at the "이번주에 작성된 포스트" `<h2>` heading
4. Replaces everything between that heading and the next `<h2>` with dynamically generated PostCards (most recent 20 non-hub posts)
5. Outputs the rest of the content as-is (welcome callout, portfolio links, hub category links)

## What renders from the note

- Welcome callout (quote block)
- Attention callout (Korean note about updates)
- Portfolio section with external links
- Hub category links (wikilinks → anchor tags via preprocessor)

## What is dynamically generated

- The "이번주에 작성된 포스트" section content — replaced with actual recent posts

## Files

- Modify: `site/src/pages/index.astro`
- No preprocessor changes needed

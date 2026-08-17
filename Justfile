vault    := env("VAULT_PATH", "./fixtures/vault")
content  := "./content"
site_dir := "./site"
web_root := env("WEB_ROOT", env("HOME") / "Sites/obsidian-blog")

# deploy publishes the real vault (dev/test recipes keep the fixtures default)
publish_vault   := env("VAULT_PATH", env("HOME") / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Areas/Notes")
puppeteer_chrome := env("PUPPETEER_EXECUTABLE_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

build: preprocess site-build

preprocess:
    cargo run --release --manifest-path preprocessor/Cargo.toml -- "{{vault}}" {{content}}
    cp {{content}}/search-index.json {{site_dir}}/public/search-index.json
    cp {{content}}/graph.json {{site_dir}}/public/graph.json
    cp {{content}}/previews.json {{site_dir}}/public/previews.json
    cp {{content}}/nav-tree.json {{site_dir}}/public/nav-tree.json
    mkdir -p {{site_dir}}/public/assets
    cp -r {{content}}/assets/* {{site_dir}}/public/assets/ 2>/dev/null || true

dev: preprocess
    cd {{site_dir}} && npx astro dev

site-build:
    cd {{site_dir}} && npx astro build

deploy: deploy-preprocess site-build
    mkdir -p "{{web_root}}"
    rsync -a --delete {{site_dir}}/dist/ "{{web_root}}/"

# Foreground run of the local server (launchd runs the same script as dev.rvnnt.blog)
serve:
    node {{site_dir}}/scripts/local-server.mjs "{{web_root}}"

deploy-preprocess:
    PUPPETEER_EXECUTABLE_PATH="{{puppeteer_chrome}}" cargo run --release --manifest-path preprocessor/Cargo.toml -- --stamp-published "{{publish_vault}}" {{content}}
    cp {{content}}/search-index.json {{site_dir}}/public/search-index.json
    cp {{content}}/graph.json {{site_dir}}/public/graph.json
    cp {{content}}/previews.json {{site_dir}}/public/previews.json
    cp {{content}}/nav-tree.json {{site_dir}}/public/nav-tree.json
    mkdir -p {{site_dir}}/public/assets
    cp -r {{content}}/assets/* {{site_dir}}/public/assets/ 2>/dev/null || true

test:
    cd preprocessor && cargo test

# U3 cross-unit gate (LC-U3-06/07). Lives here, not in site/package.json:
# that file is a review subject — any edit moves the accessibility-record
# digest and fails test:e2e closed. Requires an existing site build.
crossunit:
    cd {{site_dir}} && node scripts/crossunit/link-sweep.mjs && npx playwright test --config playwright.crossunit.config.ts

d2-watch file:
    d2 --watch {{file}}

typst-render file out:
    typst compile {{file}} {{out}}

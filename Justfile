vault       := env("VAULT_PATH", "./fixtures/vault")
content     := "./content"
site_dir    := "./site"

build: preprocess site-build

preprocess:
    cargo run --release --manifest-path preprocessor/Cargo.toml -- {{vault}} {{content}}

dev: preprocess
    cd {{site_dir}} && bun run astro dev

site-build:
    cd {{site_dir}} && bun run astro build

deploy: build
    aws s3 sync {{site_dir}}/dist/ s3://$S3_BUCKET --delete
    aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

test:
    cd preprocessor && cargo test

d2-watch file:
    d2 --watch {{file}}

typst-render file out:
    typst compile {{file}} {{out}}

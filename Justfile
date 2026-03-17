vault       := env("VAULT_PATH", "./fixtures/vault")
content     := "./content"
site_dir    := "./site"
aws_profile := env("AWS_PROFILE", "mfa")
s3_bucket   := env("S3_BUCKET", "obsidian-custom-s3")
cf_dist_id  := env("CF_DIST_ID", "E35HZFVGD0OJ04")

build: preprocess site-build

preprocess:
    rm -rf {{content}}/posts {{content}}/meta {{content}}/assets
    cargo run --release --manifest-path preprocessor/Cargo.toml -- {{vault}} {{content}}
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

deploy: build
    AWS_PROFILE={{aws_profile}} aws s3 sync {{site_dir}}/dist/ s3://{{s3_bucket}} --delete
    AWS_PROFILE={{aws_profile}} aws cloudfront create-invalidation --distribution-id {{cf_dist_id}} --paths "/*"

test:
    cd preprocessor && cargo test

d2-watch file:
    d2 --watch {{file}}

typst-render file out:
    typst compile {{file}} {{out}}

pipeline {
    agent any

    triggers {
        cron('H 0 * * *')
    }

    parameters {
        booleanParam(
            name: 'RUN_DEPLOY',
            defaultValue: true,
            description: 'Uncheck for a validation-only run: every build and test stage executes, Deploy is skipped (ST-E04).'
        )
    }

    environment {
        WEB_ROOT      = "${env.BLOG_WEB_ROOT ?: '/Users/revenantonthemission/Sites/obsidian-blog'}"
        VAULT_PATH    = "${env.OBSIDIAN_VAULT_PATH ?: '/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Areas/Notes'}"
        // Site pages (U1 BR7.1): read only, never stamped. Until the owner
        // creates the folder, Preprocess prints a "not found" notice and goes on.
        PAGES_PATH    = "${env.OBSIDIAN_PAGES_PATH ?: '/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Areas/Pages'}"
        // mmdc renders Mermaid through puppeteer, which needs a browser. The
        // local checkout supplies one via `.puppeteer-config.json`, but that
        // file is gitignored, so a CI workspace never receives it and every
        // diagram failed silently while the build still went green. Naming the
        // browser here is something a fresh checkout can actually rely on.
        PUPPETEER_EXECUTABLE_PATH = "${env.PUPPETEER_EXECUTABLE_PATH ?: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}"
        CARGO_HOME    = "${WORKSPACE}/.cargo"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            parallel {
                stage('npm ci') {
                    steps {
                        // The workspace persists between runs. The font
                        // materializer fails closed on generated output that a
                        // different materializer version wrote, so start every
                        // run from fresh .generated/ output, like node_modules.
                        sh 'cd site && rm -rf .generated && npm ci'
                    }
                }
                stage('cargo build') {
                    steps {
                        sh 'cargo build --release --manifest-path preprocessor/Cargo.toml'
                    }
                }
            }
        }

        stage('Verify') {
            steps {
                sh 'cargo test --release --manifest-path preprocessor/Cargo.toml'
                // A fresh workspace has no content/ before Preprocess, and the
                // isolated Astro build inside test:unit reads the posts and
                // search-index.json / nav-tree.json copied from site/public.
                // Materialize them from the fixture pair first (no vault
                // stamping), the same inputs as the local gate; the real
                // Preprocess stage overwrites them later.
                sh './preprocessor/target/release/obsidian-press ./fixtures/vault/Notes ./content --pages ./fixtures/vault/Pages'
                sh 'cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/'
                sh 'cd site && npm run test:unit && npm run test:pbt'
            }
            post {
                failure {
                    // proptest writes shrunk counterexamples as siblings of the
                    // test files; preserve them alongside the console log.
                    archiveArtifacts artifacts: 'preprocessor/tests/*.proptest-regressions', allowEmptyArchive: true
                }
            }
        }

        stage('Preprocess') {
            steps {
                // Prefer chrome-headless-shell over desktop Chrome: full Chrome
                // occasionally takes >30s to expose its CDP endpoint under
                // midnight load, which times out puppeteer inside mmdc (~134
                // launches per build: 67 mermaid blocks x 2 themes). The glob
                // survives browser version bumps; falls back to the env default
                // (desktop Chrome) if the shell is not installed.
                // Install/update: npx puppeteer browsers install chrome-headless-shell
                sh '''
                    CHS=$(ls -d "$HOME"/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | sort -V | tail -1)
                    export PUPPETEER_EXECUTABLE_PATH="${CHS:-$PUPPETEER_EXECUTABLE_PATH}"
                    ./preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content --pages "${PAGES_PATH}"
                '''
                sh 'cp content/search-index.json site/public/search-index.json'
                sh 'cp content/graph.json site/public/graph.json'
                sh 'cp content/previews.json site/public/previews.json'
                sh 'cp content/nav-tree.json site/public/nav-tree.json'
                // Replace, not add: a withdrawn post or page image must not be
                // redeployed (U1 infra R-02). One script for every caller.
                sh 'node site/scripts/sync-public-assets.mjs content/assets site/public/assets'
            }
        }

        stage('Build Site') {
            steps {
                sh 'cd site && npx astro build'
            }
        }

        stage('Deploy') {
            when {
                expression { params.RUN_DEPLOY }
            }
            steps {
                // Local publish: the launchd service (dev.rvnnt.blog) serves WEB_ROOT,
                // so a synced tree is live immediately — no invalidation step.
                // U3 (NFR5.25): the pages first, then the redirect table, from the
                // one script the Justfile deploy recipe calls too.
                sh 'bash site/scripts/publish-dist.sh site/dist "${WEB_ROOT}"'
                // F-7: H1/H2/H3 on both origins; failure maps to T1/T2 and recovers.
                sh 'node site/scripts/post-deploy-check.mjs'
            }
        }
    }

    post {
        success { echo 'Blog deployed successfully.' }
        failure { echo 'Build or deploy failed.' }
    }
}

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
                        sh 'cd site && npm ci'
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
                // A fresh workspace has no content/ before Preprocess; the U1
                // isolated build inside test:unit fails closed at HP001 without
                // a homepage artifact, and the isolated Astro build reads
                // search-index.json / nav-tree.json copied from site/public.
                // Materialize them from the fixture vault first (no vault
                // stamping); the real Preprocess stage overwrites them later.
                sh './preprocessor/target/release/obsidian-press ./fixtures/vault ./content'
                sh 'cp content/search-index.json content/graph.json content/previews.json content/nav-tree.json site/public/'
                // The fixture materializer writes only when absent, so real
                // preprocessor output always wins.
                sh 'cd site && node scripts/crossunit/ensure-fixture-content.mjs && npm run test:unit && npm run test:pbt'
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
                sh './preprocessor/target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content'
                sh 'cp content/search-index.json site/public/search-index.json'
                sh 'cp content/graph.json site/public/graph.json'
                sh 'cp content/previews.json site/public/previews.json'
                sh 'cp content/nav-tree.json site/public/nav-tree.json'
                sh 'mkdir -p site/public/assets'
                sh 'cp -r content/assets/* site/public/assets/ 2>/dev/null || true'
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
                sh 'mkdir -p "${WEB_ROOT}"'
                sh 'rsync -a --delete site/dist/ "${WEB_ROOT}/"'
            }
        }
    }

    post {
        success { echo 'Blog deployed successfully.' }
        failure { echo 'Build or deploy failed.' }
    }
}

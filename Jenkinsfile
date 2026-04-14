pipeline {
    agent any

    triggers {
        cron('H 0 * * *')
    }

    environment {
        AWS_REGION    = 'ap-northeast-2'
        AWS_PROFILE   = 'mfa'
        S3_BUCKET     = 'obsidian-custom-s3'
        CF_DIST_ID    = 'E35HZFVGD0OJ04'
        VAULT_PATH    = "${env.OBSIDIAN_VAULT_PATH ?: '/Users/revenantonthemission/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Areas/Notes'}"
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
                        sh 'cargo build --release -p obsidian-press'
                    }
                }
            }
        }

        stage('Preprocess') {
            steps {
                sh 'rm -rf content/posts content/meta content/assets'
                sh './target/release/obsidian-press --stamp-published "${VAULT_PATH}" ./content'
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
            steps {
                sh 'aws sts get-caller-identity > /dev/null 2>&1 || (echo "ERROR: AWS credentials expired or invalid" && exit 1)'
                sh "aws s3 sync site/dist/ s3://${S3_BUCKET} --delete"
                sh "aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths '/*'"
            }
        }
    }

    post {
        success { echo 'Blog deployed successfully.' }
        failure { echo 'Build or deploy failed.' }
    }
}

pipeline {
    agent {
        docker {
            image 'rust:latest'
            args '-v $HOME/.cargo/registry:/usr/local/cargo/registry'
        }
    }

    environment {
        AWS_REGION  = 'ap-northeast-2'
        S3_BUCKET   = credentials('s3-blog-bucket')
        CF_DIST_ID  = credentials('cloudfront-dist-id')
        VAULT_PATH  = './vault'
    }

    tools {
        nodejs 'node-22'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Tools') {
            steps {
                sh '''
                    curl -fsSL https://d2lang.com/install.sh | sh -s --
                    curl -fsSL https://bun.sh/install | bash
                    export PATH="$HOME/.bun/bin:$PATH"
                    cd site && bun install
                '''
            }
        }

        stage('Preprocess') {
            steps {
                sh 'cargo build --release -p obsidian-press'
                sh './target/release/obsidian-press ${VAULT_PATH} ./content'
                sh 'cp content/search-index.json site/public/search-index.json'
                sh 'cp content/graph.json site/public/graph.json'
            }
        }

        stage('Build Site') {
            steps {
                sh '''
                    export PATH="$HOME/.bun/bin:$PATH"
                    cd site && bun run astro build
                '''
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                withAWS(credentials: 'aws-blog-deploy', region: "${AWS_REGION}") {
                    sh "aws s3 sync site/dist/ s3://${S3_BUCKET} --delete"
                    sh "aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths '/*'"
                }
            }
        }
    }

    post {
        success { echo 'Blog deployed successfully.' }
        failure { echo 'Build or deploy failed.' }
    }
}

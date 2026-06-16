pipeline {
    agent any

    environment {
        DOCKERHUB_CREDS  = credentials('dockerhub-creds')   // add in Jenkins credentials
        DOCKERHUB_USER   = "${DOCKERHUB_CREDS_USR}"
        IMAGE_BACKEND    = "${DOCKERHUB_USER}/statuspulse-backend"
        IMAGE_FRONTEND   = "${DOCKERHUB_USER}/statuspulse-frontend"
        IMAGE_TAG        = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Code checked out — build #${BUILD_NUMBER}"
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        pip install -r requirements.txt --quiet
                        pip install pytest --quiet
                        pytest test_app.py -v
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG} ./backend"
                        sh "docker tag ${IMAGE_BACKEND}:${IMAGE_TAG} ${IMAGE_BACKEND}:latest"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} ./frontend"
                        sh "docker tag ${IMAGE_FRONTEND}:${IMAGE_TAG} ${IMAGE_FRONTEND}:latest"
                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                sh "echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_USER} --password-stdin"
                sh "docker push ${IMAGE_BACKEND}:${IMAGE_TAG}"
                sh "docker push ${IMAGE_BACKEND}:latest"
                sh "docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}"
                sh "docker push ${IMAGE_FRONTEND}:latest"
            }
        }

        stage('Deploy to Minikube') {
            steps {
                sh '''
                    sed -i "s|IMAGE_TAG|${IMAGE_TAG}|g" k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
                    sed -i "s|DOCKERHUB_USER|${DOCKERHUB_USER}|g" k8s/backend-deployment.yaml k8s/frontend-deployment.yaml

                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/postgres-statefulset.yaml -n statuspulse
                    kubectl apply -f k8s/backend-deployment.yaml -n statuspulse
                    kubectl apply -f k8s/frontend-deployment.yaml -n statuspulse
                    kubectl apply -f k8s/prometheus-configmap.yaml -n statuspulse
                    kubectl apply -f k8s/monitoring.yaml -n statuspulse

                    kubectl rollout status deployment/statuspulse-backend  -n statuspulse --timeout=120s
                    kubectl rollout status deployment/statuspulse-frontend -n statuspulse --timeout=120s
                '''
            }
        }
    }

    post {
        success {
            echo "🚀 StatusPulse deployed successfully! Build #${BUILD_NUMBER}"
        }
        failure {
            echo "❌ Pipeline failed at stage. Check logs above."
        }
        always {
            sh "docker logout"
        }
    }
}

pipeline {
    agent any

    environment {
        DOCKERHUB_CREDS  = credentials('dockerhub-creds')   // add in Jenkins -> Credentials
        DOCKERHUB_USER   = "${DOCKERHUB_CREDS_USR}"
        IMAGE_BACKEND    = "${DOCKERHUB_USER}/statuspulse-backend"
        IMAGE_FRONTEND   = "${DOCKERHUB_USER}/statuspulse-frontend"
        IMAGE_TAG        = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/Star-codi/statuspulse.git'
                echo "Code checked out - build #${BUILD_NUMBER}"
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    bat '''
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
                        bat "docker build -t %IMAGE_BACKEND%:%IMAGE_TAG% .\\backend"
                        bat "docker tag %IMAGE_BACKEND%:%IMAGE_TAG% %IMAGE_BACKEND%:latest"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        bat "docker build -t %IMAGE_FRONTEND%:%IMAGE_TAG% .\\frontend"
                        bat "docker tag %IMAGE_FRONTEND%:%IMAGE_TAG% %IMAGE_FRONTEND%:latest"
                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                bat "echo %DOCKERHUB_CREDS_PSW%| docker login -u %DOCKERHUB_USER% --password-stdin"
                bat "docker push %IMAGE_BACKEND%:%IMAGE_TAG%"
                bat "docker push %IMAGE_BACKEND%:latest"
                bat "docker push %IMAGE_FRONTEND%:%IMAGE_TAG%"
                bat "docker push %IMAGE_FRONTEND%:latest"
            }
        }

        stage('Deploy to Minikube') {
            steps {
                bat '''
                    powershell -Command "(Get-Content k8s\\backend-deployment.yaml) -replace 'IMAGE_TAG', '%IMAGE_TAG%' -replace 'DOCKERHUB_USER', '%DOCKERHUB_USER%' | Set-Content k8s\\backend-deployment.yaml"
                    powershell -Command "(Get-Content k8s\\frontend-deployment.yaml) -replace 'IMAGE_TAG', '%IMAGE_TAG%' -replace 'DOCKERHUB_USER', '%DOCKERHUB_USER%' | Set-Content k8s\\frontend-deployment.yaml"

                    kubectl apply -f k8s\\namespace.yaml
                    kubectl apply -f k8s\\postgres-statefulset.yaml -n statuspulse
                    kubectl apply -f k8s\\backend-deployment.yaml -n statuspulse
                    kubectl apply -f k8s\\frontend-deployment.yaml -n statuspulse
                    kubectl apply -f k8s\\prometheus-configmap.yaml -n statuspulse
                    kubectl apply -f k8s\\monitoring.yaml -n statuspulse

                    kubectl rollout status deployment/statuspulse-backend -n statuspulse --timeout=120s
                    kubectl rollout status deployment/statuspulse-frontend -n statuspulse --timeout=120s
                '''
            }
        }
    }

    post {
        success {
            echo "StatusPulse deployed successfully! Build #${BUILD_NUMBER}"
        }
        failure {
            echo "Pipeline failed at stage. Check logs above."
        }
        always {
            bat "docker logout"
        }
    }
}

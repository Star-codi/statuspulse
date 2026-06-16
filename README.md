# ⚡ StatusPulse — Real-Time Service Health Tracker

A production-style 3-tier DevOps project built to showcase end-to-end CI/CD skills.

## 🏗️ Architecture

```
React (Nginx) ──► Flask API ──► PostgreSQL
                     │
               Prometheus /metrics
                     │
               Grafana Dashboards
```

## 🛠️ Tech Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | React + Vite + Nginx          |
| Backend    | Python Flask + SQLAlchemy     |
| Database   | PostgreSQL 15                 |
| CI/CD      | Jenkins + DockerHub           |
| Container  | Docker + Minikube (K8s)       |
| Monitoring | Prometheus + Grafana          |

---

## 🚀 Week 1 — Run Locally with Docker Compose

### Prerequisites
- Docker Desktop
- Node.js 20+ (for local frontend dev only)

### Start everything
```bash
docker compose up --build
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| Backend    | http://localhost:5000      |
| Prometheus | http://localhost:9090      |
| Grafana    | http://localhost:3001      |

Grafana login: `admin / admin`

### Run backend tests locally
```bash
cd backend
pip install -r requirements.txt pytest
pytest test_app.py -v
```

---

## 📁 Project Structure

```
statuspulse/
├── frontend/
│   ├── src/App.jsx          # React UI
│   ├── Dockerfile           # Multi-stage build
│   └── nginx.conf           # SPA + API proxy
├── backend/
│   ├── app.py               # Flask API + /metrics
│   ├── test_app.py          # pytest tests
│   └── Dockerfile
├── k8s/                     # Kubernetes manifests (Week 3)
├── prometheus.yml           # Scrape config
├── docker-compose.yml       # Local dev
└── Jenkinsfile              # CI/CD pipeline (Week 2)
```

---

## 🎯 What This Project Demonstrates

- **Multi-stage Docker builds** (frontend: build → nginx)
- **Health checks** in docker-compose (postgres readiness)
- **Prometheus metrics** auto-exposed from Flask app
- **Parallel Jenkins stages** (build backend + frontend simultaneously)
- **Automated tests** before any Docker build
- **StatefulSet** for PostgreSQL in Kubernetes
- **Real failure simulation** — toggle a service down, watch Grafana react

---

## Week 2 — Jenkins CI/CD Setup

Coming soon: Jenkinsfile walkthrough, webhook config, DockerHub credentials setup.

## Week 3 — Kubernetes on Minikube

Coming soon: K8s manifests, namespace setup, service exposure, Prometheus on K8s.

## Week 4 — Grafana Dashboards + Alerting

Coming soon: Dashboard JSON, alert rules, demo failure scenarios.

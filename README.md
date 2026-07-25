# AI Task Processing Platform

A production-ready MERN + Python-worker platform where authenticated users
create AI processing tasks, run them asynchronously via a Redis queue, and
monitor status/logs/results in real time.

See `docs/architecture.pdf` for the full architecture write-up (scaling,
indexing, Redis recovery, staging/production deployment strategy).

## Stack

| Component | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend API | Node.js + Express |
| Background Worker | Python 3.12 |
| Database | MongoDB 7 |
| Queue | Redis 7 |
| Auth | JWT + bcrypt |
| Containerization | Docker (multi-stage, non-root) |
| Orchestration | Kubernetes (k3s-compatible) |
| GitOps | Argo CD |
| CI/CD | GitHub Actions |

## Repository layout

```
ai-task-platform/
├── backend/            Express API (auth, tasks, health checks)
├── worker/             Python worker (Redis consumer)
├── frontend/           React/Vite SPA
├── infra/
│   ├── k8s/            Base Kubernetes manifests
│   ├── overlays/        Kustomize overlays: staging/ and production/
│   └── argocd/          Argo CD Application manifests + setup notes
├── .github/workflows/   CI/CD pipeline (ci-cd.yml)
├── docs/                Architecture document (architecture.pdf)
└── docker-compose.yml   Local dev stack
```

> **Note on repo split:** the assignment asks for two separate repos
> (Application Repository + Infrastructure Repository). This project is
> laid out as a monorepo for ease of review; to submit as two repos,
> push everything **except** `infra/` as the Application Repository, and
> push the contents of `infra/` as its own Infrastructure Repository (see
> `infra/argocd/README.md` for the exact steps and where to update
> `repoURL` references).

## 1. Local development (Docker Compose)

Prerequisites: Docker + Docker Compose.

```bash
git clone <this-repo>
cd ai-task-platform

# Optional: override the dev JWT secret (a default is provided for local use only)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

docker compose up --build
```

This starts MongoDB, Redis, the backend API, one worker replica, and the
frontend. Once healthy:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health checks: http://localhost:5000/health/live, /health/ready

Scale workers locally to see queue processing spread across replicas:

```bash
docker compose up --scale worker=3
```

## 2. Running components individually (without Docker)

Requires Node.js 20+, Python 3.12+, a local MongoDB, and a local Redis.

**Backend**
```bash
cd backend
cp .env.example .env   # edit MONGO_URI/REDIS_HOST if not using localhost
npm install
npm run dev
```

**Worker**
```bash
cd worker
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 3. Using the app

1. Open the frontend, click **Sign up**, create an account.
2. On the dashboard, fill in a task title, input text, and pick an
   operation (Uppercase / Lowercase / Reverse String / Word Count).
3. Click **Run Task** — it's created as `pending`, queued to Redis, and
   the dashboard polls for status until the worker marks it
   `success`/`failed`.
4. Click **View** on any task to see its full input, result, and
   execution logs.

## 4. Deploying to Kubernetes (k3s or any cluster)

```bash
# Base manifests directly (single environment):
kubectl apply -k infra/k8s

# Or via an overlay (recommended — see docs/architecture.pdf §6):
kubectl apply -k infra/overlays/staging
kubectl apply -k infra/overlays/production
```

Before applying, replace the placeholders in `infra/k8s/02-secrets.yaml`
(JWT secret, Mongo credentials) and the `REPLACE_DOCKERHUB_USER` image
references in `05-backend.yaml`, `06-worker.yaml`, `07-frontend.yaml` (or
let CI/CD populate these automatically — see below).

Check rollout:
```bash
kubectl -n ai-task-platform get pods,svc,ingress
```

## 5. GitOps with Argo CD

Full install + registration steps: `infra/argocd/README.md`. Summary:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f infra/argocd/application-staging.yaml
kubectl apply -f infra/argocd/application-production.yaml
```

Both Applications have Auto Sync + self-heal enabled — once registered,
Argo CD continuously reconciles the cluster to match the Infrastructure
Repository, with no manual `argocd app sync` required.

## 6. CI/CD pipeline

`.github/workflows/ci-cd.yml` runs on every push/PR to `main`:

1. **Lint** — backend (ESLint) and frontend (ESLint).
2. **Build & push** — multi-stage Docker builds for all three images,
   pushed to Docker Hub tagged with both the commit SHA and `latest`
   (main-branch pushes only).
3. **Update infra repo** — checks out the Infrastructure Repository and
   bumps the production overlay's image tags to the new commit SHA,
   committing that change — which is what Argo CD's auto-sync then picks
   up and deploys.

Required repository secrets:

| Secret | Purpose |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `INFRA_REPO_PAT` | Fine-grained PAT with `contents:write` on the Infrastructure Repository only |

## 7. Security notes

- Passwords hashed with bcrypt (12 salt rounds).
- JWT-based auth on all task routes; tokens expire (default 1 day).
- `helmet` for standard security headers; `express-rate-limit` for
  per-IP rate limiting.
- No secrets committed to git — `.env.example` files only, and
  `infra/k8s/02-secrets.yaml` is a placeholder template (see the
  warning comment in that file).
- All containers run as a non-root user (see each `Dockerfile`).

## 8. API reference (summary)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| POST | `/api/tasks` | Bearer JWT | Create + enqueue a task |
| GET | `/api/tasks` | Bearer JWT | List current user's tasks |
| GET | `/api/tasks/:id` | Bearer JWT | Get one task (status/result/logs) |
| GET | `/health/live` | — | Liveness probe |
| GET | `/health/ready` | — | Readiness probe (checks Mongo connection) |

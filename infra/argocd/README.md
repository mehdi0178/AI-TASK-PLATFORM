# Argo CD Setup Notes

## Repository split (required by the assignment)

- **Application Repository** (this codebase minus `infra/`): `backend/`, `worker/`,
  `frontend/`, `.github/workflows/`. CI builds and pushes images from here.
- **Infrastructure Repository** (separate git repo): contains everything
  currently under `infra/` in this project -- `k8s/` (base manifests),
  `overlays/staging`, `overlays/production`, and `argocd/`. Argo CD only ever
  watches this repo.

To split them: create a new repo (e.g. `ai-task-platform-infra`), copy the
`infra/` folder's contents to its root, and push. Update `repoURL` in
`application-production.yaml` / `application-staging.yaml` accordingly.

## Installing Argo CD (k3s-compatible)

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl -n argocd get pods -w

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port-forward the API/UI locally
kubectl -n argocd port-forward svc/argocd-server 8080:443
# Visit https://localhost:8080  (user: admin, password from above)
```

## Registering the applications

```bash
kubectl apply -f infra/argocd/application-staging.yaml
kubectl apply -f infra/argocd/application-production.yaml
```

Both Applications have `syncPolicy.automated` set (Auto Sync + self-heal +
prune), so once applied, Argo CD continuously reconciles the cluster to
match the Infrastructure Repository with no manual `argocd app sync` needed.

## Dashboard screenshot (submission requirement)

Once the Applications above are synced and healthy, open the Argo CD UI
(`https://localhost:8080` via the port-forward above, or your ingress-exposed
URL) and screenshot the Applications view showing both `ai-task-platform-staging`
and `ai-task-platform-production` in a **Synced** / **Healthy** state.

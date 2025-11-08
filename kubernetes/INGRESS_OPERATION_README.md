Ingress on kind — Accessing pods through an Ingress controller
===============================================================

This document explains how to expose a pod/service through an Ingress controller on a local kind cluster. It contains copy-pasteable steps, manifests, and troubleshooting tips for Windows and Unix-like hosts.

1) Create / verify a kind cluster

```bash
# list clusters
kind get clusters
# (if missing) create one
kind create cluster --name kind
```

2) Install ingress-nginx (kind-specific manifest)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/kind/deploy.yaml

# wait for controller to become ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

Notes:
- The `provider/kind` manifest configures hostPort/NodePort so the controller listens on the node's port 80/443. This enables `localhost` access.

3) Sample app + Service (already in this repo as deployment/service; example below)

```yaml
# example: deployment + service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tictactoe
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tictactoe
  template:
    metadata:
      labels:
        app: tictactoe
    spec:
      containers:
      - name: tictactoe
        image: nginx:stable-alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: tictactoe-svc
spec:
  selector:
    app: tictactoe
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

Apply:

```bash
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
```

4) Ingress resource (example)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tictactoe-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: tic-tac-toe.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tictactoe-svc
            port:
              number: 80
```

Apply:

```bash
kubectl apply -f kubernetes/ingress.yaml
kubectl get ingress
kubectl describe ingress tictactoe-ingress
```

5) Map hostname to localhost

- Windows (PowerShell, run as Administrator):

```powershell
Add-Content -Path 'C:\Windows\System32\drivers\etc\hosts' -Value "127.0.0.1 tic-tac-toe.example.com"
```

- Linux/macOS:

```bash
sudo -- sh -c "echo '127.0.0.1 tic-tac-toe.example.com' >> /etc/hosts"
```

If you see permission errors on Windows, open PowerShell as Administrator.

6) Test access

```bash
curl -v http://tic-tac-toe.example.com/
```

Expected: response from the pod (nginx default page or your application)

---

Troubleshooting
---------------

- Controller not ready or host port in use:
  - Check controller pods and service:

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

  - If port 80 on the host is already occupied, the hostPort cannot bind. Options:
    - Use the controller's NodePort and pass Host header:

```bash
# find nodePort
kubectl get svc -n ingress-nginx
# then
curl -H "Host: tic-tac-toe.example.com" http://127.0.0.1:<NODE_PORT>/
```

    - Or port-forward the controller service as a quick workaround:

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
# then
curl -H "Host: tic-tac-toe.example.com" http://127.0.0.1:8080/
```

- Ingress exists but returns 404/502:

```bash
kubectl describe ingress tictactoe-ingress
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail 200
kubectl get events -n ingress-nginx --sort-by='.lastTimestamp'
```

- Service/Endpoints issues:

```bash
kubectl get svc tictactoe-svc -o wide
kubectl get endpoints tictactoe-svc -o yaml
kubectl get pods -l app=tictactoe -o wide
kubectl logs -l app=tictactoe
```

Notes for CI
------------

- Ensure image names are lowercase when tagging/pushing (registries require lowercase repository names).
- If CI updates manifests, pass the exact image tag (e.g., `image_ref`) from the build job into the deployment update job to avoid mismatches.

Extras
------

If you want, I can:
- Add a `kind` cluster config that maps different host ports or reserves hostPort.
- Add a small PowerShell script to add/remove the hosts entry (must be run as Administrator).
- Commit example manifests (`ingress.yaml`) specifically tailored for kind.

Tell me which of the extras you'd like and I will add it to the repo.

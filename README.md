# Nimbus Coffee — coming soon

Starter for apps built by the Orbit AI Dev Team and deployed with Coolify on the Oracle server.

## Contract every app keeps

| Rule | Why |
|---|---|
| Listens on `PORT` (default 3000), host `0.0.0.0` | Coolify/Traefik routes to it |
| `GET /health` returns 200 when healthy | Docker healthcheck and deploy verification |
| Config only from env vars: `PORT`, `MONGODB_URI`, `MONGODB_DB` (see `.env.example`) | Secrets live in Coolify, never in git |
| `Dockerfile` at repo root | Coolify builds it on the ARM server |
| `npm run lint` and `npm test` pass | CI gate before deploy |

## API

- `GET /health` → always `200 {"status":"ok","db":"up"|"down"}` while the process is alive.
- `POST /api/subscribe` `{ "email": "..." }` (JSON, ≤10kb; email trimmed + lowercased)
  - `201 {"ok":true,"status":"subscribed"}` new
  - `200 {"ok":true,"status":"already_subscribed"}` duplicate
  - `400 {"ok":false,"error":"invalid_email"}`
  - `429 {"ok":false,"error":"rate_limited"}` (20 req/min/IP, in-memory)
  - `503 {"ok":false,"error":"unavailable"}` DB unreachable

Signups live in the `signups` collection; unique index `uniq_email` on `email` is created idempotently at startup (and lazily on first request if the DB was down at boot).

## Run locally

```bash
npm ci
npm run lint
npm test
npm start          # http://localhost:3000
```

## CI/CD

`.github/workflows/ci.yml` runs lint and tests, then a Docker build. On `main` it then calls the Coolify deploy API. That last step needs:

- repo **variable** `COOLIFY_APP_UUID`
- repo **secrets** `COOLIFY_API_URL` and `COOLIFY_DEPLOY_TOKEN`

Without them, the deploy step is skipped.

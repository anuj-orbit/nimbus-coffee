# PLAN: Nimbus Coffee — Coming Soon Page

## 1. Goal
Ship a single-page "coming soon" site for Nimbus Coffee with a branded, responsive design and an email signup form. Submitted emails are stored in MongoDB. Must conform to the `anuj-orbit/app-template` contract:
- Node 22 + Express
- `PORT` env var
- `GET /health`
- env-only config (no secrets in repo)
- root `Dockerfile`
- `npm run lint` and `npm test` both pass

## 2. Pages & Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Static coming-soon page (`public/index.html`) |
| GET | `/static/*` (served from `public/`) | CSS, JS, SVG assets |
| GET | `/health` | `200 {"status":"ok"}`; includes `db: "up"/"down"` but always 200 if process is alive |
| POST | `/api/subscribe` | Body `{ "email": "..." }` |

### POST /api/subscribe contract
- Content-Type: `application/json`; body limit 10kb.
- Normalize: trim + lowercase. Validate with a pragmatic regex and length ≤ 254.
- `201 {"ok":true,"status":"subscribed"}` on new insert.
- `200 {"ok":true,"status":"already_subscribed"}` on duplicate (idempotent; no error, no email-existence leak beyond this).
- `400 {"ok":false,"error":"invalid_email"}` on bad input.
- `429` via basic rate limit (e.g. 20 req/min/IP, in-memory).
- `503 {"ok":false,"error":"unavailable"}` if DB unreachable. Never expose stack traces.
- Implementation: `updateOne({email}, {$setOnInsert:{email, createdAt: new Date()}}, {upsert:true})`; `upsertedCount` decides 201 vs 200. A duplicate-key error (11000) from a race is treated as the 200 case.

### Environment config (env-only)
- `PORT` (default 3000)
- `MONGODB_URI` (per-app DB + user, provisioned via db-provision)
- `MONGODB_DB` (optional; otherwise parsed from the URI)
- `NODE_ENV`

## 3. Data Model
Database: dedicated per-app DB (provisioned). Collection: `signups`.

```json
{
  "_id": "ObjectId",
  "email": "string (lowercased, trimmed, unique)",
  "createdAt": "Date"
}
```
Indexes (created idempotently at startup):
- `{ email: 1 }` — **unique**, name `uniq_email`.
- `{ createdAt: -1 }` — optional, for listing and export.

## 4. Design Direction
- Brand: Nimbus Coffee. "Cloud + coffee": soft, warm, airy.
- Palette: cream `#FFF8EE`, foam white `#FFFFFF`, latte `#E9D5BA`, roast brown `#4A2E1F`, caramel accent `#C98B4B`, sky mist `#DCEAF5`.
- Type: a rounded or serif display face (e.g. Fraunces) with Inter/system sans for body. Use self-hosted or system fallbacks (no hard dependency on third-party CDNs).
- Hero: inline SVG cloud-shaped coffee cup with steam, soft gradient background, slow floating CSS clouds (disabled under `prefers-reduced-motion`).
- Content: logo/wordmark, headline ("Something warm is brewing."), subcopy, email form, small footer.
- Responsive: mobile-first, fluid type with `clamp()`, tested at 320, 375, 768, 1280 px.
- Accessibility: semantic HTML, labelled input, `aria-live` status region, visible focus, AA contrast, `lang`, meta description and OG tags.

### Client behavior
- Validate on submit and on blur (HTML5 `type=email` plus a regex check). Show an inline error message.
- Button shows a loading state and is disabled while the request is in flight.
- Success (201 or 200): friendly message ("You're on the list ☁️"). Duplicates get the same warm message.
- Errors: an invalid-email message, a network/503 "Something went wrong, please try again" message with the input retained, and a 429 "slow down" message.

## 5. Areas, Team Sizing, File Ownership
Team: **1 planner (done) + 2 leaders, 1 worker each (2 workers), + 1 reviewer**. Small app; two areas, no overlap in files.

### Area A — Backend & Platform (Leader A, 1 worker)
Owns (exclusive):
- `package.json`, `package-lock.json`
- `server.js`
- `src/**` (`app.js`, `db.js`, `routes/subscribe.js`, `validate.js`, `rateLimit.js`)
- `test/**`
- `Dockerfile`, `.dockerignore`
- `.eslintrc.*` / `eslint.config.js`
- `.env.example`, `.gitignore`
- `README.md`

Notes: `src/app.js` exports the Express app (no listen) for testing. It serves `public/` statically with `/` → `public/index.html`. Use the official `mongodb` driver and `express`. Dev dependencies: `eslint` and the Node test runner or `supertest` (use `mongodb-memory-server` or a stubbed DB module for tests so tests need no live DB).

### Area B — Frontend & Design (Leader B, 1 worker)
Owns (exclusive):
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/assets/**` (SVG logo, cloud cup illustration, favicon, og-image)

Notes: no build step, plain HTML/CSS/JS. Must call `POST /api/subscribe` per the contract in §2. Leader B must not edit anything outside `public/`.

### Integration (Leader A after both areas merge)
Verify the end-to-end flow against a real or ephemeral MongoDB and the Docker build.

## 6. Acceptance Criteria

### Area A — Backend
- [ ] `npm ci && npm run lint && npm test` exit 0.
- [ ] `GET /health` → 200 JSON; the process starts without a DB and serves `/health` and `/`.
- [ ] Server reads `PORT` from env; no hardcoded secrets; `.env.example` lists all vars.
- [ ] `POST /api/subscribe`: valid email → 201; the same email again (also with different case or whitespace) → 200 `already_subscribed`; exactly one document is stored.
- [ ] Invalid email (missing, non-string, malformed, >254 chars) → 400; the DB is not touched.
- [ ] Concurrent identical requests (parallel test) result in one document and no 500.
- [ ] Unique index `uniq_email` exists after startup (test or script check).
- [ ] DB down → 503 JSON, process stays alive.
- [ ] Docker: `docker build .` succeeds; the container runs as non-root; `docker run -e PORT=8080 ...` serves `/health`.
- [ ] Tests cover validation, a duplicate, an invalid email, a rate limit, and a health check.

### Area B — Frontend
- [ ] `/` renders with no console errors and no external-network requirements (fonts fall back gracefully).
- [ ] Layout has no horizontal scroll at 320 px; looks intentional at 375 / 768 / 1280.
- [ ] Empty or invalid email shows an inline accessible error without sending a request.
- [ ] Submit shows a loading state, then a success message for 201 and 200 alike; a failure shows an error message, and the input and form stay usable.
- [ ] Keyboard-only flow works; screen-reader announcements via `aria-live`; contrast meets WCAG AA.
- [ ] `prefers-reduced-motion` disables the animations.
- [ ] Lighthouse (mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90 (if tooling is available; otherwise manual check).
- [ ] The page weighs under 300 KB total.

### Integration / Reviewer
- [ ] With a real MongoDB (provisioned per-app URI), submitting from the browser creates a `signups` document with `createdAt`; a resubmit shows success and creates no second document.
- [ ] Lint is clean across `public/**` if the lint config covers it.
- [ ] No file touched outside its owner's area (check via `git diff --stat` per area).

## 7. Execution Order
1. Provision the per-app MongoDB (db-provision) → `MONGODB_URI`.
2. Area A and Area B run in parallel (the API contract in §2 is the only coupling).
3. Merge, then integration check, then reviewer pass.
4. Deploy via the Coolify skill, with env vars set in Coolify (`MONGODB_URI`, `PORT`).

## 8. Cost Estimate (USD)
Assumptions: the paid "lead" tier for leaders, "worker-free" or cheap "worker" for workers, a free-tier reviewer.

| Item | Estimate |
|---|---|
| Planner (this plan) | $0.10 |
| Leader A (backend) | $0.40 |
| Worker A | $0.15 (free model; $0.40 if paid fallback) |
| Leader B (frontend/design) | $0.40 |
| Worker B | $0.20 (design-heavy; paid worker tier advisable) |
| Reviewer | $0.00 (free model) |
| Integration + one redo contingency | $0.50 |
| **Total (expected)** | **≈ $1.75** |
| Range | $1.00 – $3.00 |

Infrastructure: $0 incremental (shared MongoDB, existing Coolify host).

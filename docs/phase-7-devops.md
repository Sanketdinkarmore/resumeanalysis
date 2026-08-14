# Phase 7 — DevOps, queues, CI

Infrastructure and async processing after core product UI (Phase 6).

## Goal

Move from “works on my machine” to **repeatable builds**, **containerized services**, and **background jobs** for parsing/AI — without changing product behavior users rely on.

## Step order (do one at a time)

| Step | Focus | Status |
|---|---|---|
| **7.1** | GitHub Actions CI (typecheck, tests, builds) | **Done** |
| **7.2** | Dockerfiles for `api` + `web`; extend `docker-compose.yml` | **Done** |
| **7.3** | Redis + BullMQ worker — async resume/job parse | **Done** |
| **7.4** | Async match + interview generation (optional) | Not started |
| **7.5** | Deploy docs (AWS / single VPS) | Not started |

## 7.1 — CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

On every push/PR to `main` / `master`:

| Job | What it checks |
|---|---|
| **web** | `tsc --noEmit`, `vitest run` |
| **api** | `prisma generate`, `tsc` build |
| **ai** | `pip install`, FastAPI app import |
| **docker-ai** | `docker build` for `apps/ai/Dockerfile` |
| **docker-api** | `docker build` for `apps/api/Dockerfile` |
| **docker-web** | `docker build` for `apps/web/Dockerfile` |

## 7.2 — Docker

### Images

| App | Dockerfile |
|---|---|
| AI | [`apps/ai/Dockerfile`](../apps/ai/Dockerfile) |
| API | [`apps/api/Dockerfile`](../apps/api/Dockerfile) |
| Web | [`apps/web/Dockerfile`](../apps/web/Dockerfile) |

API container runs `prisma migrate deploy` on start, then `node dist/index.js`.

Web uses Next.js `output: 'standalone'` (see `apps/web/next.config.mjs`).

### Compose profiles

**Infra only** (same as before — for local `npm run dev` on api/web):

```bash
docker compose up -d
# postgres :5432, redis :6379, minio :9000, ai :8000
```

**Full stack in Docker** (api + web containers):

```bash
docker compose --profile app up -d --build
# + api :4000, web :3000
```

Open **http://localhost:3000** — browser calls API at **http://localhost:4000** (baked into web image via `NEXT_PUBLIC_API_URL`).

**Google sign-in:** put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env` (not committed). Compose loads that file into the `api` container; the button appears when `/auth/google/enabled` returns true.

### Service wiring (inside compose network)

| Env | Value in `api` container |
|---|---|
| `DATABASE_URL` | `postgresql://jri:jri@postgres:5432/jri` |
| `S3_ENDPOINT` | `http://minio:9000` |
| `AI_SERVICE_URL` | `http://ai:8000` |
| `CORS_ORIGIN` | `http://localhost:3000` |

### Build images locally (without compose)

```bash
docker build -t jri-api:local ./apps/api
docker build -t jri-web:local --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 ./apps/web
docker build -t jri-ai:local ./apps/ai
```

## 7.3 — Redis parse queue

Resume and job parsing run in a **background worker** (BullMQ + Redis), not in the HTTP request.

| Component | Path |
|---|---|
| Queue helpers | `apps/api/src/lib/queue.ts` |
| Parse logic | `apps/api/src/lib/parseService.ts` |
| Worker entry | `apps/api/src/worker.ts` |

Flow:

1. API upload/create → status `PROCESSING` → job enqueued
2. Worker pulls job → calls AI service → writes parsed data → `COMPLETED` or `FAILED`
3. Web lists already poll every 4s while parsing — no UI change

**Local dev (npm on host):**

```bash
docker compose up -d          # postgres, redis, minio, ai
cd apps/api && npm run dev    # terminal 1 — API
cd apps/api && npm run worker:dev   # terminal 2 — worker (required for parsing!)
```

**Docker full stack:**

```bash
docker compose --profile app up -d --build
# includes jri-worker container
```

Env: `REDIS_URL=redis://localhost:6379` (compose uses `redis://redis:6379` inside containers).

## Related docs

- [Architecture — queues & compose](./architecture.md)
- [Phase 5 backend](./phase-5-backend.md)

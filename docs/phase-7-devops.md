# Phase 7 — DevOps, queues, CI

Infrastructure and async processing after core product UI (Phase 6).

## Goal

Move from “works on my machine” to **repeatable builds**, **containerized services**, and **background jobs** for parsing/AI — without changing product behavior users rely on.

## Step order (do one at a time)

| Step | Focus | Status |
|---|---|---|
| **7.1** | GitHub Actions CI (typecheck, tests, builds) | **Done** |
| **7.2** | Dockerfiles for `api` + `web`; extend `docker-compose.yml` | Not started |
| **7.3** | Redis + BullMQ worker — async resume/job parse | Not started |
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

Local equivalent:

```bash
cd apps/web && npx tsc --noEmit && npm test
cd apps/api && npx prisma generate && npm run build
cd apps/ai && pip install -r requirements.txt && python -c "from app.main import app"
docker build -t jri-ai:local ./apps/ai
```

## 7.2 — Docker (next)

Target topology (matches [architecture.md](./architecture.md)):

| Service | Port | Notes |
|---|---|---|
| postgres | 5432 | Already in compose |
| redis | 6379 | Already in compose |
| minio | 9000 | Already in compose |
| ai | 8000 | Already in compose |
| **api** | 4000 | Add Dockerfile + compose service |
| **web** | 3000 | Add Dockerfile + compose service |

## 7.3 — Redis queues (after Docker)

Today parsing runs **inline** in API request handlers (see comment in `apps/api/src/routes/resumes.ts`).

Planned change:

1. API enqueues job → Redis (BullMQ)
2. Worker process picks up job → calls AI service → updates Prisma
3. Web already polls `PENDING` / `PROCESSING` — no UI change needed

Env: `REDIS_URL=redis://localhost:6379` (already available via compose).

## Infra already in repo

- [`docker-compose.yml`](../docker-compose.yml) — Postgres, Redis, MinIO, AI
- [`apps/ai/Dockerfile`](../apps/ai/Dockerfile) — AI service image

## Related docs

- [Architecture — queues & compose](./architecture.md)
- [Phase 5 backend](./phase-5-backend.md)

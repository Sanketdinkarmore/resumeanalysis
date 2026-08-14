# Phase 7.5 — Deploy

Honest deploy path for **this repo today**: one Linux VPS + Docker Compose (the stack already in [`docker-compose.yml`](../docker-compose.yml)).

We do **not** have Terraform / ECS / Kubernetes. AWS is listed at the end as a mapping when you outgrow a single box.

## What runs in production

| Container | Role | Browser-facing? |
|---|---|---|
| `jri-web` | Next.js UI | Yes — `:3000` (or 443 via reverse proxy) |
| `jri-api` | Express API + Prisma migrate on start | Yes — `:4000` (or 443 on `api.` host) |
| `jri-worker` | BullMQ parse worker | **No** |
| `jri-ai` | FastAPI parse / interview LLM | **No** (API + worker only) |
| `jri-postgres` | PostgreSQL | **No** |
| `jri-redis` | BullMQ | **No** |
| `jri-minio` | S3-compatible PDFs | **No** (swap to real S3 later) |

Browser talks **only** to web + api. FastAPI is internal.

```
User → https://app.example.com  (web)
     → https://api.example.com  (api)
api / worker → postgres, redis, minio, ai  (Docker network)
```

## Preconditions

- Docker Engine + Compose plugin on the host
- Git clone of this repo
- `apps/api/.env` and `apps/ai/.env` **on the server** (never commit them)
- A Groq and/or Gemini key if you want LLM interview (otherwise templates still work)
- Google Cloud OAuth client if you want “Continue with Google”

## 1. Secrets on the server

Copy examples, then **change every default secret**.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/ai/.env.example apps/ai/.env
```

### `apps/api/.env` — must change

| Variable | Local default | Production |
|---|---|---|
| `JWT_ACCESS_SECRET` | `local-dev-…` | Long random string (≥32 chars) |
| `JWT_REFRESH_SECRET` | `local-dev-…` | Different long random string |
| `INTERNAL_API_SECRET` | `local-dev-…` | Same value as `apps/ai/.env` |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://app.example.com` (no trailing slash) |
| `GOOGLE_REDIRECT_URI` | `http://localhost:4000/auth/google/callback` | `https://api.example.com/auth/google/callback` |
| `GOOGLE_CLIENT_ID` / `SECRET` | your keys | same keys; update Google Console URIs |

Compose **overrides** these when the process is inside Docker (see below). Keep host `.env` for OAuth + JWT secrets; Compose `environment:` wins for `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`, `AI_SERVICE_URL`.

### `apps/ai/.env` — LLM

| Variable | Purpose |
|---|---|
| `INTERNAL_API_SECRET` | Must match API |
| `GROQ_API_KEY` | Preferred interview LLM |
| `GEMINI_API_KEY` | Fallback LLM |

Compose loads this file into `jri-ai`. Rebuild/recreate the AI container after changing keys:

```bash
docker compose --profile app up -d --force-recreate ai
```

### Web API URL is baked at **build** time

`NEXT_PUBLIC_API_URL` is a Docker **build-arg**, not a runtime env var.

| Environment | Build arg |
|---|---|
| Local Docker | `http://localhost:4000` (default in compose) |
| VPS with public API | `https://api.example.com` |

If you change the public API URL, **rebuild web**:

```bash
docker compose --profile app build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com web
docker compose --profile app up -d web
```

## 2. Google Cloud Console (OAuth)

Authorized JavaScript origin:

- Local: `http://localhost:3000`
- Prod: `https://app.example.com`

Authorized redirect URI:

- Local: `http://localhost:4000/auth/google/callback`
- Prod: `https://api.example.com/auth/google/callback`

## 3. Bring the stack up

From the repo root on the VPS:

```bash
docker compose --profile app up -d --build
```

Check:

```bash
docker compose --profile app ps
curl -s http://127.0.0.1:4000/health
curl -s http://127.0.0.1:4000/auth/google/enabled
docker logs jri-worker --tail 20
```

`jri-api` should be **healthy**. `jri-worker` should log `Parse worker ready`.

**Do not skip the worker.** Without `jri-worker`, resume/job uploads stay on `PROCESSING`.

## 4. What Compose already wires (inside Docker)

These values in [`docker-compose.yml`](../docker-compose.yml) are correct **on the Docker network**. Do not point them at `localhost` inside containers.

| Service | Variable | Value |
|---|---|---|
| api, worker | `DATABASE_URL` | `postgresql://jri:jri@postgres:5432/jri?schema=public` |
| api, worker | `REDIS_URL` | `redis://redis:6379` |
| api, worker | `S3_ENDPOINT` | `http://minio:9000` |
| api, worker | `AI_SERVICE_URL` | `http://ai:8000` |

API runs `prisma migrate deploy` on every container start, then `node dist/index.js`.

## 5. HTTPS and domains (required for real users)

Publish **web + api** only. Postgres, Redis, MinIO, and AI should stay on the Docker network.

Simplest pattern: [Caddy](https://caddyserver.com/) on the host (auto TLS).

Example `Caddyfile`:

```
app.example.com {
  reverse_proxy 127.0.0.1:3000
}

api.example.com {
  reverse_proxy 127.0.0.1:4000
}
```

Then:

1. DNS A records for `app` and `api` → VPS IP
2. Rebuild web with `NEXT_PUBLIC_API_URL=https://api.example.com`
3. Set `CORS_ORIGIN=https://app.example.com` on api (override compose `environment` or edit compose)
4. Set `GOOGLE_REDIRECT_URI=https://api.example.com/auth/google/callback`

Firewall: allow 22, 80, 443. Do **not** open 5432, 6379, 9000, 8000 to the internet.

### Compose CORS override for production

Today compose hard-codes `CORS_ORIGIN: http://localhost:3000`. For a public domain, change that line in `docker-compose.yml` (or add a `docker-compose.override.yml` on the server) to `https://app.example.com`, then recreate api:

```bash
docker compose --profile app up -d --force-recreate api
```

## 6. Day-2 operations

```bash
# Logs
docker logs -f jri-api
docker logs -f jri-worker
docker logs -f jri-ai

# Rebuild after git pull
git pull
docker compose --profile app up -d --build

# Database backup (Postgres volume)
docker exec jri-postgres pg_dump -U jri jri > backup-$(date +%F).sql
```

Resume PDFs live in the MinIO volume `jri_minio_data`. Back that up too if you keep MinIO in prod.

## 7. Production hardening (do before sharing widely)

- Change Postgres password (`POSTGRES_PASSWORD` + `DATABASE_URL`) — compose still uses `jri`/`jri`
- Change MinIO root user/password + matching `S3_*` on api/worker
- Do not publish internal ports (`5432`, `6379`, `9000`, `9001`, `8000`) in a prod compose file
- Rotate Google client secret if it was ever pasted in chat
- Keep `.env` files out of git (`git status` before every commit)

## 8. AWS mapping (later — not automated)

When a single VPS is not enough, map services like this. **No IaC in this repo yet.**

| Compose service | AWS equivalent |
|---|---|
| `web` | ECS/Fargate or EC2 + Nginx, or Amplify/Vercel for UI only |
| `api` + `worker` | ECS tasks or EC2; worker is a second process/image command |
| `ai` | Private ECS service (no public ALB) |
| `postgres` | RDS PostgreSQL |
| `redis` | ElastiCache |
| `minio` | S3 bucket; set `S3_ENDPOINT` to AWS, `S3_FORCE_PATH_STYLE=false` |

Until then, Compose on one VPS is the supported deploy.

## Checklist

- [ ] `apps/api/.env` and `apps/ai/.env` exist on the host with real secrets
- [ ] `INTERNAL_API_SECRET` matches on API and AI
- [ ] Groq/Gemini keys in `apps/ai/.env` if you want LLM interview
- [ ] `docker compose --profile app up -d --build` — all containers up, api healthy
- [ ] `jri-worker` logs `Parse worker ready`
- [ ] Upload a resume → status becomes Completed (not stuck on Parsing)
- [ ] Google button: `/auth/google/enabled` is `{"enabled":true}`
- [ ] If using a domain: web rebuilt with public `NEXT_PUBLIC_API_URL`, CORS + OAuth URIs updated, TLS on 443

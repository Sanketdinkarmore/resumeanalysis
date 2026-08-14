# Phase 7.5 — Deploy (AWS EC2 + DuckDNS + Nginx)

This is the **supported** production path for Nextup — matching what we run live:

**[https://nextup-sanket.duckdns.org](https://nextup-sanket.duckdns.org)**

No Terraform / ECS / Kubernetes. One Ubuntu EC2, Docker Compose, Nginx, Let’s Encrypt, free DuckDNS hostname.

## Mental model

```
Browser
  → https://nextup-sanket.duckdns.org          (Nginx :443)
       → /           → jri-web  :3000
       → /api/...    → jri-api  :4000
  jri-worker / jri-ai / postgres / redis / minio  (Docker network only)
```

| Container | Role | Public? |
|---|---|---|
| `jri-web` | Next.js | Via Nginx `/` |
| `jri-api` | Express + migrations | Via Nginx `/api/` |
| `jri-worker` | BullMQ parse jobs | **No** |
| `jri-ai` | FastAPI | **No** |
| `jri-postgres` / `jri-redis` / `jri-minio` | Data | **No** |

**Local Docker Desktop** is only for development. The live site keeps running as long as the **EC2 instance** (and Compose stack) is up — you can close Docker on your laptop.

## One-time server setup (checklist)

1. **EC2** — Ubuntu 22.04/24.04, **≥4 GB RAM** (e.g. `t3.medium`), 30 GB disk  
2. **Security group** — inbound **22**, **80**, **443** only (not 3000/4000/5432 to the world)  
3. **Elastic IP** — associate so DuckDNS stays stable  
4. **SSH** — `ubuntu@<elastic-ip>` with your `.pem`  
5. **Docker** — Engine + Compose plugin; add `ubuntu` to `docker` group  
6. **Clone repo** — `git clone … && cd resumeanalysis`  
7. **Secrets** — `cp apps/api/.env.example apps/api/.env` (and AI); fill JWT, Google, Groq, matching `INTERNAL_API_SECRET`  
8. **DuckDNS** — subdomain → Elastic IP; optional `~/duckdns/duck.sh` cron (`OK` in log)  
9. **Compose** — `docker compose --profile app up -d --build`  
10. **Nginx** — proxy `/` → `:3000`, `/api/` → `:4000`  
11. **Certbot** — `sudo certbot --nginx -d yourname.duckdns.org`  
12. **Rebuild web** with  
    `NEXT_PUBLIC_API_URL=https://yourname.duckdns.org/api`  
13. **Compose overrides** — `CORS_ORIGIN=https://yourname.duckdns.org`,  
    `GOOGLE_REDIRECT_URI=https://yourname.duckdns.org/api/auth/google/callback`  
14. **Google Cloud Console** — JS origin + redirect URI matching step 13  

## Compose note (secrets)

`environment:` in `docker-compose.yml` **overrides** `env_file`. For production, either:

- Set real `JWT_*`, `INTERNAL_API_SECRET`, `CORS_ORIGIN`, `GOOGLE_REDIRECT_URI` in the compose `environment` blocks for **api / worker / ai**, or  
- Remove those overrides so values come only from `.env`

`INTERNAL_API_SECRET` must match on **api**, **worker**, and **ai**.  
**web** does not need JWT or the internal secret — only the build-arg `NEXT_PUBLIC_API_URL`.

## Nginx sketch (HTTP; Certbot adds TLS)

```nginx
server {
    listen 80;
    server_name nextup-sanket.duckdns.org;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Google OAuth (production)

| Setting | Value |
|---|---|
| JS origin | `https://nextup-sanket.duckdns.org` |
| Redirect URI | `https://nextup-sanket.duckdns.org/api/auth/google/callback` |

## Verify

```bash
curl -s https://nextup-sanket.duckdns.org/api/health
curl -s https://nextup-sanket.duckdns.org/api/auth/google/enabled
docker logs jri-worker --tail 20
```

- Health: `"status":"ok"`  
- Google: `"enabled":true`  
- Worker: `Parse worker ready`  
- `jri-worker` may show Docker **unhealthy** (healthcheck hits API `/health` on a process that doesn’t serve HTTP) — ignore if logs say ready  

## Day-2 ops

```bash
# After git pull
cd ~/resumeanalysis
git pull
docker compose --profile app up -d --build

# Logs
docker logs -f jri-api
docker logs -f jri-worker

# DB backup
docker exec jri-postgres pg_dump -U jri jri > backup-$(date +%F).sql
```

**Do not** run `docker compose down -v` unless you intend to wipe Postgres/MinIO volumes.

## Local vs production data

| Environment | Database |
|---|---|
| Laptop Docker / `npm run dev` | Local volumes only |
| EC2 live site | Server volumes only |

They do not sync. Re-create accounts/data on the live URL, or manually `pg_dump` / `scp` / restore if you need a copy.

## AWS mapping (later — optional)

| Today (Compose) | Later |
|---|---|
| Postgres on EC2 | RDS |
| Redis on EC2 | ElastiCache |
| MinIO on EC2 | S3 |
| Single EC2 | ECS/Fargate (only if you outgrow one box) |

Until then, **one EC2 + Compose + Nginx** is the intended interview/demo story.

## Related

- [phase-7-devops.md](./phase-7-devops.md) — CI, images, Redis queue  
- [architecture.md](./architecture.md) — system design  

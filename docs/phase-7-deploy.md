# Phase 7.5 — Deploy from scratch (AWS EC2 + DuckDNS + Nginx + CI/CD)

**Live:** [https://nextup-sanket.duckdns.org](https://nextup-sanket.duckdns.org)

Use this doc to **recreate the whole production stack** on a new AWS account / EC2 if Free Tier or limits force a rebuild. No Terraform / ECS / Kubernetes.

## Mental model

```
Browser
  → https://YOURNAME.duckdns.org          (Nginx :443)
       → /           → jri-web  :3000
       → /api/...    → jri-api  :4000
  jri-worker / jri-ai / postgres / redis / minio  (Docker network only)

GitHub push → CI (tests + image builds) → CD (SSH) → git reset + compose rebuild
```

| Container | Role | Public? |
|---|---|---|
| `jri-web` | Next.js | Via Nginx `/` |
| `jri-api` | Express + migrations | Via Nginx `/api/` |
| `jri-worker` | BullMQ parse jobs | **No** |
| `jri-ai` | FastAPI | **No** |
| `jri-postgres` / `jri-redis` / `jri-minio` | Data | **No** |

**Local Docker Desktop** is only for development. The live site runs on **EC2** only.

**Secrets never go in git.** On the server they live in:

- `~/resumeanalysis/.env` — compose substitutions (CORS, JWT, Google redirect, `NEXT_PUBLIC_API_URL`, `INTERNAL_API_SECRET`)
- `~/resumeanalysis/apps/api/.env` — Google client id/secret, etc.
- `~/resumeanalysis/apps/ai/.env` — Groq / Gemini + matching `INTERNAL_API_SECRET`

Template for the repo-root file: [`.env.example`](../.env.example).

---

## Part A — AWS EC2 (console)

1. **Region** — pick one and stick to it (e.g. `ap-south-1`).
2. **Launch instance**
   - Name: `nextup` (or similar)
   - AMI: **Ubuntu Server 22.04 or 24.04 LTS**
   - Type: **≥ 4 GB RAM** (e.g. `t3.medium` — `t2.micro` / 1 GB will OOM on Compose builds)
   - Key pair: create/download a `.pem` (keep it private; also used later for GitHub `EC2_SSH_KEY`)
   - Storage: **≥ 30 GB** gp3
3. **Security group** — inbound only:
   - **22** TCP from *your IP* (or temporarily `0.0.0.0/0` while setting up)
   - **80** TCP from `0.0.0.0/0`
   - **443** TCP from `0.0.0.0/0`
   - Do **not** open 3000 / 4000 / 5432 / 6379 / 8000 / 9000 to the world
4. **Elastic IP** — Allocate → Associate to this instance (so DuckDNS does not break on stop/start).
5. Note the **public IPv4** / Elastic IP.

SSH from your laptop (Windows PowerShell example):

```bash
ssh -i path\to\your-key.pem ubuntu@YOUR_ELASTIC_IP
```

---

## Part B — First login: Docker + git

```bash
sudo apt update && sudo apt upgrade -y

# Docker Engine + Compose plugin
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu
# log out and SSH back in so docker works without sudo
exit
```

SSH in again, then:

```bash
docker version
docker compose version

# clone (public HTTPS is fine)
cd ~
git clone https://github.com/Sanketdinkarmore/resumeanalysis.git
cd ~/resumeanalysis
```

---

## Part C — App secrets on the server

### C1 — API + AI env files

```bash
cd ~/resumeanalysis
cp apps/api/.env.example apps/api/.env
cp apps/ai/.env.example apps/ai/.env
nano apps/api/.env
nano apps/ai/.env
```

In **`apps/api/.env`** set at least:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- Any other keys your example file lists (S3 for local MinIO can stay compose defaults)

In **`apps/ai/.env`** set:

- `GROQ_API_KEY` and/or `GEMINI_API_KEY`
- `INTERNAL_API_SECRET` — **same value** you will put in repo-root `.env`

Generate strong secrets (run on EC2):

```bash
openssl rand -hex 32   # JWT access
openssl rand -hex 32   # JWT refresh
openssl rand -hex 32   # INTERNAL_API_SECRET
```

### C2 — Repo-root `.env` (required for Compose + CD)

This file is **gitignored**. Compose reads it for `${CORS_ORIGIN}`, JWT, Google redirect, web build URL, etc.

```bash
cd ~/resumeanalysis
nano .env
```

Paste (replace `YOURNAME` and the three secrets):

```bash
NEXT_PUBLIC_API_URL=https://YOURNAME.duckdns.org/api
CORS_ORIGIN=https://YOURNAME.duckdns.org
GOOGLE_REDIRECT_URI=https://YOURNAME.duckdns.org/api/auth/google/callback
JWT_ACCESS_SECRET=paste-openssl-output-1
JWT_REFRESH_SECRET=paste-openssl-output-2
INTERNAL_API_SECRET=paste-openssl-output-3
```

Confirm:

```bash
grep NEXT_PUBLIC_API_URL .env
grep CORS_ORIGIN .env
# never commit this file
git check-ignore -v .env
```

Also set the **same** `INTERNAL_API_SECRET` inside `apps/ai/.env`.

---

## Part D — DuckDNS

1. Create account at [duckdns.org](https://www.duckdns.org).
2. Create subdomain `YOURNAME` → point to your **Elastic IP**.
3. Optional auto-update cron on EC2:

```bash
mkdir -p ~/duckdns
nano ~/duckdns/duck.sh
```

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOURNAME&token=YOUR_DUCKDNS_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x ~/duckdns/duck.sh
~/duckdns/duck.sh
cat ~/duckdns/duck.log    # expect: OK

crontab -e
# add:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

---

## Part E — First Compose bring-up

```bash
cd ~/resumeanalysis
docker compose --profile app up -d --build
```

First build can take **10–20+ minutes** on a small instance. Watch:

```bash
docker compose --profile app ps
docker logs jri-api --tail 50
docker logs jri-worker --tail 20
```

Worker log should include something like `Parse worker ready`.  
`jri-worker` may show Docker **unhealthy** (healthcheck hits API `/health` on a process that does not serve HTTP) — ignore if logs look fine.

Verify env inside API:

```bash
docker exec jri-api printenv | grep -E 'CORS_ORIGIN|GOOGLE_REDIRECT|JWT_|INTERNAL_API'
```

You must see your DuckDNS values / real secrets — **not** `localhost` or `local-dev-...`.

---

## Part F — Nginx + HTTPS (Certbot)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/nextup
```

Paste (replace hostname):

```nginx
server {
    listen 80;
    server_name YOURNAME.duckdns.org;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:

```bash
sudo ln -sf /etc/nginx/sites-available/nextup /etc/nginx/sites-enabled/nextup
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

TLS:

```bash
sudo certbot --nginx -d YOURNAME.duckdns.org
# choose redirect HTTP → HTTPS
sudo certbot renew --dry-run
```

---

## Part G — Google OAuth (production)

[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client:

| Setting | Value |
|---|---|
| Authorized JavaScript origins | `https://YOURNAME.duckdns.org` |
| Authorized redirect URIs | `https://YOURNAME.duckdns.org/api/auth/google/callback` |

Put client id/secret in `apps/api/.env`, then:

```bash
cd ~/resumeanalysis
docker compose --profile app up -d --build api
# or full stack rebuild if unsure
```

---

## Part H — Verify live site

```bash
curl -s https://YOURNAME.duckdns.org/api/health
curl -s https://YOURNAME.duckdns.org/api/auth/google/enabled
```

- Health: `"status":"ok"`
- Google: `"enabled":true`
- Browser: open `https://YOURNAME.duckdns.org`, register / Google sign-in, upload a resume (worker must be up)

---

## Part I — GitHub Actions CI + CD

### CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

On every push/PR to `main`: web typecheck + tests, API build, AI import check, Docker builds for ai/api/web.

### CD

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

After **CI succeeds** on a **push** to `main`, Actions SSHs to EC2 and runs roughly:

```bash
cd ~/resumeanalysis   # or EC2_DEPLOY_PATH
git fetch origin
git reset --hard origin/main   # tracked files only; .env is kept
docker compose --profile app up -d --build
```

### One-time GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Example |
|---|---|
| `EC2_HOST` | Elastic IP or `YOURNAME.duckdns.org` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full `.pem` private key (`BEGIN` … `END`) |
| `EC2_PORT` | `22` (optional) |
| `EC2_DEPLOY_PATH` | `/home/ubuntu/resumeanalysis` (optional) |

The key in `EC2_SSH_KEY` must be authorized for `ubuntu` on the instance (`~/.ssh/authorized_keys`).

### After CD works

Push to `main` → wait for green **CI** → green **CD** → hit the live URL. No manual `git pull` required unless CD is disabled.

---

## Day-2 ops (manual)

```bash
cd ~/resumeanalysis

# Manual deploy (same idea as CD)
git fetch origin
git reset --hard origin/main
docker compose --profile app up -d --build

# Logs
docker logs -f jri-api
docker logs -f jri-worker
docker logs -f jri-web

# Confirm prod env still loaded from .env
docker exec jri-api printenv | grep -E 'CORS_ORIGIN|GOOGLE_REDIRECT|INTERNAL_API'

# DB backup
docker exec jri-postgres pg_dump -U jri jri > ~/backup-$(date +%F).sql
```

**Do not** run `docker compose down -v` unless you intend to wipe Postgres/MinIO volumes.

---

## Recreate checklist (new AWS account)

Copy this when Free Tier / limits force a new box:

1. [ ] Launch Ubuntu EC2 (≥4 GB) + Elastic IP + SG 22/80/443
2. [ ] Install Docker + Compose; clone repo
3. [ ] `apps/api/.env` + `apps/ai/.env` + **repo-root `.env`**
4. [ ] DuckDNS → Elastic IP (+ optional cron)
5. [ ] `docker compose --profile app up -d --build`
6. [ ] Nginx site (`nano`) + Certbot
7. [ ] Google OAuth origins/redirect for the new hostname
8. [ ] Update GitHub `EC2_HOST` / `EC2_SSH_KEY` if the instance or key changed
9. [ ] Verify health + Google + resume parse + interview set

Local laptop `.env` files stay localhost — **do not** copy production secrets into git or into local compose.

---

## Local vs production data

| Environment | Database |
|---|---|
| Laptop Docker / `npm run dev` | Local volumes only |
| EC2 live site | Server volumes only |

They do not sync.

## AWS mapping (later — optional)

| Today (Compose) | Later |
|---|---|
| Postgres on EC2 | RDS |
| Redis on EC2 | ElastiCache |
| MinIO on EC2 | S3 |
| Single EC2 | ECS/Fargate (only if you outgrow one box) |

## Related

- [phase-7-devops.md](./phase-7-devops.md) — CI, images, Redis queue
- [phase-5-interview.md](./phase-5-interview.md) — 15 questions + coach guides
- [architecture.md](./architecture.md) — system design
- [`.env.example`](../.env.example) — repo-root production keys

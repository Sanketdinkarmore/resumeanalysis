# Job & Resume Intelligence Platform (Nextup)

Production-minded SaaS for resume management, JD matching, application tracking, and interview prep.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind (`apps/web`) |
| API | Node.js, Express, Prisma (`apps/api`) |
| AI/NLP | Python, FastAPI (`apps/ai`) — Groq → Gemini → heuristics |
| Data | PostgreSQL, Redis, S3 (MinIO locally) |

## Docs

Start here: **[docs/README.md](./docs/README.md)** (phase index + status).

| Doc | Purpose |
|---|---|
| [PRD](./docs/PRD-job-resume-intelligence-platform.md) | Requirements |
| [Architecture](./docs/architecture.md) | System design |
| [Database / ERD](./docs/database.md) | Schema |
| [Phase 5 backend](./docs/phase-5-backend.md) | API checklist |
| [Phase 5 auth](./docs/phase-5-auth.md) | Auth walkthrough |
| [Phase 5 resumes](./docs/phase-5-resumes.md) | Resume upload/parse |
| [Phase 5 jobs](./docs/phase-5-jobs.md) | Job descriptions |
| [Phase 5 matching](./docs/phase-5-matching.md) | Match scoring |
| [Phase 5 applications](./docs/phase-5-applications.md) | Application tracking |
| [Phase 5 interview](./docs/phase-5-interview.md) | Interview prep |
| [Phase 5 AI](./docs/phase-5-ai.md) | FastAPI service |
| [Phase 6 frontend](./docs/phase-6-frontend.md) | Next.js product UI |
| [pgAdmin setup](./docs/pgadmin-setup.md) | Local DB UI |

## Monorepo

```
apps/web   → Next.js UI
apps/api   → Express REST API
apps/ai    → FastAPI parsing & AI
docs/      → PRD, architecture, phase notes
```

## Status

- **Phase 5 (backend + AI):** complete  
- **Phase 6 (frontend core):** complete  
- **Next:** polish (Overview, UX, deletes), then queues / DevOps / tests  

## Local infra

```bash
# from repo root — Postgres + MinIO (+ Redis)
docker compose up -d

# API :4000
cd apps/api && npm install && npm run dev

# AI :8000
cd apps/ai && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000

# Web :3000
cd apps/web && npm install && npm run dev
```

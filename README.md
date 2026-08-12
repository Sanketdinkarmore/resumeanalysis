# Job & Resume Intelligence Platform

Production-minded SaaS for resume management, JD matching, application tracking, and interview prep.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind |
| API | Node.js, Express, Prisma |
| AI/NLP | Python, FastAPI |
| Data | PostgreSQL, Redis, S3 (MinIO locally) |

## Docs

- [PRD](./docs/PRD-job-resume-intelligence-platform.md)
- [Architecture](./docs/architecture.md)
- [Database / ERD](./docs/database.md)
- [Phase 5 backend notes](./docs/phase-5-backend.md)
- [Phase 5 auth walkthrough](./docs/phase-5-auth.md)
- [Phase 5 resume upload](./docs/phase-5-resumes.md)
- [Phase 5 applications](./docs/phase-5-applications.md)
- [Phase 5 FastAPI AI service](./docs/phase-5-ai.md)
- [Phase 5 interview prep](./docs/phase-5-interview.md)
- [pgAdmin setup](./docs/pgadmin-setup.md)

## Monorepo

```
apps/web   → Next.js UI
apps/api   → Express REST API
apps/ai    → FastAPI parsing & AI
```

## Status

Phase 5 backend core complete (incl. interview prep). Next: Phase 6 frontend.

## Local infra

```bash
# from repo root — Postgres, Redis, MinIO
docker compose up -d

# API
cd apps/api
cp .env.example .env   # if needed
npm install
npx prisma migrate dev --name init
npm run dev
# health: http://localhost:4000/health
```

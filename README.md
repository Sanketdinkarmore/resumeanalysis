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

## Monorepo

```
apps/web   → Next.js UI
apps/api   → Express REST API
apps/ai    → FastAPI parsing & AI
```

## Status

Phase 3 — Architecture complete. Scaffolding apps next.

## Local setup

Coming in the next steps (API → AI → Web → Docker Compose).

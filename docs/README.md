# Docs index — Nextup (Job & Resume Intelligence)

Keep this folder as the source of truth for what we built and what comes next.

## Product & design

| Doc | Purpose |
|---|---|
| [PRD](./PRD-job-resume-intelligence-platform.md) | Requirements / FR map |
| [Architecture](./architecture.md) | System design (web / api / ai) |
| [Database / ERD](./database.md) | Prisma models & relationships |
| [pgAdmin setup](./pgadmin-setup.md) | Local Postgres UI |

## Phase status

| Phase | Focus | Status |
|---|---|---|
| 1–2 | Context + PRD | Done |
| 3 | Architecture | Done |
| 4 | Database / Prisma | Done |
| 5 | Backend + AI | **Done** (core slices) |
| 6 | Frontend (Next.js app) | **Done** (core product UI) |
| 7 | DevOps, queues, CI | **In progress** — see [phase-7-devops.md](./phase-7-devops.md) |

## Phase 5 — Backend & AI

| Doc | Slice | Status |
|---|---|---|
| [phase-5-backend.md](./phase-5-backend.md) | Overview / checklist | Done |
| [phase-5-auth.md](./phase-5-auth.md) | Auth (FR-1) | Done |
| [phase-5-resumes.md](./phase-5-resumes.md) | Resume upload + parse (FR-2) | Done |
| [phase-5-jobs.md](./phase-5-jobs.md) | Job descriptions (FR-3) | Done |
| [phase-5-matching.md](./phase-5-matching.md) | Match scoring (FR-4) | Done |
| [phase-5-applications.md](./phase-5-applications.md) | Applications (FR-6) | Done |
| [phase-5-interview.md](./phase-5-interview.md) | Interview prep (FR-7) | Done |
| [phase-5-ai.md](./phase-5-ai.md) | FastAPI service | Done |

## Phase 6 — Frontend

| Doc | Purpose | Status |
|---|---|---|
| [phase-6-frontend.md](./phase-6-frontend.md) | Next.js dashboard + API client | Done (core) |

## Phase 7 — DevOps & queues

| Doc | Purpose | Status |
|---|---|---|
| [phase-7-devops.md](./phase-7-devops.md) | CI, Docker, Redis/BullMQ plan | In progress (7.1 CI done) |

## Product polish (completed)

1. ~~Overview dashboard~~ ✅
2. ~~UX polish (filters, parsing states)~~ ✅
3. ~~Delete/archive UI~~ ✅
4. ~~Match → apply → interview shortcuts~~ ✅
5. ~~Centralized error mapping + unit tests~~ ✅

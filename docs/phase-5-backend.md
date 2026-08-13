# Phase 5 — Backend (complete)

Express API built **one vertical concern at a time**. Browser talks only to Express; Express calls FastAPI for parse/LLM.

**Status:** Core Phase 5 backend **done**. See [docs/README.md](./README.md) for the full checklist.

## Completed slices

| Slice | PRD | Doc | Status |
|---|---|---|---|
| Auth | FR-1.x | [phase-5-auth.md](./phase-5-auth.md) | Done |
| Resumes (+ parse) | FR-2.x | [phase-5-resumes.md](./phase-5-resumes.md) | Done |
| Job descriptions | FR-3.x | [phase-5-jobs.md](./phase-5-jobs.md) | Done |
| Match analysis | FR-4.x | [phase-5-matching.md](./phase-5-matching.md) | Done |
| Applications | FR-6.x | [phase-5-applications.md](./phase-5-applications.md) | Done |
| Interview prep | FR-7.x | [phase-5-interview.md](./phase-5-interview.md) | Done |
| FastAPI AI | — | [phase-5-ai.md](./phase-5-ai.md) | Done |

## Mounted Express routes

| Mount | Module |
|---|---|
| `/health` | health |
| `/auth` | auth |
| `/resumes` | resumes |
| `/job-descriptions` | jobDescriptions |
| `/match-analyses` | matchAnalyses |
| `/applications` | applications |
| `/interview-question-sets` | interview |

## Local run (API)

```powershell
docker compose up -d   # postgres, minio, redis…
cd d:\resumeanalysis\apps\api
npm run dev            # http://localhost:4000
```

AI service (required for parse + interview LLM):

```powershell
cd d:\resumeanalysis\apps\ai
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

## What’s next

Phase 6 frontend core is done — see [phase-6-frontend.md](./phase-6-frontend.md).  
Remaining work is **polish**, queues, tests, and DevOps (Phase 7+).

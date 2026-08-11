# System Architecture
## AI-Powered Job & Resume Intelligence Platform

**Phase:** 3 of 10 · **Status:** Draft v1

---

## 1. High-Level Overview

Three deployable services + shared infrastructure:

| Service | Tech | Responsibility |
|---|---|---|
| **web** | Next.js + TypeScript + Tailwind | UI, auth pages, dashboards, polling job status |
| **api** | Node.js + Express + Prisma | Auth, CRUD, orchestration, match scoring formula, job enqueue |
| **ai** | Python + FastAPI | PDF parse, NLP entity extract, LLM suggestions, interview Qs |

Shared infra: **PostgreSQL** (source of truth), **Redis** (queues + cache), **S3** (resume PDFs).

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│  Next.js    │ ─────────────► │  Express API     │
│  (web)      │ ◄───────────── │  (api)           │
└─────────────┘   JWT + JSON   └────────┬─────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              PostgreSQL             Redis                 S3
              (Prisma)            (BullMQ)           (private bucket)
                                        │
                                        ▼
                               ┌──────────────────┐
                               │  FastAPI (ai)    │
                               │  parse / NLP /   │
                               │  LLM calls       │
                               └──────────────────┘
```

**Rule:** The browser never talks to FastAPI directly. Express owns auth, ownership checks, and enqueueing; FastAPI is an internal worker/service.

---

## 2. Service Boundaries

### 2.1 `apps/web` (Next.js)
- Pages: auth, resumes, JDs, match analysis, applications dashboard, interview prep
- Calls Express REST APIs only
- Polls job status endpoints for async work (`pending → processing → completed/failed`)
- No business secrets; only public env vars (API base URL)

### 2.2 `apps/api` (Express)
- JWT access + refresh auth
- All CRUD and authorization (user can only touch own rows)
- Uploads PDF → S3 → creates `ResumeVersion` → enqueues parse job
- **Owns the deterministic match-scoring formula** (weighted skill overlap, keyword coverage, seniority alignment)
- Calls FastAPI for extraction/suggestion payloads; stores results in Postgres
- Enqueues expensive work on Redis (BullMQ)

### 2.3 `apps/ai` (FastAPI)
- Internal endpoints (shared secret / private network in prod)
- PDF text extraction + structured resume/JD parsing
- Bullet weakness analysis + rewrite suggestions (no fabricated metrics)
- Interview question generation + on-demand answer outlines
- Stateless where possible; persistence stays in Postgres via API or job results written back through the worker contract

---

## 3. Async Flow (critical path)

### Upload → Parse Resume

```
User                Express              S3           Redis/BullMQ         FastAPI
 │                    │                   │                │                  │
 │ POST /resumes      │                   │                │                  │
 │ (multipart PDF)    │                   │                │                  │
 │───────────────────►│                   │                │                  │
 │                    │ putObject         │                │                  │
 │                    │──────────────────►│                │                  │
 │                    │ create ResumeVersion (pending)     │                  │
 │                    │ enqueue parse job │                │                  │
 │                    │───────────────────────────────────►│                  │
 │ 202 + resumeId     │                   │                │                  │
 │◄───────────────────│                   │                │                  │
 │                    │                   │   worker picks │                  │
 │                    │                   │────────────────┼─────────────────►│
 │                    │                   │                │  parse PDF       │
 │                    │                   │                │◄─────────────────│
 │                    │ update ParsedResumeData + status=completed            │
 │                    │◄──────────────────┼────────────────┼──────────────────│
 │ GET /resumes/:id   │                   │                │                  │
 │───────────────────►│                   │                │                  │
 │ status + parsed    │                   │                │                  │
 │◄───────────────────│                   │                │                  │
```

Same pattern for: JD structure extract, match analysis entity prep, resume improvement, interview question sets.

---

## 4. Match Scoring (deterministic)

LLM/NLP **extracts** skills/keywords/seniority signals.  
Express **scores** with a documented formula, e.g.:

| Factor | Weight (v1 starting point) |
|---|---|
| Must-have skill overlap | 45% |
| Preferred skill overlap | 20% |
| Keyword coverage | 20% |
| Experience/seniority alignment | 15% |

```
score = 100 * (
  0.45 * mustHaveOverlap +
  0.20 * preferredOverlap +
  0.20 * keywordCoverage +
  0.15 * seniorityAlignment
)
```

Same inputs → same score. Breakdown stored on `MatchAnalysis` for charts and interview explanations.

Exact weights can be tuned later; the important part is: **formula lives in code + tests, not in an LLM prompt.**

---

## 5. Auth Model

- Register/login with email + password (argon2 or bcrypt)
- Short-lived **access JWT** + **rotating refresh token** (stored hashed in DB)
- Password reset via time-limited emailed token (dev: log link; prod: SES/SMTP)
- Role: `user` | `admin` (only `user` enforced in v1 product UI)
- Every protected route: 401 if missing/invalid token; 403 if resource not owned by caller

---

## 6. Data Ownership (entities)

High-level (full ERD in Phase 4):

- `User` → many `ResumeVersion`, `JobDescription`, `Application`
- `ResumeVersion` → `ParsedResumeData`, S3 key, parse status
- `JobDescription` → `ParsedJobDescription`
- `MatchAnalysis` → resume + JD + scores + recommendations
- `Application` → resume + JD + stage + `ApplicationStageHistory`
- `InterviewQuestionSet` → many `InterviewQuestion` (linked to application/JD)

Soft-delete resumes so historical matches/applications remain coherent.

---

## 7. Local Dev Topology (Docker Compose)

| Container | Port (host) | Notes |
|---|---|---|
| postgres | 5432 | Prisma migrations from `api` |
| redis | 6379 | BullMQ |
| minio | 9000 / 9001 | S3-compatible local object storage |
| api | 4000 | Express |
| ai | 8000 | FastAPI |
| web | 3000 | Next.js |

Production swaps MinIO → S3, Compose services → EC2/RDS/ElastiCache as designed in Phase 8.

---

## 8. Monorepo Layout

```
resumeanalysis/
├── apps/
│   ├── web/                 # Next.js
│   ├── api/                 # Express + Prisma
│   └── ai/                  # FastAPI
├── packages/
│   └── shared/              # shared types/constants (optional early)
├── docs/
│   ├── architecture.md      # this file
│   └── PRD (or link)
├── docker/                  # Dockerfiles, nginx conf later
├── .github/workflows/       # CI later
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 9. Build Order (after this doc)

1. Local git repo + GitHub remote + `.gitignore` / README
2. Scaffold `apps/api` (Express + Prisma + health check)
3. Scaffold `apps/ai` (FastAPI + health check)
4. Scaffold `apps/web` (Next.js + Tailwind)
5. `docker-compose` for Postgres + Redis + MinIO
6. Phase 4: Prisma schema / ERD
7. Auth → Resume upload → JD → Match vertical slice
8. Remaining modules, then DevOps / tests / polish

---

## 10. Open Decisions (locked for v1 unless you change them)

| Decision | Choice |
|---|---|
| Repo style | Monorepo |
| Local object storage | MinIO (S3 API) |
| Queue | Redis + BullMQ on Node side |
| AI provider | Deferred to Phase 7 (interface first; OpenAI-compatible client) |
| Auth in v1 | Email/password only |
| Resume format v1 | PDF only |
| Package manager | npm (Node already present) |
| Python env | venv + `requirements.txt` (Poetry later if needed) |
| Frontend UI design | Follow frontend-design skill when we build pages — distinctive, not generic AI purple/cream |

---

## 11. Interview Talking Points (keep this)

- Why separate FastAPI: CPU/NLP stack, Python PDF/NLP libs, isolate AI blast radius and scaling
- Why Express owns scoring: explainability, tests, reproducibility
- Why async jobs: upload latency, retries, user-visible status
- Why private S3 + signed URLs: resume data is PII

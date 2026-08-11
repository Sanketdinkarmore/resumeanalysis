# Product Requirements Document
## AI-Powered Job & Resume Intelligence Platform

**Status:** Draft v1 · **Phase:** 2 of 10 (Requirements)
**Owner:** Sanket More

---

## 1. Product Overview

### 1.1 Vision
A single platform that manages the entire job-search lifecycle — resumes, job descriptions, applications, ATS optimization, and interview prep — replacing the spreadsheets, folders, and scattered ChatGPT tabs most candidates currently use.

### 1.2 Problem Statement
Job seekers juggle multiple resume versions, dozens of job descriptions, and applications spread across stages, with no structured way to know *why* a resume is or isn't a good fit for a given role, *what* to change, or *how* to prepare for the resulting interview. Generic AI chat tools give one-off advice with no persistence, no scoring methodology, and no tracking over time.

### 1.3 Target User (Primary Persona)
An active job seeker (new grad or early-career) applying to multiple roles in parallel, maintaining 2–4 resume variants, who wants objective, explainable feedback on fit and a system to track progress rather than another AI wrapper that "sounds smart" but can't be trusted for real decisions.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Deterministic, explainable resume↔JD match scoring (not a black-box LLM number)
- AI-assisted resume improvement that never fabricates experience
- End-to-end application tracking with real analytics
- Interview prep grounded in the actual JD, not generic question banks
- Demonstrate production-grade engineering: auth, validation, testing, async processing, cloud deployment, CI/CD

### 2.2 Out of Scope (v1)
- Payments/subscription billing
- Multi-tenant orgs / team collaboration / recruiter-side features
- Browser extension or auto-apply/scraping of job boards
- Native mobile app
- Real-time chat/collaboration features
- Non-English resume/JD parsing

---

## 3. Core Modules & Functional Requirements

### 3.1 Authentication & Authorization
| ID | Requirement |
|---|---|
| FR-1.1 | User can register with email + password; password hashed with bcrypt/argon2, never stored in plaintext |
| FR-1.2 | User can log in and receive a short-lived JWT access token + rotating refresh token |
| FR-1.3 | Password reset via emailed time-limited token |
| FR-1.4 | All non-public API routes reject unauthenticated requests (401) and cross-user access attempts (403) |
| FR-1.5 | Role field reserved on User model (`user`, `admin`) for future admin tooling, enforced server-side even though only `user` ships in v1 |

### 3.2 Resume Management
| ID | Requirement |
|---|---|
| FR-2.1 | Upload resume as PDF (DOCX optional stretch), max size enforced (e.g. 5MB), MIME-type validated server-side (not just extension) |
| FR-2.2 | Raw file stored in S3 (private bucket, signed URLs); DB stores only metadata + S3 key |
| FR-2.3 | User can maintain multiple named/tagged resume versions (e.g. "Frontend-focused", "General") |
| FR-2.4 | Upload triggers an async parsing job (FastAPI service) that extracts structured data: contact info, summary, skills, work experience (with bullet points), education, projects, certifications |
| FR-2.5 | Parsing job has a visible status: `pending → processing → completed / failed`, polled or pushed to the frontend |
| FR-2.6 | User can review and manually correct parsed fields if extraction is imperfect (parsing is assistive, not authoritative) |
| FR-2.7 | User can archive/delete a resume version (soft delete to preserve match-history integrity) |

### 3.3 Job Description Management
| ID | Requirement |
|---|---|
| FR-3.1 | User can paste raw JD text (primary path) |
| FR-3.2 | System extracts structured JD data: required/preferred skills, responsibilities, qualifications, seniority signal, keywords |
| FR-3.3 | JD stores company name, role title, optional source URL |
| FR-3.4 | JD library is reusable — one JD can be linked to multiple match analyses and applications |

### 3.4 Resume–JD Match Analysis Engine
| ID | Requirement |
|---|---|
| FR-4.1 | User selects a resume version + a JD to generate an analysis |
| FR-4.2 | Match score is computed by a **deterministic, documented algorithm** (weighted skill overlap + keyword coverage + experience-level alignment) — the LLM extracts entities, but the scoring formula is business logic, not model output |
| FR-4.3 | Output: matched skills, missing skills (split must-have vs nice-to-have), keyword coverage %, and a per-factor score breakdown |
| FR-4.4 | Actionable, specific recommendations (e.g. "Add 'Kubernetes' — appears 3x in JD, absent from resume") |
| FR-4.5 | Every analysis run is stored, so a user can re-run after edits and see score delta over time |
| FR-4.6 | Score breakdown rendered visually (e.g. bar/radar chart) in the dashboard |

### 3.5 AI-Powered Resume Improvement
| ID | Requirement |
|---|---|
| FR-5.1 | Each bullet point is analyzed for weakness signals: no action verb, no metric, passive voice, vague scope |
| FR-5.2 | System suggests a stronger, achievement-oriented rewrite of flagged bullets |
| FR-5.3 | If a bullet lacks quantifiable impact, the system prompts the user for the real number rather than inventing one — no fabricated metrics, ever |
| FR-5.4 | Skill/keyword suggestions are clearly labeled as suggestions requiring user confirmation of real experience before being added |
| FR-5.5 | Each suggestion is individually accept/reject/edit-able (diff-style), never a blind full-resume rewrite |

### 3.6 Application Tracking & Career Dashboard
| ID | Requirement |
|---|---|
| FR-6.1 | Application record links: resume version + JD + company + current stage |
| FR-6.2 | Stage enum: `Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn` |
| FR-6.3 | Every stage transition is logged with a timestamp (audit trail for analytics) |
| FR-6.4 | Dashboard shows: applications per stage, stage-to-stage conversion rates, applications-over-time, average match score of applied-to roles |
| FR-6.5 | Applications table supports filter/search/sort |
| FR-6.6 | Free-text notes per application (stretch: follow-up reminders) |

### 3.7 Interview Preparation Module
| ID | Requirement |
|---|---|
| FR-7.1 | Given a JD, generate role-specific technical questions |
| FR-7.2 | Generate behavioral questions calibrated to role/seniority |
| FR-7.3 | Generate project/scenario-based questions tied to the JD's actual requirements |
| FR-7.4 | User can request an explanation/answer-outline for any generated question, on demand (not pre-generated for all, to control cost) |
| FR-7.5 | Generated question sets are saved against the linked application for later review |

---

## 4. Non-Functional Requirements

**Security**
- Server-side validation on every input (schema validation, e.g. Zod/Joi on Express, Pydantic on FastAPI)
- File upload validation: MIME type, size limit, virus/malformed-file resilience
- Rate limiting on auth endpoints and AI-triggering endpoints
- Secrets via environment variables / secrets manager, never committed
- S3 buckets private; access only via signed URLs scoped to the owning user

**Reliability & Performance**
- Expensive operations (parsing, AI analysis, question generation) run as background jobs (queue-backed, e.g. Redis + BullMQ or Celery), never block the request thread
- Idempotent upload/analysis endpoints (safe retries)
- Documented retry/backoff for calls to the AI provider
- Structured error responses with consistent shape (`code`, `message`, `details`) across both services

**Observability**
- Structured (JSON) logging with request IDs traceable across Node ⇄ FastAPI
- Health-check endpoints on both services
- Basic metrics (request latency, job queue depth, job failure rate)

**Data Privacy**
- Resume content is personal data: encrypt at rest (S3 default + RDS encryption), scope all queries to the authenticated user, support account/data deletion

**Quality**
- Automated tests: unit (business logic, scoring algorithm), integration (API contracts), and at least one e2e flow (upload → analyze → track)
- OpenAPI/Swagger docs for both the Express and FastAPI services

---

## 5. Technical Constraints (carried from project brief — full design in Phase 3)
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Node.js/Express, REST
- Database: PostgreSQL + Prisma ORM
- AI/NLP service: separate Python/FastAPI microservice
- Storage: AWS S3
- Cache/queue: Redis
- Infra: Docker, AWS (EC2, RDS, S3, Nginx), GitHub Actions CI/CD

---

## 6. Data Model — Entity Overview
*(High-level only; full ERD is Phase 4)*

`User` · `ResumeVersion` · `ParsedResumeData` · `JobDescription` · `ParsedJobDescription` · `MatchAnalysis` · `MatchRecommendation` · `Application` · `ApplicationStageHistory` · `InterviewQuestionSet` · `InterviewQuestion`

---

## 7. AI/NLP Design Principles
1. **AI extracts and suggests; business logic decides.** The match score is a deterministic formula over extracted entities — reproducible and explainable to an interviewer.
2. **No fabrication.** The AI never invents metrics, skills, or experience; it flags gaps and asks the user to fill them in.
3. **Every AI output is reviewable.** Suggestions are diffs a user accepts/rejects, not silent overwrites.
4. **Cost-aware.** Heavy generation (e.g. full interview-answer explanations) is triggered on demand, not pre-computed for everything.

---

## 8. Success Metrics / Definition of Done (v1)
- User can complete the full loop: register → upload resume → paste JD → get match score + recommendations → improve a bullet → track an application through stages → generate interview questions
- Match score is reproducible and explainable (same inputs → same score, with visible breakdown)
- Zero fabricated content in AI-generated resume suggestions (manual QA pass)
- CI pipeline runs tests and builds containers on every push; deployable to AWS via one documented process
- README + architecture diagram + ERD sufficient for the project to be explained end-to-end in an interview without notes

---

## 9. Assumptions & Open Questions
- v1 supports PDF resumes only; DOCX is a stretch goal
- v1 is English-language resumes/JDs only
- No OAuth/social login in v1 (email/password only) — open to revisit in Phase 5
- Single AI provider assumed for the FastAPI service (model choice deferred to Phase 7)

---

## 10. Roadmap (maps to your working phases)
1. **Context** — done (this brief)
2. **Requirements** — this PRD
3. **Architecture** — system design, service boundaries, sequence diagrams for async flows
4. **Database** — ERD, Prisma schema, indexing/constraints
5. **Backend** — Express API + auth + business logic; FastAPI parsing/AI service
6. **Frontend** — Next.js UI, dashboard, upload flows, integration
7. **Advanced** — Redis queues, background workers, AI prompt design, WebSocket/polling for job status
8. **DevOps** — Dockerize both services, AWS deployment (EC2/RDS/S3/Nginx), GitHub Actions CI/CD
9. **Quality** — test coverage, security pass, error-handling audit
10. **Resume** — convert the finished build into resume bullets

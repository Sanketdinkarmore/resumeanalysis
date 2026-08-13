# Phase 6 — Frontend (Next.js)

Product UI for Nextup: landing + auth + dashboard wired to Express (`NEXT_PUBLIC_API_URL`).

**Status:** Core product UI done. Polish / Overview depth still open.

## Stack

- Next.js App Router (`apps/web`)
- Tailwind + existing Nextup visual system (paper / ink / amber)
- Client API helpers under `apps/web/lib/api/`
- Tokens in `localStorage` (`nextup.accessToken` / `nextup.refreshToken`) with refresh retry

## Routes

| Path | Purpose |
|---|---|
| `/` | Marketing landing |
| `/login`, `/register` | Auth |
| `/dashboard` | Overview shell |
| `/dashboard/resumes` | Upload + list + detail |
| `/dashboard/jobs` | Create + list + detail |
| `/dashboard/matches` | Run match + list + detail |
| `/dashboard/applications` | Create + stage/notes + list + detail |
| `/dashboard/interview` | Generate set + outlines + list + detail |

## API client map

| Module | Talks to |
|---|---|
| `lib/api/auth.ts` | `/auth/*` |
| `lib/api/resumes.ts` | `/resumes` |
| `lib/api/jobs.ts` | `/job-descriptions` |
| `lib/api/matches.ts` | `/match-analyses` |
| `lib/api/applications.ts` | `/applications` |
| `lib/api/interview.ts` | `/interview-question-sets` |
| `lib/api/index.ts` | Re-exports |

## Env

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

See `apps/web/.env.example`.

## Local run

```powershell
# API :4000, AI :8000, Postgres/MinIO via docker — then:
cd d:\resumeanalysis\apps\web
npm install
npm run dev
# http://localhost:3000
```

## Auth UX

- `AuthProvider` + `RequireAuth` / `GuestOnly`
- Post-login redirect → `/dashboard`
- Dashboard shell: sidebar (desktop) + drawer (mobile)

## Feature notes

- **Resumes:** PDF upload (multipart), wait for parse COMPLETED
- **Jobs:** paste JD ≥ 50 chars, auto-parse
- **Matches:** only COMPLETED resume + job selectable
- **Applications:** optional match link; stage moves write history
- **Interview:** job required; optional resume **or** application  
  - One set per `applicationId` (unique) — regenerate **replaces** prior set  
  - Outlines generated on demand per question

## Still to polish (not blockers)

1. Rich Overview (counts + shortcuts)
2. Filters/search on lists
3. Delete/archive actions in UI
4. Stronger parse/progress feedback
5. Cross-links: Match → Application → Interview

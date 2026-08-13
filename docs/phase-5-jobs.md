# Phase 5 — Job Descriptions (FR-3.x)

Paste a job posting, store it, and parse skills/keywords via the AI service.

**Status:** Done

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/job-descriptions` | Yes | Create JD (triggers parse) |
| GET | `/job-descriptions` | Yes | List your JDs |
| GET | `/job-descriptions/:id` | Yes | Detail + `parsedData` |
| PATCH | `/job-descriptions/:id` | Yes | Update; re-parses if `rawText` changes |
| DELETE | `/job-descriptions/:id` | Yes | Remove JD |

## Create body

```json
{
  "companyName": "Acme Corp",
  "roleTitle": "Full Stack Engineer",
  "rawText": "…full JD text (min ~50 chars)…",
  "sourceUrl": "https://optional-link"
}
```

## What happens on create

1. Validates ownership + Zod body
2. Inserts `job_descriptions` row (`parseStatus: PROCESSING` / then COMPLETED|FAILED)
3. Express calls FastAPI `POST /parse/job-description` with `X-Internal-Secret`
4. Saves structured skills / keywords / seniority into `parsed_job_data`

## Files

| Area | Path |
|---|---|
| Routes | `apps/api/src/routes/jobDescriptions.ts` |
| Validators | `apps/api/src/validators/jobDescription.ts` |
| AI parse | `apps/ai/app/routes/parse.py` + `services/jd_parser.py` |

## Frontend

- `/dashboard/jobs` — list + create form
- `/dashboard/jobs/[id]` — detail + parsed skills

## Notes

- Heuristic parse always works; Gemini/Groq enrichment improves quality when configured
- Matching and interview prep work best when `parseStatus === COMPLETED`

# Phase 5 — Interview Prep (FR-7.x)

JD-grounded interview questions (15 total: 5 TECHNICAL / 5 BEHAVIORAL / 5 PROJECT) + on-demand interview-coach answer guides.

**Status:** Done (API + AI + frontend)

## Architecture

```
POST /interview-question-sets  (Express)
        ↓
FastAPI POST /interview/questions
        ↓
LLM cascade: Groq → Gemini → template questions
        ↓
Save InterviewQuestionSet + InterviewQuestion rows
```

Answer guides are **not** pre-generated (cost control). Request them per question — each guide is a short coach outline (what they want, structure, talking points, follow-up tip) plus a full **Sample answer (say this)** the candidate can practice:

```
POST …/questions/:questionId/answer-outline
        ↓
Groq → Gemini → template outline
```

## Endpoints (Express)

| Method | Path | Purpose |
|---|---|---|
| POST | `/interview-question-sets` | Generate + save questions for a JD |
| GET | `/interview-question-sets` | List your sets |
| GET | `/interview-question-sets/:id` | Set + all questions |
| POST | `/interview-question-sets/:id/questions/:questionId/answer-outline` | On-demand outline |

## FastAPI (internal)

| Method | Path | Purpose |
|---|---|---|
| POST | `/interview/questions` | Generate TECHNICAL / BEHAVIORAL / PROJECT questions |
| POST | `/interview/answer-outline` | Outline for one question |

Requires `X-Internal-Secret`. LLM keys optional but recommended:

- `GROQ_API_KEY` (preferred)
- `GEMINI_API_KEY` (fallback)
- If both fail → deterministic templates (feature still works)

## Create body options

### JD + resume

```json
{
  "jobDescriptionId": "YOUR_JD_ID",
  "resumeVersionId": "YOUR_RESUME_ID"
}
```

### Via application (uses that application’s resume)

```json
{
  "jobDescriptionId": "YOUR_JD_ID",
  "applicationId": "YOUR_APPLICATION_ID"
}
```

**Important:** `applicationId` is **unique** on `interview_question_sets`. Generating again for the same application **deletes and replaces** the previous set.

### JD-only

```json
{
  "jobDescriptionId": "YOUR_JD_ID"
}
```

Response includes `"groundedInResume": true|false`.

## Outline

`POST /interview-question-sets/:id/questions/:questionId/answer-outline`  
Body: `{}`  

Calling again returns the stored outline (no second LLM charge).

## Frontend

- `/dashboard/interview` — generate form + list
- `/dashboard/interview/[id]` — questions by category + **Generate outline** per question

## Verify in pgAdmin

- `interview_question_sets` — status `COMPLETED` (or `FAILED` with `errorMessage`)
- `interview_questions` — categories; `answerOutline` null until requested

## Related

- AI cascade details: [phase-5-ai.md](./phase-5-ai.md)
- Frontend: [phase-6-frontend.md](./phase-6-frontend.md)

# Phase 5 — Interview Prep (FR-7.x)

JD-grounded interview questions + on-demand answer outlines.

## Architecture

```
POST /interview-question-sets  (Express)
        ↓
FastAPI POST /interview/questions  (Gemini)
        ↓
Save InterviewQuestionSet + InterviewQuestion rows
```

Answer outlines are **not** pre-generated (cost control). Request them per question.

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

Requires `X-Internal-Secret` + `GEMINI_API_KEY`.

## Postman test

### Recommended: JD + resume (recruiter simulation)

```json
POST /interview-question-sets
{
  "jobDescriptionId": "YOUR_JD_ID",
  "resumeVersionId": "YOUR_RESUME_ID"
}
```

Or via application (auto-uses that application's resume):

```json
{
  "jobDescriptionId": "YOUR_JD_ID",
  "applicationId": "YOUR_APPLICATION_ID"
}
```

Response includes `"groundedInResume": true` when resume context was used.

PROJECT questions should reference real resume projects (e.g. NASA APOD, Student Management System) framed against the JD.

### JD-only (still supported)

```json
{
  "jobDescriptionId": "YOUR_JD_ID"
}
```

`"groundedInResume": false`

### 2. Get set

`GET http://localhost:4000/interview-question-sets/:id`

### 3. Answer outline (one question)

`POST http://localhost:4000/interview-question-sets/:id/questions/:questionId/answer-outline`

Body: empty JSON `{}`

Calling again returns the stored outline (no second Gemini charge).

## Verify in pgAdmin

- `interview_question_sets` — status `COMPLETED`
- `interview_questions` — rows with categories; `answerOutline` null until requested

## Also fixed

PyMuPDF deprecation: `import fitz` → `import pymupdf`

# Phase 5 — Application Tracking (FR-6.x)

Track job applications through stages with an audit trail.

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/applications` | Yes | Create application (links resume + JD) |
| GET | `/applications` | Yes | List with filter/search/sort |
| GET | `/applications/:id` | Yes | Single app + full stage history |
| PATCH | `/applications/:id` | Yes | Update notes |
| PATCH | `/applications/:id/stage` | Yes | Change stage (logged) |
| DELETE | `/applications/:id` | Yes | Remove application |

## Stages (enum)

`SAVED` → `APPLIED` → `SCREENING` → `INTERVIEW` → `OFFER` / `REJECTED` / `WITHDRAWN`

v1 allows any stage → any other stage; every change is logged in `application_stage_history`.

## What happens on create

1. Validates resume + JD belong to you
2. Optionally links a match analysis (must match same resume + JD pair)
3. Copies `companyName` and `roleTitle` from JD onto the application (denormalized for dashboard)
4. Creates application with `stage = SAVED`
5. Inserts first history row: `null → SAVED`

## Postman test flow

### 1. Create application

`POST http://localhost:4000/applications`

Bearer token + JSON:

```json
{
  "resumeVersionId": "YOUR_RESUME_ID",
  "jobDescriptionId": "YOUR_JD_ID",
  "matchAnalysisId": "YOUR_ANALYSIS_ID",
  "notes": "Applied via company careers page"
}
```

`matchAnalysisId` is optional.

### 2. List applications

`GET http://localhost:4000/applications`

Optional query params:

- `?stage=APPLIED`
- `?search=Google`
- `?sort=companyName&order=asc`

### 3. Get one with history

`GET http://localhost:4000/applications/:id`

Response includes `stageHistory` array.

### 4. Move stage

`PATCH http://localhost:4000/applications/:id/stage`

```json
{
  "stage": "APPLIED",
  "note": "Submitted application on LinkedIn"
}
```

### 5. Update notes

`PATCH http://localhost:4000/applications/:id`

```json
{
  "notes": "Follow up in 1 week if no response"
}
```

## Verify in pgAdmin

- `applications` — one row with stage, company, role
- `application_stage_history` — one row per stage change

## Next slice

Interview question sets (FR-7.x) — last backend slice before frontend.

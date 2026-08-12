# Phase 5 — Resume Upload (first slice)

This slice adds the first real resume-management backend flow from the PRD without jumping into parsing yet.

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| GET | `/resumes` | Yes | List the current user's uploaded resumes |
| POST | `/resumes` | Yes | Upload one PDF resume and create a `resume_versions` row |

## What happens on upload

1. Client sends `multipart/form-data`
2. `requireAuth` verifies the access token
3. `multer` reads the uploaded file into memory
4. API validates:
   - file exists
   - MIME type is `application/pdf`
   - file size is at most 5MB
   - `name` field is present
5. `lib/storage.ts` ensures the MinIO bucket exists
6. API uploads the PDF to MinIO
7. API inserts a `resume_versions` row in Postgres
8. Response returns metadata with `parseStatus: PENDING`

## Environment variables

Added to `apps/api/.env`:

```env
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=jriminio
S3_SECRET_ACCESS_KEY=jriminio123
S3_BUCKET=resumes
S3_FORCE_PATH_STYLE=true
```

## Files added/updated

| File | Role |
|---|---|
| `src/lib/storage.ts` | MinIO/S3 client, bucket creation, upload helper |
| `src/routes/resumes.ts` | Protected resume upload/list endpoints |
| `src/config/env.ts` | Validates S3 env vars |
| `src/index.ts` | Mounts `/resumes` |
| `.env` / `.env.example` | Local MinIO config |

## Start local services

From repo root:

```powershell
docker compose up -d postgres minio
```

MinIO console:

- API endpoint: `http://localhost:9000`
- Console UI: `http://localhost:9001`
- Username: `jriminio`
- Password: `jriminio123`

## Manual test flow

1. Start the API:

```powershell
cd d:\resumeanalysis\apps\api
npm run dev
```

2. Login and keep the access token:

```powershell
$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"you@example.com","password":"password123"}'
```

3. Upload a PDF:

```powershell
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$form = @{
  name = "General Resume"
  tags = "general,backend"
  file = Get-Item "C:\path\to\your-resume.pdf"
}

Invoke-RestMethod -Method POST -Uri "http://localhost:4000/resumes" `
  -Headers $headers `
  -Form $form
```

4. List resumes:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/resumes" -Headers $headers
```

## What to verify visually

- In **pgAdmin**:
  - row exists in `resume_versions`
  - `parseStatus` is `PENDING`
- In **MinIO console**:
  - `resumes` bucket exists
  - uploaded object path starts with your `userId/`

## Next slice

Resume parsing groundwork:

- create `ParsedResumeData` row
- wire async parse status flow
- later hand off heavy parsing to FastAPI

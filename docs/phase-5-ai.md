# Phase 5 — FastAPI AI Service (scaffold)

Internal Python service for parsing and LLM features. The browser never calls this directly — only Express does.

## Do I need a Gemini API key now?

**No.** Not for this scaffold slice.

| Slice | Gemini key needed? |
|---|---|
| Scaffold + health check | No |
| Resume PDF text extraction | No (deterministic) |
| JD skill/keyword extraction | Maybe (can start rule-based without LLM) |
| Interview question generation | Yes |
| Resume improvement suggestions | Yes |

When we need it, you'll add `GEMINI_API_KEY=...` to `apps/ai/.env`. Get one free at [Google AI Studio](https://aistudio.google.com/apikey).

## Project layout

```
apps/ai/
  app/
    main.py          # FastAPI app entry
    config.py        # env vars (pydantic-settings)
    routes/
      health.py      # GET /health
  requirements.txt
  Dockerfile
  .env.example
```

## Local setup (recommended for development)

```powershell
cd d:\resumeanalysis\apps\ai

# one-time: create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# install deps
pip install -r requirements.txt

# env file
copy .env.example .env

# run (from apps/ai, with venv active)
uvicorn app.main:app --reload --port 8000
```

## Verify

- Health: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

Expected health response:

```json
{
  "status": "ok",
  "service": "ai",
  "llm_configured": false
}
```

## Docker (optional)

From repo root:

```powershell
docker compose up -d ai
```

Same health URL: http://localhost:8000/health

## How this fits the architecture

```
Browser → Express (port 4000) → FastAPI (port 8000)
                ↓
           PostgreSQL / MinIO
```

Express will call FastAPI with `INTERNAL_API_SECRET` header once we wire parsing (next slices).

## Next slices (in order)

1. ~~Resume PDF text extraction (no LLM)~~ Done (+ skill cleanup v2)
2. ~~JD entity extraction~~ Done
3. ~~Express calls FastAPI after upload~~ Done (sync for v1)
4. Interview question generation (Gemini) — Done
5. Express interview prep routes — Done

## Interview prep

See `docs/phase-5-interview.md`.

FastAPI routes:
- `POST /interview/questions`
- `POST /interview/answer-outline`

Also: PyMuPDF import fixed (`import pymupdf` instead of deprecated `fitz`).

## Resume parsing slice (done)

- `POST /parse/resume` on FastAPI (internal, requires `X-Internal-Secret` header)
- PyMuPDF text extraction + heuristic section parsing
- Optional **Gemini enrichment** when `GEMINI_API_KEY` is set (same API schema)
- If Gemini fails → heuristic result is returned unchanged (no breakage)
- Express calls FastAPI after `POST /resumes` upload
- Saves `parsed_resume_data`, sets `parseStatus` to `COMPLETED` or `FAILED`
- `GET /resumes/:id` returns parsed data
- Check `parsedData.rawExtract.llmEnriched` / `parser` to see which path ran

## JD parsing slice (done)

- `POST /parse/job-description` on FastAPI (JSON `{ "rawText": "..." }`)
- Heuristic skill/keyword/seniority extraction + optional Gemini enrichment
- Express auto-parses on `POST /job-descriptions` and re-parses on `PATCH` when `rawText` changes
- `GET /job-descriptions/:id` returns `parsedData`

### Gemini note

- Default model: `gemini-flash-latest` (older model IDs like `gemini-2.0-flash` are deprecated)
- Key goes in `apps/ai/.env` as `GEMINI_API_KEY=...`
- Health: http://localhost:8000/health → `"llm_configured": true`

### Test flow

1. Restart FastAPI so it picks up the new Gemini code + env
2. Run **both** services (Express + FastAPI)
3. Re-upload your resume PDF → cleaner skills, better experience grouping, summary filled
4. Create a new JD via Postman → `llmEnriched: true` in parsed rawExtract when Gemini works
5. Run match analysis on the new resume + new JD

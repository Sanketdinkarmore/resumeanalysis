# Phase 5 — FastAPI AI Service

Internal Python service for parsing and LLM features. The browser never calls this — only Express does.

**Status:** Done (scaffold + parse + interview LLM cascade)

## Do I need API keys?

| Feature | Without keys | With keys |
|---|---|---|
| Health / scaffold | Works | — |
| Resume PDF parse | Heuristic (PyMuPDF) | + LLM enrich (better) |
| JD parse | Heuristic | + LLM enrich (better) |
| Interview questions / outlines | Template fallback | Groq → Gemini (preferred) |

Keys live in `apps/ai/.env` (never commit):

```env
GROQ_API_KEY=          # preferred for interview (+ enrich cascade)
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=        # fallback
GEMINI_MODEL=gemini-flash-latest
INTERNAL_API_SECRET=   # must match Express
```

- Groq: https://console.groq.com/keys  
- Gemini: https://aistudio.google.com/apikey  

## Project layout

```
apps/ai/
  app/
    main.py
    config.py
    routes/
      health.py
      parse.py
      interview.py
    services/
      resume_parser.py
      jd_parser.py
      llm_enrich.py
      interview.py
      llm_client.py      # Groq → Gemini
      groq_client.py
      gemini_client.py
      json_utils.py
  requirements.txt
  .env.example
```

## Local setup

```powershell
cd d:\resumeanalysis\apps\ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# fill GROQ_API_KEY / GEMINI_API_KEY / INTERNAL_API_SECRET
uvicorn app.main:app --reload --port 8000
```

## Verify

- Health: http://localhost:8000/health  
- Docs: http://localhost:8000/docs  

Example health:

```json
{
  "status": "ok",
  "service": "ai",
  "groq_configured": true,
  "gemini_configured": true,
  "llm_configured": true
}
```

`GET /` returns **404** on purpose (no root page) — that is not an error.

## LLM cascade

`app/services/llm_client.py`:

1. **Groq** (higher free RPM)  
2. **Gemini** (fallback; retries on real rate limits)  
3. Caller **heuristics / templates** (interview always returns something)

Used by:

- Interview questions + answer outlines  
- Resume/JD enrichment (`llm_enrich.py`)

## Internal routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness + LLM flags |
| POST | `/parse/resume` | PDF bytes → structured resume |
| POST | `/parse/job-description` | `{ rawText }` → skills/keywords |
| POST | `/interview/questions` | JD (+ optional resume) → questions |
| POST | `/interview/answer-outline` | One question → outline |

All non-health routes require header `X-Internal-Secret`.

## Architecture fit

```
Browser → Express (:4000) → FastAPI (:8000)
                ↓
         PostgreSQL / MinIO
```

## Related

- Interview Express + UI: [phase-5-interview.md](./phase-5-interview.md)
- Backend overview: [phase-5-backend.md](./phase-5-backend.md)

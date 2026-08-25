# Phase 5 — Match Analysis (FR-4.x)

Deterministic scoring of a **completed** resume against a **completed** JD. Express owns the formula; AI is not required for scoring.

**Status:** Done

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/match-analyses` | Yes | Score resume + JD pair |
| GET | `/match-analyses` | Yes | List analyses |
| GET | `/match-analyses/:id` | Yes | Full breakdown + recommendations |
| POST | `/match-analyses/:id/rewrite-bullets` | Yes | Rewrite resume experience bullets to match the JD |

## Create body

```json
{
  "resumeVersionId": "UUID",
  "jobDescriptionId": "UUID"
}
```

## What happens on create

1. Verifies both rows belong to the user
2. Requires parsed entities on both sides (`422 RESUME_NOT_PARSED` / `JD_NOT_PARSED` otherwise)
3. Runs `lib/scoring.ts` (must-have / preferred / keyword / seniority → overall)
4. Generates recommendations via `lib/recommendations.ts`
5. Stores `match_analyses` + `match_recommendations`

## Score fields (detail)

- `overallScore`, `mustHaveScore`, `preferredScore`, `keywordScore`, `seniorityScore`
- `matchedSkills`, `missingMustHave`, `missingPreferred`, `keywordCoverage`
- `recommendations[]` — type + severity + title/detail

## Files

| Area | Path |
|---|---|
| Routes | `apps/api/src/routes/matchAnalyses.ts` |
| Scoring | `apps/api/src/lib/scoring.ts` |
| Recs | `apps/api/src/lib/recommendations.ts` |
| AI client | `apps/api/src/lib/aiClient.ts` (`generateBulletRewrite`) |
| Validators | `apps/api/src/validators/matchAnalysis.ts` |
| AI service | `apps/ai/app/services/bullet_rewrite.py` + `apps/ai/app/routes/improve.py` |

## Frontend

- `/dashboard/matches` — list + **Run match** form (completed resume + job only)
- `/dashboard/matches/[id]` — score breakdown, skill gaps, recommendations, and a **Rewrite bullets for this role** section that generates Accept / Reject bullet suggestions via the AI service

## Notes

- Multiple analyses for the same resume/JD pair are allowed
- Scoring is explainable and interview-friendly — keep formula changes intentional
- Bullet rewrite is **on-demand** (button-triggered, not automatic) and **JD-tailored** — the resume page has no JD context, so it lives on the match detail page
- The rewrite returns up to `MAX_SUGGESTIONS = 8` bullets, but only rewrites weak / non-JD-relevant bullets (strong ones are left alone), so the count varies
- Rewrites never invent metrics — bullets lacking measurable impact get `impactMissing: true` and a `[impact]` placeholder the user fills in
- Accepting a suggestion is **UI-only** for now — it does not persist the rewritten text back into the stored resume

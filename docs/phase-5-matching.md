# Phase 5 — Match Analysis (FR-4.x)

Deterministic scoring of a **completed** resume against a **completed** JD. Express owns the formula; AI is not required for scoring.

**Status:** Done

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/match-analyses` | Yes | Score resume + JD pair |
| GET | `/match-analyses` | Yes | List analyses |
| GET | `/match-analyses/:id` | Yes | Full breakdown + recommendations |

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
| Validators | `apps/api/src/validators/matchAnalysis.ts` |

## Frontend

- `/dashboard/matches` — list + **Run match** form (completed resume + job only)
- `/dashboard/matches/[id]` — score breakdown, skill gaps, recommendations

## Notes

- Multiple analyses for the same resume/JD pair are allowed
- Scoring is explainable and interview-friendly — keep formula changes intentional

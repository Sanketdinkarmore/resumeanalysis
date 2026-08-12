# Phase 5 — Backend (in progress)

We are building the API **one vertical concern at a time**, not generating the whole backend.

## Completed slices

| Slice | PRD | Status |
|---|---|---|
| Auth | FR-1.x | Done |
| Resume upload/list | FR-2.1–2.3 | Done |
| Job descriptions | FR-3.x | Done |
| Match analysis + scoring | FR-4.x | Done |
| Application tracking | FR-6.x | Done |
| Interview prep | FR-7.x | Not started |

## Application tracking (FR-6.x) — latest

- `POST /applications` — create (resume + JD + optional match analysis)
- `GET /applications` — list with `?stage=`, `?search=`, `?sort=`, `?order=`
- `GET /applications/:id` — detail + stage history
- `PATCH /applications/:id` — update notes
- `PATCH /applications/:id/stage` — change stage (audit logged)
- `DELETE /applications/:id`

See `docs/phase-5-applications.md` for Postman test flow.

## Next slice

Interview question sets (FR-7.x) — last core backend module before frontend.

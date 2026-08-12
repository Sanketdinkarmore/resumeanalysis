# Phase 5 — Auth Module (file-by-file walkthrough)

Auth is implemented. This doc explains **what each file does** and **how a request flows**.

---

## Endpoints

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Sign in |
| POST | `/auth/refresh` | No | Get new access token using refresh token |
| POST | `/auth/logout` | No | Revoke refresh token |
| GET | `/auth/me` | Yes (Bearer JWT) | Who am I? |

---

## Request flow (register example)

```
Client POST /auth/register { email, password }
        ↓
validators/auth.ts     → Zod checks email format, password length
        ↓
lib/password.ts        → argon2 hash (never store plain password)
        ↓
Prisma User.create     → row in `users` table
        ↓
lib/tokens.ts          → sign JWT + create random refresh token
        ↓
Prisma RefreshToken.create → store SHA-256 hash of refresh token
        ↓
Response 201 { user, accessToken, refreshToken, expiresAt }
```

---

## File map

### `src/config/env.ts`
Loads `.env` with `dotenv`, validates all required vars with Zod.
If `DATABASE_URL` or `JWT_ACCESS_SECRET` is missing → app crashes at startup (fail fast).

### `src/validators/auth.ts`
Input schemas only — no business logic.

- `registerSchema` / `loginSchema`: email + password (8–72 chars)
- Email normalized to lowercase
- `refreshSchema`: body must include `refreshToken`

Invalid body → `errorHandler` returns `400 VALIDATION_ERROR`.

### `src/lib/password.ts`
- `hashPassword` — used on register
- `verifyPassword` — used on login

Uses **argon2** (PRD: bcrypt/argon2). Industry standard; resistant to brute force.

### `src/lib/tokens.ts`
Two token types:

1. **Access token (JWT)** — short-lived (`15m`). Client sends `Authorization: Bearer <token>` on protected routes.
2. **Refresh token (opaque random string)** — long-lived (`7 days`). Only a **hash** stored in DB.

Why hash refresh tokens? If someone dumps the DB, they still can't use tokens.

Functions:
- `signAccessToken` / `verifyAccessToken`
- `createRefreshToken` / `hashToken`

### `src/middleware/requireAuth.ts`
Reads `Authorization` header, verifies JWT, attaches `req.user` (`sub`, `email`, `role`).
Used on routes like `GET /auth/me` and later all resume/JD routes.

### `src/middleware/errorHandler.ts`
Consistent error JSON everywhere:

```json
{ "code": "...", "message": "...", "details": null }
```

Handles: `AppError` (our throws), `ZodError` (validation), unknown (500).

### `src/routes/auth.ts`
Route handlers — the orchestration layer.

| Route | Key logic |
|---|---|
| `/register` | Create user; duplicate email → `409 EMAIL_TAKEN` |
| `/login` | Find user; wrong password → `401 INVALID_CREDENTIALS` (same message whether email exists — don't leak accounts) |
| `/refresh` | Validate stored refresh token; **rotate** (revoke old, issue new pair) |
| `/logout` | Set `revokedAt` on refresh token |
| `/me` | Return current user from access token |

### `src/index.ts`
Wires Express: CORS, JSON parser, mounts `/health` and `/auth`, global error handler.

---

## Test commands (PowerShell)

**Register:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"you@example.com","password":"password123"}'
```

**Login:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"you@example.com","password":"password123"}'
```

**Me (paste accessToken from login response):**
```powershell
$h = @{ Authorization = "Bearer YOUR_ACCESS_TOKEN_HERE" }
Invoke-RestMethod -Uri "http://localhost:4000/auth/me" -Headers $h
```

**Refresh:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/refresh" `
  -ContentType "application/json" `
  -Body '{"refreshToken":"YOUR_REFRESH_TOKEN_HERE"}'
```

**Logout:**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/logout" `
  -ContentType "application/json" `
  -Body '{"refreshToken":"YOUR_REFRESH_TOKEN_HERE"}'
```

---

## What to verify in pgAdmin after register

1. **`users`** — one row, `passwordHash` starts with `$argon2`
2. **`refresh_tokens`** — one row, `tokenHash` is 64-char hex (SHA-256), `revokedAt` is null
3. After **logout** — same refresh row has `revokedAt` set
4. After **refresh** — old token row revoked; new row created

---

## Next slice (Phase 5 continued)

Resume upload module:
- PDF → S3/MinIO
- `ResumeVersion` row
- Async parse job (later with FastAPI)

Say **`continue resumes`** when auth + pgAdmin make sense to you.

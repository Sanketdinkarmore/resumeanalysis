# pgAdmin Setup — Connect to Docker Postgres

pgAdmin is a **GUI to browse** your database. It does not replace Postgres — our database runs in Docker (`jri-postgres`).

---

## Connection details (from `docker-compose.yml`)

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `jri` |
| Username | `jri` |
| Password | `jri` |

These match `DATABASE_URL` in `apps/api/.env`.

---

## Step-by-step in pgAdmin

### 1. Open pgAdmin and register a server

1. Launch **pgAdmin 4**
2. Left sidebar → **Servers** → right-click → **Register → Server…**

### 2. General tab

- **Name:** `JRI Local` (any label you like — this is just for you)

### 3. Connection tab

Fill in exactly:

```
Host name/address:  localhost
Port:               5432
Maintenance database: jri
Username:           jri
Password:           jri
```

Check **Save password** if you want.

Click **Save**.

### 4. If connection fails

| Problem | Fix |
|---|---|
| "Connection refused" | Docker Desktop not running, or Postgres container stopped. Run: `docker compose up -d postgres` from repo root |
| "Password authentication failed" | Use `jri` / `jri` — not your Windows password |
| Port 5432 in use | Another Postgres may be running locally. Stop it or change Docker port in `docker-compose.yml` |

Verify Postgres is healthy:

```powershell
cd d:\resumeanalysis
docker compose ps postgres
```

You want `STATUS` = `Up ... (healthy)`.

---

## Where to see your tables

In the left tree, expand:

```
Servers
  └── JRI Local
        └── Databases
              └── jri
                    └── Schemas
                          └── public
                                └── Tables
```

You should see **15 tables**, including:

| Table | What it stores |
|---|---|
| `users` | Accounts (email, hashed password, role) |
| `refresh_tokens` | Login sessions (hashed refresh tokens) |
| `resume_versions` | Uploaded resume metadata |
| `parsed_resume_data` | Extracted resume JSON |
| `job_descriptions` | Pasted JD text |
| `match_analyses` | Resume↔JD scores |
| `applications` | Application tracking |
| `interview_questions` | Interview prep |

---

## Try it after registering a user

1. Start API: `cd apps/api && npm run dev`
2. Register via API (PowerShell):

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"you@example.com","password":"password123"}'
```

3. In pgAdmin: right-click **`users`** → **View/Edit Data → All Rows**
4. You should see your row — **`passwordHash`** is a long argon2 string, never the plain password

Same for **`refresh_tokens`** — you see a hash, not the raw token the client received.

---

## Quick SQL queries (optional)

Right-click `jri` → **Query Tool**:

```sql
-- All users (safe columns only)
SELECT id, email, role, "createdAt" FROM users;

-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

---

## pgAdmin vs Prisma Studio

| Tool | Best for |
|---|---|
| **pgAdmin** | Raw SQL, inspecting exact DB state, learning Postgres |
| **Prisma Studio** | Browsing via your schema models (`npx prisma studio` in `apps/api`) |

Both point at the same database.

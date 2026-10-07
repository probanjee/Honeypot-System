# README: VIGILANCE Supabase Update

## What this update does

This update moves the VIGILANCE Honeypot System to Supabase for:
- Postgres database
- Auth
- Row Level Security
- Realtime dashboard updates
- migrations and local reproducibility

## Why Supabase

Supabase gives the project a single Postgres-based backend foundation with built-in auth and RLS. This is better than the current mixed state where MongoDB, platform Postgres assumptions, custom JWTs, and direct frontend SSE connections do not fully align.

## Quick setup

```bash
supabase init
supabase start
supabase migration new init_vigilance_schema
```

Paste the SQL from `06_SUPABASE_MIGRATION_SQL.md`.

Then:

```bash
supabase db reset
supabase status
```

## Local services

| Service | URL |
|---|---|
| Supabase API | `http://127.0.0.1:54321` |
| Supabase DB | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Intranet target app | `http://localhost:3001` |
| FastAPI backend | `http://localhost:8000` |
| React dashboard | `http://localhost:5173` |

## Required env variables

Frontend:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

Backend:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
```

## Security rules

- Frontend uses anon key only.
- Backend/ingestion uses service role key only.
- RLS is enabled on all public tables.
- Attack events are not writable by browser clients.
- Raw payloads are not visible to normal users or analysts by default.
- Role updates are admin-only.

## Development checklist

- [ ] Supabase starts locally.
- [ ] Migration applies.
- [ ] Signup creates profile.
- [ ] Admin role can be bootstrapped.
- [ ] Intranet app can read/update profile.
- [ ] Match updates create score events.
- [ ] Attack ingestion writes to Supabase.
- [ ] Dashboard reads FastAPI/Supabase data.
- [ ] Normal user cannot read attack telemetry.
- [ ] Analyst can read attack dashboard.
- [ ] Admin can manage rules/users.

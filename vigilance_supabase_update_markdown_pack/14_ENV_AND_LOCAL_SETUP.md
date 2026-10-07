# Environment and Local Setup

## Required tools

- Node.js LTS
- Python 3.11+
- Docker Desktop
- Supabase CLI
- Git
- pnpm or npm

## Supabase local setup

```bash
supabase init
supabase start
supabase status
```

## Create migration

```bash
supabase migration new init_vigilance_schema
```

Paste the SQL from `06_SUPABASE_MIGRATION_SQL.md`.

## Reset local database

```bash
supabase db reset
```

## Root `.env.example`

```env
# Shared
NODE_ENV=development
APP_ENV=local

# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Node intranet target app
INTRANET_PORT=3001
PLATFORM_INTERNAL_API_URL=http://localhost:8000
PLATFORM_INTERNAL_API_KEY=change-me-local-only

# FastAPI backend
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# Frontend
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
VITE_REALTIME_MODE=supabase

# Kafka/Redis
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379/0

# Threat intel
ABUSEIPDB_API_KEY=
SHODAN_API_KEY=
THREAT_INTEL_ENABLED=false
```

## Service-specific env files

### `nowhere-esports-intranet/.env.example`

```env
PORT=3001
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
PLATFORM_INTERNAL_API_URL=http://localhost:8000
PLATFORM_INTERNAL_API_KEY=change-me
```

### `honeypot-platform/services/backend/.env.example`

```env
BACKEND_PORT=8000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
PLATFORM_INTERNAL_API_KEY=change-me
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379/0
```

### `honeypot-platform/frontend/.env.example`

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
VITE_REALTIME_MODE=supabase
```

## Startup script fix

The startup script should copy missing env files:

```bat
if not exist "nowhere-esports-intranet\.env" copy "nowhere-esports-intranet\.env.example" "nowhere-esports-intranet\.env"
if not exist "honeypot-platform\frontend\.env" copy "honeypot-platform\frontend\.env.example" "honeypot-platform\frontend\.env"
if not exist "honeypot-platform\services\backend\.env" copy "honeypot-platform\services\backend\.env.example" "honeypot-platform\services\backend\.env"
```

## Port standardization

| Service | Port |
|---|---:|
| Intranet target app | 3001 |
| FastAPI platform backend | 8000 |
| React dashboard | 5173 |
| Supabase API local | 54321 |
| Supabase DB local | 54322 |
| Redis | 6379 |
| Kafka | 9092 |

## Smoke test checklist

- Supabase starts locally.
- Migration applies cleanly.
- Intranet app starts on 3001.
- FastAPI starts on 8000.
- Dashboard starts on 5173.
- User can sign up/log in.
- Profile row is created automatically.
- Admin can promote user role.
- Analyst can see attack dashboard.
- Normal user cannot see attack dashboard.
- Match score update creates `match_score_events`.
- Attack ingestion creates `attack_events`.

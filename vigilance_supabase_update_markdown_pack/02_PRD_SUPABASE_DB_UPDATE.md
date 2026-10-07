# PRD: Supabase Database Update

## Product name

VIGILANCE Supabase Persistence Upgrade

## Objective

Migrate the VIGILANCE Honeypot System from mixed MongoDB/Postgres assumptions to a Supabase-backed Postgres database with secure auth, RLS, migrations, realtime dashboard support, and clean service boundaries.

## Users

### Admin
- Manages users, roles, rules, alerts, matches, announcements.
- Can view all attack events and system health.

### Analyst
- Can view dashboards, attack events, threat enrichment, alerts, and reports.
- Cannot manage users or destructive settings.

### Team/User
- Can view allowed intranet content, matches, announcements, and own profile.
- Cannot view raw platform-only security telemetry unless explicitly permitted.

### Service/Ingestion worker
- Inserts attack events, enrichments, alerts, health checks, and ingestion logs.
- Uses server-side credentials only.

## Must-have features

1. Supabase project setup with local and remote environments.
2. Supabase migrations for all required tables.
3. RLS enabled on every public table.
4. Supabase Auth integration for users.
5. Role-aware access control.
6. Migration path from MongoDB/Mongoose models.
7. Secure attack event ingestion.
8. Dashboard query APIs.
9. Realtime dashboard update path.
10. Test plan covering migrations, RLS, auth, APIs, and realtime.

## Should-have features

1. Audit logging for admin actions.
2. Alert delivery tracking.
3. Threat intel enrichment cache.
4. Rule versioning.
5. Materialized views for dashboard metrics.
6. Retention policy for attack payloads.
7. CSV/JSON export through backend only.

## Out of scope for first update

- Replacing Kafka entirely.
- Public write access to telemetry tables.
- Storing full secrets, credentials, access tokens, or private API keys in frontend.
- Direct browser access to service-role credentials.
- Building a full SIEM replacement.

## Success metrics

- All existing auth/profile/match/announcement flows work without MongoDB.
- FastAPI dashboard APIs read from Supabase.
- Attack event inserts are service-only.
- RLS tests prove unauthorized users cannot read protected tables.
- Frontend no longer depends directly on the vulnerable target app SSE endpoint.
- Local setup can be reproduced using `.env.example` and migration files.

## Acceptance criteria

- `supabase/migrations` contains a complete schema migration.
- All tables in `public` have RLS enabled.
- Browser clients use anon key only.
- Backend/ingestion services use service role or direct database URL only on the server.
- Tests pass for role permissions: admin, analyst, normal user, unauthenticated.
- Existing bugs from the uploaded audit are either fixed or tracked in `18_TASK_BREAKDOWN.md`.

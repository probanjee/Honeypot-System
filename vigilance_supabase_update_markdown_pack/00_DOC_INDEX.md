# VIGILANCE Supabase Update Documentation Index

## Purpose

This pack contains the markdown files needed to guide an Antigravity/Codex update of the VIGILANCE Honeypot System toward a Supabase-backed database architecture.

## Recommended build order

1. `01_SUPABASE_UPDATE_OVERVIEW.md`
2. `02_PRD_SUPABASE_DB_UPDATE.md`
3. `03_TRD_SUPABASE_ARCHITECTURE.md`
4. `04_CURRENT_BUGS_TO_FIX_BEFORE_SUPABASE.md`
5. `05_SUPABASE_SCHEMA_DESIGN.md`
6. `06_SUPABASE_MIGRATION_SQL.md`
7. `07_RLS_SECURITY_POLICIES.md`
8. `08_AUTH_AND_ROLES_PLAN.md`
9. `09_REALTIME_EVENTS_PLAN.md`
10. `10_BACKEND_FASTAPI_INTEGRATION.md`
11. `11_NODE_INTRAnET_INTEGRATION.md`
12. `12_FRONTEND_DASHBOARD_INTEGRATION.md`
13. `13_DATA_MIGRATION_MONGODB_TO_SUPABASE.md`
14. `14_ENV_AND_LOCAL_SETUP.md`
15. `15_API_SPEC_AFTER_UPDATE.md`
16. `16_TEST_PLAN_AND_ACCEPTANCE.md`
17. `17_DEPLOYMENT_AND_ROLLBACK.md`
18. `18_TASK_BREAKDOWN.md`
19. `19_CODEX_ANTIGRAVITY_MASTER_PROMPT.md`
20. `20_CHANGELOG_TEMPLATE.md`
21. `21_README_SUPABASE_UPDATE.md`

## Final target

The final system should have:
- Supabase Postgres as the main relational database.
- Supabase Auth for user identity.
- Strict Row Level Security for all exposed tables.
- Service-role-only ingestion for attack events.
- Realtime dashboard updates through the backend or Supabase Realtime.
- Clean separation between the vulnerable intranet target and the analysis platform.
- Verified tests for auth, RLS, migrations, ingestion, realtime, and frontend integration.

# Source Context

This documentation pack is based on the uploaded VIGILANCE Project Structure & Bug Report.

Current repository summary:
- `nowhere-esports-intranet`: Node.js/Express target vulnerable web app with Mongoose models, Passport/JWT auth, OTP service, matches, announcements, and honeypot middleware.
- `honeypot-platform`: detection and analytics platform with FastAPI backend, React/Vite dashboard, Kafka/Redis/Postgres-oriented services, honeypot simulators, ingestion, analytics, alerting, and threat-intel services.
- Known issues include JWT utility mismatch, plain JWT payload used like a Mongoose document, expired OTP validation gap, missing live score broadcast, import/path crashes in Python services, frontend live-stream architecture mismatch, and port/env mismatch.

Update goal:
Move the project database layer to Supabase/Postgres with Supabase Auth, Row Level Security, migrations, and Realtime support where useful, without weakening the honeypot isolation model.

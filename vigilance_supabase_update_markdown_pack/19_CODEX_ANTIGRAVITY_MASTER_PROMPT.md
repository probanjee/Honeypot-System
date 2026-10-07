# Master Prompt for Antigravity/Codex

Use this prompt to make the Supabase update safely.

```text
You are working on the VIGILANCE Honeypot System repository.

Goal:
Migrate the project database/auth foundation to Supabase while fixing the known bugs from the current audit. Use Supabase Postgres, Supabase Auth, Row Level Security, migrations, and a secure realtime/dashboard architecture.

Repository context:
- `nowhere-esports-intranet` is a Node.js/Express vulnerable target app currently using MongoDB/Mongoose models for users, OTP tokens, matches, announcements, and attack logs.
- `honeypot-platform` is the detection platform with FastAPI backend, React/Vite dashboard, Kafka/Redis/Postgres-oriented services, honeypots, ingestion, analytics, alerting, and threat-intel.
- Current audit found: JWT utility import mismatch, `req.user` used like a Mongoose document, OTP expiry validation gap, missing match broadcast, announcement creator id mismatch, Python service import crashes, analytics `session_id` crash, pytest path issues, frontend direct SSE architecture mismatch, and port/env mismatch.

Supabase target:
1. Add Supabase local setup and migration structure.
2. Create migration for:
   - enum types: `app_role`, `attack_severity`, `alert_status`, `match_status`
   - tables: `teams`, `profiles`, `announcements`, `matches`, `match_score_events`, `honeypot_nodes`, `honeypot_sessions`, `attack_events`, `attack_payloads`, `threat_enrichments`, `detection_rules`, `alerts`, `system_health_checks`, `audit_logs`
   - views: `attack_event_summary`, `attack_counts_by_severity`, `recent_alerts`
   - indexes and `updated_at` triggers
   - RLS policies for normal users, analysts, admins, and service-only writes
   - auth trigger to create profile on user signup
3. Ensure all public tables have RLS enabled.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend.

Implementation instructions:
- First inspect current file tree and package files.
- Create a clear implementation plan before editing.
- Apply changes in small logical commits/patches.
- Preserve existing UI unless required for auth/realtime integration.
- Replace MongoDB/Mongoose runtime dependency only after equivalent Supabase paths exist.
- Keep migration scripts reversible or backed by exports.
- Add `.env.example` updates for root, Node app, FastAPI backend, and frontend.
- Fix all known bugs listed in the audit.
- Replace direct dashboard connection to vulnerable-app SSE with FastAPI WebSocket or Supabase Realtime.
- Keep raw attack payloads backend/admin-only.
- Add tests for auth, RLS assumptions, backend APIs, ingestion, realtime, and bug regressions.

Security requirements:
- Browser uses only Supabase anon key.
- Backend/worker uses service role key only in server env.
- Attack ingestion endpoints require internal auth.
- Normal users cannot read attack telemetry.
- Analysts can read attack summaries and alerts.
- Admins can manage users/rules/announcements/matches and read audit logs.
- Do not allow users to update their own role.

Expected files to create/update:
- `supabase/migrations/<timestamp>_init_vigilance_schema.sql`
- `supabase/seed.sql`
- `.env.example`
- `nowhere-esports-intranet/.env.example`
- `honeypot-platform/services/backend/.env.example`
- `honeypot-platform/frontend/.env.example`
- Node Supabase client/service files
- FastAPI Supabase config/security/repositories
- Frontend Supabase client/auth hooks/realtime hooks
- Tests for the above
- README/changelog documentation

Validation commands:
- `supabase db reset`
- Node app tests
- FastAPI pytest
- frontend typecheck/build
- smoke test: signup/login/profile
- smoke test: admin role promotion
- smoke test: attack ingestion
- smoke test: analyst dashboard access
- smoke test: normal user denied attack telemetry
- smoke test: match update creates realtime score event

Do not finish until:
- The app no longer requires MongoDB for normal runtime.
- Supabase migrations apply cleanly.
- RLS is enabled and tested.
- No service role key is present in frontend code.
- Known audit bugs are fixed or explicitly documented as deferred with reason.
- Builds/tests pass or every remaining failure is documented with exact file, command, error, and next fix.
```

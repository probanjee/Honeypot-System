# Test Plan and Acceptance Criteria

## Test levels

1. Migration tests
2. RLS/security tests
3. Auth tests
4. Backend API tests
5. Ingestion tests
6. Realtime tests
7. Frontend integration tests
8. Regression tests for known bugs

## Migration tests

Commands:
```bash
supabase db reset
supabase migration list
```

Pass criteria:
- Migration applies cleanly.
- All expected tables exist.
- All public tables have RLS enabled.
- Views are created.
- Indexes are created.

## RLS tests

Create test users:
- normal user
- analyst
- admin

Test cases:
- anon cannot read protected tables.
- normal user can read own profile only.
- normal user cannot read `attack_events`.
- analyst can read `attack_events`.
- analyst cannot read `attack_payloads`.
- admin can read `audit_logs`.
- normal user cannot update own role.
- browser cannot insert `attack_events`.

## Auth tests

- Signup creates `profiles` row.
- Login returns Supabase session.
- Logout clears session.
- Expired token is rejected by backend.
- Missing token returns 401.
- Normal user accessing analyst route returns 403.

## Backend API tests

Use pytest for FastAPI:
- `GET /api/me`
- `GET /api/dashboard/summary`
- `GET /api/attacks`
- `POST /internal/attacks`
- `PATCH /api/alerts/{id}`
- `PATCH /api/matches/{id}/score`

## Node intranet tests

Use Jest:
- Auth middleware normalizes `req.user`.
- Profile update no longer calls `req.user.save()`.
- Announcement uses `created_by = req.user.id`.
- Match update inserts score event.
- Suspicious request creates sanitized platform event.

## Ingestion tests

- Kafka sample event is parsed.
- Invalid event is rejected or quarantined.
- Valid event creates Supabase `attack_events` row.
- Raw payload is separated into `attack_payloads`.
- Service key is required for internal insert route.

## Realtime tests

- Insert into `match_score_events` triggers frontend update.
- Insert into `alerts` updates alert panel.
- Analyst receives attack event update.
- Normal user does not receive attack event data.
- Reconnect works after network interruption.

## Regression tests for uploaded bugs

| Bug | Test |
|---|---|
| JWT import mismatch | auth service starts and login works |
| `req.user.save()` crash | profile update succeeds |
| OTP expiry gap | expired OTP rejected or Supabase OTP used |
| Match broadcast missing | score update triggers event |
| Announcement creator mismatch | created_by populated |
| Python typing import crash | ingestion service imports cleanly |
| Analytics session field crash | analytics runs with `.size()` or session_id |
| Threat-intel import crash | service imports cleanly |
| HTTP honeypot import crash | server starts |
| Pytest path issue | pytest collection works |
| Frontend SSE mismatch | dashboard uses configured API/realtime |
| Port mismatch | startup script opens correct ports |

## Final acceptance

The update is accepted only when:

- MongoDB is no longer required for normal app operation.
- Supabase migration can recreate the database from scratch.
- RLS policies are tested.
- Frontend uses Supabase Auth.
- Backend APIs validate Supabase JWT.
- Attack ingestion is service-only.
- Known bug regressions are covered.

# Current Bugs to Fix Before or During Supabase Update

This list is derived from the uploaded VIGILANCE bug report and reorganized for the Supabase migration.

## Critical bugs

### 1. JWT utility import mismatch

Current issue:
- `auth.service.js` imports `{ sign }` from `../utils/jwt`.
- `jwt.js` exports `generateJWT`, `verifyJWT`, and `decodeJWT`.

Required fix:
- Replace custom JWT generation with Supabase Auth where possible.
- During transition, import the correct utility.

Migration note:
- After Supabase Auth is active, remove custom token generation from normal login flows.

### 2. `req.user` treated as Mongoose document

Current issue:
- JWT middleware attaches a plain object.
- Routes call `req.user._id` and `req.user.save()`.

Required fix:
- Replace Mongoose document assumptions with Supabase profile lookups.
- Use `req.user.id` or Supabase `auth.uid()` equivalent.
- Update profile via SQL/Supabase query, not `save()`.

### 3. OTP expiry not checked during verification

Current issue:
- Verification does not check `expiresAt > now`.
- TTL cleanup delay can allow expired OTPs.

Required fix:
- Prefer Supabase Auth OTP.
- If custom OTP remains, add explicit expiry check in SQL query.

### 4. Missing live match broadcast

Current issue:
- Score update saves match but does not broadcast change.

Required fix:
- Store match score updates in Supabase.
- Use Supabase Realtime or backend WebSocket to push updates.
- Create `match_score_events` table for event history.

### 5. Announcement `createdBy` mismatch

Current issue:
- Uses `req.user._id`, but middleware provides `id`.

Required fix:
- Use Supabase Auth user id.
- Store `created_by uuid references auth.users(id)`.

### 6. Python ingestion import error

Current issue:
- `from typing import dict as Dict` crashes.

Required fix:
- Use `from typing import Dict`.

### 7. Analytics service assumes missing `session_id`

Current issue:
- Dataframe code expects `session_id` but schema lacks it.

Required fix:
- Add `session_id` to attack event schema or use `.size()`.
- Recommended: add `session_id uuid/text` to `attack_events`.

### 8. Threat-intel import path crash

Current issue:
- Folder uses hyphen `threat-intel`, import uses underscore `threat_intel`.

Required fix:
- Rename folder to `threat_intel` or use local imports.
- Recommended: rename service package folder to Python-safe `threat_intel`.

### 9. HTTP honeypot import crash

Current issue:
- Imports `from src.handlers` but runtime path does not expose `src`.

Required fix:
- Use local import `from handlers import HTTPHoneypotHandler` or set module path properly.

### 10. Pytest path errors

Current issue:
- Tests insert wrong directories into `sys.path`.

Required fix:
- Use absolute paths based on project root.
- Add per-service `pyproject.toml` or install packages in editable mode.

### 11. Dashboard live-stream architecture mismatch

Current issue:
- React frontend connects directly to vulnerable app SSE.
- FastAPI WebSocket is blank and never broadcasts Kafka events.

Required fix:
- Dashboard should consume from FastAPI or Supabase Realtime.
- Ingestion pipeline should write dashboard-safe rows into Supabase.
- FastAPI WebSocket should broadcast saved/enriched events if used.

### 12. Port/env mismatch

Current issue:
- Startup script says port 3000.
- Target app defaults to 3001 without `.env`.

Required fix:
- Standardize ports in `.env.example`.
- Startup script should copy `.env.example` if missing.
- Frontend should read backend URLs from env variables.

## Fixing priority

| Priority | Fix |
|---|---|
| P0 | Auth/JWT/user profile bugs |
| P0 | Env/port mismatch |
| P0 | Supabase schema + RLS |
| P1 | Ingestion import crashes |
| P1 | Realtime architecture mismatch |
| P1 | Analytics session schema |
| P2 | Threat intel package cleanup |
| P2 | Test path cleanup |
| P3 | Match/announcement realtime polish |

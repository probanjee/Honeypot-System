# Phase 1 Audit & Bug Fix Report — VIGILANCE / Honeypot-System

This document provides a summary of the repository audit, verified bugs, specific resolutions applied, validation tests run, and technical debt/recommendations identified during Phase 1.

---

## 1. Project Overview & Framework Details
* **Project Structure**: Multi-repo/service workspace containing the target enterprise intranet server (`nowhere-esports-intranet`) and the honeypot detection platform (`honeypot-platform`).
* **Frameworks Used**:
  * **Intranet Backend**: Node.js, Express, Mongoose, Passport (JWT, Local, Google OAuth2.0).
  * **Honeypot Backend**: FastAPI (Python), SQLAlchemy, Kafka, Redis.
  * **Dashboard Frontend**: React (TypeScript), Vite, TailwindCSS.
* **Package Managers**: `npm` for Node.js services; `pip` + `venv` (via requirements.txt) for Python services.
* **Tested Environment Versions**:
  * **Node.js**: `v24.15.0`
  * **Python**: `3.14.4` (Pre-release with breaking C-API changes affecting native packages like `asyncpg` compilation).

---

## 2. Summary of Bugs Fixed

### Bug 1: JWT utility import mismatch
* **File**: `nowhere-esports-intranet/server/services/auth.service.js`
* **Root cause**: Imported `{ sign }` from `../utils/jwt` which exports `generateJWT` instead.
* **Fix**: Updated import to `{ generateJWT }` and updated `generateToken()` caller.

### Bug 2: `req.user` JWT payload treated as Mongoose document
* **File**: `nowhere-esports-intranet/server/routes/user.routes.js`
* **Root cause**: The passport/JWT middleware attaches a plain payload object containing `id`, `email`, and `role` to `req.user`. Sub-routes attempted to call `.save()` and read `.team` or `._id` on this object.
* **Fix**: Imported the `User` model, fetched the user document from the database by `req.user.id` on `/profile` and `/team` requests, and applied Mongoose operations on the retrieved document.

### Bug 3: OTP expiry not checked during verification
* **File**: `nowhere-esports-intranet/server/services/otp.service.js`
* **Root cause**: `verifyOTP` only filtered by `email`, `token`, and `used: false`. Expired tokens remained usable until MongoDB background TTL index cleanups deleted them.
* **Fix**: Added `expiresAt: { $gt: new Date() }` to the `OTPToken.findOne` verification query.

### Bug 4: Match score updates never broadcast
* **File**: `nowhere-esports-intranet/server/controllers/matches.controller.js`
* **Root cause**: The controller updated the match database record in `updateScore` but failed to trigger the SSE broadcast helper.
* **Fix**: Appended `broadcastMatchUpdate(match)` after saving the score.

### Bug 5: Announcement `createdBy` uses `_id`
* **File**: `nowhere-esports-intranet/server/routes/announcements.routes.js`
* **Root cause**: Announcement creation attempted to read `req.user._id`, which is undefined because the authenticated user payload has `id`.
* **Fix**: Use `req.user.id` when setting the `createdBy` field.

### Bug 6: Ingestion typing import crash
* **File**: `honeypot-platform/services/ingestion/processors/attack_processor.py`
* **Root cause**: Statement `from typing import dict as Dict` is invalid in Python.
* **Fix**: Replaced with `from typing import Dict`.

### Bug 7: Analytics service assumes missing `session_id`
* **File**: `honeypot-platform/services/analytics/main.py`
* **Root cause**: Resampled and aggregated dataframe rows by grouping and calling `['session_id']`, which crashes if the incoming attack log lacks a session ID.
* **Fix**: Replaced `.count()['session_id']` with `.size()` which computes group count without relying on the column.

### Bug 8: Threat-intel package path crash
* **Directory/Files**: `honeypot-platform/services/threat-intel`
* **Root cause**: Folder name contained a hyphen (`threat-intel`) making it impossible to import as a Python package.
* **Fix**:
  * Renamed directory to `threat_intel`.
  * Updated build context in `docker-compose.yml`.
  * Updated COPY and CMD paths in `Dockerfile`.

### Bug 9: HTTP honeypot import crash
* **File**: `honeypot-platform/services/honeypots/http/src/server.py`
* **Root cause**: Attempted to import `from src.handlers import ...` but the root package structure did not map `src` as a top-level module.
* **Fix**: Simplified to local import: `from handlers import HTTPHoneypotHandler`.

### Bug 10: Pytest path errors
* **Files**: `test_attack_processor.py`, `test_attacks_api.py`, and a new `conftest.py`
* **Root cause**: Incorrect `sys.path` lookup depths (e.g. `../../../` instead of `../../`) in `test_attack_processor.py`, and missing path lookup config in `test_attacks_api.py`.
* **Fix**:
  * Corrected path depths in `test_attack_processor.py`.
  * Configured `sys.path.insert` in `test_attacks_api.py`.
  * Created `conftest.py` to correctly initialize the backend `PYTHONPATH` for all test suites.

### Bug 11: Startup script port/env inconsistency
* **Files**: `start_project.bat` & `nowhere-esports-intranet/server/config/config.js`
* **Root cause**: Start script expected backend on port 3000, but without a `.env` file the backend defaulted to port 3001. No `.env` files were created by default.
* **Fix**:
  * Added logic in `start_project.bat` to copy `.env.example` to `.env` if missing.
  * Corrected default port fallback to 3000 in `config.js`.

### Pre-Existing Frontend Errors Fixed
* **Files**: `App.tsx`, `useHoneypotStream.ts`, `LogStream.tsx`
* **Fixes**:
  * Implemented missing `LogStream` React component under `src/features/logs/components/LogStream.tsx`.
  * Removed unexpected parameter `200` from `useHoneypotStream()` call.
  * Replaced `NodeJS.Timeout` type annotation with browser-compatible `any`.

---

## 3. Verification & Test Runs

### Intranet Jest Tests
Run location: `nowhere-esports-intranet`
* **Command**: `npm test`
* **Result**: `PASS tests/unit/auth.test.js` (7 passed, 7 total)

### Python Pytest Runs
Run location: `honeypot-platform`
* **Command**: `.\.venv\Scripts\python.exe -m pytest tests/backend/unit tests/ingestion`
* **Result**: `22 passed`
* **Note on Integration/Docker Tests**: Integration tests that communicate with databases and external services (like `test_attacks_api.py`) compile and collect perfectly now (verified via `pytest --collect-only`), but require active database connections to run.

### Frontend Production Bundle Build
Run location: `honeypot-platform/frontend`
* **Command**: `npm run build`
* **Result**: Built successfully (`dist/assets/index-af53fa1e.js` output with 0 typescript/linting errors).

---

## 4. Remaining Technical Debt & Warnings

1. **Python 3.14 Compatibility**: Python 3.14 (the host version) has breaking C-API changes preventing the compilation of `asyncpg 0.29.0`. To allow unit testing without a compiled binary, we introduced a mock in `conftest.py`. In production or Docker, Python 3.11 is used (which compiles successfully).
2. **Environment Variables**: Local runs still require configuring external mock tokens for Shodan/AbuseIPDB if the user expects real intelligence results.
3. **Mongoose/MongoDB Transition**: In Phase 2, when we migrate to Supabase, we will replace the Mongoose schemas and models with direct SQL tables and Supabase clients, which will remove Mongoose-related code paths entirely.

---

## 5. Recommendations Before Phase 2

1. **Keep the Python 3.11 Docker runtime**: Ensure the production build uses the Dockerfiles which explicitly pin `python:3.11-slim` where `asyncpg` compiles correctly.
2. **Supabase Client Placement**: In Phase 2, structure the Supabase client as an Express service helper to replace the Passport local session store and Mongoose connection helpers.

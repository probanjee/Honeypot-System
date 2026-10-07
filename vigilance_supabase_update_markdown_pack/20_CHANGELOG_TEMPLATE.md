# Changelog Template: Supabase DB Upgrade

## [Unreleased] - YYYY-MM-DD

### Added
- Supabase local project setup.
- Supabase migration for VIGILANCE schema.
- Supabase Auth profile trigger.
- RLS policies for user, analyst, admin, and service-only access.
- FastAPI Supabase service client.
- React Supabase client.
- Realtime support for match score events, alerts, and dashboard updates.
- Internal attack ingestion endpoint.
- Audit logging structure.

### Changed
- Replaced MongoDB/Mongoose runtime dependency with Supabase/Postgres.
- Replaced custom JWT generation with Supabase Auth session/JWT flow.
- Updated profile route to use Supabase `profiles`.
- Updated announcements and matches to use Supabase tables.
- Updated frontend dashboard to use FastAPI/Supabase realtime instead of vulnerable-app SSE.
- Standardized ports and `.env.example` files.

### Fixed
- JWT utility import crash.
- `req.user.save()` runtime crash.
- OTP expiration validation design.
- Missing match score realtime event.
- Announcement creator id mismatch.
- Python typing import crash.
- Analytics `session_id` KeyError.
- Threat-intel import path crash.
- HTTP honeypot import crash.
- Pytest path errors.
- Startup script env/port mismatch.

### Security
- Enabled RLS on all public tables.
- Restricted attack telemetry to analyst/admin roles.
- Restricted raw payloads to admin/service access.
- Prevented frontend exposure of service-role key.
- Added admin-only role updates.
- Added service-only ingestion writes.

### Migration notes
- MongoDB export required before production cutover.
- Users may need Supabase Auth password reset/invite flow.
- Raw payload retention should be configured before production.

### Known limitations
- Kafka remains in the architecture for high-volume ingestion.
- Supabase Realtime should be used only for dashboard-safe/summarized event streams.
- Full production hardening requires rate limiting, API gateway config, and monitoring.

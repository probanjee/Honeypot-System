# Nowhere Esports Intranet - Technical Architecture and Specification

Version: 1.0

Date: 2026-06-28

Status: Target architecture for implementation
Audience: Engineering team, reviewers, project evaluators, cybersecurity assessors

## 0. Executive Summary

Nowhere Esports Intranet is a fictional internal portal for an esports organization. To a normal user it behaves like a legitimate employee intranet with announcements, team management, player schedules, HR workflows, files, support tickets, chat, policies, and administration. To an attacker it behaves like a high-fidelity target application containing monitored deception paths, believable but fake sensitive assets, hidden legacy routes, and instrumented traps.

The intranet is the attack target for the VIGILANCE Cyber Deception Platform. It must look realistic, preserve application safety, and generate structured telemetry when attackers probe, enumerate, inject payloads, brute force, scrape, or interact with decoy content.

Primary stack:

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- Backend: Node.js, Express.js.
- Database: Supabase PostgreSQL.
- Authentication: Supabase Auth.
- Realtime: Supabase Realtime.
- Storage: Supabase Storage.
- Deployment: Docker, Docker Compose.
- Version control: Git.

Non-goals for this document:

- No application source code.
- No real credentials, secrets, or exploitable vulnerabilities.
- No live exploit payload implementation.

## 1. System Architecture

### 1.1 Architecture Goals

- Present a convincing corporate intranet for a fictional esports company.
- Keep normal employee workflows useful and internally consistent.
- Capture high-quality attack telemetry with request context, session context, deception asset context, and risk scoring.
- Avoid storing or exposing real secrets.
- Support role-based access control at the API and database layers.
- Support future migration from a monolithic Express API to service boundaries without redesigning the domain model.
- Keep the project maintainable for a final-year engineering team and credible for a professional portfolio.

### 1.2 High-Level Context

```text
Users and Attackers
       |
       v
React/Vite Intranet Frontend
       |
       v
Express API Gateway and Domain API
       |
       +-------------------+
       |                   |
       v                   v
Supabase Platform      VIGILANCE Telemetry Collector
PostgreSQL             raw attack event intake
Auth                   enrichment and analytics
Realtime               alert generation
Storage                security dashboard
```

### 1.3 Frontend Architecture

The frontend is a single-page application built with React, Vite, TypeScript, Tailwind CSS, and shadcn/ui.

Responsibilities:

- Render the intranet shell, routes, dashboards, tables, forms, calendars, chat, file views, and admin screens.
- Use Supabase Auth client state for sign-in, sign-out, password recovery, and session refresh.
- Call the Express API for domain operations instead of talking directly to privileged database tables.
- Subscribe to Supabase Realtime channels for notifications, announcements, match updates, chat, and security alerts.
- Use shadcn/ui primitives for accessible dialogs, dropdowns, tabs, forms, tables, toasts, command search, and navigation.
- Keep deception UI believable without exposing real secrets.

Recommended frontend layers:

| Layer | Responsibility |
|---|---|
| App shell | Router, layout, auth guard, theme provider, realtime provider. |
| Routes | Page-level components mapped to URL paths. |
| Features | Domain modules such as announcements, players, matches, files, support, and admin. |
| Components | Shared layout, tables, cards, form controls, empty states, modals, and loading states. |
| API clients | Typed wrappers around Express endpoints. |
| Realtime clients | Channel subscriptions and event reducers. |
| Auth | Supabase session state, role resolution, route authorization. |
| Utilities | Formatting, validation helpers, constants, feature flags. |

Frontend routing should be explicit and page-oriented. Sensitive-looking decoy routes should be registered intentionally and routed to monitored deception pages.

### 1.4 Backend Architecture

The backend is a Node.js Express API that acts as the controlled application boundary between the frontend, Supabase, and VIGILANCE.

Responsibilities:

- Verify Supabase JWTs on protected API requests.
- Enforce API-level RBAC.
- Validate request input.
- Run domain workflows that require service-role access or multi-table transactions.
- Apply rate limits and security headers.
- Record activity logs and audit logs.
- Detect suspicious requests and deception asset interactions.
- Send telemetry events to VIGILANCE.
- Provide health checks for local and production deployment.

Recommended backend layers:

| Layer | Responsibility |
|---|---|
| `routes` | HTTP method and path mapping. |
| `middleware` | Auth verification, RBAC, validation, rate limiting, CSRF, request context, honeypot detection. |
| `controllers` | HTTP request orchestration and response shaping. |
| `services` | Business rules, workflows, policy checks, telemetry decisions. |
| `repositories` | Supabase queries and storage access. |
| `validators` | Request body, params, and query schemas. |
| `telemetry` | VIGILANCE event builder, outbox writer, dispatcher. |
| `config` | Environment parsing, feature flags, clients. |

The Express API should be stateless. Any horizontal scaling node must be able to process any request with only the Supabase JWT, database, storage, and configured secrets.

### 1.5 Database Architecture

Supabase PostgreSQL is the primary application database.

Design principles:

- Store identity in Supabase Auth; store application profile and role assignments in `public`.
- Use normalized relational tables for core business data.
- Use `jsonb` only for metadata, request context, flexible audit details, and telemetry payloads.
- Use UUID primary keys for application tables.
- Use `created_at`, `updated_at`, and where relevant `deleted_at` on user-owned records.
- Use Row Level Security for browser-accessible tables.
- Use service-role access only inside trusted backend jobs and carefully reviewed API workflows.
- Keep deception telemetry separate from normal audit/activity tables.

Logical schemas:

| Schema | Purpose |
|---|---|
| `auth` | Managed by Supabase Auth. Stores users, identities, sessions, MFA factors. |
| `public` | Application domain tables, RBAC tables, telemetry tables, realtime source tables. |
| `storage` | Managed by Supabase Storage. File object metadata and bucket policies. |

### 1.6 Authentication Flow

1. User opens the React intranet.
2. The app checks Supabase Auth session state.
3. Unauthenticated users are routed to `/login`.
4. User signs in through Supabase Auth with email/password.
5. Supabase issues access and refresh tokens.
6. The frontend sends the access token as `Authorization: Bearer <jwt>` to Express.
7. Express verifies the JWT against the Supabase project JWT secret or JWKS mechanism supported by the deployed configuration.
8. Express loads the user profile and active roles from PostgreSQL.
9. Express attaches a request context containing `user_id`, `role_keys`, `department_id`, `ip_hash`, `request_id`, and session metadata.
10. All protected actions run through RBAC and optional ownership checks.

MFA should be enabled for HR, Finance, IT Support, Security Analyst, System Administrator, and Super Admin roles.

### 1.7 Authorization Flow

Authorization is enforced in three layers:

| Layer | Control |
|---|---|
| Frontend | Route guards and conditional navigation. This improves UX but is not trusted as a security boundary. |
| Express API | Required permission checks for every protected endpoint. |
| Supabase RLS | Database-level restrictions for tables accessed by authenticated clients or exposed through realtime. |

Permission model:

- Roles are stored in `roles`.
- Permissions are stored in `permissions`.
- Role-permission mapping is stored in `role_permissions`.
- User-role mapping is stored in `user_roles`.
- Ownership checks are implemented for personal resources such as profile, leave requests, notifications, and files.

### 1.8 API Architecture

API standard:

- Base path: `/api/v1`.
- Response format: `{ "data": ..., "meta": ..., "error": null }` for success.
- Error format: `{ "data": null, "meta": { "request_id": "..." }, "error": { "code": "...", "message": "...", "details": ... } }`.
- Pagination: `limit`, `cursor`, `sort`, `direction`.
- Filtering: explicit allowlisted query parameters per endpoint.
- Idempotency: required for high-risk writes such as file uploads, payments, and ticket creation.
- Request tracing: every request receives `x-request-id`.

API styles:

- REST for business workflows.
- Supabase Realtime for live updates.
- Supabase Storage signed URLs for file downloads.
- Internal VIGILANCE collector endpoint for attack telemetry.

### 1.9 Realtime Architecture

Realtime uses Supabase Realtime for:

- Notifications.
- Announcements.
- Match score/status updates.
- Chat messages.
- Support ticket status changes.
- Security alerts for security staff.
- Online presence in chat and dashboards.

Realtime channels must use narrow scopes. Do not subscribe every user to all data.

Example channel groups:

| Channel | Audience | Source |
|---|---|---|
| `user:{user_id}:notifications` | One user | `notifications` inserts/updates. |
| `org:{org_id}:announcements` | Authenticated employees | `announcements` published rows. |
| `match:{match_id}` | Employees with match access | `matches`, `match_events`. |
| `chat:{channel_id}` | Channel members only | `chat_messages`. |
| `security:alerts` | Security Analyst and admins | `security_alerts`, `deception_events`. |
| `presence:department:{department_id}` | Department members | Presence state. |

### 1.10 Logging Architecture

Logging is split by purpose:

| Log Type | Table or Sink | Purpose |
|---|---|---|
| Application activity | `activity_logs` | Normal user actions and user-visible events. |
| Audit trail | `audit_logs` | Administrative, security, and data-changing actions. |
| Authentication events | `auth_events` | Login, logout, MFA, password reset, failed auth attempts. |
| Deception telemetry | `deception_events` | Attacker or suspicious interaction with monitored assets. |
| Delivery outbox | `telemetry_outbox` | Reliable forwarding to VIGILANCE. |
| Runtime logs | Container stdout and log collector | Operational debugging and monitoring. |

Logs must avoid storing raw passwords, tokens, payment details, direct secrets, or unnecessary PII. Request payloads should be redacted and size-limited before storage.

### 1.11 Monitoring Architecture

Minimum monitoring:

- `GET /health/live` for process liveness.
- `GET /health/ready` for database, storage, and telemetry readiness.
- `GET /health/database` for Supabase connectivity.
- Structured container logs.
- Request latency and error-rate metrics.
- Telemetry queue backlog metrics.
- Realtime subscription error metrics.
- Supabase database storage and connection utilization.
- Alert rules for failed telemetry delivery, high 5xx rate, high auth failures, and sudden deception-event spikes.

## 2. Folder Structure

Target repository structure for the upgraded intranet:

```text
nowhere-esports-intranet/
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- app/
|   |   |-- routes/
|   |   |-- features/
|   |   |-- components/
|   |   |   |-- layout/
|   |   |   `-- ui/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- styles/
|   |   `-- types/
|   |-- index.html
|   |-- package.json
|   |-- tailwind.config.ts
|   `-- vite.config.ts
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- repositories/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- telemetry/
|   |   |-- validators/
|   |   |-- jobs/
|   |   |-- utils/
|   |   `-- server.ts
|   |-- tests/
|   `-- package.json
|-- supabase/
|   |-- migrations/
|   |-- policies/
|   |-- seed/
|   `-- storage/
|-- docker/
|   |-- nginx/
|   `-- scripts/
|-- docs/
|-- scripts/
|-- tests/
|   |-- api/
|   |-- e2e/
|   |-- performance/
|   `-- security/
|-- docker-compose.yml
|-- docker-compose.prod.yml
|-- .env.example
`-- README.md
```

Folder purposes:

| Folder | Purpose |
|---|---|
| `frontend/public` | Static assets that do not require bundling. |
| `frontend/src/app` | Providers, router wiring, theme, auth bootstrap, app shell configuration. |
| `frontend/src/routes` | Page-level route components and route guards. |
| `frontend/src/features` | Domain modules such as announcements, employees, matches, files, support, and admin. |
| `frontend/src/components/layout` | Sidebar, header, breadcrumbs, page container, navigation controls. |
| `frontend/src/components/ui` | shadcn/ui components and local UI wrappers. |
| `frontend/src/hooks` | Shared React hooks for auth, realtime, pagination, search, and forms. |
| `frontend/src/lib` | Supabase client, API client, formatting, constants, role helpers. |
| `frontend/src/types` | Shared frontend TypeScript types. |
| `backend/src/config` | Environment parsing, Supabase clients, logger, feature flags. |
| `backend/src/controllers` | HTTP request orchestration. |
| `backend/src/middleware` | Auth, RBAC, validation, rate limiting, telemetry capture, CSRF, security headers. |
| `backend/src/repositories` | Database and storage access. |
| `backend/src/routes` | API route registration grouped by feature. |
| `backend/src/services` | Business workflows and domain policy rules. |
| `backend/src/telemetry` | Deception event model, VIGILANCE dispatcher, retry/outbox processing. |
| `backend/src/validators` | Request schemas for bodies, params, and query strings. |
| `backend/src/jobs` | Background tasks such as telemetry retry, stale session cleanup, digest notifications. |
| `backend/src/utils` | Small cross-cutting helpers. |
| `supabase/migrations` | Versioned database schema migrations. |
| `supabase/policies` | RLS policy source files and review notes. |
| `supabase/seed` | Non-secret seed data for local development and demos. |
| `supabase/storage` | Bucket configuration and storage policy documentation. |
| `docker` | Deployment support files not owned by app runtime code. |
| `docs` | Architecture, specifications, reports, and implementation guidance. |
| `tests` | Cross-service API, E2E, security, accessibility, and performance tests. |

## 3. Database Design

### 3.1 Conventions

- Primary keys use `uuid`.
- Timestamps use `timestamptz`.
- User foreign keys reference `auth.users(id)` unless they point to `profiles(id)`.
- Soft-deletable business records include `deleted_at timestamptz`.
- Tables that need flexible context include `metadata jsonb not null default '{}'::jsonb`.
- Names use `snake_case`.
- RLS is enabled on all user-facing tables.

Recommended enum types:

| Enum | Values |
|---|---|
| `employee_status` | `active`, `on_leave`, `suspended`, `terminated` |
| `match_status` | `scheduled`, `live`, `completed`, `cancelled`, `postponed` |
| `ticket_status` | `open`, `pending`, `resolved`, `closed` |
| `ticket_priority` | `low`, `medium`, `high`, `urgent` |
| `leave_status` | `draft`, `submitted`, `approved`, `rejected`, `cancelled` |
| `file_visibility` | `private`, `department`, `organization`, `restricted` |
| `deception_event_type` | `route_probe`, `credential_use`, `file_access`, `api_probe`, `payload_match`, `legacy_login`, `debug_probe`, `backup_download` |
| `severity_level` | `low`, `medium`, `high`, `critical` |
| `notification_type` | `info`, `success`, `warning`, `security`, `task` |

### 3.2 Core Identity and Organization Tables

#### organizations

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `name` | `text` | Not null, unique. |
| `slug` | `text` | Not null, unique, lowercase. |
| `timezone` | `text` | Not null, default `Asia/Kolkata`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- `organizations_slug_idx` unique on `slug`.

#### departments

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `name` | `text` | Not null. |
| `slug` | `text` | Not null. |
| `description` | `text` | Nullable. |
| `manager_id` | `uuid` | Nullable, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Unique `(organization_id, slug)`.
- Index `departments_organization_id_idx`.
- Index `departments_manager_id_idx`.

#### profiles

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key, references `auth.users(id)` on delete cascade. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `department_id` | `uuid` | Nullable, references `departments(id)`. |
| `employee_code` | `text` | Not null. |
| `email` | `citext` | Not null. |
| `display_name` | `text` | Not null. |
| `job_title` | `text` | Nullable. |
| `phone` | `text` | Nullable. |
| `avatar_path` | `text` | Nullable, Supabase Storage object path. |
| `status` | `employee_status` | Not null, default `active`. |
| `manager_id` | `uuid` | Nullable, references `profiles(id)`. |
| `hire_date` | `date` | Nullable. |
| `last_seen_at` | `timestamptz` | Nullable. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Unique `(organization_id, employee_code)`.
- Unique `(organization_id, email)`.
- Index `profiles_department_id_idx`.
- Index `profiles_manager_id_idx`.
- Index `profiles_status_idx`.
- Full text index on `display_name`, `email`, `job_title`.

#### roles

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `key` | `text` | Not null, unique. Examples: `employee`, `manager`, `hr`. |
| `name` | `text` | Not null. |
| `description` | `text` | Nullable. |
| `is_system` | `boolean` | Not null, default `true`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- `roles_key_idx` unique on `key`.

#### permissions

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `key` | `text` | Not null, unique. Example: `matches.write`. |
| `resource` | `text` | Not null. |
| `action` | `text` | Not null. |
| `description` | `text` | Nullable. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- `permissions_key_idx` unique on `key`.
- `permissions_resource_action_idx` on `(resource, action)`.

#### role_permissions

| Column | Type | Constraints and Notes |
|---|---|---|
| `role_id` | `uuid` | References `roles(id)` on delete cascade. |
| `permission_id` | `uuid` | References `permissions(id)` on delete cascade. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Primary key `(role_id, permission_id)`.
- Index `role_permissions_permission_id_idx`.

#### user_roles

| Column | Type | Constraints and Notes |
|---|---|---|
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `role_id` | `uuid` | References `roles(id)` on delete cascade. |
| `assigned_by` | `uuid` | Nullable, references `profiles(id)`. |
| `assigned_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Primary key `(user_id, role_id)`.
- Index `user_roles_role_id_idx`.

### 3.3 Esports Operations Tables

#### esport_teams

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `name` | `text` | Not null. |
| `game_title` | `text` | Not null. |
| `region` | `text` | Nullable. |
| `coach_id` | `uuid` | Nullable, references `profiles(id)`. |
| `manager_id` | `uuid` | Nullable, references `profiles(id)`. |
| `status` | `text` | Not null, default `active`; check in `active`, `inactive`, `archived`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |
| `deleted_at` | `timestamptz` | Nullable. |

Constraints and indexes:

- Unique `(organization_id, name, game_title)`.
- Index `esport_teams_game_title_idx`.
- Index `esport_teams_manager_id_idx`.

#### players

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `profile_id` | `uuid` | Nullable, references `profiles(id)`. |
| `team_id` | `uuid` | Not null, references `esport_teams(id)`. |
| `handle` | `text` | Not null. |
| `real_name` | `text` | Nullable. |
| `role_name` | `text` | Nullable, game-specific role. |
| `country` | `text` | Nullable. |
| `contract_start` | `date` | Nullable. |
| `contract_end` | `date` | Nullable. |
| `status` | `text` | Not null, default `active`; check in `active`, `bench`, `inactive`, `released`. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Unique `(team_id, handle)`.
- Index `players_team_id_idx`.
- Index `players_profile_id_idx`.
- Full text index on `handle`, `real_name`.

#### tournaments

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `name` | `text` | Not null. |
| `game_title` | `text` | Not null. |
| `location` | `text` | Nullable. |
| `starts_at` | `timestamptz` | Not null. |
| `ends_at` | `timestamptz` | Nullable. |
| `status` | `text` | Not null, default `scheduled`; check in `scheduled`, `active`, `completed`, `cancelled`. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `tournaments_organization_time_idx` on `(organization_id, starts_at)`.
- Index `tournaments_game_title_idx`.

#### matches

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `tournament_id` | `uuid` | Nullable, references `tournaments(id)`. |
| `home_team_id` | `uuid` | Not null, references `esport_teams(id)`. |
| `away_team_name` | `text` | Not null, external opponent name. |
| `game_title` | `text` | Not null. |
| `scheduled_at` | `timestamptz` | Not null. |
| `status` | `match_status` | Not null, default `scheduled`. |
| `home_score` | `integer` | Not null, default `0`; check `>= 0`. |
| `away_score` | `integer` | Not null, default `0`; check `>= 0`. |
| `stream_url` | `text` | Nullable. |
| `notes` | `text` | Nullable. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `matches_scheduled_at_idx`.
- Index `matches_status_idx`.
- Index `matches_home_team_id_idx`.
- Index `matches_tournament_id_idx`.

#### match_events

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `match_id` | `uuid` | Not null, references `matches(id)` on delete cascade. |
| `event_type` | `text` | Not null. Examples: `score_update`, `map_start`, `map_end`, `pause`, `result`. |
| `payload` | `jsonb` | Not null, default `{}`. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `match_events_match_time_idx` on `(match_id, created_at desc)`.

### 3.4 Communication and Content Tables

#### announcements

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `title` | `text` | Not null. |
| `body` | `text` | Not null. |
| `audience` | `text` | Not null, default `organization`; check in `organization`, `department`, `role`, `team`. |
| `audience_ref_id` | `uuid` | Nullable, refers to department, role, or team based on audience. |
| `is_pinned` | `boolean` | Not null, default `false`. |
| `published_at` | `timestamptz` | Nullable. |
| `expires_at` | `timestamptz` | Nullable. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `announcements_org_published_idx` on `(organization_id, published_at desc)`.
- Index `announcements_audience_idx` on `(audience, audience_ref_id)`.

#### announcement_reads

| Column | Type | Constraints and Notes |
|---|---|---|
| `announcement_id` | `uuid` | References `announcements(id)` on delete cascade. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `read_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Primary key `(announcement_id, user_id)`.
- Index `announcement_reads_user_id_idx`.

#### calendar_events

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `title` | `text` | Not null. |
| `description` | `text` | Nullable. |
| `starts_at` | `timestamptz` | Not null. |
| `ends_at` | `timestamptz` | Not null. |
| `location` | `text` | Nullable. |
| `event_type` | `text` | Not null, default `general`. |
| `visibility` | `text` | Not null, default `organization`; check in `private`, `department`, `organization`, `restricted`. |
| `owner_id` | `uuid` | Not null, references `profiles(id)`. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Check `ends_at > starts_at`.
- Index `calendar_events_time_idx` on `(starts_at, ends_at)`.
- Index `calendar_events_owner_id_idx`.

#### chat_channels

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `name` | `text` | Not null. |
| `channel_type` | `text` | Not null; check in `public`, `private`, `department`, `team`, `direct`. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Unique `(organization_id, name)` for non-direct channels.
- Index `chat_channels_type_idx`.

#### chat_channel_members

| Column | Type | Constraints and Notes |
|---|---|---|
| `channel_id` | `uuid` | References `chat_channels(id)` on delete cascade. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `member_role` | `text` | Not null, default `member`; check in `owner`, `moderator`, `member`. |
| `joined_at` | `timestamptz` | Not null, default `now()`. |
| `last_read_at` | `timestamptz` | Nullable. |

Constraints and indexes:

- Primary key `(channel_id, user_id)`.
- Index `chat_channel_members_user_id_idx`.

#### chat_messages

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `channel_id` | `uuid` | Not null, references `chat_channels(id)` on delete cascade. |
| `sender_id` | `uuid` | Not null, references `profiles(id)`. |
| `body` | `text` | Not null. |
| `attachments` | `jsonb` | Not null, default `[]`. |
| `edited_at` | `timestamptz` | Nullable. |
| `deleted_at` | `timestamptz` | Nullable. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `chat_messages_channel_time_idx` on `(channel_id, created_at desc)`.
- Full text index on `body`.

### 3.5 HR, Finance, Support, Files, and Policies

#### leave_requests

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `employee_id` | `uuid` | Not null, references `profiles(id)`. |
| `leave_type` | `text` | Not null. |
| `start_date` | `date` | Not null. |
| `end_date` | `date` | Not null. |
| `reason` | `text` | Nullable. |
| `status` | `leave_status` | Not null, default `submitted`. |
| `reviewer_id` | `uuid` | Nullable, references `profiles(id)`. |
| `reviewed_at` | `timestamptz` | Nullable. |
| `review_note` | `text` | Nullable. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Check `end_date >= start_date`.
- Index `leave_requests_employee_id_idx`.
- Index `leave_requests_status_idx`.
- Index `leave_requests_reviewer_id_idx`.

#### expenses

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `employee_id` | `uuid` | Not null, references `profiles(id)`. |
| `department_id` | `uuid` | Nullable, references `departments(id)`. |
| `amount` | `numeric(12,2)` | Not null, check `amount >= 0`. |
| `currency` | `text` | Not null, default `INR`. |
| `category` | `text` | Not null. |
| `description` | `text` | Nullable. |
| `status` | `text` | Not null, default `submitted`; check in `submitted`, `approved`, `rejected`, `paid`. |
| `receipt_file_id` | `uuid` | Nullable, references `file_assets(id)`. |
| `reviewer_id` | `uuid` | Nullable, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `expenses_employee_id_idx`.
- Index `expenses_status_idx`.
- Index `expenses_department_id_idx`.

#### support_tickets

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `ticket_number` | `text` | Not null, unique. |
| `requester_id` | `uuid` | Not null, references `profiles(id)`. |
| `assignee_id` | `uuid` | Nullable, references `profiles(id)`. |
| `category` | `text` | Not null. |
| `priority` | `ticket_priority` | Not null, default `medium`. |
| `status` | `ticket_status` | Not null, default `open`. |
| `title` | `text` | Not null. |
| `description` | `text` | Not null. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |
| `closed_at` | `timestamptz` | Nullable. |

Indexes:

- Index `support_tickets_requester_id_idx`.
- Index `support_tickets_assignee_id_idx`.
- Index `support_tickets_status_priority_idx` on `(status, priority)`.
- Full text index on `title`, `description`.

#### ticket_comments

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `ticket_id` | `uuid` | Not null, references `support_tickets(id)` on delete cascade. |
| `author_id` | `uuid` | Not null, references `profiles(id)`. |
| `body` | `text` | Not null. |
| `is_internal` | `boolean` | Not null, default `false`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `ticket_comments_ticket_time_idx` on `(ticket_id, created_at)`.

#### knowledge_base_articles

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `slug` | `text` | Not null, unique. |
| `title` | `text` | Not null. |
| `body` | `text` | Not null. |
| `category` | `text` | Not null. |
| `status` | `text` | Not null, default `draft`; check in `draft`, `published`, `archived`. |
| `author_id` | `uuid` | Not null, references `profiles(id)`. |
| `published_at` | `timestamptz` | Nullable. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `knowledge_base_category_idx`.
- Full text index on `title`, `body`.

#### file_assets

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `organization_id` | `uuid` | Not null, references `organizations(id)`. |
| `owner_id` | `uuid` | Not null, references `profiles(id)`. |
| `department_id` | `uuid` | Nullable, references `departments(id)`. |
| `bucket` | `text` | Not null. |
| `object_path` | `text` | Not null. |
| `name` | `text` | Not null. |
| `mime_type` | `text` | Not null. |
| `size_bytes` | `bigint` | Not null, check `size_bytes >= 0`. |
| `visibility` | `file_visibility` | Not null, default `private`. |
| `is_deception_asset` | `boolean` | Not null, default `false`. |
| `checksum_sha256` | `text` | Nullable. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |
| `deleted_at` | `timestamptz` | Nullable. |

Constraints and indexes:

- Unique `(bucket, object_path)`.
- Index `file_assets_owner_id_idx`.
- Index `file_assets_department_id_idx`.
- Index `file_assets_visibility_idx`.
- Index `file_assets_deception_idx` on `is_deception_asset`.

#### file_permissions

| Column | Type | Constraints and Notes |
|---|---|---|
| `file_id` | `uuid` | References `file_assets(id)` on delete cascade. |
| `principal_type` | `text` | Not null; check in `user`, `role`, `department`, `team`. |
| `principal_id` | `uuid` | Not null. |
| `permission` | `text` | Not null; check in `read`, `write`, `owner`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Primary key `(file_id, principal_type, principal_id, permission)`.
- Index `file_permissions_principal_idx` on `(principal_type, principal_id)`.

#### company_policies

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `slug` | `text` | Not null, unique. |
| `title` | `text` | Not null. |
| `body` | `text` | Not null. |
| `version` | `text` | Not null. |
| `requires_ack` | `boolean` | Not null, default `false`. |
| `published_at` | `timestamptz` | Nullable. |
| `created_by` | `uuid` | Not null, references `profiles(id)`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Unique `(slug, version)`.
- Index `company_policies_published_at_idx`.

#### policy_acknowledgements

| Column | Type | Constraints and Notes |
|---|---|---|
| `policy_id` | `uuid` | References `company_policies(id)` on delete cascade. |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade. |
| `acknowledged_at` | `timestamptz` | Not null, default `now()`. |

Constraints and indexes:

- Primary key `(policy_id, user_id)`.
- Index `policy_acknowledgements_user_id_idx`.

### 3.6 Platform, Notifications, and Search Tables

#### notifications

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null, references `profiles(id)` on delete cascade. |
| `type` | `notification_type` | Not null, default `info`. |
| `title` | `text` | Not null. |
| `body` | `text` | Nullable. |
| `action_url` | `text` | Nullable. |
| `read_at` | `timestamptz` | Nullable. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `notifications_user_unread_idx` on `(user_id, read_at, created_at desc)`.

#### saved_searches

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null, references `profiles(id)` on delete cascade. |
| `name` | `text` | Not null. |
| `query` | `text` | Not null. |
| `filters` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Unique `(user_id, name)`.

#### app_settings

| Column | Type | Constraints and Notes |
|---|---|---|
| `key` | `text` | Primary key. |
| `value` | `jsonb` | Not null. |
| `scope` | `text` | Not null, default `global`; check in `global`, `organization`, `department`. |
| `scope_id` | `uuid` | Nullable. |
| `updated_by` | `uuid` | Nullable, references `profiles(id)`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `app_settings_scope_idx` on `(scope, scope_id)`.

### 3.7 Audit, Security, and Honeypot Tables

#### auth_events

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Nullable, references `profiles(id)`. |
| `email` | `citext` | Nullable. |
| `event_type` | `text` | Not null. Examples: `login_success`, `login_failed`, `logout`, `mfa_challenge`, `password_reset`. |
| `ip_address` | `inet` | Nullable. |
| `user_agent` | `text` | Nullable. |
| `risk_score` | `integer` | Not null, default `0`; check between `0` and `100`. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `auth_events_user_time_idx` on `(user_id, created_at desc)`.
- Index `auth_events_email_time_idx` on `(email, created_at desc)`.
- Index `auth_events_ip_time_idx` on `(ip_address, created_at desc)`.

#### activity_logs

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `actor_id` | `uuid` | Nullable, references `profiles(id)`. |
| `action` | `text` | Not null. |
| `resource_type` | `text` | Not null. |
| `resource_id` | `uuid` | Nullable. |
| `summary` | `text` | Nullable. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `activity_logs_actor_time_idx` on `(actor_id, created_at desc)`.
- Index `activity_logs_resource_idx` on `(resource_type, resource_id)`.

#### audit_logs

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `actor_id` | `uuid` | Nullable, references `profiles(id)`. |
| `action` | `text` | Not null. |
| `resource_type` | `text` | Not null. |
| `resource_id` | `uuid` | Nullable. |
| `before_data` | `jsonb` | Nullable, redacted. |
| `after_data` | `jsonb` | Nullable, redacted. |
| `ip_address` | `inet` | Nullable. |
| `user_agent` | `text` | Nullable. |
| `request_id` | `text` | Not null. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `audit_logs_actor_time_idx` on `(actor_id, created_at desc)`.
- Index `audit_logs_action_idx`.
- Index `audit_logs_request_id_idx`.

#### deception_assets

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `asset_key` | `text` | Not null, unique. |
| `asset_type` | `text` | Not null. Examples: `route`, `api`, `file`, `credential`, `robots_entry`, `debug_endpoint`. |
| `display_name` | `text` | Not null. |
| `route_path` | `text` | Nullable. |
| `storage_file_id` | `uuid` | Nullable, references `file_assets(id)`. |
| `risk_weight` | `integer` | Not null, default `25`; check between `0` and `100`. |
| `is_active` | `boolean` | Not null, default `true`. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Unique `deception_assets_asset_key_idx`.
- Index `deception_assets_type_idx`.
- Index `deception_assets_active_idx`.

#### attack_sessions

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `session_fingerprint` | `text` | Not null, unique. |
| `first_seen_at` | `timestamptz` | Not null, default `now()`. |
| `last_seen_at` | `timestamptz` | Not null, default `now()`. |
| `ip_address` | `inet` | Nullable. |
| `ip_hash` | `text` | Not null. |
| `user_agent` | `text` | Nullable. |
| `asn` | `text` | Nullable. |
| `country` | `text` | Nullable. |
| `event_count` | `integer` | Not null, default `0`. |
| `max_severity` | `severity_level` | Not null, default `low`. |
| `metadata` | `jsonb` | Not null, default `{}`. |

Indexes:

- Unique `attack_sessions_fingerprint_idx`.
- Index `attack_sessions_last_seen_idx`.
- Index `attack_sessions_ip_hash_idx`.

#### deception_events

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `attack_session_id` | `uuid` | Nullable, references `attack_sessions(id)`. |
| `asset_id` | `uuid` | Nullable, references `deception_assets(id)`. |
| `event_type` | `deception_event_type` | Not null. |
| `severity` | `severity_level` | Not null, default `low`. |
| `risk_score` | `integer` | Not null, default `0`; check between `0` and `100`. |
| `http_method` | `text` | Nullable. |
| `path` | `text` | Nullable. |
| `query_string` | `text` | Nullable, redacted and size-limited. |
| `source_ip` | `inet` | Nullable. |
| `source_ip_hash` | `text` | Not null. |
| `user_agent` | `text` | Nullable. |
| `referer` | `text` | Nullable. |
| `matched_signatures` | `jsonb` | Not null, default `[]`. |
| `payload_sample` | `text` | Nullable, redacted and truncated. |
| `request_headers` | `jsonb` | Not null, default `{}`, redacted. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `deception_events_time_idx` on `(created_at desc)`.
- Index `deception_events_session_idx`.
- Index `deception_events_asset_idx`.
- Index `deception_events_severity_time_idx` on `(severity, created_at desc)`.
- Index `deception_events_source_ip_hash_idx`.

#### security_alerts

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `title` | `text` | Not null. |
| `description` | `text` | Not null. |
| `severity` | `severity_level` | Not null. |
| `status` | `text` | Not null, default `open`; check in `open`, `investigating`, `resolved`, `false_positive`. |
| `source` | `text` | Not null, default `vigilance`. |
| `related_event_id` | `uuid` | Nullable, references `deception_events(id)`. |
| `assigned_to` | `uuid` | Nullable, references `profiles(id)`. |
| `metadata` | `jsonb` | Not null, default `{}`. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Indexes:

- Index `security_alerts_status_severity_idx` on `(status, severity)`.
- Index `security_alerts_created_at_idx`.

#### telemetry_outbox

| Column | Type | Constraints and Notes |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `event_id` | `uuid` | Not null, references `deception_events(id)` on delete cascade. |
| `destination` | `text` | Not null, default `vigilance`. |
| `payload` | `jsonb` | Not null. |
| `status` | `text` | Not null, default `pending`; check in `pending`, `sent`, `failed`, `dead_letter`. |
| `attempt_count` | `integer` | Not null, default `0`. |
| `next_attempt_at` | `timestamptz` | Not null, default `now()`. |
| `last_error` | `text` | Nullable. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `sent_at` | `timestamptz` | Nullable. |

Indexes:

- Index `telemetry_outbox_status_next_idx` on `(status, next_attempt_at)`.
- Index `telemetry_outbox_event_id_idx`.

### 3.8 Text ER Diagram

```text
auth.users ||--|| profiles : owns_identity
organizations ||--o{ departments : contains
organizations ||--o{ profiles : employs
departments ||--o{ profiles : groups
profiles ||--o{ profiles : manages

roles ||--o{ role_permissions : grants
permissions ||--o{ role_permissions : assigned
profiles ||--o{ user_roles : has
roles ||--o{ user_roles : assigned

organizations ||--o{ esport_teams : operates
esport_teams ||--o{ players : rosters
profiles ||--o{ players : linked_employee
tournaments ||--o{ matches : schedules
esport_teams ||--o{ matches : home_team
matches ||--o{ match_events : emits

organizations ||--o{ announcements : publishes
announcements ||--o{ announcement_reads : read_by
profiles ||--o{ announcement_reads : reads
organizations ||--o{ calendar_events : owns
profiles ||--o{ calendar_events : owns

chat_channels ||--o{ chat_channel_members : includes
profiles ||--o{ chat_channel_members : participates
chat_channels ||--o{ chat_messages : receives
profiles ||--o{ chat_messages : sends

profiles ||--o{ leave_requests : requests
profiles ||--o{ expenses : submits
profiles ||--o{ support_tickets : requests
profiles ||--o{ support_tickets : assigned
support_tickets ||--o{ ticket_comments : contains
profiles ||--o{ ticket_comments : writes

profiles ||--o{ file_assets : owns
file_assets ||--o{ file_permissions : grants
company_policies ||--o{ policy_acknowledgements : acknowledged_by
profiles ||--o{ policy_acknowledgements : acknowledges

profiles ||--o{ notifications : receives
profiles ||--o{ activity_logs : acts
profiles ||--o{ audit_logs : audits

deception_assets ||--o{ deception_events : triggers
attack_sessions ||--o{ deception_events : contains
deception_events ||--o{ telemetry_outbox : forwards
deception_events ||--o{ security_alerts : raises
```

## 4. User Roles

### 4.1 Role Model

Roles are additive. A user can have more than one role, but high-risk role combinations require explicit approval by a System Administrator or Super Admin. Super Admin is reserved for project demonstration and platform ownership.

### 4.2 Role Permission Matrix

| Role | Permissions | Accessible Pages | API Permissions | Database Permissions |
|---|---|---|---|---|
| Employee | Read organization announcements, view own profile, view public employee directory, view assigned calendar, create leave requests, create support tickets, read allowed files, participate in allowed chat channels. | Dashboard, Announcements, Calendar, Directory, My Profile, Leave, Support, Knowledge Base, Files, Policies, Chat, Notifications. | `*.read.self`, `announcements.read`, `calendar.read`, `leave.create.self`, `tickets.create.self`, `files.read.allowed`, `chat.read.allowed`, `chat.write.allowed`. | RLS allows own profile, own requests, own notifications, public org content, explicit file grants, channel membership rows. |
| Manager | Employee permissions plus approve team leave, view direct reports, manage department announcements, view department activity summaries. | Employee pages plus Department Dashboard, Team Leave, Department Directory, Department Files. | `employees.read.department`, `leave.review.department`, `announcements.create.department`, `reports.read.department`. | RLS allows records for direct reports and department-scoped resources. No global access. |
| HR | Employee permissions plus employee lifecycle data, leave administration, policies, HR announcements, directory maintenance. | HR Portal, Employee Directory Admin, Leave Admin, Policies, Announcements, Reports. | `employees.read.hr`, `employees.write.hr`, `leave.review.all`, `policies.write`, `announcements.write.hr`. | RLS allows HR-scoped employee and leave tables; sensitive finance/security tables remain denied. |
| Tournament Admin | Manage teams, players, tournaments, matches, schedules, match live updates, tournament announcements. | Teams, Players, Matches, Tournament Schedule, Calendar, Match Control Panel. | `teams.write`, `players.write`, `tournaments.write`, `matches.write`, `match_events.write`, `announcements.write.tournament`. | RLS allows esports operations tables and related calendar events. |
| Finance | View and process expenses, limited employee finance metadata, finance files, finance reports. | Finance Dashboard, Expenses, Finance Files, Reports. | `expenses.read`, `expenses.review`, `expenses.pay`, `files.read.finance`, `reports.read.finance`. | RLS allows expense rows and finance-tagged files. No chat/admin/security override. |
| IT Support | Manage support tickets, knowledge base, user device metadata, basic account assistance, non-sensitive operational logs. | Support Queue, Ticket Detail, Knowledge Base Admin, IT Tools, Limited User Lookup. | `tickets.read.all`, `tickets.write`, `kb.write`, `users.support_read`, `auth_events.read.limited`. | RLS allows support tickets and KB. User profile write access limited to support-safe fields. |
| Security Analyst | View deception events, security alerts, audit logs, auth events, live security dashboards; cannot alter business records except alert status/comments. | Security Center, Attack Telemetry, Security Alerts, Audit Logs, Activity Logs, Deception Assets Read-Only. | `security.read`, `security_alerts.write.status`, `audit.read`, `activity.read`, `auth_events.read`, `deception.read`. | RLS allows security tables read, alert assignment/update, no service-role secret access. |
| System Administrator | Manage users, roles excluding Super Admin assignment, application settings, storage buckets, support configuration, system health. | Admin Panel, User Management, Role Management, Settings, System Health, Audit Logs. | `admin.users.write`, `admin.roles.write`, `settings.write`, `storage.admin`, `health.read`, `audit.read`. | RLS and backend policies allow administrative app tables. Cannot delete immutable audit/deception logs. |
| Super Admin | Full application ownership, emergency access, role assignment including System Administrator and Super Admin, environment-level configuration. | All pages including Super Admin Console. | All API permissions through explicit `super_admin` gate. | Backend service-role workflows only. Direct database admin access should be restricted to deployment operators. |

### 4.3 Permission Namespaces

| Namespace | Examples |
|---|---|
| `announcements` | `announcements.read`, `announcements.write`, `announcements.delete` |
| `employees` | `employees.read.self`, `employees.read.department`, `employees.write.hr` |
| `matches` | `matches.read`, `matches.write`, `match_events.write` |
| `files` | `files.read.allowed`, `files.upload`, `files.delete.owner`, `files.admin` |
| `security` | `deception.read`, `security_alerts.write.status`, `audit.read` |
| `admin` | `admin.users.write`, `admin.roles.write`, `settings.write` |

## 5. Feature List

| Module | Features | Primary Tables |
|---|---|---|
| Authentication | Login, logout, password reset, MFA enrollment, session refresh, auth event logging. | Supabase Auth, `auth_events`, `profiles`, `user_roles`. |
| Dashboard | Personalized summary cards, upcoming matches, unread announcements, pending tasks, leave status, ticket status, security widgets for authorized users. | `announcements`, `matches`, `notifications`, `leave_requests`, `support_tickets`, `security_alerts`. |
| Announcements | Create, publish, pin, expire, target by organization/department/role/team, track reads. | `announcements`, `announcement_reads`. |
| Teams | Esports team CRUD, roster views, coach/manager assignment, team files and schedule. | `esport_teams`, `players`, `matches`, `file_assets`. |
| Players | Player profiles, handles, roles, contract dates, status, roster assignment. | `players`, `profiles`, `esport_teams`. |
| Matches | Match schedule, live status, score updates, match event timeline, stream links. | `matches`, `match_events`, `tournaments`. |
| Tournament Schedule | Tournament CRUD, bracket metadata, tournament calendar, match grouping. | `tournaments`, `matches`, `calendar_events`. |
| Calendar | Personal, department, organization, tournament, leave, and match calendars. | `calendar_events`, `matches`, `leave_requests`. |
| Departments | Department directory, managers, department announcements, department files. | `departments`, `profiles`, `announcements`, `file_assets`. |
| Leave Requests | Employee requests, manager/HR approval, status history, notifications. | `leave_requests`, `notifications`, `audit_logs`. |
| Employee Directory | Search employees, profile cards, department filters, manager hierarchy. | `profiles`, `departments`, `roles`. |
| Internal Chat | Channels, direct messages, presence, attachments, unread state. | `chat_channels`, `chat_channel_members`, `chat_messages`, `file_assets`. |
| Support Tickets | Ticket creation, assignment, comments, status changes, internal notes, SLA views. | `support_tickets`, `ticket_comments`, `notifications`. |
| Knowledge Base | Published articles, categories, admin editor, search. | `knowledge_base_articles`. |
| Finance and Expenses | Employee reimbursement submission, finance review, payment status, receipt storage, finance reports. | `expenses`, `file_assets`, `audit_logs`. |
| Files | Uploads, folders by metadata, signed downloads, permissions, decoy file handling. | `file_assets`, `file_permissions`, Supabase Storage. |
| Company Policies | Policy publishing, versioning, required acknowledgement. | `company_policies`, `policy_acknowledgements`. |
| Settings | Theme defaults, organization profile, feature flags, notification preferences. | `app_settings`, `profiles`. |
| Audit Logs | Immutable admin and security-sensitive changes. | `audit_logs`. |
| Activity Logs | User activity timeline and operational events. | `activity_logs`. |
| Admin Panel | Users, roles, permissions, system health, storage, data maintenance. | `profiles`, `roles`, `permissions`, `user_roles`, `app_settings`. |
| Profile | Avatar, personal info, password/MFA links, notification settings. | `profiles`, Supabase Auth, `notifications`. |
| Notifications | Bell menu, unread count, action links, realtime toasts. | `notifications`. |
| Search | Global search across allowed announcements, employees, files, KB, policies, matches, tickets. | Full text indexes across module tables, `saved_searches`. |
| Security Center | Deception telemetry, attack sessions, security alerts, auth events, audit review. | `deception_events`, `attack_sessions`, `security_alerts`, `auth_events`, `audit_logs`. |

## 6. Honeypot Design

### 6.1 Honeypot Principles

- Deception must be believable.
- Deception must be safe.
- Fake credentials must never unlock real systems.
- Fake documents must contain canary markers and non-sensitive fictional data.
- Suspicious activity must generate telemetry even if the request ends in a 404 or 403.
- Normal employees should not encounter deception assets through normal navigation.
- Security Analysts and admins can review deception activity through authorized dashboards.

### 6.2 Monitored Deception Elements

| Element | Route or Location | What Attacker Sees | Telemetry Generated | Safety Control |
|---|---|---|---|---|
| Fake admin panel | `/admin`, `/admin/login`, `/admin/users` | Believable restricted admin login or access denied screen. | `route_probe`, attempted username, IP hash, user agent, request path, signature matches. | No real admin action. Always fake auth boundary. |
| Unused admin route | `/internal/admin-v2` | Legacy admin shell or 403. | `route_probe`, path enumeration signal. | Route hidden from normal navigation. |
| Internal developer portal | `/dev`, `/developer`, `/api-docs-internal` | Fake developer tools index and outdated docs. | `route_probe`, `debug_probe`, viewed page IDs. | No real OpenAPI secrets. |
| Legacy login page | `/legacy-login`, `/sso/legacy` | Old login UI with fictional branding. | `legacy_login`, submitted fake credentials, timing, brute force patterns. | Credentials are never checked against Supabase. |
| Fake credentials | Decoy docs, comments, and HTML comments | Fictional usernames, tokens, API keys, database URLs. | `credential_use` when submitted to login/API. | Values are generated from reserved prefixes and denylisted from real auth. |
| Fake backup downloads | `/backups/nowhere-prod-2025.zip`, `/admin/backups` | File listing or signed-looking download. | `backup_download`, file id, range requests, download behavior. | File contains harmless synthetic data and canary markers. |
| Sensitive-looking documents | Files module, robots-discovered paths | Board decks, payroll extracts, sponsorship contracts, VPN setup notes. | `file_access`, object id, source, signed URL access. | Fictional content only. |
| Hidden APIs | `/api/v1/internal/*`, `/api/v1/admin/export`, `/api/v1/debug/config` | JSON errors or fake metadata. | `api_probe`, payload samples, method, headers. | Responses redacted and nonfunctional. |
| Hidden robots entries | `/robots.txt` | Disallow entries for legacy/admin/backup paths. | Follow-on route probes correlated to robots discovery. | Entries point only to deception routes. |
| Debug endpoints | `/debug`, `/debug/env`, `/server-status` | Safe fake diagnostics or 403. | `debug_probe`, requested keys, path. | Never exposes real env or process data. |
| Fake `.env` probe | `/.env`, `/config/.env`, `/api/.env` | 404, 403, or fake redacted file for selected scenarios. | `payload_match`, `file_access`, path traversal indicators. | Never reads filesystem. |
| Fake Git metadata | `/.git/config`, `/.git/HEAD` | 404/403 or synthetic repo metadata. | `file_access`, scanner signature. | Static synthetic response only. |
| Fake database console | `/pgadmin`, `/supabase`, `/db-admin` | Login splash or forbidden page. | `route_probe`, credential submission. | No real database connection. |
| Fake payroll export | `/finance/payroll_export_q4.csv` | Denied or decoy download. | `file_access`, `backup_download` if downloaded. | Synthetic rows only. |

### 6.3 Honeypot Event Classification

Each monitored event receives:

- Event type.
- Deception asset id.
- Risk score from 0 to 100.
- Severity: low, medium, high, critical.
- Matched signatures.
- Request metadata.
- Session fingerprint.
- VIGILANCE correlation id.

Risk scoring inputs:

- Known malicious payload signatures.
- Hidden route access.
- Repeated failed login attempts.
- Use of decoy credentials.
- Access to robots-only paths.
- Attempts to download backup, config, or git metadata.
- Request automation indicators.
- Authenticated user mismatch, such as an Employee role attempting Super Admin paths.

## 7. API Design

### 7.1 API Standards

Authentication values:

- `Public`: no user session required.
- `User`: valid Supabase access token required.
- `Role`: valid token plus required permission.
- `Internal`: service-to-service credential, HMAC signature, or private network only.

All protected endpoints return 401 for missing/invalid auth, 403 for valid auth without permission, 404 for missing resources, 422 for validation errors, and 429 for rate limits.

### 7.2 Health and System

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/health/live` | Public | None | Process liveness. | None |
| GET | `/health/ready` | Public | None | DB, storage, telemetry readiness. | None |
| GET | `/health/database` | Public | None | Supabase connectivity summary. | None |
| GET | `/api/v1/system/info` | Role | None | Safe app version/build metadata. | `health.read` |
| GET | `/api/v1/system/metrics` | Role | Query time range. | Operational metrics summary. | `admin.metrics.read` |

### 7.3 Authentication and Profile

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/session` | User | Supabase JWT in header. | Profile, roles, permissions, navigation flags. | `profile.read.self` |
| POST | `/api/v1/auth/logout` | User | None. | Logout audit result. | `profile.read.self` |
| GET | `/api/v1/me` | User | None. | Current profile, roles, preferences. | `profile.read.self` |
| PATCH | `/api/v1/me` | User | Editable profile fields. | Updated profile. | `profile.write.self` |
| GET | `/api/v1/me/activity` | User | Pagination. | User activity list. | `activity.read.self` |
| GET | `/api/v1/me/permissions` | User | None. | Effective permission keys. | `profile.read.self` |
| POST | `/api/v1/me/avatar` | User | Upload intent metadata. | Signed upload URL and file id. | `profile.write.self` |

Supabase Auth handles email/password sign-in, password recovery, refresh tokens, and MFA challenge endpoints directly. Express logs app-level auth events and resolves roles.

### 7.4 Dashboard

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/dashboard` | User | Optional date range. | Personalized dashboard cards. | `dashboard.read` |
| GET | `/api/v1/dashboard/tasks` | User | Pagination. | Pending approvals, unread policies, tickets. | `dashboard.read` |
| GET | `/api/v1/dashboard/security` | Role | Date range. | Security summary cards. | `security.read` |

### 7.5 Announcements

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/announcements` | User | Audience filters, pagination. | Visible announcements. | `announcements.read` |
| POST | `/api/v1/announcements` | Role | Title, body, audience, publish settings. | Created announcement. | `announcements.write` |
| GET | `/api/v1/announcements/:id` | User | None. | Announcement detail. | `announcements.read` |
| PATCH | `/api/v1/announcements/:id` | Role | Editable fields. | Updated announcement. | `announcements.write` |
| DELETE | `/api/v1/announcements/:id` | Role | None. | Delete result. | `announcements.delete` |
| POST | `/api/v1/announcements/:id/read` | User | None. | Read receipt. | `announcements.read` |

### 7.6 Departments and Employees

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/departments` | User | Search and pagination. | Department list. | `departments.read` |
| POST | `/api/v1/departments` | Role | Name, manager, description. | Created department. | `departments.write` |
| GET | `/api/v1/departments/:id` | User | None. | Department detail. | `departments.read` |
| PATCH | `/api/v1/departments/:id` | Role | Editable fields. | Updated department. | `departments.write` |
| GET | `/api/v1/employees` | User | Search, department, role, status. | Allowed employee directory rows. | `employees.read.directory` |
| POST | `/api/v1/employees` | Role | Employee profile invite data. | Created/invited employee. | `employees.write.hr` |
| GET | `/api/v1/employees/:id` | User | None. | Employee profile allowed fields. | `employees.read.directory` |
| PATCH | `/api/v1/employees/:id` | Role | HR/admin editable fields. | Updated employee. | `employees.write.hr` |
| PATCH | `/api/v1/employees/:id/status` | Role | New status and reason. | Updated status. | `employees.write.hr` |
| GET | `/api/v1/employees/:id/activity` | Role | Pagination. | Employee activity summary. | `activity.read.admin` |

### 7.7 Teams, Players, Tournaments, and Matches

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/teams` | User | Game, status, pagination. | Team list. | `teams.read` |
| POST | `/api/v1/teams` | Role | Team fields. | Created team. | `teams.write` |
| GET | `/api/v1/teams/:id` | User | None. | Team detail and roster summary. | `teams.read` |
| PATCH | `/api/v1/teams/:id` | Role | Editable team fields. | Updated team. | `teams.write` |
| DELETE | `/api/v1/teams/:id` | Role | None. | Soft delete result. | `teams.delete` |
| GET | `/api/v1/teams/:id/players` | User | Pagination. | Team roster. | `players.read` |
| GET | `/api/v1/players` | User | Team, game, status, search. | Player list. | `players.read` |
| POST | `/api/v1/players` | Role | Player fields. | Created player. | `players.write` |
| GET | `/api/v1/players/:id` | User | None. | Player profile. | `players.read` |
| PATCH | `/api/v1/players/:id` | Role | Editable player fields. | Updated player. | `players.write` |
| GET | `/api/v1/tournaments` | User | Game, status, date range. | Tournament list. | `tournaments.read` |
| POST | `/api/v1/tournaments` | Role | Tournament fields. | Created tournament. | `tournaments.write` |
| GET | `/api/v1/tournaments/:id` | User | None. | Tournament detail. | `tournaments.read` |
| PATCH | `/api/v1/tournaments/:id` | Role | Editable tournament fields. | Updated tournament. | `tournaments.write` |
| GET | `/api/v1/matches` | User | Team, tournament, status, date range. | Match list. | `matches.read` |
| POST | `/api/v1/matches` | Role | Match fields. | Created match. | `matches.write` |
| GET | `/api/v1/matches/:id` | User | None. | Match detail and event timeline. | `matches.read` |
| PATCH | `/api/v1/matches/:id` | Role | Editable match fields. | Updated match. | `matches.write` |
| POST | `/api/v1/matches/:id/events` | Role | Event type and payload. | Created match event. | `match_events.write` |
| PATCH | `/api/v1/matches/:id/score` | Role | Home score, away score, status. | Updated score and realtime event. | `matches.write` |

### 7.8 Calendar and Leave

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/calendar/events` | User | Date range, visibility. | Visible calendar events. | `calendar.read` |
| POST | `/api/v1/calendar/events` | Role | Event fields. | Created event. | `calendar.write` |
| GET | `/api/v1/calendar/events/:id` | User | None. | Event detail. | `calendar.read` |
| PATCH | `/api/v1/calendar/events/:id` | Role | Editable fields. | Updated event. | `calendar.write` |
| DELETE | `/api/v1/calendar/events/:id` | Role | None. | Delete result. | `calendar.delete` |
| GET | `/api/v1/leave-requests` | User | Mine/team/status filters. | Leave request list based on role. | `leave.read` |
| POST | `/api/v1/leave-requests` | User | Leave type, dates, reason. | Created leave request. | `leave.create.self` |
| GET | `/api/v1/leave-requests/:id` | User | None. | Leave detail. | `leave.read` |
| PATCH | `/api/v1/leave-requests/:id` | User | Draft edits or cancellation. | Updated leave request. | `leave.write.self` |
| POST | `/api/v1/leave-requests/:id/review` | Role | Approved/rejected, note. | Review result. | `leave.review` |

### 7.9 Chat

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/chat/channels` | User | Pagination. | Channels where user is member or public. | `chat.read.allowed` |
| POST | `/api/v1/chat/channels` | User | Name, type, members. | Created channel. | `chat.create` |
| GET | `/api/v1/chat/channels/:id` | User | None. | Channel detail. | `chat.read.allowed` |
| PATCH | `/api/v1/chat/channels/:id` | Role | Channel settings. | Updated channel. | `chat.manage.allowed` |
| POST | `/api/v1/chat/channels/:id/members` | Role | User ids. | Added members. | `chat.manage.allowed` |
| DELETE | `/api/v1/chat/channels/:id/members/:userId` | Role | None. | Removed member. | `chat.manage.allowed` |
| GET | `/api/v1/chat/channels/:id/messages` | User | Cursor pagination. | Message list. | `chat.read.allowed` |
| POST | `/api/v1/chat/channels/:id/messages` | User | Body, attachments. | Created message. | `chat.write.allowed` |
| PATCH | `/api/v1/chat/messages/:id` | User | Body. | Edited message. | `chat.write.own` |
| DELETE | `/api/v1/chat/messages/:id` | User | None. | Soft delete result. | `chat.delete.own` |

### 7.10 Finance

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/expenses` | User | Status, employee, department, date range. | Expense list scoped by role. | `expenses.read` |
| POST | `/api/v1/expenses` | User | Amount, currency, category, description, receipt file id. | Created expense. | `expenses.create.self` |
| GET | `/api/v1/expenses/:id` | User | None. | Expense detail. | `expenses.read` |
| PATCH | `/api/v1/expenses/:id` | User | Editable draft/submitted fields. | Updated expense. | `expenses.write.self` |
| POST | `/api/v1/expenses/:id/review` | Role | Approved/rejected, note. | Review result. | `expenses.review` |
| POST | `/api/v1/expenses/:id/pay` | Role | Payment reference metadata. | Payment status result. | `expenses.pay` |
| GET | `/api/v1/finance/reports/expenses` | Role | Date range, department, category. | Aggregated expense report. | `reports.read.finance` |

### 7.11 Support, Knowledge Base, Files, and Policies

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/support/tickets` | User | Status, assignee, requester filters. | Ticket list scoped by role. | `tickets.read` |
| POST | `/api/v1/support/tickets` | User | Title, category, priority, description. | Created ticket. | `tickets.create.self` |
| GET | `/api/v1/support/tickets/:id` | User | None. | Ticket detail. | `tickets.read` |
| PATCH | `/api/v1/support/tickets/:id` | Role | Status, priority, assignee, metadata. | Updated ticket. | `tickets.write` |
| POST | `/api/v1/support/tickets/:id/comments` | User | Body, internal flag if allowed. | Created comment. | `tickets.comment` |
| GET | `/api/v1/kb/articles` | User | Search, category. | Published articles. | `kb.read` |
| POST | `/api/v1/kb/articles` | Role | Article fields. | Created article. | `kb.write` |
| GET | `/api/v1/kb/articles/:slug` | User | None. | Article detail. | `kb.read` |
| PATCH | `/api/v1/kb/articles/:id` | Role | Editable fields. | Updated article. | `kb.write` |
| DELETE | `/api/v1/kb/articles/:id` | Role | None. | Archive/delete result. | `kb.delete` |
| GET | `/api/v1/files` | User | Folder metadata, visibility, search. | Allowed files. | `files.read.allowed` |
| POST | `/api/v1/files/upload-intent` | User | Name, mime type, size, visibility. | Signed upload URL and file id. | `files.upload` |
| GET | `/api/v1/files/:id` | User | None. | File metadata. | `files.read.allowed` |
| GET | `/api/v1/files/:id/download` | User | None. | Signed download URL or streamed file. | `files.read.allowed` |
| PATCH | `/api/v1/files/:id` | User | Name, visibility, metadata. | Updated file metadata. | `files.write.allowed` |
| DELETE | `/api/v1/files/:id` | User | None. | Soft delete result. | `files.delete.allowed` |
| GET | `/api/v1/policies` | User | Published filter. | Visible policies. | `policies.read` |
| POST | `/api/v1/policies` | Role | Policy fields. | Created policy. | `policies.write` |
| GET | `/api/v1/policies/:slug` | User | None. | Policy detail. | `policies.read` |
| POST | `/api/v1/policies/:id/acknowledge` | User | None. | Acknowledgement. | `policies.ack.self` |

### 7.12 Notifications, Search, and Settings

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/notifications` | User | Read state, pagination. | User notifications. | `notifications.read.self` |
| POST | `/api/v1/notifications/:id/read` | User | None. | Mark read result. | `notifications.write.self` |
| POST | `/api/v1/notifications/read-all` | User | None. | Bulk read result. | `notifications.write.self` |
| GET | `/api/v1/search` | User | Query, scopes, pagination. | Allowed search results. | `search.read` |
| GET | `/api/v1/search/saved` | User | None. | Saved searches. | `search.read` |
| POST | `/api/v1/search/saved` | User | Name, query, filters. | Created saved search. | `search.write.self` |
| DELETE | `/api/v1/search/saved/:id` | User | None. | Delete result. | `search.write.self` |
| GET | `/api/v1/settings` | Role | Scope filters. | App settings. | `settings.read` |
| PATCH | `/api/v1/settings/:key` | Role | JSON value. | Updated setting. | `settings.write` |

### 7.13 Admin, Audit, and Security

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| GET | `/api/v1/admin/users` | Role | Search, role, status. | User admin list. | `admin.users.read` |
| POST | `/api/v1/admin/users/:id/roles` | Role | Role ids. | Assigned roles. | `admin.roles.write` |
| DELETE | `/api/v1/admin/users/:id/roles/:roleId` | Role | None. | Removed role. | `admin.roles.write` |
| GET | `/api/v1/admin/roles` | Role | None. | Roles and permissions. | `admin.roles.read` |
| POST | `/api/v1/admin/roles` | Role | Role fields. | Created role. | `admin.roles.write` |
| PATCH | `/api/v1/admin/roles/:id` | Role | Role fields. | Updated role. | `admin.roles.write` |
| GET | `/api/v1/audit-logs` | Role | Actor, resource, time filters. | Audit logs. | `audit.read` |
| GET | `/api/v1/activity-logs` | Role | Actor, resource, time filters. | Activity logs. | `activity.read.admin` |
| GET | `/api/v1/auth-events` | Role | User, email, event type, time filters. | Auth event logs. | `auth_events.read` |
| GET | `/api/v1/security/deception-assets` | Role | Status/type filters. | Deception asset list. | `deception_assets.read` |
| POST | `/api/v1/security/deception-assets` | Role | Asset fields. | Created deception asset. | `deception_assets.write` |
| PATCH | `/api/v1/security/deception-assets/:id` | Role | Asset fields. | Updated deception asset. | `deception_assets.write` |
| GET | `/api/v1/security/deception-events` | Role | Time, severity, asset, session filters. | Deception events. | `deception.read` |
| GET | `/api/v1/security/deception-events/:id` | Role | None. | Deception event detail. | `deception.read` |
| GET | `/api/v1/security/attack-sessions` | Role | Time, severity, IP hash filters. | Attack session list. | `deception.read` |
| GET | `/api/v1/security/attack-sessions/:id` | Role | None. | Attack session detail and event timeline. | `deception.read` |
| GET | `/api/v1/security/alerts` | Role | Status, severity, assignee. | Security alerts. | `security_alerts.read` |
| GET | `/api/v1/security/alerts/:id` | Role | None. | Security alert detail. | `security_alerts.read` |
| PATCH | `/api/v1/security/alerts/:id` | Role | Status, assignee, note. | Updated alert. | `security_alerts.write.status` |

### 7.14 Deception and Internal Telemetry Endpoints

| Method | Path | Auth | Request | Response | Permission |
|---|---|---|---|---|---|
| ANY | `/api/v1/internal/*` | Monitored | Any. | Safe fake response, 403, or 404. | Generates telemetry |
| ANY | `/api/v1/debug/*` | Monitored | Any. | Safe fake response, 403, or 404. | Generates telemetry |
| POST | `/api/v1/deception/credential-attempt` | Monitored | Submitted fake login fields. | Generic login failure. | Generates telemetry |
| GET | `/api/v1/deception/files/:assetKey` | Monitored | None. | Decoy download or denied response. | Generates telemetry |
| POST | `/api/v1/telemetry/vigilance/retry` | Internal | Retry command. | Retry status. | `telemetry.admin` |
| POST | `/api/v1/telemetry/vigilance/events` | Internal | Signed telemetry batch. | Delivery acknowledgement. | Internal service only |

The monitored endpoints should never expose real implementation details. They exist to capture attacker behavior and create credible but controlled responses.

## 8. Security Design

### 8.1 RBAC

- API routes declare required permissions.
- Middleware resolves effective permissions from `user_roles` and `role_permissions`.
- Super Admin bypass is explicit and logged.
- Role assignment changes always write to `audit_logs`.
- High-risk permissions require MFA and recent authentication.

### 8.2 RLS

RLS policy themes:

- Profiles: users read allowed directory fields; users update own safe fields; HR/admin update employee fields.
- Leave requests: users manage their own drafts; managers review direct reports; HR reviews all.
- Files: users read own, organization-public, department files, and explicit file grants.
- Chat: only channel members can read or write private channel messages.
- Security tables: only Security Analyst, System Administrator, and Super Admin can read.
- Audit logs: read-only through controlled API; no direct client writes.
- Deception events: writes through backend service role only; limited realtime read for security staff.

### 8.3 JWT

- Supabase access tokens are short-lived.
- Express verifies signature, issuer, audience, expiry, and subject.
- Role claims may be cached briefly but the database remains source of truth.
- Refresh tokens stay in Supabase Auth mechanisms and are not handled by Express.
- JWTs are never logged.

### 8.4 CSRF

- If tokens are stored in cookies, use `SameSite=Lax` or `Strict`, secure cookies, and CSRF tokens for unsafe methods.
- If tokens are stored in memory and sent as Authorization headers, CSRF risk is reduced but XSS controls become critical.
- Do not allow state-changing GET requests.
- Validate `Origin` and `Referer` for browser state-changing requests.

### 8.5 Rate Limiting

Rate limits:

- Login and legacy-login attempts: strict IP and account-based limits.
- Password reset: account-based and IP-based limits.
- Search: moderate per-user limit.
- File download: per-user and per-IP limits.
- Deception routes: monitored separately; do not block too early because telemetry value is high.
- Admin actions: low volume, strict limits.

Rate limit decisions should be logged without storing secrets.

### 8.6 Input Validation

- Validate params, query strings, and bodies before controllers.
- Reject unknown fields for write endpoints.
- Normalize emails, slugs, dates, and enum values.
- Limit text lengths.
- Sanitize rich text content before display.
- Use database constraints as a second line of defense.

### 8.7 Audit Logging

Audit log required for:

- Role and permission changes.
- User status changes.
- HR and finance changes.
- Policy publish and acknowledgement requirement changes.
- File permission changes.
- Security alert status changes.
- Deception asset changes.
- Settings changes.

Audit records are append-only at the application level. Deletion should require database-level maintenance outside normal app flows.

### 8.8 Password Policy

Supabase Auth password policy:

- Minimum length 12.
- Block common passwords.
- Require email verification.
- MFA required for privileged roles.
- Password reset tokens expire quickly.
- Lock or challenge suspicious repeated attempts.

### 8.9 Session Policy

- Access token TTL: short.
- Refresh session idle timeout: configurable.
- Privileged action reauthentication window: 15 minutes.
- Session revocation on termination or role downgrade.
- Device/session list visible in profile settings if supported.

### 8.10 Secret Management

- `.env.example` contains names only, never real values.
- Supabase service role key is backend-only.
- VIGILANCE ingestion secret is backend-only.
- Docker Compose uses environment variables or secret files.
- CI/CD uses GitHub Actions secrets.
- Client bundle only receives `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Decoy secrets use reserved fake prefixes and are registered as deception assets.

## 9. Realtime Design

### 9.1 Realtime Event Types

| Use Case | Source | Audience | Event Payload |
|---|---|---|---|
| Notifications | `notifications` insert/update | Specific user | Notification id, type, title, action URL, unread count. |
| Announcements | `announcements` publish/update | Target audience | Announcement id, title, pinned flag, published time. |
| Match updates | `matches`, `match_events` | Organization or team subscribers | Match id, status, scores, event type. |
| Security alerts | `security_alerts`, `deception_events` | Security roles only | Alert id, severity, title, related session/event id. |
| Live dashboards | Aggregated API plus realtime deltas | Authorized dashboards | Metric key, value, delta, time window. |
| Presence | Supabase presence | Chat channel or dashboard | User id, display name, status, last seen. |

### 9.2 Realtime Security

- Subscribe only after JWT session is active.
- Use RLS to control row visibility.
- Use channel naming that does not leak sensitive ids to unauthorized clients.
- Security channels require server-issued channel authorization or RLS-backed changes only.
- Do not broadcast full sensitive payloads; clients fetch detail through authorized API endpoints.

### 9.3 Realtime Reliability

- Reconnect with exponential backoff.
- Show stale-state indicators if subscriptions are disconnected.
- Store important events in tables first, then broadcast.
- Do not rely on realtime messages as the only source of truth.

## 10. UI/UX

### 10.1 Product Direction

The intranet should feel like a quiet, utilitarian internal operations system. It should prioritize scanning, tables, forms, filters, and repeated workflows. Avoid a marketing landing page as the main experience. The first authenticated screen is the dashboard.

### 10.2 Navigation

Layout:

- Left sidebar on desktop.
- Top header with search, notifications, profile menu, and theme toggle.
- Collapsible sidebar with icons and labels.
- Mobile uses a sheet/drawer navigation.
- Breadcrumbs appear on nested admin and detail pages.
- Role-based navigation hides pages the user cannot access.

Primary navigation:

- Dashboard
- Announcements
- Teams
- Players
- Matches
- Tournament Schedule
- Calendar
- Departments
- Leave Requests
- Employee Directory
- Chat
- Support Tickets
- Knowledge Base
- Files
- Company Policies
- Security Center
- Admin Panel
- Settings

### 10.3 Page Descriptions

| Page | UX Description |
|---|---|
| Login | Branded Nowhere Esports login with email/password, password reset, MFA prompt, and safe error messages. |
| Dashboard | Dense summary view with announcements, upcoming matches, tasks, leave/tickets, recent files, and role-specific cards. |
| Announcements | List with pinned announcements, audience badges, read state, filters, and editor for authorized users. |
| Teams | Table/grid hybrid showing game title, roster count, coach, manager, status, and quick filters. |
| Players | Searchable table with handle, real name, team, game role, country, contract dates, and status. |
| Matches | Calendar/list switcher, live badges, scores, opponent, stream link, and match event timeline. |
| Tournament Schedule | Tournament detail with grouped matches, date filters, status badges, and admin controls. |
| Calendar | Month/week/list views with match, leave, department, and organization event filters. |
| Departments | Department cards/table, manager, employee count, quick link to files and announcements. |
| Leave Requests | Employee form and status list; manager/HR approval queue with decision modal. |
| Employee Directory | Search-first directory with filters, profile drawer, department grouping, and manager chain. |
| Chat | Channel list, message pane, presence, attachments, unread indicators, and accessible keyboard navigation. |
| Support Tickets | Ticket queue with status columns, priority filters, detail page, comments, and internal notes. |
| Knowledge Base | Searchable article index, category filters, article reader, admin editor. |
| Files | File table with name, owner, visibility, modified date, actions, permissions dialog, upload flow. |
| Company Policies | Policy list, version labels, acknowledgement status, readable policy detail. |
| Settings | User settings, notification preferences, organization settings for authorized roles. |
| Audit Logs | Filterable immutable log table with actor, action, resource, timestamp, request id. |
| Activity Logs | Operational timeline for normal user actions. |
| Admin Panel | User management, roles, permissions, system health, settings, storage, and maintenance screens. |
| Profile | Personal details, avatar, session/security settings, role display, recent activity. |
| Notifications | Bell dropdown and full-page notification center with read/unread filters. |
| Search | Command menu search and full search page with scoped results. |
| Security Center | Attack sessions, deception events, security alerts, charts, event detail drawer, VIGILANCE correlation links. |
| Deception Pages | Believable but restricted legacy/admin/debug pages that never appear in normal navigation. |

### 10.4 Components

Use shadcn/ui for:

- Buttons, inputs, labels, selects, checkboxes, switches.
- Dialogs, sheets, popovers, dropdown menus, tooltips.
- Tabs, cards, badges, alerts, skeletons.
- Tables with sorting/filter controls.
- Toasts for ephemeral feedback.
- Command menu for global search.
- Calendar/date picker controls.

Cards should be restrained and used for individual summaries or repeated items, not nested inside other cards.

### 10.5 Tables

Tables should include:

- Search/filter controls.
- Column sorting.
- Pagination or cursor loading.
- Empty state.
- Loading state.
- Bulk actions only where authorized.
- Row-level actions in menus.
- Accessible headers and keyboard navigation.

### 10.6 Forms

Forms should include:

- Clear labels.
- Inline validation.
- Server error display.
- Optimistic feedback only when safe.
- Dirty state protection for long forms.
- Confirmation dialogs for destructive actions.

### 10.7 Charts

Charts should be used for:

- Dashboard trends.
- Match outcomes.
- Ticket workload.
- Leave volume.
- Security event volume and severity.

Security charts must never expose raw payloads by default. Show details only in authorized drawers.

### 10.8 Responsive Behavior

- Desktop: sidebar plus content grid.
- Tablet: collapsible sidebar, two-column summaries.
- Mobile: drawer navigation, single-column content, responsive tables using row cards or horizontal scroll where appropriate.
- Text must not overlap controls.
- Toolbars wrap predictably.

### 10.9 Dark Mode

- Support light and dark themes.
- Store preference per user.
- Ensure charts, badges, and severity colors remain legible.
- Use semantic color tokens rather than hard-coded values.

### 10.10 Accessibility

- WCAG 2.1 AA target.
- Keyboard navigation for all interactive components.
- Visible focus indicators.
- Proper heading hierarchy.
- ARIA labels for icon-only buttons.
- Sufficient contrast.
- Form errors linked to inputs.
- Avoid color-only status communication.

## 11. Integration with VIGILANCE

### 11.1 Request Flow

```text
Incoming HTTP request
       |
       v
Express request context middleware
       |
       v
Honeypot detection middleware
       |
       +--> Normal route? Continue to domain API.
       |
       +--> Suspicious/deception trigger?
                |
                v
          Build deception event
                |
                v
          Insert into Supabase: deception_events
                |
                v
          Insert into telemetry_outbox
                |
                v
          Dispatch to VIGILANCE collector
```

### 11.2 Event Flow

1. Middleware inspects route, method, headers, query, and sanitized body sample.
2. The request is matched against deception assets and lightweight attack signatures.
3. An attack session fingerprint is created or updated.
4. A `deception_events` row is inserted.
5. A `telemetry_outbox` row is inserted in the same logical workflow.
6. A background dispatcher sends the event batch to VIGILANCE.
7. VIGILANCE ingestion validates the HMAC signature and schema.
8. VIGILANCE writes the raw event to its attack store and publishes it to its processing pipeline.
9. Analytics enriches the event, detects anomalies, and raises alerts.
10. Security dashboards receive realtime updates.

### 11.3 Supabase Flow

Supabase stores intranet-side truth:

- `deception_assets` defines what is monitored.
- `attack_sessions` groups suspicious behavior.
- `deception_events` records each trigger.
- `security_alerts` stores alert summaries for intranet security staff.
- `telemetry_outbox` guarantees eventual delivery to VIGILANCE.

Supabase Realtime broadcasts:

- New deception events to authorized Security Center views.
- New security alerts to Security Analysts and admins.
- Notification rows for assigned alerts.

### 11.4 Realtime Flow

```text
deception_events insert
       |
       +--> Supabase Realtime channel `security:alerts`
       |
       +--> Express/VIGILANCE dispatcher
       |
       +--> VIGILANCE dashboard websocket or realtime feed
```

Client behavior:

- Security Center receives a lightweight event notification.
- Client calls `/api/v1/security/deception-events/:id` or session detail endpoint for full authorized details.
- Raw payload samples remain redacted and truncated.

### 11.5 Analytics Flow

Telemetry payload fields:

| Field | Purpose |
|---|---|
| `event_id` | Cross-system correlation. |
| `attack_session_id` | Session-level grouping. |
| `asset_key` | Which deception asset was touched. |
| `event_type` | Route probe, credential use, file access, debug probe, etc. |
| `severity` | Low, medium, high, critical. |
| `risk_score` | Numeric model input. |
| `http_method` and `path` | Requested resource. |
| `source_ip_hash` | Privacy-preserving source correlation. |
| `source_ip` | Optional, only if project policy allows storage. |
| `user_agent` | Client fingerprinting and scanner detection. |
| `matched_signatures` | Signature engine output. |
| `payload_sample` | Redacted payload evidence. |
| `created_at` | Event timestamp. |

VIGILANCE can compute:

- Attack frequency by source.
- Deception asset hit rate.
- Credential-stuffing attempts.
- Scanner vs manual behavior.
- Time-to-first-sensitive-probe.
- Severity trends.
- MITRE ATT&CK-style tactic mapping in future phases.

### 11.6 Failure Handling

- If VIGILANCE is unavailable, keep events in `telemetry_outbox`.
- Retry with exponential backoff.
- Move exhausted events to `dead_letter`.
- Alert System Administrators if backlog exceeds threshold.
- Never block normal intranet responses solely because telemetry delivery failed.

## 12. Scalability

### 12.1 Horizontal Scaling

- Express API is stateless and can run multiple replicas.
- Frontend is static and CDN-friendly.
- Supabase handles managed Postgres, Auth, Realtime, and Storage.
- Background jobs use database locks or queue ownership to avoid duplicate dispatch.
- Sticky sessions are not required.

### 12.2 Caching

Cache candidates:

- Public/published announcements for short TTL.
- Role and permission resolution for a short TTL per user.
- Dashboard aggregate summaries.
- Knowledge base article reads.
- Signed URL metadata, not signed URLs beyond their configured expiry.

Do not cache:

- Audit logs with broad access.
- Security event details with raw payload samples.
- Auth decisions beyond short TTL.
- File permissions without invalidation on permission updates.

### 12.3 Future Microservices

Candidate service boundaries:

- Telemetry service: deception event classification and VIGILANCE dispatch.
- Notification service: notification fanout and digest jobs.
- File service: storage, scanning, signed URL issuance.
- Chat service: high-volume messaging if Supabase Realtime limits are reached.
- Reporting service: dashboard aggregates and exports.

Keep the initial implementation modular inside Express to delay premature distribution.

### 12.4 Queue Usage

Initial queue:

- `telemetry_outbox` table for reliable event delivery.

Future queues:

- Redis/BullMQ for notifications, email, and retries.
- Kafka integration directly into VIGILANCE raw event topics if both systems are deployed together.
- Dead-letter queue for failed webhook or telemetry delivery.

### 12.5 Database Optimization

- Add indexes for every foreign key used in joins.
- Use composite indexes for common filters such as status plus timestamp.
- Use full text search indexes for directory, files, KB, and support.
- Partition `deception_events`, `activity_logs`, and `audit_logs` by month if event volume grows.
- Keep payload samples small and redacted.
- Archive old telemetry to cold storage if needed.

### 12.6 CDN

- Serve frontend assets through CDN in production.
- Use immutable cache headers for hashed assets.
- Use Supabase Storage signed URLs for protected files.
- Public assets can use CDN-backed storage.

## 13. Deployment

### 13.1 Local Development

Local services:

- `frontend`: Vite dev server.
- `backend`: Express API with hot reload.
- `supabase`: local Supabase stack or remote development project.
- `vigilance`: optional local collector/dashboard integration.

Local development requires:

- Node.js LTS.
- Docker Desktop.
- Supabase CLI if using local Supabase.
- `.env` files created from `.env.example`.

### 13.2 Docker

Containers:

| Service | Purpose |
|---|---|
| `intranet-frontend` | Builds and serves React static assets. |
| `intranet-backend` | Express API. |
| `nginx` | Reverse proxy and TLS termination in self-hosted deployments. |
| `supabase` | Local development stack if not using hosted Supabase. |
| `vigilance` | Optional local detection platform services. |

Docker Compose profiles:

- `dev`: frontend dev server, backend dev server, local Supabase.
- `prod`: built frontend, Express API, reverse proxy.
- `full-lab`: intranet plus VIGILANCE platform.

### 13.3 Production

Production options:

- Frontend on static hosting or reverse-proxied container.
- Express API on containers behind a load balancer.
- Supabase hosted project for database/auth/realtime/storage.
- VIGILANCE collector reachable over private network or authenticated HTTPS.
- TLS required everywhere.

Production requirements:

- Separate Supabase projects for development, staging, production.
- Branch or migration-based database promotion.
- Environment-specific VIGILANCE ingestion keys.
- Strict CORS allowlist.
- Backups and restore test schedule.

### 13.4 Environment Variables

Frontend:

| Variable | Purpose |
|---|---|
| `VITE_APP_ENV` | `local`, `staging`, or `production`. |
| `VITE_API_BASE_URL` | Express API base URL. |
| `VITE_SUPABASE_URL` | Public Supabase URL. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key. |

Backend:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment. |
| `PORT` | API port. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Public anon key for verification/basic operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only privileged key. |
| `SUPABASE_JWT_SECRET` | JWT verification secret if using symmetric verification. |
| `VIGILANCE_COLLECTOR_URL` | Telemetry collector endpoint. |
| `VIGILANCE_INGESTION_KEY` | Backend-only telemetry signing secret. |
| `APP_ORIGIN` | Frontend allowed origin. |
| `COOKIE_SECRET` | Cookie signing secret if cookies are used. |
| `RATE_LIMIT_REDIS_URL` | Optional Redis rate limit backend. |
| `LOG_LEVEL` | Runtime logging level. |

### 13.5 CI/CD

GitHub Actions pipeline:

1. Install dependencies.
2. Run formatting checks.
3. Run TypeScript checks.
4. Run frontend unit tests.
5. Run backend unit tests.
6. Run API integration tests with test Supabase project or local Supabase.
7. Run security linting and dependency audit.
8. Build Docker images.
9. Run E2E smoke tests.
10. Publish artifacts.
11. Deploy to staging.
12. Require manual approval for production.
13. Run post-deploy health checks.

Branch policy:

- `main`: production-ready.
- `develop`: integrated staging.
- Feature branches: short-lived and reviewed.
- Migrations require review and rollback notes.

## 14. Development Roadmap

### Milestone 1 - Foundation

Scope:

- Repository restructuring.
- Vite React TypeScript setup.
- Express TypeScript setup.
- Tailwind and shadcn/ui setup.
- Supabase clients and env templates.
- Docker Compose baseline.

Acceptance:

- Frontend and backend run locally.
- Health checks pass.
- Documentation and `.env.example` are complete.

### Milestone 2 - Authentication

Scope:

- Supabase Auth login/logout/password reset.
- Session bootstrap endpoint.
- Profiles, roles, permissions, user roles.
- Route guards and API RBAC.
- Auth event logging.

Acceptance:

- Users can authenticate.
- Role-specific navigation works.
- Unauthorized API calls return correct errors.

### Milestone 3 - Dashboard

Scope:

- App shell, sidebar, header, theme.
- Personalized dashboard cards.
- Announcements preview.
- Upcoming matches.
- Pending tasks.

Acceptance:

- Employee and admin dashboards render different authorized content.
- Dashboard APIs are covered by integration tests.

### Milestone 4 - Core Modules

Scope:

- Announcements.
- Teams and players.
- Matches and tournaments.
- Calendar.
- Departments and directory.
- Leave requests.
- Support tickets.
- Knowledge base.
- Files.
- Policies.

Acceptance:

- CRUD workflows work for authorized users.
- RLS policies are tested.
- Core UI is responsive.

### Milestone 5 - Honeypot Features

Scope:

- Deception asset registry.
- Monitored routes and fake legacy surfaces.
- Fake credentials and canary document tracking.
- Deception event capture.
- Attack session grouping.
- VIGILANCE telemetry outbox.

Acceptance:

- Accessing each deception asset creates a telemetry event.
- No real secrets are exposed.
- Security Center shows events to authorized users only.

### Milestone 6 - Realtime

Scope:

- Notifications.
- Announcements realtime.
- Match updates.
- Chat.
- Security alert channels.
- Presence.

Acceptance:

- Realtime updates appear without refresh.
- Unauthorized users cannot subscribe to restricted data.

### Milestone 7 - Security

Scope:

- RLS hardening.
- CSRF policy.
- Rate limiting.
- Security headers.
- Input validation.
- Audit logging.
- Password/session/MFA policies.
- Secret management review.

Acceptance:

- Security test suite passes.
- Privileged workflows require correct permissions.
- Logs redact sensitive fields.

### Milestone 8 - Testing

Scope:

- Unit tests.
- Integration tests.
- API contract tests.
- E2E tests.
- Accessibility tests.
- Performance tests.
- Security tests.

Acceptance:

- CI pipeline blocks regressions.
- Test data is deterministic.
- Critical user flows are covered.

### Milestone 9 - Deployment

Scope:

- Production Dockerfiles.
- Docker Compose production profile.
- GitHub Actions deployment.
- Staging environment.
- Production environment.
- Monitoring and alerting.

Acceptance:

- Staging deployment is reproducible.
- Production deployment has rollback path.
- Health checks and telemetry delivery are verified.

## 15. Testing Strategy

### 15.1 Unit Tests

Frontend:

- UI component behavior.
- Role helper functions.
- API client error handling.
- Realtime event reducers.
- Form validation.

Backend:

- Services.
- Validators.
- RBAC permission checks.
- Telemetry event builder.
- Risk scoring.
- Redaction helpers.

### 15.2 Integration Tests

- Express route plus Supabase test database.
- RLS policy behavior with user JWTs.
- File upload intent and signed URL flow.
- Audit log creation on privileged actions.
- Telemetry outbox insert on deception trigger.
- Notification creation after workflow changes.

### 15.3 API Tests

API tests should cover:

- Success responses.
- 401 missing auth.
- 403 insufficient permission.
- 404 missing resource.
- 422 invalid input.
- 429 rate limit.
- Pagination cursors.
- Filtering.
- Redaction of sensitive fields.

### 15.4 E2E Tests

Core flows:

- Employee login and dashboard.
- Employee creates leave request.
- Manager approves leave request.
- Tournament Admin updates match score and employee sees realtime update.
- Employee creates support ticket and IT Support responds.
- HR publishes policy and employee acknowledges it.
- Security Analyst views a generated deception event.
- Admin assigns and removes a role.

### 15.5 Security Tests

Security test cases:

- RBAC route access matrix.
- RLS policy bypass attempts.
- CSRF checks for unsafe methods.
- Rate limit enforcement.
- JWT expiry and tampering.
- Stored XSS prevention in announcements, chat, KB, and tickets.
- SQL injection attempts in filters/search.
- File upload MIME and size validation.
- Deception endpoints do not reveal real secrets.
- Audit logs cannot be edited through API.

### 15.6 Performance Tests

Performance targets:

- Dashboard API p95 under 500 ms for normal data size.
- Search p95 under 800 ms with expected indexes.
- Chat message send p95 under 300 ms excluding realtime fanout.
- Telemetry event capture must not add more than 50 ms p95 to normal request handling.
- File signed URL issuance p95 under 300 ms.

Load scenarios:

- 200 concurrent employees browsing dashboard and directory.
- 50 concurrent chat users in active channels.
- 20 match updates per minute during tournament simulation.
- 500 deception route probes per minute in lab mode.

### 15.7 Accessibility Tests

Accessibility checks:

- Automated axe checks on all major pages.
- Keyboard-only navigation.
- Screen reader labels for icon buttons and form fields.
- Color contrast checks in light and dark mode.
- Focus trapping in dialogs and sheets.
- No content overlap at mobile widths.

### 15.8 Test Data Strategy

- Seed fictional organization, departments, employees, teams, players, matches, policies, and files.
- Seed fake deception assets with clearly fictional data.
- Use deterministic user accounts per role.
- Never commit real credentials.
- Use isolated test Supabase projects or local Supabase for integration tests.

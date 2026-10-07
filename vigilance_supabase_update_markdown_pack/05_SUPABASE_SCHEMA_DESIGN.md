# Supabase Schema Design

## Schema principles

1. Use Supabase Auth for identity.
2. Keep user profile data in `public.profiles`.
3. Use role-based access through `profiles.role`.
4. Keep attack/event tables append-first.
5. Keep raw payloads separate from dashboard summaries.
6. Enable RLS on every public table.
7. Use indexes for dashboard filters.
8. Keep service-only writes for telemetry tables.

## Enum types

### `app_role`
- `admin`
- `analyst`
- `user`
- `service`

### `attack_severity`
- `low`
- `medium`
- `high`
- `critical`

### `alert_status`
- `open`
- `acknowledged`
- `resolved`
- `false_positive`

### `match_status`
- `scheduled`
- `live`
- `completed`
- `cancelled`

## Core identity tables

### `profiles`

Stores application-specific user data linked to Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, references `auth.users(id)` |
| `email` | text | copied from auth user |
| `display_name` | text | visible name |
| `role` | app_role | default `user` |
| `team_id` | uuid | nullable FK |
| `avatar_url` | text | nullable |
| `is_active` | boolean | soft disable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### `teams`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `description` | text | nullable |
| `created_at` | timestamptz | default now |

## Intranet app tables

### `announcements`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | required |
| `body` | text | required |
| `status` | text | `draft` or `published` |
| `created_by` | uuid | references auth user |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### `matches`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `team_a` | text | required |
| `team_b` | text | required |
| `score` | jsonb | default `{}` |
| `status` | match_status | default `scheduled` |
| `scheduled_at` | timestamptz | nullable |
| `updated_by` | uuid | references auth user |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### `match_score_events`

Historical score updates for realtime and audit.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `match_id` | uuid | FK |
| `score` | jsonb | score after update |
| `status` | match_status | nullable |
| `updated_by` | uuid | references auth user |
| `created_at` | timestamptz | default now |

## Honeypot platform tables

### `honeypot_nodes`

Represents deployed honeypot services.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | required |
| `node_type` | text | `http`, `ssh`, etc. |
| `environment` | text | `local`, `dev`, `prod` |
| `host` | text | nullable |
| `port` | int | nullable |
| `is_active` | boolean | default true |
| `created_at` | timestamptz | default now |

### `honeypot_sessions`

Groups related attack events.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `node_id` | uuid | FK |
| `source_ip` | inet | required |
| `user_agent` | text | nullable |
| `started_at` | timestamptz | default now |
| `last_seen_at` | timestamptz | default now |
| `event_count` | int | default 0 |

### `attack_events`

Main normalized event table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK |
| `node_id` | uuid | FK |
| `source_ip` | inet | required |
| `source_port` | int | nullable |
| `protocol` | text | `http`, `ssh`, etc. |
| `method` | text | HTTP method or SSH action |
| `path` | text | requested path/command |
| `signature` | text | matched rule signature |
| `severity` | attack_severity | default low |
| `country_code` | text | nullable |
| `asn` | text | nullable |
| `payload_hash` | text | nullable |
| `payload_preview` | text | sanitized preview |
| `metadata` | jsonb | sanitized metadata |
| `received_at` | timestamptz | default now |

### `attack_payloads`

Optional restricted table for raw/sanitized payload details.

| Column | Type | Notes |
|---|---|---|
| `event_id` | uuid | PK/FK |
| `raw_payload` | text | restricted |
| `headers` | jsonb | sanitized |
| `created_at` | timestamptz | default now |

### `threat_enrichments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | FK |
| `source_ip` | inet | required |
| `provider` | text | abuseipdb/shodan/local |
| `score` | int | nullable |
| `result` | jsonb | sanitized provider response |
| `created_at` | timestamptz | default now |

### `detection_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `description` | text | nullable |
| `pattern` | text | required |
| `severity` | attack_severity | default low |
| `enabled` | boolean | default true |
| `version` | int | default 1 |
| `created_by` | uuid | references auth user |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### `alerts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | nullable FK |
| `title` | text | required |
| `description` | text | nullable |
| `severity` | attack_severity | required |
| `status` | alert_status | default open |
| `assigned_to` | uuid | nullable auth user |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### `system_health_checks`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `service_name` | text | required |
| `status` | text | `ok`, `degraded`, `down` |
| `details` | jsonb | service details |
| `checked_at` | timestamptz | default now |

### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `actor_id` | uuid | nullable auth user |
| `action` | text | required |
| `entity_type` | text | required |
| `entity_id` | uuid | nullable |
| `metadata` | jsonb | sanitized |
| `created_at` | timestamptz | default now |

## Dashboard views

### `attack_event_summary`

A dashboard-safe view with no raw payload.

Fields:
- event id
- session id
- source ip
- protocol
- signature
- severity
- country
- received time
- node name

### `attack_counts_by_severity`

Materialized or regular view for charts.

Fields:
- severity
- count
- last_seen

### `recent_alerts`

Latest alerts with status and severity.

## Indexing strategy

Create indexes for:
- `attack_events.received_at`
- `attack_events.source_ip`
- `attack_events.severity`
- `attack_events.protocol`
- `attack_events.session_id`
- `alerts.status`
- `alerts.severity`
- `matches.status`
- `announcements.status`
- `audit_logs.created_at`

## Retention strategy

Recommended:
- Keep `attack_events` for 180 days.
- Keep `attack_payloads` for 30 days unless needed for reports.
- Keep `audit_logs` for at least 365 days.
- Use scheduled cleanup through backend cron or Supabase scheduled functions if enabled.

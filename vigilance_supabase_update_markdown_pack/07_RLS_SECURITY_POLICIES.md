# Row Level Security Policy Plan

## Why this matters

Supabase exposes Postgres directly to client applications through API layers. Because of that, every table in the `public` schema must have Row Level Security enabled unless it is intentionally public.

## Access matrix

| Table | anon | user | analyst | admin | service |
|---|---:|---:|---:|---:|---:|
| profiles | no | own row | own row | all | all |
| teams | no | read | read | all | all |
| announcements | no | published read | published read | all | all |
| matches | no | read | read | all | all |
| match_score_events | no | read | read | insert/read | all |
| honeypot_nodes | no | no | read | all | all |
| honeypot_sessions | no | no | read | read | all |
| attack_events | no | no | read | read | all |
| attack_payloads | no | no | no | read | all |
| threat_enrichments | no | no | read | read | all |
| detection_rules | no | no | read | all | all |
| alerts | no | no | read/update | all | all |
| system_health_checks | no | no | read | read | all |
| audit_logs | no | no | no | read | all |

## Policy rules

### Default deny
Do not create `anon` policies for protected tables.

### Profile self-access
A user can:
- read own profile
- update safe profile fields

A user cannot:
- promote self to admin
- change `is_active`
- change another user's profile

### Admin
Admin can:
- manage users/profiles
- manage matches
- manage announcements
- manage detection rules
- view audit logs
- view payloads

### Analyst
Analyst can:
- view attack events
- view enrichment
- view alerts
- update alert status
- view system health

Analyst cannot:
- manage users
- edit rules unless promoted
- view raw payloads if policy remains admin-only

### Service
Service credentials bypass RLS. This must be used only in backend/worker code.

## Backend enforcement

RLS is not enough for all business logic. Backend must also:
- validate request body shape
- reject oversized payloads
- sanitize attack payload previews
- audit sensitive admin changes
- prevent role changes from normal profile update routes
- ensure only backend workers insert attack data

## RLS test cases

### Normal user
- Can select own profile.
- Cannot select another profile.
- Can select published announcements.
- Cannot insert attack events.
- Cannot read `attack_events`.
- Cannot read `audit_logs`.

### Analyst
- Can read `attack_events`.
- Can read `alerts`.
- Can update alert status.
- Cannot read `attack_payloads`.
- Cannot update user roles.

### Admin
- Can manage announcements.
- Can manage matches.
- Can manage detection rules.
- Can read audit logs.
- Can read attack payloads.

### Unauthenticated
- Cannot read any protected table.

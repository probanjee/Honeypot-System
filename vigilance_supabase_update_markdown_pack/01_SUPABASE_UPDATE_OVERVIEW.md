# Supabase Update Overview

## Current problem

The project currently mixes multiple persistence models:

- `nowhere-esports-intranet` uses MongoDB/Mongoose for users, OTPs, matches, announcements, and attack logs.
- `honeypot-platform` documentation expects a platform database pipeline, but the frontend currently pulls live events directly from the vulnerable intranet SSE route.
- Python services contain import/path bugs that can stop ingestion, analytics, and threat-intel services.
- Auth state is inconsistent because JWT middleware attaches a plain payload object, but some routes expect a full Mongoose document.
- OTP expiry validation depends too heavily on database TTL cleanup instead of checking expiry at verification time.

## Supabase update goal

Use Supabase to provide one consistent database/auth foundation:

| Area | Supabase feature |
|---|---|
| Users | Supabase Auth + `public.profiles` |
| Roles | `public.user_roles` / profile role column with RLS |
| Matches | Postgres tables |
| Announcements | Postgres tables |
| Attack events | Postgres tables inserted by trusted backend service |
| Live dashboard | Supabase Realtime or FastAPI WebSocket backed by Supabase |
| Security | Row Level Security policies |
| Schema changes | Supabase migrations |
| Local dev | Supabase CLI/local stack |

## Important design rule

Do not let the browser write raw honeypot attack events directly. Attack events must be created by trusted backend/ingestion services using server-side credentials only.

## What Supabase should replace

Supabase should replace:
- MongoDB/Mongoose data models in `nowhere-esports-intranet`.
- Manual OTP-token persistence if Supabase Auth OTP is used.
- The inconsistent app/user persistence model.
- Direct frontend dependency on target-app SSE for platform analytics.

## What Supabase should not blindly replace

Supabase should not fully replace Kafka for high-volume internal event processing unless the project becomes small-scale only. For a realistic honeypot platform:
- Kafka remains useful for ingestion buffering and enrichment pipelines.
- Supabase stores validated/enriched events for APIs, dashboards, and reporting.
- Supabase Realtime streams dashboard-safe rows or summarized events.

## Update outcome

After the update:
- Node target app uses Supabase Auth/session or validates Supabase JWT.
- FastAPI backend reads/writes Supabase Postgres using server-side credentials.
- React dashboard connects to FastAPI APIs and/or Supabase Realtime.
- RLS protects all browser-accessible tables.
- Attack data is normalized, queryable, and dashboard-ready.

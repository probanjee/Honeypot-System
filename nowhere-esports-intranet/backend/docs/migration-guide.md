# Database Migration Guide

This document describes how to execute migrations to setup the database layer for the Nowhere Esports Intranet.

---

## Prerequisites

- Access to a Supabase project.
- Postgres client tool (e.g. `psql`, Supabase SQL Editor, DBeaver).

---

## Migration Steps

Migrations must be run in exact alphabetical order to satisfy foreign key relationships:

1. **`001_create_profiles.sql`** — Base profiles schema.
2. **`002_create_audit_events.sql`** — Base audit schema.
3. **`003_rls_policies.sql`** — Primary RLS configurations.
4. **`004_create_profile_trigger.sql`** — Auto-profile creation trigger.
5. **`005_business_organization.sql`** — Corporate organization structures.
6. **`006_business_employees.sql`** — Extended employee files.
7. **`007_business_teams.sql`** — Workgroups and Esports rosters.
8. **`008_business_esports.sql`** — Tournament, match schedules and results.
9. **`009_business_communication.sql`** — Announcements and Notifications.
10. **`010_business_documents.sql`** — Document storage and versioning.
11. **`011_business_hr.sql`** — Attendance and leave requests.
12. **`012_business_support.sql`** — Helpdesk ticketing modules.
13. **`013_business_knowledge_base.sql`** — Knowledge Base articles.
14. **`014_business_activity_logs.sql`** — Login and activity logs.
15. **`015_business_views.sql`** — Dashboard aggregates and directory views.
16. **`016_business_functions_triggers.sql`** — Automated code generators.
17. **`017_business_rls_policies.sql`** — Role-level security policy bindings.

---

## Running Migrations in Supabase

1. Open your project on the **Supabase Dashboard**.
2. Navigate to the **SQL Editor**.
3. Create a new query tab.
4. Copy the content of the migrations files in order and click **Run**.

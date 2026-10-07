# Database Schema Reference

This document covers all table definitions and column details implemented in the Nowhere Esports Intranet.

---

## 1. Organization & Core Schema

### `organizations`
- `id` (UUID, PK) — Unique organization ID.
- `name` (TEXT, Unique, Not Null) — Name of the company.
- `domain` (TEXT) — Primary email domain.
- `created_at` / `updated_at` (TIMESTAMPTZ) — Audit timestamps.

### `offices`
- `id` (UUID, PK) — Unique office ID.
- `name` (TEXT, Unique, Not Null) — Office identifier (e.g. London Operations Center).
- `city` / `country` (TEXT, Not Null) — Location coordinates.
- `timezone` (TEXT, Not Null) — IANA office timezone.

### `departments`
- `id` (UUID, PK) — Unique department ID.
- `org_id` (UUID, FK references organizations) — Associated organization.
- `name` (TEXT, Unique, Not Null) — Department name (e.g. Information Security).
- `code` (TEXT, Unique, Not Null) — E.g. ESP_OPS, SEC.

### `job_titles`
- `id` (UUID, PK) — Unique job title record ID.
- `dept_id` (UUID, FK references departments) — Department association.
- `title` (TEXT, Not Null) — Job role name (e.g. Lead Analyst).
- `grade` (TEXT, Not Null) — Corporate grading tier (e.g. E3, M2).

---

## 2. Identity & Employees

### `profiles`
- `id` (UUID, PK references auth.users) — Primary key linking to Supabase identities.
- `email` / `first_name` / `last_name` — User details.
- `role` (TEXT, Default 'employee') — Access control role.
- `status` (TEXT, Default 'active') — Account active state.
- `department_id` (UUID, FK references departments) — Department link.
- `office_id` (UUID, FK references offices) — Assigned office locations.
- `job_title_id` (UUID, FK references job_titles) — Assigned job title.

### `employees`
- `id` (UUID, PK references profiles.id) — 1:1 user profile details linking back to Profiles.
- `employee_id` (TEXT, Unique, Not Null) — Sequential ID (e.g. NWE-2026-0001).
- `hire_date` (DATE) — Start date.
- `termination_date` (DATE) — End date (null if active).
- `manager_id` (UUID, FK references employees.id) — Reporting manager.
- `status` (TEXT) — Lifecycle status ('active', 'on_leave', 'terminated').

---

## 3. Communication & Media

### `announcements`
- `id` (UUID, PK) — Announcement ID.
- `author_id` (UUID, FK references profiles) — Creating administrator.
- `title` / `content` (TEXT, Not Null) — Title and body of announcement.
- `pinned` (BOOLEAN, Default false) — Pinned state.
- `status` (TEXT) — Published state.

### `notifications`
- `id` (UUID, PK) — System notification instance.
- `title` / `content` (TEXT) — Message body.
- `type` (TEXT) — Severity level ('info', 'success', 'warning', 'danger').
- `action_url` (TEXT) — Intranet route action redirect link.

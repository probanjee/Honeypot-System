# User & Profile Management Guide

This document covers user profiles, lifecycle states, deletion behavior, and audit logs.

---

## The Profiles Table

Extended profile data is stored in the `public.profiles` table which references `auth.users(id)`. Profile fields:

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key referencing `auth.users.id` |
| `email` | `TEXT` | User's email (unique, lowercase) |
| `first_name` | `TEXT` | User's first name |
| `last_name` | `TEXT` | User's last name |
| `avatar_url` | `TEXT` | Profile image URL |
| `department_id` | `UUID` | References department (null in M2) |
| `role` | `TEXT` | User role tier (defaults to `employee`) |
| `phone` | `TEXT` | Phone number in E.164 format |
| `employee_id` | `TEXT` | Unique company identification code |
| `designation` | `TEXT` | Corporate role title |
| `status` | `TEXT` | Account lifecycle state (`active`, `inactive`, `suspended`) |
| `timezone` | `TEXT` | Preferred IANA timezone (defaults to `UTC`) |

---

## Profiles Lifecycle Trigger

We use a database trigger (`on_auth_user_created`) in PostgreSQL. When a new user registers:
1. Supabase Auth inserts a row into `auth.users`.
2. The trigger executes `public.handle_new_user()`.
3. It inserts a matching profile row with default status `'active'` and role `'employee'`.

---

## Deactivation & Deletion

- **Soft Delete**: Regular users and admins can request account deletion.
  - Endpoint: `DELETE /api/v1/users/:id`
  - Action: Sets profile status to `'inactive'`. The user's active session is terminated, and future logins are blocked.
- **Hard Delete**:
  - Exclusively triggered when the actor is a **SuperAdmin**.
  - Action: Performs a soft delete on the profile table AND triggers `supabaseAdmin.auth.admin.deleteUser()`, purging the identity from Supabase Auth.

---

## Audit Trail

Every security-sensitive action is written to `public.audit_events`.
To guarantee integrity, a Postgres RULE prevents any update or delete operations on this table (making it write-only/immutable).

### Logged Actions
- `USER_REGISTERED`
- `USER_LOGGED_IN`
- `USER_LOGGED_OUT`
- `LOGIN_FAILED`
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_COMPLETED`
- `ROLE_CHANGED`
- `STATUS_CHANGED`
- `PROFILE_UPDATED`
- `ACCOUNT_DELETED`

# Supabase Auth and Roles Plan

## Goal

Replace fragile custom JWT/Mongoose user state with Supabase Auth and a Postgres-backed profile/role system.

## Auth choices

Use Supabase Auth for:
- Email/password login
- Magic link or OTP login
- Google OAuth if needed
- Session management
- JWT issuance

## Tables involved

- `auth.users` — managed by Supabase.
- `public.profiles` — app-specific user data and role.
- `public.audit_logs` — admin/security events.

## User creation flow

1. User signs up through Supabase Auth.
2. `on_auth_user_created` trigger creates `public.profiles` row.
3. User starts with role `user`.
4. Admin promotes user to `analyst` or `admin`.

## Role model

| Role | Meaning |
|---|---|
| `user` | normal intranet user |
| `analyst` | can view security dashboard data |
| `admin` | full app/platform management |
| `service` | reserved label for system identity, not normal browser users |

## Node intranet auth update

Replace:
- Custom `OTPToken.model.js`
- Custom JWT generation for standard login
- Mongoose user lookup assumptions

With:
- Supabase Auth login/signup
- JWT verification using Supabase JWT settings
- Profile lookup in Supabase for role/team data

## FastAPI auth update

FastAPI should:
1. Read `Authorization: Bearer <token>`.
2. Verify Supabase JWT.
3. Extract `sub` as user id.
4. Fetch profile role from Supabase/Postgres.
5. Apply route guards.

## Frontend auth update

React dashboard should:
- Use `@supabase/supabase-js`.
- Store session via Supabase client.
- Use `onAuthStateChange`.
- Show dashboards based on role from `profiles`.

## Admin role bootstrap

Because the first user starts as `user`, create a one-time SQL/admin script:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

Run it only from Supabase SQL editor/local seed or controlled admin setup.

## Security warnings

- Never store service-role key in React/Vite/Next frontend.
- Never allow a user to update their own `role`.
- Never trust role claims from frontend state alone.
- Always verify JWT server-side for backend APIs.

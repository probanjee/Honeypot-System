# Frontend Dashboard Integration Plan

## Goal

Update the React/Vite dashboard so it uses Supabase Auth, role-aware views, and platform-safe APIs/realtime streams.

## Current issue

The dashboard currently connects directly to:
```txt
http://localhost:3000/honeypot/events
```

This is wrong for the platform dashboard because it bypasses the FastAPI backend and conflicts with the documented architecture.

## Target frontend env

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
VITE_REALTIME_MODE=supabase
```

## Install packages

```bash
npm install @supabase/supabase-js
```

## Suggested frontend structure

```txt
frontend/src/
├── lib/
│   ├── supabaseClient.ts
│   └── apiClient.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useAttackStream.ts
│   ├── useAlerts.ts
│   └── useDashboardSummary.ts
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── attacks/
│   ├── alerts/
│   └── admin/
└── routes/
```

## Supabase client

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## Auth hook

```ts
export function useAuth() {
  // return session, user, loading, signIn, signOut
}
```

## Role-aware UI

Hide or disable:
- `/admin` for non-admin
- `/attacks` for normal users
- raw payload views for non-admin
- rule editor for non-admin

## API client

Use Supabase session token:

```ts
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

fetch(`${API_BASE_URL}/api/attacks`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

## Realtime hook

Option A: Supabase Realtime

```ts
supabase
  .channel("alerts")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "alerts"
  }, (payload) => {
    // update alert state
  })
  .subscribe();
```

Option B: FastAPI WebSocket

```ts
const ws = new WebSocket(`${WS_BASE_URL}/ws/live?token=${token}`);
```

Prefer Authorization headers for WebSocket when supported; query token is easier but less ideal.

## UX states

Add UI states for:
- disconnected realtime
- unauthorized role
- empty dashboard
- backend offline
- Supabase auth expired
- failed RLS permission

## Remove direct vulnerable-app dependency

Delete or rewrite hardcoded usage of:
```txt
localhost:3000/honeypot/events
localhost:3001/honeypot/events
```

Use:
```txt
VITE_API_BASE_URL
```

or Supabase Realtime.

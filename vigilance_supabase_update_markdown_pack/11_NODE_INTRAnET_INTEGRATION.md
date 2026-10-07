# Node Intranet App Supabase Integration Plan

## Goal

Move `nowhere-esports-intranet` from MongoDB/Mongoose persistence to Supabase Auth + Supabase Postgres.

## Files likely affected

```txt
nowhere-esports-intranet/
├── server/
│   ├── config/
│   │   ├── supabase.js
│   │   └── passport.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── announcements.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── matches.controller.js
│   │   └── user.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── honeypot.middleware.js
│   │   └── role.middleware.js
│   ├── routes/
│   └── services/
│       ├── auth.service.js
│       ├── supabase.service.js
│       └── honeypot-event.service.js
└── .env.example
```

## Install packages

```bash
npm install @supabase/supabase-js
```

## Environment variables

```env
PORT=3001
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
PLATFORM_INTERNAL_API_URL=http://localhost:8000
PLATFORM_INTERNAL_API_KEY=
```

## Supabase server client

```js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

module.exports = { supabaseAdmin };
```

## Auth migration

Replace:
- `User.model.js`
- `OTPToken.model.js`
- custom `generateToken`
- route assumptions of `req.user.save()`

With:
- Supabase Auth sign-in/sign-up
- Supabase user id as canonical user id
- `profiles` table for role/team/name

## Middleware update

`authenticateJWT` should:
1. Read bearer token or session cookie.
2. Verify Supabase JWT.
3. Attach normalized user object:

```js
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: profile.role,
  profile
};
```

## Profile update route

Old pattern to remove:
```js
req.user.name = name;
await req.user.save();
```

New pattern:
```js
await supabaseAdmin
  .from("profiles")
  .update({ display_name: name, team_id })
  .eq("id", req.user.id);
```

## Announcements route

Use:
```js
created_by: req.user.id
```

not:
```js
createdBy: req.user._id
```

## Matches route

When score changes:
1. Update `matches`.
2. Insert into `match_score_events`.
3. Let Supabase Realtime or platform backend broadcast.

## Honeypot middleware

The target app should not directly expose attack logs to browser clients.

Flow:
1. Suspicious request detected.
2. Middleware creates sanitized event object.
3. Sends event to FastAPI internal endpoint or writes to Supabase with server credentials.
4. Never include service key in frontend.

## MongoDB removal plan

Remove after full migration:
- Mongoose connection file
- Mongoose models
- MongoDB env variables
- MongoDB seed logic

Keep temporarily:
- Migration scripts that export MongoDB data to JSON.

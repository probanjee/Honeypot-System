# Data Migration: MongoDB/Mongoose to Supabase

## Goal

Move existing app data from MongoDB collections into Supabase Postgres safely.

## Source collections

Likely Mongoose models:
- `User`
- `OTPToken`
- `Match`
- `Announcement`
- `AttackLog`

## Target Supabase tables

| MongoDB collection | Supabase target |
|---|---|
| `User` | `auth.users` + `profiles` |
| `OTPToken` | remove or archive |
| `Match` | `matches` |
| `Announcement` | `announcements` |
| `AttackLog` | `attack_events` + `attack_payloads` |

## Migration phases

### Phase 1: Export

Create JSON exports:

```bash
mongoexport --uri "$MONGO_URI" --collection users --out exports/users.json
mongoexport --uri "$MONGO_URI" --collection matches --out exports/matches.json
mongoexport --uri "$MONGO_URI" --collection announcements --out exports/announcements.json
mongoexport --uri "$MONGO_URI" --collection attacklogs --out exports/attacklogs.json
```

### Phase 2: Transform

Transform Mongo ObjectIds into UUIDs or keep original ids in metadata.

Recommended:
- Use new UUIDs for Supabase rows.
- Store old Mongo id in `metadata.old_mongo_id`.

### Phase 3: Import users

User migration is sensitive.

Options:
1. Ask users to reset passwords via Supabase Auth.
2. Use Supabase Admin API to invite/create users.
3. Do not attempt to migrate password hashes unless you fully understand compatibility.

Recommended for student/project version:
- Create users manually or through invite/reset.
- Import profile metadata after Auth users exist.

### Phase 4: Import app data

Insert:
- teams
- matches
- match score event history if available
- announcements
- attack events

### Phase 5: Validate counts

Compare:
- old user count vs profiles count
- matches count
- announcements count
- attack logs count
- latest event timestamps

### Phase 6: Cutover

1. Freeze writes to MongoDB.
2. Run final export/import.
3. Switch env variables to Supabase.
4. Start services.
5. Run smoke tests.
6. Archive MongoDB data.

## Migration script requirements

Create:

```txt
scripts/migration/
├── export_mongo.js
├── transform_users.js
├── transform_matches.js
├── transform_announcements.js
├── transform_attacklogs.js
├── import_supabase.js
└── verify_counts.js
```

## Safety rules

- Do not log Supabase service keys.
- Do not import raw malicious payloads without sanitization.
- Keep backups.
- Do not delete MongoDB until Supabase verification passes.
- Keep migration idempotent where possible.

## AttackLog mapping example

MongoDB:
```json
{
  "_id": "mongo-id",
  "ip": "192.0.2.10",
  "path": "/login",
  "method": "POST",
  "payload": "' OR 1=1 --",
  "createdAt": "2026-06-26T10:00:00Z"
}
```

Supabase `attack_events`:
```json
{
  "source_ip": "192.0.2.10",
  "protocol": "http",
  "method": "POST",
  "path": "/login",
  "signature": "legacy_import",
  "severity": "medium",
  "payload_preview": "' OR 1=1 --",
  "metadata": {
    "old_mongo_id": "mongo-id",
    "imported": true
  },
  "received_at": "2026-06-26T10:00:00Z"
}
```

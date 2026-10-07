# API Spec After Supabase Update

## Auth

All protected endpoints require:

```http
Authorization: Bearer <supabase_access_token>
```

Internal service endpoints require:

```http
X-Internal-API-Key: <internal_service_key>
```

## Public/Auth endpoints

### `GET /api/me`

Returns current user profile.

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "User",
  "role": "analyst",
  "team_id": null
}
```

## Dashboard endpoints

### `GET /api/dashboard/summary`

Roles:
- analyst
- admin

Response:
```json
{
  "total_attacks": 250,
  "critical_alerts": 4,
  "active_honeypots": 2,
  "events_last_24h": 51
}
```

### `GET /api/dashboard/attacks/recent?limit=50`

Roles:
- analyst
- admin

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "source_ip": "203.0.113.10",
      "protocol": "http",
      "signature": "SQL Injection Attempt",
      "severity": "high",
      "received_at": "2026-06-26T10:00:00Z"
    }
  ]
}
```

### `GET /api/dashboard/attacks/timeseries?window=24h`

Roles:
- analyst
- admin

Response:
```json
{
  "points": [
    {
      "bucket": "2026-06-26T10:00:00Z",
      "count": 12
    }
  ]
}
```

## Attack endpoints

### `GET /api/attacks`

Roles:
- analyst
- admin

Query params:
- `severity`
- `source_ip`
- `protocol`
- `from`
- `to`
- `limit`
- `offset`

### `GET /api/attacks/{id}`

Roles:
- analyst
- admin

Admin response may include payload details.
Analyst response must not include raw payload.

### `POST /internal/attacks`

Roles:
- internal service only

Request:
```json
{
  "node_id": "uuid",
  "session_id": "uuid",
  "source_ip": "203.0.113.10",
  "source_port": 45510,
  "protocol": "http",
  "method": "POST",
  "path": "/login",
  "signature": "SQL Injection Attempt",
  "severity": "high",
  "payload_preview": "' OR 1=1 --",
  "metadata": {
    "rule": "sql_injection_basic"
  }
}
```

Response:
```json
{
  "id": "uuid",
  "stored": true
}
```

## Alert endpoints

### `GET /api/alerts`

Roles:
- analyst
- admin

### `PATCH /api/alerts/{id}`

Roles:
- analyst
- admin

Request:
```json
{
  "status": "acknowledged"
}
```

## Match endpoints

### `GET /api/matches`

Roles:
- authenticated users

### `PATCH /api/matches/{id}/score`

Roles:
- admin

Request:
```json
{
  "score": {
    "team_a": 10,
    "team_b": 8
  },
  "status": "live"
}
```

Behavior:
- updates `matches`
- inserts `match_score_events`
- realtime notifies subscribers

## Announcement endpoints

### `GET /api/announcements`

Roles:
- authenticated users

Normal users see published only.

### `POST /api/announcements`

Roles:
- admin

## Admin endpoints

### `PATCH /api/admin/users/{id}/role`

Roles:
- admin

Request:
```json
{
  "role": "analyst"
}
```

Must create audit log.

## Error format

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}
```

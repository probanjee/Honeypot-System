# FastAPI Integration Plan

## Goal

Make FastAPI the main platform API that reads/writes Supabase-backed data and serves the dashboard.

## Required packages

```txt
supabase
asyncpg
python-jose[cryptography]
pydantic-settings
```

Alternative for direct DB access:
```txt
sqlalchemy[asyncio]
asyncpg
alembic
```

## Environment variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
```

## Recommended backend structure

```txt
services/backend/app/
├── api/
│   ├── auth.py
│   ├── attacks.py
│   ├── alerts.py
│   ├── dashboard.py
│   ├── health.py
│   └── websocket.py
├── core/
│   ├── config.py
│   ├── security.py
│   ├── supabase.py
│   └── roles.py
├── repositories/
│   ├── attacks_repo.py
│   ├── alerts_repo.py
│   └── profiles_repo.py
├── services/
│   ├── attack_service.py
│   ├── alert_service.py
│   └── dashboard_service.py
└── factory.py
```

## Supabase client setup

```py
from supabase import create_client, Client
from app.core.config import settings

def get_supabase_service_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

## JWT verification

FastAPI should verify Supabase-issued JWTs before protected routes.

Pseudo-flow:
1. Read bearer token.
2. Decode using Supabase JWT secret or JWKS approach.
3. Extract `sub`.
4. Fetch profile from `profiles`.
5. Attach `current_user`.

## Route guards

```py
def require_roles(*roles: str):
    def guard(user = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return guard
```

## API endpoints to implement

### Dashboard
- `GET /api/dashboard/summary`
- `GET /api/dashboard/attacks/recent`
- `GET /api/dashboard/attacks/timeseries`
- `GET /api/dashboard/alerts/recent`

### Attacks
- `GET /api/attacks`
- `GET /api/attacks/{attack_id}`
- `POST /internal/attacks`
- `POST /internal/attacks/batch`

### Alerts
- `GET /api/alerts`
- `PATCH /api/alerts/{alert_id}`

### System
- `GET /api/health`
- `POST /internal/health`

## Internal service protection

Internal endpoints should require one of:
- service-role key in server-to-server header
- internal shared secret
- mTLS in production
- private network only

Do not expose internal ingestion endpoints publicly without protection.

## Fix existing platform issues

### `factory.py`
- Keep Kafka consumer.
- Save enriched event to Supabase.
- Then broadcast through WebSocket manager if enabled.

### `websocket.py`
- Implement connection manager.
- Add role validation before accepting dashboard socket.
- Broadcast only safe event fields.

### Analytics
- Use `session_id` now present in schema.
- Or use `.size()` for resampling if session id is absent.

## Example attack insert payload

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
    "user_agent": "curl/8.0",
    "rule_id": "sql_injection_basic"
  }
}
```

## Testing

- Test unauthorized requests return 401.
- Test normal user cannot access attacks.
- Test analyst can access attack summaries.
- Test service endpoint rejects missing internal auth.
- Test service insert creates attack event row.

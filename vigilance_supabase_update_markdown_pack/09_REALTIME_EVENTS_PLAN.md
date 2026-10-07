# Supabase Realtime Events Plan

## Current architecture issue

The dashboard currently connects directly to the vulnerable intranet app SSE endpoint. This bypasses the intended FastAPI platform backend and creates an architecture mismatch.

## Target options

### Option A: FastAPI WebSocket as main realtime layer

Recommended for advanced platform control.

Flow:
1. Honeypot services emit raw events.
2. Kafka receives raw events.
3. Ingestion service sanitizes/enriches events.
4. Ingestion writes to Supabase.
5. FastAPI broadcasts dashboard-safe event to connected WebSocket clients.

Benefits:
- Backend controls filtering.
- Good for high-volume event shaping.
- Keeps Supabase Realtime optional.

### Option B: Supabase Realtime from dashboard

Good for simpler dashboard.

Flow:
1. Ingestion writes safe rows into `attack_events` or summary table.
2. Dashboard subscribes to Postgres changes.
3. RLS ensures only analysts/admins can read rows.

Benefits:
- Less custom WebSocket code.
- Fast implementation.
- Works well for moderate event volume.

### Recommended hybrid

Use both:
- FastAPI WebSocket for enriched live security dashboard.
- Supabase Realtime for simple match score, announcements, and alert status changes.

## Tables suitable for Realtime

| Table | Realtime usage |
|---|---|
| `match_score_events` | live score updates |
| `announcements` | new published announcements |
| `alerts` | alert status changes |
| `attack_events` | analyst/admin dashboard stream |
| `system_health_checks` | service status dashboard |

## Tables not ideal for direct Realtime

| Table | Reason |
|---|---|
| `attack_payloads` | sensitive/raw payload data |
| `audit_logs` | admin-only; use backend API |
| `profiles` | privacy/role risk |

## Frontend subscription example

```ts
const channel = supabase
  .channel("attack-events")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "attack_events",
    },
    (payload) => {
      // Update dashboard state with payload.new
    }
  )
  .subscribe();
```

## Backend broadcast example

```py
async def broadcast_saved_attack(manager, saved_event: dict):
    safe_event = {
        "id": saved_event["id"],
        "source_ip": saved_event["source_ip"],
        "protocol": saved_event["protocol"],
        "severity": saved_event["severity"],
        "signature": saved_event.get("signature"),
        "received_at": saved_event["received_at"],
    }
    await manager.broadcast_json(safe_event)
```

## Implementation rules

1. Do not stream raw payloads to the browser.
2. Use server-side filtering for high-volume data.
3. Use RLS for all direct Supabase subscriptions.
4. Keep event payloads small.
5. Add reconnect logic in frontend hooks.
6. Add visible degraded state if realtime disconnects.

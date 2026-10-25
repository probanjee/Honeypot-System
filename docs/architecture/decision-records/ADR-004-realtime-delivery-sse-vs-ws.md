# ADR-004: Real-Time Dashboard Updates: Server-Sent Events (SSE) vs WebSockets

## Status
Accepted

## Context
The SOC dashboard (React + TypeScript) requires live streaming updates for:
1. New attack telemetry events arriving in the system.
2. Real-time anomaly alerts emitted by the analytics engine.
3. Service health and ingestion throughput counters.

We need to choose between **Server-Sent Events (SSE)** and **WebSockets (WS)** for the real-time transport between the FastAPI backend and the React frontend.

## Comparison

| Feature | Server-Sent Events (SSE) | WebSockets (WS) |
| :--- | :--- | :--- |
| **Directionality** | Unidirectional (Server to Client) | Full Duplex (Bidirectional) |
| **Protocol** | Standard HTTP/1.1 or HTTP/2 | Custom WS/WSS protocol (HTTP upgrade handshake) |
| **Firewall / Proxy Compatibility** | 100% standard HTTP, passes effortlessly through enterprise firewalls, reverse proxies, and Nginx | Often blocked or terminated by strict corporate proxies and VPNs |
| **Reconnection Support** | Built-in native browser reconnection with `Last-Event-ID` tracking via `EventSource` | Requires custom application-level heartbeat, ping/pong frames, and reconnect logic |
| **Multiplexing** | Native multiplexing over HTTP/2 | Separate TCP connection per socket (unless customized) |
| **Complexity** | Very low: simple streaming response in FastAPI (`EventSourceResponse`) | Moderate/High: connection state, socket lifecycles, ping/pong timeouts, custom reconnection |

## Decision
We select **Server-Sent Events (SSE)** for all live dashboard updates.

### Rationale
1. **Unidirectional Match**: VIGILANCE dashboard requirements are 100% server-to-client streaming. The client never transmits attack telemetry to the server via the real-time channel. Client actions (e.g., filtering, pagination, acknowledging alerts) are inherently standard RESTful HTTP requests (`GET`, `POST`, `PATCH`).
2. **Native Reconnection & Resume**: The browser's native `EventSource` API automatically reconnects if the connection drops. When reconnecting, the browser automatically sends the HTTP header `Last-Event-ID`. FastAPI reads this header and replays any missed events from Redis or PostgreSQL, guaranteeing seamless UI continuity during server restarts.
3. **Simpler Operational Footprint**: SSE requires no special WebSocket framing or reverse-proxy socket upgrade headers in Nginx.

## Implementation Details
- **Endpoint**: `GET /api/v1/stream/events` (returns `text/event-stream`).
- **Stream Format**:
  ```text
  id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
  event: attack
  data: {"event_id": "...", "source_ip": "185.220.101.5", "category": "SQL_INJECTION", "severity_score": 85}

  id: 6ba7b811-9dad-11d1-80b4-00c04fd430c8
  event: alert
  data: {"alert_type": "TRAFFIC_VOLUME_ANOMALY", "metric": "events_per_minute", "observed_value": 45}
  ```
- **Keepalive**: FastAPI sends a comment line (`: keepalive\n\n`) every 15 seconds to prevent gateway timeouts.

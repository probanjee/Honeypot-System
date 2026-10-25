# Architecture Decision Record 003: Real-Time Event Delivery (SSE vs. WebSockets)

## Status
Accepted (Phase 0)

## Context
The SOC dashboard requires sub-second live telemetry for incoming attacks, anomaly alerts, and system throughput. We evaluated **Server-Sent Events (SSE)** versus **WebSockets (WS)**.

## Decision
We select **Server-Sent Events (SSE)** for all real-time dashboard updates.

### Justification:
1. **Unidirectional Symmetry**: Attack telemetry flows strictly server-to-client. The browser never transmits raw attack packets to the backend over the streaming connection.
2. **Built-in Resilience**: Browser `EventSource` natively reconnects on network failure, passing the `Last-Event-ID` header to resume playback from where it dropped.
3. **Corporate Firewall Transparency**: SSE uses standard HTTP/1.1 or HTTP/2 streams (`text/event-stream`), avoiding WebSocket upgrade handshake termination common in enterprise proxies and VPNs.
4. **Lower Operational Complexity**: Requires no specialized WebSocket frame handling, stateful socket managers, or ping/pong timers.

## Related ADR
- Detailed Protocol Comparison Matrix & Endpoint Contracts: [ADR-004-realtime-delivery-sse-vs-ws.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-004-realtime-delivery-sse-vs-ws.md)

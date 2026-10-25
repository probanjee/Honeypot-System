# VIGILANCE: Trust Boundaries & Security Model

## 1. Trust Zone Architecture

```
+─────────────────────────────────────────────────────────────────────────────+
| ZONE 0: UNTRUSTED EXTERNAL / DECEPTION TIER                                 |
|                                                                             |
|  - Synthetic Attack Clients, External Probes, Scanners                     |
|  - Nowhere Esports Intranet (Honeypot Decoy Sensor)                         |
|  - MongoDB (Raw Untrusted Evidence Store)                                   |
|                                                                             |
|  [POLICY: Payloads are toxic data. Never execute, never eval(), bound size]  |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Kafka Boundary (raw-attacks)
                                       │ TLS / Network Isolation
+──────────────────────────────────────▼──────────────────────────────────────+
| ZONE 1: SECURE ANALYTICAL / PIPELINE TIER                                   |
|                                                                             |
|  - Ingestion Service (Schema Validation & Sanitization Gateway)             |
|  - PostgreSQL Analytical Database                                           |
|  - Threat Intelligence Service (Outbound-only with strict privacy filters)  |
|  - Analytics Engine (Sliding-window MAD Worker)                             |
|  - Kafka Internal Topics (enriched-attacks, alerts)                         |
|                                                                             |
|  [POLICY: Strict Pydantic validation, parameterized SQL, no private IP leak]|
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ REST / SSE Boundary
+──────────────────────────────────────▼──────────────────────────────────────+
| ZONE 2: SOC ANALYST / PRESENTATION TIER                                     |
|                                                                             |
|  - FastAPI Backend API (Authentication, RBAC, Rate Limiting)                |
|  - SOC Dashboard (React / TypeScript Frontend)                              |
|                                                                             |
|  [POLICY: JWT authentication, CORS lockdown, XSS-safe text rendering]       |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Secure Coding & Operational Safeguards

### Safeguard 1: Safe Payload Treatment
- **Rule**: Honeypot sensor code and backend services must **never** execute, eval, or run shell commands based on request contents.
- **Rule**: Payloads rendered in the frontend must be treated as untrusted text, using React's default text escaping (`<div>{payload}</div>`) and never `dangerouslySetInnerHTML`.

### Safeguard 2: Protection of Internal Addresses
- **Rule**: Private, loopback, link-local, and reserved IP ranges (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`; RFC 3927: `169.254.0.0/16`; Loopback: `127.0.0.0/8`) must **never** be queried against external threat intelligence providers (AbuseIPDB, Shodan).
- **Rule**: Exposing internal network topology to third parties is strictly prohibited.

### Safeguard 3: Sensitive Data Redaction
- Before persistence in MongoDB or publication to Kafka, the sensor scrubs known credential patterns:
  - Header: `Authorization: Bearer ...` -> `Authorization: [REDACTED_SECRET]`
  - Header: `Cookie: ...` -> `Cookie: [REDACTED_COOKIE]`
  - Body JSON keys: `password`, `secret`, `token`, `key`, `apiKey`, `credit_card` -> `[REDACTED_SECRET]`

### Safeguard 4: Bounded Resource Allocation
- Maximum HTTP request body size: 4096 bytes (4 KB). Excess bytes are discarded with a truncation indicator (`[TRUNCATED_AT_4KB]`) to prevent Memory Exhaustion / ReDoS attacks on the sensor.
- Regex timeouts and non-backtracking patterns to prevent Catastrophic ReDoS (Regular Expression Denial of Service).

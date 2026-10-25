# VIGILANCE

## Enterprise Honeypot, Deception Engineering, and Real-Time Threat Intelligence Platform

VIGILANCE is a modular security monitoring and deception platform that deploys a controlled intranet environment, captures suspicious HTTP requests, classifies attack indicators, streams telemetry through an Apache Kafka event backbone, performs explainable statistical anomaly detection, and displays security events through a real-time SOC dashboard.

---

## 1. Architectural Blueprint

```
+─────────────────────────────────────────────────────────────────────────────+
| DECEPTION TIER (Target Honeypot: Nowhere Esports Intranet)                  |
| - Node.js + Express decoy intranet application                              |
| - Bounded HTTP request normalization & 14-category regex signature engine   |
| - Contextual severity scoring engine (0 - 100)                              |
| - MongoDB Raw Evidence Store (High-fidelity un-executed forensic dumps)     |
| - Outbox Reconciler (Guarantees at-least-once Kafka publication)            |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Kafka Topic: raw-attacks (key: source_ip)
+──────────────────────────────────────▼──────────────────────────────────────+
| PIPELINE & ENRICHMENT TIER (Ingestion & Threat Intelligence)                |
| - Python Ingestion Worker (Schema validation & sanitization gateway)        |
| - PostgreSQL 16 (Canonical analytical system of record with ON CONFLICT)    |
| - MaxMind GeoIP resolution & Async Threat Intel (AbuseIPDB/Shodan in Redis) |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Kafka Topic: enriched-attacks (key: event_id)
+──────────────────────────────────────▼──────────────────────────────────────+
| ANALYTICS & PRESENTATION TIER (Analytics, API & SOC Dashboard)              |
| - Analytics Worker: 30-minute sliding window with Median Absolute Deviation |
| - Kafka Topic: alerts (key: alert_type)                                     |
| - FastAPI Backend: RESTful filtering, pagination, and Server-Sent Events     |
| - React + TypeScript Dashboard: Live attack feeds, timeline, and alerts     |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Directory Structure

```text
Honeypot-System/
├── .gitignore                      # Ignore patterns for Node, Python, Docker
├── README.md                       # Master system blueprint
├── configs/
│   ├── honeypot-rules.yaml         # 14-category YAML signature engine rules
│   └── system-config.yaml          # Port allocations, Kafka configs, thresholds
├── docs/
│   ├── architecture/
│   │   ├── system-overview.md      # High-level architecture and components
│   │   ├── container-architecture.md # Docker Compose orchestration
│   │   ├── data-flow.md            # Sequence diagrams and lifecycle
│   │   ├── trust-boundaries.md     # Security model and safe handling policies
│   │   └── decision-records/       # Architecture Decision Records (ADRs)
│   │       ├── ADR-001-canonical-records-and-dual-writes.md
│   │       ├── ADR-002-event-schemas-and-deduplication.md
│   │       ├── ADR-003-kafka-kraft-and-partitioning.md
│   │       ├── ADR-004-realtime-delivery-sse-vs-ws.md
│   │       └── ADR-005-mad-anomaly-detection-baseline.md
│   ├── learning/
│   │   ├── 00-project-roadmap.md   # Pedagogical progression
│   │   └── 01-system-fundamentals.md # Distributed systems & Kafka deep dive
│   ├── api/
│   │   ├── event-schemas.md        # JSON Schema for all Kafka topics
│   │   └── kafka-topics.md         # Partitions, keys, and consumer groups
│   ├── database/
│   │   └── schema.md               # PostgreSQL, MongoDB, and Redis schemas
│   ├── algorithms/
│   │   ├── signature-matching.md   # Normalization and ReDoS defense
│   │   ├── severity-scoring.md     # Scoring formula and modifiers
│   │   └── mad-anomaly-detection.md# Mathematical derivation and zero-MAD fallback
│   ├── testing/
│   │   └── test-strategy.md        # Testing pyramid and failure injection
│   └── traceability-matrix.md      # Feature-to-documentation-and-test tracker
├── apps/
│   ├── nowhere-intranet/           # Decoy Express intranet + sensor (Phase 1)
│   └── dashboard/                  # React + Vite + TypeScript dashboard (Phase 5)
├── services/
│   ├── ingestion/                  # Python Kafka consumer -> PostgreSQL (Phase 3)
│   ├── analytics/                  # Python sliding-window MAD detector (Phase 6)
│   ├── threat-intel/               # Threat Intel enrichment worker (Phase 7)
│   ├── alerting/                   # Alert notification dispatcher (Phase 7)
│   └── backend/                    # FastAPI REST & SSE server (Phase 4)
└── scripts/
    └── verify-phase0.py            # Automated Phase 0 verification suite
```

---

## 3. Technology Stack & Key Decisions

- **Decoy Application**: Node.js, Express.js, Mongoose, MongoDB.
- **Message Broker**: Apache Kafka 3.7+ in **KRaft mode** (no ZooKeeper).
- **Canonical Analytical Store**: PostgreSQL 16 with indexed UUIDv4 keys and JSONB.
- **Cache & Rate Limiting**: Redis 7.2 (24-hour Threat Intel cache).
- **Backend API**: Python 3.11+, FastAPI, Pydantic, Server-Sent Events (SSE).
- **Analytics**: Python, Pandas, NumPy, sliding-window Median Absolute Deviation (MAD).
- **SOC Dashboard**: React 18+, TypeScript, Vite, Recharts, W3C `EventSource` (SSE).

---

## 4. Phase 0 Verification

To verify that Phase 0 architecture, configurations, and schema rules are valid and mathematically consistent:

```bash
python scripts/verify-phase0.py
```

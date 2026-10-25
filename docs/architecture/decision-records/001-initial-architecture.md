# Architecture Decision Record 001: Initial Architecture & Technology Stack

## Status
Accepted (Phase 0)

## Context
VIGILANCE is an enterprise honeypot and real-time threat intelligence platform designed to capture, classify, and analyze adversarial telemetry in real time. We need to define the foundational architecture, service topology, and local deployment strategy.

## Decision
We adopt an **event-driven, polyglot microservice architecture** organized into three distinct security and operational tiers:

```mermaid
flowchart TD
    subgraph Tier0 [Zone 0: Deception Target Tier]
        Sensor[Nowhere Esports Intranet: Express.js Sensor]
        MongoDB[(MongoDB: Raw Evidence & Outbox)]
    end

    subgraph Tier1 [Zone 1: Event Transport & Canonical Processing]
        Kafka[Apache Kafka: KRaft Single-Broker Mode]
        Ingestion[Ingestion Service: Python Consumer]
        PostgreSQL[(PostgreSQL 16: Canonical Store)]
        Analytics[Analytics Service: MAD Anomaly Detector]
        AlertRouter[Alert Routing Service]
    end

    subgraph Tier2 [Zone 2: Presentation & SOC Operations]
        FastAPI[FastAPI Backend: REST & SSE Streaming]
        Dashboard[React 18 + TypeScript Dashboard]
    end

    Sensor -->|Store Raw Evidence & Outbox| MongoDB
    MongoDB -->|Sweep & Publish (Key: source_ip)| Kafka
    Kafka -->|Topic: raw-attacks| Ingestion
    Ingestion -->|Idempotent Insert| PostgreSQL
    Ingestion -->|Topic: enriched-attacks| Kafka
    Kafka -->|Topic: enriched-attacks| Analytics
    Analytics -->|Topic: alerts| Kafka
    Kafka -->|Topic: alerts| FastAPI
    FastAPI -->|Server-Sent Events| Dashboard
```

### Component Selection Rationale:
1. **Target Decoy (Express.js / Node.js)**: Fast asynchronous request handling, rich ecosystem for building realistic mock corporate intranets, low overhead for regex signature scanning.
2. **Raw Evidence (MongoDB 7.0)**: High-throughput ingestion of un-truncated, arbitrary JSON/BSON forensic request blobs and transactional outbox staging.
3. **Event Transport (Apache Kafka 3.7+ in KRaft Mode)**: Eliminates ZooKeeper. Durable append-only commit log with partition ordering by `source_ip`.
4. **Canonical Database (PostgreSQL 16)**: ACID compliance, structured relational data, rich indexing (`B-Tree`, `GIN` for JSONB, `inet` for IP addresses), and idempotent ingestion.
5. **Real-time Delivery (FastAPI & Server-Sent Events)**: Asynchronous Python backend with lightweight, native browser-reconnecting HTTP streaming.
6. **Frontend Dashboard (React 18, TypeScript, Vite)**: Type-safe, responsive security operations center interface.

## Related ADRs
- Detailed Dual-Write & Outbox Analysis: [ADR-001-canonical-records-and-dual-writes.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-001-canonical-records-and-dual-writes.md)
- KRaft Deployment & Partitioning: [ADR-003-kafka-kraft-and-partitioning.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-003-kafka-kraft-and-partitioning.md)
- Evidence Repository Abstraction & Decoy Design: [ADR-006-mongodb-repository-and-decoy-intranet-design.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-006-mongodb-repository-and-decoy-intranet-design.md)

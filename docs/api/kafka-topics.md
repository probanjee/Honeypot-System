# VIGILANCE: Kafka Topic Architecture & Operational Specifications

This document defines the Apache Kafka topics, retention policies, partitioning strategies, and consumer group configurations for VIGILANCE.

---

## 1. Topic Matrix

| Topic Name | Partitions | Replication Factor | Cleanup Policy | Retention Time | Max Message Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `raw-attacks` | 3 | 1 (dev) / 3 (prod) | `delete` | 7 days (604,800,000 ms) | 1 MB |
| `enriched-attacks` | 3 | 1 (dev) / 3 (prod) | `delete` | 7 days (604,800,000 ms) | 1 MB |
| `alerts` | 1 | 1 (dev) / 3 (prod) | `delete` | 30 days (2,592,000,000 ms) | 1 MB |
| `raw-attacks-dlq` | 1 | 1 (dev) / 3 (prod) | `delete` | 14 days (1,209,600,000 ms) | 1 MB |

---

## 2. Topic Details

### Topic: `raw-attacks`
- **Purpose**: Ingestion buffer for un-sanitized attack telemetry captured at the deception sensor edge.
- **Producer**: Nowhere Esports Intranet Sensor (`nowhere-intranet`).
- **Consumers**: Ingestion Service (`vigilance-ingestion-group`).
- **Key Strategy**: `source_ip` (string).
  - *Rationale*: Guarantees per-source-IP causal event ordering in a specific partition.
- **Delivery Semantics**: At-least-once via local MongoDB transactional outbox reconciler.

### Topic: `enriched-attacks`
- **Purpose**: Normalized, validated, GeoIP-enriched, and canonically persisted security events.
- **Producer**: Ingestion Service (`ingestion-service`).
- **Consumers**:
  - Analytics Service (`vigilance-analytics-group`)
  - FastAPI Backend Live Streamer (`vigilance-backend-stream-group`)
- **Key Strategy**: `event_id` (UUIDv4).
  - *Rationale*: Uniform hash distribution across all 3 partitions for maximum parallel consumption.
- **Delivery Semantics**: At-least-once with idempotent downstream consumer deduplication.

### Topic: `alerts`
- **Purpose**: High-confidence anomaly detection alerts and operational incident notifications.
- **Producer**: Analytics Service (`analytics-service`).
- **Consumers**:
  - Alerting Service (`vigilance-alerting-group`)
  - FastAPI Backend Live Streamer (`vigilance-backend-stream-group`)
- **Key Strategy**: `alert_type` (string).
  - *Rationale*: Single partition ensures global FIFO ordering of alerts.

### Topic: `raw-attacks-dlq`
- **Purpose**: Quarantine for poison pills, corrupt JSON, or messages that exceed maximum database retries.
- **Producer**: Ingestion Service error handler.
- **Consumer**: Offline Diagnostic / Inspection Worker (`vigilance-dlq-inspector`).

---

## 3. Consumer Groups

| Consumer Group ID | Subscribed Topics | Offset Reset | Offset Commit Strategy |
| :--- | :--- | :--- | :--- |
| `vigilance-ingestion-group` | `raw-attacks` | `earliest` | Manual sync commit after PostgreSQL write. |
| `vigilance-analytics-group` | `enriched-attacks` | `latest` | Periodic async commit after window update. |
| `vigilance-backend-stream-group` | `enriched-attacks`, `alerts` | `latest` | Auto commit (read-only broadcast to SSE). |
| `vigilance-alerting-group` | `alerts` | `earliest` | Manual commit after notification dispatch. |

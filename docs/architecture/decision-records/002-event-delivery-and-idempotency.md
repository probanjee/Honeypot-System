# Architecture Decision Record 002: Event Delivery Semantics & Idempotency Design

## Status
Accepted (Phase 0)

## Context
In a distributed event-driven system using Apache Kafka, networks fail, consumers crash, and offset commits can be lost. We must define:
1. Producer and consumer delivery guarantees.
2. The Dual-Write failure window between MongoDB and Kafka.
3. How to achieve end-to-end duplicate-free records in PostgreSQL.

## Decision

### 1. Delivery Semantics: At-Least-Once with Consumer Idempotency
- **No False Claims**: We explicitly reject claims of magic "end-to-end exactly-once" delivery across disparate systems (MongoDB -> Kafka -> PostgreSQL).
- Kafka operates with **at-least-once delivery** (`acks=all` on producers, manual offset commits after database persistence on consumers).
- Network partitions or consumer rebalances can cause messages to be re-read.

### 2. The Dual-Write Solution: Outbox Reconciler
- When an exploit is detected, the sensor writes to MongoDB with `kafka_status: "PENDING"`.
- It attempts an immediate asynchronous Kafka publish.
- A background worker (`OutboxReconciliationWorker`) periodically scans for `PENDING` records older than 10 seconds, retrying with exponential backoff until broker acknowledgement is received.

### 3. Database-Level Idempotency in PostgreSQL
- The canonical `attacks` table enforces a primary key constraint: `id UUID PRIMARY KEY`, populated from the immutable `event_id` assigned at the honeypot edge.
- Ingestion executes:
  ```sql
  INSERT INTO attacks (id, mongo_raw_id, timestamp, source_ip, severity_score, ...)
  VALUES ($1, $2, $3, $4, $5, ...)
  ON CONFLICT (id) DO NOTHING;
  ```
- If a message is delivered twice, the second insert results in `0 rows affected`.
- The consumer commits the offset immediately and skips emitting duplicates to `enriched-attacks`.
- **Outcome**: The platform achieves **effectively-once** canonical state.

## Related ADRs
- Detailed Event Schemas & Versioning: [ADR-002-event-schemas-and-deduplication.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-002-event-schemas-and-deduplication.md)
- Dual-Write Pattern Mechanics: [ADR-001-canonical-records-and-dual-writes.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-001-canonical-records-and-dual-writes.md)

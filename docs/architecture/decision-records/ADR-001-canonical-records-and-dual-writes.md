# ADR-001: Canonical Record Ownership and Dual-Write Mitigation

## Status
Accepted

## Context
In VIGILANCE, incoming HTTP exploit attempts hit the decoy application (**Nowhere Esports Intranet**), which acts as an intrusion detection sensor. The system must:
1. Store full high-fidelity raw HTTP telemetry (untruncated headers, body payloads, method, path) as forensic evidence.
2. Publish structured events to Apache Kafka (`raw-attacks`) so downstream microservices (Ingestion, Threat Intel, Analytics) can consume them.
3. Maintain a clean, normalized, deduplicated relational store in **PostgreSQL** for querying, filtering, dashboard aggregation, and alert generation.

This introduces two classic distributed systems challenges:
1. **Canonical Ownership**: Which database/service owns the truth if MongoDB and PostgreSQL differ?
2. **The Dual-Write Problem**: If the honeypot saves raw evidence in MongoDB and then publishes to Kafka, a crash or network partition between step 1 and step 2 will cause events to exist in MongoDB but never reach Kafka (lost telemetry). Conversely, publishing to Kafka before MongoDB commit could send events that fail to persist.

## Decision

### 1. Canonical Record Ownership
- **PostgreSQL (via Ingestion Service)** owns the **canonical analytical attack record**.
- **MongoDB (via Honeypot Target App)** owns the **raw forensic evidence document**.
- **Relationship**:
  - The Honeypot generates a UUIDv4 `event_id` upon request arrival.
  - MongoDB stores the document with `_id: ObjectId(...)` and `event_id: <UUIDv4>`.
  - When the Ingestion Service processes `raw-attacks`, it inserts a row into PostgreSQL where `id = event_id`, and stores `mongo_raw_id = ObjectId.toString()`.
  - Downstream analytics, dashboards, and alerting query PostgreSQL. When an analyst clicks "View Raw Evidence", the backend fetches the full immutable raw dump from MongoDB using `mongo_raw_id`.

### 2. Dual-Write Problem Mitigation
We implement the **Transactional Outbox / Reconciler Pattern**:
1. When a suspicious request is detected, the Honeypot sensor writes to MongoDB with status `kafka_status: "PENDING"`.
2. The sensor immediately dispatches an asynchronous publish to Kafka topic `raw-attacks`.
3. If Kafka acknowledges the message (`RecordMetadata` received), MongoDB updates `kafka_status: "PUBLISHED"`.
4. If Kafka publishing fails, times out, or the sensor crashes before publishing, an in-process background worker (`OutboxReconciliationWorker`) queries MongoDB periodically (`setInterval` every 10s) for records where `kafka_status: "PENDING"` and `created_at < NOW() - 10s`.
5. The worker retries publishing to Kafka with exponential backoff and updates the status to `"PUBLISHED"` upon success.

## Consequences

### Positive
- **No Lost Evidence**: Network blips or temporary Kafka broker downtime do not cause forensic evidence loss.
- **Clear Separation of Concerns**: MongoDB handles flexible, schema-less raw request dumps without risk of schema migration breaking raw telemetry. PostgreSQL handles relational integrity, fast indexed queries, time-series aggregation, and foreign keys.
- **At-Least-Once Delivery**: The outbox reconciler guarantees that every captured attack reaches Kafka at least once.

### Trade-offs & Mitigations
- **Potential Duplicates**: If Kafka acknowledges a publish but the MongoDB status update fails, the reconciler might republish the event.
  - *Mitigation*: Downstream consumer (Ingestion Service) implements idempotent database writes using `INSERT ... ON CONFLICT (id) DO NOTHING`.

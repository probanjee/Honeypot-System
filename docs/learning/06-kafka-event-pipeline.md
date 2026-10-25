# Learning Guide 06: The VIGILANCE Kafka Event Pipeline

## 1. Learning Objectives
By completing this guide, you will:
1. Trace how a live synthetic cyberattack moves from HTTP interception to real-time browser alerts through Kafka.
2. Master the **Dual-Write Problem** and how the **Transactional Outbox Reconciler Pattern** guarantees reliable event capture without data loss.
3. Understand the exact schema and responsibility of VIGILANCE's three core Kafka topics:
   - `raw-attacks`
   - `enriched-attacks`
   - `alerts`
4. Learn how to prevent poison-pill crash loops using a **Dead-Letter Queue (DLQ)**.
5. Master **Idempotent Ingestion** in PostgreSQL using `INSERT ... ON CONFLICT (event_id) DO NOTHING`.

---

## 2. End-to-End Pipeline Architecture

The following diagram illustrates how telemetry flows through the distributed microservices:

```mermaid
flowchart TD
    Attacker[External / Synthetic Attacker]
    
    subgraph Deception [Honeypot Sensor: Nowhere Intranet (Node.js)]
        HTTP[Express Request Interceptor]
        SigEngine[YAML Signature Engine]
        ScoreEngine[Severity Scorer]
        Mongo[(MongoDB: Raw Evidence & Outbox)]
        OutboxWorker[Outbox Reconciler Worker]
    end

    subgraph Messaging [Apache Kafka Event Backbone (KRaft)]
        T_Raw[Topic: raw-attacks]
        T_DLQ[Topic: raw-attacks-dlq]
        T_Enriched[Topic: enriched-attacks]
        T_Alerts[Topic: alerts]
    end

    subgraph Processing [Backend Microservices (Python / FastAPI)]
        Ingestion[Ingestion Service]
        Postgres[(PostgreSQL: Canonical Database)]
        Analytics[Analytics Service: MAD Anomaly Detector]
        AlertRouter[Alert Routing Service]
        FastAPIServer[FastAPI REST & SSE Server]
    end

    subgraph Presentation [SOC Security Operations]
        Dashboard[React + TypeScript Dashboard]
        SecAnalyst[Security Analyst / Alert Webhooks]
    end

    Attacker -->|HTTP Exploit Probe| HTTP
    HTTP --> SigEngine --> ScoreEngine
    ScoreEngine -->|Write Evidence & Outbox Entry| Mongo
    Mongo -->|Poll PENDING Events| OutboxWorker
    OutboxWorker -->|Publish Event (Key: source_ip)| T_Raw
    
    T_Raw -->|Consume: vigilance-ingestion-group| Ingestion
    Ingestion -->|Invalid Schema / Corrupted| T_DLQ
    Ingestion -->|Idempotent Upsert (ON CONFLICT)| Postgres
    Ingestion -->|Produce Validated Event| T_Enriched

    T_Enriched -->|Consume: vigilance-analytics-group| Analytics
    T_Enriched -->|Consume: vigilance-alert-group| AlertRouter

    Analytics -->|Volume Spike / Anomaly Detected| T_Alerts
    AlertRouter -->|Severity >= CRITICAL (Score >= 80)| T_Alerts

    T_Alerts -->|Consume: vigilance-sse-group| FastAPIServer
    FastAPIServer -->|Server-Sent Events (SSE)| Dashboard
    T_Alerts -->|Webhook Notification| SecAnalyst
```

---

## 3. The Dual-Write Problem & The Outbox Pattern

### 3.1 What is the Dual-Write Problem?
When an attack hits the honeypot sensor, the application must perform two state changes:
1. Save the full HTTP evidence to **MongoDB**.
2. Publish an event notification to **Apache Kafka**.

In a naive implementation:
```javascript
// ANTIPATTERN: The Dual-Write Failure Window
await mongoCollection.insertOne(attackEvidence); // Succeeded!
// <-- What if the server crashes, power cuts, or network fails RIGHT HERE?
await kafkaProducer.send({ topic: 'raw-attacks', messages: [...] }); // NEVER RUNS!
```
- **Scenario A**: The MongoDB write succeeds, but Kafka publishing fails. MongoDB now has evidence that the rest of the security platform will never know about (silent event loss).
- **Scenario B**: We flip the order and publish to Kafka first. Kafka succeeds, but MongoDB fails. The ingestion service tries to reference raw evidence that does not exist.

Distributed 2-Phase Commit (2PC) transactions across different storage technologies (MongoDB and Kafka) are notoriously brittle, slow, and unsupported across heterogeneous systems.

### 3.2 The VIGILANCE Solution: Outbox Reconciler
Instead of publishing directly in the HTTP request handler, VIGILANCE uses an asynchronous **Outbox Pattern**:
1. When an attack is captured, the sensor writes the document to MongoDB with `publish_status: "PENDING"`.
2. A lightweight background worker polls for `PENDING` records in batches (using MongoDB indexes).
3. The worker sends the batch to Kafka with `acks=all` (wait for broker acknowledgment).
4. Upon successful Kafka ack, the worker marks `publish_status: "PUBLISHED"` and sets `published_at = new Date()`.
5. If the broker is unreachable, exponential backoff retries without dropping the attack evidence.

---

## 4. Topic Specifications & Schema Contracts

### 4.1 Topic: `raw-attacks`
- **Purpose**: Raw, unvalidated attack events emitted by honeypot sensors.
- **Partitions**: 3
- **Partition Key**: `source_ip` (ensures chronological ordering per attacker IP).
- **Retention**: 7 days (`604800000` ms).
- **Schema**:
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "sensor_id": "honeypot-nowhere-01",
  "timestamp": "2026-10-24T18:00:00.000Z",
  "source_ip": "198.51.100.23",
  "source_port": 49152,
  "http_method": "GET",
  "target_path": "/.env",
  "query_params": {},
  "headers": {
    "user-agent": "sqlmap/1.7.2#stable",
    "host": "intranet.nowhere-esports.local"
  },
  "raw_evidence_ref": "mongo_raw_evidence_6537f1a2b3c4d5e6f7a8b9c0",
  "matched_signatures": [
    {
      "id": "SIG-RECON-001",
      "category": "RECONNAISSANCE",
      "severity_weight": 25
    }
  ],
  "severity_score": 55,
  "severity_level": "MEDIUM"
}
```

### 4.2 Topic: `enriched-attacks`
- **Purpose**: Canonical events validated and enriched by the Ingestion Service (geo-IP, reverse DNS, threat actor tags).
- **Partitions**: 3
- **Partition Key**: `event_id` (distributes load evenly across consumers).
- **Retention**: 7 days.
- **Consumers**: `vigilance-analytics-group`, `vigilance-alert-group`.

### 4.3 Topic: `alerts`
- **Purpose**: Actionable security incidents flagged for immediate operator attention (CRITICAL severity attacks, multi-vector attacks, or statistical volume surges from MAD).
- **Partitions**: 1 (preserves total global ordering for the live incident feed).
- **Partition Key**: `alert_type` (`STATISTICAL_ANOMALY` or `EXPLOIT_ATTEMPT`).
- **Retention**: 30 days.
- **Consumers**: `vigilance-sse-group` (FastAPI Server-Sent Events broker).

---

## 5. Dead-Letter Queue (DLQ) & Resilience

When the Ingestion Service consumes an event from `raw-attacks`:
1. It validates the payload against Pydantic schema `RawAttackEvent`.
2. If validation fails (e.g., malformed JSON, missing `event_id`, invalid IP format):
   - It constructs a DLQ wrapper:
     ```json
     {
       "failed_topic": "raw-attacks",
       "failed_partition": 0,
       "failed_offset": 1042,
       "error_reason": "Pydantic ValidationError: Field 'source_ip' invalid IPv4/IPv6",
       "raw_payload": "{corrupted_payload...}",
       "failed_at": "2026-10-24T18:05:00Z"
     }
     ```
   - It publishes the wrapper to `raw-attacks-dlq`.
   - It **commits the offset** of the original message and continues processing!
3. **Outcome**: The service never crashes into an infinite restart loop, and engineers can inspect `raw-attacks-dlq` to troubleshoot buggy sensors.

---

## 6. Idempotent Ingestion in PostgreSQL

Because Kafka operates under **at-least-once** delivery, network partitions or consumer rebalances can cause a consumer to re-read and re-process an event that was already persisted.

VIGILANCE eliminates duplicate records through database-level idempotency:

```sql
INSERT INTO attacks (
    id, mongo_raw_id, timestamp, source_ip, source_port,
    method, path, attack_category, severity_score, severity_level,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
)
ON CONFLICT (id) DO NOTHING;
```

If Kafka delivers event `550e8400-e29b-41d4-a716-446655440000` three times:
1. First delivery: Row inserted; returns 1 row affected.
2. Second delivery: Conflict on unique primary key `id` (which matches `event_id`); insert skipped safely; returns 0 rows affected.
3. Third delivery: Insert skipped safely.

The consumer commits its offset, achieving **effectively-once end-to-end semantics**.

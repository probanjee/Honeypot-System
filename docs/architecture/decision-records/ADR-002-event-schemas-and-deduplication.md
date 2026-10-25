# ADR-002: Event Schemas, Versioning, and Idempotent Deduplication

## Status
Accepted

## Context
In an event-driven microservices architecture communicating via Apache Kafka, consumers must reliably interpret messages produced by upstream services. As systems evolve, schemas change. Furthermore, Kafka's practical delivery model is **at-least-once**, meaning network retries or consumer rebalances can cause a consumer to receive the exact same message multiple times.

If duplicate events are counted multiple times in PostgreSQL:
1. Attack counts and statistical charts on the SOC dashboard become inflated.
2. The anomaly detection engine (MAD) triggers false positive traffic-spike alerts.
3. GeoIP and Threat Intelligence enrichment APIs are called redundantly, wasting external API quotas.

## Decision

### 1. Versioned Event Schemas
Every event published to Kafka follows a strict JSON envelope adhering to `schema_version: "1.0.0"`.

#### Top-level Envelope Fields:
- `event_id` (UUIDv4): Unique immutable identifier assigned at the sensor edge.
- `schema_version` (string): SemVer string (`1.0.0`).
- `timestamp` (ISO-8601 UTC): Millisecond-precision event timestamp.
- `event_type` (string): e.g., `ATTACK_DETECTED`, `ATTACK_ENRICHED`, `ANOMALY_ALERT`.
- `producer` (string): Identifier of publishing service (`nowhere-honeypot`, `ingestion-service`, `analytics-service`).
- `payload` (object): Typed, validated event payload.

### 2. Idempotent Deduplication in Ingestion Service
- The PostgreSQL `attacks` table uses `id UUID PRIMARY KEY`, matching the event's `event_id`.
- The Ingestion Service executes:
  ```sql
  INSERT INTO attacks (
      id, mongo_raw_id, timestamp, source_ip, source_port, method,
      path, protocol, attack_category, severity_score, severity_level,
      matched_signatures, raw_payload, user_agent, headers,
      geo_country, geo_city, geo_lat, geo_lon, threat_score, status
  ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21
  )
  ON CONFLICT (id) DO NOTHING;
  ```
- **Duplicate Detection**: The consumer checks the query result. If `rows_affected == 0`, the record already existed.
- **Propagation Control**: If an event is a duplicate, the consumer **does not** publish it downstream to `enriched-attacks`, preventing duplicate work in Analytics. It immediately commits the Kafka offset.

### 3. Attack Flood Damping at the Sensor
If an automated scanner (e.g., `gobuster` or `masscan`) fires 500 requests per second from the same IP, flooding Kafka with identical events degrades broker throughput.
- The Honeypot sensor implements an in-memory sliding window bucket (keyed by `SHA256(source_ip + path + signature_ids)`).
- Rapid duplicate requests within a 1-second burst increment an `occurrence_count` field rather than producing hundreds of separate Kafka records.

## Consequences

### Positive
- Downstream microservices can scale horizontally with multiple consumer group instances without risking duplicate database entries.
- Schema versioning allows consumers to reject or migrate deprecated payloads without crashing.
- Preserves accurate statistics for anomaly detection.

### Trade-offs
- Slight overhead for primary key indexing in PostgreSQL (standard B-Tree primary key overhead).

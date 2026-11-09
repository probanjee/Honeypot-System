# Learning Guide 08: Canonical Ingestion, PostgreSQL Idempotency, and Transactional Outbox

## 1. Learning Objectives
By completing this guide, you will:
1. Understand how distributed event consumers maintain reliability under **at-least-once delivery**.
2. Master PostgreSQL-backed **idempotent writes** using `INSERT ... ON CONFLICT (id) DO NOTHING`.
3. Learn why in-memory deduplication fails across restarts and multi-replica consumers.
4. Understand the **Dual-Write Problem** and how the **PostgreSQL Transactional Outbox Pattern** solves it.
5. Learn how worker claiming (`SELECT ... FOR UPDATE SKIP LOCKED`) prevents lock contention and duplicate publishing.
6. Understand **GeoIP screening** (`ipaddress`), graceful degradation, and the vital security distinction between IP routing points and confirmed human attribution.
7. Understand asynchronous database migrations with **Alembic** and `asyncpg`.

---

## 2. Ingestion Pipeline Architecture

```
                                  VIGILANCE Ingestion Service (Phase 3)
                       ┌─────────────────────────────────────────────────────────────┐
                       │                                                             │
Kafka                  │  1. Pydantic v2 Schema Validation                           │
[raw-attacks] ────────►│     (Invalid payloads ──► [raw-attacks-dlq] + commit)       │
                       │                                                             │
                       │  2. GeoIP & Network Classification (`ipaddress`)             │
                       │     (RFC 1918 / Loopback ──► SKIPPED_PRIVATE)               │
                       │                                                             │
                       │  3. Atomic PostgreSQL Transaction:                          │
                       │     ┌────────────────────────────────────────────────────┐  │
                       │     │ INSERT INTO attacks ON CONFLICT (id) DO NOTHING    │  │
                       │     │ IF rowcount > 0:                                   │  │
                       │     │   INSERT INTO attack_signatures (...)              │  │
                       │     │   INSERT INTO enriched_outbox (status='PENDING')   │  │
                       │     │ COMMIT                                             │  │
                       │     └────────────────────────────────────────────────────┘  │
                       │                                                             │
                       │  4. Kafka Consumer Commit (ONLY on DB transaction success!) │
                       └─────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │ Outbox Publisher Background  │
                                       │ Worker:                      │
                                       │ 1. Claims PENDING records    │
                                       │ 2. Publishes to Kafka        │
                                       │ 3. Marks PUBLISHED           │
                                       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                                            Kafka [enriched-attacks]
```

---

## 3. The 6 Core Engineering Decisions Explained

### Decision 1: Database-Backed Idempotency vs In-Memory Deduplication
1. **What it does**:
   Uses the primary key constraint on `attacks.id` via `INSERT INTO attacks (...) VALUES (...) ON CONFLICT (id) DO NOTHING` in [`IngestionService.process_single_event`](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/services/ingestion/src/service.py#L93).
2. **Why it exists**:
   In-memory `Set` or `LRU` caches are lost whenever the ingestion service process restarts, scales to multiple pods, or undergoes rolling deployments. An in-memory cache is a volatile performance optimization, never a correctness guarantee.
3. **How it works internally**:
   PostgreSQL uses a unique B-Tree index on the primary key `id`. When two concurrent or repeated transactions attempt to insert the same UUID, the database detects the index conflict at the engine page lock level and executes `DO NOTHING`, setting `rowcount = 0`. The application detects `rowcount == 0`, skips signature and outbox insertion, logs a duplicate detection event, and cleanly commits the Kafka offset.
4. **What can go wrong**:
   If an application executes separate `SELECT` followed by `INSERT` ("check-then-act"), a race condition allows concurrent workers to both see no record and both attempt insert, crashing one with `UniqueViolation`.
5. **How the implementation handles failure**:
   Atomic `ON CONFLICT DO NOTHING` executes within a single database statement, guaranteeing zero race conditions and zero deadlocks.
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_idempotency_and_db.py -k test_idempotent_on_conflict_do_nothing`.

---

### Decision 2: The Dual-Write Problem and the Transactional Outbox
1. **What it does**:
   Decouples the persistence of the canonical attack record from the publication of the event to Kafka's `enriched-attacks` topic via the `enriched_outbox` table in [`services/ingestion/src/outbox.py`](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/services/ingestion/src/outbox.py).
2. **Why it exists**:
   It is fundamentally impossible for a distributed application to guarantee atomic commit across two distinct systems (PostgreSQL and Kafka) without distributed 2-Phase Commit (2PC), which introduces massive latency and coordinator failure modes.
3. **How it works internally**:
   When an event is ingested, the canonical record in `attacks`, child rows in `attack_signatures`, and a pending publication record in `enriched_outbox` are committed within the **same local PostgreSQL transaction**. An asynchronous background worker polls `enriched_outbox`, claims records using `SELECT ... FOR UPDATE SKIP LOCKED`, dispatches them to Kafka, and marks them `PUBLISHED`.
4. **What can go wrong**:
   The process crashes immediately after committing to PostgreSQL, before publishing to Kafka.
5. **How the implementation handles failure**:
   Because the outbox entry is safely stored in PostgreSQL with `publish_status = 'PENDING'`, when the service restarts (or another worker instance runs), it claims the record and publishes it. Downstream consumers receive the event with at-least-once semantics.
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_service_pipeline.py -k test_failure_scenario_b_crash_recovery_after_db_commit`.

---

### Decision 3: Worker Claiming and Abandoned Claim Recovery
1. **What it does**:
   Worker instances claim batches of outbox records by updating `publish_status = 'CLAIMED'`, `claimed_by = :worker_id`, and `claimed_at = NOW()`.
2. **Why it exists**:
   Multiple ingestion worker instances running concurrently must not process the same outbox messages simultaneously.
3. **How it works internally**:
   On PostgreSQL, `SELECT ... FOR UPDATE SKIP LOCKED` allows each worker to lock only its batch, letting concurrent workers immediately claim adjacent rows without lock blocking. Additionally, if a worker node crashes mid-batch, its claimed rows will have `claimed_at < NOW() - claim_timeout_seconds`. The claim query automatically includes expired claims, allowing surviving workers to heal abandoned work.
4. **What can go wrong**:
   A crashed worker leaves records permanently stuck in `CLAIMED` status.
5. **How the implementation handles failure**:
   The query checks `or_(publish_status == 'PENDING', and_(publish_status == 'CLAIMED', claimed_at < claim_expiry))`.
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_outbox.py -k test_outbox_reclaims_abandoned_worker_claim`.

---

### Decision 4: GeoIP Screening and Attribution Decoupling
1. **What it does**:
   Screens incoming IP addresses with Python's standard `ipaddress` library before lookup in [`GeoIPService.enrich`](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/services/ingestion/src/geoip/service.py#L90).
2. **Why it exists**:
   Private RFC 1918 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), link-local (`169.254.0.0/16`), and multicast addresses are not routable on the public internet. Sending internal IPs to external enrichment APIs is a critical data-leak vulnerability.
3. **How it works internally**:
   If an address is private or reserved, the service skips lookup, sets `status = "SKIPPED_PRIVATE"` and `is_private = True`. If public, it queries the local MaxMind database. If the database file is missing or unreadable, the service degrades gracefully to `status = "UNAVAILABLE"`, preserving canonical event persistence without throwing fatal errors.
4. **What can go wrong**:
   Engineers conflate geographic routing records with the physical identity of an attacker.
5. **How the implementation handles failure**:
   The system documents explicitly: *IP Geolocation identifies network routing points and BGP allocation records. It does NOT identify a confirmed human attacker.* Attackers routinely route attacks through compromised proxies, Tor exit nodes, and cloud VPNs. Canonical events remain 100% valid even when GeoIP data is unavailable.
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_geoip.py`.

---

### Decision 5: Manual Kafka Offset Management vs Auto-Commit
1. **What it does**:
   Configures Kafka consumer with `enable_auto_commit=False` and calls `await consumer.commit()` only after the database transaction has successfully committed.
2. **Why it exists**:
   If `enable_auto_commit=True`, Kafka periodically advances offsets in the background. If PostgreSQL crashes or becomes unreachable, the consumer advances past unpersisted events, permanently losing attack telemetry.
3. **How it works internally**:
   When a database transaction fails, `get_db_session` triggers `session.rollback()`. The exception bubbles, halting the message loop before `consumer.commit()` is reached. When the service recovers, Kafka redelivers the message from the last committed offset.
4. **What can go wrong**:
   PostgreSQL connection drops during a batch.
5. **How the implementation handles failure**:
   The offset is never committed, and upon retry or restart, the event is re-processed and safely deduplicated by `ON CONFLICT DO NOTHING`.
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_service_pipeline.py -k test_failure_scenario_a_postgres_unavailable_does_not_commit_offset`.

---

### Decision 6: Schema Migrations with Alembic & asyncpg
1. **What it does**:
   Manages versioned, non-destructive database DDL using Alembic (`services/ingestion/alembic/versions/001_initial_canonical_schema.py`).
2. **Why it exists**:
   `Base.metadata.create_all()` is unacceptable in production because it cannot alter existing tables, add indexes to live systems, or safely roll back breaking schema changes.
3. **How it works internally**:
   Alembic tracks migration state in the `alembic_version` table in PostgreSQL. Running `alembic upgrade head` inspects the active revision, executes missing upgrades sequentially in a transaction, and updates the revision pointer.
4. **What can go wrong**:
   Accidental data loss during schema modifications or partial migration application.
5. **How the implementation handles failure**:
   Every migration file defines both `upgrade()` and `downgrade()` functions inside transactional blocks, allowing deterministic rollback (`alembic downgrade -1`).
6. **How to reproduce & verify**:
   Run `pytest services/ingestion/tests/test_migrations.py`.

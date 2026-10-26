# VIGILANCE: Database Architecture & Schema Specification

This document details the multi-database design of VIGILANCE:
1. **PostgreSQL 16**: Primary canonical analytical database.
2. **MongoDB 7.0**: Target-side raw forensic evidence document store.
3. **Redis 7.2**: In-memory caching and rate limiting layer.

---

## 1. PostgreSQL 16 Schema (Canonical Relational Store)

Managed by Alembic versioned migrations located in `services/ingestion/alembic/`.
Driver: Asynchronous `asyncpg` via SQLAlchemy 2.0.

### 1.1 Tables Overview
- **`attacks`**: Canonical analytical record for every unique attack detected by sensor nodes.
- **`attack_signatures`**: Normalized junction table recording each detection rule matched by an attack.
- **`threat_actors`**: Attribution grouping table linking repeated patterns/entities to attacks without conflating IP addresses with human identities.
- **`system_metrics`**: Time-bucketed operational and statistical metrics for analytical aggregation.
- **`enriched_outbox`**: Transactional outbox table guaranteeing atomic PostgreSQL commit and reliable Kafka publication to `enriched-attacks`.

### 1.2 DDL Specification (Revision: `001_canonical_schema`)

```sql
-- ── 1. Threat Actors (Source/Actor Attribution Groups) ───────────────────────
CREATE TABLE IF NOT EXISTS threat_actors (
    id UUID PRIMARY KEY,
    actor_name VARCHAR(100) NOT NULL UNIQUE,
    threat_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    attribution_confidence VARCHAR(20) NOT NULL DEFAULT 'LOW',
    attribution_notes TEXT NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Attacks (Canonical Analytical Store) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS attacks (
    id UUID PRIMARY KEY,                                      -- Stable event ID (UUIDv4)
    mongo_raw_id VARCHAR(64) NOT NULL,                       -- Foreign reference to MongoDB raw evidence
    timestamp TIMESTAMPTZ NOT NULL,                          -- Sensor detection timestamp (UTC)
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Pipeline persistence timestamp
    source_ip VARCHAR(45) NOT NULL,                          -- Client IP address
    source_port INTEGER NOT NULL DEFAULT 0,
    is_private_ip BOOLEAN NOT NULL DEFAULT FALSE,
    http_method VARCHAR(10) NOT NULL,
    request_path TEXT NOT NULL,
    protocol VARCHAR(20) NOT NULL DEFAULT 'HTTP/1.1',
    primary_category VARCHAR(64) NOT NULL,                    -- Highest-weight detection category
    severity_score INTEGER NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    severity_level VARCHAR(20) NOT NULL,
    user_agent TEXT,
    detection_summary JSONB NOT NULL DEFAULT '{}'::jsonb,    -- Rule counts and matched ID list
    processing_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Ingestion service version metadata
    
    -- GeoIP Enrichment (Decoupled from Canonical Event Validity)
    geo_country VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    geo_country_code VARCHAR(2) NOT NULL DEFAULT 'XX',
    geo_city VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    geo_latitude NUMERIC(9, 6),
    geo_longitude NUMERIC(9, 6),
    geoip_status VARCHAR(30) NOT NULL DEFAULT 'UNAVAILABLE', -- ENRICHED, SKIPPED_PRIVATE, UNAVAILABLE
    
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE SET NULL,
    schema_version VARCHAR(10) NOT NULL DEFAULT '1.0.0'
);

-- Targeted Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_attacks_mongo_raw_id ON attacks (mongo_raw_id);
CREATE INDEX IF NOT EXISTS idx_attacks_timestamp_desc ON attacks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_source_ip_ts ON attacks (source_ip, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_primary_category ON attacks (primary_category);
CREATE INDEX IF NOT EXISTS idx_attacks_severity_score ON attacks (severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_geo_country_code ON attacks (geo_country_code);

-- ── 3. Attack Signatures (Granular Matched Rules) ────────────────────────────
CREATE TABLE IF NOT EXISTS attack_signatures (
    id UUID PRIMARY KEY,
    attack_id UUID NOT NULL REFERENCES attacks(id) ON DELETE CASCADE,
    signature_id VARCHAR(64) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    weight INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attack_signatures_attack_rule UNIQUE (attack_id, signature_id)
);

CREATE INDEX IF NOT EXISTS idx_attack_signatures_attack_id ON attack_signatures (attack_id);
CREATE INDEX IF NOT EXISTS idx_attack_signatures_signature_id ON attack_signatures (signature_id);

-- ── 4. System Metrics (Operational Window Aggregations) ──────────────────────
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY,
    metric_name VARCHAR(64) NOT NULL,
    metric_grain VARCHAR(20) NOT NULL DEFAULT '1m',          -- Grain: 1m, 5m, 1h, 1d
    window_start TIMESTAMPTZ NOT NULL,
    metric_value NUMERIC(14, 4) NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_system_metrics_window UNIQUE (metric_name, metric_grain, window_start)
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_window ON system_metrics (metric_name, window_start);

-- ── 5. Enriched Outbox (Transactional Outbox for enriched-attacks) ───────────
CREATE TABLE IF NOT EXISTS enriched_outbox (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES attacks(id) ON DELETE CASCADE,
    topic VARCHAR(64) NOT NULL DEFAULT 'enriched-attacks',
    payload JSONB NOT NULL,
    publish_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING, CLAIMED, PUBLISHED, FAILED
    claimed_at TIMESTAMPTZ,
    claimed_by VARCHAR(64),
    published_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enriched_outbox_status_ts ON enriched_outbox (publish_status, created_at);
CREATE INDEX IF NOT EXISTS idx_enriched_outbox_event_id ON enriched_outbox (event_id);
```

### 1.3 Index Selection Rationale & Query Plans
| Index | Target Table & Columns | Expected Analytical Query Pattern | Rationale & Plan Behavior |
| :--- | :--- | :--- | :--- |
| `idx_attacks_timestamp_desc` | `attacks(timestamp DESC)` | Dashboard live timeline & range filtering (`WHERE timestamp >= NOW() - INTERVAL '1 hour'`) | B-tree index permits direct reverse index scan (`Index Scan Backward`), eliminating costly in-memory sorts (`Sort Key`). |
| `idx_attacks_source_ip_ts` | `attacks(source_ip, timestamp DESC)` | Aggregated attacker profiling (`WHERE source_ip = :ip ORDER BY timestamp DESC`) | Composite B-tree index enables single-index lookup and ordering for per-IP threat dossiers without index hopping. |
| `idx_attacks_primary_category`| `attacks(primary_category)` | Category aggregation charts (`SELECT primary_category, COUNT(*) GROUP BY 1`) | Enables fast index-only scans or hash aggregates for category breakdown cards on the frontend dashboard. |
| `idx_attacks_geo_country_code`| `attacks(geo_country_code)` | World threat map aggregation (`SELECT geo_country_code, COUNT(*) GROUP BY 1`) | High-cardinality country code filtering and choropleth density generation. |
| `idx_attack_signatures_attack_id`| `attack_signatures(attack_id)`| Drill-down modals fetching signatures for an event | Foreign-key index prevents sequential scans when querying child signatures for a specific incident. |
| `idx_enriched_outbox_status_ts`| `enriched_outbox(publish_status, created_at)` | Outbox worker polling (`WHERE publish_status = 'PENDING' ORDER BY created_at LIMIT 50`) | Filtered lookup directly targets pending records in FIFO order, bypassing already-published outbox entries. |

### 1.4 Database Migrations (Alembic)
- **Tool**: Alembic with asynchronous `asyncpg` engine (`services/ingestion/alembic.ini`).
- **Initialization**: Run `alembic upgrade head` from `services/ingestion/`.
- **Inspection**: Run `alembic current` or `alembic history --verbose`.
- **Rollback**: Run `alembic downgrade -1` to safely roll back the previous migration.
```

---

## 2. MongoDB Schema (Mongoose Model)

Collection: `raw_evidence`  
Database: `vigilance_evidence`

```typescript
import { Schema, model } from 'mongoose';

const RawEvidenceSchema = new Schema({
  event_id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  kafka_status: { 
    type: String, 
    required: true, 
    enum: ['PENDING', 'PUBLISHED', 'FAILED'], 
    default: 'PENDING',
    index: true 
  },
  kafka_published_at: { type: Date },
  retry_count: { type: Number, default: 0 },
  
  // High-fidelity HTTP evidence
  http: {
    method: { type: String, required: true },
    url: { type: String, required: true },
    path: { type: String, required: true },
    query: { type: Schema.Types.Mixed },
    headers: { type: Schema.Types.Mixed }, // Full headers (with credential redaction)
    raw_body: { type: String },           // Bounded raw body string
    body_hex: { type: String },           // Raw byte dump representation
    ip: { type: String, required: true, index: true },
    port: { type: Number },
    http_version: { type: String }
  },
  
  // Sensor-computed detection snapshot
  detection: {
    matched_rule_ids: [{ type: String }],
    calculated_score: { type: Number },
    severity_level: { type: String }
  }
}, {
  timestamps: true,
  collection: 'raw_evidence'
});

// TTL index to automatically prune raw evidence older than 30 days
RawEvidenceSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export const RawEvidence = model('RawEvidence', RawEvidenceSchema);
```

### 2.1 Repository Abstraction (`IEvidenceRepository`)
All interactions with the raw evidence store are abstracted behind `IEvidenceRepository`:
- `MongoEvidenceRepository`: Official `mongodb` driver implementation for local dev and integration tests.
- `MockEvidenceRepository`: In-memory implementation for fast, database-independent unit tests.

### 2.2 Environment Configuration & Security Bounds
- **Connection URI**: Configured via `MONGO_URI` (defaults to `mongodb://127.0.0.1:27017`).
- **Database Names**:
  - `MONGO_DB_NAME`: `vigilance_evidence` (active development data).
  - `MONGO_DB_TEST_NAME`: `vigilance_evidence_test` (isolated integration test suite).
- **Network Interface**: In both native and Docker configurations, MongoDB is bound strictly to `127.0.0.1` (loopback). Binding to `0.0.0.0` or exposing ports on public network adapters is prohibited.
- **Fail-Fast Policy**: If MongoDB is unavailable in development, the sensor throws an immediate connection error and halts with diagnostic guidance. Silent in-memory fallback in development is prohibited to prevent unnoticed evidence loss.
- **Test Cleanup**: Integration tests targeting `MONGO_DB_TEST_NAME` execute automated database or collection purges (`deleteMany({})` / `dropDatabase()`) in `beforeEach` and `afterAll` lifecycle hooks.

---

## 3. Redis Architecture & Key Strategy

| Key Pattern | Data Type | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `threat_intel:{ip}` | String (JSON) | 86,400s (24h) | Cache AbuseIPDB / Shodan lookup results to preserve external API quota. |
| `rate_limit:{ip}:{minute_ts}` | Integer | 120s (2m) | Enforce API rate limits per client IP on the FastAPI management interface. |
| `live_stream:recent_attacks` | List (FIFO) | None (Max 50 items) | Ring buffer of last 50 events for instant SSE catch-up on new browser connections. |
| `sensor:flood_damp:{hash}` | Integer | 2s | Sliding bucket for collapsing automated high-frequency scanner bursts. |

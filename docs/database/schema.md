# VIGILANCE: Database Architecture & Schema Specification

This document details the multi-database design of VIGILANCE:
1. **PostgreSQL 16**: Primary canonical analytical database.
2. **MongoDB 7.0**: Target-side raw forensic evidence document store.
3. **Redis 7.2**: In-memory caching and rate limiting layer.

---

## 1. PostgreSQL Schema (Analytical Database)

### Tables Overview
- `attacks`: Canonical, normalized security events.
- `attack_signatures`: Normalization table mapping matched rule IDs to attacks.
- `anomaly_alerts`: Explainable statistical alerts emitted by the analytics service.
- `threat_intel_cache`: Durable local store for IP reputation query results.
- `service_heartbeats`: Microservice liveness and consumer lag telemetry.

### DDL Specification

```sql
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Canonical Attacks Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attacks (
    id UUID PRIMARY KEY,                                      -- Matches event_id (UUIDv4)
    mongo_raw_id VARCHAR(64) NOT NULL,                       -- MongoDB ObjectId string
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Capture timestamp
    source_ip VARCHAR(45) NOT NULL,                          -- IPv4 or IPv6 string
    source_port INTEGER NOT NULL DEFAULT 0,
    is_private_ip BOOLEAN NOT NULL DEFAULT FALSE,
    method VARCHAR(10) NOT NULL,                             -- GET, POST, PUT, DELETE, etc.
    path VARCHAR(2048) NOT NULL,                             -- Target URI path
    protocol VARCHAR(20) NOT NULL DEFAULT 'HTTP/1.1',
    attack_category VARCHAR(64) NOT NULL,                    -- Primary category (e.g. SQL_INJECTION)
    severity_score INTEGER NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    matched_signatures TEXT[] NOT NULL DEFAULT '{}',         -- Array of Rule IDs (e.g. {'SIG-SQLI-001'})
    user_agent TEXT,
    raw_payload TEXT,                                        -- Redacted & truncated safe preview
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,              -- Sanitized header snapshot
    
    -- GeoIP Enrichment
    geo_country VARCHAR(100) DEFAULT 'Unknown',
    geo_country_code VARCHAR(2) DEFAULT 'XX',
    geo_city VARCHAR(100) DEFAULT 'Unknown',
    geo_latitude NUMERIC(9, 6),
    geo_longitude NUMERIC(9, 6),
    
    -- Threat Intelligence
    threat_intel_score INTEGER,                              -- 0-100 reputation score
    threat_intel_status VARCHAR(30) DEFAULT 'UNAVAILABLE',
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Targeted Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_attacks_timestamp_desc ON attacks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_source_ip ON attacks (source_ip);
CREATE INDEX IF NOT EXISTS idx_attacks_severity_score ON attacks (severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_category ON attacks (attack_category);
CREATE INDEX IF NOT EXISTS idx_attacks_geo_country ON attacks (geo_country_code);
CREATE INDEX IF NOT EXISTS idx_attacks_mongo_raw ON attacks (mongo_raw_id);

-- ── 2. Attack Signatures (Junction / Granular Table) ──────────────────────────
CREATE TABLE IF NOT EXISTS attack_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attack_id UUID NOT NULL REFERENCES attacks(id) ON DELETE CASCADE,
    rule_id VARCHAR(64) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    weight INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attack_signatures_attack_id ON attack_signatures (attack_id);
CREATE INDEX IF NOT EXISTS idx_attack_signatures_rule_id ON attack_signatures (rule_id);

-- ── 3. Anomaly Alerts Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomaly_alerts (
    id UUID PRIMARY KEY,                                      -- Matches alert_id (UUIDv4)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alert_type VARCHAR(64) NOT NULL,                         -- TRAFFIC_VOLUME_SPIKE, etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    metric VARCHAR(64) NOT NULL,                             -- events_per_minute
    observed_value NUMERIC(12, 4) NOT NULL,
    baseline_median NUMERIC(12, 4) NOT NULL,
    mad NUMERIC(12, 4) NOT NULL,
    modified_z_score NUMERIC(12, 4) NOT NULL,
    threshold NUMERIC(12, 4) NOT NULL,
    window_size_minutes INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp_desc ON anomaly_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON anomaly_alerts (acknowledged);

-- ── 4. Service Heartbeats Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_heartbeats (
    service_name VARCHAR(64) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    version VARCHAR(20) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
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

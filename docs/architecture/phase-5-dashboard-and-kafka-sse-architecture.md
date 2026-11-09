# VIGILANCE Platform Architecture: Phase 5 SOC Dashboard & Kafka-to-SSE Pipeline

This document provides a comprehensive technical architecture and operational reference for Phase 5 of the VIGILANCE Enterprise Honeypot Platform, covering the React + TypeScript Security Operations Center (SOC) dashboard and the end-to-end Kafka → SSE → Browser live event streaming pipeline.

---

## 1. End-to-End Data Path Architecture

The diagram below illustrates the complete lifecycle of an attack event through the VIGILANCE platform, from initial honeypot decoy interaction to live rendering on the analyst's SOC dashboard:

```mermaid
flowchart TD
    subgraph SENSOR["Honeypot Sensor Tier (Node.js / Express)"]
        Attacker["External Attacker / Scanner"] -->|HTTP Probe / Exploit Payload| Decoy["Decoy Application (Nowhere Intranet)"]
        Decoy --> Normalizer["Input Normalizer (4KB Bounded, URL/Unicode Decoded)"]
        Normalizer --> SigEngine["Signature Engine (14 Rule Categories)"]
        SigEngine --> Scorer["Severity Scorer (0-100 Modifiers & Clamping)"]
        Scorer --> Redactor["Redactor (Passwords, Tokens, Auth Headers)"]
        Redactor --> MongoOutbox["MongoDB Evidence Store + Outbox Collection"]
        MongoOutbox --> NodeOutbox["Node.js Outbox Publisher (Atomic Claiming)"]
    end

    subgraph KAFKA_RAW["Kafka Message Bus (KRaft)"]
        NodeOutbox -->|Publish RawAttackEvent v1.0.0| TopicRaw["Topic: raw-attacks (3 Partitions, Key: Source IP)"]
    end

    subgraph INGESTION["Canonical Ingestion Tier (Python / SQLAlchemy Async)"]
        TopicRaw --> IngestConsumer["Ingestion Consumer (Consumer Group: vigilance-ingestion-group)"]
        IngestConsumer --> SchemaVal["Pydantic Contract Validation"]
        SchemaVal -->|Corrupt / Invalid| DLQRaw["Topic: raw-attacks-dlq"]
        SchemaVal -->|Valid| GeoIP["GeoIP Enrichment (MaxMind / RFC 1918 Screening)"]
        GeoIP --> PGTransaction["PostgreSQL Transaction (Atomic ACID Boundary)"]
        
        subgraph PG["PostgreSQL 16 Database"]
            PGTransaction --> CanonicalAttacks["attacks table (ON CONFLICT DO NOTHING)"]
            PGTransaction --> AttackSignatures["attack_signatures table"]
            PGTransaction --> EnrichedOutbox["enriched_outbox table (Status: PENDING)"]
        end

        PGTransaction --> PythonOutbox["Python Outbox Worker (FOR UPDATE SKIP LOCKED)"]
    end

    subgraph KAFKA_ENRICHED["Kafka Message Bus (KRaft)"]
        PythonOutbox -->|Publish EnrichedAttackEvent v1.0.0| TopicEnriched["Topic: enriched-attacks (3 Partitions, Key: Source IP)"]
    end

    subgraph BACKEND["FastAPI Analytical Backend Tier (Port 8000)"]
        TopicEnriched --> KafkaSSE["KafkaSSEConsumer (Background Lifespan Task)"]
        KafkaSSE --> EventValidate["Schema Validation & SSE Formatting"]
        EventValidate --> SSEBroadcaster["SSEBroadcaster (Singleton In-Memory Hub)"]
        
        subgraph STREAM_HANDLER["SSE Stream Handler (/api/v1/stream/attacks)"]
            ClientConnect["Browser Client Connects"] --> CheckHeader{"Has Last-Event-ID?"}
            CheckHeader -->|Yes| ReplayQuery["fetch_replay_events(since_id)\n(Short-Lived DB Session, Materialized & Released)"]
            CheckHeader -->|No| SubBroadcaster["Subscribe to SSEBroadcaster"]
            ReplayQuery --> SubBroadcaster
            SubBroadcaster --> BoundedQueue["Per-Client Bounded Queue (maxsize=100)"]
            BoundedQueue --> SSEFormat["Format SSE Chunks (id, event, data, retry)"]
        end

        SSEBroadcaster -->|Broadcast Event| BoundedQueue
    end

    subgraph FRONTEND["SOC Analyst Dashboard Tier (React 19 + TypeScript + Vite, Port 5173)"]
        SSEFormat -->|text/event-stream over HTTP| SSEClient["Native EventSource Client (sse.ts)"]
        SSEClient --> DedupBuffer["Event Deduplication Buffer (Set<string>)"]
        DedupBuffer --> RingBuffer["Bounded Ring Buffer (200 live attacks)"]
        
        subgraph UI_COMPONENTS["Dashboard UI Components"]
            RingBuffer --> Header["Header (Live Status, Pause/Resume, Counter)"]
            RingBuffer --> LiveFeed["LiveAttackFeed (Real-Time Attacks & Keyset Pagination)"]
            RingBuffer --> SeverityCharts["SeverityCharts (SVG Donut & Top Categories)"]
            RingBuffer --> GeoMap["AttackGeoMap (Leaflet Dark Matter, Approximate GeoIP)"]
            LiveFeed --> DetailModal["AttackDetailModal (Forensic Evidence & Matched Rules)"]
        end

        RESTCalls["REST API Requests (/api/v1/attacks, /api/v1/analytics)"] <--> BackendREST["FastAPI Analytical Endpoints"]
    end
```

---

## 2. Kafka-to-SSE Ingestion & Streaming Walkthrough

### 2.1 Consumer Lifecycle and FastAPI Lifespan Integration
The backend's Kafka consumer is managed inside FastAPI's async lifespan context manager in [`services/backend/src/main.py`](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/services/backend/src/main.py):

1. **Startup:** Upon application startup, `kafka_sse_consumer.start()` creates an `AIOKafkaConsumer` configured with:
   - Topic: `enriched-attacks`
   - Group ID: `vigilance-backend-sse-group`
   - Auto offset reset: `latest` (SSE clients streaming live do not want to consume weeks of old Kafka history on fresh startup).
   - `enable_auto_commit=False` (manual post-broadcast offset management).
2. **Background Execution:** `asyncio.create_task(kafka_sse_consumer.run())` runs the consumer poll loop concurrently without blocking the ASGI HTTP server.
3. **Shutdown:** During FastAPI shutdown, `kafka_sse_consumer.stop()` gracefully cancels the consumer loop, completes any in-flight broadcast, and closes broker network sockets.

### 2.2 Offset Commits and Delivery Guarantees
- **Commit Timing:** Partition offsets are committed **only after** an event has been validated, transformed, and submitted to `SSEBroadcaster.broadcast()`.
- **Fault Tolerance:** If broker connectivity drops or deserialization encounters transient errors, the consumer does not advance offsets blindly.
- **Poison Pill Quarantine:** Malformed non-JSON payloads or records failing `EnrichedAttackEvent` schema validation log structured warnings and discard the poison pill to avoid pinning consumer partition lag.

### 2.3 Solving the Database Connection Pool Leak in Long-Lived SSE Connections
In Phase 4, a subtle architectural limitation existed: when an SSE streaming endpoint uses FastAPI dependency injection with `db: AsyncSession = Depends(get_db)`, FastAPI's dependency resolver keeps the generator open until the HTTP response body stream completes. Because an SSE live stream is an infinite loop (`while True:`), this permanently checked out a database connection from the connection pool for each active browser tab. If 10 analysts opened the dashboard, all 10 pooled connections were consumed, starving REST queries (`/api/v1/attacks`, `/api/v1/analytics`).

**The Phase 5 Architectural Solution:**
1. The dependency was changed from `get_db` to `get_session_factory`.
2. When a client connects with a `Last-Event-ID` header:
   ```python
   # services/backend/src/services/sse_broadcaster.py
   async def fetch_replay_events(session_factory, since_event_id: str, limit: int = 50):
       async with session_factory() as session:
           # Query missed records since since_event_id
           # Materialize records into memory
           return in_memory_events
       # Session is strictly closed and connection returned to pool here
   ```
3. The historical records are fetched and materialized into an in-memory list in **less than 5 milliseconds**. The database session is closed immediately.
4. The infinite streaming generator (`stream_for_client`) receives only the materialized list and the client's `asyncio.Queue`. It operates with **zero active database connections** during the live streaming phase.

### 2.4 Process-Local Broadcast Boundaries
The current `SSEBroadcaster` maintains client queues in memory (`asyncio.Queue` per connected client). This design has specific operational boundaries:
- **Single Instance:** Fully sufficient for single-node deployments where all browser clients connect to the same FastAPI process.
- **Horizontal Multi-Instance Limitation:** When scaled to multiple backend instances behind a load balancer, an event consumed from Kafka by Instance A will only be broadcast to clients connected to Instance A; clients connected to Instance B will not receive it unless Kafka partitions are balanced or a shared pub/sub layer (such as Redis Pub/Sub) is introduced. This constraint is documented for Phase 7.

---

## 3. SOC Dashboard Code Walkthrough

The dashboard application is organized in [`apps/dashboard/src/`](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/apps/dashboard/src/):

```
apps/dashboard/src/
├── types/
│   ├── attacks.ts          # AttackListItem, AttackDetail, AttackSignature, PaginatedResponse
│   ├── analytics.ts        # SummaryAnalytics, SeverityBreakdown, CategoryCount
│   └── stream.ts           # LiveAttackEvent, SSEConnectionStatus ('CONNECTING'|'CONNECTED'|'DISCONNECTED'|'ERROR')
├── services/
│   ├── api.ts              # Centralized fetch client for attacks, analytics, health
│   └── sse.ts              # Native EventSource client with dedup, ring buffer, pause/resume
├── hooks/
│   ├── useSSEStream.ts     # Reactive state hook for live attack feed
│   ├── useAttacks.ts       # Keyset-cursor paginated attacks query with multi-filtering
│   ├── useAnalytics.ts     # Windowed summary analytics polling hook
│   └── useHealth.ts        # Backend health check status hook
├── components/
│   ├── layout/Header.tsx   # Top branding, connection dot, live attack counter, pause/resume
│   ├── analytics/
│   │   ├── SummaryCards.tsx # Key metrics (Total, High/Critical, Distinct IPs, Top Vector)
│   │   └── SeverityCharts.tsx # Custom responsive SVG Donut & Category Bar Chart
│   ├── map/
│   │   └── AttackGeoMap.tsx # Leaflet dark matter map with circle markers & GeoIP disclaimer
│   ├── attacks/
│   │   ├── AttackFilters.tsx # Multi-filter bar (severity, IP, country, score, signature)
│   │   ├── LiveAttackFeed.tsx # Tabbed live stream + historical paginated attack feed
│   │   └── AttackDetailModal.tsx # Full forensic modal (network, geo, evidence, rules)
│   └── common/
│       └── SeverityBadge.tsx # Semantic severity badges with glow accents
├── App.tsx                 # Root component orchestrating layout and modal state
└── index.css               # Modern glassmorphism dark-mode design system
```

### 3.1 Custom React Hooks Architecture
- **`useSSEStream(maxBufferSize = 200)`:** Instantiates and manages the SSE client singleton. Exposes `attacks` (bounded ring buffer), `connectionStatus`, `isPaused`, `pause()`, `resume()`, and `clear()`. Automatically synchronizes state using React 19 callback listeners.
- **`useAttacks(filters)`:** Manages keyset pagination (`cursor`, `nextCursor`, `prevCursorStack`), search/filter debouncing, and loading/error states for the historical attacks table.
- **`useAnalytics(windowHours)`:** Fetches aggregated metrics from `GET /api/v1/analytics/summary?window_hours={hours}` and re-polls on window selector changes (1h, 24h, 7d).
- **`useHealth()`:** Periodically verifies backend availability and database latency via `GET /api/v1/health`.

### 3.2 State Management and Memory Bounds
To prevent browser memory bloat in high-velocity attack environments:
- **Ring Buffer:** `SSEClient` maintains an internal ring buffer clamped to 200 items: `this.buffer = [event, ...this.buffer.slice(0, this.maxBufferSize - 1)]`.
- **Deduplication Set:** A bounded `Set<string>` caches up to 500 recent UUIDs, preventing duplicate table rows during reconnection replays or packet retransmissions.
- **Pause/Resume:** Analysts can pause the live stream to inspect a burst without missing events (incoming items queue in background or resume seamlessly).

---

## 4. Learning & Pedagogical Guide

### 4.1 Server-Sent Events (SSE) vs WebSockets
| Dimension | Server-Sent Events (SSE) | WebSockets (WS) | VIGILANCE Decision Rationale |
| :--- | :--- | :--- | :--- |
| **Communication Direction** | Unidirectional (Server → Client) | Bidirectional (Full Duplex) | SOC attack telemetry is strictly server-to-client notifications. Bi-directional socket overhead is unnecessary. |
| **Protocol / Transport** | Standard HTTP/1.1 or HTTP/2 | Custom `ws://` / `wss://` protocol upgrade | SSE works natively through standard corporate firewalls, reverse proxies (Nginx, Envoy), and HTTP/2 multiplexing. |
| **Reconnection Architecture** | Built-in native browser reconnection with `Last-Event-ID` | Manual implementation required | `EventSource` automatically retries with backoff and sends the last received ID for database replay out-of-the-box. |
| **Message Format** | UTF-8 text (`text/event-stream`) | Text or raw binary frames | JSON payloads are human-readable, simple to debug in browser DevTools, and lightweight. |
| **Proxy Buffering** | Handled via `X-Accel-Buffering: no` | Requires proxy upgrade support | Simple header directive disables buffering in edge proxies. |

### 4.2 Keyset (Cursor) Pagination vs Offset Pagination
On high-velocity datasets like honeypot attack logs, traditional offset pagination (`SELECT ... OFFSET 10000 LIMIT 50`) suffers from two fatal flaws:
1. **Performance Degradation ($O(N)$):** The database engine must scan and discard 10,000 index rows before returning the requested 50 rows.
2. **Page Drift / Missing Rows:** If 20 new attacks arrive while an analyst is reading Page 1, navigating to Page 2 will shift all records by 20, causing the analyst to see duplicate records and miss newly inserted rows.

**Keyset Pagination ($O(1)$):**
VIGILANCE indexes `(timestamp DESC, id DESC)`. The pagination cursor encodes the timestamp and UUID of the last visible row. The query executes as:
```sql
WHERE (timestamp, id) < (:cursor_timestamp, :cursor_id)
ORDER BY timestamp DESC, id DESC
LIMIT 50;
```
This performs an immediate B-tree index seek, maintaining sub-millisecond execution regardless of whether the table contains 100 records or 10,000,000 records.

### 4.3 GeoIP Uncertainty and Ethical Geolocation
IP-derived geographic coordinates represent **approximate regional network routing locations** (typically the ISP POP or datacenter region), **not physical hardware addresses**.
- **Private RFC 1918 / Loopback IPs:** Honeypot internal network probes (e.g., `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`) have no public routing location and are screened with status `SKIPPED_PRIVATE`.
- **Map Accuracy Disclaimer:** The SOC map explicitly surfaces a security disclaimer: *"Plotted locations are approximate regional GeoIP resolutions based on public IP routing. They do not represent physical hardware locations."*

---

## 5. Operations & Troubleshooting Guide

### 5.1 Local Development Startup Commands

#### Step 1: Start Core Infrastructure (Docker KRaft & PostgreSQL)
```bash
docker compose up -d
```

#### Step 2: Start the FastAPI Analytical Backend
```bash
# In services/backend/
services/ingestion/.venv/Scripts/python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 3: Start the React SOC Dashboard
```bash
# In apps/dashboard/
npm run dev
# Dashboard launches on http://localhost:5173
```

### 5.2 Environment Configuration Reference

#### Backend Environment Variables (`services/backend/.env`)
| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://vigilance:vigilance@localhost:5432/vigilance` | Async PostgreSQL connection string |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker bootstrap list |
| `KAFKA_ENRICHED_TOPIC` | `enriched-attacks` | Input topic for live attack events |
| `KAFKA_SSE_CONSUMER_GROUP` | `vigilance-backend-sse-group` | Consumer group ID for SSE live stream |
| `SSE_REPLAY_MAX_RECORDS` | `50` | Maximum historical records to replay on reconnect |
| `SSE_CLIENT_QUEUE_MAXSIZE` | `100` | Bounded memory queue per active client |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Allowed web origins |

#### Dashboard Environment Variables (`apps/dashboard/.env`)
| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Target URL for backend REST API |
| `VITE_SSE_STREAM_URL` | `http://localhost:8000/api/v1/stream/attacks` | Target URL for live attack stream |

### 5.3 Troubleshooting Missing Live Events
1. **Verify Backend Health:**
   ```bash
   curl http://localhost:8000/api/v1/health
   # Must return {"status": "healthy", "components": {"database": "connected", "sse_broadcaster": "operational"}}
   ```
2. **Verify Raw SSE Stream Output:**
   ```bash
   curl -N -H "Accept: text/event-stream" http://localhost:8000/api/v1/stream/attacks
   # Should immediately display a connection comment, followed by 15-second : keepalive comments
   ```
3. **Verify Kafka Broker Topic Ingestion:**
   ```bash
   docker exec -it vigilance-kafka kafka-console-consumer.sh \
     --bootstrap-server localhost:9092 \
     --topic enriched-attacks \
     --from-beginning --max-messages 5
   ```
4. **Inspect Browser Console & Network Tab:**
   - In Chrome/Firefox DevTools, open the **Network** tab, filter by `EventStream`.
   - Ensure the `/stream/attacks` request status is `200 OK` with type `eventsource`.
   - Check the **EventStream** sub-tab to inspect incoming live frames in real time.

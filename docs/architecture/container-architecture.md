# VIGILANCE: Container Architecture & Service Orchestration

## 1. Orchestration Model
The local development and production-like environment is orchestrated using **Docker Compose** (Compose file format v3.8+).

All services run in an isolated internal Docker bridge network (`vigilance-network`), with strict port exposition rules to prevent accidental exposure of raw databases or broker ports to host interfaces.

---

## 2. Service Inventory

```
+-----------------------------------------------------------------------------------------+
|                               Docker Host (Windows / Linux)                             |
|                                                                                         |
|  +------------------------+   +------------------------+   +-------------------------+  |
|  | nowhere-intranet       |   | backend-api            |   | dashboard-frontend      |  |
|  | Port: 3000 (Exposed)   |   | Port: 8000 (Exposed)   |   | Port: 5173 (Exposed)    |  |
|  +-----------+------------+   +-----------+------------+   +------------+------------+  |
|              |                            |                             |                |
|  ============|============================|=============================|==============  |
|              |         vigilance-internal-network (Bridge)              |                |
|              v                            v                             v                |
|  +-----------+------------+   +-----------+------------+   +------------+------------+  |
|  | mongodb                |   | postgresql             |   | kafka (KRaft)           |  |
|  | Internal: 27017        |   | Internal: 5432         |   | Internal: 9092          |  |
|  +------------------------+   +------------------------+   +------------+------------+  |
|                                                                         |                |
|  +------------------------+   +------------------------+                |                |
|  | ingestion-service      |<--| threat-intel-service   |                |                |
|  | Python Worker          |   | Python FastAPI Worker  |                |                |
|  +-----------+------------+   +-----------+------------+                |                |
|              |                            |                             |                |
|              v                            v                             v                |
|  +-----------+------------+   +-----------+------------+   +------------+------------+  |
|  | analytics-service      |   | alerting-service       |   | redis                   |  |
|  | Python Worker          |   | Python Worker          |   | Internal: 6379          |  |
|  +------------------------+   +------------------------+   +-------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Pinned Container Base Images

| Service Name | Base Image / Version | Role & Justification |
| :--- | :--- | :--- |
| `nowhere-intranet` | `node:20-alpine` | Lightweight, secure Node.js LTS runtime for decoy Express intranet. |
| `mongodb` | `mongo:7.0` | Target-side raw document store with WiredTiger engine. |
| `kafka` | `confluentinc/cp-kafka:7.5.3` | Apache Kafka in KRaft mode (no ZooKeeper required). |
| `postgresql` | `postgres:16-alpine` | Relational analytical store with ACID compliance and JSONB indexing. |
| `redis` | `redis:7.2-alpine` | In-memory key-value cache for threat intel lookups and rate limiting. |
| `ingestion-service` | `python:3.11-slim` | Asynchronous Kafka consumer and PostgreSQL batch inserter. |
| `threat-intel` | `python:3.11-slim` | Asynchronous external threat intelligence enrichment worker. |
| `analytics-service`| `python:3.11-slim` | Pandas/NumPy sliding-window statistical calculation worker. |
| `alerting-service` | `python:3.11-slim` | Kafka consumer alerting dispatcher. |
| `backend-api` | `python:3.11-slim` | High-performance FastAPI REST and SSE streaming server. |
| `dashboard` | `node:20-alpine` | Vite + React + TypeScript development server. |

---

## 4. Volume Persistence & Network Isolation
- **Persistent Volumes**:
  - `mongo_data`: Durable raw evidence retention.
  - `postgres_data`: Durable analytical metrics and normalized attack logs.
  - `kafka_data`: Durable commit logs across partition segments.
  - `redis_data`: Cache state persistence across restarts.
- **Port Security**:
  - Only `3000` (Decoy Intranet), `8000` (FastAPI backend), and `5173` (React frontend) are exposed to host localhost.
  - PostgreSQL, MongoDB, Redis, and Kafka internal broker ports are isolated strictly inside `vigilance-internal-network`.

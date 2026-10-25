# Learning Guide 00: VIGILANCE Engineering Roadmap & Pedagogy

## 1. Learning Objectives
By following this roadmap, you will:
1. Understand the exact architectural progression of VIGILANCE from initial Phase 0 design to enterprise deployment.
2. Master how decoupled microservices communicate asynchronously via Apache Kafka.
3. Learn how to defend distributed systems against dual-write inconsistency, network partitions, and poison pills.
4. Acquire practical mastery of asynchronous Python, FastAPI, Express middleware, MongoDB, PostgreSQL, and React.
5. Be able to defend every design choice in an engineering leadership or systems architecture interview.

---

## 2. Prerequisite Knowledge
- C/C++ or Java concepts of memory, threads, and networking (TCP/IP sockets).
- Basic JavaScript ES6+ (Promises, `async/await`, Express).
- Relational DBMS concepts (ACID, primary keys, foreign keys, B-tree indexes).
- Basic Docker concepts (containers, images, port mapping).

---

## 3. Plain-Language Explanation
Imagine building a security surveillance camera network for a high-security building.
- If the camera writes directly to a database across the city, a brief internet glitch causes the camera to drop frames or freeze the camera operator.
- Instead, each camera (our Honeypot Decoy) records a local backup tape (MongoDB) and feeds a broadcast satellite transmitter (Kafka).
- A central office (Ingestion Service) pulls from the satellite, stamps the evidence into the official records book (PostgreSQL), and enriches it with known criminal records (Threat Intelligence).
- A security analyst room (Analytics Service) watches the flow of incoming incident timestamps to spot unusual surges using statistics (MAD Anomaly Detection).
- A live video wall (React Dashboard) receives updates through a dedicated one-way cable (Server-Sent Events) so guards see attacks instantly without constantly refreshing their screens.

---

## 4. Phase-by-Phase Roadmap

```
+─────────────────────────────────────────────────────────────────────────────+
| PHASE 0: REPOSITORY & ARCHITECTURE (Current Phase)                          |
| Inspect workspace, establish ADRs, event schemas, configs, and pedagogy.    |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 1: MINIMAL WORKING HONEYPOT (Nowhere Esports Decoy)                   |
| Node.js + Express sensor, YAML signature engine, severity scoring, MongoDB. |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 2: APACHE KAFKA EVENT PIPELINE                                        |
| KRaft mode Kafka, 3 topics, outbox reconciler, consumer groups, DLQ.        |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 3: CANONICAL INGESTION & POSTGRESQL                                   |
| Python async consumer, idempotent inserts (ON CONFLICT), schema validation. |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 4: FASTAPI BACKEND & REAL-TIME STREAMING                              |
| RESTful queries, pagination, aggregated stats, Server-Sent Events (SSE).     |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 5: REACT & TYPESCRIPT SOC DASHBOARD                                   |
| Vite + Recharts + SSE live attack feed, maps, timeline, incident panels.    |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 6: STATISTICAL ANOMALY DETECTION                                      |
| Sliding-window ring buffer, MAD computation, explainable alert generation.  |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 7: AUXILIARY SERVICES & THREAT INTEL                                  |
| Redis caching, AbuseIPDB/Shodan integration, alert dispatcher.              |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
+──────────────────────────────────────▼──────────────────────────────────────+
| PHASE 8: PRODUCTION HARDENING & RECOVERY TESTING                            |
| Docker Compose orchestration, failure injection, CI pipeline, runbooks.     |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 5. Traceability & Definition of Done
Every feature implemented across these phases must satisfy:
1. **Source Code**: Clean, modular, type-safe implementation.
2. **Automated Tests**: Unit and integration tests that verify positive and negative behavior.
3. **Architecture Match**: Zero divergence from the approved ADRs.
4. **Learning Document**: Deep technical explanations, failure scenarios, and interview questions.
5. **Demonstrated Verification**: Executed test outputs proving functionality on the developer machine.

# VIGILANCE: Feature-to-Documentation & Test Traceability Matrix

This matrix tracks every major component and architectural feature of VIGILANCE.

Statuses: `PLANNED` | `IN_PROGRESS` | `IMPLEMENTED` | `TESTED` | `VERIFIED`

---

| Feature Name | Status | Source Files | Unit Tests | Integration Tests | Documentation Location | Verification Command | Known Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0 Baseline & ADRs** | `VERIFIED` | `configs/honeypot-rules.yaml`, `configs/system-config.yaml` | `scripts/verify-phase0.py` | N/A | `docs/architecture/` | `python scripts/verify-phase0.py` | Initial architectural blueprint phase. |
| **Signature Engine (14 categories)** | `VERIFIED` | `apps/nowhere-intranet/src/engine/` | `tests/unit/signatures.test.ts` | `tests/unit/routes.test.ts` | `docs/algorithms/signature-matching.md` | `npm test` | Regex-based indicators only; does not execute code. |
| **Severity Scoring Engine** | `VERIFIED` | `apps/nowhere-intranet/src/engine/scorer.ts` | `tests/unit/scorer.test.ts` | `tests/unit/routes.test.ts` | `docs/algorithms/severity-scoring.md` | `npm test` | Deterministic context-weighted scoring; clamped to [0, 100]. |
| **Decoy Intranet & Traps** | `VERIFIED` | `apps/nowhere-intranet/src/routes/` | `tests/unit/routes.test.ts` | `scripts/synthetic-traffic.ts` | `docs/architecture/system-overview.md` | `npm run test:synthetic` | Controlled local deception; fictional data; no real credentials accepted. |
| **MongoDB Evidence & Outbox** | `VERIFIED` | `apps/nowhere-intranet/src/models/`, `src/repository/` | `tests/unit/routes.test.ts` (mock) | `tests/integration/mongoRepository.test.ts` | `docs/architecture/decision-records/ADR-001-canonical-records-and-dual-writes.md` | `npm run test:integration` | Requires local or Docker MongoDB instance for live integration run. |
| **Kafka Event Backbone (KRaft)** | `VERIFIED` | `docker-compose.yml`, `apps/nowhere-intranet/src/kafka/` | `tests/unit/outboxPublisher.test.ts`, `tests/unit/ingestionConsumer.test.ts` | `tests/integration/kafkaIntegration.test.ts` | `docs/api/kafka-topics.md`, `ADR-003` | `npm test && npm run test:labs` | Single-broker KRaft setup for local dev; outbox publisher at-least-once. |
| **PostgreSQL Canonical Ingestion** | `VERIFIED` | `services/ingestion/src/` | `services/ingestion/tests/` (30 tests) | `test_idempotency_and_db.py`, `test_service_pipeline.py` | `docs/database/schema.md`, `docs/learning/08-canonical-ingestion-and-idempotency.md` | `pytest services/ingestion` | At-least-once ingestion; transactional outbox to enriched-attacks. |
| **FastAPI REST & SSE Server** | `PLANNED` | `services/backend/` | `pytest tests/test_api.py` | `tests/test_sse_stream.py` | `docs/architecture/decision-records/ADR-004-realtime-delivery-sse-vs-ws.md` | `pytest services/backend` | Live SSE updates rely on backend stream handler. |
| **React + TypeScript Dashboard** | `PLANNED` | `apps/dashboard/` | `npm test` | Cypress / Playwright | `docs/architecture/system-overview.md` | `npm run build` | Frontend UI; displays real or synthetic test events. |
| **MAD Anomaly Detection Engine** | `PLANNED` | `services/analytics/` | `pytest tests/test_mad.py` | `tests/test_spike_pipeline.py` | `docs/algorithms/mad-anomaly-detection.md` | `pytest services/analytics` | Statistical baseline; not a trained deep learning model. |
| **Threat Intelligence & Redis** | `PLANNED` | `services/threat-intel/` | `pytest tests/test_threat_intel.py` | `tests/test_redis_cache.py` | `docs/architecture/trust-boundaries.md` | `pytest services/threat-intel` | External API keys optional; skips private RFC 1918 IPs. |
| **Docker Compose Orchestration** | `PLANNED` | `docker-compose.yml` | N/A | `scripts/test-e2e.sh` | `docs/architecture/container-architecture.md` | `docker compose up --build` | Docker Desktop must be running. |

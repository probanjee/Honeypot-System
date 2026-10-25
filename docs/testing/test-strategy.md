# VIGILANCE: Testing Strategy & Verification Framework

## 1. The Testing Pyramid in VIGILANCE

```
                   / \
                  /   \
                 / E2E \       End-to-End Tests (Decoy -> Kafka -> DB -> UI)
                /-------\
               / Integr- \     Integration Tests (Service -> Kafka / DB / Redis)
              /  ation    \
             /-------------\
            /   Unit Tests  \  Unit Tests (Signatures, Severity, MAD, Schemas)
           /-----------------\
```

---

## 2. Unit Testing Strategy

### 2.1 Signature Matching Engine (Vitest / Node.js)
- Test files: `apps/nowhere-intranet/tests/signatures.test.ts`
- Coverage:
  - Positive matches for each of the 14 attack categories.
  - Negative matches (benign text, legitimate queries).
  - Obfuscated payloads (URL encoding, double encoding, null byte injection).
  - ReDoS safety: Ensure execution time for 10,000 character strings is $< 10\text{ms}$.

### 2.2 Severity Scoring Engine
- Test files: `apps/nowhere-intranet/tests/severity.test.ts`
- Coverage:
  - Single rule scoring.
  - Multi-rule additive scoring.
  - Contextual modifiers ($\Delta_{\text{path}}$, $\Delta_{\text{scanner}}$, $\Delta_{\text{multivector}}$).
  - Clamping behavior: Verify raw score of 130 clamps to 100, and negative adjustments clamp to 0.

### 2.3 MAD Anomaly Detection Engine (pytest / Python)
- Test files: `services/analytics/tests/test_mad_detector.py`
- Coverage:
  - Stationary normal traffic (no alerts).
  - Sudden volume spike ($\ge 3.5$ modified z-score).
  - Zero MAD condition ($\text{MAD} = 0$) and fallback evaluation.
  - Warm-up period suppression ($N < 10$).
  - Gradual trend adaptation.

### 2.4 Decoy Routes & Detection Middleware (supertest / Vitest)
- Test files: `apps/nowhere-intranet/tests/routes.test.ts`
- Mocking: Uses `MockEvidenceRepository` to run without a live MongoDB instance.
- Coverage:
  - **Benign Requests**: `GET /`, `GET /tournaments`, `GET /staff/directory`, `GET /api/v1/tournaments` return HTTP 200 with expected EJS HTML / JSON structures and produce 0 evidence records.
  - **Decoy Login Traps**: `POST /login` and `POST /admin/login` return HTTP 401 Unauthorized without executing authentication credentials.
  - **Canary Traps**: `GET /.env`, `GET /admin`, `GET /robots.txt` return appropriate status codes (403/200) and award contextual severity modifiers ($\Delta_{\text{path}} = +15$).
  - **Attack Injections**: Tests SQLi, XSS, Path Traversal, and Log4Shell payloads across query, headers, and body; verifies that detection middleware captures events and stores them in `MockEvidenceRepository`.
  - **Request Size Bounding**: Verifies payloads exceeding 4KB are truncated or rejected.

---

## 3. Integration Testing Strategy

### 3.1 Honeypot to MongoDB & Kafka Outbox
- **Test Database Isolation**: Runs against dedicated `MONGO_DB_TEST_NAME` (`vigilance_evidence_test`), completely isolated from `vigilance_evidence`.
- **Lifecycle Cleanup**: Harness drops or purges test collections in `beforeEach` / `afterAll` hooks to prevent state pollution.
- Verify that receiving an HTTP exploit inserts a `RawEvidence` document in MongoDB with `kafka_status: "PENDING"`.
- Verify that successful publication transitions the document to `kafka_status: "PUBLISHED"`.
- Verify that if Kafka is offline, the outbox reconciler sweeps and publishes when Kafka returns.

### 3.2 Kafka to PostgreSQL Ingestion
- Verify that consuming from `raw-attacks` validates against the Pydantic schema.
- Test duplicate delivery: publish the exact same event twice and verify PostgreSQL record count equals 1.
- Verify poison pill routing: send malformed JSON and verify it lands in `raw-attacks-dlq`.

---

## 4. Failure Injection & Resilience Testing

| Target Failure | Injection Method | Expected Behavior | Verification Check |
| :--- | :--- | :--- | :--- |
| **Kafka Outage** | Pause Kafka container | Decoy continues serving HTTP responses; outbox accumulates `PENDING` records in MongoDB. | `db.raw_evidence.count({kafka_status: 'PENDING'}) > 0` |
| **PostgreSQL Outage** | Pause PostgreSQL container | Ingestion consumer pauses offset commits; zero message loss. | Kafka consumer lag increases; uncommitted messages remain in broker log. |
| **Threat Intel Timeout** | Inject 5s network delay to mock API | Ingestion completes with `threat_intel_status: "UNAVAILABLE"` in $< 2\text{s}$ without hanging pipeline. | PostgreSQL row has `threat_intel_status = 'UNAVAILABLE'`. |
| **Malformed Payload** | Publish `{"invalid": true}` | Routed to DLQ; pipeline continues processing subsequent valid messages. | `raw-attacks-dlq` receives poison message; consumer does not crash. |

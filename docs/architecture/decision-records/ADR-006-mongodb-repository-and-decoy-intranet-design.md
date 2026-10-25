# ADR-006: Evidence Repository Abstraction and Decoy Intranet Design

## Status
Accepted (Phase 0 Decision Resolution)

## Context
Two critical implementation details for Phase 1 required resolution:
1. **MongoDB Integration & Test Coupling**: How to persist raw forensic evidence and manage outbox events in MongoDB 7 without coupling every unit test to a running database, while preventing silent failure when MongoDB is genuinely offline in development.
2. **Nowhere Esports Intranet Decoy Design**: The UI, route structure, and security posture of the Express.js deception target.

---

## Decision 1: Evidence Repository Abstraction & MongoDB Testing

### 1.1 Repository Pattern (`IEvidenceRepository`)
To decouple business logic from the MongoDB driver, we introduce an explicit repository interface:

```typescript
export interface RawEvidenceRecord {
  id?: string;
  event_id: string;                         // UUIDv4 generated at sensor edge
  timestamp: Date;
  publish_status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  published_at?: Date | null;
  retry_count: number;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;        // Redacted (Authorization, Cookie scrubbed)
    query: Record<string, unknown>;
    body_raw: string | null;                // Bounded to 4KB
    payload_size_bytes: number;
  };
  client: {
    remote_ip: string;
    remote_port: number;
  };
  signature_matches: Array<{
    rule_id: string;
    category: string;
    matched_location: string;
    extracted_sample: string;
  }>;
  severity_score: number;
  severity_level: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IEvidenceRepository {
  saveEvidence(record: RawEvidenceRecord): Promise<string>; // returns mongo_raw_id hex string
  getEvidenceById(mongoRawId: string): Promise<RawEvidenceRecord | null>;
  getEvidenceByEventId(eventId: string): Promise<RawEvidenceRecord | null>;
  fetchPendingOutbox(limit: number): Promise<RawEvidenceRecord[]>;
  markPublished(mongoRawId: string, publishedAt: Date): Promise<void>;
  incrementRetry(mongoRawId: string, errorReason: string): Promise<void>;
  close(): Promise<void>;
}
```

### 1.2 Implementations
1. **`MongoEvidenceRepository`** (Production / Local Dev / Integration Tests):
   - Backed by the official Node.js `mongodb` driver (v6+).
   - Configured via environment variables:
     - `MONGO_URI`: Defaults to `mongodb://127.0.0.1:27017` (binds strictly to loopback).
     - `MONGO_DB_NAME`: Defaults to `vigilance_evidence` (development).
     - `MONGO_DB_TEST_NAME`: Defaults to `vigilance_evidence_test` (test runs).
   - **No Silent Fallback**: If MongoDB is unreachable in development, the repository throws an explicit error and logs diagnostic instructions. Silent fallback to memory is prohibited to prevent false sense of persistence.
2. **`MockEvidenceRepository`** (Fast Unit Tests):
   - In-memory Map implementation of `IEvidenceRepository`.
   - Used in unit tests (`npm test`) so developers and CI can verify signature matching and severity scoring in milliseconds without Docker.

### 1.3 Test Isolation & Cleanup
- Integration tests targeting `MongoEvidenceRepository` use `MONGO_DB_TEST_NAME`.
- The test harness executes `db.dropDatabase()` or `collection.deleteMany({})` in `beforeEach` / `afterAll` hooks to ensure complete test isolation.

---

## Decision 2: Nowhere Esports Intranet (Decoy Design)

### 2.1 Technology & Template Structure
The decoy is built using **Express.js** with **EJS (Embedded JavaScript)** server-side templates and mock JSON REST API routes.

```
apps/nowhere-intranet/
├── src/
│   ├── views/
│   │   ├── layouts/
│   │   │   ├── main.ejs             # Master corporate intranet header & nav
│   │   │   └── footer.ejs
│   │   ├── pages/
│   │   │   ├── index.ejs            # Decoy Homepage (News & Highlights)
│   │   │   ├── tournaments.ejs      # Tournament Schedules & Brackets
│   │   │   ├── staff-directory.ejs  # Staff & Player Roster
│   │   │   ├── login.ejs            # Player/Staff Login Portal
│   │   │   └── admin-login.ejs      # Decoy Administrator Gateway
│   │   └── errors/
│   │       ├── 401.ejs
│   │       ├── 403.ejs
│   │       └── 404.ejs
│   └── routes/
│       ├── web.ts                   # EJS Page Routes
│       ├── api.ts                   # Mock JSON REST API Routes
│       └── canary.ts                # High-Value Decoy Traps
```

### 2.2 Decoy Route Catalog

| Route | Method | Purpose | Response Behavior |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Corporate Homepage | HTTP 200 (EJS rendered homepage with fictional esports news). |
| `/tournaments` | `GET` | Tournament Listings | HTTP 200 (Upcoming CS2, Valorant tournament brackets). |
| `/staff/directory` | `GET` | Staff Directory | HTTP 200 (Fictional coach, admin, and caster contact cards). |
| `/login` | `GET`, `POST` | Player Login Form | `GET`: HTTP 200 (Login Form). `POST`: HTTP 401 Unauthorized ("Invalid player credentials"). |
| `/admin` | `GET` | Decoy Admin Trap | HTTP 403 Forbidden (triggers `+15` canary path bonus). |
| `/admin/login` | `GET`, `POST` | Decoy Admin Portal | `GET`: HTTP 200 (High-value login decoy). `POST`: HTTP 401 Unauthorized. |
| `/staff/dashboard` | `GET` | Restricted Portal | Redirects to `/login` or returns HTTP 403 Forbidden. |
| `/robots.txt` | `GET` | Web Spider Trap | HTTP 200 (Disallows `/admin/`, `/.env`, `/backup/`, `/actuator/`). |
| `/.env`, `/actuator` | `GET` | Canary Honeytokens | HTTP 403 Forbidden with empty body (triggers `+15` canary bonus). |
| `/api/v1/tournaments` | `GET`, `POST` | Mock API | `GET`: HTTP 200 JSON array. `POST`: HTTP 401 Unauthorized. |
| `/api/v1/tournaments/:id`| `GET` | Mock API Detail | HTTP 200 JSON detail or HTTP 404. |
| `/api/v1/staff` | `GET` | Mock Staff API | HTTP 200 JSON array of staff members. |

### 2.3 Middleware Execution & Safety Rules
1. **Request Body Bounding**: `express.json({ limit: '4kb' })` and `express.urlencoded({ limit: '4kb', extended: false })`. Excess payloads are rejected or truncated to prevent memory exhaustion.
2. **Detection Middleware Precedence**:
   - `detectionMiddleware` runs **before** route handlers.
   - It normalizes URL encoding, runs regex signatures, applies contextual modifiers, and scores the request.
   - If suspicious, it calls `evidenceRepo.saveEvidence(...)` asynchronously.
   - It attaches `req.securityContext` to the Express request object.
   - It calls `next()` to let the route handler generate a believable HTTP response.
3. **Zero Payload Execution**:
   - User inputs are **never** passed to `eval()`, template engines, or shell processes.
   - Form inputs (`username`, `password`) are never checked against real authentication stores or logged in plain text.
   - EJS rendering uses escaped output syntax (`<%= %>`) exclusively, preventing template injection.

---

## Consequences

### Positive
- Unit tests remain blazing fast ($< 500\text{ms}$) via `MockEvidenceRepository`.
- Integration tests thoroughly validate MongoDB queries and outbox state without polluting production databases.
- The decoy presents a rich, multi-page attack surface to engage scanners, fuzzers, and manual exploit attempts safely.
- Explicit fail-fast MongoDB connection in local development prevents hidden data loss.

### Trade-offs
- Maintaining both `MongoEvidenceRepository` and `MockEvidenceRepository` requires keeping mock behavior in sync with the repository interface.

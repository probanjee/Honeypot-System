# Operations Guide: System Troubleshooting & Diagnostics

## 1. Quick Diagnostic Checklist
When diagnosing issues in the VIGILANCE stack, follow this diagnostic sequence:
1. Is Docker Desktop engine running? (`docker ps`)
2. Are expected ports bound and conflict-free? (`netstat -ano | findstr :<port>`)
3. Can the application reach MongoDB and PostgreSQL?
4. Is Apache Kafka in KRaft mode and responding on port 9092?
5. Are consumer groups keeping up with incoming topics? (Consumer Lag)

---

## 2. Common Issues & Solutions

### 2.1 Docker Connection Refused (`//./pipe/dockerDesktopLinuxEngine`)
- **Symptoms**:
  ```
  failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
  ```
- **Cause**: Docker Desktop engine is stopped or restarting.
- **Fix**:
  1. Launch Docker Desktop from the Windows Start menu or run:
     ```powershell
     Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
     ```
  2. Wait until `docker ps` returns an empty table without error.

---

### 2.2 Port Collision (`EADDRINUSE` / Port Already Bound)
- **Symptoms**:
  ```
  Error: listen EADDRINUSE: address already in use :::3000
  ```
  or PostgreSQL container fails to bind to port `5432` because a native Windows PostgreSQL service is already running.
- **Diagnosis**:
  ```powershell
  # Check which process is holding port 5432 or 3000
  netstat -ano | findstr :5432
  netstat -ano | findstr :3000
  ```
- **Fix**:
  - If a background process holds the port:
    ```powershell
    # Kill the blocking process by PID (e.g. PID 14280)
    Stop-Process -Id 14280 -Force
    ```
  - Or stop native Windows PostgreSQL service:
    ```powershell
    Stop-Service postgresql*
    ```

---

### 2.3 Kafka KRaft Cluster ID Inconsistency
- **Symptoms**:
  ```
  kafka.common.KafkaException: The node is configured with cluster ID X, but the metadata log contains cluster ID Y
  ```
- **Cause**: The Kafka container was recreated, but old volume data persisted in `./data/kafka` with an old cluster ID.
- **Fix**:
  ```powershell
  docker compose down -v
  Remove-Item -Recurse -Force ./data/kafka
  docker compose up -d kafka
  ```

---

### 2.4 Kafka Consumer Lag & Rebalance Storms
- **Symptoms**: Ingestion Service restarts repeatedly or messages are delayed by minutes.
- **Cause**: The consumer is spending longer processing a batch of attacks (e.g., waiting for external reverse DNS or DB pool locks) than `max.poll.interval.ms` (default 300,000ms). Kafka assumes the consumer has died and triggers a group rebalance.
- **Diagnosis**:
  ```powershell
  docker exec -it vigilance-kafka kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 \
    --describe --group vigilance-ingestion-group
  ```
- **Fix**:
  - Ensure external enrichments (threat intelligence) are asynchronous and have strict 500ms HTTP timeouts.
  - Decrease `max.poll.records` from 500 to 50 so each poll loop completes in milliseconds.

---

### 2.5 MongoDB Outbox Accumulation (Pending Backlog)
- **Symptoms**: Attack payloads are stored in MongoDB, but no events appear in PostgreSQL or on the React Dashboard.
- **Diagnosis**:
  ```javascript
  // Inside mongosh
  use vigilance_evidence;
  db.raw_evidence.countDocuments({ publish_status: "PENDING" });
  ```
- **Cause**: The Outbox Reconciler worker inside the honeypot sensor cannot connect to Kafka, or is crashing silently.
- **Fix**: Check sensor logs for `[OUTBOX_ERROR]` messages. Verify Kafka connectivity with `Test-NetConnection -ComputerName localhost -Port 9092`.

---

### 2.6 Regular Expression Catastrophic Backtracking (ReDoS)
- **Symptoms**: Sensor CPU spikes to 100% when receiving a long or crafted string in request headers.
- **Cause**: A poorly formed regular expression with nested greedy quantifiers (e.g., `(a+)+$`).
- **Remediation**:
  - All VIGILANCE signatures in `configs/honeypot-rules.yaml` are verified in `scripts/verify-phase0.py`.
  - The sensor enforces payload bounds: request headers and query strings are truncated to 4,096 characters before regex evaluation:
    ```javascript
    const boundedPayload = rawPayload.slice(0, 4096);
    ```

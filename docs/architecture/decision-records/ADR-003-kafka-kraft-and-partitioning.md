# ADR-003: Apache Kafka KRaft Architecture and Partitioning Strategy

## Status
Accepted

## Context
Apache Kafka serves as the distributed event backbone for VIGILANCE. We must decide:
1. **Cluster Coordination**: Use legacy ZooKeeper or modern KRaft (Kafka Raft metadata mode)?
2. **Topic Layout and Partitioning**: What message key strategy ensures correct ordering without introducing partition hot-spotting?
3. **Consumer Groups and Offset Commits**: How to balance consumer lag with at-least-once delivery guarantees?

## Decision

### 1. KRaft Mode (Kafka Raft Metadata Mode)
We deploy Kafka using **KRaft mode** (Apache Kafka 3.7+ / Confluent Platform 7.5+), completely eliminating the Apache ZooKeeper dependency.
- **Rationale**:
  - ZooKeeper introduces an additional stateful distributed consensus daemon with separate JVM memory overhead, network ports, health checks, and failure points.
  - KRaft integrates the Raft consensus protocol directly inside the Kafka broker process (`controller.quorum.voters`).
  - Metadata changes (partition reassignments, topic creation) are committed directly to an internal Kafka log (`@metadata`), yielding orders-of-magnitude faster recovery times and simplified Docker Compose configuration.

### 2. Topic Layout and Message Key Strategy

| Topic Name | Partitions | Message Key | Keying Strategy & Ordering Rationale |
| :--- | :--- | :--- | :--- |
| `raw-attacks` | 3 | `source_ip` | Groups all attacks from a single IP into the same partition. Guarantees FIFO order per attacker IP, essential for detecting rapid progression (e.g. recon -> probe -> exploit). |
| `enriched-attacks` | 3 | `event_id` | Uniform hash distribution across partitions. Since enrichment is per-event and canonical insertion has completed, maximum parallel consumption across analytics workers is prioritized over IP-locality. |
| `alerts` | 1 | `alert_type` | Low-volume, high-priority operational notifications. Single partition preserves strict global ordering of alerts for the SOC notification dispatcher. |
| `raw-attacks-dlq` | 1 | `event_id` | Dead-letter queue for permanently malformed or poison-pill events. |

### 3. Handling Partition Hot-Spotting
Using `source_ip` as the key for `raw-attacks` risks hot-spotting if a single distributed denial of service or heavy scanning IP sends 90% of traffic.
- **Mitigation**: Sensor-level attack flood damping (ADR-002) collapses identical bursts from a single IP before publishing, ensuring no single key saturates a partition's throughput.

### 4. Consumer Offset Management
- Consumers use manual offset commits (`enable.auto.commit = false` in production consumers).
- Offsets are committed **only after** successful persistence in PostgreSQL or downstream publication.
- If processing throws an unhandled exception, the offset is not committed, allowing retry on consumer restart.

## Consequences

### Positive
- Zero ZooKeeper footprint simplifies local development and container orchestration.
- Guarantees per-source-IP causal event ordering in `raw-attacks`.
- High throughput and horizontal scalability for enriched events.

### Trade-offs
- KRaft in single-node dev mode requires formatting the storage directory with a cluster ID (`kafka-storage.sh format`) prior to startup. We automate this in our Docker startup script.

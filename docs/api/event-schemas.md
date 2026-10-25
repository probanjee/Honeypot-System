# VIGILANCE: Event Schemas & Versioning Specification

All events in VIGILANCE conform to versioned JSON envelopes adhering to **JSON Schema Draft 7** with `schema_version: "1.0.0"`.

---

## 1. Schema: `raw-attacks` Event (`schema_version: "1.0.0"`)

Emitted by: **Nowhere Esports Intranet (Sensor)**  
Kafka Topic: `raw-attacks`  
Message Key: `source_ip` (string)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RawAttackEvent",
  "type": "object",
  "required": [
    "event_id",
    "mongo_raw_id",
    "schema_version",
    "timestamp",
    "event_type",
    "source",
    "detection",
    "request"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique immutable identifier for this attack event."
    },
    "mongo_raw_id": {
      "type": "string",
      "description": "Hex string representing MongoDB ObjectId of raw evidence document."
    },
    "schema_version": {
      "type": "string",
      "enum": ["1.0.0"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "event_type": {
      "type": "string",
      "enum": ["RAW_ATTACK_DETECTED"]
    },
    "source": {
      "type": "object",
      "required": ["ip", "port"],
      "properties": {
        "ip": { "type": "string" },
        "port": { "type": "integer" }
      }
    },
    "detection": {
      "type": "object",
      "required": ["severity_score", "severity_level", "matched_rules"],
      "properties": {
        "severity_score": { "type": "integer", "minimum": 0, "maximum": 100 },
        "severity_level": { "type": "string", "enum": ["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] },
        "matched_rules": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["rule_id", "rule_name", "category", "weight"],
            "properties": {
              "rule_id": { "type": "string" },
              "rule_name": { "type": "string" },
              "category": { "type": "string" },
              "weight": { "type": "integer" }
            }
          }
        }
      }
    },
    "request": {
      "type": "object",
      "required": ["method", "path", "protocol", "headers"],
      "properties": {
        "method": { "type": "string" },
        "path": { "type": "string" },
        "protocol": { "type": "string" },
        "headers": { "type": "object" },
        "raw_payload": { "type": ["string", "null"] },
        "truncated": { "type": "boolean" }
      }
    }
  }
}
```

---

## 2. Schema: `enriched-attacks` Event (`schema_version: "1.0.0"`)

Emitted by: **Ingestion Service**  
Kafka Topic: `enriched-attacks`  
Message Key: `event_id` (string)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EnrichedAttackEvent",
  "type": "object",
  "required": [
    "event_id",
    "mongo_raw_id",
    "schema_version",
    "timestamp",
    "event_type",
    "source",
    "geo",
    "threat_intel",
    "detection",
    "request"
  ],
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "mongo_raw_id": { "type": "string" },
    "schema_version": { "type": "string", "enum": ["1.0.0"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "event_type": { "type": "string", "enum": ["ATTACK_ENRICHED"] },
    "source": {
      "type": "object",
      "properties": {
        "ip": { "type": "string" },
        "port": { "type": "integer" },
        "is_private": { "type": "boolean" }
      }
    },
    "geo": {
      "type": "object",
      "properties": {
        "country": { "type": "string" },
        "country_code": { "type": "string" },
        "city": { "type": "string" },
        "latitude": { "type": ["number", "null"] },
        "longitude": { "type": ["number", "null"] }
      }
    },
    "threat_intel": {
      "type": "object",
      "properties": {
        "provider": { "type": "string" },
        "threat_score": { "type": ["integer", "null"] },
        "is_known_attacker": { "type": "boolean" },
        "status": { "type": "string", "enum": ["ENRICHED", "CACHED", "SKIPPED_PRIVATE", "UNAVAILABLE"] }
      }
    },
    "detection": {
      "type": "object",
      "properties": {
        "severity_score": { "type": "integer" },
        "severity_level": { "type": "string" },
        "matched_rules": { "type": "array" }
      }
    },
    "request": {
      "type": "object",
      "properties": {
        "method": { "type": "string" },
        "path": { "type": "string" },
        "protocol": { "type": "string" },
        "user_agent": { "type": "string" },
        "raw_payload": { "type": ["string", "null"] }
      }
    }
  }
}
```

---

## 3. Schema: `alerts` Event (`schema_version: "1.0.0"`)

Emitted by: **Analytics Service**  
Kafka Topic: `alerts`  
Message Key: `alert_type` (string)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnomalyAlertEvent",
  "type": "object",
  "required": [
    "alert_id",
    "schema_version",
    "timestamp",
    "alert_type",
    "severity",
    "metric",
    "observed_value",
    "baseline_median",
    "mad",
    "modified_z_score",
    "threshold",
    "window_size_minutes",
    "explanation"
  ],
  "properties": {
    "alert_id": { "type": "string", "format": "uuid" },
    "schema_version": { "type": "string", "enum": ["1.0.0"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "alert_type": { "type": "string", "enum": ["TRAFFIC_VOLUME_SPIKE", "SEVERITY_SHIFT", "REPEATED_SOURCE_FLOOD"] },
    "severity": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    "metric": { "type": "string" },
    "observed_value": { "type": "number" },
    "baseline_median": { "type": "number" },
    "mad": { "type": "number" },
    "modified_z_score": { "type": "number" },
    "threshold": { "type": "number" },
    "window_size_minutes": { "type": "integer" },
    "explanation": { "type": "string" }
  }
}
```

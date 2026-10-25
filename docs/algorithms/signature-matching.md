# Algorithm Specification: Signature Matching Engine

## 1. Objective and Responsibilities
The Signature Matching Engine inspects incoming HTTP requests directed at the decoy intranet, identifies Indicators of Attack (IoAs), normalizes user-supplied encoding safely, evaluates pattern rules across bounded target locations, and produces an immutable record of matched rule signatures.

---

## 2. Request Normalization Strategy

Attackers frequently employ multi-layer encoding (e.g. URL percent-encoding, HTML entity encoding, hex escaping) to evade web application firewalls and naive pattern matchers.

### The Double-Decoding Vulnerability
A common vulnerability in naive engines is recursively decoding until strings stop changing:
`while (str !== decode(str)) str = decode(str)`
This can cause:
1. Infinite loops or CPU denial of service on crafted circular input.
2. Distortion of legitimate application logic.

### VIGILANCE Bounded Normalization Pipeline
1. **Size Bounding**: The body payload is strictly truncated to `MAX_INSPECTION_BYTES = 4096`.
2. **Deterministic URL Decoding**:
   - Apply a single controlled pass of `decodeURIComponent()`.
   - If malformed percent sequences occur (e.g. `%E0%A4%A`), catch the error and decode valid ASCII subsequences safely without throwing unhandled exceptions.
3. **Canonical Normalization for Matching**:
   - Lowercase the inspection copy for case-insensitive rules.
   - Replace null bytes (`\x00` / `%00`) with whitespace.
   - Collapse excessive whitespace sequences.
4. **Preservation of Raw Evidence**: The normalized string is used **only** for regex inspection; the original, unaltered payload is preserved separately in the MongoDB raw document.

---

## 3. Algorithm: Multi-Location Evaluation

### Target Inspection Locations
For every request $Q$, the engine extracts:
- `Q.path`: The URI path.
- `Q.query`: Key-value pairs and raw query string.
- `Q.headers`: Selected high-risk headers (`User-Agent`, `Referer`, `X-Forwarded-For`, `Cookie`).
- `Q.body`: Bounded request body string.

### Pseudocode

```python
def evaluate_request(request, rules_config):
    matched_rules = []
    
    # Pre-extract normalized inspection surfaces
    inspection_surfaces = {
        "path": normalize(request.path),
        "query": normalize(request.raw_query_string),
        "body": normalize(request.bounded_body_string),
        "headers.user-agent": normalize(request.headers.get("user-agent", "")),
        "headers.referer": normalize(request.headers.get("referer", "")),
        "headers.x-forwarded-for": normalize(request.headers.get("x-forwarded-for", ""))
    }
    
    for rule in rules_config.rules:
        if not rule.enabled:
            continue
            
        matched = False
        for location in rule.locations:
            surface_text = inspection_surfaces.get(location, "")
            if not surface_text:
                continue
                
            if rule.matching_logic.type == "regex":
                for pattern in rule.matching_logic.patterns:
                    if regex_match(pattern, surface_text):
                        matched = True
                        break
            elif rule.matching_logic.type == "custom":
                matched = execute_custom_handler(rule.matching_logic.rule_handler, request)
                
            if matched:
                break
                
        if matched:
            matched_rules.append({
                "rule_id": rule.id,
                "rule_name": rule.name,
                "category": rule.category,
                "weight": rule.severity_weight
            })
            
    return matched_rules
```

---

## 4. Complexity & ReDoS Defense

- **Time Complexity**: $O(R \cdot L \cdot N)$ where:
  - $R$ is the number of enabled rules (currently 14 baseline rules).
  - $L$ is the number of inspected locations per rule (bounded $\le 4$).
  - $N$ is the payload length (bounded $\le 4096$ characters).
  - Given small constants ($R \approx 14$, $N \le 4096$), execution completes in $< 2$ milliseconds on standard Node.js V8 runtimes.
- **Catastrophic Backtracking Prevention**:
  - All regular expressions in `configs/honeypot-rules.yaml` avoid nested quantifiers (e.g., `(a+)+` or `(.*?)*`).
  - Regular expressions use bounded tokens and character classes.

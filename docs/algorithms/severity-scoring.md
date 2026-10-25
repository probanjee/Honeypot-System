# Algorithm Specification: Severity Scoring Engine

## 1. Objective and Theoretical Model
The Severity Scoring Engine maps observed intrusion indicators, matched rule weights, and contextual request attributes into a bounded, deterministic scalar score in the interval $[0, 100]$.

### Why a Calibrated Score Matters
A raw count of matched patterns does not convey risk:
- A single high-confidence command injection payload (`/bin/bash -i`) is far more dangerous than ten repetitions of the word `'or'` in a search query.
- Probing a decoy canary route (e.g. `/.env` or `/actuator/health`) indicates purposeful adversarial reconnaissance, whereas hitting `/api/v1/tournaments` with a malformed character may be a benign typo.

---

## 2. Mathematical Definition

Let $R_{\text{matched}} = \{r_1, r_2, \dots, r_k\}$ be the set of unique rules matched during inspection.

### Base Component
$$S_{\text{base}} = \sum_{r \in R_{\text{matched}}} w_r$$
where $w_r \in [10, 50]$ is the configured weight of rule $r$.

### Contextual Modifiers Component
We compute additive context modifiers based on request characteristics:
$$M_{\text{context}} = \Delta_{\text{path}} + \Delta_{\text{scanner}} + \Delta_{\text{multivector}}$$

Where:
1. **Target Route Sensitivity Modifier ($\Delta_{\text{path}}$)**:
   $$\Delta_{\text{path}} = \begin{cases} 
   +15 & \text{if path matches high-value decoy (e.g. } /.env, /admin, /wp-config.php\text{)} \\
   0 & \text{otherwise}
   \end{cases}$$

2. **Scanner Fingerprint Modifier ($\Delta_{\text{scanner}}$)**:
   $$\Delta_{\text{scanner}} = \begin{cases} 
   +15 & \text{if User-Agent matches automated scanner tool (sqlmap, nikto, masscan, etc.)} \\
   0 & \text{otherwise}
   \end{cases}$$

3. **Multi-Vector Combination Modifier ($\Delta_{\text{multivector}}$)**:
   If an attacker blends multiple distinct exploit categories in a single request (e.g., SQL Injection and Path Traversal):
   $$\Delta_{\text{multivector}} = \begin{cases} 
   +20 & \text{if } |\text{Unique Categories in } R_{\text{matched}}| \ge 2 \\
   0 & \text{otherwise}
   \end{cases}$$

### Final Clamped Score
$$\text{Score}_{\text{raw}} = S_{\text{base}} + M_{\text{context}}$$
$$\text{Severity} = \min(100, \max(0, \text{Score}_{\text{raw}}))$$

---

## 3. Severity Categorization Thresholds

| Severity Score Range | Classification | Meaning & Recommended Response |
| :--- | :--- | :--- |
| **0 – 19** | `INFORMATIONAL` | Low-risk anomaly or benign reconnaissance probe. |
| **20 – 39** | `LOW` | Minor fuzzing or generic web scanner probe. |
| **40 – 59** | `MEDIUM` | Definite exploit attempt (e.g., standard SQLi or XSS probe). |
| **60 – 79** | `HIGH` | High-impact exploit (e.g., Remote Code Execution, Log4Shell, SSTI). |
| **80 – 100** | `CRITICAL` | Confirmed advanced attack combining multiple vectors against sensitive decoy endpoints. |

---

## 4. Test Cases & Verification Matrix

| Scenario | Matched Rules | Context | Expected Raw Score | Clamped Score | Severity Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Benign Request | None | Normal path | 0 | 0 | `INFORMATIONAL` |
| Simple SQLi | SIG-SQLI-001 ($w=35$) | Normal path | 35 | 35 | `LOW` |
| SQLi + Scanner | SIG-SQLI-001 ($w=35$), SIG-SCAN-001 ($w=25$) | User-Agent: sqlmap | $35 + 25 + 15 = 75$ | 75 | `HIGH` |
| Canary Probe | SIG-DISC-001 ($w=35$) | Path: `/.env` | $35 + 15 = 50$ | 50 | `MEDIUM` |
| Extreme Exploit | RCE ($w=45$) + SQLi ($w=45$) + Decoy ($+15$) + Multi-vec ($+20$) | Path: `/.env` | $45 + 45 + 15 + 20 = 125$ | 100 (Clamped) | `CRITICAL` |

---

## 5. Engineering Rationale: Heuristic Score vs. Exploitation Probability

### 5.1 Why Severity is Not a Mathematical Probability
A common misconception in security engineering is treating severity scores ($0 – 100$) as an estimated probability ($P \in [0, 1]$) that a system has been compromised.
1. **Severity is a Heuristic Impact/Intent Index**: The VIGILANCE score quantifies the *adversarial intent* and *potential blast radius* of the captured payload based on known threat signatures and targeted decoys.
2. **Exploitation Success Depends on Target Vulnerability**: Because VIGILANCE is a honeypot, the underlying target application does **not** execute the injected shellcode, SQL queries, or LDAP lookups. An attacker sending a `CRITICAL` (Score 100) Log4Shell payload experiences 0% execution success on our Express.js Node sensor.
3. **Calibrated Probability Requires Bayesian / Epistemic Ground Truth**: True statistical probability $P(\text{Compromised} \mid \text{Payload})$ would require knowledge of vulnerable libraries, patch status, and egress execution evidence. Here, our score serves as a deterministic prioritization metric for SOC analysts and routing engines.

### 5.2 Duplicate Pattern Matches vs. Distinct Rules
- If an HTTP request body contains the string `' OR '1'='1` five times in separate fields, the rule `SIG-SQLI-001` matches 5 times.
- **Rule Set Deduplication**: The base calculation $S_{\text{base}} = \sum_{r \in R_{\text{matched}}} w_r$ evaluates the set of *unique* rule IDs. It does **not** multiply the weight by 5. Repeated matches of the same pattern indicate fuzzer redundancy, not five distinct vulnerabilities.
- Multi-vector bonuses ($\Delta_{\text{multivector}} = +20$) require at least two *distinct attack categories* (e.g., `SQL_INJECTION` and `PATH_TRAVERSAL`), preventing single-category repetitive fuzzing from artificially escalating to `CRITICAL`.


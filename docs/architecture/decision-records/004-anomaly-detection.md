# Architecture Decision Record 004: Statistical Anomaly Detection (MAD vs. Machine Learning)

## Status
Accepted (Phase 0)

## Context
We need to detect anomalous surges in attack traffic without black-box ML models (Autoencoders, Isolation Forests) that lack interpretability, suffer cold-start issues, and fail in technical interviews or production triage.

## Decision
We select **Median Absolute Deviation (MAD)** over standard deviation z-scores and black-box ML:

$$\text{Median} = \text{median}(X)$$
$$\text{MAD} = \text{median}(|X_i - \text{Median}|)$$
$$\text{Modified Z-Score} = \frac{0.6745 \cdot (x_{\text{current}} - \text{Median})}{\text{MAD}}$$

### Key Architectural Safeguards:
1. **Outlier Resistance**: Extreme attack floods do not skew the median or inflate the variance (eliminating the masking effect).
2. **Zero-MAD Fallback**: When $> 50\%$ of time buckets have 0 events (common in quiet honeypots), the engine automatically falls back to **Mean Absolute Deviation** and **Absolute Delta Thresholds** ($\Delta \ge 10$ events/min), preventing division-by-zero crashes.
3. **Warmup Period**: The detector suppresses alerts during the initial $K < 10$ observation buckets.
4. **100% Explainability**: Every emitted alert includes median, MAD, threshold, and human-readable explanation strings.

## Related ADR
- Detailed Mathematical Proofs & JSON Alert Contracts: [ADR-005-mad-anomaly-detection-baseline.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/architecture/decision-records/ADR-005-mad-anomaly-detection-baseline.md)
- Algorithmic Specification: [mad-anomaly-detection.md](file:///c:/Users/prosu/OneDrive/Desktop/Honeypot-System/docs/algorithms/mad-anomaly-detection.md)

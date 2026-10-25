# ADR-005: Statistical Anomaly Detection via Median Absolute Deviation (MAD)

## Status
Accepted

## Context
A key objective of VIGILANCE is detecting unusual security phenomena (e.g., sudden automated scanning floods, shifts toward high-severity exploits, or coordinated attacks from single IP addresses).
Many monitoring systems jump directly to complex "black-box" machine learning algorithms (e.g., Autoencoders, Isolation Forests, LSTM neural networks). In security operations, black-box models suffer from:
1. Lack of interpretability: An analyst cannot explain *why* an alert fired.
2. Cold-start problems and model drift.
3. High computational overhead and sensitivity to outliers skewing mean/variance.

We need a mathematically rigorous, transparent, outlier-resistant baseline algorithm that runs deterministically and explains its alerts clearly.

## Mathematical Formulation

Standard z-score uses the arithmetic mean $\mu$ and standard deviation $\sigma$:
$$z = \frac{x - \mu}{\sigma}$$
However, in security telemetry, extreme attack spikes strongly distort both $\mu$ and $\sigma$, rendering standard z-scores ineffective (the "masking" effect where extreme outliers pull the mean towards themselves and inflate the variance).

### Median Absolute Deviation (MAD)
MAD is a robust non-parametric measure of statistical dispersion.

Given a sliding window of $N$ observations $X = \{x_1, x_2, \dots, x_N\}$ (e.g., attack counts in 1-minute time buckets over the last 30 minutes):

1. **Calculate the Median**:
   $$m = \text{median}(X)$$
2. **Calculate Absolute Deviations from Median**:
   $$d_i = |x_i - m| \quad \text{for } i \in \{1, \dots, N\}$$
3. **Calculate the Median of Deviations (MAD)**:
   $$\text{MAD} = \text{median}(D)$$
4. **Calculate Modified Z-Score ($M_i$)**:
   For normally distributed data, $\text{MAD} \times 1.4826 \approx \sigma$. The constant $\frac{1}{1.4826} \approx 0.6745$.
   $$M_i = \frac{0.6745 \cdot (x_{\text{current}} - m)}{\text{MAD}}$$

An anomaly is flagged when $M_i \ge \theta$, where $\theta$ is a configurable threshold (default: $\theta = 3.5$, Boris Iglewicz & David Hoaglin recommendation).

## Decision: Edge Case Handling and Fallback Strategy

### 1. Zero MAD Handling ($\text{MAD} = 0$)
In a quiet environment, more than 50% of the buckets in the window may have the exact same count (e.g., all 0 or all 1 event). When this happens, $\text{MAD} = 0$, causing a division-by-zero error if evaluated naively.
- **Decision**: When $\text{MAD} = 0$:
  1. Compute the **Mean Absolute Deviation** about the median:
     $$\text{MeanAD} = \frac{1}{N} \sum_{i=1}^{N} |x_i - m|$$
  2. If $\text{MeanAD} > 0$, substitute $\text{MeanAD}$ into the modified z-score denominator:
     $$M_i = \frac{x_{\text{current}} - m}{1.2533 \cdot \text{MeanAD}}$$
  3. If $\text{MeanAD} = 0$ (all values in window are identical, e.g. 0), use the absolute delta rule:
     $$\text{If } (x_{\text{current}} - m) \ge \text{MIN\_SPIKE\_THRESHOLD} \implies \text{Flag Anomaly}$$
     where $\text{MIN\_SPIKE\_THRESHOLD} = 10$ events/minute.

### 2. Warm-Up Period
- If the sliding window contains fewer than $K = 5$ populated buckets, the detector enters `WARMUP` status and logs telemetry without emitting high-confidence alerts.

### 3. Explainability Contract
Every generated alert payload published to Kafka topic `alerts` must satisfy the explainability contract:
```json
{
  "alert_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "alert_type": "TRAFFIC_VOLUME_SPIKE",
  "severity": "HIGH",
  "metric": "events_per_minute",
  "observed_value": 48.0,
  "baseline_median": 3.0,
  "mad": 2.0,
  "modified_z_score": 15.17,
  "threshold": 3.5,
  "window_size_minutes": 30,
  "explanation": "Observed 48.0 events/min exceeds 30-min window median of 3.0 (MAD=2.0, modified z-score=15.17 >= threshold 3.5)"
}
```

## Consequences
- 100% auditable and explainable in a SOC environment or interview.
- Robust against outlier contamination.
- Fast evaluation ($O(N \log N)$ where $N \le 60$ buckets, requiring $< 1$ millisecond compute time per tick).

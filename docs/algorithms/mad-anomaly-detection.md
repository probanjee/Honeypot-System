# Algorithm Specification: Median Absolute Deviation (MAD) Anomaly Detector

## 1. Mathematical Formulation

Let $W$ be a chronological sliding time window comprising $N$ discrete 1-minute time buckets:
$$X = \{x_1, x_2, \dots, x_N\}$$
where $x_i \in \mathbb{N}_0$ represents the number of attack events recorded in the $i$-th minute.

### Step 1: Compute Window Median ($m$)
Sort $X$ in ascending order: $X_{(1)} \le X_{(2)} \le \dots \le X_{(N)}$.
$$m = \begin{cases} 
X_{(\frac{N+1}{2})} & \text{if } N \text{ is odd} \\
\frac{X_{(\frac{N}{2})} + X_{(\frac{N}{2} + 1)}}{2} & \text{if } N \text{ is even}
\end{cases}$$

### Step 2: Compute Absolute Deviations
Compute absolute difference of each bucket from the median:
$$d_i = |x_i - m| \quad \forall i \in \{1, \dots, N\}$$
Let $D = \{d_1, d_2, \dots, d_N\}$.

### Step 3: Compute Median Absolute Deviation ($\text{MAD}$)
Sort $D$ in ascending order and compute its median:
$$\text{MAD} = \text{median}(D)$$

### Step 4: Compute Robust Modified Z-Score
For a new observation $x_{\text{current}}$ (the event volume in the current minute):
$$M_i = \frac{0.6745 \cdot (x_{\text{current}} - m)}{\text{MAD}}$$
*Note*: The factor $0.6745$ derives from the inverse of the 75th percentile of the standard normal distribution ($\Phi^{-1}(0.75) \approx 0.6744898$). For normally distributed data, $\text{MAD} / 0.6745 \approx \sigma$.

---

## 2. Comprehensive Fallback Strategy

```mermaid
graph TD
    Start[New Observation: x_current] --> CheckWarmup{Window Size N >= MIN_OBSERVATIONS?}
    CheckWarmup -- No --> StatusWarmup[Status: WARMUP\nLog Metric Only, No Alert]
    CheckWarmup -- Yes --> CalcMedian[Calculate Median m and MAD]
    CalcMedian --> CheckMAD{Is MAD > 0?}
    
    CheckMAD -- Yes --> CalcZ[Compute Modified Z-score:\n M = 0.6745 * x_current - m / MAD]
    CalcZ --> CheckZ{Is M >= 3.5?}
    CheckZ -- Yes --> EmitAlert[Emit TRAFFIC_VOLUME_SPIKE Alert]
    CheckZ -- No --> Normal[Normal Baseline State]
    
    CheckMAD -- No --> CalcMeanAD[Calculate Mean Absolute Deviation:\n MeanAD = sum|x_i - m| / N]
    CalcMeanAD --> CheckMeanAD{Is MeanAD > 0?}
    CheckMeanAD -- Yes --> CalcAltZ[Compute Alt Z-score:\n M = x_current - m / 1.2533 * MeanAD]
    CalcAltZ --> CheckAltZ{Is M >= 3.5?}
    CheckAltZ -- Yes --> EmitAlert
    CheckAltZ -- No --> Normal
    
    CheckMeanAD -- No --> CheckDelta{Is x_current - m >= MIN_SPIKE_THRESHOLD?}
    CheckDelta -- Yes --> EmitAlert
    CheckDelta -- No --> Normal
```

---

## 3. Computational Complexity & Edge Cases

| Dimension | Property | Explanation |
| :--- | :--- | :--- |
| **Time Complexity** | $O(N \log N)$ | Dominated by sorting array of length $N$. With $N=30$ or $N=60$ buckets, sorting 30 numbers takes $< 0.05$ milliseconds in Python. |
| **Space Complexity** | $O(N)$ | Fixed ring buffer holding $N$ integers in memory. |
| **Cold Start / Warmup** | Handled | If $N < 10$, alert emission is suppressed to prevent spurious alerts before baseline stabilization. |
| **Uniform Zero Windows** | Handled | In zero-activity honeypots, $MAD = 0$ is guaranteed. Handled via MeanAD and absolute spike delta threshold ($\Delta \ge 10$). |
| **Gradual Trend Drift** | Handled | Sliding window naturally updates $m$ over time, preventing permanent drift from triggering endless false alerts. |

---

## 4. Step-by-Step Worked Numerical Example

Consider a rolling window $X$ containing $N = 15$ one-minute observation buckets:
$$X = [2, 3, 2, 4, 3, 2, 3, 4, 3, 2, 3, 3, 2, 4, 3]$$

### Step 1: Calculate Median ($m$)
1. Sort the observations in ascending order:
   $$X_{\text{sorted}} = [2, 2, 2, 2, 2, 3, 3, \mathbf{3}, 3, 3, 3, 4, 4, 4, 4]$$
2. Since $N = 15$ is odd, the median is the value at index $\frac{15+1}{2} = 8$:
   $$m = 3$$

### Step 2: Compute Absolute Deviations ($D$)
Subtract $m = 3$ from each element in $X$ and take the absolute value:
$$d_i = |x_i - 3|$$
$$D = [|2-3|, |3-3|, |2-3|, |4-3|, \dots] = [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0]$$

### Step 3: Compute Median Absolute Deviation ($\text{MAD}$)
1. Sort the deviations in ascending order:
   $$D_{\text{sorted}} = [0, 0, 0, 0, 0, 0, 0, \mathbf{1}, 1, 1, 1, 1, 1, 1, 1]$$
2. The median of $D$ at position 8 is:
   $$\text{MAD} = 1$$

---

### Scenario A: Normal Traffic Observation ($x_{\text{current}} = 4$)
Evaluate if observing 4 events in the current minute is an anomaly:
$$M_{\text{normal}} = \frac{0.6745 \cdot (4 - 3)}{1} = \frac{0.6745 \cdot 1}{1} = 0.6745$$
- Test against threshold $\theta = 3.5$:
  $$0.6745 < 3.5 \implies \mathbf{NO\ ANOMALY\ (Normal\ Traffic)}$$

---

### Scenario B: Sudden Attack Spike ($x_{\text{current}} = 45$)
An automated directory-fuzzing scanner attacks, producing 45 events in the current minute:
$$M_{\text{spike}} = \frac{0.6745 \cdot (45 - 3)}{1} = \frac{0.6745 \cdot 42}{1} = 28.329$$
- Test against threshold $\theta = 3.5$:
  $$28.329 \ge 3.5 \implies \mathbf{ANOMALY\ DETECTED\ (High\ Confidence\ Volume\ Spike)}$$

---

### Scenario C: Quiet Honeypot Zero-MAD Fallback
Suppose the honeypot was idle for 15 minutes: $X = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]$.
1. Median $m = 0$.
2. All deviations $d_i = |0 - 0| = 0$, so $\mathbf{\text{MAD} = 0}$.
3. Direct division by $\text{MAD}$ would cause a fatal `ZeroDivisionError`.
4. **Fallback Execution**:
   - Compute $\text{MeanAD} = \frac{1}{15} \sum 0 = 0$.
   - Since $\text{MeanAD} = 0$, activate **Absolute Delta Fallback**:
     $$\text{Delta} = (x_{\text{current}} - m) = 15 - 0 = 15$$
   - Since $\text{Delta} = 15 \ge \text{MIN\_SPIKE\_THRESHOLD} (10)$, the engine successfully flags the surge without crashing!


"""
MAD Statistical Anomaly Detector (Phase 6)
Implements sliding-window Median Absolute Deviation (MAD) with zero-MAD fallbacks
and explainable alert generation per ADR-005 and docs/algorithms/mad-anomaly-detection.md.
"""

from collections import deque
from datetime import datetime, timezone
import math
import statistics
from typing import Optional, List, Tuple
from uuid import uuid4

from .config import settings
from .schemas import AnomalyAlertEvent


class MADResult:
    """Encapsulates the statistical computation results of a window evaluation."""
    def __init__(
        self,
        is_anomaly: bool,
        is_warmup: bool,
        observed_value: float,
        baseline_median: float,
        mad: float,
        modified_z_score: float,
        fallback_used: Optional[str] = None,
        explanation: str = ""
    ):
        self.is_anomaly = is_anomaly
        self.is_warmup = is_warmup
        self.observed_value = observed_value
        self.baseline_median = baseline_median
        self.mad = mad
        self.modified_z_score = modified_z_score
        self.fallback_used = fallback_used
        self.explanation = explanation


class MADAnomalyDetector:
    """
    Sliding-window MAD Anomaly Detector for honeypot traffic volume spikes.
    Outlier-resistant, deterministic, and 100% explainable.
    """
    def __init__(
        self,
        window_size_minutes: int = settings.window_size_minutes,
        z_score_threshold: float = settings.z_score_threshold,
        min_observations: int = settings.min_observations,
        min_spike_threshold: int = settings.min_spike_threshold,
    ):
        self.window_size_minutes = window_size_minutes
        self.z_score_threshold = z_score_threshold
        self.min_observations = min_observations
        self.min_spike_threshold = min_spike_threshold

        # Historical completed 1-minute bucket counts: deque(maxlen=window_size_minutes)
        self.window: deque[int] = deque(maxlen=window_size_minutes)

        # Current in-progress bucket
        self.current_bucket_epoch_minute: Optional[int] = None
        self.current_bucket_count: int = 0

    def add_event(self, event_time: Optional[datetime] = None) -> Optional[AnomalyAlertEvent]:
        """
        Records an attack event at timestamp `event_time`.
        Maintains chronological 1-minute buckets, rotating into the sliding window as minutes advance.
        Returns an AnomalyAlertEvent if the observation triggers a volume spike anomaly.
        """
        now = event_time or datetime.now(timezone.utc)
        epoch_minute = int(now.timestamp() // 60)

        # First event recorded
        if self.current_bucket_epoch_minute is None:
            self.current_bucket_epoch_minute = epoch_minute
            self.current_bucket_count = 1
            return None

        # Same 1-minute bucket
        if epoch_minute == self.current_bucket_epoch_minute:
            self.current_bucket_count += 1
            # Check for intra-minute burst spike against current baseline
            return self.evaluate_observation(self.current_bucket_count, now)

        # Minute has rolled over (or jumped forward during quiet period)
        elapsed_minutes = epoch_minute - self.current_bucket_epoch_minute

        # Push completed bucket into window
        self.window.append(self.current_bucket_count)

        # If more than 1 minute passed without traffic, fill intermediate buckets with 0
        gap_buckets = min(self.window_size_minutes, max(0, elapsed_minutes - 1))
        for _ in range(gap_buckets):
            self.window.append(0)

        # Start new bucket
        self.current_bucket_epoch_minute = epoch_minute
        self.current_bucket_count = 1

        return self.evaluate_observation(self.current_bucket_count, now)

    def evaluate_observation(
        self,
        x_current: int,
        timestamp: Optional[datetime] = None
    ) -> Optional[AnomalyAlertEvent]:
        """
        Evaluates a candidate observation against the current sliding window.
        """
        result = self.calculate_mad(list(self.window), x_current)

        if not result.is_anomaly or result.is_warmup:
            return None

        # Severity categorization based on relative deviation magnitude
        if result.modified_z_score >= 10.0 or (x_current - result.baseline_median) >= 30:
            severity = "CRITICAL"
        elif result.modified_z_score >= 6.0 or (x_current - result.baseline_median) >= 20:
            severity = "HIGH"
        else:
            severity = "MEDIUM"

        return AnomalyAlertEvent(
            alert_id=uuid4(),
            timestamp=timestamp or datetime.now(timezone.utc),
            alert_type="TRAFFIC_VOLUME_SPIKE",
            severity=severity,
            metric="events_per_minute",
            observed_value=float(x_current),
            baseline_median=round(result.baseline_median, 2),
            mad=round(result.mad, 2),
            modified_z_score=round(min(999.0, result.modified_z_score), 2),
            threshold=self.z_score_threshold,
            window_size_minutes=self.window_size_minutes,
            explanation=result.explanation
        )

    def calculate_mad(self, window_data: List[int], x_current: int) -> MADResult:
        """
        Core mathematical MAD calculation with full fallback logic per ADR-005.
        Pure function for transparent testing and verification.
        """
        n = len(window_data)

        # Check Warmup period
        if n < self.min_observations:
            return MADResult(
                is_anomaly=False,
                is_warmup=True,
                observed_value=float(x_current),
                baseline_median=float(statistics.median(window_data)) if n > 0 else 0.0,
                mad=0.0,
                modified_z_score=0.0,
                explanation=f"Window in WARMUP ({n}/{self.min_observations} minimum observations required)"
            )

        # Step 1: Compute window median (m)
        m = float(statistics.median(window_data))

        # Step 2: Compute absolute deviations |x_i - m|
        deviations = [abs(float(x) - m) for x in window_data]

        # Step 3: Compute Median Absolute Deviation (MAD)
        mad = float(statistics.median(deviations))

        # Only evaluate positive spikes (x_current > m) for security traffic floods
        if x_current <= m:
            return MADResult(
                is_anomaly=False,
                is_warmup=False,
                observed_value=float(x_current),
                baseline_median=m,
                mad=mad,
                modified_z_score=0.0,
                explanation=f"Traffic volume {x_current} <= baseline median {m}"
            )

        # Step 4: Standard MAD evaluation when MAD > 0
        if mad > 0:
            # Boris Iglewicz & David Hoaglin modified z-score factor
            z_score = (0.6745 * (x_current - m)) / mad
            is_anomaly = z_score >= self.z_score_threshold
            explanation = (
                f"Observed {x_current} events/min exceeds {n}-min window median of {m:.1f} "
                f"(MAD={mad:.2f}, modified z-score={z_score:.2f} >= threshold {self.z_score_threshold})"
                if is_anomaly else
                f"Observed {x_current} events/min within normal tolerance (z-score {z_score:.2f} < {self.z_score_threshold})"
            )
            return MADResult(
                is_anomaly=is_anomaly,
                is_warmup=False,
                observed_value=float(x_current),
                baseline_median=m,
                mad=mad,
                modified_z_score=z_score,
                fallback_used=None,
                explanation=explanation
            )

        # ── Fallback 1: Mean Absolute Deviation (MeanAD) ──────────────────────
        mean_ad = sum(deviations) / float(n)
        if mean_ad > 0:
            # Alt Z-score using MeanAD (1.2533 * MeanAD approximates sigma for normal distribution)
            z_score = (x_current - m) / (1.2533 * mean_ad)
            is_anomaly = z_score >= self.z_score_threshold
            explanation = (
                f"Observed {x_current} events/min exceeds uniform baseline median of {m:.1f} "
                f"[MAD=0 fallback: MeanAD={mean_ad:.2f}, alt z-score={z_score:.2f} >= threshold {self.z_score_threshold}]"
                if is_anomaly else
                f"Observed {x_current} events/min within MeanAD baseline (z-score {z_score:.2f} < {self.z_score_threshold})"
            )
            return MADResult(
                is_anomaly=is_anomaly,
                is_warmup=False,
                observed_value=float(x_current),
                baseline_median=m,
                mad=0.0,
                modified_z_score=z_score,
                fallback_used="MeanAD",
                explanation=explanation
            )

        # ── Fallback 2: Absolute Delta Threshold ──────────────────────────────
        # When all window buckets are identical (e.g. all 0), MAD = MeanAD = 0
        delta = x_current - m
        is_anomaly = delta >= self.min_spike_threshold
        z_score = 99.0 if is_anomaly else 0.0
        explanation = (
            f"Observed {x_current} events/min exceeds idle honeypot baseline of {m:.1f} "
            f"[Absolute delta={delta:.0f} >= threshold {self.min_spike_threshold}]"
            if is_anomaly else
            f"Observed {x_current} events/min below minimum spike delta threshold ({delta:.0f} < {self.min_spike_threshold})"
        )
        return MADResult(
            is_anomaly=is_anomaly,
            is_warmup=False,
            observed_value=float(x_current),
            baseline_median=m,
            mad=0.0,
            modified_z_score=z_score,
            fallback_used="DeltaThreshold",
            explanation=explanation
        )


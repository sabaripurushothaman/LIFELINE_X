"""
Survivor Candidate Confidence and Rescue Priority Scorer

SURVIVOR CANDIDATE CONFIDENCE:
    Weighted combination of evidence signals.
    Does NOT claim to represent probability of being alive.

RESCUE PRIORITY:
    CRITICAL / HIGH / VERIFY
    Based on candidate confidence + evidence quality + freshness + conflict status.
    This is NOT medical triage. It is rescue resource allocation priority.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


# Weights for survivor candidate confidence
W_DETECTION = 0.30
W_TRACK = 0.20
W_MOVEMENT = 0.15
W_THERMAL = 0.15
W_TELEMETRY = 0.10
W_GEOLOCATION = 0.10


@dataclass
class SurvivorScore:
    track_id: str
    survivor_candidate_confidence: float   # 0.0 – 1.0
    rescue_priority: str                   # CRITICAL / HIGH / VERIFY
    priority_reason: str
    score_breakdown: dict
    evidence_conflict: bool
    evidence_quality: str

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "survivor_candidate_confidence": round(self.survivor_candidate_confidence, 4),
            "survivor_candidate_confidence_pct": f"{self.survivor_candidate_confidence:.1%}",
            "rescue_priority": self.rescue_priority,
            "priority_reason": self.priority_reason,
            "score_breakdown": self.score_breakdown,
            "evidence_conflict": self.evidence_conflict,
            "evidence_quality": self.evidence_quality,
        }


def _track_persistence_score(frame_count: int) -> float:
    """Sigmoid-ish score: max at ~30 frames."""
    if frame_count <= 0:
        return 0.0
    if frame_count >= 30:
        return 1.0
    return min(1.0, frame_count / 20.0)


def _movement_score(movement_state: str) -> float:
    """Score for movement evidence (not quality of life judgement)."""
    return {
        "MOVING": 0.90,
        "LOW MOVEMENT": 0.75,
        "STATIONARY": 0.60,    # presence still valuable
        "OCCLUDED": 0.40,
        "UNKNOWN": 0.30,
    }.get(movement_state, 0.30)


def compute_survivor_score(
    track_id: str,
    detection_confidence: float,      # 0-1
    frame_count: int,
    movement_state: str,
    thermal_available: bool,
    thermal_confidence: Optional[float],
    telemetry_available: bool,
    telemetry_quality: str,
    geolocation_confidence: Optional[float],
    evidence_quality: str,
    evidence_conflict: bool,
    frames_since_seen: int = 0,
) -> SurvivorScore:
    """
    Compute survivor candidate confidence and rescue priority.

    All inputs are weighted. The result is advisory.
    """

    # --- Component scores ---
    det_score = detection_confidence

    track_score = _track_persistence_score(frame_count)

    move_score = _movement_score(movement_state)

    if thermal_available and thermal_confidence is not None:
        therm_score = thermal_confidence
    else:
        # Thermal unavailable: neutral contribution (don't penalize absence)
        therm_score = None

    tele_score = 0.85 if (telemetry_available and telemetry_quality == "SYNCED") else \
                 0.60 if (telemetry_available and telemetry_quality == "APPROXIMATE") else \
                 0.30

    geo_score = geolocation_confidence if geolocation_confidence is not None else 0.30

    # --- Weighted sum ---
    if therm_score is not None:
        # Full weighting
        raw_score = (
            W_DETECTION * det_score +
            W_TRACK * track_score +
            W_MOVEMENT * move_score +
            W_THERMAL * therm_score +
            W_TELEMETRY * tele_score +
            W_GEOLOCATION * geo_score
        )
    else:
        # Redistribute thermal weight across other signals
        w_adj = 1.0 / (1.0 - W_THERMAL)
        raw_score = w_adj * (
            W_DETECTION * det_score +
            W_TRACK * track_score +
            W_MOVEMENT * move_score +
            W_TELEMETRY * tele_score +
            W_GEOLOCATION * geo_score
        )

    # Penalize for staleness
    freshness_penalty = min(0.20, frames_since_seen * 0.005)
    raw_score = max(0.0, raw_score - freshness_penalty)

    # Penalize for evidence conflict
    if evidence_conflict:
        raw_score *= 0.90

    confidence = min(1.0, max(0.0, raw_score))

    # --- Rescue Priority ---
    if confidence >= 0.80 and evidence_quality in ("HIGH", "MEDIUM") and not evidence_conflict:
        priority = "CRITICAL"
        reason = _build_reason(priority, confidence, movement_state, evidence_quality, evidence_conflict, frame_count)
    elif confidence >= 0.60:
        priority = "HIGH"
        reason = _build_reason(priority, confidence, movement_state, evidence_quality, evidence_conflict, frame_count)
    else:
        priority = "VERIFY"
        reason = _build_reason(priority, confidence, movement_state, evidence_quality, evidence_conflict, frame_count)

    breakdown = {
        "detection_confidence": round(det_score, 4),
        "track_persistence": round(track_score, 4),
        "movement_score": round(move_score, 4),
        "thermal_score": round(therm_score, 4) if therm_score is not None else "NOT AVAILABLE",
        "telemetry_score": round(tele_score, 4),
        "geolocation_score": round(geo_score, 4),
        "freshness_penalty": round(freshness_penalty, 4),
        "conflict_applied": evidence_conflict,
    }

    return SurvivorScore(
        track_id=track_id,
        survivor_candidate_confidence=confidence,
        rescue_priority=priority,
        priority_reason=reason,
        score_breakdown=breakdown,
        evidence_conflict=evidence_conflict,
        evidence_quality=evidence_quality,
    )


def _build_reason(
    priority: str,
    confidence: float,
    movement_state: str,
    evidence_quality: str,
    evidence_conflict: bool,
    frame_count: int,
) -> str:
    reasons = []
    reasons.append(f"Candidate confidence: {confidence:.1%}")
    reasons.append(f"Track persistence: {frame_count} frames")
    reasons.append(f"Movement: {movement_state}")
    reasons.append(f"Evidence quality: {evidence_quality}")
    if evidence_conflict:
        reasons.append("EVIDENCE CONFLICT detected — HUMAN REVIEW REQUIRED")
    return "; ".join(reasons)

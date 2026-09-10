"""
Survivor Candidate Routes
GET  /api/survivors               — list all person candidates across analyses
GET  /api/survivors/{track_id}    — get single candidate with evidence explanation
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database.store import get_store

router = APIRouter(prefix="/api/survivors", tags=["survivors"])


@router.get("")
async def list_survivors(analysis_id: str = None, priority: str = None):
    """
    List all survivor candidates.
    Optional filters: ?analysis_id=A-XXX &priority=CRITICAL
    """
    store = get_store()

    if analysis_id:
        candidates = store.get_survivor_candidates(analysis_id)
    else:
        candidates = store.get_all_analyses_candidates()

    if priority:
        candidates = [c for c in candidates if c.get("rescue_priority") == priority.upper()]

    # Only person candidates (not animals)
    person_candidates = [c for c in candidates if not c.get("track_id", "").startswith("AN-")]

    return {
        "count": len(person_candidates),
        "candidates": person_candidates,
        "critical_count": sum(1 for c in person_candidates if c.get("rescue_priority") == "CRITICAL"),
        "high_count": sum(1 for c in person_candidates if c.get("rescue_priority") == "HIGH"),
        "verify_count": sum(1 for c in person_candidates if c.get("rescue_priority") == "VERIFY"),
    }


@router.get("/{track_id}")
async def get_survivor(track_id: str):
    """
    Get a single survivor candidate with full details.
    This powers the 'WHY DID AI FLAG THIS?' feature.
    """
    store = get_store()
    candidate = store.get_survivor_candidate(track_id)

    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {track_id}")

    return {
        "track_id": track_id,
        "candidate": candidate,
        "ai_flag_explanation": _build_explanation(candidate),
        "human_review_required": candidate.get("evidence_conflict", False) or
                                   candidate.get("human_review_status") == "PENDING",
        "human_decision": candidate.get("human_decision"),
        "human_review_status": candidate.get("human_review_status", "PENDING"),
    }


def _build_explanation(candidate: dict) -> dict:
    """
    Build the 'WHY DID AI FLAG THIS?' explanation from stored evidence.
    This is generated from actual stored data, not hardcoded.
    """
    breakdown = candidate.get("score_breakdown", {})
    return {
        "title": f"WHY DID AI FLAG {candidate.get('track_id', 'UNKNOWN')}?",
        "summary": (
            f"Person candidate detected with {candidate.get('survivor_candidate_confidence', 0):.1%} confidence. "
            f"Rescue priority: {candidate.get('rescue_priority', 'UNKNOWN')}."
        ),
        "signals": [
            {
                "label": "Detection Confidence",
                "value": f"{candidate.get('detection_confidence', 0):.1%}",
                "raw": breakdown.get("detection_confidence"),
                "available": True,
            },
            {
                "label": "Track Persistence",
                "value": f"{candidate.get('frame_count', 0)} frames",
                "raw": breakdown.get("track_persistence"),
                "available": True,
            },
            {
                "label": "Movement State",
                "value": candidate.get("movement_state", "UNKNOWN"),
                "raw": breakdown.get("movement_score"),
                "available": candidate.get("movement_state") not in ("UNKNOWN", None),
            },
            {
                "label": "Thermal Evidence",
                "value": "NOT AVAILABLE",
                "raw": None,
                "available": False,
                "note": "No thermal video provided",
            },
            {
                "label": "Telemetry Sync",
                "value": "SYNCED" if breakdown.get("telemetry_score", 0) > 0.7 else "NOT AVAILABLE",
                "raw": breakdown.get("telemetry_score"),
                "available": breakdown.get("telemetry_score", 0) > 0.5,
            },
            {
                "label": "Location Confidence",
                "value": (
                    f"{candidate['geolocation_method']}: {candidate.get('uncertainty_m', 0):.0f}m uncertainty"
                    if candidate.get("latitude")
                    else "GEOLOCATION: NOT AVAILABLE"
                ),
                "raw": breakdown.get("geolocation_score"),
                "available": candidate.get("latitude") is not None,
            },
        ],
        "survivor_candidate_confidence": candidate.get("survivor_candidate_confidence", 0),
        "rescue_priority": candidate.get("rescue_priority", "VERIFY"),
        "evidence_quality": candidate.get("evidence_quality", "UNKNOWN"),
        "evidence_conflict": candidate.get("evidence_conflict", False),
        "conflict_note": (
            "EVIDENCE CONFLICT detected — signals disagree. HUMAN REVIEW REQUIRED."
            if candidate.get("evidence_conflict")
            else None
        ),
        "priority_reason": candidate.get("priority_reason", ""),
        "safety_note": (
            "AI outputs are advisory. This system does NOT confirm survival or death. "
            "RESCUE PRIORITY requires human operator verification."
        ),
    }

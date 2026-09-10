"""
Map Data Routes
GET /api/map/{analysis_id}  — structured map data for MapLibre frontend
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database.store import get_store

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/{analysis_id}")
async def get_map_data(analysis_id: str):
    """
    Return map-ready data for an analysis:
    - Survivor candidate markers with priority/confidence/uncertainty
    - Drone position (from telemetry if available)
    - Search area (from analysis metadata if available)
    """
    store = get_store()
    analysis = store.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis not found: {analysis_id}")

    candidates = store.get_survivor_candidates(analysis_id)
    person_candidates = [c for c in candidates if not c.get("track_id", "").startswith("AN-")]

    # Build GeoJSON-compatible markers
    markers = []
    for c in person_candidates:
        marker = {
            "track_id": c["track_id"],
            "rescue_priority": c.get("rescue_priority", "VERIFY"),
            "survivor_confidence": c.get("survivor_confidence", 0),
            "detection_confidence": c.get("detection_confidence", 0),
            "movement_state": c.get("movement_state", "UNKNOWN"),
            "evidence_quality": c.get("evidence_quality", "UNKNOWN"),
            "evidence_conflict": c.get("evidence_conflict", False),
            "human_review_status": c.get("human_review_status", "PENDING"),
            "human_decision": c.get("human_decision"),
        }

        if c.get("latitude") is not None:
            marker["latitude"] = c["latitude"]
            marker["longitude"] = c["longitude"]
            marker["uncertainty_radius_m"] = c.get("uncertainty_m", 20)
            marker["geolocation_available"] = True
            marker["geolocation_method"] = c.get("geolocation_method", "FLAT_GROUND_APPROXIMATION")
        else:
            marker["geolocation_available"] = False
            marker["geolocation_note"] = "GEOLOCATION: NOT AVAILABLE"

        markers.append(marker)

    return {
        "analysis_id": analysis_id,
        "incident_id": analysis.get("incident_id"),
        "status": analysis.get("status"),
        "markers": markers,
        "geolocated_count": sum(1 for m in markers if m.get("geolocation_available")),
        "total_count": len(markers),
        "telemetry_available": False,  # Would be set from actual telemetry data
        "search_area": None,           # Would be computed from flight path
        "safety_note": "AI-generated candidate positions. Uncertainty circles shown. Human verification required.",
    }

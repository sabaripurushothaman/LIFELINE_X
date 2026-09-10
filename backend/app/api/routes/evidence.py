"""
Evidence Chain Routes
GET /api/evidence/{track_id}?analysis_id=...
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.database.store import get_store

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.get("/{track_id}")
async def get_evidence_chain(track_id: str, analysis_id: str = Query(default=None)):
    """Get the complete evidence chain for a track."""
    store = get_store()

    if analysis_id:
        evidence = store.get_evidence(analysis_id, track_id)
    else:
        # Try to find from all analyses
        analyses = store.list_analyses()
        evidence = None
        for a in analyses:
            ev = store.get_evidence(a["id"], track_id)
            if ev:
                evidence = ev
                analysis_id = a["id"]
                break

    if not evidence:
        raise HTTPException(status_code=404, detail=f"No evidence found for track: {track_id}")

    # Get candidate for cross-reference
    candidate = store.get_survivor_candidate(track_id)

    items = evidence.get("items", [])
    available_count = sum(1 for i in items if i.get("available"))
    total_count = len(items)

    return {
        "track_id": track_id,
        "analysis_id": analysis_id,
        "evidence_items": items,
        "available_count": available_count,
        "total_count": total_count,
        "evidence_summary": f"{available_count}/{total_count}",
        "has_conflict": candidate.get("evidence_conflict", False) if candidate else False,
        "conflict_description": None,  # Would be stored in full impl
        "overall_quality": candidate.get("evidence_quality", "UNKNOWN") if candidate else "UNKNOWN",
        "human_review_required": candidate.get("evidence_conflict", False) if candidate else False,
    }

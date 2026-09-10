"""
Human Review Routes
POST /api/reviews   — submit operator decision on a candidate
GET  /api/reviews   — list all reviews
"""
from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database.store import get_store

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

VALID_DECISIONS = {
    "CONFIRM_SURVIVOR",
    "MARK_FALSE_POSITIVE",
    "REQUEST_MORE_IMAGERY",
    "FLAG_FOR_REVIEW",
}


class ReviewRequest(BaseModel):
    analysis_id: str
    track_id: str
    decision: str
    notes: Optional[str] = ""
    reviewed_by: Optional[str] = "OPERATOR"


@router.post("")
async def submit_review(req: ReviewRequest):
    """
    Submit a human review decision for a candidate.
    AI recommendations and human decisions are stored separately.
    AI cannot override human decisions.
    """
    if req.decision not in VALID_DECISIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision: '{req.decision}'. Valid: {sorted(VALID_DECISIONS)}",
        )

    store = get_store()
    candidate = store.get_survivor_candidate(req.track_id)

    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {req.track_id}")

    success = store.save_review(
        analysis_id=req.analysis_id,
        track_id=req.track_id,
        decision=req.decision,
        notes=req.notes or "",
        reviewed_by=req.reviewed_by or "OPERATOR",
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save review")

    return {
        "success": True,
        "track_id": req.track_id,
        "decision": req.decision,
        "reviewed_by": req.reviewed_by,
        "reviewed_at": time.time(),
        "ai_recommendation": candidate.get("rescue_priority"),
        "human_decision": req.decision,
        "note": "AI recommendation and human decision are recorded separately. AI cannot override human decisions.",
    }


@router.get("")
async def list_reviews(analysis_id: str = None):
    """List all human review decisions."""
    store = get_store()
    candidates = store.get_all_analyses_candidates()
    reviewed = [c for c in candidates if c.get("human_decision")]

    if analysis_id:
        reviewed = [c for c in reviewed if c.get("analysis_id") == analysis_id]

    return {
        "count": len(reviewed),
        "reviews": [
            {
                "track_id": c["track_id"],
                "analysis_id": c.get("analysis_id"),
                "ai_recommendation": c.get("rescue_priority"),
                "human_decision": c.get("human_decision"),
                "reviewed_at": c.get("reviewed_at"),
                "human_review_status": c.get("human_review_status"),
            }
            for c in reviewed
        ],
    }

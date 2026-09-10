"""
Evaluation Routes
GET /api/evaluation

Shows metrics — only for actually measured values.
Unmeasured metrics show NOT MEASURED.
"""
from __future__ import annotations

import time

from fastapi import APIRouter

from app.database.store import get_store

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


@router.get("")
async def get_evaluation():
    """
    Return evaluation metrics.
    Only shows genuinely measured values.
    Unmeasured metrics are explicitly labelled NOT MEASURED.
    """
    store = get_store()
    all_candidates = store.get_all_analyses_candidates()
    all_analyses = store.list_analyses()

    # Metrics we can actually compute from stored data
    total_candidates = len([c for c in all_candidates if not c.get("track_id", "").startswith("AN-")])
    reviews = [c for c in all_candidates if c.get("human_decision")]
    confirmed = [r for r in reviews if r.get("human_decision") == "CONFIRM_SURVIVOR"]
    false_positives = [r for r in reviews if r.get("human_decision") == "MARK_FALSE_POSITIVE"]

    # Precision (if any reviews done)
    if len(reviews) > 0:
        precision = len(confirmed) / len(reviews)
        precision_note = f"Based on {len(reviews)} human-reviewed candidates"
    else:
        precision = None
        precision_note = "NOT MEASURED — no human reviews completed"

    return {
        "system": "LIFELINE-X",
        "evaluation_timestamp": time.time(),
        "metrics": [
            {
                "name": "Total Person Candidates",
                "value": total_candidates,
                "unit": "candidates",
                "measured": True,
                "note": "Across all analyses",
            },
            {
                "name": "Human Reviews Completed",
                "value": len(reviews),
                "unit": "reviews",
                "measured": True,
                "note": "Operator decisions submitted",
            },
            {
                "name": "Confirmed Survivors",
                "value": len(confirmed),
                "unit": "candidates",
                "measured": True,
                "note": "Operator-confirmed",
            },
            {
                "name": "False Positives (Operator Marked)",
                "value": len(false_positives),
                "unit": "candidates",
                "measured": len(false_positives) > 0,
                "note": "Operator-marked false positives",
            },
            {
                "name": "Precision",
                "value": f"{precision:.1%}" if precision is not None else "NOT MEASURED",
                "unit": "ratio",
                "measured": precision is not None,
                "note": precision_note,
            },
            {
                "name": "Recall",
                "value": "NOT MEASURED",
                "unit": "ratio",
                "measured": False,
                "note": "NOT MEASURED — requires ground truth survivor count",
            },
            {
                "name": "False Positives per Minute",
                "value": "NOT MEASURED",
                "unit": "per minute",
                "measured": False,
                "note": "NOT MEASURED — requires continuous operation data",
            },
            {
                "name": "Track Continuity (IDF1)",
                "value": "NOT MEASURED",
                "unit": "score",
                "measured": False,
                "note": "NOT MEASURED — requires ground truth tracking data",
            },
            {
                "name": "ID Switches",
                "value": "NOT MEASURED",
                "unit": "count",
                "measured": False,
                "note": "NOT MEASURED — requires ground truth tracking data",
            },
            {
                "name": "Processing Latency",
                "value": "NOT MEASURED",
                "unit": "ms/frame",
                "measured": False,
                "note": "NOT MEASURED — varies by hardware and frame size",
            },
            {
                "name": "Geolocation Error",
                "value": "NOT MEASURED",
                "unit": "metres",
                "measured": False,
                "note": "NOT MEASURED — requires ground truth GPS positions",
            },
            {
                "name": "Total Analyses Run",
                "value": len(all_analyses),
                "unit": "analyses",
                "measured": True,
                "note": "Since system start",
            },
        ],
        "safety_note": (
            "Evaluation metrics are only reported when actually measured. "
            "NOT MEASURED is displayed for any metric without ground truth data."
        ),
    }

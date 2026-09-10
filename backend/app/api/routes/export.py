"""
Export Routes
GET /api/export/{analysis_id}?format=geojson|csv|json
"""
from __future__ import annotations

import csv
import io
import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.database.store import get_store

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{analysis_id}")
async def export_analysis(
    analysis_id: str,
    format: str = Query(default="geojson"),
):
    """
    Export analysis results.
    Formats: geojson, csv, json
    Never exports fabricated measurements.
    """
    store = get_store()
    analysis = store.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis not found: {analysis_id}")

    candidates = store.get_survivor_candidates(analysis_id)
    # Only person candidates
    candidates = [c for c in candidates if not c.get("track_id", "").startswith("AN-")]

    if format.lower() == "geojson":
        return _export_geojson(analysis_id, candidates)
    elif format.lower() == "csv":
        return _export_csv(analysis_id, candidates)
    elif format.lower() == "json":
        return _export_json(analysis_id, analysis, candidates)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown format: {format}. Use: geojson, csv, json")


def _export_geojson(analysis_id: str, candidates: list) -> Response:
    features = []
    for c in candidates:
        if c.get("latitude") is not None and c.get("longitude") is not None:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [c["longitude"], c["latitude"]],
                },
                "properties": {
                    "track_id": c["track_id"],
                    "rescue_priority": c.get("rescue_priority"),
                    "survivor_candidate_confidence": c.get("survivor_confidence"),
                    "detection_confidence": c.get("detection_confidence"),
                    "movement_state": c.get("movement_state"),
                    "evidence_quality": c.get("evidence_quality"),
                    "evidence_conflict": c.get("evidence_conflict"),
                    "uncertainty_radius_m": c.get("uncertainty_m"),
                    "geolocation_method": c.get("geolocation_method"),
                    "human_review_status": c.get("human_review_status"),
                    "human_decision": c.get("human_decision"),
                    "analysis_id": analysis_id,
                    "export_timestamp": time.time(),
                    "data_note": "AI-generated candidate. Requires human verification. Not confirmed survivor.",
                },
            })
        else:
            # Include candidates without geolocation (with null geometry)
            features.append({
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "track_id": c["track_id"],
                    "rescue_priority": c.get("rescue_priority"),
                    "survivor_candidate_confidence": c.get("survivor_confidence"),
                    "detection_confidence": c.get("detection_confidence"),
                    "movement_state": c.get("movement_state"),
                    "evidence_quality": c.get("evidence_quality"),
                    "geolocation": "NOT AVAILABLE",
                    "analysis_id": analysis_id,
                    "data_note": "GEOLOCATION NOT AVAILABLE — requires telemetry with lat/lon/altitude",
                },
            })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "analysis_id": analysis_id,
            "total_candidates": len(candidates),
            "geolocated_candidates": len(features),
            "export_timestamp": time.time(),
            "system": "LIFELINE-X",
            "safety_note": (
                "DEMO DATA. AI-generated candidates. "
                "NOT confirmed survivors. Requires human verification."
            ),
        },
    }

    return Response(
        content=json.dumps(geojson, indent=2),
        media_type="application/geo+json",
        headers={
            "Content-Disposition": f'attachment; filename="lifeline_x_{analysis_id}.geojson"'
        },
    )


def _export_csv(analysis_id: str, candidates: list) -> Response:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "track_id", "rescue_priority", "survivor_candidate_confidence",
        "detection_confidence", "movement_state", "evidence_quality",
        "evidence_conflict", "latitude", "longitude", "uncertainty_radius_m",
        "geolocation_method", "human_review_status", "human_decision",
        "data_note",
    ])
    for c in candidates:
        writer.writerow([
            c.get("track_id"),
            c.get("rescue_priority"),
            f"{c.get('survivor_confidence', 0):.4f}",
            f"{c.get('detection_confidence', 0):.4f}",
            c.get("movement_state"),
            c.get("evidence_quality"),
            c.get("evidence_conflict"),
            c.get("latitude", "NOT AVAILABLE"),
            c.get("longitude", "NOT AVAILABLE"),
            c.get("uncertainty_m", "NOT AVAILABLE"),
            c.get("geolocation_method", "UNAVAILABLE"),
            c.get("human_review_status"),
            c.get("human_decision", ""),
            "AI candidate — requires human verification",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="lifeline_x_{analysis_id}.csv"'
        },
    )


def _export_json(analysis_id: str, analysis: dict, candidates: list) -> Response:
    report = {
        "system": "LIFELINE-X",
        "analysis_id": analysis_id,
        "export_timestamp": time.time(),
        "analysis_summary": {
            "incident_id": analysis.get("incident_id"),
            "video_filename": analysis.get("video_filename"),
            "status": analysis.get("status"),
            "total_candidates": len(candidates),
        },
        "candidates": candidates,
        "safety_note": (
            "DEMO DATA. AI-generated analysis. "
            "NOT confirmed survivors. All candidates require human verification. "
            "LIFELINE-X does not confirm life or death."
        ),
    }

    return Response(
        content=json.dumps(report, indent=2, default=str),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="lifeline_x_{analysis_id}_report.json"'
        },
    )

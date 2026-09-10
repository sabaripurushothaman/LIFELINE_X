"""
Emergency Routing Route
GET /api/map/route?from_lat=..&from_lon=..&to_lat=..&to_lon=..

Uses OSRM (Open Source Routing Machine) public demo endpoint.
Returns a real road-network route or NOT CONFIGURED if unavailable.

Never fabricates routes. Straight-line is never returned as a road route.
"""
from __future__ import annotations

import os
import urllib.request
import urllib.parse
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/routing", tags=["routing"])

# Configurable via env — defaults to public OSRM demo (requires internet)
OSRM_BASE = os.environ.get(
    "ROUTING_API_URL",
    "https://router.project-osrm.org"
)


def _call_osrm(
    from_lon: float, from_lat: float,
    to_lon: float, to_lat: float,
) -> dict:
    """
    Call the OSRM route API.
    Returns route GeoJSON coordinates, distance_m, duration_s.
    Raises on failure — caller must handle and return NOT CONFIGURED.
    """
    coords = f"{from_lon},{from_lat};{to_lon},{to_lat}"
    url = (
        f"{OSRM_BASE}/route/v1/driving/{coords}"
        f"?overview=full&geometries=geojson&steps=false"
    )

    req = urllib.request.Request(url, headers={"User-Agent": "LIFELINE-X/1.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read())

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(f"OSRM returned: {data.get('code')}")

    route = data["routes"][0]
    return {
        "distance_m": route.get("distance", 0),
        "duration_s": route.get("duration", 0),
        "geometry": route["geometry"],  # GeoJSON LineString
        "legs": len(route.get("legs", [])),
    }


@router.get("")
async def get_route(
    from_lat: float = Query(..., description="Responder/start latitude"),
    from_lon: float = Query(..., description="Responder/start longitude"),
    to_lat: float = Query(..., description="Survivor/destination latitude"),
    to_lon: float = Query(..., description="Survivor/destination longitude"),
    track_id: Optional[str] = Query(default=None, description="Survivor track ID for reference"),
):
    """
    Compute an emergency road route from a responder location to a survivor candidate.

    Uses OSRM real road network routing.
    If OSRM is unavailable, returns status=NOT_CONFIGURED.
    NEVER returns a straight-line as a road route.
    """
    # Basic input validation
    if not (-90 <= from_lat <= 90 and -180 <= from_lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid from coordinates")
    if not (-90 <= to_lat <= 90 and -180 <= to_lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid to coordinates")

    try:
        result = _call_osrm(from_lon, from_lat, to_lon, to_lat)

        distance_km = result["distance_m"] / 1000
        duration_min = result["duration_s"] / 60

        return {
            "status": "ROUTE_FOUND",
            "routing_engine": "OSRM",
            "routing_endpoint": OSRM_BASE,
            "track_id": track_id,
            "from": {"lat": from_lat, "lon": from_lon},
            "to": {"lat": to_lat, "lon": to_lon},
            "distance_km": round(distance_km, 2),
            "duration_minutes": round(duration_min, 1),
            "geometry": result["geometry"],
            "route_type": "FASTEST_ROAD_NETWORK",
            "safety_note": (
                "Emergency route computed via road network. "
                "Actual passability may be affected by flood damage, debris, or road closures. "
                "Field responder must verify route safety before dispatch."
            ),
        }

    except Exception as e:
        # Routing unavailable — return NOT CONFIGURED, never fabricate
        return {
            "status": "NOT_CONFIGURED",
            "routing_engine": "OSRM",
            "routing_endpoint": OSRM_BASE,
            "track_id": track_id,
            "from": {"lat": from_lat, "lon": from_lon},
            "to": {"lat": to_lat, "lon": to_lon},
            "error": str(e),
            "note": (
                "Routing service unavailable. Internet connectivity required for OSRM demo endpoint. "
                "Configure ROUTING_API_URL env var for a local OSRM instance. "
                "Straight-line distance is NOT provided as a substitute."
            ),
            "geometry": None,
        }

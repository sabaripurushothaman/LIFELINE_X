"""
Health and System Status Routes
GET /api/health
GET /api/system/status
"""
from __future__ import annotations

import platform
import time
import urllib.request
import os

import torch
from fastapi import APIRouter

from app.ai.detection.detector import PersonDetector
from app.database.store import get_store

router = APIRouter(prefix="/api", tags=["health"])

_startup_time = time.time()

OSRM_BASE = os.environ.get("ROUTING_API_URL", "https://router.project-osrm.org")


def _check_routing_service() -> tuple[str, str]:
    """
    Check if the OSRM routing service is reachable.
    Returns (status, detail).
    """
    try:
        # Lightweight ping — request a trivial route in Tamil Nadu (near demo area)
        url = f"{OSRM_BASE}/route/v1/driving/80.16,13.04;80.17,13.05?overview=false&steps=false"
        req = urllib.request.Request(url, headers={"User-Agent": "LIFELINE-X/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            if resp.status == 200:
                return "CONNECTED", f"OSRM reachable at {OSRM_BASE}"
    except Exception as e:
        pass
    configured = bool(os.environ.get("ROUTING_API_URL"))
    if configured:
        return "NOT CONNECTED", f"Configured endpoint unreachable: {OSRM_BASE}"
    return "NOT CONFIGURED", "Set ROUTING_API_URL env var or use public OSRM demo"


@router.get("/health")
async def health():
    store = get_store()
    detector_status = PersonDetector().status()
    return {
        "status": "healthy",
        "service": "lifeline-x-api",
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _startup_time, 1),
        "device": detector_status.device.upper(),
        "model": detector_status.model_name,
        "database": "CONNECTED" if store.available else "FALLBACK_IN_MEMORY",
    }


@router.get("/system/status")
async def system_status():
    store = get_store()

    # AI model check
    detector = PersonDetector()
    det_status = detector.status()

    # OpenCV check
    try:
        import cv2
        cv_ok = True
    except ImportError:
        cv_ok = False

    device = "CUDA" if torch.cuda.is_available() else "CPU"

    # Routing service check (non-blocking best-effort)
    routing_status, routing_detail = _check_routing_service()

    components = [
        {
            "label": "API",
            "status": "CONNECTED",
            "detail": "FastAPI running",
        },
        {
            "label": "Video Ingestion",
            "status": "READY" if cv_ok else "ERROR",
            "detail": f"OpenCV {'available' if cv_ok else 'not available'}",
        },
        {
            "label": "AI Detection",
            "status": "READY" if det_status.available else "WARNING",
            "detail": (
                f"{det_status.model_name} on {det_status.device.upper()}"
                if det_status.available
                else f"Model error: {det_status.error}"
            ),
        },
        {
            "label": "Object Tracking",
            "status": "READY" if det_status.available else "WARNING",
            "detail": "ByteTrack via Ultralytics" if det_status.available else "Depends on AI Detection",
        },
        {
            "label": "Evidence Engine",
            "status": "READY",
            "detail": "Multi-signal evidence chain with conflict detection",
        },
        {
            "label": "Telemetry Sync",
            "status": "READY",
            "detail": "CSV timestamp correlation parser ready",
        },
        {
            "label": "Geolocation",
            "status": "READY",
            "detail": "Flat-ground pinhole projection to WGS84 (requires telemetry CSV)",
        },
        {
            "label": "Database",
            "status": "CONNECTED" if store.available else "SIMULATED",
            "detail": "SQLite" if store.available else "In-memory fallback",
        },
        {
            "label": "Emergency Routing",
            "status": routing_status,
            "detail": routing_detail,
        },
        {
            "label": "Thermal Input",
            "status": "NOT CONNECTED",
            "detail": "No thermal payload connected — RGB-only operation",
        },
        {
            "label": "Map Tiles",
            "status": "CONNECTED",
            "detail": "OpenStreetMap raster tiles (MapLibre-GL, no API key required)",
        },
    ]

    statuses = [c["status"] for c in components]
    if "ERROR" in statuses:
        overall = "WARNING"
    elif all(s in ("READY", "CONNECTED", "SIMULATED", "NOT CONFIGURED") for s in statuses):
        overall = "OPERATIONAL"
    elif "NOT CONNECTED" in statuses or "NOT CONFIGURED" in statuses:
        overall = "DEGRADED"
    else:
        overall = "OPERATIONAL"

    return {
        "overall": overall,
        "device": device,
        "components": components,
        "platform": platform.system(),
        "python_version": platform.python_version(),
        "torch_version": torch.__version__,
        "database_type": "SQLite" if store.available else "In-Memory",
        "uptime_seconds": round(time.time() - _startup_time, 1),
    }

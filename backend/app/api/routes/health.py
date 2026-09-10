"""
Health and System Status Routes
GET /api/health
GET /api/system/status
"""
from __future__ import annotations

import platform
import time

import torch
from fastapi import APIRouter

from app.ai.detection.detector import PersonDetector
from app.database.store import get_store

router = APIRouter(prefix="/api", tags=["health"])

_startup_time = time.time()


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

    # Actual service checks
    detector = PersonDetector()
    det_status = detector.status()

    try:
        import cv2
        cv_ok = True
    except ImportError:
        cv_ok = False

    device = "CUDA" if torch.cuda.is_available() else "CPU"

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
            "detail": f"{det_status.model_name} on {det_status.device.upper()}" if det_status.available else f"Model error: {det_status.error}",
        },
        {
            "label": "Tracking",
            "status": "READY" if det_status.available else "WARNING",
            "detail": "ByteTrack via Ultralytics" if det_status.available else "Depends on AI Detection",
        },
        {
            "label": "Evidence Engine",
            "status": "READY",
            "detail": "Multi-signal evidence chain",
        },
        {
            "label": "Telemetry",
            "status": "READY",
            "detail": "CSV parser ready",
        },
        {
            "label": "Geolocation",
            "status": "READY",
            "detail": "Flat-ground approximation (requires telemetry)",
        },
        {
            "label": "Database",
            "status": "CONNECTED" if store.available else "SIMULATED",
            "detail": "SQLite" if store.available else "In-memory fallback",
        },
    ]

    statuses = [c["status"] for c in components]
    if "ERROR" in statuses:
        overall = "WARNING"
    elif all(s in ("READY", "CONNECTED", "SIMULATED") for s in statuses):
        overall = "OPERATIONAL"
    else:
        overall = "DEGRADED"

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

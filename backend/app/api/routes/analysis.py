"""
Analysis Routes
POST /api/analysis/upload    — upload video (+ optional telemetry)
POST /api/analysis/start     — start pipeline on uploaded video
GET  /api/analysis/{id}      — get analysis status and results
GET  /api/analysis           — list all analyses
"""
from __future__ import annotations

import asyncio
import os
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.database.store import get_store
from app.services.pipeline import create_analysis_job, get_job_status, run_analysis
from app.services.video import VideoIngestor

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# Upload directory
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_video(
    video: UploadFile = File(...),
    telemetry: Optional[UploadFile] = File(None),
    incident_id: str = Form(default="FLOOD-001"),
):
    """
    Upload a recorded drone video (and optional telemetry CSV).
    Returns an upload_id to reference in /start.
    """
    # Validate extension
    allowed = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    suffix = Path(video.filename or "").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format: {suffix}. Allowed: {', '.join(allowed)}",
        )

    upload_id = f"UP-{uuid.uuid4().hex[:8].upper()}"
    video_path = UPLOAD_DIR / f"{upload_id}{suffix}"

    # Save video
    content = await video.read()
    with open(video_path, "wb") as f:
        f.write(content)

    # Save telemetry if provided
    telemetry_bytes = None
    if telemetry and telemetry.filename:
        telemetry_bytes = await telemetry.read()

    # Validate video
    ingestor = VideoIngestor(str(video_path))
    meta = ingestor.validate()

    return {
        "upload_id": upload_id,
        "video_path": str(video_path),
        "incident_id": incident_id,
        "video_valid": meta.valid,
        "video_error": meta.error,
        "video_metadata": {
            "filename": meta.filename,
            "fps": meta.fps,
            "frame_count": meta.frame_count,
            "duration_seconds": meta.duration_seconds,
            "width": meta.width,
            "height": meta.height,
            "file_size_bytes": meta.file_size_bytes,
        },
        "telemetry_uploaded": telemetry_bytes is not None,
        "telemetry_bytes_size": len(telemetry_bytes) if telemetry_bytes else 0,
        "_telemetry_bytes": telemetry_bytes,  # passed to start
    }


@router.post("/start")
async def start_analysis(
    background_tasks: BackgroundTasks,
    video_path: str = Form(...),
    incident_id: str = Form(default="FLOOD-001"),
    sample_every_n: int = Form(default=5),
):
    """
    Start the analysis pipeline on an uploaded video.
    Returns analysis_id immediately; pipeline runs in background.
    """
    if not Path(video_path).exists():
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")

    analysis_id = create_analysis_job(
        video_path=video_path,
        incident_id=incident_id,
        telemetry_bytes=None,
        sample_every_n=sample_every_n,
    )

    # Run pipeline as background task
    background_tasks.add_task(_run_analysis_task, analysis_id)

    return {
        "analysis_id": analysis_id,
        "status": "STARTED",
        "incident_id": incident_id,
        "video_path": video_path,
        "sample_every_n": sample_every_n,
        "message": "Analysis pipeline started. Poll /api/analysis/{analysis_id} for status.",
    }


@router.post("/start-with-telemetry")
async def start_analysis_with_telemetry(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    telemetry: Optional[UploadFile] = File(None),
    incident_id: str = Form(default="FLOOD-001"),
    sample_every_n: int = Form(default=5),
):
    """
    Combined upload + start endpoint for convenience.
    Accepts video + optional telemetry CSV.
    """
    allowed = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    suffix = Path(video.filename or "").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: {suffix}")

    upload_id = f"UP-{uuid.uuid4().hex[:8].upper()}"
    video_path = UPLOAD_DIR / f"{upload_id}{suffix}"

    content = await video.read()
    with open(video_path, "wb") as f:
        f.write(content)

    telemetry_bytes = None
    if telemetry and telemetry.filename:
        telemetry_bytes = await telemetry.read()

    # Validate
    ingestor = VideoIngestor(str(video_path))
    meta = ingestor.validate()

    if not meta.valid:
        video_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid video: {meta.error}")

    analysis_id = create_analysis_job(
        video_path=str(video_path),
        incident_id=incident_id,
        telemetry_bytes=telemetry_bytes,
        sample_every_n=sample_every_n,
        original_filename=video.filename,
    )

    background_tasks.add_task(_run_analysis_task, analysis_id)

    return {
        "analysis_id": analysis_id,
        "status": "STARTED",
        "incident_id": incident_id,
        "video_filename": meta.filename,
        "fps": meta.fps,
        "frame_count": meta.frame_count,
        "duration_seconds": meta.duration_seconds,
        "telemetry_uploaded": telemetry_bytes is not None,
        "sample_every_n": sample_every_n,
    }


async def _run_analysis_task(analysis_id: str):
    """Background task wrapper."""
    try:
        await run_analysis(analysis_id)
    except Exception as e:
        job = get_job_status(analysis_id)
        if job:
            job["status"] = "ERROR"
            job["error"] = str(e)


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get analysis status, progress, and results."""
    job = get_job_status(analysis_id)
    store = get_store()
    db_record = store.get_analysis(analysis_id)

    if not job and not db_record:
        raise HTTPException(status_code=404, detail=f"Analysis not found: {analysis_id}")

    candidates = store.get_survivor_candidates(analysis_id) if db_record else []

    result = {
        "analysis_id": analysis_id,
        "status": job["status"] if job else db_record.get("status", "UNKNOWN"),
        "progress": job.get("progress", 100) if job else 100,
        "incident_id": (job or db_record).get("incident_id", ""),
        "video_filename": (db_record or {}).get("video_filename", ""),
        "processed_frames": job.get("processed_frames", 0) if job else (db_record or {}).get("processed_frames", 0),
        "total_frames": job.get("total_frames", 0) if job else (db_record or {}).get("frame_count", 0),
        "candidates_found": job.get("candidates_found", len(candidates)) if job else len(candidates),
        "error": job.get("error") if job else None,
        "candidates": candidates,
    }

    return result


@router.get("")
async def list_analyses():
    """List all analysis sessions."""
    store = get_store()
    return {"analyses": store.list_analyses()}

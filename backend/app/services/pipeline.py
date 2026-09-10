"""
Analysis Pipeline Orchestrator

Coordinates: Video Ingestion → Detection → Tracking → Evidence → Scoring → Geolocation

Runs asynchronously; updates analysis status in the store.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from pathlib import Path
from typing import Dict, Optional

from app.ai.detection.detector import PersonDetector
from app.ai.tracking.tracker import PersistentTracker
from app.ai.tracking.movement import compute_movement_state
from app.ai.evidence.engine import build_evidence_chain
from app.geolocation.geolocator import geolocate
from app.prioritization.scorer import compute_survivor_score
from app.telemetry.parser import TelemetryParser
from app.services.video import VideoIngestor
from app.database.store import get_store

# Singleton detector (model loaded once)
_detector: Optional[PersonDetector] = None


def _get_detector() -> PersonDetector:
    global _detector
    if _detector is None:
        _detector = PersonDetector(model_name="yolov8n.pt", confidence_threshold=0.40)
    return _detector


# Active analysis jobs
_jobs: Dict[str, dict] = {}


def get_job_status(analysis_id: str) -> Optional[dict]:
    return _jobs.get(analysis_id)


def create_analysis_job(
    video_path: str,
    incident_id: str,
    telemetry_bytes: Optional[bytes] = None,
    sample_every_n: int = 5,
    thermal_path: Optional[str] = None,
) -> str:
    """Create an analysis job record. Returns analysis_id."""
    analysis_id = f"A-{uuid.uuid4().hex[:8].upper()}"
    filename = Path(video_path).name
    store = get_store()

    # Validate video first
    ingestor = VideoIngestor(video_path)
    meta = ingestor.validate()

    store.create_analysis(
        analysis_id=analysis_id,
        incident_id=incident_id,
        video_filename=filename,
        video_path=video_path,
        fps=meta.fps,
        frame_count=meta.frame_count,
        duration=meta.duration_seconds,
    )

    _jobs[analysis_id] = {
        "analysis_id": analysis_id,
        "status": "PENDING",
        "video_path": video_path,
        "video_valid": meta.valid,
        "video_error": meta.error,
        "incident_id": incident_id,
        "telemetry_bytes": telemetry_bytes,
        "sample_every_n": sample_every_n,
        "thermal_path": thermal_path,
        "progress": 0,
        "total_frames": meta.frame_count,
        "processed_frames": 0,
        "candidates_found": 0,
        "error": None if meta.valid else meta.error,
    }

    return analysis_id


async def run_analysis(analysis_id: str):
    """
    Main analysis pipeline. Designed to run as a background async task.
    """
    job = _jobs.get(analysis_id)
    if job is None:
        return

    store = get_store()

    if not job["video_valid"]:
        job["status"] = "ERROR"
        job["error"] = job.get("video_error", "Invalid video")
        store.update_analysis_status(analysis_id, "ERROR")
        return

    # ── Parse telemetry ──────────────────────────────────────────────────────
    telemetry = TelemetryParser()
    if job["telemetry_bytes"]:
        telemetry.parse_bytes(job["telemetry_bytes"])

    # ── Initialize components ────────────────────────────────────────────────
    detector = _get_detector()
    tracker = PersistentTracker()
    sample_n = job.get("sample_every_n", 5)

    job["status"] = "RUNNING"
    store.update_analysis_status(analysis_id, "RUNNING")

    ingestor = VideoIngestor(job["video_path"])
    video_meta = ingestor.validate()
    total = max(video_meta.frame_count // sample_n, 1)

    # ── Frame processing loop ─────────────────────────────────────────────────
    processed = 0
    frame_width = video_meta.width or 1920
    frame_height = video_meta.height or 1080

    try:
        for vframe in ingestor.iter_sampled_frames(sample_every_n=sample_n, max_frames=500):
            # Detect persons
            detections = detector.detect(vframe.image, vframe.frame_number, vframe.timestamp_seconds)

            # Track
            updated_detections, all_tracks = tracker.update(
                vframe.image, detections, vframe.frame_number, vframe.timestamp_seconds
            )

            # Sync telemetry
            sync_result = telemetry.sync_frame(vframe.timestamp_seconds)

            processed += 1
            progress = int((processed / total) * 100)
            job["processed_frames"] = processed
            job["progress"] = min(progress, 99)

            # Periodically update store (not every frame)
            if processed % 10 == 0:
                store.update_analysis_status(analysis_id, "RUNNING", processed)
                # Small yield to avoid blocking
                await asyncio.sleep(0)

        # ── Build evidence chains and score candidates ──────────────────────
        person_tracks = tracker.get_person_tracks()
        candidates_found = 0

        for track in person_tracks:
            if track.frame_count < 1:
                continue

            movement_state, movement_disp = compute_movement_state(
                centers=track.bbox_centers,
                frame_width=frame_width,
                frame_height=frame_height,
                track_lifecycle=track.lifecycle,
            )

            # Final telemetry for this track's last frame
            last_sync = telemetry.sync_frame(track.last_seen_ts)
            telem_avail = last_sync.sync_quality in ("SYNCED", "APPROXIMATE")
            telem_quality = last_sync.sync_quality if telem_avail else "NOT AVAILABLE"

            # Geolocation
            geo = None
            if last_sync.telemetry and telem_avail:
                t = last_sync.telemetry
                if track.latest_center:
                    cx, cy = track.latest_center
                    geo = geolocate(
                        drone_lat=t.latitude,
                        drone_lon=t.longitude,
                        altitude_m=t.altitude,
                        heading_deg=t.heading,
                        pitch_deg=t.pitch,
                        roll_deg=t.roll,
                        bbox_center_x_px=cx,
                        bbox_center_y_px=cy,
                        frame_width_px=frame_width,
                        frame_height_px=frame_height,
                    )

            # Evidence chain
            evidence = build_evidence_chain(
                track_id=track.track_id,
                detection_confidence=track.avg_confidence,
                frame_count=track.frame_count,
                movement_state=movement_state,
                movement_disp=movement_disp,
                telemetry_available=telem_avail,
                telemetry_quality=telem_quality,
                thermal_available=False,
                thermal_confidence=None,
                geolocation_confidence=geo.confidence if (geo and geo.available) else None,
                frame_number=track.last_seen_frame,
                timestamp=track.last_seen_ts,
            )

            # Survivor score
            score = compute_survivor_score(
                track_id=track.track_id,
                detection_confidence=track.avg_confidence,
                frame_count=track.frame_count,
                movement_state=movement_state,
                thermal_available=False,
                thermal_confidence=None,
                telemetry_available=telem_avail,
                telemetry_quality=telem_quality,
                geolocation_confidence=geo.confidence if (geo and geo.available) else None,
                evidence_quality=evidence.overall_quality,
                evidence_conflict=evidence.has_conflict,
                frames_since_seen=0,
            )

            # Persist track
            store.upsert_track(analysis_id, track.to_dict())

            # Persist evidence
            store.save_evidence(analysis_id, evidence.to_dict())

            # Persist candidate
            candidate = {
                "track_id": track.track_id,
                "survivor_confidence": score.survivor_candidate_confidence,
                "rescue_priority": score.rescue_priority,
                "priority_reason": score.priority_reason,
                "score_breakdown": score.score_breakdown,
                "evidence_conflict": score.evidence_conflict,
                "evidence_quality": score.evidence_quality,
                "movement_state": movement_state,
                "detection_confidence": track.avg_confidence,
                "frame_count": track.frame_count,
                "latitude": geo.latitude if (geo and geo.available) else None,
                "longitude": geo.longitude if (geo and geo.available) else None,
                "uncertainty_m": geo.uncertainty_radius_m if (geo and geo.available) else None,
                "geolocation_method": geo.method if geo else "UNAVAILABLE",
                "human_review_status": "PENDING",
            }
            store.upsert_survivor_candidate(analysis_id, candidate)
            candidates_found += 1

        # Save animal tracks too
        for track in tracker.get_all_tracks().values():
            if track.category == "ANIMAL":
                store.upsert_track(analysis_id, track.to_dict())

        job["status"] = "COMPLETE"
        job["progress"] = 100
        job["candidates_found"] = candidates_found
        store.update_analysis_status(analysis_id, "COMPLETE", processed)

    except Exception as e:
        job["status"] = "ERROR"
        job["error"] = str(e)
        store.update_analysis_status(analysis_id, "ERROR")
        raise

"""
Persistent Object Tracker
Uses Ultralytics ByteTrack to assign persistent LX-XXX IDs across frames.
Handles occlusion with a configurable disappearance window.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch

from app.ai.detection.detector import Detection

# Track lifecycle states
ACTIVE = "ACTIVE"
OCCLUDED = "TEMPORARILY_OCCLUDED"
LOST = "LOST"

# How many frames of absence before declaring a track LOST
OCCLUSION_GRACE_FRAMES = 15


@dataclass
class TrackRecord:
    track_id: str          # e.g. "LX-017"
    raw_track_id: int      # numeric ID from tracker
    category: str          # PERSON_CANDIDATE / ANIMAL
    class_name: str
    first_seen_frame: int
    first_seen_ts: float
    last_seen_frame: int
    last_seen_ts: float
    frame_count: int
    bounding_boxes: List[Tuple[float, float, float, float]]
    bbox_centers: List[Tuple[float, float]]
    confidence_history: List[float]
    lifecycle: str = ACTIVE
    frames_absent: int = 0

    @property
    def avg_confidence(self) -> float:
        if not self.confidence_history:
            return 0.0
        return sum(self.confidence_history) / len(self.confidence_history)

    @property
    def latest_bbox(self) -> Optional[Tuple[float, float, float, float]]:
        return self.bounding_boxes[-1] if self.bounding_boxes else None

    @property
    def latest_center(self) -> Optional[Tuple[float, float]]:
        return self.bbox_centers[-1] if self.bbox_centers else None

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "category": self.category,
            "class_name": self.class_name,
            "first_seen_frame": self.first_seen_frame,
            "first_seen_ts": self.first_seen_ts,
            "last_seen_frame": self.last_seen_frame,
            "last_seen_ts": self.last_seen_ts,
            "frame_count": self.frame_count,
            "avg_confidence": round(self.avg_confidence, 4),
            "lifecycle": self.lifecycle,
            "latest_bbox": list(self.latest_bbox) if self.latest_bbox else None,
            "latest_center": list(self.latest_center) if self.latest_center else None,
        }


class PersistentTracker:
    """
    Wraps Ultralytics ByteTrack with LX-XXX ID management.
    Separates person candidates from animals.
    Handles short-term occlusion.
    """

    def __init__(self, occlusion_grace: int = OCCLUSION_GRACE_FRAMES):
        self.occlusion_grace = occlusion_grace
        self._tracks: Dict[str, TrackRecord] = {}  # LX-ID -> TrackRecord
        self._raw_id_to_lx: Dict[int, str] = {}     # numeric -> LX-ID
        self._lx_counter = 0
        self._animal_counter = 0
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from ultralytics import YOLO
                import torch
                self._device = "cuda" if torch.cuda.is_available() else "cpu"
                self._model = YOLO("yolov8n.pt")
            except Exception as e:
                self._model_error = str(e)
                return None
        return self._model

    def _next_lx_id(self) -> str:
        self._lx_counter += 1
        return f"LX-{self._lx_counter:03d}"

    def _next_animal_id(self) -> str:
        self._animal_counter += 1
        return f"AN-{self._animal_counter:03d}"

    def update(
        self,
        frame: np.ndarray,
        detections: List[Detection],
        frame_number: int,
        timestamp: float,
    ) -> Tuple[List[Detection], List[TrackRecord]]:
        """
        Run ByteTrack on the frame using Ultralytics track() method.
        Returns updated detections with track_id set, and all active track records.
        """
        model = self._get_model()
        if model is None:
            # Fallback: assign temporary IDs without tracking
            return self._fallback_update(detections, frame_number, timestamp)

        try:
            from ultralytics import YOLO
            from app.ai.detection.detector import TARGET_CLASSES, PERSON_CLASS_ID

            device = "cuda" if torch.cuda.is_available() else "cpu"
            results = model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=0.40,
                classes=TARGET_CLASSES,
                verbose=False,
                device=device,
            )
        except Exception as e:
            return self._fallback_update(detections, frame_number, timestamp)

        updated_detections: List[Detection] = []
        seen_raw_ids = set()

        from app.ai.detection.detector import PERSON_CLASS_ID, ANIMAL_CLASS_IDS, ANIMAL_NAMES

        for result in results:
            if result.boxes is None:
                continue
            boxes = result.boxes
            if boxes.id is None:
                continue

            for i in range(len(boxes)):
                raw_id = int(boxes.id[i].item())
                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2

                if cls_id == PERSON_CLASS_ID:
                    class_name = "person"
                    category = "PERSON_CANDIDATE"
                elif cls_id in ANIMAL_CLASS_IDS:
                    class_name = ANIMAL_NAMES.get(cls_id, "animal")
                    category = "ANIMAL"
                else:
                    continue

                # Assign LX/AN ID
                if raw_id not in self._raw_id_to_lx:
                    if category == "PERSON_CANDIDATE":
                        lx_id = self._next_lx_id()
                    else:
                        lx_id = self._next_animal_id()
                    self._raw_id_to_lx[raw_id] = lx_id
                else:
                    lx_id = self._raw_id_to_lx[raw_id]

                seen_raw_ids.add(raw_id)

                # Update or create track record
                if lx_id not in self._tracks:
                    self._tracks[lx_id] = TrackRecord(
                        track_id=lx_id,
                        raw_track_id=raw_id,
                        category=category,
                        class_name=class_name,
                        first_seen_frame=frame_number,
                        first_seen_ts=timestamp,
                        last_seen_frame=frame_number,
                        last_seen_ts=timestamp,
                        frame_count=1,
                        bounding_boxes=[(x1, y1, x2, y2)],
                        bbox_centers=[(cx, cy)],
                        confidence_history=[conf],
                        lifecycle=ACTIVE,
                        frames_absent=0,
                    )
                else:
                    track = self._tracks[lx_id]
                    track.last_seen_frame = frame_number
                    track.last_seen_ts = timestamp
                    track.frame_count += 1
                    track.bounding_boxes.append((x1, y1, x2, y2))
                    track.bbox_centers.append((cx, cy))
                    track.confidence_history.append(conf)
                    track.lifecycle = ACTIVE
                    track.frames_absent = 0

                det = Detection(
                    frame_number=frame_number,
                    timestamp_seconds=timestamp,
                    class_id=cls_id,
                    class_name=class_name,
                    category=category,
                    confidence=conf,
                    bbox_xyxy=(x1, y1, x2, y2),
                    bbox_center=(cx, cy),
                    model_name="yolov8n.pt",
                    source="RGB",
                    track_id=raw_id,
                )
                det.track_id = raw_id  # keep numeric for internal use
                # We'll attach LX ID via the track registry
                updated_detections.append(det)

        # Handle disappearing tracks (occlusion)
        for lx_id, track in self._tracks.items():
            if track.raw_track_id not in seen_raw_ids and track.lifecycle != LOST:
                track.frames_absent += 1
                if track.frames_absent <= self.occlusion_grace:
                    track.lifecycle = OCCLUDED
                else:
                    track.lifecycle = LOST

        return updated_detections, list(self._tracks.values())

    def _fallback_update(
        self,
        detections: List[Detection],
        frame_number: int,
        timestamp: float,
    ) -> Tuple[List[Detection], List[TrackRecord]]:
        """Simple fallback when tracker unavailable: assign IDs by detection order."""
        for det in detections:
            if det.track_id is None:
                if det.category == "PERSON_CANDIDATE":
                    det.track_id = self._lx_counter
                    lx_id = self._next_lx_id()
                else:
                    det.track_id = self._animal_counter
                    lx_id = self._next_animal_id()

                self._tracks[lx_id] = TrackRecord(
                    track_id=lx_id,
                    raw_track_id=det.track_id,
                    category=det.category,
                    class_name=det.class_name,
                    first_seen_frame=frame_number,
                    first_seen_ts=timestamp,
                    last_seen_frame=frame_number,
                    last_seen_ts=timestamp,
                    frame_count=1,
                    bounding_boxes=[det.bbox_xyxy],
                    bbox_centers=[det.bbox_center],
                    confidence_history=[det.confidence],
                    lifecycle=ACTIVE,
                )
        return detections, list(self._tracks.values())

    def get_all_tracks(self) -> Dict[str, TrackRecord]:
        return self._tracks

    def get_person_tracks(self) -> List[TrackRecord]:
        return [t for t in self._tracks.values() if t.category == "PERSON_CANDIDATE"]

    def reset(self):
        self._tracks = {}
        self._raw_id_to_lx = {}
        self._lx_counter = 0
        self._animal_counter = 0
        self._model = None

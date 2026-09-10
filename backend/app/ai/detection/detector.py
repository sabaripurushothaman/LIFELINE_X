"""
YOLO Person Detector
Uses YOLOv8n for efficient CPU inference.
Separates PERSON CANDIDATE from ANIMAL detections.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import torch

_model_instance = None
_model_error: Optional[str] = None


def _get_model(model_name: str = "yolov8n.pt"):
    """Lazy-load and cache the YOLO model."""
    global _model_instance, _model_error
    if _model_instance is not None:
        return _model_instance, None
    if _model_error is not None:
        return None, _model_error
    try:
        from ultralytics import YOLO
        _model_instance = YOLO(model_name)
        return _model_instance, None
    except Exception as e:
        _model_error = str(e)
        return None, _model_error


# COCO class IDs
PERSON_CLASS_ID = 0
ANIMAL_CLASS_IDS = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23}  # bird..giraffe range
ANIMAL_NAMES = {
    14: "bird", 15: "cat", 16: "dog", 17: "horse",
    18: "sheep", 19: "cow", 20: "elephant", 21: "bear",
    22: "zebra", 23: "giraffe",
}

# Classes the detector targets (person + common animals to separate)
TARGET_CLASSES = [PERSON_CLASS_ID] + list(ANIMAL_CLASS_IDS)


@dataclass
class Detection:
    frame_number: int
    timestamp_seconds: float
    class_id: int
    class_name: str
    category: str          # "PERSON_CANDIDATE" | "ANIMAL" | "OTHER"
    confidence: float      # 0.0-1.0
    bbox_xyxy: Tuple[float, float, float, float]  # x1, y1, x2, y2 (pixel coords)
    bbox_center: Tuple[float, float]              # cx, cy
    model_name: str
    source: str = "RGB"
    track_id: Optional[int] = None


@dataclass
class DetectorStatus:
    available: bool
    model_name: str
    device: str
    error: Optional[str] = None


class PersonDetector:
    """
    Wraps YOLOv8n for inference on drone frames.
    Does NOT label every detection a survivor — only PERSON CANDIDATE.
    """

    def __init__(self, model_name: str = "yolov8n.pt", confidence_threshold: float = 0.40):
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # pre-load
        _get_model(model_name)

    def status(self) -> DetectorStatus:
        model, error = _get_model(self.model_name)
        return DetectorStatus(
            available=model is not None,
            model_name=self.model_name,
            device=self.device,
            error=error,
        )

    def detect(self, frame: np.ndarray, frame_number: int, timestamp: float) -> List[Detection]:
        """
        Run detection on a single BGR frame.
        Returns list of Detection objects.
        """
        model, error = _get_model(self.model_name)
        if model is None:
            return []

        try:
            results = model(
                frame,
                conf=self.confidence_threshold,
                classes=TARGET_CLASSES,
                verbose=False,
                device=self.device,
            )
        except Exception:
            return []

        detections: List[Detection] = []
        for result in results:
            if result.boxes is None:
                continue
            boxes = result.boxes
            for i in range(len(boxes)):
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
                    class_name = "unknown"
                    category = "OTHER"

                detections.append(Detection(
                    frame_number=frame_number,
                    timestamp_seconds=timestamp,
                    class_id=cls_id,
                    class_name=class_name,
                    category=category,
                    confidence=conf,
                    bbox_xyxy=(x1, y1, x2, y2),
                    bbox_center=(cx, cy),
                    model_name=self.model_name,
                    source="RGB",
                ))

        return detections

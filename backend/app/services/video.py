"""
Video Ingestion Service
Handles recorded drone footage: MP4, MOV, AVI
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Generator, Optional

import cv2
import numpy as np


@dataclass
class VideoMetadata:
    path: str
    filename: str
    fps: float
    frame_count: int
    duration_seconds: float
    width: int
    height: int
    codec: str
    file_size_bytes: int
    valid: bool
    error: Optional[str] = None


@dataclass
class VideoFrame:
    frame_number: int
    timestamp_seconds: float
    image: np.ndarray
    width: int
    height: int


class VideoIngestor:
    """Opens and iterates through recorded drone video files."""

    SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

    def __init__(self, video_path: str):
        self.video_path = Path(video_path)
        self._cap: Optional[cv2.VideoCapture] = None

    def validate(self) -> VideoMetadata:
        """Validate video file and return metadata."""
        path_str = str(self.video_path)
        filename = self.video_path.name

        if not self.video_path.exists():
            return VideoMetadata(
                path=path_str,
                filename=filename,
                fps=0,
                frame_count=0,
                duration_seconds=0,
                width=0,
                height=0,
                codec="",
                file_size_bytes=0,
                valid=False,
                error=f"File not found: {path_str}",
            )

        ext = self.video_path.suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            return VideoMetadata(
                path=path_str,
                filename=filename,
                fps=0,
                frame_count=0,
                duration_seconds=0,
                width=0,
                height=0,
                codec="",
                file_size_bytes=0,
                valid=False,
                error=f"Unsupported format: {ext}. Supported: {', '.join(self.SUPPORTED_EXTENSIONS)}",
            )

        cap = cv2.VideoCapture(path_str)
        if not cap.isOpened():
            return VideoMetadata(
                path=path_str,
                filename=filename,
                fps=0,
                frame_count=0,
                duration_seconds=0,
                width=0,
                height=0,
                codec="",
                file_size_bytes=0,
                valid=False,
                error="Could not open video file. File may be corrupted.",
            )

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
        codec = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)]).strip()
        duration = frame_count / fps if fps > 0 else 0
        file_size = self.video_path.stat().st_size

        cap.release()

        if frame_count == 0 or width == 0 or height == 0:
            return VideoMetadata(
                path=path_str,
                filename=filename,
                fps=fps,
                frame_count=frame_count,
                duration_seconds=duration,
                width=width,
                height=height,
                codec=codec,
                file_size_bytes=file_size,
                valid=False,
                error="Video appears to have no frames or invalid dimensions.",
            )

        return VideoMetadata(
            path=path_str,
            filename=filename,
            fps=fps,
            frame_count=frame_count,
            duration_seconds=duration,
            width=width,
            height=height,
            codec=codec,
            file_size_bytes=file_size,
            valid=True,
        )

    def iter_sampled_frames(
        self,
        sample_every_n: int = 5,
        max_frames: Optional[int] = None,
    ) -> Generator[VideoFrame, None, None]:
        """
        Iterate through video, yielding every Nth frame.
        This is the primary entry point for the analysis pipeline.
        """
        cap = cv2.VideoCapture(str(self.video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {self.video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_number = 0
        yielded = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_number % sample_every_n == 0:
                    timestamp = frame_number / fps
                    h, w = frame.shape[:2]
                    yield VideoFrame(
                        frame_number=frame_number,
                        timestamp_seconds=timestamp,
                        image=frame,
                        width=w,
                        height=h,
                    )
                    yielded += 1
                    if max_frames is not None and yielded >= max_frames:
                        break

                frame_number += 1
        finally:
            cap.release()

    def get_frame_at(self, frame_number: int) -> Optional[VideoFrame]:
        """Get a specific frame by number."""
        cap = cv2.VideoCapture(str(self.video_path))
        if not cap.isOpened():
            return None
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if not ret:
                return None
            h, w = frame.shape[:2]
            return VideoFrame(
                frame_number=frame_number,
                timestamp_seconds=frame_number / fps,
                image=frame,
                width=w,
                height=h,
            )
        finally:
            cap.release()

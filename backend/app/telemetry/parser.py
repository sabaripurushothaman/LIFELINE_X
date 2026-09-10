"""
Telemetry Parser and Frame Synchronizer
Parses drone telemetry CSV and synchronizes with video frame timestamps.

Supported CSV fields:
    timestamp, latitude, longitude, altitude,
    roll, pitch, yaw, heading, speed

If telemetry is unavailable: explicitly records "TELEMETRY: NOT AVAILABLE"
Does NOT invent telemetry values.
"""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class TelemetryRecord:
    timestamp: float       # seconds since start of recording
    latitude: Optional[float]
    longitude: Optional[float]
    altitude: Optional[float]
    roll: Optional[float]
    pitch: Optional[float]
    yaw: Optional[float]
    heading: Optional[float]
    speed: Optional[float]


@dataclass
class SyncResult:
    frame_timestamp: float
    telemetry: Optional[TelemetryRecord]
    sync_quality: str       # "SYNCED" / "APPROXIMATE" / "NOT AVAILABLE"
    time_delta: Optional[float]  # seconds between frame ts and nearest telemetry

    def to_dict(self) -> dict:
        if self.telemetry is None:
            return {
                "frame_timestamp": self.frame_timestamp,
                "sync_quality": self.sync_quality,
                "latitude": None,
                "longitude": None,
                "altitude": None,
                "roll": None,
                "pitch": None,
                "yaw": None,
                "heading": None,
                "speed": None,
                "time_delta": None,
            }
        return {
            "frame_timestamp": self.frame_timestamp,
            "sync_quality": self.sync_quality,
            "latitude": self.telemetry.latitude,
            "longitude": self.telemetry.longitude,
            "altitude": self.telemetry.altitude,
            "roll": self.telemetry.roll,
            "pitch": self.telemetry.pitch,
            "yaw": self.telemetry.yaw,
            "heading": self.telemetry.heading,
            "speed": self.telemetry.speed,
            "time_delta": self.time_delta,
        }


# Candidate column name mappings (case-insensitive)
_TS_COLS = {"timestamp", "time", "ts", "time_s", "time_sec", "elapsed"}
_LAT_COLS = {"latitude", "lat", "gps_lat"}
_LON_COLS = {"longitude", "lon", "lng", "gps_lon", "gps_lng"}
_ALT_COLS = {"altitude", "alt", "height", "altitude_m"}
_ROLL_COLS = {"roll", "roll_deg"}
_PITCH_COLS = {"pitch", "pitch_deg"}
_YAW_COLS = {"yaw", "yaw_deg"}
_HDG_COLS = {"heading", "hdg", "compass"}
_SPD_COLS = {"speed", "velocity", "ground_speed", "spd"}


def _find_col(headers: List[str], candidates: set) -> Optional[int]:
    for i, h in enumerate(headers):
        if h.lower().strip() in candidates:
            return i
    return None


def _safe_float(v: str) -> Optional[float]:
    try:
        return float(v.strip())
    except (ValueError, AttributeError):
        return None


class TelemetryParser:
    """Parses telemetry CSV and synchronizes records to frame timestamps."""

    def __init__(self):
        self._records: List[TelemetryRecord] = []
        self._available = False
        self._parse_error: Optional[str] = None

    @property
    def available(self) -> bool:
        return self._available

    @property
    def record_count(self) -> int:
        return len(self._records)

    def parse_file(self, path: str) -> bool:
        """Parse a telemetry CSV file. Returns True on success."""
        try:
            with open(path, newline="", encoding="utf-8-sig") as f:
                return self.parse_text(f.read())
        except FileNotFoundError:
            self._parse_error = f"Telemetry file not found: {path}"
            return False
        except Exception as e:
            self._parse_error = str(e)
            return False

    def parse_bytes(self, data: bytes) -> bool:
        """Parse telemetry from raw bytes (e.g. uploaded file)."""
        try:
            text = data.decode("utf-8-sig")
            return self.parse_text(text)
        except Exception as e:
            self._parse_error = str(e)
            return False

    def parse_text(self, text: str) -> bool:
        """Parse telemetry from CSV string."""
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if len(rows) < 2:
            self._parse_error = "Telemetry file has fewer than 2 rows"
            return False

        headers = rows[0]
        ts_idx = _find_col(headers, _TS_COLS)
        lat_idx = _find_col(headers, _LAT_COLS)
        lon_idx = _find_col(headers, _LON_COLS)
        alt_idx = _find_col(headers, _ALT_COLS)
        roll_idx = _find_col(headers, _ROLL_COLS)
        pitch_idx = _find_col(headers, _PITCH_COLS)
        yaw_idx = _find_col(headers, _YAW_COLS)
        hdg_idx = _find_col(headers, _HDG_COLS)
        spd_idx = _find_col(headers, _SPD_COLS)

        if ts_idx is None:
            self._parse_error = "No timestamp column found in telemetry CSV"
            return False

        records: List[TelemetryRecord] = []
        for row in rows[1:]:
            if not row or len(row) <= ts_idx:
                continue
            ts = _safe_float(row[ts_idx])
            if ts is None:
                continue
            records.append(TelemetryRecord(
                timestamp=ts,
                latitude=_safe_float(row[lat_idx]) if lat_idx is not None and lat_idx < len(row) else None,
                longitude=_safe_float(row[lon_idx]) if lon_idx is not None and lon_idx < len(row) else None,
                altitude=_safe_float(row[alt_idx]) if alt_idx is not None and alt_idx < len(row) else None,
                roll=_safe_float(row[roll_idx]) if roll_idx is not None and roll_idx < len(row) else None,
                pitch=_safe_float(row[pitch_idx]) if pitch_idx is not None and pitch_idx < len(row) else None,
                yaw=_safe_float(row[yaw_idx]) if yaw_idx is not None and yaw_idx < len(row) else None,
                heading=_safe_float(row[hdg_idx]) if hdg_idx is not None and hdg_idx < len(row) else None,
                speed=_safe_float(row[spd_idx]) if spd_idx is not None and spd_idx < len(row) else None,
            ))

        if not records:
            self._parse_error = "No valid telemetry records parsed"
            return False

        # Sort by timestamp
        records.sort(key=lambda r: r.timestamp)
        self._records = records
        self._available = True
        return True

    def sync_frame(self, frame_timestamp: float, max_delta: float = 1.0) -> SyncResult:
        """
        Find the nearest telemetry record for a given frame timestamp.
        Returns NOT AVAILABLE if telemetry is not loaded.
        """
        if not self._available or not self._records:
            return SyncResult(
                frame_timestamp=frame_timestamp,
                telemetry=None,
                sync_quality="NOT AVAILABLE",
                time_delta=None,
            )

        # Binary search for nearest
        lo, hi = 0, len(self._records) - 1
        best = self._records[0]
        best_delta = abs(self._records[0].timestamp - frame_timestamp)

        while lo <= hi:
            mid = (lo + hi) // 2
            delta = abs(self._records[mid].timestamp - frame_timestamp)
            if delta < best_delta:
                best_delta = delta
                best = self._records[mid]
            if self._records[mid].timestamp < frame_timestamp:
                lo = mid + 1
            else:
                hi = mid - 1

        if best_delta > max_delta:
            quality = "APPROXIMATE"
        else:
            quality = "SYNCED"

        return SyncResult(
            frame_timestamp=frame_timestamp,
            telemetry=best,
            sync_quality=quality,
            time_delta=round(best_delta, 4),
        )

    def get_all_records(self) -> List[TelemetryRecord]:
        return self._records

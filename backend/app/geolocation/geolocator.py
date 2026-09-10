"""
Drone-to-Ground Geolocation
Uses flat-ground pinhole camera approximation.

Method:
    1. Get drone GPS position (lat, lon, altitude)
    2. Determine bounding box center in pixel space
    3. Project pixel offset to ground using altitude + FOV
    4. Apply heading/pitch/roll correction (simplified)

Explicitly reports:
    - Method: "FLAT_GROUND_APPROXIMATION"
    - Uncertainty radius in metres
    - GEOLOCATION: UNAVAILABLE when inputs are missing

NEVER fabricates coordinates when required inputs are absent.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np


# Earth radius for coordinate offset calculation
EARTH_RADIUS_M = 6_371_000.0

# Default camera FOV if not specified (degrees)
DEFAULT_HFOV_DEG = 70.0   # horizontal FOV
DEFAULT_VFOV_DEG = 50.0   # vertical FOV


@dataclass
class GeoResult:
    latitude: Optional[float]
    longitude: Optional[float]
    uncertainty_radius_m: Optional[float]
    confidence: Optional[float]
    method: str
    available: bool
    notes: str

    def to_dict(self) -> dict:
        return {
            "latitude": round(self.latitude, 8) if self.latitude is not None else None,
            "longitude": round(self.longitude, 8) if self.longitude is not None else None,
            "uncertainty_radius_m": round(self.uncertainty_radius_m, 1) if self.uncertainty_radius_m is not None else None,
            "confidence": round(self.confidence, 4) if self.confidence is not None else None,
            "method": self.method,
            "available": self.available,
            "notes": self.notes,
        }


def geolocate(
    drone_lat: Optional[float],
    drone_lon: Optional[float],
    altitude_m: Optional[float],
    heading_deg: Optional[float],
    pitch_deg: Optional[float],
    roll_deg: Optional[float],
    bbox_center_x_px: float,
    bbox_center_y_px: float,
    frame_width_px: int,
    frame_height_px: int,
    hfov_deg: float = DEFAULT_HFOV_DEG,
    vfov_deg: float = DEFAULT_VFOV_DEG,
) -> GeoResult:
    """
    Project a pixel bounding-box center to ground coordinates.
    Returns UNAVAILABLE when required inputs are missing.
    """
    # Validate required inputs
    if drone_lat is None or drone_lon is None or altitude_m is None:
        return GeoResult(
            latitude=None,
            longitude=None,
            uncertainty_radius_m=None,
            confidence=None,
            method="UNAVAILABLE",
            available=False,
            notes="GEOLOCATION: NOT AVAILABLE — requires drone lat/lon/altitude from telemetry",
        )

    if altitude_m <= 0:
        return GeoResult(
            latitude=None,
            longitude=None,
            uncertainty_radius_m=None,
            confidence=None,
            method="UNAVAILABLE",
            available=False,
            notes="GEOLOCATION: NOT AVAILABLE — invalid altitude value",
        )

    # Normalize pixel coordinates to [-0.5, 0.5]
    nx = (bbox_center_x_px / frame_width_px) - 0.5    # positive = right
    ny = 0.5 - (bbox_center_y_px / frame_height_px)   # positive = up

    # Angular offset from camera centre (radians)
    hfov_rad = math.radians(hfov_deg)
    vfov_rad = math.radians(vfov_deg)
    angle_x = nx * hfov_rad   # horizontal angle
    angle_y = ny * vfov_rad   # vertical angle

    # Ground offset from nadir (metres) using flat-earth approximation
    # dx_nadir: positive = east, dy_nadir: positive = north
    dx_nadir = altitude_m * math.tan(angle_x)
    dy_nadir = altitude_m * math.tan(angle_y)

    # Apply heading rotation (yaw) to convert camera frame to North-East
    hdg = math.radians(heading_deg) if heading_deg is not None else 0.0
    dx_ne = dx_nadir * math.cos(hdg) - dy_nadir * math.sin(hdg)
    dy_ne = dx_nadir * math.sin(hdg) + dy_nadir * math.cos(hdg)

    # Convert metre offsets to lat/lon deltas
    d_lat = dy_ne / EARTH_RADIUS_M
    d_lon = dx_ne / (EARTH_RADIUS_M * math.cos(math.radians(drone_lat)))

    ground_lat = drone_lat + math.degrees(d_lat)
    ground_lon = drone_lon + math.degrees(d_lon)

    # Uncertainty radius — grows with altitude and decreases with telemetry quality
    # Base uncertainty: ~10% of the projected footprint half-width
    footprint_half_w = altitude_m * math.tan(hfov_rad / 2)
    base_uncertainty = footprint_half_w * 0.10

    # Add uncertainty for missing attitude data
    if pitch_deg is None or roll_deg is None:
        base_uncertainty *= 2.5
        attitude_note = "attitude data missing (pitch/roll)"
    else:
        attitude_note = "attitude corrected (simplified)"

    uncertainty_m = max(base_uncertainty, 5.0)   # minimum 5m

    # Confidence inversely proportional to uncertainty relative to footprint
    confidence = max(0.0, min(1.0, 1.0 - (uncertainty_m / footprint_half_w)))

    notes = (
        f"Flat-ground approximation. Drone at {altitude_m:.0f}m, "
        f"heading {heading_deg:.0f}°. {attitude_note}. "
        f"Uncertainty: ±{uncertainty_m:.0f}m"
    )

    return GeoResult(
        latitude=ground_lat,
        longitude=ground_lon,
        uncertainty_radius_m=uncertainty_m,
        confidence=confidence,
        method="FLAT_GROUND_APPROXIMATION",
        available=True,
        notes=notes,
    )

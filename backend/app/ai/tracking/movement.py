"""
Movement Analysis
Estimates movement state from bounding-box center displacement across frames.

States:
    MOVING          - significant displacement per frame
    LOW_MOVEMENT    - small but detectable displacement
    STATIONARY      - negligible displacement
    OCCLUDED        - track was absent
    UNKNOWN         - insufficient data

IMPORTANT: STATIONARY does NOT imply death or incapacity.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

MOVING = "MOVING"
LOW_MOVEMENT = "LOW MOVEMENT"
STATIONARY = "STATIONARY"
OCCLUDED = "OCCLUDED"
UNKNOWN = "UNKNOWN"

# Pixel displacement thresholds (per frame, normalized to frame diagonal)
MOVING_THRESHOLD = 0.015       # > 1.5% of frame diagonal = MOVING
LOW_MOVEMENT_THRESHOLD = 0.003  # 0.3–1.5% = LOW MOVEMENT
# < 0.3% = STATIONARY


def compute_movement_state(
    centers: List[Tuple[float, float]],
    frame_width: int,
    frame_height: int,
    track_lifecycle: str,
) -> Tuple[str, Optional[float]]:
    """
    Compute movement state from a list of bounding-box centers.

    Returns:
        (state, avg_displacement_per_frame_normalized)
    """
    if track_lifecycle == "TEMPORARILY_OCCLUDED":
        return OCCLUDED, None

    if len(centers) < 2:
        return UNKNOWN, None

    frame_diagonal = (frame_width ** 2 + frame_height ** 2) ** 0.5
    if frame_diagonal == 0:
        return UNKNOWN, None

    displacements = []
    for i in range(1, len(centers)):
        dx = centers[i][0] - centers[i - 1][0]
        dy = centers[i][1] - centers[i - 1][1]
        dist = (dx ** 2 + dy ** 2) ** 0.5
        displacements.append(dist / frame_diagonal)

    avg_disp = sum(displacements) / len(displacements)

    if avg_disp > MOVING_THRESHOLD:
        state = MOVING
    elif avg_disp > LOW_MOVEMENT_THRESHOLD:
        state = LOW_MOVEMENT
    else:
        state = STATIONARY

    return state, round(avg_disp, 6)

"""
Evidence Chain Engine
Builds and stores per-track evidence chains.
Detects evidence conflicts and sets HUMAN REVIEW REQUIRED flags.

Each evidence item records: source, availability, quality, value, notes.
Evidence is NEVER fabricated. Unavailable evidence is explicitly stated.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Evidence quality tiers
HIGH = "HIGH"
MEDIUM = "MEDIUM"
LOW = "LOW"
NOT_AVAILABLE = "NOT AVAILABLE"
UNKNOWN = "UNKNOWN"


@dataclass
class EvidenceItem:
    source: str                    # e.g. "RGB_DETECTION", "TRACK_PERSISTENCE", "TELEMETRY"
    available: bool
    quality: str                   # HIGH / MEDIUM / LOW / NOT_AVAILABLE / UNKNOWN
    value: Any                     # The actual value (conf score, frame count, etc.)
    notes: str
    frame_number: Optional[int] = None
    timestamp_seconds: Optional[float] = None
    track_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "available": self.available,
            "quality": self.quality,
            "value": self.value,
            "notes": self.notes,
            "frame_number": self.frame_number,
            "timestamp_seconds": self.timestamp_seconds,
            "track_id": self.track_id,
        }


@dataclass
class EvidenceChain:
    track_id: str
    items: List[EvidenceItem] = field(default_factory=list)
    has_conflict: bool = False
    conflict_description: Optional[str] = None
    overall_quality: str = UNKNOWN
    human_review_required: bool = False

    def add(self, item: EvidenceItem):
        self.items.append(item)

    def compute_quality_and_conflicts(self):
        """
        Assess overall evidence quality and detect conflicts.
        Conflict example: high detection confidence but low thermal confidence.
        """
        available = [i for i in self.items if i.available]
        total = len(self.items)
        avail_count = len(available)

        if avail_count == 0:
            self.overall_quality = NOT_AVAILABLE
            return

        # Quality distribution
        high_count = sum(1 for i in available if i.quality == HIGH)
        medium_count = sum(1 for i in available if i.quality == MEDIUM)
        low_count = sum(1 for i in available if i.quality == LOW)

        if high_count >= 3 and low_count == 0:
            self.overall_quality = HIGH
        elif high_count + medium_count >= 3:
            self.overall_quality = MEDIUM
        else:
            self.overall_quality = LOW

        # Conflict detection: check for high vs low mismatch across key evidence types
        detection_q = self._get_quality("RGB_DETECTION")
        tracking_q = self._get_quality("TRACK_PERSISTENCE")
        thermal_q = self._get_quality("THERMAL")

        conflicts = []

        if (
            detection_q == HIGH
            and thermal_q == LOW
            and thermal_q != NOT_AVAILABLE
        ):
            conflicts.append("RGB confidence HIGH but thermal evidence LOW")

        if (
            detection_q == HIGH
            and tracking_q == LOW
        ):
            conflicts.append("Detection confidence HIGH but track persistence LOW")

        if len(conflicts) > 0:
            self.has_conflict = True
            self.conflict_description = "; ".join(conflicts)
            self.human_review_required = True
        else:
            self.has_conflict = False
            self.human_review_required = avail_count < (total / 2)

    def _get_quality(self, source: str) -> str:
        for item in self.items:
            if item.source == source:
                if not item.available:
                    return NOT_AVAILABLE
                return item.quality
        return NOT_AVAILABLE

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "items": [i.to_dict() for i in self.items],
            "has_conflict": self.has_conflict,
            "conflict_description": self.conflict_description,
            "overall_quality": self.overall_quality,
            "human_review_required": self.human_review_required,
            "available_count": sum(1 for i in self.items if i.available),
            "total_count": len(self.items),
        }


def build_evidence_chain(
    track_id: str,
    detection_confidence: float,
    frame_count: int,
    movement_state: str,
    movement_disp: Optional[float],
    telemetry_available: bool,
    telemetry_quality: str,
    thermal_available: bool,
    thermal_confidence: Optional[float],
    geolocation_confidence: Optional[float],
    frame_number: int,
    timestamp: float,
) -> EvidenceChain:
    """
    Assemble a complete evidence chain for a track candidate.
    Never fabricates unavailable evidence.
    """
    chain = EvidenceChain(track_id=track_id)

    # 1. RGB Detection
    det_quality = HIGH if detection_confidence >= 0.80 else (MEDIUM if detection_confidence >= 0.60 else LOW)
    chain.add(EvidenceItem(
        source="RGB_DETECTION",
        available=True,
        quality=det_quality,
        value=round(detection_confidence, 4),
        notes=f"Person detection confidence: {detection_confidence:.1%}",
        frame_number=frame_number,
        timestamp_seconds=timestamp,
        track_id=track_id,
    ))

    # 2. Track Persistence
    if frame_count >= 10:
        track_quality = HIGH
        track_note = f"Track persistent across {frame_count} frames"
    elif frame_count >= 4:
        track_quality = MEDIUM
        track_note = f"Track seen in {frame_count} frames (moderate persistence)"
    else:
        track_quality = LOW
        track_note = f"Track seen in only {frame_count} frames (weak persistence)"

    chain.add(EvidenceItem(
        source="TRACK_PERSISTENCE",
        available=True,
        quality=track_quality,
        value=frame_count,
        notes=track_note,
        track_id=track_id,
    ))

    # 3. Movement Evidence
    movement_available = movement_state not in ("UNKNOWN", "OCCLUDED")
    movement_quality = MEDIUM if movement_available else LOW
    chain.add(EvidenceItem(
        source="MOVEMENT",
        available=movement_available,
        quality=movement_quality if movement_available else NOT_AVAILABLE,
        value=movement_state,
        notes=f"Movement state: {movement_state}. NOTE: STATIONARY does not indicate death.",
        track_id=track_id,
    ))

    # 4. Thermal Evidence
    if thermal_available and thermal_confidence is not None:
        therm_quality = HIGH if thermal_confidence >= 0.75 else (MEDIUM if thermal_confidence >= 0.50 else LOW)
        chain.add(EvidenceItem(
            source="THERMAL",
            available=True,
            quality=therm_quality,
            value=round(thermal_confidence, 4),
            notes=f"Thermal signature confidence: {thermal_confidence:.1%}",
            track_id=track_id,
        ))
    else:
        chain.add(EvidenceItem(
            source="THERMAL",
            available=False,
            quality=NOT_AVAILABLE,
            value=None,
            notes="THERMAL: NOT AVAILABLE — no thermal video provided",
            track_id=track_id,
        ))

    # 5. Telemetry Synchronization
    chain.add(EvidenceItem(
        source="TELEMETRY",
        available=telemetry_available,
        quality=telemetry_quality if telemetry_available else NOT_AVAILABLE,
        value="SYNCED" if telemetry_available else "NOT AVAILABLE",
        notes=(
            "Telemetry data synchronized with frame timestamp"
            if telemetry_available
            else "TELEMETRY: NOT AVAILABLE — no telemetry file provided"
        ),
        frame_number=frame_number,
        timestamp_seconds=timestamp,
        track_id=track_id,
    ))

    # 6. Geolocation
    if geolocation_confidence is not None:
        geo_quality = HIGH if geolocation_confidence >= 0.75 else (MEDIUM if geolocation_confidence >= 0.50 else LOW)
        chain.add(EvidenceItem(
            source="GEOLOCATION",
            available=True,
            quality=geo_quality,
            value=round(geolocation_confidence, 4),
            notes=f"Location confidence: {geolocation_confidence:.1%} (flat-ground approximation)",
            track_id=track_id,
        ))
    else:
        chain.add(EvidenceItem(
            source="GEOLOCATION",
            available=False,
            quality=NOT_AVAILABLE,
            value=None,
            notes="GEOLOCATION: NOT AVAILABLE — requires telemetry with lat/lon/altitude",
            track_id=track_id,
        ))

    chain.compute_quality_and_conflicts()
    return chain

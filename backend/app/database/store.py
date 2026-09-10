"""
SQLite-based persistence store.
Provides a database-independent interface for storing analysis results.
Falls back to in-memory dict if SQLite is unavailable.

Schema:
    analyses        — analysis sessions
    detections      — raw detections per frame
    tracks          — persistent track records
    evidence        — evidence chain items
    survivor_candidates — scored candidates
    reviews         — human review decisions
    telemetry       — parsed telemetry records
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).parent.parent.parent / "data" / "lifeline_x.db"


def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


_lock = threading.Lock()

def _init_schema(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            incident_id TEXT,
            video_filename TEXT,
            video_path TEXT,
            status TEXT,
            mode TEXT,
            created_at REAL,
            updated_at REAL,
            meta_json TEXT,
            frame_count INTEGER DEFAULT 0,
            processed_frames INTEGER DEFAULT 0,
            fps REAL,
            duration_seconds REAL
        );

        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            frame_number INTEGER,
            timestamp_seconds REAL,
            track_lx_id TEXT,
            category TEXT,
            class_name TEXT,
            confidence REAL,
            bbox_json TEXT,
            center_json TEXT,
            model_name TEXT
        );

        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            track_id TEXT,
            category TEXT,
            class_name TEXT,
            first_seen_frame INTEGER,
            first_seen_ts REAL,
            last_seen_frame INTEGER,
            last_seen_ts REAL,
            frame_count INTEGER,
            lifecycle TEXT,
            avg_confidence REAL,
            latest_bbox_json TEXT,
            UNIQUE(analysis_id, track_id)
        );

        CREATE TABLE IF NOT EXISTS evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            track_id TEXT,
            source TEXT,
            available INTEGER,
            quality TEXT,
            value_json TEXT,
            notes TEXT,
            frame_number INTEGER,
            timestamp_seconds REAL
        );

        CREATE TABLE IF NOT EXISTS survivor_candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            track_id TEXT,
            survivor_confidence REAL,
            rescue_priority TEXT,
            priority_reason TEXT,
            score_breakdown_json TEXT,
            evidence_conflict INTEGER,
            evidence_quality TEXT,
            movement_state TEXT,
            detection_confidence REAL,
            frame_count INTEGER,
            lat REAL,
            lon REAL,
            uncertainty_m REAL,
            geolocation_method TEXT,
            human_review_status TEXT DEFAULT 'PENDING',
            human_decision TEXT,
            reviewed_at REAL,
            created_at REAL,
            UNIQUE(analysis_id, track_id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            track_id TEXT,
            decision TEXT,
            notes TEXT,
            reviewed_by TEXT,
            reviewed_at REAL
        );

        CREATE TABLE IF NOT EXISTS telemetry_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT,
            frame_timestamp REAL,
            sync_quality TEXT,
            lat REAL,
            lon REAL,
            altitude REAL,
            roll REAL,
            pitch REAL,
            yaw REAL,
            heading REAL,
            speed REAL,
            time_delta REAL
        );
    """)
    conn.commit()


class DataStore:
    """Database-independent persistence interface backed by SQLite."""

    def __init__(self):
        try:
            self._conn = _get_conn()
            _init_schema(self._conn)
            self._available = True
        except Exception as e:
            self._conn = None
            self._available = False
            self._error = str(e)
            # Fallback in-memory storage
            self._mem: Dict[str, Any] = {
                "analyses": {},
                "tracks": {},
                "evidence": {},
                "candidates": {},
                "reviews": [],
            }

    @property
    def available(self) -> bool:
        return self._available

    # ─── Analysis ────────────────────────────────────────────────────────────

    def create_analysis(self, analysis_id: str, incident_id: str, video_filename: str,
                         video_path: str, fps: float = 0, frame_count: int = 0,
                         duration: float = 0) -> bool:
        now = time.time()
        if self._conn:
            with _lock:
                try:
                    self._conn.execute(
                        """INSERT OR REPLACE INTO analyses
                           (id, incident_id, video_filename, video_path, status, mode,
                            created_at, updated_at, meta_json, fps, frame_count, duration_seconds)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (analysis_id, incident_id, video_filename, video_path,
                         "PENDING", "RECORDED_REPLAY", now, now, "{}", fps, frame_count, duration)
                    )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            self._mem["analyses"][analysis_id] = {
                "id": analysis_id, "status": "PENDING", "created_at": now
            }
            return True

    def update_analysis_status(self, analysis_id: str, status: str,
                                 processed_frames: Optional[int] = None) -> bool:
        if self._conn:
            with _lock:
                try:
                    if processed_frames is not None:
                        self._conn.execute(
                            "UPDATE analyses SET status=?, updated_at=?, processed_frames=? WHERE id=?",
                            (status, time.time(), processed_frames, analysis_id)
                        )
                    else:
                        self._conn.execute(
                            "UPDATE analyses SET status=?, updated_at=? WHERE id=?",
                            (status, time.time(), analysis_id)
                        )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            if analysis_id in self._mem["analyses"]:
                self._mem["analyses"][analysis_id]["status"] = status
            return True

    def get_analysis(self, analysis_id: str) -> Optional[dict]:
        if self._conn:
            with _lock:
                row = self._conn.execute(
                    "SELECT * FROM analyses WHERE id=?", (analysis_id,)
                ).fetchone()
                return dict(row) if row else None
        else:
            return self._mem["analyses"].get(analysis_id)

    def list_analyses(self) -> List[dict]:
        if self._conn:
            with _lock:
                q = """
                SELECT a.*,
                       (SELECT COUNT(*) FROM survivor_candidates sc WHERE sc.analysis_id = a.id AND sc.track_id NOT LIKE 'AN-%') as candidate_count,
                       (SELECT COUNT(*) FROM survivor_candidates sc WHERE sc.analysis_id = a.id AND sc.rescue_priority = 'CRITICAL' AND sc.track_id NOT LIKE 'AN-%') as critical_count,
                       (SELECT COUNT(*) FROM survivor_candidates sc WHERE sc.analysis_id = a.id AND sc.rescue_priority = 'HIGH' AND sc.track_id NOT LIKE 'AN-%') as high_count,
                       (SELECT COUNT(*) FROM survivor_candidates sc WHERE sc.analysis_id = a.id AND sc.rescue_priority = 'VERIFY' AND sc.track_id NOT LIKE 'AN-%') as verify_count
                FROM analyses a ORDER BY a.created_at DESC
                """
                rows = self._conn.execute(q).fetchall()
                return [dict(r) for r in rows]
        else:
            return list(self._mem["analyses"].values())

    # ─── Tracks ──────────────────────────────────────────────────────────────

    def upsert_track(self, analysis_id: str, track_data: dict) -> bool:
        if self._conn:
            with _lock:
                try:
                    self._conn.execute(
                        """INSERT OR REPLACE INTO tracks
                           (analysis_id, track_id, category, class_name,
                            first_seen_frame, first_seen_ts, last_seen_frame, last_seen_ts,
                            frame_count, lifecycle, avg_confidence, latest_bbox_json)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (
                            analysis_id,
                            track_data["track_id"],
                            track_data.get("category", ""),
                            track_data.get("class_name", ""),
                            track_data.get("first_seen_frame", 0),
                            track_data.get("first_seen_ts", 0.0),
                            track_data.get("last_seen_frame", 0),
                            track_data.get("last_seen_ts", 0.0),
                            track_data.get("frame_count", 0),
                            track_data.get("lifecycle", "ACTIVE"),
                            track_data.get("avg_confidence", 0.0),
                            json.dumps(track_data.get("latest_bbox")),
                        )
                    )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            key = f"{analysis_id}:{track_data['track_id']}"
            self._mem["tracks"][key] = track_data
            return True

    def get_tracks(self, analysis_id: str) -> List[dict]:
        if self._conn:
            with _lock:
                rows = self._conn.execute(
                    "SELECT * FROM tracks WHERE analysis_id=? ORDER BY track_id",
                    (analysis_id,)
                ).fetchall()
                return [dict(r) for r in rows]
        else:
            return [v for k, v in self._mem["tracks"].items() if k.startswith(analysis_id + ":")]

    # ─── Evidence ────────────────────────────────────────────────────────────

    def save_evidence(self, analysis_id: str, evidence_data: dict) -> bool:
        if self._conn:
            with _lock:
                try:
                    # Delete existing evidence for this track
                    self._conn.execute(
                        "DELETE FROM evidence WHERE analysis_id=? AND track_id=?",
                        (analysis_id, evidence_data["track_id"])
                    )
                    for item in evidence_data.get("items", []):
                        self._conn.execute(
                            """INSERT INTO evidence
                               (analysis_id, track_id, source, available, quality,
                                value_json, notes, frame_number, timestamp_seconds)
                               VALUES (?,?,?,?,?,?,?,?,?)""",
                            (
                                analysis_id,
                                evidence_data["track_id"],
                                item["source"],
                                1 if item["available"] else 0,
                                item["quality"],
                                json.dumps(item["value"]),
                                item["notes"],
                                item.get("frame_number"),
                                item.get("timestamp_seconds"),
                            )
                        )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            self._mem["evidence"][evidence_data["track_id"]] = evidence_data
            return True

    def get_evidence(self, analysis_id: str, track_id: str) -> Optional[dict]:
        if self._conn:
            with _lock:
                rows = self._conn.execute(
                    "SELECT * FROM evidence WHERE analysis_id=? AND track_id=?",
                    (analysis_id, track_id)
                ).fetchall()
                if not rows:
                    return None
                items = []
                for r in rows:
                    items.append({
                        "source": r["source"],
                        "available": bool(r["available"]),
                        "quality": r["quality"],
                        "value": json.loads(r["value_json"]) if r["value_json"] else None,
                        "notes": r["notes"],
                        "frame_number": r["frame_number"],
                        "timestamp_seconds": r["timestamp_seconds"],
                        "track_id": track_id,
                    })
                return {"track_id": track_id, "items": items}
        else:
            return self._mem["evidence"].get(track_id)

    # ─── Survivor Candidates ─────────────────────────────────────────────────

    def upsert_survivor_candidate(self, analysis_id: str, candidate: dict) -> bool:
        if self._conn:
            with _lock:
                try:
                    self._conn.execute(
                        """INSERT OR REPLACE INTO survivor_candidates
                           (analysis_id, track_id, survivor_confidence, rescue_priority,
                            priority_reason, score_breakdown_json, evidence_conflict,
                            evidence_quality, movement_state, detection_confidence, frame_count,
                            lat, lon, uncertainty_m, geolocation_method,
                            human_review_status, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (
                            analysis_id,
                            candidate["track_id"],
                            candidate.get("survivor_confidence", 0.0),
                            candidate.get("rescue_priority", "VERIFY"),
                            candidate.get("priority_reason", ""),
                            json.dumps(candidate.get("score_breakdown", {})),
                            1 if candidate.get("evidence_conflict") else 0,
                            candidate.get("evidence_quality", "UNKNOWN"),
                            candidate.get("movement_state", "UNKNOWN"),
                            candidate.get("detection_confidence", 0.0),
                            candidate.get("frame_count", 0),
                            candidate.get("latitude"),
                            candidate.get("longitude"),
                            candidate.get("uncertainty_m"),
                            candidate.get("geolocation_method", "UNAVAILABLE"),
                            candidate.get("human_review_status", "PENDING"),
                            time.time(),
                        )
                    )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            self._mem["candidates"][candidate["track_id"]] = candidate
            return True

    def get_survivor_candidates(self, analysis_id: str) -> List[dict]:
        if self._conn:
            with _lock:
                rows = self._conn.execute(
                    """SELECT * FROM survivor_candidates
                       WHERE analysis_id=?
                       ORDER BY survivor_confidence DESC""",
                    (analysis_id,)
                ).fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["score_breakdown"] = json.loads(d.get("score_breakdown_json") or "{}")
                    d["evidence_conflict"] = bool(d["evidence_conflict"])
                    results.append(d)
                return results
        else:
            return list(self._mem["candidates"].values())

    def get_survivor_candidate(self, track_id: str, analysis_id: Optional[str] = None) -> Optional[dict]:
        if self._conn:
            with _lock:
                if analysis_id:
                    row = self._conn.execute(
                        "SELECT * FROM survivor_candidates WHERE track_id=? AND analysis_id=?",
                        (track_id, analysis_id),
                    ).fetchone()
                else:
                    row = self._conn.execute(
                        "SELECT * FROM survivor_candidates WHERE track_id=? ORDER BY created_at DESC",
                        (track_id,),
                    ).fetchone()
                if not row:
                    return None
                d = dict(row)
                d["score_breakdown"] = json.loads(d.get("score_breakdown_json") or "{}")
                d["evidence_conflict"] = bool(d["evidence_conflict"])
                return d
        else:
            return self._mem["candidates"].get(track_id)

    # ─── Reviews ─────────────────────────────────────────────────────────────

    def save_review(self, analysis_id: str, track_id: str, decision: str,
                     notes: str = "", reviewed_by: str = "OPERATOR") -> bool:
        now = time.time()
        if self._conn:
            with _lock:
                try:
                    self._conn.execute(
                        """INSERT INTO reviews
                           (analysis_id, track_id, decision, notes, reviewed_by, reviewed_at)
                           VALUES (?,?,?,?,?,?)""",
                        (analysis_id, track_id, decision, notes, reviewed_by, now)
                    )
                    # Update candidate review status
                    self._conn.execute(
                        """UPDATE survivor_candidates
                           SET human_review_status=?, human_decision=?, reviewed_at=?
                           WHERE track_id=? AND analysis_id=?""",
                        (decision, decision, now, track_id, analysis_id)
                    )
                    self._conn.commit()
                    return True
                except Exception:
                    return False
        else:
            self._mem["reviews"].append({
                "analysis_id": analysis_id,
                "track_id": track_id,
                "decision": decision,
                "notes": notes,
                "reviewed_at": now,
            })
            return True

    def get_all_analyses_candidates(self) -> List[dict]:
        """Get all candidates across all analyses (for global survivors view)."""
        if self._conn:
            with _lock:
                rows = self._conn.execute(
                    "SELECT * FROM survivor_candidates ORDER BY survivor_confidence DESC"
                ).fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["score_breakdown"] = json.loads(d.get("score_breakdown_json") or "{}")
                    d["evidence_conflict"] = bool(d["evidence_conflict"])
                    results.append(d)
                return results
        else:
            return list(self._mem["candidates"].values())


# Singleton
_store: Optional[DataStore] = None

def get_store() -> DataStore:
    global _store
    if _store is None:
        _store = DataStore()
    return _store

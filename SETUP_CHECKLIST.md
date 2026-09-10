# LIFELINE-X — POST-IMPLEMENTATION SETUP CHECKLIST

This document details **exact instructions and configurations** for running, deploying, and operating LIFELINE-X.

---

## A. ALREADY IMPLEMENTED & VERIFIED BY AI

- [x] **Frontend React App**: Vite + React 19 + TypeScript + TailwindCSS.
- [x] **Strict Sidebar Isolation**: 8 dedicated pages — one sidebar click renders exactly one feature (zero feature duplication).
- [x] **Live Camera Removal**: Live camera completely removed; primary mode is Recorded Drone Video Ingestion & Analysis.
- [x] **Dashboard Mission Control**: Real-time KPI stats, active analysis summary, recent detections log (no repeated sidebar tiles).
- [x] **Recorded Drone Video Analysis**: Full 12-stage automated pipeline from video/telemetry upload to map routing.
- [x] **4K UHD Handling**: Native 4K UHD (3840×2160) preservation vs AI upscaled labeling with zero false claims.
- [x] **Tactical Disaster Response Map**: MapLibre GL WGS84 GIS map with drone flight path, search swath, survivor markers, and uncertainty circles.
- [x] **Survivor Marker Interaction**: Click any marker to open focused intelligence panel (Confidences, Movement, Location, Uncertainty, Evidence).
- [x] **Emergency Routing Engine**: Real OSRM road network routing from responder start location to survivor candidate (distance, ETA, route line).
- [x] **Survivors Triage**: Critical / High / Verify queue, conflict detection, and human review actions.
- [x] **Evidence Chain Investigation**: Multi-modal provenance trace explaining why AI flagged each candidate.
- [x] **Search Coverage**: Sensor corridor mapping and gap analysis.
- [x] **Evaluation Integrity**: Benchmarks with strict honesty (`NOT MEASURED` for unvalidated metrics).
- [x] **11-Subsystem Health Diagnostic**: Active health monitors for backend, AI model, database, and routing.
- [x] **Backend FastAPI**: Async REST API serving all endpoints + static production frontend bundle.
- [x] **AI Models**: YOLOv8n detector (`backend/yolov8n.pt`) + ByteTrack tracking.

---

## B. RUNNING THE APPLICATION

### 1. Start FastAPI Backend (Port 8000)

```powershell
cd c:\LIFELINE-X\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Start Frontend Dev Server (Port 5173)

```powershell
cd c:\LIFELINE-X\frontend
npm run dev
```

*FastAPI also automatically serves the built static frontend production bundle at `http://localhost:8000`.*

---

## C. ENVIRONMENT CONFIGURATION & API KEYS

| Service | Status | Environment Variable | Notes |
|---------|--------|---------------------|-------|
| OpenStreetMap raster tiles | Active | N/A | Free raster tiles (no API key required) |
| OSRM Emergency Routing | Active | `ROUTING_API_URL` | Defaults to public OSRM engine; can point to local OSRM Docker container |
| Optional Map Tile Provider | Optional | `VITE_MAP_TILE_URL` | Set in `frontend/.env` if using custom vector tiles |
| Optional Supabase Cloud DB | Optional | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Set in `backend/.env` for cloud database sync |

---

## D. OPERATOR WORKFLOW: RECORDED DRONE VIDEO

1. Open **[http://localhost:5173](http://localhost:5173)**.
2. Navigate to **ANALYSIS** in the sidebar.
3. Attach recorded UAV drone video (`.mp4`, `.mov`, `.mkv`, `.webm`).
4. (Optional) Attach UAV flight telemetry `.csv` (`lat,lon,alt,heading,pitch,roll`).
5. Click **LAUNCH INGESTION & AI ANALYSIS PIPELINE**.
6. View real-time progress bar and candidate counters.
7. Click **REVIEW SURVIVOR CANDIDATES** or **VIEW LOCATIONS ON MAP**.
8. On the **MAP**, click any survivor marker to view candidate intelligence and click **GET BEST ROUTE** to calculate emergency responder navigation.

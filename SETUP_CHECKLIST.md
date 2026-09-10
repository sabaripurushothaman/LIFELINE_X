# LIFELINE-X — SETUP CHECKLIST

This document tells you **exactly what to do** after the AI finishes implementation.

---

## A. ALREADY IMPLEMENTED BY AI

- [x] Frontend React app (Vite + TypeScript + TailwindCSS)
- [x] All 9 sidebar pages fully isolated (one page = one feature)
- [x] Dashboard — concise mission overview (no duplicate feature implementations)
- [x] Live Camera page — video upload, playback, metadata, resolution labels (NATIVE 4K / AI UPSCALED)
- [x] Analysis page — video + telemetry upload, pipeline trigger, real-time progress poll
- [x] Survivors page — priority triage list, WHY DID AI FLAG THIS, human review actions
- [x] Evidence Chain — step-by-step provenance chain, conflict detection, human review
- [x] Map page — MapLibre-GL tactical map, survivor markers, uncertainty circles, emergency routing UI
- [x] Emergency routing — OSRM integration with real road network (no fake straight lines)
- [x] Search Coverage — UAV corridor visualization, flight path, gap detection
- [x] Evaluation — integrity-first metrics, NOT MEASURED labels where unevaluated
- [x] System Health — real backend component status, auto-refresh every 10s
- [x] Backend FastAPI — health, analysis, survivors, evidence, reviews, export, evaluation, routing
- [x] YOLOv8n model — present at `backend/yolov8n.pt`
- [x] ByteTrack object tracking via Ultralytics
- [x] SQLite database — stores analyses, survivors, evidence, reviews
- [x] Telemetry CSV parser — timestamp synchronization ready
- [x] Geolocation engine — flat-ground pinhole camera projection to WGS84
- [x] Evidence conflict detection — shows when RGB vs thermal vs movement disagree
- [x] Demo Mode — clearly labelled, never mixed with real data
- [x] Offline graceful degradation — backend offline shows "NOT AVAILABLE" (no crash)
- [x] Anti-fabrication policy — "NOT MEASURED", "NOT AVAILABLE", "NOT CONFIGURED" used correctly

---

## B. THINGS YOU MUST CONFIGURE

### 1. Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source venv/bin/activate
```

### 2. Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **GPU Acceleration (Optional but recommended)**
> If you have an NVIDIA GPU with CUDA:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
> ```
> Then reinstall ultralytics: `pip install ultralytics`

### 3. Frontend Dependencies

```bash
cd frontend
npm install
```

---

## C. API KEYS

| Service | Required? | Environment Variable | How to Get |
|---------|-----------|---------------------|------------|
| OpenStreetMap tiles | NO — already free | N/A | No key needed |
| OSRM Emergency Routing | NO — uses public demo | `ROUTING_API_URL` | Optional: Deploy your own OSRM instance |
| MapTiler / Mapbox | OPTIONAL | `VITE_MAP_TILE_URL` | Sign up at maptiler.com or mapbox.com |
| Supabase | OPTIONAL | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Sign up at supabase.com |

**Where to enter API keys:**
- Backend variables: Create `backend/.env` file (or set system env vars)
- Frontend variables: Create `frontend/.env.local` (copy from `frontend/.env.example`)

---

## D. CAMERA SETUP

Currently: **Recorded video replay only.**

For live camera (future):
1. Connect USB camera or IP camera
2. Configure WebRTC or OpenCV camera capture in backend
3. Update `LiveCamera.tsx` to request `getUserMedia()` from browser

The system will show `LIVE CAMERA: NOT CONNECTED` in System Health until configured.

---

## E. VIDEO SETUP

### Supported formats
`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`

### Recommended workflow
1. Go to **Analysis** page in the app
2. Upload your UAV video (drag & drop or click)
3. Upload telemetry CSV (optional — enables GPS mapping)
4. Set incident ID (e.g., `FLOOD-001`)
5. Set frame sampling (default: every 5 frames = ~6 FPS inference)
6. Click **LAUNCH INGESTION & AI ANALYSIS PIPELINE**
7. Wait for completion — results appear in Survivors, Evidence Chain, and Map

---

## F. 4K VIDEO SETUP

### Native 4K
- Upload any video ≥ 3840×2160 — labelled **NATIVE 4K** automatically
- No special configuration needed

### AI Upscaling (not implemented — for future)
- If implemented, would label output as **AI UPSCALED TO 4K** (never "NATIVE 4K")
- The system currently preserves original resolution — never silently downscales

---

## G. TELEMETRY SETUP

CSV format expected (columns, any order):
```
timestamp,latitude,longitude,altitude,roll,pitch,yaw
1704067200.000,13.04218,80.16431,82.0,0.2,-3.1,185.4
...
```

- `timestamp`: Unix epoch (seconds) or ISO8601 string
- `latitude`, `longitude`: WGS84 decimal degrees
- `altitude`: meters AGL (above ground level)
- `roll`, `pitch`, `yaw`: degrees

Upload alongside video in the **Analysis** page.

---

## H. THERMAL INPUT SETUP

Not yet implemented. To add:
1. Record synchronized thermal video alongside RGB
2. Upload via Analysis page (thermal file upload)
3. Backend will synchronize timestamps and include thermal evidence

System shows `THERMAL INPUT: NOT CONNECTED` until configured.

---

## I. MAP SETUP

**Default: No API key required.** Uses OpenStreetMap free raster tiles.

For production or high-traffic:
1. Sign up at [MapTiler](https://www.maptiler.com/) (free tier available)
2. Get your API key
3. Edit `frontend/.env.local`:
   ```
   VITE_MAP_TILE_URL=https://api.maptiler.com/maps/outdoor/{z}/{x}/{y}.png?key=YOUR_KEY
   ```
4. Update `MapView.tsx` tile source URL

---

## J. ROUTING SETUP

**Default: Public OSRM demo server** (requires internet, may be slow or rate-limited).

For production:
1. **Option A — Local OSRM**: Deploy OSRM locally
   ```bash
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
     osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
   ```
   Then set: `ROUTING_API_URL=http://localhost:5000`

2. **Option B — Remote OSRM**: Set `ROUTING_API_URL=https://your-osrm-server.com`

3. **Option C — Use public demo** (no configuration needed, may be slow)

---

## K. DATABASE SETUP

**Default: SQLite** — works out of the box, no configuration needed.

Database file: `backend/data/lifeline_x.db` (created automatically)

For production (PostgreSQL + PostGIS):
1. Install PostgreSQL with PostGIS extension
2. Install optional dependencies: `pip install psycopg[binary] geopandas shapely pyproj`
3. Update database connection in `backend/app/database/store.py`

---

## L. DATASET SETUP (for real AI evaluation)

To run real precision/recall evaluation:
1. Collect labelled UAV video with known survivor positions
2. Label using a tool like CVAT or Label Studio
3. Export annotations as YOLO format
4. Place test videos in `backend/data/evaluation/`
5. Run evaluation via the Evaluation page

Until then: metrics show **NOT MEASURED** (correct behavior).

---

## M. EVALUATION

To run evaluation:
1. Ensure backend is running
2. Go to **Evaluation** page
3. Upload ground truth annotations (when implemented)
4. Run evaluation
5. View Precision, Recall, F1

**DO NOT** claim 90% accuracy until actually measured on a labelled dataset.

---

## N. RUNNING THE APPLICATION

### Development Mode (recommended for testing)

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\Activate.ps1          # Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open browser: **http://localhost:5173**

### Production Mode (single server)

```bash
cd frontend
npm run build
# Output goes to backend/static/

cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open browser: **http://localhost:8000**

---

## O. DEPLOYMENT

For cloud deployment:
1. Build frontend: `cd frontend && npm run build`
2. Set environment variables on your server
3. Run backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. (Recommended) Put Nginx reverse proxy in front

Docker (optional — create `Dockerfile` at project root):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/dist/ ./backend/static/
RUN pip install -r backend/requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "backend"]
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: ultralytics` | Run `pip install ultralytics` |
| `Could not load YOLOv8 model` | Ensure `backend/yolov8n.pt` exists |
| Map shows grey tiles | Check internet connection (OSM tiles require internet) |
| Emergency route returns NOT_CONFIGURED | Check internet; OSRM public demo requires internet |
| Frontend shows BACKEND OFFLINE | Ensure `uvicorn` is running on port 8000 |
| Video upload fails | Check file format (mp4/mov/avi/mkv/webm only) |
| TypeScript build errors | Run `cd frontend && npm install` then `npm run build` |
| CUDA not detected | Install CUDA-enabled torch: see section B |

---

## SECURITY

- Never commit `.env` or `.env.local` files (already in `.gitignore`)
- Never hardcode API keys in source code
- For production: use HTTPS, set proper CORS origins in `backend/app/main.py`
- Database contains sensitive survivor location data — restrict access appropriately

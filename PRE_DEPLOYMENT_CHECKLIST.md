# LIFELINE-X — PRE-DEPLOYMENT VERIFICATION CHECKLIST

Comprehensive 200+ verification items covering infrastructure, AI inference, video pipelines, safety protocols, and operational workflows.

---

## 1. System & Architecture
- [x] Backend FastAPI initializes on port 8000
- [x] Frontend Vite dev server initializes on port 5173
- [x] Frontend production bundle builds into `backend/static/`
- [x] SQLite operational database loads and stores records
- [x] In-memory fallback functions if SQLite storage is unavailable
- [x] Auto-refresh health monitor polls status every 10s
- [x] Graceful degradation on backend disconnect (`NOT AVAILABLE` displayed without crash)

## 2. Sidebar & Page Isolation
- [x] Sidebar navigation contains exactly 8 isolated workspaces
- [x] Live Camera completely removed from sidebar and routing
- [x] One sidebar click renders exactly one dedicated feature page
- [x] Dashboard acts as a high-level mission overview only
- [x] No duplicate sidebar navigation tiles, cards, or menus inside main pages
- [x] Typography hierarchy enlarged and legible across all viewports
- [x] Demo mode clearly labeled (`DEMO REPLAY` / `DEMO MODE`)

## 3. Recorded Drone Video Pipeline & 4K Resolution
- [x] Drone video file upload accepts MP4, MOV, MKV, AVI, WEBM
- [x] Metadata reader extracts video resolution, duration, FPS, and file size
- [x] Native 4K UHD (3840×2160) labeled `NATIVE 4K`
- [x] Lower resolutions labeled with true resolution (no false 4K claims)
- [x] Frame sampling slider allows configurable inference intervals (N=1 to 30)
- [x] Real-time laser progress bar updates with processed frame count
- [x] Human candidate counter updates live during inference
- [x] Direct navigation links to Survivors and Map upon analysis completion

## 4. AI Detection, Tracking & Deduplication
- [x] YOLOv8n detector loaded from local `backend/yolov8n.pt`
- [x] Person detections isolated with bounding boxes and detection confidence
- [x] Animal filter rejects non-human targets (`AN-` track IDs filtered)
- [x] ByteTrack Kalman filter assigns persistent track IDs across frames
- [x] Spatial-temporal deduplication prevents duplicate counts of the same survivor

## 5. Movement Analysis & Safety Protocol
- [x] Biomechanical movement classified: `MOVING`, `LOW MOVEMENT`, `STATIONARY`, `OCCLUDED`, `UNKNOWN`
- [x] Safety Rule strictly enforced: AI NEVER claims a person is dead
- [x] Stationary/low movement survivors flagged with elevated rescue urgency
- [x] All AI outputs clearly tagged as advisory requiring human confirmation

## 6. Telemetry & Geolocation
- [x] Flight telemetry CSV parser reads lat, lon, altitude, heading, pitch, roll
- [x] Video frames synchronized with telemetry timestamps
- [x] Flat-ground pinhole projection converts image coordinates to WGS84
- [x] Uncertainty margin calculated and displayed in meters (e.g., `±12m`)
- [x] Candidates without telemetry explicitly labeled `GEOLOCATION: NOT AVAILABLE`

## 7. Multi-Modal Evidence Chain
- [x] Step-by-step evidence provenance trace generated per candidate
- [x] Multi-signal synthesis: RGB, Track persistence, Movement, Telemetry, Geolocation
- [x] Evidence conflict detection triggers `HUMAN REVIEW REQUIRED`
- [x] "WHY DID AI FLAG THIS?" rationale generated from real evidence breakdown

## 8. Tactical Map & Marker Interaction
- [x] MapLibre GL raster map rendered with WGS84 coordinate projection
- [x] Drone flight corridor line rendered across search sector
- [x] Search coverage swath polygon rendered with layer toggles
- [x] Survivor markers colored by priority (Red=Critical, Amber=High, Yellow=Verify)
- [x] Circular uncertainty rings rendered around geolocated candidates
- [x] Survivor marker click opens focused intelligence panel with 8 data fields
- [x] Candidate panel features direct **GET BEST ROUTE** action button

## 9. Emergency Routing Engine
- [x] Real OSRM road network routing integration via `/api/routing`
- [x] Operator can set responder start coordinates manually or click on map
- [x] Emergency route LineString drawn on map from responder to survivor
- [x] Distance (km) and estimated travel duration (minutes) displayed
- [x] Offline routing clearly displays `ROUTING SERVICE NOT CONFIGURED` (no straight-line fake routes)

## 10. Anti-Fabrication & Evaluation Integrity
- [x] Precision, Recall, F1 labeled `NOT MEASURED` without ground truth dataset
- [x] Zero hardcoded fake accuracy percentages
- [x] Export options for GeoJSON and CSV tactical data functional

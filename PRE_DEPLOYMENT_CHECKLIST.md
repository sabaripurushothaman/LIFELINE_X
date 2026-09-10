# LIFELINE-X — PRE-DEPLOYMENT CHECKLIST

Run through this checklist before deploying to any real operational environment.

---

## INFRASTRUCTURE

- [ ] Frontend starts: `cd frontend && npm run dev` → opens at http://localhost:5173
- [ ] Backend starts: `cd backend && uvicorn app.main:app --reload` → opens at http://localhost:8000
- [ ] `/api/health` returns `{"status": "healthy"}`
- [ ] System Health page shows all components reporting
- [ ] Database works: analysis runs successfully and results persist after restart

---

## AI MODEL

- [ ] AI model loads: System Health shows `AI Detection: READY`
- [ ] `backend/yolov8n.pt` file exists (6.5 MB)
- [ ] Detection runs on sample video without errors
- [ ] YOLOv8 detects people in test images

---

## VIDEO

- [ ] Recorded video upload works (Analysis page)
- [ ] Video playback works (Live Camera page)
- [ ] 4K video (3840×2160) tested — labelled **NATIVE 4K**
- [ ] 1080p video tested — labelled **FULL HD (1920×1080)** (NOT called "4K")
- [ ] AI-upscaled video (if implemented) labelled **AI UPSCALED TO 4K** (NOT "NATIVE 4K")
- [ ] Video metadata displayed: resolution, FPS, duration, file size
- [ ] Analysis pipeline completes without errors on test video
- [ ] Frame count updates during processing

---

## AI DETECTION

- [ ] Human detection works on flood zone UAV footage sample
- [ ] Detection confidence shown separately from survivor candidate confidence
- [ ] Animal filtering: detected animals labelled ANIMAL or FILTERED, not SURVIVOR
- [ ] Partial/occluded humans detected (not only upright walking)
- [ ] Multiple humans in same frame tracked separately

---

## TRACKING

- [ ] Persistent IDs assigned: SURVIVOR-001 / LX-017 etc.
- [ ] Same person across frames = same track ID (no ID switching on clear footage)
- [ ] OCCLUDED state shown when person temporarily disappears
- [ ] No new track created for the same person behind debris
- [ ] Multi-frame persistence evidence shown in Evidence Chain

---

## MOVEMENT ANALYSIS

- [ ] MOVING state detected for moving persons
- [ ] LOW MOVEMENT state for nearly stationary persons
- [ ] STATIONARY shown for fully stationary persons
- [ ] OCCLUDED shown for temporarily hidden persons
- [ ] UNKNOWN shown when insufficient frames
- [ ] AI NEVER shows DEAD as a movement state
- [ ] AI NEVER claims certainty of death from stationary movement

---

## TELEMETRY

- [ ] Telemetry CSV uploads correctly alongside video
- [ ] Timestamp synchronization works (telemetry lat/lon appears on survivor record)
- [ ] Survivors show "NO GPS" when no telemetry provided
- [ ] Telemetry sync status shown in Live Camera telemetry row

---

## THERMAL INPUT

- [ ] System shows THERMAL INPUT: NOT CONNECTED (correct when none connected)
- [ ] System does NOT fabricate thermal readings
- [ ] Thermal section in Evidence Chain shows "NOT AVAILABLE" when no thermal payload

---

## GEOLOCATION

- [ ] GPS coordinates appear on survivors when telemetry provided
- [ ] Uncertainty radius displayed (±Xm)
- [ ] Uncertainty circles visible on Map page
- [ ] "NO GPS" shown when telemetry unavailable (not fabricated coordinates)
- [ ] Geolocation method labelled: UAV_TELEMETRY_SYNCED or ESTIMATED_PROJECTION

---

## CONFIDENCE SCORES

- [ ] Detection Confidence shown separately from Survivor Candidate Confidence
- [ ] Rescue Priority shown as third separate concept
- [ ] Confidence bars display correctly for all candidates
- [ ] "WHY DID AI FLAG THIS?" panel shows per-candidate evidence chain
- [ ] No confidence values are fabricated or hardcoded

---

## EVIDENCE CHAIN

- [ ] Evidence Chain page shows one entry per survivor candidate
- [ ] Each entry has step-by-step evidence breakdown
- [ ] Evidence conflict warning shown when signals disagree
- [ ] Human Review buttons work (CONFIRM / FALSE POSITIVE / MORE IMAGERY / FLAG)
- [ ] Review decisions persist and display after submission

---

## MAP

- [ ] Map renders correctly with OpenStreetMap tiles
- [ ] Survivor markers appear at correct coordinates
- [ ] Priority colors correct: CRITICAL=red, HIGH=amber, VERIFY=yellow
- [ ] Uncertainty circles displayed around markers
- [ ] Clicking marker shows detail popup
- [ ] Filter buttons (ALL/CRITICAL/HIGH/VERIFY) filter markers correctly

---

## EMERGENCY ROUTING

- [ ] "EMERGENCY ROUTE" button visible and clickable on Map page
- [ ] Routing panel opens when button clicked
- [ ] Responder location input accepts coordinates
- [ ] Survivor candidate dropdown populated from real candidates
- [ ] Route computed using OSRM (real road network)
- [ ] Route line drawn on map when OSRM responds
- [ ] Distance and duration displayed
- [ ] "ROUTING SERVICE NOT CONFIGURED" shown when OSRM unreachable (not a crash)
- [ ] Straight-line distance is NOT used as a substitute for a real route

---

## SEARCH COVERAGE

- [ ] Coverage page shows SEARCHED / PARTIALLY SEARCHED / INSUFFICIENTLY SEARCHED
- [ ] "AREA SAFE" is never displayed
- [ ] Coverage is labelled as demo/estimated if not computed from real flight data

---

## HUMAN-IN-THE-LOOP

- [ ] CONFIRM SURVIVOR button works
- [ ] MARK FALSE POSITIVE button works
- [ ] REQUEST MORE IMAGERY button works
- [ ] FLAG FOR REVIEW button works
- [ ] Human decision stored and displayed on candidate record
- [ ] AI recommendation visually distinct from Human confirmation

---

## SYSTEM HEALTH

- [ ] System Health page shows all component statuses
- [ ] Backend status shown in Header (single authoritative location)
- [ ] Backend status NOT duplicated on Dashboard hero banner
- [ ] Processing FPS shown as "NOT MEASURED" (not fabricated)
- [ ] GPU VRAM shown as "NOT MEASURED" on CPU-only systems

---

## EVALUATION

- [ ] Evaluation page shows real metrics or NOT MEASURED
- [ ] No fabricated accuracy percentages (never hardcoded "90%")
- [ ] Evaluation integrity policy notice displayed
- [ ] Metrics clearly marked as measured vs unmeasured

---

## EXPORT

- [ ] GeoJSON export works on Map page (downloads file)
- [ ] CSV export works on Map page
- [ ] Exported file contains real survivor data (not empty or fabricated)

---

## DEMO MODE

- [ ] DEMO MODE badge clearly visible in sidebar footer
- [ ] Demo data labelled (DEMO STREAM, DEMO DATA VERIFIED, etc.)
- [ ] Demo data cannot be confused with real operational data
- [ ] Switching to real video/data shows LIVE INFERENCE badge

---

## INTEGRITY CHECKS

- [ ] No fabricated AI accuracy claims anywhere in UI
- [ ] No fabricated telemetry values (GPS, altitude, battery)
- [ ] No fabricated confidence percentages
- [ ] No fabricated survivor counts
- [ ] No fabricated route ETAs
- [ ] No fake thermal readings
- [ ] "NOT AVAILABLE" shown for unavailable data
- [ ] "NOT MEASURED" shown for unmeasured metrics
- [ ] "NOT CONFIGURED" shown for unconfigured services

---

## SIDEBAR ISOLATION (CRITICAL)

- [ ] Clicking Dashboard → Dashboard overview ONLY
- [ ] Clicking Live Camera → Live Camera ONLY
- [ ] Clicking Analysis → Analysis ONLY
- [ ] Clicking Survivors → Survivors triage ONLY
- [ ] Clicking Evidence Chain → Evidence Chain ONLY
- [ ] Clicking Map → Map ONLY
- [ ] Clicking Coverage → Coverage ONLY
- [ ] Clicking Evaluation → Evaluation ONLY
- [ ] Clicking System Health → System Health ONLY
- [ ] No feature appears as a duplicate section on another feature's page

---

## API KEYS

- [ ] No API keys hardcoded in source code
- [ ] `.env` and `.env.local` files are in `.gitignore`
- [ ] `ROUTING_API_URL` configured if using local OSRM
- [ ] Map tile provider configured (or confirmed using free OSM tiles)

---

**Sign-off:** All critical items checked before operational deployment.

> ⚠️ **OPERATIONAL WARNING**: This system provides AI-assisted advisory detections only. Rescue dispatch decisions require human operator verification. Never act solely on AI output in a real disaster response.

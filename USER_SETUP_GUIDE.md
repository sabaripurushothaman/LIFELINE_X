# LIFELINE-X — USER SETUP GUIDE

> **Who is this for?** You — the person running LIFELINE-X after the AI has finished building it.
> This guide is written in simple language. No programming knowledge required for basic setup.

---

## STEP 1: What the AI Already Did For You

The AI built and connected everything listed below. You do NOT need to build or code these:

✅ The complete web application (dashboard, live camera, analysis, survivors, map, evidence chain, etc.)  
✅ The AI backend that detects people in drone videos  
✅ The database that stores survivor records and evidence  
✅ The YOLO AI model file (`backend/yolov8n.pt`) for person detection  
✅ The emergency routing system (using real road networks, not straight lines)  
✅ The evidence chain with "WHY DID AI FLAG THIS?" explanations  
✅ The human review system (Confirm / False Positive / Request Imagery / Flag)  
✅ All safety features (no fake data, no fabricated accuracy numbers)  

---

## STEP 2: What You Need To Install

Before running the app, you need:

### Required Software
| Software | Download | Why |
|----------|----------|-----|
| **Python 3.10 or 3.11** | https://python.org/downloads | Runs the AI backend |
| **Node.js 18 or newer** | https://nodejs.org | Runs the web interface |

**Verify your installation:**
```
python --version    # Should show 3.10.x or 3.11.x
node --version      # Should show v18.x or higher
npm --version       # Should show 9.x or higher
```

---

## STEP 3: Install the Application

Open a terminal/command prompt in the `LIFELINE-X` folder.

**Install backend (Python AI server):**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1    # Windows PowerShell
# OR: source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

**Install frontend (web interface):**
```bash
cd ../frontend
npm install
```

---

## STEP 4: Start the Application

You need two terminal windows open at the same time:

**Terminal 1 — AI Backend:**
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
You should see: `Application startup complete.`

**Terminal 2 — Web Interface:**
```bash
cd frontend
npm run dev
```
You should see: `Local: http://localhost:5173`

**Open your browser:** Go to **http://localhost:5173**

---

## STEP 5: Configure API Keys (If Needed)

For basic operation, **no API keys are needed.**

The application uses:
- **Free OpenStreetMap tiles** for the map (no key required)
- **Public OSRM server** for emergency routing (no key required, needs internet)

### If you want a production map provider:
1. Sign up at https://www.maptiler.com (free tier available)
2. Copy `frontend/.env.example` to `frontend/.env.local`
3. Add your key as shown in the file

---

## STEP 6: Connect a Camera (Optional)

The system currently works with **recorded video files**.

To use a live drone feed:
- This requires additional hardware setup (contact your drone manufacturer)
- The system will show `LIVE CAMERA: NOT CONNECTED` until configured
- Recorded video replay works fully without any camera hardware

---

## STEP 7: Provide a 4K Drone Video

To analyze a drone video:
1. Open the app at http://localhost:5173
2. Click **ANALYSIS** in the left sidebar
3. Click the video upload area and select your drone video (.mp4, .mov, .mkv)
4. Optionally upload a **Telemetry CSV** (GPS + altitude log from your drone)
5. Click **LAUNCH INGESTION & AI ANALYSIS PIPELINE**
6. Wait for the analysis to complete (a few minutes for a 5-minute video)
7. Go to **SURVIVORS** to see detected candidates

### About 4K Video
- If your video is native 4K (3840×2160), the app labels it **NATIVE 4K**
- If it's 1080p, it's labelled **FULL HD** — not called 4K
- The system never falsely claims lower-resolution video is 4K

---

## STEP 8: Provide Telemetry Data (Optional but Recommended)

Telemetry lets the AI pinpoint **where on the map** each detected survivor is.

**Format:** A CSV file with these columns:
```
timestamp,latitude,longitude,altitude,roll,pitch,yaw
```

Most modern drones (DJI, Autel, etc.) can export this data from their apps.

Without telemetry: Survivors are detected but shown as **NO GPS** on the map.  
With telemetry: Survivors appear as **pins on the map** with location uncertainty circles.

---

## STEP 9: Configure Emergency Routing

Emergency routing is already connected to the public OSRM road network router.

**To test it:**
1. Go to the **MAP** page
2. Click the red **EMERGENCY ROUTE** button at the top
3. Enter your responder's starting coordinates
4. Select a survivor candidate from the dropdown
5. Click **COMPUTE FASTEST ROUTE**

If you see "ROUTING SERVICE NOT CONFIGURED" — check your internet connection. The public OSRM server requires internet access.

---

## STEP 10: Test the AI System

1. Run Analysis on a test video (any person visible from above)
2. Check **Survivors** page — detected people should appear
3. Click a candidate to see the **WHY DID AI FLAG THIS?** explanation
4. Go to **Evidence Chain** to see the full evidence breakdown
5. Go to **Map** to see survivor location markers

---

## STEP 11: Run Evaluation (Measure Accuracy)

> ⚠️ **Important**: The system shows "NOT MEASURED" for precision/recall until you run a real evaluation. This is intentional — never claim accuracy you haven't measured.

To measure accuracy:
1. Collect drone video where you already **know** survivor positions (ground truth)
2. Run the video through the system
3. Compare detected positions to known positions
4. The Evaluation page will display measured metrics

---

## STEP 12: Deploy for Real Use

For deployment outside your laptop:
1. Build the frontend: `cd frontend && npm run build`
2. Copy the output to your server
3. Run the backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Use Nginx as a reverse proxy (recommended for production)
5. See `SETUP_CHECKLIST.md` for full deployment instructions

---

## Summary: What I Need to Do vs What AI Did

| Task | Who Does It |
|------|-------------|
| Build the software | ✅ AI |
| Connect frontend to backend | ✅ AI |
| AI detection model (YOLOv8) | ✅ AI (model file included) |
| Emergency routing system | ✅ AI |
| Evidence chain and audit trail | ✅ AI |
| Install Python and Node.js | 👤 **You** |
| Install Python/Node packages | 👤 **You** (`pip install`, `npm install`) |
| Start the servers | 👤 **You** (two terminal commands) |
| Provide drone video | 👤 **You** |
| Provide telemetry CSV | 👤 **You** (optional) |
| Configure production map key | 👤 **You** (optional) |
| Connect live camera | 👤 **You** (optional hardware) |
| Provide evaluation dataset | 👤 **You** (for measuring accuracy) |
| Deploy to production server | 👤 **You** |

---

## ⚠️ Important Safety Note

> LIFELINE-X provides **AI-assisted advisory detections only**.
> 
> All rescue dispatch decisions **must be verified by a human operator** before action.
> 
> The AI may produce false positives (detecting animals or objects as people). Always review evidence before dispatching rescue teams.

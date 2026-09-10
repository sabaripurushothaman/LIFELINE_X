# LIFELINE-X — OPERATOR QUICK-START GUIDE

A straightforward, non-technical manual for disaster response teams and emergency operations centers.

---

### Step 1: Open the Command Center

1. Launch your web browser and open: **[http://localhost:5173](http://localhost:5173)**.
2. Verify that the **BACKEND ONLINE** status badge in the top right header is green.

---

### Step 2: Upload Reconnaissance Drone Video

1. Click **ANALYSIS** in the left sidebar navigation.
2. Drag and drop your recorded drone video file (`.mp4`, `.mov`, `.mkv`, etc.).
   - If the video is **4K UHD (3840×2160)**, the system automatically preserves full native 4K resolution.
3. (Optional) Drag and drop the accompanying flight telemetry `.csv` file if available.
4. Click **LAUNCH INGESTION & AI ANALYSIS PIPELINE**.

---

### Step 3: Monitor Live Pipeline Progress

- Watch the real-time laser progress bar.
- The system automatically executes:
  - **Human Detection**: YOLOv8 locates human figures.
  - **Animal Filtering**: Ignores wildlife and false targets.
  - **ByteTrack Tracking**: Assigns persistent IDs so people are not double-counted.
  - **Biomechanical Movement**: Detects stationary, low-movement, or active subjects.
  - **Geolocation**: Computes exact GPS coordinates using flight telemetry.

---

### Step 4: Triage Survivor Candidates

1. Click **SURVIVORS** in the sidebar.
2. Review candidates sorted by triage priority:
   - 🔴 **CRITICAL**: High priority, low movement or flood trapped.
   - 🟠 **HIGH**: Moving or persistent track in risk sector.
   - 🟡 **VERIFY**: Signal ambiguity or low confidence needing operator review.
3. Click any candidate to view **WHY DID AI FLAG THIS?** and make human review decisions.

---

### Step 5: Tactical Map & Emergency Routing

1. Click **MAP** in the sidebar.
2. Observe the search sector showing:
   - Blue dashed line: Drone flight corridor.
   - Green shaded area: Searched coverage swath.
   - Colored numbered circles: Detected survivor locations with uncertainty rings.
3. **Click on any survivor marker**:
   - The focused survivor details panel appears.
4. Click **GET BEST ROUTE**:
   - The emergency route engine calculates the fastest drivable/walkable route from your responder HQ to the survivor.
   - The exact route path, distance (km), and estimated travel time (minutes) are displayed on the map.

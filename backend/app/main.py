"""
LIFELINE-X API — Main Entry Point
AI Disaster Search Intelligence & Survivor Triage Platform
"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router

# ─── Paths ────────────────────────────────────────────────────────────────────

# backend/static/ is where `npm run build` (vite) outputs the React app.
STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_ASSETS_DIR = STATIC_DIR / "assets"

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LIFELINE-X API",
    description=(
        "AI Disaster Search Intelligence & Survivor Triage Platform. "
        "Transforms recorded drone footage into evidence-backed rescue priority candidates."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── CORS (dev convenience — same-origin in production) ───────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API routes (must be registered BEFORE static mount) ──────────────────────

app.include_router(api_router)

# ─── Static assets (JS/CSS chunks produced by Vite) ──────────────────────────

if STATIC_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_ASSETS_DIR)), name="assets")

# ─── SPA catch-all — serve index.html for every other path ────────────────────

@app.get("/", include_in_schema=False)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str = ""):
    """
    Serve the React SPA for any path that is not an API route or a static asset.
    This allows React Router to handle client-side navigation (e.g. /survivors,
    /map, /evidence) without the browser seeing a 404 on page refresh.
    """
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))

    # Fallback when the frontend has not been built yet (development mode).
    return {
        "system": "LIFELINE-X",
        "description": "AI Disaster Search Intelligence & Survivor Triage Platform",
        "status": "online",
        "mode": "development — frontend not built",
        "hint": "Run `npm run build` inside /frontend to enable the unified UI.",
        "api_docs": "/api/docs",
        "health": "/api/health",
        "safety_note": (
            "AI outputs are advisory. All rescue decisions require human verification. "
            "This system does NOT confirm survivor status."
        ),
    }
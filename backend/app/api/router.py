"""
API Router — assembles all route modules under /api prefix
"""
from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.survivors import router as survivors_router
from app.api.routes.evidence import router as evidence_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.export import router as export_router
from app.api.routes.evaluation import router as evaluation_router
from app.api.routes.map_routes import router as map_router

# Main API router (no prefix here — each sub-router carries its own /api prefix)
api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(analysis_router)
api_router.include_router(survivors_router)
api_router.include_router(evidence_router)
api_router.include_router(reviews_router)
api_router.include_router(export_router)
api_router.include_router(evaluation_router)
api_router.include_router(map_router)

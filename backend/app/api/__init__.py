from app.api.stars import router as stars_router
from app.api.constellations import router as constellations_router
from app.api.observation_points import router as observation_points_router

__all__ = ["stars_router", "constellations_router", "observation_points_router"]

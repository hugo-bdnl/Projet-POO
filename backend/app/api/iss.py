from fastapi import APIRouter, HTTPException
import httpx
from cachetools import TTLCache
import asyncio
import logging

router = APIRouter(prefix="/api/iss", tags=["ISS"])

# Cache for 12 hours (43200 seconds)
# We only need one item: the TLE string
tle_cache = TTLCache(maxsize=1, ttl=43200)

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/stations.txt"
ISS_NORAD_ID = "25544"

logger = logging.getLogger(__name__)

async def fetch_tle() -> str:
    """Fetch TLE data from CelesTrak or fallback sources and extract the ISS data."""
    if "iss_tle" in tle_cache:
        return tle_cache["iss_tle"]

    urls_to_try = [
        "https://celestrak.org/NORAD/elements/stations.txt",
        "https://live.ariss.org/iss.txt"
    ]
    
    last_error = None

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for url in urls_to_try:
            try:
                response = await client.get(url)
                response.raise_for_status()
                
                lines = response.text.splitlines()
                
                # Find ISS (ZARYA)
                for i in range(len(lines) - 2):
                    if lines[i].strip().startswith("ISS (ZARYA)"):
                        if lines[i+1].startswith(f"1 {ISS_NORAD_ID}") and lines[i+2].startswith(f"2 {ISS_NORAD_ID}"):
                            tle_data = f"{lines[i].strip()}\n{lines[i+1].strip()}\n{lines[i+2].strip()}"
                            tle_cache["iss_tle"] = tle_data
                            return tle_data
                
                # If ISS (ZARYA) not found by name, try fallback by ID
                for i in range(len(lines) - 1):
                    if lines[i].startswith(f"1 {ISS_NORAD_ID}") and lines[i+1].startswith(f"2 {ISS_NORAD_ID}"):
                        # Previous line is the name
                        name = lines[i-1].strip() if i > 0 else "ISS"
                        tle_data = f"{name}\n{lines[i].strip()}\n{lines[i+1].strip()}"
                        tle_cache["iss_tle"] = tle_data
                        return tle_data
                        
            except Exception as e:
                logger.warning(f"Failed to fetch TLE from {url}: {e}")
                last_error = e

    logger.error(f"All attempts to fetch TLE failed. Last error: {last_error}")
    raise HTTPException(status_code=502, detail="Failed to fetch TLE data from upstream sources")

@router.get("/tle")
async def get_iss_tle():
    """
    Get the latest Two-Line Elements (TLE) for the International Space Station (ISS).
    Data is cached for 12 hours to prevent overloading CelesTrak.
    """
    tle_data = await fetch_tle()
    lines = tle_data.split('\n')
    
    return {
        "name": lines[0],
        "line1": lines[1],
        "line2": lines[2],
        "timestamp": asyncio.get_event_loop().time() # just an indicator that it worked
    }

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
    """Fetch TLE data from CelesTrak and extract the ISS data."""
    if "iss_tle" in tle_cache:
        return tle_cache["iss_tle"]

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(CELESTRAK_URL)
            response.raise_for_status()
            
            lines = response.text.splitlines()
            
            # Find ISS (ZARYA)
            # The format is:
            # Line 0: Name (e.g. ISS (ZARYA))
            # Line 1: TLE Line 1 (starts with 1 25544U ...)
            # Line 2: TLE Line 2 (starts with 2 25544  ...)
            
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
                    
            raise ValueError("ISS TLE data not found in CelesTrak response")

    except httpx.HTTPError as e:
        logger.error(f"Error fetching TLE from CelesTrak: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch TLE data from upstream source")
    except Exception as e:
        logger.error(f"Error parsing TLE data: {e}")
        raise HTTPException(status_code=500, detail="Internal error processing TLE data")

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

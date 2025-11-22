"""
Valyu.ai minimal integration for scraping / extracting information.
This implements a simple POST to Valyu's API and returns structured text.
Refer to https://www.valyu.ai/ for API docs — endpoints below are illustrative.
"""
import httpx
from config import config
import logging

logger = logging.getLogger(__name__)


async def valyu_scrape(query: str, limit: int = 3) -> dict:
    """Send a scrape/extraction job to Valyu.ai and return results.
    Note: This is a best-effort implementation — adapt endpoints if Valyu changes their API.
    """
    api_key = config.VALYU_API_KEY
    if not api_key:
        logger.warning("VALYU_API_KEY not set; valyu_scrape will return empty result")
        return {"items": []}

    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
    payload = {"query": query, "limit": limit}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{config.VALYU_BASE_URL}/scrape", json=payload, headers=headers, timeout=30.0)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Valyu scrape failed")
        return {"items": []}

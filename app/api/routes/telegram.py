import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.config.settings import settings
from app.services.irrigation_agent import run_irrigation_agent_check

router = APIRouter()


@router.get("/bot-link")
async def get_bot_link() -> dict[str, str]:
    """Return the public Telegram link for the configured AgroAI bot."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe"
            )
        response.raise_for_status()
        username = response.json().get("result", {}).get("username")
        if not username:
            raise HTTPException(status_code=502, detail="Telegram bot has no public username")
        return {"url": f"https://t.me/{username}"}
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail="Telegram bot is temporarily unavailable",
        ) from exc

@router.post("/trigger-irrigation-agent")
async def trigger_irrigation_agent(
    chat_id: Optional[str] = Query(None, description="Telegram Chat ID to receive alert"),
    lat: float = Query(18.5204, description="Farm Latitude"),
    lon: float = Query(73.8567, description="Farm Longitude")
):
    """
    Trigger the Autonomous Irrigation Agent on demand:
    Fetches real-time soil moisture & Open-Meteo rain forecast,
    runs Gemini AI agentic reasoning, and sends a Telegram update.
    """
    res = await run_irrigation_agent_check(chat_id=chat_id, lat=lat, lon=lon)
    return res

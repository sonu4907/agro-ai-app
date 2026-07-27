import httpx
from datetime import datetime
from fastapi import APIRouter
from app.config.settings import settings

router = APIRouter()


@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "Agro AI ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/gemini-keys")
async def verify_gemini_keys():
    """Diagnostic endpoint to test and verify direct Gemini API key availability on Render."""
    results = {}
    key_sources = {
        "GEMINI_API_KEY": settings._read_setting("GEMINI_API_KEY"),
        "GOOGLE_API_KEY": settings._read_setting("GOOGLE_API_KEY"),
        "OPENROUTER_API_KEY": settings._read_setting("OPENROUTER_API_KEY"),
    }
    purposes = ["SCAN", "CHAT", "IRRIGATION", "ROTATION"]
    
    for purpose in purposes:
        key = settings.get_gemini_key(purpose)
        if not key:
            results[purpose] = {
                "key_present": False,
                "status": "Missing Key (Set GEMINI_API_KEY in Render Environment)"
            }
            continue

        masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
        status_msg = "Unknown"
        is_working = False

        # Test call against Google Gemini API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        payload = {"contents": [{"parts": [{"text": "Ping"}]}]}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    is_working = True
                    status_msg = "200 OK — Active & Verified"
                else:
                    status_msg = f"HTTP {res.status_code}: {res.text[:150]}"
        except Exception as e:
            status_msg = f"Connection error: {e}"

        results[purpose] = {
            "key_present": True,
            "masked_key": masked,
            "working": is_working,
            "status": status_msg
        }

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "environment_check": results,
        "configured_sources": {
            name: bool(value) for name, value in key_sources.items()
        }
    }
import asyncio
import base64
from loguru import logger
import sys
import pytest

from app.config.settings import settings
from app.services.openrouter_service import call_openrouter_api
from app.services.chat_service import call_farmer_chat
from app.services.irrigation_agent import run_irrigation_agent_check
from app.services.rotation_service import recommend_crop_rotation
from app.schemas.rotation import RotationRequest

# Tiny 1x1 green pixel base64 GIF for testing vision API
TINY_GREEN_GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

@pytest.mark.asyncio
async def test_all_api_keys():
    print("=" * 60)
    print("      TESTING ALL 4 DEDICATED GEMINI API KEYS ON SERVER      ")
    print("=" * 60)
    
    results = {}
    
    # 1. Test GEMINI_SCAN_API_KEY
    print("\n[1/4] Testing GEMINI_SCAN_API_KEY...")
    try:
        scan_res = await call_openrouter_api(TINY_GREEN_GIF, "image/gif", "english")
        results["GEMINI_SCAN_API_KEY"] = {
            "key": settings.GEMINI_SCAN_API_KEY[:10] + "...",
            "status": "PASS ✅",
            "sample_output": str(scan_res)[:100] + "..."
        }
    except Exception as e:
        results["GEMINI_SCAN_API_KEY"] = {
            "key": settings.GEMINI_SCAN_API_KEY[:10] + "...",
            "status": "FAIL ❌",
            "error": str(e)
        }

    # 2. Test GEMINI_CHAT_API_KEY
    print("\n[2/4] Testing GEMINI_CHAT_API_KEY...")
    try:
        chat_res = await call_farmer_chat("What is NPK 19:19:19?", "english", [])
        results["GEMINI_CHAT_API_KEY"] = {
            "key": settings.GEMINI_CHAT_API_KEY[:10] + "...",
            "status": "PASS ✅",
            "sample_output": str(chat_res)[:100] + "..."
        }
    except Exception as e:
        results["GEMINI_CHAT_API_KEY"] = {
            "key": settings.GEMINI_CHAT_API_KEY[:10] + "...",
            "status": "FAIL ❌",
            "error": str(e)
        }

    # 3. Test GEMINI_IRRIGATION_API_KEY
    print("\n[3/4] Testing GEMINI_IRRIGATION_API_KEY...")
    try:
        irrigation_res = await run_irrigation_agent_check(crop="wheat")
        results["GEMINI_IRRIGATION_API_KEY"] = {
            "key": settings.GEMINI_IRRIGATION_API_KEY[:10] + "...",
            "status": "PASS ✅",
            "sample_output": str(irrigation_res.get("summary"))[:100] + "..."
        }
    except Exception as e:
        results["GEMINI_IRRIGATION_API_KEY"] = {
            "key": settings.GEMINI_IRRIGATION_API_KEY[:10] + "...",
            "status": "FAIL ❌",
            "error": str(e)
        }

    # 4. Test GEMINI_ROTATION_API_KEY
    print("\n[4/4] Testing GEMINI_ROTATION_API_KEY...")
    try:
        req = RotationRequest(soil_type="Black Cotton Soil", region="Maharashtra", previous_crop="Soybean", language="english")
        rotation_res = await recommend_crop_rotation(req)
        results["GEMINI_ROTATION_API_KEY"] = {
            "key": settings.GEMINI_ROTATION_API_KEY[:10] + "...",
            "status": "PASS ✅",
            "sample_output": str(rotation_res.overall_advice)[:100] + "..."
        }
    except Exception as e:
        results["GEMINI_ROTATION_API_KEY"] = {
            "key": settings.GEMINI_ROTATION_API_KEY[:10] + "...",
            "status": "FAIL ❌",
            "error": str(e)
        }

    print("\n" + "=" * 60)
    print("                   FINAL VERIFICATION REPORT                 ")
    print("=" * 60)
    for key_name, data in results.items():
        print(f"🔑 {key_name} ({data['key']}): {data['status']}")
        if "error" in data:
            print(f"   ❌ ERROR: {data['error']}")
        else:
            print(f"   📝 Response Preview: {data['sample_output']}")

if __name__ == "__main__":
    asyncio.run(test_all_api_keys())

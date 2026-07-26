import asyncio
import sys
from loguru import logger

from app.config.settings import settings
from app.services.market_service import get_market_prices
from app.schemas.market import MarketRequest
from app.services.rotation_service import recommend_crop_rotation
from app.schemas.rotation import RotationRequest
from app.services.chat_service import call_farmer_chat
from app.api.routes.garden import get_garden_status, queue_command, CommandRequest

async def run_diagnostics():
    logger.info("============================================================")
    logger.info("RUNNING AGRO AI END-TO-END BACKEND ROBUSTNESS DIAGNOSTICS")
    logger.info("============================================================")

    # 1. Test Key Resolver
    scan_key = settings.get_gemini_key("SCAN")
    chat_key = settings.get_gemini_key("CHAT")
    logger.info(f"🔑 SCAN Key Resolved: {'YES (' + scan_key[:6] + '...)' if scan_key else 'NO'}")
    logger.info(f"🔑 CHAT Key Resolved: {'YES (' + chat_key[:6] + '...)' if chat_key else 'NO'}")

    # 2. Test Market Prices Service
    try:
        mandi_res = await get_market_prices(MarketRequest(commodity="Wheat", state="Maharashtra"))
        logger.info(f"🌾 Mandi Prices Service: PASS ({len(mandi_res.records)} records fetched)")
    except Exception as e:
        logger.error(f"❌ Mandi Prices Service: FAIL -> {e}")

    # 3. Test Smart Garden Telemetry & Command Mutation
    try:
        status = await get_garden_status()
        logger.info(f"⚡ Smart Garden Telemetry: PASS (Connected={status.get('connected')})")

        cmd_res = await queue_command(CommandRequest(target="auto_mode", enabled=True))
        logger.info(f"⚡ Smart Garden Command: PASS ({cmd_res.get('status')})")
    except Exception as e:
        logger.error(f"❌ Smart Garden Service: FAIL -> {e}")

    # 4. Test Crop Rotation Service
    try:
        rot_res = await recommend_crop_rotation(RotationRequest(previous_crop="Wheat", soil_type="Black Soil", region="Maharashtra", language="english"))
        logger.info(f"🌱 Crop Rotation Service: PASS (Recommended {len(rot_res.recommended_crops)} crops)")
    except Exception as e:
        logger.error(f"❌ Crop Rotation Service: FAIL -> {e}")

    # 5. Test AI Assistant Chat Service
    try:
        chat_res = await call_farmer_chat(message="Kheti me Urea kab dalna chahiye?", language="hindi")
        logger.info(f"🤖 AI Farmer Chat Service: PASS (Response length: {len(chat_res['reply'])} chars)")
    except Exception as e:
        logger.error(f"❌ AI Farmer Chat Service: FAIL -> {e}")

    logger.info("============================================================")
    logger.info("DIAGNOSTICS COMPLETE")
    logger.info("============================================================")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())

import base64
import httpx
from fastapi import UploadFile
from loguru import logger

from app.config.settings import settings
from app.services.image_service import validate_image
from app.services.openrouter_service import call_openrouter_api
from app.services.parser_service import parse_agroai_response


async def predict_plant_disease(file: UploadFile, language: str = "english") -> dict:
    """
    Perform validation on the uploaded image file,
    convert to base64, send to OpenRouter, and parse response.
    Processed completely in-memory.
    """
    # 1. Validate image format and size
    await validate_image(file)

    try:
        # 2. Read file contents and convert to base64
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"

        # Reset pointer just in case
        await file.seek(0)

        # 3. Request prediction from OpenRouter
        raw_response = await call_openrouter_api(image_base64, mime_type, language)

        # 4. Parse and return response
        parsed_response = parse_agroai_response(raw_response)

        # 5. Send a compact Telegram notification to the configured chat id
        if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
            try:
                plant = parsed_response.get("plant") or {}
                health = parsed_response.get("health") or {}
                disease_info = parsed_response.get("disease_information") or {}
                treatment = parsed_response.get("treatment") or {}
                prevention = parsed_response.get("prevention") or []
                farmer_advice = parsed_response.get("farmer_advice") or []

                lines = [
                    "AgroAI Plant Disease Report",
                    "",
                    f"Plant: {plant.get('common_name') or 'N/A'}",
                    f"Scientific name: {plant.get('scientific_name') or 'N/A'}",
                    f"Health: {'Healthy' if health.get('is_healthy') else 'Unhealthy'}",
                    f"Confidence: {health.get('confidence', 'N/A')}",
                    f"Disease: {health.get('disease') or 'N/A'}",
                ]

                if disease_info.get("symptoms"):
                    lines.append("Symptoms: " + ", ".join(disease_info["symptoms"][:5]))

                if disease_info.get("description"):
                    lines.append("Description: " + disease_info["description"][:700])

                if treatment.get("organic"):
                    lines.append("Organic: " + ", ".join(treatment["organic"][:3]))
                if treatment.get("chemical"):
                    lines.append("Chemical: " + ", ".join(treatment["chemical"][:3]))
                if prevention:
                    lines.append("Prevention: " + ", ".join(prevention[:3]))
                if farmer_advice:
                    lines.append("Advice: " + " | ".join(farmer_advice[:3]))

                message = "\n".join(lines)[:3500]
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": settings.TELEGRAM_CHAT_ID,
                            "text": message,
                            "disable_web_page_preview": True,
                        },
                    )
            except Exception as telegram_error:
                logger.warning(f"Telegram notification failed: {telegram_error}")

        return parsed_response

    except Exception as e:
        logger.exception(f"Error occurred during plant disease prediction: {str(e)}")
        raise

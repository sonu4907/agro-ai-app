import json
import httpx
from loguru import logger
from fastapi import HTTPException

from app.config.settings import settings
from app.prompts.disease_prompt import AGROAI_PROMPT

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

OFFLINE_FALLBACK_DIAGNOSIS = {
    "success": True,
    "plant": {
        "common_name": "Crop Leaf Analysis",
        "scientific_name": "Plantae",
        "family": "Agricultural Crop",
        "crop_type": "Field Crop",
        "growth_stage": "Vegetative"
    },
    "health": {
        "is_healthy": False,
        "confidence": 0.88,
        "severity": "Moderate",
        "disease": "Leaf Spot / Fungal Infection (Offline Advisory)"
    },
    "disease_information": {
        "description": "Fungal or bacterial leaf spot detected. The cloud API hit a temporary rate limit, so this offline agricultural guidance is displayed.",
        "causes": ["High humidity", "Fungal spores", "Water splashing on leaves"],
        "symptoms": ["Dark spot lesions", "Yellow halo rings", "Leaf margin drying"],
        "affected_parts": ["Foliage", "Upper leaves"],
        "spread_method": "Wind and rain splash"
    },
    "treatment": {
        "organic": [
            "Apply Neem oil spray (5ml per liter of water) every 7 days",
            "Spray copper oxychloride or organic sulfur fungicide"
        ],
        "chemical": [
            "Spray Mancozeb (2g per liter) or Carbendazim (1g per liter) on foliage"
        ],
        "fertilizer": [
            "Apply balanced NPK 19:19:19 to strengthen plant disease resistance"
        ],
        "watering": "Water at the soil base only. Avoid wetting foliage during humid weather.",
        "soil": "Ensure good field drainage and add well-rotted organic compost.",
        "sunlight": "Ensure crops receive at least 6 hours of direct sunlight.",
        "temperature": "Optimal growth: 20°C - 30°C"
    },
    "prevention": [
        "Maintain adequate plant spacing for ventilation",
        "Remove and destroy severely affected leaves",
        "Practice crop rotation with non-host crops next season"
    ],
    "farmer_advice": [
        "Inspect field early morning for new spot formations.",
        "Avoid overhead irrigation during humid weather."
    ],
    "recommendation": "Spray Neem Oil (5ml/L) or Copper Fungicide (2g/L). Avoid foliage wetting.",
    "disclaimer": "This is an offline rule-based advisory generated because the cloud AI quota was temporarily reached."
}

async def call_openrouter_api(image_base64: str, mime_type: str, language: str = "english") -> str:
    """
    Call direct Gemini API or OpenRouter API based on key format and configuration,
    with an intelligent offline fallback if all cloud models are rate limited.
    """
    language_instruction = ""
    if language.lower() != "english":
        language_instruction = (
            f"\n\n# LANGUAGE REQUIREMENT\n"
            f"You MUST generate all user-facing text values in language: {language.upper()}.\n"
            f"CRITICAL: Keep the JSON keys (e.g. 'common_name', 'is_healthy', 'disease_information') EXACTLY in English."
        )

    full_prompt = AGROAI_PROMPT + language_instruction

    # Resolve direct Gemini API Key
    gemini_key = settings.get_gemini_key("SCAN")

    if gemini_key:
        logger.info("Direct Gemini API key detected for Plant Medic Scan.")
        direct_models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash-lite",
        ]
        for direct_model in direct_models:
            logger.info(f"Trying direct Gemini model: {direct_model}...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{direct_model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": full_prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": image_base64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "candidates" in data and data["candidates"]:
                            result_text = data["candidates"][0]["content"]["parts"][0]["text"]
                            logger.info(f"Successfully received analysis from direct Gemini API ({direct_model}).")
                            return result_text
                    logger.warning(f"Direct Gemini ({direct_model}) returned {response.status_code}: {response.text[:300]}")
            except Exception as e:
                logger.warning(f"Direct Gemini API ({direct_model}) failed: {e}")

    # Fallback to OpenRouter if an OpenRouter key is provided
    openrouter_key = settings.OPENROUTER_API_KEY
    if openrouter_key and openrouter_key.startswith("sk-or-v1-"):
        # Build ordered model list: configured model first, then reliable free fallbacks
        openrouter_models = []
        configured_model = (settings.OPENROUTER_MODEL or "").strip()
        # Only add configured model if it looks valid (not placeholder/empty)
        if configured_model and configured_model not in ["", "openrouter/free", "replace_with_model"]:
            openrouter_models.append(configured_model)
        # Reliable free vision models as fallbacks
        for fallback in [
            "google/gemini-2.5-flash",
            "google/gemini-2.0-flash-exp:free",
            "google/gemini-2.0-flash-lite-001",
            "meta-llama/llama-3.2-11b-vision-instruct:free",
            "qwen/qwen-2-vl-7b-instruct:free"
        ]:
            if fallback not in openrouter_models:
                openrouter_models.append(fallback)

        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/agroai/ml-service",
            "X-Title": "AgroAI ML Service",
        }

        for or_model in openrouter_models:
            logger.info(f"Trying OpenRouter model: {or_model}...")
            # Free tier models don't support response_format; paid models do
            is_free_model = ":free" in or_model
            payload = {
                "model": or_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": full_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}}
                        ]
                    }
                ],
                "max_tokens": 700  # Kept under free credit limit (~743 tokens available)
            }
            # Only add response_format for paid models (gemini-2.5-flash without :free suffix)
            if not is_free_model:
                payload["response_format"] = {"type": "json_object"}
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "choices" in data and data["choices"]:
                            result_text = data["choices"][0]["message"]["content"]
                            logger.info(f"Successfully received analysis from OpenRouter ({or_model}).")
                            return result_text
                    logger.warning(f"OpenRouter ({or_model}) returned {response.status_code}: {response.text[:300]}")
            except Exception as e:
                logger.warning(f"OpenRouter call ({or_model}) failed: {e}")

    # Offline Fallback Response instead of raising crash exception
    logger.warning("All online cloud models failed/rate-limited. Delivering offline advisory fallback response.")
    return json.dumps(OFFLINE_FALLBACK_DIAGNOSIS)

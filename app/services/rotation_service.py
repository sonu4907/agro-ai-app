import json
import httpx
import re
from loguru import logger
from fastapi import HTTPException

from app.config.settings import settings
from app.schemas.rotation import RotationRequest, RotationResponse

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def extract_json_from_text(text: str) -> str:
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx == -1 or end_idx == -1:
        raise ValueError("No JSON object found in response text")
    return text[start_idx:end_idx+1]

def clean_and_parse_rotation_json(raw_text: str) -> dict:
    cleaned = extract_json_from_text(raw_text)
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)
    return json.loads(cleaned, strict=False)

ROTATION_SYSTEM_PROMPT = """You are AgroAI Crop Rotation and Soil Health Advisor — an expert agricultural AI.
Analyze the farmer's soil type, region (climate, topography), and previous crop.
Recommend the 3 best crops to plant next in a crop rotation scheme.
Ensure the recommendations:
1. Promote soil health (e.g. nitrogen fixation, pest cycle disruption, deep root channels).
2. Are suitable for the specified region's climate/seasons.
3. Optimize yield and local profitability.

You MUST respond ONLY with a JSON object that adheres to the following structure:
{
  "current_crop": "the previous crop specified by the user",
  "soil_health_assessment": "assessment of the soil status after the previous crop",
  "recommended_crops": [
    {
      "crop_name": "crop name",
      "scientific_name": "scientific name",
      "expected_yield": "predicted yield range per acre",
      "profitability": "expected profit category and brief explanation",
      "soil_benefits": ["benefit 1", "benefit 2"],
      "sowing_time": "best month/season",
      "duration": "days to harvest",
      "water_requirement": "low/medium/high and description",
      "fertilizer_requirement": ["NPK values and recommendations"],
      "prevention_tips": ["pest/disease prevention tips"]
    }
  ],
  "overall_advice": "general advice for soil prep and rotation success"
}

Ensure all text descriptions are written in the requested language (e.g. HINDI, MARATHI, or ENGLISH) but KEEP the JSON keys exactly in English.
Do NOT include any markdown formatting wrappers like ```json or ``` in your raw output, respond with valid raw JSON only.
"""

LANGUAGE_RULES = {
    "hindi": "You MUST generate all user-facing text values (crop names, descriptions, soil assessment, etc.) in HINDI (Devanagari script).",
    "marathi": "You MUST generate all user-facing text values (crop names, descriptions, soil assessment, etc.) in MARATHI (Devanagari script).",
    "english": "You MUST generate all user-facing text values in simple English."
}

OFFLINE_ROTATION_FALLBACK = {
    "current_crop": "Previous Harvest",
    "soil_health_assessment": "Soil nutrient reserves need replenishment of Nitrogen and Organic Carbon after the previous crop harvest.",
    "recommended_crops": [
        {
            "crop_name": "Chickpea / Gram (Chana)",
            "scientific_name": "Cicer arietinum",
            "expected_yield": "8 - 12 quintals per acre",
            "profitability": "High Profit (Low input costs, high market demand)",
            "soil_benefits": ["Fixes atmospheric Nitrogen in soil nodule roots", "Disrupts cereal pest lifecycles"],
            "sowing_time": "October - November (Rabi Season)",
            "duration": "100 - 120 days",
            "water_requirement": "Low (1-2 protective irrigations)",
            "fertilizer_requirement": ["NPK 20:40:20 kg/ha", "Rhizobium inoculation"],
            "prevention_tips": ["Deep autumn plowing to eliminate wilt fungi", "Avoid waterlogging"]
        },
        {
            "crop_name": "Mustard (Sarson)",
            "scientific_name": "Brassica juncea",
            "expected_yield": "6 - 10 quintals per acre",
            "profitability": "Medium to High Profit",
            "soil_benefits": ["Bio-fumigation effect against soil-borne pathogens", "Deep tap root improves soil structure"],
            "sowing_time": "September - October",
            "duration": "110 - 130 days",
            "water_requirement": "Low to Medium (2-3 irrigations)",
            "fertilizer_requirement": ["NPK 80:40:40 kg/ha", "Sulfur application (20kg/ha)"],
            "prevention_tips": ["Monitor for aphids during early bloom", "Use yellow sticky traps"]
        },
        {
            "crop_name": "Green Gram (Moong)",
            "scientific_name": "Vigna radiata",
            "expected_yield": "5 - 8 quintals per acre",
            "profitability": "High Profit (Short duration cash crop)",
            "soil_benefits": ["Excellent green manure crop", "Increases soil organic matter"],
            "sowing_time": "March - April (Summer) / July (Kharif)",
            "duration": "60 - 75 days",
            "water_requirement": "Medium",
            "fertilizer_requirement": ["NPK 12:24:12 kg/ha"],
            "prevention_tips": ["Use certified disease-resistant seeds", "Control yellow mosaic virus vectors"]
        }
    ],
    "overall_advice": "Practice deep plowing during summer, apply 4 tons of well-decomposed FYM per acre, and incorporate legumes in rotation to maximize soil fertility."
}


async def recommend_crop_rotation(req: RotationRequest) -> RotationResponse:
    """
    Call direct Gemini API or OpenRouter API to get crop rotation recommendations,
    with automatic key format detection and offline fallback.
    """
    lang_rule = LANGUAGE_RULES.get(req.language.lower(), LANGUAGE_RULES["english"])
    full_prompt = (
        f"{ROTATION_SYSTEM_PROMPT}\n\n"
        f"LANGUAGE RULE: {lang_rule}\n\n"
        f"FARMER INPUT:\n"
        f"- Soil Type: {req.soil_type}\n"
        f"- Region: {req.region}\n"
        f"- Previous Crop: {req.previous_crop}\n"
    )

    # Check for direct Gemini API key
    gemini_key = settings.get_gemini_key("ROTATION")

    if gemini_key:
        logger.info("GEMINI_API_KEY detected. Using direct Google Gemini API for Crop Rotation.")
        direct_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"]
        for direct_model in direct_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{direct_model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "candidates" in data and data["candidates"]:
                            result_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                            parsed = clean_and_parse_rotation_json(result_text)
                            return RotationResponse(
                                success=True,
                                current_crop=parsed.get("current_crop", req.previous_crop),
                                recommended_crops=parsed.get("recommended_crops", []),
                                soil_health_assessment=parsed.get("soil_health_assessment", ""),
                                overall_advice=parsed.get("overall_advice", "")
                            )
            except Exception as e:
                logger.warning(f"Direct Gemini API ({direct_model}) failed for crop rotation: {e}")

    # Fallback to OpenRouter
    openrouter_key = settings.OPENROUTER_API_KEY
    if openrouter_key and openrouter_key.startswith("sk-or-v1-"):
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/agroai/ml-service",
            "X-Title": "AgroAI Crop Rotation Advisor",
        }
        for or_model in ["google/gemini-2.5-flash", "google/gemini-2.0-flash-exp:free"]:
            payload = {
                "model": or_model,
                "messages": [{"role": "user", "content": full_prompt}],
                "response_format": {"type": "json_object"},
                "max_tokens": 1500,
                "temperature": 0.3
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "choices" in data and data["choices"]:
                            result_text = data["choices"][0]["message"]["content"].strip()
                            parsed = clean_and_parse_rotation_json(result_text)
                            return RotationResponse(
                                success=True,
                                current_crop=parsed.get("current_crop", req.previous_crop),
                                recommended_crops=parsed.get("recommended_crops", []),
                                soil_health_assessment=parsed.get("soil_health_assessment", ""),
                                overall_advice=parsed.get("overall_advice", "")
                            )
            except Exception as e:
                logger.warning(f"OpenRouter ({or_model}) failed for crop rotation: {e}")

    # Offline Fallback Response
    logger.warning("Delivering offline rule-based crop rotation fallback.")
    return RotationResponse(
        success=True,
        current_crop=req.previous_crop,
        recommended_crops=OFFLINE_ROTATION_FALLBACK["recommended_crops"],
        soil_health_assessment=OFFLINE_ROTATION_FALLBACK["soil_health_assessment"],
        overall_advice=OFFLINE_ROTATION_FALLBACK["overall_advice"]
    )

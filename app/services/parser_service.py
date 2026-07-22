import re
import json
from loguru import logger
from fastapi import HTTPException


def clean_json_string(raw_text: str) -> str:
    """
    Clean raw output text to extract a clean JSON string.
    Removes markdown code blocks and trims whitespace.
    """
    cleaned = raw_text.strip()

    # Match code blocks: ```json ... ``` or ``` ... ```
    pattern = r"^\s*```(?:json)?\s*(.*?)\s*```\s*$"
    match = re.match(pattern, cleaned, re.DOTALL | re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    # If it still doesn't look like standard JSON, try finding first '{' and last '}'
    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx:end_idx + 1].strip()

    return cleaned


def extract_field_regex(key: str, text: str) -> str:
    """
    Search for a key and extract its string value using regex.
    """
    pattern = rf'"{key}"\s*:\s*"([^"]*)"'
    match = re.search(pattern, text)
    if match:
        return match.group(1).strip()
    return ""


def extract_list_regex(key: str, text: str) -> list:
    """
    Search for a key and extract its array values using regex.
    """
    pattern = rf'"{key}"\s*:\s*\[\s*([^\]]*)\s*\]'
    match = re.search(pattern, text)
    if match:
        items = match.group(1).split(",")
        return [i.strip().strip('"').strip("'") for i in items if i.strip()]
    return []


def parse_agroai_response(raw_response: str) -> dict:
    """
    Clean, parse and validate the JSON response from AgroAI.
    """
    if not raw_response:
        logger.error("Received empty response from OpenRouter API")
        raise HTTPException(
            status_code=502,
            detail="Received empty response from image analysis service."
        )

    cleaned_text = clean_json_string(raw_response)

    # 1. Clean trailing commas in JSON objects and arrays
    cleaned_text = re.sub(r',\s*([\]}])', r'\1', cleaned_text)

    try:
        # Use strict=False to allow raw control characters (newlines, tabs) inside strings
        parsed_json = json.loads(cleaned_text, strict=False)
        logger.info("Successfully parsed response to dict with strict=False")
        return parsed_json
    except json.JSONDecodeError as e:
        logger.warning(f"Standard JSON parsing failed: {e}. Trying fallback regex-based key extraction.")
        
        # 2. Try to extract fields using regex as a robust fallback
        try:
            fallback_dict = {
                "success": False,
                "plant": {
                    "common_name": extract_field_regex("common_name", cleaned_text) or "Unknown Plant",
                    "scientific_name": extract_field_regex("scientific_name", cleaned_text) or "",
                    "family": extract_field_regex("family", cleaned_text) or "",
                    "crop_type": extract_field_regex("crop_type", cleaned_text) or "",
                    "growth_stage": extract_field_regex("growth_stage", cleaned_text) or ""
                },
                "health": {
                    "is_healthy": "true" in (extract_field_regex("is_healthy", cleaned_text) or "").lower(),
                    "confidence": 0.8,
                    "severity": extract_field_regex("severity", cleaned_text) or "medium",
                    "disease": extract_field_regex("disease", cleaned_text) or "Unknown disease"
                },
                "disease_information": {
                    "description": extract_field_regex("description", cleaned_text) or "",
                    "causes": extract_list_regex("causes", cleaned_text),
                    "symptoms": extract_list_regex("symptoms", cleaned_text),
                    "affected_parts": extract_list_regex("affected_parts", cleaned_text),
                    "spread_method": extract_field_regex("spread_method", cleaned_text) or ""
                },
                "treatment": {
                    "organic": extract_list_regex("organic", cleaned_text),
                    "chemical": extract_list_regex("chemical", cleaned_text),
                    "fertilizer": extract_list_regex("fertilizer", cleaned_text),
                    "watering": extract_field_regex("watering", cleaned_text) or "",
                    "soil": extract_field_regex("soil", cleaned_text) or "",
                    "sunlight": extract_field_regex("sunlight", cleaned_text) or "",
                    "temperature": extract_field_regex("temperature", cleaned_text) or ""
                },
                "prevention": extract_list_regex("prevention", cleaned_text),
                "farmer_advice": extract_list_regex("farmer_advice", cleaned_text),
                "recommendation": extract_field_regex("recommendation", cleaned_text) or "Please review the raw analysis.",
                "disclaimer": "This analysis was recovered from raw model output.",
                "error": f"JSON parse error resolved via fallback: {str(e)}"
            }
            
            # If we successfully extracted key info, count as partial success
            if fallback_dict["plant"]["common_name"] != "Unknown Plant" or fallback_dict["health"]["disease"] != "Unknown disease":
                fallback_dict["success"] = True
                logger.info("Successfully recovered response using regex fallback parser.")
                return fallback_dict
        except Exception as fallback_error:
            logger.error(f"Fallback regex parser failed: {fallback_error}")

        # 3. Ultimate fallback: place the entire raw text into recommendation field
        logger.error(
            f"Failed to parse cleaned JSON response. "
            f"Raw length: {len(raw_response)}. Cleaned length: {len(cleaned_text)}. "
            f"Error: {str(e)}"
        )
        return {
            "success": False,
            "plant": {"common_name": "Unable to Parse", "scientific_name": "", "family": "", "crop_type": "", "growth_stage": ""},
            "health": {"is_healthy": False, "confidence": 0, "severity": "high", "disease": "Parsing Error"},
            "disease_information": {"description": "The AI response format was invalid.", "causes": [], "symptoms": [], "affected_parts": [], "spread_method": ""},
            "treatment": {"organic": [], "chemical": [], "fertilizer": [], "watering": "", "soil": "", "sunlight": "", "temperature": ""},
            "prevention": [],
            "farmer_advice": [],
            "recommendation": f"Raw Response:\n{raw_response}",
            "disclaimer": "This analysis could not be formatted properly.",
            "error": f"JSON parse error: {str(e)}"
        }

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.prediction_service import predict_plant_disease
from app.schemas.prediction import AgroAIResponse

router = APIRouter()


@router.post("/", response_model=AgroAIResponse)
async def predict(
    image: UploadFile = File(...),
    language: str = Form("english")
):
    """
    Upload a plant image and analyze it using AgroAI.
    """
    try:
        result = await predict_plant_disease(image, language)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException as e:
        return {
            "success": False,
            "plant": None,
            "health": None,
            "disease_information": None,
            "treatment": None,
            "prevention": [],
            "farmer_advice": [],
            "recommendation": "The image analysis service is temporarily unavailable. Please try again shortly.",
            "disclaimer": "This AI-generated analysis is for informational purposes only.",
            "error": str(e.detail) if hasattr(e, "detail") else str(e)
        }
    except Exception as e:
        return {
            "success": False,
            "plant": None,
            "health": None,
            "disease_information": None,
            "treatment": None,
            "prevention": [],
            "farmer_advice": [],
            "recommendation": "The image analysis service is temporarily unavailable. Please try again shortly.",
            "disclaimer": "This AI-generated analysis is for informational purposes only.",
            "error": f"An unexpected error occurred during prediction: {str(e)}"
        }
from fastapi import APIRouter, HTTPException

from app.schemas.rotation import RotationRequest, RotationResponse
from app.services.rotation_service import recommend_crop_rotation

router = APIRouter()


@router.post("/recommend", response_model=RotationResponse)
async def get_rotation_recommendation(request: RotationRequest):
    """
    Get AI-powered crop rotation and soil health recommendations.
    """
    try:
        response = await recommend_crop_rotation(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

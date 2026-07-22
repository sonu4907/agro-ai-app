from typing import List, Optional
from pydantic import BaseModel, Field


class CropRecommendation(BaseModel):
    crop_name: str = Field(description="Name of the recommended crop")
    scientific_name: str = Field(description="Scientific name of the recommended crop")
    expected_yield: str = Field(description="Predicted yield (e.g. 15-20 Quintals per acre)")
    profitability: str = Field(description="Expected profit level (High, Medium, Low) and reasons")
    soil_benefits: List[str] = Field(default_factory=list, description="How this crop benefits the soil health")
    sowing_time: str = Field(description="Best time/season to sow this crop")
    duration: str = Field(description="Time to harvest (e.g. 120 days)")
    water_requirement: str = Field(description="Watering frequency and volume needed")
    fertilizer_requirement: List[str] = Field(default_factory=list, description="NPK values and recommendations")
    prevention_tips: List[str] = Field(default_factory=list, description="Pest/disease prevention tips for this crop")


class RotationRequest(BaseModel):
    soil_type: str = Field(min_length=2, max_length=50)
    region: str = Field(min_length=2, max_length=100)
    previous_crop: str = Field(min_length=2, max_length=50)
    language: str = "english"


class RotationResponse(BaseModel):
    success: bool = True
    current_crop: str = ""
    recommended_crops: List[CropRecommendation] = Field(default_factory=list)
    soil_health_assessment: str = Field(default="", description="General assessment of current soil health state")
    overall_advice: str = Field(default="", description="General advice for soil prep and rotation success")
    error: Optional[str] = None

from typing import List, Optional
from pydantic import BaseModel, Field


class PlantInfo(BaseModel):
    common_name: str = ""
    scientific_name: str = ""
    family: str = ""
    crop_type: str = ""
    growth_stage: str = ""


class HealthInfo(BaseModel):
    is_healthy: bool = False
    confidence: float = 0.0
    severity: str = "Low"
    disease: str = ""


class DiseaseInfo(BaseModel):
    description: str = ""
    causes: List[str] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    affected_parts: List[str] = Field(default_factory=list)
    spread_method: str = ""


class TreatmentInfo(BaseModel):
    organic: List[str] = Field(default_factory=list)
    chemical: List[str] = Field(default_factory=list)
    fertilizer: List[str] = Field(default_factory=list)
    watering: str = ""
    soil: str = ""
    sunlight: str = ""
    temperature: str = ""


class AgroAIResponse(BaseModel):
    success: bool = True
    plant: Optional[PlantInfo] = None
    health: Optional[HealthInfo] = None
    disease_information: Optional[DiseaseInfo] = None
    treatment: Optional[TreatmentInfo] = None
    prevention: Optional[List[str]] = None
    farmer_advice: Optional[List[str]] = None
    recommendation: Optional[str] = None
    disclaimer: Optional[str] = None
    error: Optional[str] = None

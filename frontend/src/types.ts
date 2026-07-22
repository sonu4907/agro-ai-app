/* Shared TypeScript types used across components */

export interface PlantInfo {
  common_name: string
  scientific_name: string
  family: string
  crop_type: string
  growth_stage: string
}

export interface HealthInfo {
  is_healthy: boolean
  confidence: number
  severity: string
  disease: string
}

export interface DiseaseInfo {
  description: string
  causes: string[]
  symptoms: string[]
  affected_parts: string[]
  spread_method: string
}

export interface TreatmentInfo {
  organic: string[]
  chemical: string[]
  fertilizer: string[]
  watering: string
  soil: string
  sunlight: string
  temperature: string
}

export interface AgroAIResponse {
  success: boolean
  plant?: PlantInfo
  health?: HealthInfo
  disease_information?: DiseaseInfo
  treatment?: TreatmentInfo
  prevention?: string[]
  farmer_advice?: string[]
  recommendation?: string
  disclaimer?: string
  error?: string
}

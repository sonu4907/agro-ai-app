from datetime import datetime

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "Agro AI ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
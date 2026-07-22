from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.predict import router as predict_router
from app.api.routes.chat import router as chat_router
from app.api.routes.telegram import router as telegram_router
from app.api.routes.garden import router as garden_router
from app.api.routes.rotation import router as rotation_router
from app.api.routes.market import router as market_router

api_router = APIRouter()

api_router.include_router(
    health_router,
    prefix="/health",
    tags=["Health"]
)

api_router.include_router(
    predict_router,
    prefix="/prediction",
    tags=["Prediction"]
)

api_router.include_router(
    predict_router,
    prefix="/predict",
    tags=["Prediction"]
)

api_router.include_router(
    chat_router,
    prefix="/chat",
    tags=["Chatbot"]
)

api_router.include_router(
    telegram_router,
    prefix="/telegram",
    tags=["Telegram"]
)

api_router.include_router(
    garden_router,
    prefix="/garden",
    tags=["Smart Garden"]
)

api_router.include_router(
    rotation_router,
    prefix="/rotation",
    tags=["Crop Rotation"]
)

api_router.include_router(
    market_router,
    prefix="/market",
    tags=["Market Prices"]
)

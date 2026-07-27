import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.api.router import api_router
from app.services.irrigation_agent import run_irrigation_agent_check

async def periodic_irrigation_agent_loop():
    """Background task polling farm telemetry and running Proactive Agent check every 1 hour."""
    logger.info("Autonomous Proactive Irrigation Agent background loop started.")
    while True:
        try:
            # Poll every 3600 seconds (1 hour)
            await asyncio.sleep(3600)
            logger.info("Running background Proactive Irrigation Agent telemetry check...")
            await run_irrigation_agent_check()
        except asyncio.CancelledError:
            logger.info("Proactive Irrigation Agent loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in Proactive Irrigation Agent loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background Proactive Irrigation Agent loop
    task = asyncio.create_task(periodic_irrigation_agent_loop())
    yield
    # Shutdown: cancel task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Agro AI ML Service",
    version="1.2.0",
    description="AI Powered Agentic Agriculture & Plant Diagnostics",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

@app.get("/health")
@app.get("/api/v1/garden/health")
async def health_check():
    return {"status": "ok", "message": "Plant Medic Backend Online 🌿", "version": "1.2.0"}

@app.get("/debug/keys")
async def debug_keys():
    """
    Shows which API keys are loaded on the server (values masked for security).
    Use this to verify Render environment variables are set correctly.
    Visit: https://agro-ai-ml-service.onrender.com/debug/keys
    """
    from app.config.settings import settings

    def mask(val: str) -> str:
        if not val or len(val) < 8:
            return "NOT_SET"
        return f"SET:{val[:4]}...{val[-4:]}(len={len(val)})"

    return {
        "status": "ok",
        "api_keys_status": {
            "GEMINI_API_KEY": mask(settings.GEMINI_API_KEY),
            "GEMINI_SCAN_API_KEY": mask(settings.GEMINI_SCAN_API_KEY),
            "GEMINI_CHAT_API_KEY": mask(settings.GEMINI_CHAT_API_KEY),
            "GEMINI_IRRIGATION_API_KEY": mask(settings.GEMINI_IRRIGATION_API_KEY),
            "GEMINI_ROTATION_API_KEY": mask(settings.GEMINI_ROTATION_API_KEY),
            "OPENROUTER_API_KEY": mask(settings.OPENROUTER_API_KEY),
            "OPENROUTER_MODEL": settings.OPENROUTER_MODEL or "NOT_SET",
            "TELEGRAM_BOT_TOKEN": mask(settings.TELEGRAM_BOT_TOKEN),
        },
        "resolved_scan_key_available": bool(settings.get_gemini_key("SCAN")),
        "openrouter_available": bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.startswith("sk-or-v1-")),
        "note": "If GEMINI keys show NOT_SET, add them in Render Dashboard > Environment. If only OPENROUTER is set, OpenRouter will handle AI requests."
    }

# If a built frontend exists at ../frontend/dist, serve it as the root static app.
build_dir = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if build_dir.exists():
    app.mount("/", StaticFiles(directory=str(build_dir), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Agro AI ML Service Running 🚀"}
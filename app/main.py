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
    version="1.1.0",
    description="AI Powered Agentic Agriculture & Plant Diagnostics",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

# If a built frontend exists at ../frontend/dist, serve it as the root static app.
build_dir = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if build_dir.exists():
    app.mount("/", StaticFiles(directory=str(build_dir), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Agro AI ML Service Running 🚀"}
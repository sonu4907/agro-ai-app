import json
from fastapi import APIRouter, Form
from fastapi.responses import JSONResponse
from loguru import logger

from app.services.chat_service import call_farmer_chat

router = APIRouter()


@router.post("")
@router.post("/")
async def farmer_chat(
    message:      str = Form(...),
    language:     str = Form("english"),
    history:      str = Form("[]"),       # JSON string of [{role, content}]
    scan_context: str = Form(""),         # Optional: current scan result summary
):
    """
    Farmer AI Chatbot endpoint.
    Accepts a message + conversation history + optional scan context.
    Returns AI response in the requested language.
    """
    try:
        history_list = json.loads(history)
    except Exception:
        history_list = []

    logger.info(f"Chat request — language={language}, history_len={len(history_list)}")

    reply = await call_farmer_chat(
        message=message,
        language=language,
        history=history_list,
        scan_context=scan_context,
    )

    return JSONResponse(content={"success": True, "reply": reply})

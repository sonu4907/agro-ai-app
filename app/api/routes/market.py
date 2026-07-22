from fastapi import APIRouter, HTTPException
import httpx
from loguru import logger

from app.schemas.market import MarketRequest, MarketResponse, MandiSubscribeRequest, MandiSubscribeResponse
from app.services.market_service import get_market_prices
from app.config.settings import settings

router = APIRouter()


@router.post("/prices", response_model=MarketResponse)
async def fetch_prices(request: MarketRequest):
    """
    Get live market rates and commodity prices from Government APMCs (Mandis).
    """
    try:
        response = await get_market_prices(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch market rates: {str(e)}"
        )


@router.post("/subscribe-alerts", response_model=MandiSubscribeResponse)
async def subscribe_mandi_alerts(request: MandiSubscribeRequest):
    """
    Subscribe a farmer to daily mandi rate alerts for a specific crop and district.
    Dispatches instant alert via Telegram or logs SMS notification.
    """
    try:
        mandi_req = MarketRequest(
            state=request.state,
            district=request.district,
            commodity=request.crop,
            limit=50
        )
        res = await get_market_prices(mandi_req)

        highest_mandi = None
        highest_price = None

        if res.records:
            sorted_records = sorted(res.records, key=lambda x: x.max_price, reverse=True)
            top = sorted_records[0]
            highest_mandi = f"{top.market} ({top.district})"
            highest_price = top.max_price

        rate_str = f"₹{highest_price:.0f}/quintal at {highest_mandi}" if highest_price else "Rates updating soon"
        alert_msg = (
            f"📈 AgroAI Mandi Alert: Highest rate for {request.crop} in {request.district} is {rate_str}. "
            f"Daily automated updates enabled for {request.contact}!"
        )

        if request.channel == "telegram" and settings.TELEGRAM_BOT_TOKEN:
            chat_id = request.contact if request.contact and request.contact.isdigit() else settings.TELEGRAM_CHAT_ID
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                        json={"chat_id": chat_id, "text": alert_msg}
                    )
                logger.info(f"Telegram Mandi Alert dispatched to chat {chat_id}")
            except Exception as tg_err:
                logger.warning(f"Failed to dispatch Telegram message: {tg_err}")

        logger.info(f"Mandi Alert Subscribed for {request.crop} in {request.district} via {request.channel}")

        return MandiSubscribeResponse(
            success=True,
            message=f"Subscribed successfully to daily alerts for {request.crop} in {request.district}!",
            highest_mandi=highest_mandi,
            highest_price=highest_price,
            crop=request.crop,
            district=request.district
        )
    except Exception as e:
        logger.exception("Error subscribing to Mandi alerts")
        raise HTTPException(status_code=500, detail=f"Failed to subscribe to Mandi alerts: {str(e)}")

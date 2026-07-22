import httpx
from typing import Optional, List
from loguru import logger

from app.config.settings import settings
from app.schemas.market import MarketRequest, MarketResponse, MarketRecord

DATA_GOV_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = f"https://api.data.gov.in/resource/{DATA_GOV_RESOURCE_ID}"

# High quality mock backup data in case the Government API times out or is down (which happens frequently)
MOCK_DATA = [
    {"state": "Maharashtra", "district": "Pune", "market": "Pune APMC", "commodity": "Wheat", "variety": "Lokwan", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 2400, "max_price": 2800, "modal_price": 2600},
    {"state": "Maharashtra", "district": "Nagpur", "market": "Nagpur APMC", "commodity": "Rice", "variety": "Kolam", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 3200, "max_price": 3800, "modal_price": 3500},
    {"state": "Maharashtra", "district": "Chattrapati Sambhajinagar", "market": "Sillod APMC", "commodity": "Cotton", "variety": "LRA", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 6800, "max_price": 7500, "modal_price": 7200},
    {"state": "Maharashtra", "district": "Latur", "market": "Latur APMC", "commodity": "Soybean", "variety": "Yellow", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 4300, "max_price": 4800, "modal_price": 4600},
    {"state": "Maharashtra", "district": "Nashik", "market": "Lasalgaon APMC", "commodity": "Onion", "variety": "Red", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 1500, "max_price": 2200, "modal_price": 1800},
    {"state": "Maharashtra", "district": "Pune", "market": "Manchar APMC", "commodity": "Tomato", "variety": "Local", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 2000, "max_price": 2800, "modal_price": 2400},
    {"state": "Maharashtra", "district": "Jalgaon", "market": "Jalgaon APMC", "commodity": "Banana", "variety": "G9", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 1200, "max_price": 1800, "modal_price": 1500},
    
    {"state": "Gujarat", "district": "Rajkot", "market": "Rajkot APMC", "commodity": "Groundnut", "variety": "G20", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 6200, "max_price": 6900, "modal_price": 6500},
    {"state": "Gujarat", "district": "Ahmedabad", "market": "Ahmedabad APMC", "commodity": "Cotton", "variety": "Shankar-6", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 6900, "max_price": 7600, "modal_price": 7300},
    
    {"state": "Madhya Pradesh", "district": "Indore", "market": "Indore APMC", "commodity": "Soybean", "variety": "Yellow", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 4200, "max_price": 4700, "modal_price": 4500},
    {"state": "Madhya Pradesh", "district": "Ujjain", "market": "Ujjain APMC", "commodity": "Wheat", "variety": "Sharbati", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 2600, "max_price": 3100, "modal_price": 2850},
    
    {"state": "Punjab", "district": "Ludhiana", "market": "Ludhiana APMC", "commodity": "Rice", "variety": "Basmati", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 4100, "max_price": 4800, "modal_price": 4450},
    {"state": "Punjab", "district": "Amritsar", "market": "Amritsar APMC", "commodity": "Wheat", "variety": "Kanak", "grade": "FAQ", "arrival_date": "20/07/2026", "min_price": 2200, "max_price": 2400, "modal_price": 2275},
]


def get_fallback_data(req_data: MarketRequest) -> List[MarketRecord]:
    """
    Filter the high-quality mock backup data based on query filters.
    """
    filtered = []
    
    # Simple formatting logic to clean parameters
    def matches(val: str, filter_val: Optional[str]) -> bool:
        if not filter_val:
            return True
        return filter_val.strip().lower() in val.lower()

    for item in MOCK_DATA:
        if (matches(item["state"], req_data.state) and 
            matches(item["district"], req_data.district) and 
            matches(item["commodity"], req_data.commodity)):
            filtered.append(
                MarketRecord(
                    state=item["state"],
                    district=item["district"],
                    market=item["market"],
                    commodity=item["commodity"],
                    variety=item["variety"],
                    grade=item["grade"],
                    arrival_date=item["arrival_date"],
                    min_price=float(item["min_price"]),
                    max_price=float(item["max_price"]),
                    modal_price=float(item["modal_price"])
                )
            )
            
    # If a specific state/district/commodity filter yields no mock data, return general Maharashtra records
    if not filtered:
        for item in MOCK_DATA[:6]:
            filtered.append(
                MarketRecord(
                    state=item["state"],
                    district=item["district"],
                    market=item["market"],
                    commodity=item["commodity"],
                    variety=item["variety"],
                    grade=item["grade"],
                    arrival_date=item["arrival_date"],
                    min_price=float(item["min_price"]),
                    max_price=float(item["max_price"]),
                    modal_price=float(item["modal_price"])
                )
            )
    return filtered


async def get_market_prices(req_data: MarketRequest) -> MarketResponse:
    """
    Fetch market prices from Gov api.data.gov.in API.
    If the API fails or times out, gracefully falls back to local high-quality mock data.
    """
    api_key = settings.GOV_API_KEY
    if not api_key:
        logger.error("GOV_API_KEY settings configuration missing. Falling back to offline data.")
        fallback_records = get_fallback_data(req_data)
        return MarketResponse(
            success=True,
            total=len(fallback_records),
            records=fallback_records,
            error="Government Mandi API key is missing. Showing offline fallback rates."
        )

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": req_data.limit
    }

    # Helper function to title-case filters for the case-sensitive Government API
    def clean_filter_value(val: str) -> str:
        words = val.strip().split()
        return " ".join(w.capitalize() for w in words)

    if req_data.state:
        params["filters[state]"] = clean_filter_value(req_data.state)
    if req_data.district:
        params["filters[district]"] = clean_filter_value(req_data.district)
    if req_data.commodity:
        params["filters[commodity]"] = clean_filter_value(req_data.commodity)

    logger.info(f"Querying Government Mandi API with params (key hidden): { {k: v for k, v in params.items() if k != 'api-key'} }")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        # Fetch from Government API with 20 seconds timeout
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(BASE_URL, params=params, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"Government Mandi API returned status {response.status_code}. Falling back to offline data.")
                fallback_records = get_fallback_data(req_data)
                return MarketResponse(
                    success=True,
                    total=len(fallback_records),
                    records=fallback_records,
                    error=f"Government API returned status {response.status_code}. Showing offline fallback rates."
                )

            data = response.json()
            
            if data.get("status") == "error":
                logger.warning(f"Government Mandi API business error: {data.get('message')}. Falling back to offline data.")
                fallback_records = get_fallback_data(req_data)
                return MarketResponse(
                    success=True,
                    total=len(fallback_records),
                    records=fallback_records,
                    error=f"Government API Error: {data.get('message')}. Showing offline fallback rates."
                )

            raw_records = data.get("records", [])
            total_records = data.get("total", 0)
            
            # Parse records
            records = []
            for r in raw_records:
                try:
                    min_p = float(r.get("min_price", 0))
                    max_p = float(r.get("max_price", 0))
                    modal_p = float(r.get("modal_price", 0))

                    records.append(
                        MarketRecord(
                            state=r.get("state", ""),
                            district=r.get("district", ""),
                            market=r.get("market", ""),
                            commodity=r.get("commodity", ""),
                            variety=r.get("variety", ""),
                            grade=r.get("grade", ""),
                            arrival_date=r.get("arrival_date", ""),
                            min_price=min_p,
                            max_price=max_p,
                            modal_price=modal_p
                        )
                    )
                except Exception as parse_ex:
                    logger.warning(f"Error parsing record: {r}. Error: {parse_ex}")
                    continue

            return MarketResponse(
                success=True,
                total=total_records,
                records=records
            )

    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.warning(f"HTTP Request to Government API failed/timed out: {str(e)}. Falling back to offline data.")
        fallback_records = get_fallback_data(req_data)
        return MarketResponse(
            success=True,
            total=len(fallback_records),
            records=fallback_records,
            error="Failed to connect to Government Mandi API (timeout/error). Showing offline fallback rates."
        )
    except Exception as e:
        logger.exception("Unexpected error in market_service. Falling back to offline data.")
        fallback_records = get_fallback_data(req_data)
        return MarketResponse(
            success=True,
            total=len(fallback_records),
            records=fallback_records,
            error=f"An unexpected error occurred while fetching Mandi rates: {str(e)}. Showing offline fallback rates."
        )

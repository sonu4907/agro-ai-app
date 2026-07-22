from typing import List, Optional
from pydantic import BaseModel, Field


class MarketRecord(BaseModel):
    state: str = Field(description="State name")
    district: str = Field(description="District name")
    market: str = Field(description="Market/Mandi name")
    commodity: str = Field(description="Commodity name")
    variety: str = Field(description="Commodity variety")
    grade: str = Field(description="Commodity grade")
    arrival_date: str = Field(description="Arrival date")
    min_price: float = Field(description="Minimum price per quintal")
    max_price: float = Field(description="Maximum price per quintal")
    modal_price: float = Field(description="Modal price per quintal")


class MarketRequest(BaseModel):
    state: Optional[str] = Field(None, description="State to filter by")
    district: Optional[str] = Field(None, description="District to filter by")
    commodity: Optional[str] = Field(None, description="Commodity to filter by")
    limit: int = Field(30, description="Limit records count")


class MarketResponse(BaseModel):
    success: bool = True
    total: int = 0
    records: List[MarketRecord] = Field(default_factory=list)
    error: Optional[str] = None


class MandiSubscribeRequest(BaseModel):
    crop: str = Field(description="Target crop name e.g. Onion, Rice, Wheat")
    district: str = Field(description="Target district name")
    state: Optional[str] = Field("Maharashtra", description="Target state")
    channel: str = Field("telegram", description="Notification channel: telegram or sms")
    contact: str = Field(description="Phone number or Telegram Chat ID")


class MandiSubscribeResponse(BaseModel):
    success: bool = True
    message: str
    highest_mandi: Optional[str] = None
    highest_price: Optional[float] = None
    crop: str
    district: str

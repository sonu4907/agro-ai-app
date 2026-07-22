import asyncio
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx

from app.schemas.market import MarketRequest
from app.services.market_service import get_market_prices
from app.config.settings import settings


class TestMarketService(unittest.TestCase):
    def setUp(self):
        # Store original settings to restore later
        self.original_gov_api_key = settings.GOV_API_KEY

    def tearDown(self):
        # Restore settings
        settings.GOV_API_KEY = self.original_gov_api_key

    def test_get_market_prices_success(self):
        # Setup mock response for successful API call
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "total": 1,
            "records": [
                {
                    "state": "Maharashtra",
                    "district": "Pune",
                    "market": "Pune APMC",
                    "commodity": "Wheat",
                    "variety": "Lokwan",
                    "grade": "FAQ",
                    "arrival_date": "20/07/2026",
                    "min_price": "2400",
                    "max_price": "2800",
                    "modal_price": "2600"
                }
            ]
        }
        
        # AsyncClient context manager returns mock client
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)
        
        # Mock AsyncClient constructor to return mock_client
        with patch("httpx.AsyncClient", return_value=mock_client):
            req = MarketRequest(
                state="Maharashtra",
                district="Pune",
                commodity="Wheat",
                limit=5
            )
            response = asyncio.run(get_market_prices(req))
            
            self.assertTrue(response.success)
            self.assertEqual(response.total, 1)
            self.assertEqual(len(response.records), 1)
            self.assertEqual(response.records[0].commodity, "Wheat")
            self.assertIsNone(response.error)

    def test_get_market_prices_missing_api_key_fallback(self):
        # Temporarily clear the API key to trigger fallback
        settings.GOV_API_KEY = ""
        
        req = MarketRequest(
            state="Maharashtra",
            district="Pune",
            commodity="Wheat",
            limit=5
        )
        response = asyncio.run(get_market_prices(req))
        
        self.assertTrue(response.success)
        self.assertGreater(len(response.records), 0)
        self.assertIn("Government Mandi API key is missing", response.error)

    def test_get_market_prices_rate_limit_fallback(self):
        # Mock API returning 429 Too Many Requests
        mock_response = MagicMock()
        mock_response.status_code = 429
        
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            req = MarketRequest(
                state="Maharashtra",
                district="Pune",
                commodity="Wheat",
                limit=5
            )
            response = asyncio.run(get_market_prices(req))
            
            self.assertTrue(response.success)
            self.assertGreater(len(response.records), 0)
            self.assertIn("returned status 429", response.error)

    def test_get_market_prices_timeout_fallback(self):
        # Mock API throwing TimeoutException
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("Connection timed out"))
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            req = MarketRequest(
                state="Maharashtra",
                district="Pune",
                commodity="Wheat",
                limit=5
            )
            response = asyncio.run(get_market_prices(req))
            
            self.assertTrue(response.success)
            self.assertGreater(len(response.records), 0)
            self.assertIn("Failed to connect to Government Mandi API", response.error)


if __name__ == "__main__":
    unittest.main()

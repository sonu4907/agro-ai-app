import asyncio
import unittest
from io import BytesIO
from unittest.mock import patch, AsyncMock
from fastapi import UploadFile
from fastapi.testclient import TestClient
from app.main import app
from app.services.image_service import UPLOAD_DIR, save_image
from app.services.parser_service import clean_json_string, parse_agroai_response


class TestAgroAI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_clean_json_string_markdown(self):
        markdown_json = "```json\n{\n  \"success\": true\n}\n```"
        cleaned = clean_json_string(markdown_json)
        self.assertEqual(cleaned, '{\n  "success": true\n}')

    def test_clean_json_string_raw(self):
        raw_json = "{\n  \"success\": true\n}"
        cleaned = clean_json_string(raw_json)
        self.assertEqual(cleaned, '{\n  "success": true\n}')

    def test_clean_json_string_with_noise(self):
        noise_json = "Some text before {\"success\": true} some text after"
        cleaned = clean_json_string(noise_json)
        self.assertEqual(cleaned, '{"success": true}')

    @patch("app.services.prediction_service.call_openrouter_api", new_callable=AsyncMock)
    def test_predict_endpoint_success(self, mock_call):
        # Setup mock response
        mock_call.return_value = """
        {
          "success": true,
          "plant": {
            "common_name": "Tomato",
            "scientific_name": "Solanum lycopersicum",
            "family": "Solanaceae",
            "crop_type": "Vegetable",
            "growth_stage": "Fruiting"
          },
          "health": {
            "is_healthy": false,
            "confidence": 0.95,
            "severity": "Moderate",
            "disease": "Tomato Late Blight"
          },
          "disease_information": {
            "description": "Late blight is a serious disease caused by the water mold Phytophthora infestans.",
            "causes": ["Phytophthora infestans", "High humidity", "Cool temperatures"],
            "symptoms": ["Dark water-soaked spots on leaves", "White fungal growth under leaves"],
            "affected_parts": ["Leaves", "Stems", "Fruit"],
            "spread_method": "Wind-blown sporangia and splashing rain"
          },
          "treatment": {
            "organic": ["Compost tea", "Copper fungicide"],
            "chemical": ["Chlorothalonil", "Mancozeb"],
            "fertilizer": ["Balanced NPK", "Organic Compost"],
            "watering": "Water at the base of the plant to keep leaves dry.",
            "soil": "Well-drained sandy loam soil",
            "sunlight": "Full sun (6-8 hours daily)",
            "temperature": "15-22°C"
          },
          "prevention": [
            "Use certified disease-free seeds",
            "Practice crop rotation",
            "Provide adequate spacing between plants",
            "Remove and destroy infected plant debris",
            "Mulch the soil surface"
          ],
          "farmer_advice": [
            "Monitor crops daily for early symptoms",
            "Avoid overhead watering"
          ],
          "recommendation": "Apply organic or chemical fungicide immediately and improve aeration.",
          "disclaimer": "This AI-generated analysis is for informational purposes only. Confirm important diagnoses with a qualified agricultural expert or local extension service before making crop management decisions."
        }
        """

        # Generate a dummy image in memory
        from io import BytesIO
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='green')
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        response = self.client.post(
            "/api/v1/prediction/",
            files={"image": ("tomato.jpg", img_byte_arr, "image/jpeg")}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["plant"]["common_name"], "Tomato")
        self.assertEqual(data["health"]["disease"], "Tomato Late Blight")
        mock_call.assert_called_once()

    def test_save_image_writes_to_absolute_uploads_dir(self):
        image_bytes = BytesIO(b"fake-image-bytes")
        file = UploadFile(filename="sample.jpg", file=image_bytes, headers={"content-type": "image/jpeg"})

        saved_path = asyncio.run(save_image(file))

        self.assertTrue(saved_path.is_absolute())
        self.assertTrue(str(saved_path).startswith(str(UPLOAD_DIR.resolve())))
        self.assertTrue(saved_path.exists())

        saved_path.unlink(missing_ok=True)

    def test_predict_endpoint_invalid_mime(self):
        # Text file instead of image
        response = self.client.post(
            "/api/v1/prediction/",
            files={"image": ("text.txt", b"hello world", "text/plain")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only JPG, JPEG, PNG and WEBP images are supported.", response.json()["detail"])

if __name__ == '__main__':
    unittest.main()

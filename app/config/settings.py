import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=False)


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = ""
    GEMINI_API_KEY: str = ""

    # Dedicated Function API Keys (to avoid 15 RPM rate limit)
    GEMINI_SCAN_API_KEY: str = ""
    GEMINI_CHAT_API_KEY: str = ""
    GEMINI_IRRIGATION_API_KEY: str = ""
    GEMINI_ROTATION_API_KEY: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    GARDEN_DEVICE_TOKEN: str = ""
    GARDEN_ADMIN_USERNAME: str = ""
    GARDEN_ADMIN_PASSWORD: str = ""
    TELEGRAM_CHAT_ID: str = "8929876223"
    GOV_API_KEY: str = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"

    # Twilio SMS & WhatsApp Gateway
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_TO_NUMBER: str = ""
    WHATSAPP_TO_NUMBER: str = ""

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        extra="ignore",
        case_sensitive=False,
        env_prefix=""
    )

    def _read_setting(self, name: str) -> str:
        value = getattr(self, name, "") or os.getenv(name, "")
        return value.strip() if isinstance(value, str) else ""

    def get_gemini_key(self, purpose: str = "SCAN") -> str:
        """
        Robust key resolver that checks dedicated purpose key, fallback GEMINI_API_KEY,
        and system os.environ with stripped whitespace.
        """
        purpose_upper = purpose.upper()

        # 1. Dedicated purpose key (e.g. GEMINI_SCAN_API_KEY)
        key = self._read_setting(f"GEMINI_{purpose_upper}_API_KEY")
        if key and key != "replace_with_openrouter_key":
            return key

        # 2. Main fallback GEMINI_API_KEY
        key = self._read_setting("GEMINI_API_KEY")
        if key and key != "replace_with_openrouter_key":
            return key

        # 3. Common Google alias used in some deployments
        key = self._read_setting("GOOGLE_API_KEY")
        if key and key != "replace_with_openrouter_key":
            return key

        # 4. OpenRouter key if formatted as direct Google AI key (AIzaSy...)
        key = self._read_setting("OPENROUTER_API_KEY")
        if key and key.startswith("AIzaSy"):
            return key

        return ""


settings = Settings()

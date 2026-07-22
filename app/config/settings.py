from pydantic_settings import BaseSettings, SettingsConfigDict


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
        env_file=".env",
        extra="ignore"
    )


settings = Settings()

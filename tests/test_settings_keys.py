import importlib
import sys


def test_google_api_key_alias_is_supported(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_API_KEY", "AIzaTest123")

    sys.modules.pop("app.config.settings", None)
    settings_module = importlib.import_module("app.config.settings")

    assert settings_module.settings.get_gemini_key("SCAN") == "AIzaTest123"

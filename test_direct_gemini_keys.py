import httpx
import asyncio
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

KEYS = {
    "GEMINI_SCAN_API_KEY": os.getenv("GEMINI_SCAN_API_KEY", "YOUR_GEMINI_SCAN_API_KEY"),
    "GEMINI_CHAT_API_KEY": os.getenv("GEMINI_CHAT_API_KEY", "YOUR_GEMINI_CHAT_API_KEY"),
    "GEMINI_IRRIGATION_API_KEY": os.getenv("GEMINI_IRRIGATION_API_KEY", "YOUR_GEMINI_IRRIGATION_API_KEY"),
    "GEMINI_ROTATION_API_KEY": os.getenv("GEMINI_ROTATION_API_KEY", "YOUR_GEMINI_ROTATION_API_KEY")
}

MODELS_TO_TEST = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest"
]

async def check_key(name: str, key: str):
    print(f"\n[KEY] Testing {name} ({key[:12]}...):")
    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in MODELS_TO_TEST:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": "Hello, respond with 'OK'."}]}]
            }
            try:
                res = await client.post(url, json=payload)
                print(f"   Model '{model}' -> HTTP Status {res.status_code}")
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    print(f"      [SUCCESS]: '{text}'")
                    return True
                else:
                    err_msg = res.json().get("error", {}).get("message", res.text[:150])
                    print(f"      [WARN] [{res.status_code}]: {err_msg}")
            except Exception as e:
                print(f"      [ERROR]: {e}")
    return False

async def main():
    print("=" * 60)
    print("DIRECT GOOGLE GEMINI API KEY DIAGNOSTICS")
    print("=" * 60)
    for name, key in KEYS.items():
        await check_key(name, key)

if __name__ == "__main__":
    asyncio.run(main())

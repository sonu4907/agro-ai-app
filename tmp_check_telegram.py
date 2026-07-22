import urllib.request
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/telegram/bot-link')
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        print(resp.status)
        print(resp.read().decode())
except Exception as e:
    print(type(e).__name__, e)

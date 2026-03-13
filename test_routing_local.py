import httpx
import json

# Sample coordinates from Nagpur near major roads
payload = {
    "start": [79.0882, 21.1458],
    "end": [79.1000, 21.1600],
    "mode": "car"
}

try:
    response = httpx.post("http://127.0.0.1:8000/api/route", json=payload, timeout=20.0)
    print("Status:", response.status_code)
    if response.status_code == 200:
        data = response.json()
        print("Path length (nodes):", len(data["path"]))
    else:
        print("Error:", response.text)
except Exception as e:
    print("Exception:", str(e))

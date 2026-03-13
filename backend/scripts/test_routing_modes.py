import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/route"

# Fixed coordinates for testing (Nagpur area)
# Start: [79.0882, 21.1458] (Approx city center)
# End: [79.070, 21.170] (Approx Katol Road area)
START = [79.0882, 21.1458]
END = [79.070, 21.170]

MODES = ['car', 'bike', 'cycle', 'pedestrian']

def test_routing():
    print(f"Testing Routing API at {BASE_URL}")
    print(f"From: {START} To: {END}\n")
    
    for mode in MODES:
        payload = {
            "start": START,
            "end": END,
            "mode": mode
        }
        try:
            response = requests.post(BASE_URL, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                opt_dist = data.get('optimal', {}).get('distance')
                opt_time = data.get('optimal', {}).get('time')
                print(f"[SUCCESS] Mode: {mode:10} | Dist: {opt_dist:10} | Time: {opt_time}")
            else:
                print(f"[FAILED ] Mode: {mode:10} | Status: {response.status_code} | Error: {response.text}")
        except Exception as e:
            print(f"[ERROR  ] Mode: {mode:10} | Exception: {str(e)}")

if __name__ == "__main__":
    test_routing()

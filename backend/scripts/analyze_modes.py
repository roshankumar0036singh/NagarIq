import json
import collections
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "data", "live_traffic.json")

def analyze_modes():
    try:
        if not os.path.exists(DATA_FILE):
            print(f"File not found: {DATA_FILE}")
            return
            
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        
        modes = collections.Counter()
        for feature in data.get('features', []):
            mode = feature.get('properties', {}).get('modalType', 'unknown')
            modes[mode] += 1
        
        print(f"Modal types distribution: {dict(modes)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_modes()

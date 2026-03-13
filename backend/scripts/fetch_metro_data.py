import os
import json
import random
from datetime import datetime

# Nagpur Metro Data Configuration
# Orange Line: North-South
# Aqua Line: East-West
# Interchange: Sitabuldi

ORANGE_LINE = [
    {"name": "Automotive Square", "coords": [79.0882, 21.2000]},
    {"name": "Nari Road", "coords": [79.0882, 21.1920]},
    {"name": "Indora Square", "coords": [79.0882, 21.1850]},
    {"name": "Kadvi Chowk", "coords": [79.0882, 21.1780]},
    {"name": "Gaddigodam Square", "coords": [79.0882, 21.1700]},
    {"name": "Kasturchand Park", "coords": [79.0882, 21.1620]},
    {"name": "Zero Mile", "coords": [79.0882, 21.1540]},
    {"name": "Sitabuldi Interchange", "coords": [79.0882, 21.1458]},
    {"name": "Congress Nagar", "coords": [79.0882, 21.1380]},
    {"name": "Rahate Colony", "coords": [79.0882, 21.1300]},
    {"name": "Ajni Square", "coords": [79.0882, 21.1150]},
    {"name": "Chhatrapati Square", "coords": [79.0882, 21.1050]},
    {"name": "Jaiprakash Nagar", "coords": [79.0882, 21.0950]},
    {"name": "Ujjwal Nagar", "coords": [79.0882, 21.0880]},
    {"name": "Airport", "coords": [79.0882, 21.0800]},
    {"name": "Airport South", "coords": [79.0882, 21.0720]},
    {"name": "New Airport", "coords": [79.0882, 21.0650]},
    {"name": "Khapri", "coords": [79.0882, 21.0600]}
]

AQUA_LINE = [
    {"name": "Prajapati Nagar", "coords": [79.1350, 21.1458]},
    {"name": "Vaishno Devi Chowk", "coords": [79.1280, 21.1458]},
    {"name": "Ambedkar Square", "coords": [79.1210, 21.1458]},
    {"name": "Telephone Exchange", "coords": [79.1150, 21.1458]},
    {"name": "Chittaroli Square", "coords": [79.1080, 21.1458]},
    {"name": "Dosar Vaisya Square", "coords": [79.0950, 21.1458]},
    {"name": "Sitabuldi Interchange", "coords": [79.0882, 21.1458]},
    {"name": "Jhansi Rani Square", "coords": [79.0750, 21.1458]},
    {"name": "Institution of Engineers", "coords": [79.0680, 21.1458]},
    {"name": "Shankar Nagar Square", "coords": [79.0600, 21.1458]},
    {"name": "Lad College", "coords": [79.0520, 21.1458]},
    {"name": "Dharampeth College", "coords": [79.0450, 21.1458]},
    {"name": "Subhash Nagar", "coords": [79.0400, 21.1458]},
    {"name": "Rachana Ring Road", "coords": [79.0320, 21.1458]},
    {"name": "Vasudev Nagar", "coords": [79.0250, 21.1458]},
    {"name": "Lokmanya Nagar", "coords": [79.0150, 21.1458]}
]

# Output Path
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../frontend/public/data")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "metro_data.json")

def generate_metro_data():
    lines = []
    stations = []
    trains = []
    
    # Process Orange Line
    orange_coords = [s["coords"] for s in ORANGE_LINE]
    lines.append({
        "id": "orange-line",
        "name": "Orange Line (NS)",
        "color": [255, 120, 0], # Orange
        "path": orange_coords
    })
    
    for s in ORANGE_LINE:
        stations.append({
            "id": f"station-o-{s['name'].lower().replace(' ', '-')}",
            "name": s["name"],
            "line": "Orange",
            "coords": s["coords"],
            "occupancy": random.uniform(20, 95),
            "status": "Operational" if random.random() > 0.05 else "Maintenance",
            "ridership": random.randint(500, 3500)
        })

    # Add sliding trains on Orange Line
    for i in range(3):
        start_idx = random.randint(0, len(orange_coords)-2)
        trains.append({
            "id": f"train-orange-{i}",
            "line": "Orange",
            "color": [255, 165, 0],
            "path": orange_coords[start_idx:start_idx+2],
            "timestamps": [i * 300, (i + 1) * 300]
        })

    # Process Aqua Line
    aqua_coords = [s["coords"] for s in AQUA_LINE]
    lines.append({
        "id": "aqua-line",
        "name": "Aqua Line (EW)",
        "color": [0, 180, 255], # Aqua/Sky Blue
        "path": aqua_coords
    })
    
    for s in AQUA_LINE:
        # Don't duplicate Sitabuldi if already added
        if s["name"] == "Sitabuldi Interchange":
            item = next((st for st in stations if st["name"] == "Sitabuldi Interchange"), None)
            if item:
                item["line"] = "Interchange"
                continue

        stations.append({
            "id": f"station-a-{s['name'].lower().replace(' ', '-')}",
            "name": s["name"],
            "line": "Aqua",
            "coords": s["coords"],
            "occupancy": random.uniform(20, 95),
            "status": "Operational" if random.random() > 0.05 else "Maintenance",
            "ridership": random.randint(500, 3500)
        })

    # Add sliding trains on Aqua Line
    for i in range(3):
        start_idx = random.randint(0, len(aqua_coords)-2)
        trains.append({
            "id": f"train-aqua-{i}",
            "line": "Aqua",
            "color": [0, 200, 255],
            "path": aqua_coords[start_idx:start_idx+2],
            "timestamps": [i * 400 + 100, (i + 1) * 400 + 100]
        })

    # Historical Ridership Mock Data
    ridership_history = []
    for hour in range(0, 24, 2):
        time_str = f"{hour:02d}:00"
        # Business hours peaks: 8-10 AM, 5-7 PM
        base = 1200
        if 8 <= hour <= 10: base = 4500
        if 17 <= hour <= 19: base = 5200
        
        ridership_history.append({
            "time": time_str,
            "ridership": base + random.randint(-500, 500),
            "capacity": 6000
        })

    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "city": "Nagpur",
            "system": "Nagpur Metro"
        },
        "lines": lines,
        "stations": stations,
        "trains": trains,
        "history": ridership_history
    }

if __name__ == "__main__":
    data = generate_metro_data()
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Successfully saved metro data to {OUTPUT_FILE}")

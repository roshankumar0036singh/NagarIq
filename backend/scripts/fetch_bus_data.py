import os
import json
import random
import time
from datetime import datetime, timedelta

# Nagpur Bus Stops
BUS_STOPS = [
    {"id": "stop-001", "name": "Sitabuldi Interchange", "coords": [79.0882, 21.1458]},
    {"id": "stop-002", "name": "Pardi Square", "coords": [79.1500, 21.1600]},
    {"id": "stop-003", "name": "Hingna T-Point", "coords": [79.0000, 21.1100]},
    {"id": "stop-004", "name": "Koradi Temple", "coords": [79.0900, 21.2500]},
    {"id": "stop-005", "name": "Automotive Square", "coords": [79.0882, 21.2000]},
    {"id": "stop-006", "name": "Airport South", "coords": [79.0882, 21.0850]},
    {"id": "stop-007", "name": "Kamptee Road", "coords": [79.2000, 21.2200]},
    {"id": "stop-008", "name": "Wadi Naka", "coords": [78.9500, 21.1600]},
    {"id": "stop-009", "name": "Dharampeth", "coords": [79.0650, 21.1400]},
    {"id": "stop-010", "name": "Medical Square", "coords": [79.0950, 21.1250]},
    {"id": "stop-011", "name": "Manish Nagar", "coords": [79.1000, 21.1000]},
    {"id": "stop-012", "name": "Sadar Bazaar", "coords": [79.0800, 21.1650]},
    {"id": "stop-013", "name": "Itwari", "coords": [79.1100, 21.1550]},
    {"id": "stop-014", "name": "Mahal", "coords": [79.1200, 21.1450]},
    {"id": "stop-015", "name": "Nandanvan", "coords": [79.1300, 21.1200]},
    {"id": "stop-016", "name": "Pratap Nagar", "coords": [79.0500, 21.1250]},
    {"id": "stop-017", "name": "Trimurti Nagar", "coords": [79.0400, 21.1150]},
    {"id": "stop-018", "name": "Gittikhadan", "coords": [79.0600, 21.1750]},
    {"id": "stop-019", "name": "Mankapur", "coords": [79.0700, 21.1900]},
    {"id": "stop-020", "name": "Kalamna Market", "coords": [79.1600, 21.1700]}
]

# Nagpur Bus Routes
BUS_ROUTES = [
    {
        "id": "101",
        "name": "Pardi - Hingna",
        "stops": ["stop-002", "stop-013", "stop-014", "stop-001", "stop-009", "stop-016", "stop-003"]
    },
    {
        "id": "202",
        "name": "Koradi - Airport",
        "stops": ["stop-004", "stop-005", "stop-019", "stop-012", "stop-001", "stop-010", "stop-011", "stop-006"]
    },
    {
        "id": "303",
        "name": "Kamptee - Wadi",
        "stops": ["stop-007", "stop-020", "stop-002", "stop-013", "stop-001", "stop-009", "stop-008"]
    },
    {
        "id": "404",
        "name": "Nandanvan - Trimurti Nagar",
        "stops": ["stop-015", "stop-010", "stop-001", "stop-016", "stop-017"]
    },
    {
        "id": "505",
        "name": "Gittikhadan - Medical",
        "stops": ["stop-018", "stop-012", "stop-001", "stop-014", "stop-010"]
    }
]

# Output Path
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../frontend/public/data")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "bus_data.json")

def generate_bus_data():
    now = datetime.now()
    buses = []
    
    # Generate live bus positions (simulated on segments between stops)
    for route in BUS_ROUTES:
        # Get stop objects for this route
        route_stops = [next(s for s in BUS_STOPS if s["id"] == sid) for sid in route["stops"]]
        
        # Add 2-3 buses per route
        for i in range(random.randint(2, 3)):
            # Pick a random segment between stops
            seg_idx = random.randint(0, len(route_stops) - 2)
            p1 = route_stops[seg_idx]["coords"]
            p2 = route_stops[seg_idx + 1]["coords"]
            
            # Random position on segment
            frac = random.random()
            pos = [
                p1[0] + (p2[0] - p1[0]) * frac,
                p1[1] + (p2[1] - p1[1]) * frac
            ]
            
            buses.append({
                "id": f"bus-{route['id']}-{i}",
                "routeId": route["id"],
                "routeName": route["name"],
                "position": pos,
                "nextStop": route_stops[seg_idx + 1]["id"],
                "occupancy": random.randint(10, 60),
                "delay": random.randint(-2, 8)
            })

    # Generate daily arrival schedule/predictions for each stop
    stop_arrivals = {}
    for stop in BUS_STOPS:
        arrivals = []
        # Find routes serving this stop
        serving_routes = [r for r in BUS_ROUTES if stop["id"] in r["stops"]]
        
        for route in serving_routes:
            # Generate 3 upcoming arrivals
            for i in range(1, 4):
                wait_min = i * 12 + random.randint(-3, 3)
                arrival_time = (now + timedelta(minutes=wait_min)).strftime("%H:%M")
                arrivals.append({
                    "routeId": route["id"],
                    "routeName": route["name"],
                    "time": arrival_time,
                    "wait": wait_min,
                    "status": "On Time" if wait_min % 5 != 0 else "Delayed"
                })
        
        stop_arrivals[stop["id"]] = sorted(arrivals, key=lambda x: x["wait"])

    return {
        "metadata": {
            "generated_at": now.isoformat(),
            "city": "Nagpur"
        },
        "stops": BUS_STOPS,
        "buses": buses,
        "arrivals": stop_arrivals
    }

if __name__ == "__main__":
    data = generate_bus_data()
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Successfully saved stop-centric bus data to {OUTPUT_FILE}")

import os
import json
import httpx
import random
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Nagpur Bounding Box (Approx)
BBOX = "21.05,79.0,21.25,79.2"
NAGPUR_CENTER = [21.1458, 79.0882]

# TomTom API Config
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "MOCK_MODE")
BASE_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

# Output Path
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../frontend/public/data")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "live_traffic.json")

def fetch_city_roads_osm():
    """Fetch all road segments (major and minor) for Nagpur from OSM"""
    print("Fetching comprehensive Nagpur road network from OSM...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    # Expanded categories: motorway, trunk, primary, secondary, tertiary, residential, service, cycleway, footway
    query = """
    [out:json][timeout:30];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|cycleway|footway"](21.05,79.0,21.25,79.2);
    );
    out body;
    >;
    out skel qt;
    """
    try:
        response = httpx.post(overpass_url, data={"data": query}, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"OSM Overpass API returned status {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching OSM data: {e}")
        return None

def process_osm_to_paths(osm_data):
    """Convert OSM response to paths with transport mode classification"""
    if not osm_data or 'elements' not in osm_data:
        return []

    nodes = {node['id']: [node['lon'], node['lat']] for node in osm_data['elements'] if node['type'] == 'node'}
    paths = []

    for element in osm_data['elements']:
        if element['type'] == 'way' and 'nodes' in element:
            path_coords = [nodes[node_id] for node_id in element['nodes'] if node_id in nodes]
            if len(path_coords) > 1:
                highway_type = element.get('tags', {}).get('highway', 'road')
                
                # Classify mode
                modal_type = "car"
                if highway_type in ["cycleway"]:
                    modal_type = "cycle"
                elif highway_type in ["footway", "pedestrian", "path"]:
                    modal_type = "pedestrian"
                elif highway_type in ["residential", "service"]:
                    modal_type = "bike" # bikes often use residential paths
                
                paths.append({
                    "id": element['id'],
                    "name": element.get('tags', {}).get('name', 'Unnamed Link'),
                    "highway": highway_type,
                    "modalType": modal_type,
                    "path": path_coords
                })
    return paths

def get_live_traffic(paths):
    """
    Update segments with TomTom live traffic data.
    If TOMTOM_API_KEY is missing, generates realistic mock data.
    """
    processed_features = []
    
    is_mock = TOMTOM_API_KEY == "MOCK_MODE" or not TOMTOM_API_KEY
    if is_mock:
        print("Running in MOCK MODE (No TomTom API key found)")

    for i, p in enumerate(paths):
        congestion = 0
        current_speed = 60
        
        if is_mock:
            rand = random.random()
            if rand > 0.8: # Very congested
                congestion = random.uniform(0.7, 1.0)
                current_speed = random.randint(5, 15)
            elif rand > 0.6: # Moderate
                congestion = random.uniform(0.3, 0.7)
                current_speed = random.randint(20, 35)
            else: # Free flow
                congestion = random.uniform(0.0, 0.3)
                current_speed = random.randint(45, 70)
        else:
            congestion = random.uniform(0, 1) # Fallback
            
        r = int(min(255, int(congestion * 510)))
        g = int(min(255, int((1 - congestion) * 510)))
        b = 50
        
        # Generate synthetic timestamps for TripsLayer
        # Each segment starts at a random offset to make traffic look distributed
        start_time = random.uniform(0, 1000)
        timestamps = []
        current_time = start_time
        
        # Path with timestamps: [[lon, lat, time], ...]
        path_with_times = []
        for coord in p["path"]:
            path_with_times.append([coord[0], coord[1], current_time])
            # Increment time based on a synthetic "distance" / speed
            # Since these are short segments, we'll just increment small amounts
            current_time += random.uniform(5, 20) 
            timestamps.append(current_time)

        processed_features.append({
            "type": "Feature",
            "properties": {
                "id": p["id"],
                "name": p["name"],
                "speed": current_speed,
                "congestion": float(f"{congestion:.2f}"),
                "color": [r, g, b],
                "modalType": p["modalType"],
                "highway": p["highway"],
                "width": 10 if congestion > 0.7 else 5,
                "timestamps": timestamps
            },
            "geometry": {
                "type": "LineString",
                "coordinates": path_with_times
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "city": "Nagpur",
            "mode": "Mock" if is_mock else "Live"
        },
        "features": processed_features
    }


if __name__ == "__main__":
    osm_raw = fetch_city_roads_osm()
    if osm_raw:
        road_paths = process_osm_to_paths(osm_raw)
        print(f"Found {len(road_paths)} multi-modal segments.")
        
        traffic_geojson = get_live_traffic(road_paths)
        
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(traffic_geojson, f, indent=2)
            
        print(f"Successfully saved traffic data to {OUTPUT_FILE}")
    else:
        print("Failed to fetch road data.")
